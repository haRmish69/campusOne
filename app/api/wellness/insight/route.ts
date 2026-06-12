import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = "gemini-2.5-flash-lite";

// Reuse the withRetry wrapper logic here
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (
        error.status === 429 || 
        error.status === 503 ||
        error.status === 500 ||
        error.message?.includes("429") ||
        error.message?.includes("503") ||
        error.message?.includes("high demand")
      ) {
        if (attempt === maxRetries) throw error;
        const delay = 2000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if we already generated an insight today
    const existingInsight = await prisma.wellnessInsight.findFirst({
      where: { date: { gte: todayStart } },
      orderBy: { date: "desc" },
    });

    if (existingInsight) {
      return NextResponse.json(existingInsight);
    }

    // --- Generate new insight ---
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch Wellness Data
    const wellnessLogs = await prisma.wellnessLog.findMany({
      where: { date: { gte: fourteenDaysAgo } },
      orderBy: { date: "asc" },
      select: { date: true, mood: true, sleepHours: true, stressLevel: true }
    });

    // 2. Fetch Academic Data
    const academicLoad = await prisma.deadline.findMany({
      where: {
        AND: [
          { dueDate: { gte: now, lte: sevenDaysFromNow } },
          { OR: [{ type: { contains: "exam" } }, { type: { contains: "assignment" } }, { title: { contains: "test" } }] }
        ]
      },
      select: { title: true, dueDate: true, type: true }
    });

    // 3. Fetch Financial Data (last 7 days expenses)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: sevenDaysAgo } },
    });
    const totalWeeklyExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Prepare prompt
    const prompt = `Student's last 14 days mood/sleep/stress: ${JSON.stringify(wellnessLogs)}.
Upcoming academic load (next 7 days): ${JSON.stringify(academicLoad)}.
Recent expenses (last 7 days): Total ₹${totalWeeklyExpense}.
Identify any signs of burnout. If high stress correlates with low sleep or high academic load, gently point it out and suggest 2 realistic self-care actions. Keep it under 3 sentences.
Return ONLY JSON: { "score": number (1-100, 100=highest risk), "message": string }. No markdown.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    }));

    let rawText = response.text ?? "";
    rawText = rawText.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse Gemini insight JSON:", rawText);
      parsed = { score: 50, message: "Take a deep breath! We couldn't analyze your data right now, but remember to prioritize your well-being." };
    }

    // Save to database
    const insight = await prisma.wellnessInsight.create({
      data: {
        score: typeof parsed.score === "number" ? parsed.score : 50,
        message: parsed.message || "Take a deep breath and remember to prioritize your well-being.",
      },
    });

    return NextResponse.json(insight);
  } catch (error) {
    console.error("Failed to fetch wellness insight:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

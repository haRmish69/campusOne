import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = "gemini-2.5-flash";

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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if we already generated an insight today
    const existingInsight = await prisma.wellnessInsight.findFirst({
      where: { userId, date: { gte: todayStart } },
      orderBy: { date: "desc" },
    });

    if (existingInsight) {
      return NextResponse.json(existingInsight);
    }

    // --- Generate new insight ---
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch User Profile
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { name: true, major: true, instituteName: true }
    });
    const userName = profile?.name || "the student";
    const userMajor = profile?.major || "Undeclared";
    const userInstitute = profile?.instituteName || "University";

    // 2. Fetch Wellness Data
    const wellnessLogs = await prisma.wellnessLog.findMany({
      where: { userId, date: { gte: fourteenDaysAgo } },
      orderBy: { date: "asc" },
      select: { date: true, mood: true, sleepHours: true, stressLevel: true }
    });

    // 3. Fetch Weekly Class Schedule
    const classSchedule = await prisma.classSchedule.findMany({
      where: { userId },
      select: { day: true, subject: true, startTime: true, endTime: true }
    });

    // 2. Fetch Academic Data
    const academicLoad = await prisma.deadline.findMany({
      where: {
        userId,
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
      where: { userId, date: { gte: sevenDaysAgo } },
    });
    const foodWeeklyExpense = expenses.filter(e => e.category === "food" || e.category.toLowerCase().includes("food") || e.category.toLowerCase().includes("dining")).reduce((sum, e) => sum + e.amount, 0);
    const totalWeeklyExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Prepare prompt
    const prompt = `You are "PocketBuddy", a highly empathetic, advanced AI wellness analyst.
    
    Student Context:
    - Name: ${userName}
    - Major: ${userMajor}
    - Institute: ${userInstitute}
    
    Data Context:
    - Last 14 days mood/sleep/stress: ${JSON.stringify(wellnessLogs)}
    - Weekly Class Schedule (density): ${JSON.stringify(classSchedule)}
    - Upcoming Deadlines (next 7 days): ${JSON.stringify(academicLoad)}
    - Recent expenses (last 7 days): Total ₹${totalWeeklyExpense}, Food ₹${foodWeeklyExpense}

    Instructions:
    1. Calculate a dynamic "Burnout Risk Score" (1-100, where 100 is extreme burnout risk). Base this heavily on the COMBINATION of their sleep deficit, stress trend, schedule density (do they have packed classes?), upcoming deadlines, and their specific major (e.g., tough engineering majors with deadlines).
    2. Write a highly personalized, caring 2-3 sentence message addressing them by name. 
    3. CRITICAL RULE: If the student has high stress or upcoming exams BUT their food expenses are abnormally low or zero, gently suggest they might be skipping meals and offer a quick budget-friendly meal idea!
    4. Reference their specific major, college, or a specific difficult class in your message to make it feel deeply personal.
    
    Return ONLY JSON: { "score": number, "message": string }. No markdown.`;

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
        userId,
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

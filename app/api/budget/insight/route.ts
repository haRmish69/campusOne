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
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Fetch budget for the month
    const budget = await prisma.budget.findFirst({
      where: { month: currentMonth, userId }
    });

    if (!budget) {
      return NextResponse.json({
        message: "You haven't set up a budget for this month yet. Set one up to get AI savings recommendations!"
      });
    }

    // Fetch expenses for the month
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const expenses = await prisma.expense.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } }
    });

    if (expenses.length < 3) {
      return NextResponse.json({
        message: "PocketBuddy needs a few more expenses logged this month to find reliable savings patterns. Keep logging!"
      });
    }

    // Calculate actual spend per category
    const actualSpend: Record<string, number> = {};
    expenses.forEach((e) => {
      actualSpend[e.category] = (actualSpend[e.category] || 0) + e.amount;
    });

    const prompt = `The student has the following budget set up for this month:
Total Limit: ₹${budget.totalLimit}
Category Limits: ${JSON.stringify(budget.categoryLimits)}

Their actual spending so far this month:
${JSON.stringify(actualSpend)}

Act as "PocketBuddy", a financial AI assistant. Analyze their spending.
Find EXACTLY ONE specific area where they are overspending or could realistically cut back based on the data.
Generate a specific, actionable, and encouraging recommendation. 
Example: "You've spent ₹1500 on Entertainment this week, which is 90% of your limit. Consider hosting a movie night at your dorm instead of going out to save ₹500!"

Keep it under 3 sentences. Be specific with the numbers from their data.
Return ONLY JSON:
{
  "message": "string"
}
No markdown formatting.`;

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
      console.error("Failed to parse Budget Insight JSON:", rawText);
      parsed = { message: "Try looking at your highest spending category this month and see if you can swap one purchase for a free alternative!" };
    }

    return NextResponse.json({
      message: parsed.message
    });

  } catch (error) {
    console.error("Budget Insight error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

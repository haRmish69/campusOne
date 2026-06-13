import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = "gemini-2.0-flash";

// Reuse the withRetry wrapper logic here to ensure consistency
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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ suggestions: [] });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Fetch budget and compute status
    const budget = await prisma.budget.findFirst({ where: { userId, month } });
    
    if (!budget || !budget.categoryLimits) {
      return NextResponse.json({ suggestions: [] });
    }

    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const expenses = await prisma.expense.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "desc" }
    });

    const actualSpend: Record<string, number> = {};
    expenses.forEach((e) => {
      actualSpend[e.category] = (actualSpend[e.category] || 0) + e.amount;
    });

    const categoryLimits = budget.categoryLimits as Record<string, number>;
    const problematicCategories: any[] = [];
    
    Object.entries(categoryLimits).forEach(([category, limit]) => {
      const spent = actualSpend[category] || 0;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      if (percentage >= 80) {
        problematicCategories.push({
          category,
          status: percentage >= 100 ? "over" : "near",
          limit,
          spent,
          percentage: percentage.toFixed(1) + "%",
        });
      }
    });

    if (problematicCategories.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Filter recent expenses just for the problematic categories to give Gemini context
    const recentProblematicExpenses = expenses
      .filter(e => problematicCategories.some(pc => pc.category === e.category))
      .slice(0, 15) // take top 15 most recent
      .map(e => ({ desc: e.description, amount: e.amount, cat: e.category }));

    // 2. Query Gemini
    const prompt = `This student's monthly budget status for problematic categories: ${JSON.stringify(problematicCategories)}.
Recent expenses in these categories: ${JSON.stringify(recentProblematicExpenses)}.
For any category that is 'near' or 'over' budget, suggest 2-3 specific, practical, affordable alternatives a student in India could realistically use (e.g. cheaper food options, public transport vs cabs, free/student-discount entertainment). Be concrete and encouraging, not preachy.
Return ONLY a JSON array of objects formatted as: { "category": string, "suggestions": string[] }. No markdown or code fences.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    }));

    let rawText = response.text ?? "";
    rawText = rawText.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    
    let parsedSuggestions = [];
    try {
      parsedSuggestions = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse Gemini suggestions JSON:", rawText);
    }

    return NextResponse.json({ suggestions: parsedSuggestions });

  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

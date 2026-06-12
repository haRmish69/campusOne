import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM
    
    if (!month) {
      return NextResponse.json({ error: "Month parameter is required (YYYY-MM)" }, { status: 400 });
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const m = parseInt(monthStr) - 1; // 0-indexed

    // Current month range
    const currentStartDate = new Date(year, m, 1);
    const currentEndDate = new Date(year, m + 1, 0, 23, 59, 59, 999);

    // Previous month range
    let prevYear = year;
    let prevM = m - 1;
    if (prevM < 0) {
      prevM = 11;
      prevYear--;
    }
    const prevStartDate = new Date(prevYear, prevM, 1);
    const prevEndDate = new Date(prevYear, prevM + 1, 0, 23, 59, 59, 999);

    // Fetch current month expenses
    const currentExpenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: currentStartDate,
          lte: currentEndDate,
        },
      },
    });

    // Fetch previous month expenses
    const prevExpenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
      },
    });

    // Calculations for current month
    const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Category breakdown
    const categories: Record<string, number> = {};
    currentExpenses.forEach((e) => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    
    // Sort categories by amount descending
    const categoryBreakdown = Object.entries(categories)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Percentage change
    let percentChange = 0;
    if (prevTotal > 0) {
      percentChange = ((currentTotal - prevTotal) / prevTotal) * 100;
    } else if (currentTotal > 0) {
      percentChange = 100; // Infinity in math, but let's cap at 100% for first month
    }

    return NextResponse.json({
      total: currentTotal,
      previousTotal: prevTotal,
      percentChange,
      categoryBreakdown
    });
  } catch (error) {
    console.error("Failed to fetch expenses summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

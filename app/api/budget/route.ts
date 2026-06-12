import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, totalLimit, categoryLimits } = body;

    if (!month || !totalLimit || !categoryLimits) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find existing budget for month
    const existing = await prisma.budget.findFirst({
      where: { month },
    });

    let budget;
    if (existing) {
      budget = await prisma.budget.update({
        where: { id: existing.id },
        data: {
          totalLimit: parseFloat(totalLimit.toString()),
          categoryLimits: categoryLimits,
        },
      });
    } else {
      budget = await prisma.budget.create({
        data: {
          month,
          totalLimit: parseFloat(totalLimit.toString()),
          categoryLimits: categoryLimits,
        },
      });
    }

    return NextResponse.json(budget, { status: 200 });
  } catch (error) {
    console.error("Failed to save budget:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM
    
    if (!month) {
      return NextResponse.json({ error: "Month parameter is required (YYYY-MM)" }, { status: 400 });
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const m = parseInt(monthStr) - 1;

    // Fetch budget
    const budget = await prisma.budget.findFirst({
      where: { month },
    });

    // Fetch current month expenses
    const startDate = new Date(year, m, 1);
    const endDate = new Date(year, m + 1, 0, 23, 59, 59, 999);
    
    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });

    const currentTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group actual spend by category
    const actualSpend: Record<string, number> = {};
    expenses.forEach((e) => {
      actualSpend[e.category] = (actualSpend[e.category] || 0) + e.amount;
    });

    const categoryLimits = (budget?.categoryLimits as Record<string, number>) || {};

    // Compute status per category
    const categoryStatus = Object.entries(categoryLimits).map(([category, limit]) => {
      const spent = actualSpend[category] || 0;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      
      let status = "under";
      if (percentage >= 100) status = "over";
      else if (percentage >= 80) status = "near";

      return {
        category,
        limit,
        spent,
        percentage,
        status,
      };
    });

    return NextResponse.json({
      budget,
      currentTotal,
      actualSpend,
      categoryStatus,
    });
  } catch (error) {
    console.error("Failed to fetch budget:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { PieChart } from "lucide-react";
import { BudgetSetup } from "@/components/BudgetSetup";
import { BudgetStatus } from "@/components/BudgetStatus";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SmartSavings } from "@/components/SmartSavings";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Fetch budget
  const budget = await prisma.budget.findFirst({
    where: { userId, month },
  });

  let currentBudget = null;
  let categoryStatus: any[] = [];

  if (budget) {
    currentBudget = {
      totalLimit: budget.totalLimit,
      categoryLimits: budget.categoryLimits as Record<string, number>,
    };

    // Calculate spend per category to populate status
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const expenses = await prisma.expense.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    });

    const actualSpend: Record<string, number> = {};
    expenses.forEach((e) => {
      actualSpend[e.category] = (actualSpend[e.category] || 0) + e.amount;
    });

    const categoryLimits = currentBudget.categoryLimits;
    
    categoryStatus = Object.entries(categoryLimits).map(([category, limit]) => {
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

    // Filter out categories with 0 limit so they don't clutter the UI
    categoryStatus = categoryStatus.filter(c => c.limit > 0);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <PieChart className="w-8 h-8 text-primary" />
          Budget
        </h1>
        <p className="text-muted-foreground">
          Set monthly limits and get smart suggestions to save money.
        </p>
      </div>

      <div className="flex flex-col gap-8 mb-10">
        <SmartSavings />
        <BudgetSetup currentBudget={currentBudget} month={month} />
        <BudgetStatus categoryStatus={categoryStatus} />
      </div>
    </div>
  );
}

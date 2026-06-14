import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BudgetDashboard } from "@/components/BudgetDashboard";

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
  if (budget) {
    currentBudget = {
      totalLimit: budget.totalLimit,
      categoryLimits: budget.categoryLimits as Record<string, number>,
    };
  }

  // Calculate spend per category to populate live status
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
  });

  const actualSpend: Record<string, number> = {};
  expenses.forEach((e) => {
    actualSpend[e.category] = (actualSpend[e.category] || 0) + e.amount;
  });

  return (
    <div className="container mx-auto pt-[28px] pb-10 px-4 max-w-[960px] font-[family-name:var(--font-plus-jakarta-sans)]">
      <div className="bg-[#f9f9f9] rounded-[20px] p-[28px]">
        
        <div className="mb-[24px]">
          <h1 className="text-[20px] font-bold text-[#1f1f1f] flex items-center gap-3 leading-tight">
            <div className="w-[12px] h-[12px] rounded-[6px] bg-[#ff5a2f]" />
            Budget
          </h1>
          <p className="text-[12px] text-[#a5a5a5] mt-1">
            Set precise limits and get smart suggestions to optimize your spending.
          </p>
        </div>

        <BudgetDashboard 
          initialBudget={currentBudget} 
          actualSpend={actualSpend} 
          month={month} 
        />
        
      </div>
    </div>
  );
}

import { Calendar } from "lucide-react";
import { ExpenseEntry } from "@/components/ExpenseEntry";
import { ExpenseSummary } from "@/components/ExpenseSummary";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Current month range
  const currentStartDate = new Date(year, month, 1);
  const currentEndDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // Previous month range
  let prevYear = year;
  let prevM = month - 1;
  if (prevM < 0) {
    prevM = 11;
    prevYear--;
  }
  const prevStartDate = new Date(prevYear, prevM, 1);
  const prevEndDate = new Date(prevYear, prevM + 1, 0, 23, 59, 59, 999);

  // Fetch data
  const currentExpenses = await prisma.expense.findMany({
    where: { userId, date: { gte: currentStartDate, lte: currentEndDate } },
    orderBy: { date: "desc" },
  });

  const prevExpenses = await prisma.expense.findMany({
    where: { userId, date: { gte: prevStartDate, lte: prevEndDate } },
  });

  // Calculate Summary
  const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categories: Record<string, number> = {};
  currentExpenses.forEach((e) => {
    categories[e.category] = (categories[e.category] || 0) + e.amount;
  });
  
  const categoryBreakdown = Object.entries(categories)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  let percentChange = 0;
  if (prevTotal > 0) {
    percentChange = ((currentTotal - prevTotal) / prevTotal) * 100;
  } else if (currentTotal > 0) {
    percentChange = 100;
  }

  // Get last 10 expenses for list
  const recentExpenses = await prisma.expense.findMany({
    where: { userId },
    take: 10,
    orderBy: { date: "desc" },
  });

  return (
    <div className="container mx-auto pt-[28px] pb-10 px-4 max-w-[960px] font-[family-name:var(--font-plus-jakarta-sans)]">
      <div className="bg-[#f9f9f9] rounded-[20px] p-[28px]">
        
        <div className="mb-[24px]">
          <h1 className="text-[20px] font-bold text-[#1f1f1f] flex items-center gap-3 leading-tight">
            <div className="w-[12px] h-[12px] rounded-[6px] bg-[#ff5a2f]" />
            Expenses
          </h1>
          <p className="text-[12px] text-[#a5a5a5] mt-1">
            Track your spending and easily capture receipts with PocketBuddy.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-[32px]">
          {/* LEFT COLUMN: ~55% */}
          <div className="w-full md:w-[55%] flex flex-col gap-[20px]">
            <ExpenseEntry />
          </div>

          {/* RIGHT COLUMN: ~45% */}
          <div className="w-full md:w-[45%] flex flex-col gap-[20px]">
            <ExpenseSummary 
              total={currentTotal}
              previousTotal={prevTotal}
              percentChange={percentChange}
              categoryBreakdown={categoryBreakdown}
            />
            
            {/* Recent Expenses moved into the Right Column below the summary */}
            <div className="mt-2">
              <h4 className="text-[10px] font-[700] uppercase text-[#a5a5a5] tracking-[0.1em] mb-[16px]">Recent Activity</h4>
              
              {recentExpenses.length === 0 ? (
                <div className="bg-[#fafafa] rounded-[16px] border border-dashed border-[#e5e7eb] p-[32px] flex flex-col items-center justify-center text-center">
                  <span className="text-[12px] text-[#cbcbcb] max-w-[240px] mx-auto leading-relaxed mb-4">Nothing logged yet.</span>
                  <a href="/chat" className="text-[12px] text-[#ff5a2f] underline hover:opacity-80 transition-opacity">Open Chat &rarr;</a>
                </div>
              ) : (
                <div className="space-y-0">
                  {recentExpenses.map((expense) => (
                    <div key={expense.id} className="h-[44px] flex items-center justify-between border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors -mx-2 px-2 rounded-[8px]">
                      <div className="flex items-center gap-3">
                        <div className="w-[28px] h-[28px] rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#707070]">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-[500] text-[#1f1f1f]">{expense.description}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {expense.source === "receipt" && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-[20px] text-[10px]">
                            Receipt
                          </span>
                        )}
                        <div className="text-[13px] font-[600] text-[#1f1f1f]">
                          ₹{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

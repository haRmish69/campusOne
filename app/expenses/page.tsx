import { Wallet, Calendar } from "lucide-react";
import { ExpenseEntry } from "@/components/ExpenseEntry";
import { ExpenseSummary } from "@/components/ExpenseSummary";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
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
    take: 10,
    orderBy: { date: "desc" },
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-primary" />
          Expenses
        </h1>
        <p className="text-muted-foreground">
          Track your spending and easily capture receipts with PocketBuddy.
        </p>
      </div>

      <div className="flex flex-col gap-8 mb-10">
        <ExpenseEntry />
        <ExpenseSummary 
          total={currentTotal}
          previousTotal={prevTotal}
          percentChange={percentChange}
          categoryBreakdown={categoryBreakdown}
        />
      </div>

      <h2 className="text-xl font-bold tracking-tight mb-4">Recent Expenses</h2>
      {recentExpenses.length === 0 ? (
        <Card className="border-dashed border-2 shadow-sm bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No expenses logged yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recentExpenses.map((expense) => (
            <Card key={expense.id} className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{expense.description}</h4>
                  <div className="flex items-center text-xs text-muted-foreground mt-1 gap-3">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(expense.date).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded-full capitalize">
                      {expense.category}
                    </span>
                    {expense.source === "receipt" && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        Receipt
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-semibold">
                  ₹{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

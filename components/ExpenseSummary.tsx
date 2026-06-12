import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ExpenseSummaryProps {
  total: number;
  previousTotal: number;
  percentChange: number;
  categoryBreakdown: { category: string; amount: number }[];
}

export function ExpenseSummary({ total, previousTotal, percentChange, categoryBreakdown }: ExpenseSummaryProps) {
  // Simple color palette for categories
  const categoryColors: Record<string, string> = {
    food: "bg-blue-500",
    travel: "bg-amber-500",
    academics: "bg-violet-500",
    rent: "bg-emerald-500",
    subscriptions: "bg-pink-500",
    entertainment: "bg-cyan-500",
    other: "bg-slate-400",
  };

  const isUp = percentChange > 0;
  const isNeutral = percentChange === 0;

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">This Month's Spend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-4xl font-bold tracking-tight text-midnight-navy">
              ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center mt-2 text-sm">
              {isNeutral ? (
                <span className="flex items-center text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                  <Minus className="w-3 h-3 mr-1" /> No change
                </span>
              ) : isUp ? (
                <span className="flex items-center text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                  <TrendingUp className="w-3 h-3 mr-1" /> +{percentChange.toFixed(1)}%
                </span>
              ) : (
                <span className="flex items-center text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  <TrendingDown className="w-3 h-3 mr-1" /> {percentChange.toFixed(1)}%
                </span>
              )}
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Category Breakdown</h4>
          
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded this month.</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => {
                const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                const bgColor = categoryColors[item.category] || categoryColors.other;
                
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize">{item.category}</span>
                      <span className="text-muted-foreground">₹{item.amount.toLocaleString("en-IN")} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${bgColor} rounded-full`} 
                        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

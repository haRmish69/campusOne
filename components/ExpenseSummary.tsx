// Removed unused imports
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
    <div className="w-full bg-[#fafafa] border border-[#f0f0f0] rounded-[16px] p-[20px] md:p-[24px]">
      <div>
        <h3 className="text-[10px] uppercase font-[700] text-[#a5a5a5] tracking-[0.1em]">This Month</h3>
        <div className="text-[48px] font-[300] text-[#1f1f1f] leading-none my-2">
          ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center text-sm">
          {isNeutral ? (
            <span className="flex items-center text-[#707070] bg-[#f5f5f5] px-2.5 py-[3px] rounded-[20px] text-[11px] font-medium">
              <Minus className="w-3 h-3 mr-1" /> No change vs last month
            </span>
          ) : isUp ? (
            <span className="flex items-center text-red-600 bg-red-100 px-2.5 py-[3px] rounded-[20px] text-[11px] font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> +{percentChange.toFixed(1)}% vs last month
            </span>
          ) : (
            <span className="flex items-center text-emerald-600 bg-emerald-100 px-2.5 py-[3px] rounded-[20px] text-[11px] font-medium">
              <TrendingDown className="w-3 h-3 mr-1" /> {percentChange.toFixed(1)}% vs last month
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-[#f0f0f0] mt-[16px] pt-[16px]">
        {categoryBreakdown.length === 0 ? (
          <div>
            <div className="h-[6px] rounded-[4px] bg-[#f0f0f0] w-full flex overflow-hidden"></div>
            <p className="text-[11px] text-[#a5a5a5] mt-2">No data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-[6px] rounded-[4px] bg-[#f0f0f0] w-full flex overflow-hidden">
              {categoryBreakdown.map((item) => {
                const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                const bgColor = categoryColors[item.category] || categoryColors.other;
                return (
                  <div 
                    key={item.category}
                    className={`h-full ${bgColor} first:rounded-l-[4px] last:rounded-r-[4px]`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                    title={`${item.category}: ₹${item.amount.toLocaleString("en-IN")}`}
                  />
                );
              })}
            </div>
            <div className="space-y-2 mt-3">
              {categoryBreakdown.map((item) => {
                const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                const bgColor = categoryColors[item.category] || categoryColors.other;
                return (
                  <div key={item.category} className="flex justify-between items-center text-[12px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-[8px] h-[8px] rounded-full ${bgColor}`} />
                      <span className="font-[400] text-[#707070] capitalize">{item.category}</span>
                    </div>
                    <span className="text-[#1f1f1f] font-[500]">₹{item.amount.toLocaleString("en-IN")} ({percentage.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

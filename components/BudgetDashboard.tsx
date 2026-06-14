"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Coffee, Map, BookOpen, Home, Repeat, Film, MoreHorizontal } from "lucide-react";
import { SmartSavings } from "./SmartSavings";

interface BudgetDashboardProps {
  initialBudget: {
    totalLimit: number;
    categoryLimits: Record<string, number>;
  } | null;
  actualSpend: Record<string, number>;
  month: string;
}

const CATEGORY_META: Record<string, { icon: React.ElementType, color: string }> = {
  food: { icon: Coffee, color: "bg-blue-500" },
  travel: { icon: Map, color: "bg-amber-500" },
  academics: { icon: BookOpen, color: "bg-violet-500" },
  rent: { icon: Home, color: "bg-emerald-500" },
  subscriptions: { icon: Repeat, color: "bg-pink-500" },
  entertainment: { icon: Film, color: "bg-cyan-500" },
  other: { icon: MoreHorizontal, color: "bg-slate-400" },
};

const CATEGORIES = Object.keys(CATEGORY_META);

export function BudgetDashboard({ initialBudget, actualSpend, month }: BudgetDashboardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [totalLimit, setTotalLimit] = useState(initialBudget?.totalLimit?.toString() || "");
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    CATEGORIES.forEach(c => {
      initial[c] = initialBudget?.categoryLimits?.[c]?.toString() || "";
    });
    return initial;
  });

  const handleLimitChange = (category: string, value: string) => {
    setLimits(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    if (!totalLimit) {
      toast.error("Please set a total monthly limit.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Saving budget...");

    try {
      const categoryLimits: Record<string, number> = {};
      CATEGORIES.forEach(c => {
        categoryLimits[c] = parseFloat(limits[c]) || 0;
      });

      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          totalLimit: parseFloat(totalLimit),
          categoryLimits
        }),
      });

      if (!res.ok) throw new Error("Failed to save budget");

      toast.success("Budget updated successfully!", { id: toastId });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save budget", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live calculations
  const parsedTotalLimit = parseFloat(totalLimit) || 0;
  let totalAllocated = 0;
  let totalSpent = 0;

  CATEGORIES.forEach(c => {
    totalAllocated += parseFloat(limits[c]) || 0;
    totalSpent += actualSpend[c] || 0;
  });

  const unallocated = Math.max(0, parsedTotalLimit - totalAllocated);

  return (
    <div className="flex flex-col md:flex-row gap-[32px] md:gap-[40px]">
      
      {/* LEFT COLUMN: Setup */}
      <div className="w-full md:w-[55%]">
        <SmartSavings />

        {/* Hero Input */}
        <div className="mb-[32px]">
          <h3 className="text-[10px] uppercase font-[700] text-[#a5a5a5] tracking-[0.1em] mb-2">Total Monthly Limit</h3>
          <div className="flex items-end border-b border-[#efefef] pb-1 focus-within:border-[#ff5a2f] transition-colors relative group">
            <span className="text-[32px] font-[300] text-[#a5a5a5] mr-2 mb-1">₹</span>
            <input
              type="number"
              value={totalLimit}
              onChange={(e) => setTotalLimit(e.target.value)}
              placeholder="0"
              className="w-full text-[48px] font-[300] text-[#1f1f1f] leading-none bg-transparent outline-none placeholder-[#d1d1d1]"
            />
          </div>
        </div>

        {/* Category Limits */}
        <div className="space-y-[16px]">
          <h3 className="text-[10px] uppercase font-[700] text-[#a5a5a5] tracking-[0.1em]">Category Limits</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            {CATEGORIES.map(category => {
              const Icon = CATEGORY_META[category].icon;
              const colorClass = CATEGORY_META[category].color;
              
              const val = parseFloat(limits[category]) || 0;
              const spent = actualSpend[category] || 0;
              const progressPercentage = val > 0 ? (spent / val) * 100 : 0;
              
              return (
                <div key={category} className="bg-[#ffffff] border border-[#f0f0f0] rounded-[12px] p-[16px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-[6px] bg-gray-50 flex items-center justify-center`}>
                      <Icon className="w-[14px] h-[14px] text-[#707070]" />
                    </div>
                    <span className="text-[11px] uppercase font-[600] text-[#a5a5a5] tracking-[0.05em]">{category}</span>
                  </div>
                  
                  <div className="flex items-center border-b border-[#efefef] pb-1 focus-within:border-[#ff5a2f] transition-colors">
                    <span className="text-[13px] text-[#a5a5a5] mr-1">₹</span>
                    <input
                      type="number"
                      value={limits[category]}
                      onChange={(e) => handleLimitChange(category, e.target.value)}
                      placeholder="0"
                      className="w-full text-[14px] font-[500] text-[#1f1f1f] bg-transparent outline-none"
                    />
                  </div>

                  {/* Tiny progress bar */}
                  <div className="h-[2px] bg-[#f5f5f5] w-full mt-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colorClass} transition-all duration-300`} 
                      style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-8 flex justify-end">
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting} 
            className="w-[160px] h-[40px] bg-[#ff6b45] hover:bg-[#ff5a2f] text-white rounded-[50px] text-[13px] font-[600] tracking-[0.02em] shadow-[0px_3px_8px_rgba(255,90,47,0.15)] transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <>Save Budget <span className="text-[14px] leading-none ml-1">&rarr;</span></>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT COLUMN: Live Summary */}
      <div className="w-full md:w-[45%]">
        <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-[16px] p-[20px] md:p-[24px] sticky top-[24px]">
          
          <h3 className="text-[10px] uppercase font-[700] text-[#a5a5a5] tracking-[0.1em] mb-[20px]">Live Allocation</h3>
          
          <div className="flex justify-between items-end mb-[24px]">
            <div>
              <div className="text-[10px] font-[600] text-[#a5a5a5] uppercase tracking-wider mb-1">Budgeted</div>
              <div className="text-[24px] font-[300] text-[#1f1f1f] leading-none">
                ₹{totalAllocated.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-[600] text-[#a5a5a5] uppercase tracking-wider mb-1">Spent</div>
              <div className="text-[24px] font-[300] text-[#1f1f1f] leading-none">
                ₹{totalSpent.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Master Allocation Bar */}
          <div className="space-y-1 mb-[32px]">
            <div className="flex justify-between text-[11px] text-[#707070]">
              <span>Allocated Limit</span>
              <span>₹{unallocated.toLocaleString("en-IN")} left to allocate</span>
            </div>
            <div className="h-[6px] rounded-[4px] bg-[#f0f0f0] w-full flex overflow-hidden">
              {CATEGORIES.map(category => {
                const limitVal = parseFloat(limits[category]) || 0;
                if (limitVal === 0 || parsedTotalLimit === 0) return null;
                const percentage = (limitVal / parsedTotalLimit) * 100;
                const colorClass = CATEGORY_META[category].color;
                
                return (
                  <div 
                    key={category}
                    className={`h-full ${colorClass} first:rounded-l-[4px] last:rounded-r-[4px] border-r border-[#fafafa] last:border-0`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                    title={`${category}: ₹${limitVal.toLocaleString("en-IN")}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#f0f0f0] pt-[20px]">
            <h3 className="text-[10px] uppercase font-[700] text-[#a5a5a5] tracking-[0.1em] mb-[16px]">Spending vs Limits</h3>
            
            <div className="space-y-4">
              {CATEGORIES.map(category => {
                const limitVal = parseFloat(limits[category]) || 0;
                const spentVal = actualSpend[category] || 0;
                
                if (limitVal === 0 && spentVal === 0) return null; // Hide if totally inactive
                
                const percentage = limitVal > 0 ? (spentVal / limitVal) * 100 : (spentVal > 0 ? 100 : 0);
                const colorClass = CATEGORY_META[category].color;
                const isOver = percentage > 100;

                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[12px]">
                      <div className="flex items-center gap-2">
                        <div className={`w-[8px] h-[8px] rounded-full ${colorClass}`} />
                        <span className="font-[400] text-[#707070] capitalize">{category}</span>
                      </div>
                      <span className="text-[#1f1f1f] font-[500]">
                        ₹{spentVal.toLocaleString("en-IN")} <span className="text-[#a5a5a5] font-[400]">/ {limitVal.toLocaleString("en-IN")}</span>
                      </span>
                    </div>
                    <div className="h-[4px] rounded-[2px] bg-[#f0f0f0] w-full overflow-hidden">
                      <div 
                        className={`h-full ${isOver ? 'bg-red-500' : colorClass} rounded-[2px]`}
                        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {CATEGORIES.every(c => (parseFloat(limits[c]) || 0) === 0 && (actualSpend[c] || 0) === 0) && (
                <p className="text-[12px] text-[#a5a5a5] text-center pt-2">Enter limits to see your allocation</p>
              )}
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}

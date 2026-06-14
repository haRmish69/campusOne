"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

export function SmartSavings() {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const res = await fetch("/api/budget/insight");
        if (res.ok) {
          const data = await res.json();
          setInsight(data.message);
        }
      } catch (err) {
        console.error("Failed to fetch savings insight", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInsight();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[#ffffff]/80 backdrop-blur-md border border-[#f0f0f0] rounded-[12px] p-[12px_16px] flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
        <Loader2 className="w-4 h-4 animate-spin text-[#a5a5a5]" />
        <p className="text-[12px] text-[#707070] font-medium">Analyzing your spending patterns...</p>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="bg-[#ffffff]/80 backdrop-blur-md border border-[#f0f0f0] rounded-[12px] p-[12px_16px] flex items-start gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
      <Sparkles className="w-4 h-4 text-[#ff5a2f] shrink-0 mt-[2px]" />
      <p className="text-[12px] text-[#707070] leading-relaxed">
        {insight}
      </p>
    </div>
  );
}

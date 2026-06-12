"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, TrendingDown } from "lucide-react";

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
      <Card className="w-full shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
        <CardContent className="flex items-center justify-center p-8 gap-3 text-emerald-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="font-medium">PocketBuddy is analyzing your spending patterns...</p>
        </CardContent>
      </Card>
    );
  }

  if (!insight) return null;

  return (
    <Card className="w-full shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
      <div className="absolute top-0 -left-4 w-32 h-32 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
      
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-xl flex items-center gap-2 text-emerald-900">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          Smart Savings Insight
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-full shrink-0">
            <Sparkles className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-emerald-800 leading-relaxed font-medium pt-1">
            {insight}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

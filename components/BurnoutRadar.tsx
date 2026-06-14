"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Activity, ShieldCheck, AlertOctagon } from "lucide-react";

interface Insight {
  score: number;
  message: string;
  date: string;
}

export function BurnoutRadar() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const res = await fetch("/api/wellness/insight");
        if (!res.ok) throw new Error("Failed to fetch burnout radar");
        const data = await res.json();
        setInsight(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsight();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full shadow-sm mb-8 border-dashed border-2 bg-muted/10">
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[150px] text-center">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
          <h3 className="font-medium">Analyzing Burnout Risk...</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gemini is checking your schedule, spending, and wellness logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error || !insight) {
    return null; // Fail gracefully
  }

  const isHighRisk = insight.score > 70;

  return (
    <Card className={`w-full shadow-sm mb-8 border-l-4 ${isHighRisk ? 'border-l-red-500 bg-[var(--color-canvas-white)]/30' : 'border-l-emerald-500 bg-emerald-50/30'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isHighRisk ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {isHighRisk ? <AlertOctagon className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <h3 className={`text-lg font-bold ${isHighRisk ? 'text-red-900' : 'text-emerald-900'}`}>
                {isHighRisk ? "High Burnout Risk Detected" : "You're Looking Good!"}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Score</span>
                <span className={`px-2.5 py-0.5 rounded-full text-sm font-bold ${isHighRisk ? 'bg-red-200 text-red-800' : 'bg-emerald-200 text-emerald-800'}`}>
                  {insight.score}/100
                </span>
              </div>
            </div>
            
            <p className={`text-sm leading-relaxed mt-2 ${isHighRisk ? 'text-red-800/80' : 'text-emerald-800/80'}`}>
              {insight.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

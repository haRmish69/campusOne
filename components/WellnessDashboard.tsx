"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertOctagon, ShieldCheck } from "lucide-react";
import { WellnessCheckIn } from "./WellnessCheckIn";
import { WellnessTrendChart } from "./WellnessTrendChart";

interface Insight {
  score: number;
  message: string;
  date: string;
}

interface WellnessDashboardProps {
  trendData: any[];
}

export function WellnessDashboard({ trendData }: WellnessDashboardProps) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const res = await fetch("/api/wellness/insight");
        if (!res.ok) throw new Error("Failed to fetch burnout radar");
        const data = await res.json();
        setInsight(data);
      } catch (err) {
        console.error("Failed to load insight", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsight();
  }, []);

  const isHighRisk = insight ? insight.score > 70 : false;

  return (
    <div className="flex flex-col lg:flex-row gap-[32px] lg:gap-[48px]">
      {/* Left Column */}
      <div className="w-full lg:w-[50%] flex flex-col gap-[32px]">
        {/* AI Insight Card */}
        <div className="relative bg-gradient-to-br from-[#fff6f4] to-[#ffffff] border border-[#ffe4dd] rounded-[24px] p-[24px] shadow-[0_4px_20px_rgba(255,90,47,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,90,47,0.08)]">
          {isLoading ? (
            <div className="flex items-center gap-4 w-full py-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#6b7280]" />
              <p className="text-[14px] text-[#6b7280] font-medium animate-pulse">Analyzing your latest wellness patterns...</p>
            </div>
          ) : insight ? (
            <div className="flex items-start gap-4">
              <div className={`mt-1 shrink-0 p-2.5 rounded-2xl ${isHighRisk ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'} shadow-sm`}>
                {isHighRisk ? <AlertOctagon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-[11px] uppercase font-bold text-[#6b7280] tracking-wider mb-2">AI Insight</h4>
                <p className="text-[14px] text-[#374151] leading-relaxed font-medium">
                  {insight.message}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-[#6b7280]">No insights available right now.</p>
          )}
        </div>

        {/* Daily Check In Form */}
        <WellnessCheckIn />
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-[50%] flex flex-col gap-[32px]">
        
        {/* Burnout Risk Score */}
        <div className="bg-white border border-[#e5e7eb] rounded-[24px] p-[28px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group transition-colors">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-bl from-[#ff5a2f]/[0.05] to-transparent rounded-full blur-2xl group-hover:from-[#ff5a2f]/[0.08] transition-all duration-500" />
          <h3 className="text-[11px] uppercase font-bold text-[#6b7280] tracking-widest mb-[16px]">Burnout Risk</h3>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-[56px] flex items-center text-[#6b7280]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : insight ? (
              <>
                <div className={`text-[48px] font-semibold tracking-tight leading-none ${isHighRisk ? 'text-[#ef4444]' : 'text-[#1f2937]'}`}>
                  {insight.score}
                </div>
                <div className="text-[14px] font-medium text-[#6b7280] mb-[8px]">/ 100</div>
              </>
            ) : (
              <div className="text-[48px] font-semibold tracking-tight leading-none text-[#d1d5db]">--</div>
            )}
          </div>
          {insight && !isLoading && (
            <div className="mt-5 flex items-center gap-2">
              <div className="h-[5px] w-full bg-[#f3f4f6] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isHighRisk ? 'bg-[#ef4444]' : 'bg-[#6b7280]'}`} 
                  style={{ width: `${insight.score}%` }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* 14 Day Trend Chart */}
        <div className="bg-white border border-[#e5e7eb] rounded-[24px] p-[28px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex-grow flex flex-col transition-colors">
          <h3 className="text-[11px] uppercase font-bold text-[#6b7280] tracking-widest mb-[24px]">14-Day Trend</h3>
          <div className="flex-grow min-h-[250px] relative">
            <WellnessTrendChart data={trendData} />
          </div>
        </div>
      </div>
    </div>
  );
}

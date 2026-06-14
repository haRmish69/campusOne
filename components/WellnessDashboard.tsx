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
    <div className="flex flex-col md:flex-row gap-[32px] md:gap-[40px]">
      {/* Left Column */}
      <div className="w-full md:w-[55%] flex flex-col gap-[32px]">
        {/* AI Insight Card */}
        <div className="bg-[#ffffff]/80 backdrop-blur-md border border-[#f0f0f0] rounded-[16px] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] min-h-[100px] flex items-center">
          {isLoading ? (
            <div className="flex items-center gap-3 w-full">
              <Loader2 className="w-4 h-4 animate-spin text-[#a5a5a5]" />
              <p className="text-[12px] text-[#707070] font-medium">Analyzing recent wellness and schedule data...</p>
            </div>
          ) : insight ? (
            <div className="flex items-start gap-3">
              <div className={`mt-[2px] shrink-0 p-1.5 rounded-full ${isHighRisk ? 'bg-red-50' : 'bg-gray-50'}`}>
                {isHighRisk ? <AlertOctagon className="w-4 h-4 text-[#ff5a2f]" /> : <ShieldCheck className="w-4 h-4 text-[#a5a5a5]" />}
              </div>
              <p className="text-[13px] text-[#707070] leading-relaxed">
                {insight.message}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-[#a5a5a5]">No insights available right now.</p>
          )}
        </div>

        {/* Daily Check In Form */}
        <WellnessCheckIn />
      </div>

      {/* Right Column */}
      <div className="w-full md:w-[45%] flex flex-col gap-[24px]">
        
        {/* Burnout Risk Score */}
        <div className="bg-[#ffffff] border border-[#efefef] rounded-[16px] p-[20px] md:p-[24px]">
          <h3 className="text-[10px] uppercase font-[700] text-[#a5a5a5] tracking-[0.1em] mb-[12px]">Burnout Risk</h3>
          <div className="flex items-end gap-3">
            {isLoading ? (
              <div className="h-[48px] flex items-center text-[#a5a5a5]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : insight ? (
              <>
                <div className={`text-[48px] font-[300] leading-none ${isHighRisk ? 'text-[#ff5a2f]' : 'text-[#1f1f1f]'}`}>
                  {insight.score}
                </div>
                <div className="text-[14px] text-[#a5a5a5] mb-[6px]">/ 100</div>
              </>
            ) : (
              <div className="text-[48px] font-[300] leading-none text-[#d1d1d1]">--</div>
            )}
          </div>
        </div>

        {/* 14 Day Trend Chart */}
        <div className="bg-[#ffffff] border border-[#efefef] rounded-[16px] p-[20px] md:p-[24px] flex-grow flex flex-col">
          <h3 className="text-[10px] uppercase font-[700] text-[#a5a5a5] tracking-[0.1em] mb-[20px]">14-Day Trend</h3>
          <div className="flex-grow min-h-[250px] relative">
            <WellnessTrendChart data={trendData} />
          </div>
        </div>
      </div>
    </div>
  );
}

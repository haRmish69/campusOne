"use client";

import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertCircle, HeartPulse } from "lucide-react";

export function CampusPulse() {
  const [pulseData, setPulseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPulse() {
      try {
        const res = await fetch("/api/campus/pulse");
        if (res.ok) {
          const data = await res.json();
          setPulseData(data);
        }
      } catch (err) {
        console.error("Failed to fetch campus pulse", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPulse();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--color-fog)] rounded-[8px] p-6 border border-[var(--color-mist-border)] animate-pulse">
        <div className="h-6 bg-[var(--color-paper)] rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-[var(--color-paper)] rounded w-full"></div>
      </div>
    );
  }

  if (!pulseData || pulseData.requiresOnboarding) return null;

  return (
    <div className="bg-gradient-to-br from-[var(--color-ember-orange)] to-[#cc4600] rounded-[8px] p-6 text-white shadow-[var(--shadow-md)] relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <HeartPulse className="w-5 h-5 text-white" />
          <h2 className="text-lg font-semibold tracking-wide flex items-center gap-2">
            Campus Pulse <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">Live</span>
          </h2>
        </div>

        <p className="text-white/90 leading-relaxed text-sm md:text-base">
          {pulseData.pulse}
        </p>

        {pulseData.count > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm bg-black/20 rounded-[8px] p-3 inline-flex">
            <div className="flex flex-col">
              <span className="text-white/70 text-xs uppercase tracking-wider font-medium">Avg Mood</span>
              <span className="font-semibold text-white">{pulseData.avgMood?.toFixed(1)}/5</span>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="flex flex-col">
              <span className="text-white/70 text-xs uppercase tracking-wider font-medium">Avg Stress</span>
              <span className="font-semibold text-white">{pulseData.avgStress?.toFixed(1)}/5</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

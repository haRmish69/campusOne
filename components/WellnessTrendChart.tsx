"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState } from "./EmptyState";
import { HeartPulse } from "lucide-react";

interface WellnessTrendChartProps {
  data: {
    date: string;
    mood: number;
    stress: number;
  }[];
}

export function WellnessTrendChart({ data }: WellnessTrendChartProps) {
  const hasData = data.some(d => d.mood > 0 || d.stress > 0);

  if (!hasData) {
    return (
      <EmptyState 
        icon={HeartPulse} 
        heading="No wellness data yet" 
        subtitle="Complete your daily check-in above to start tracking your trends" 
        ctaLabel="Check In Now" 
        onCtaClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
      />
    );
  }

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: -20,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-paper)" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-pewter)' }}
            dy={10}
          />
          <YAxis 
            domain={[0, 5]} 
            ticks={[1, 2, 3, 4, 5]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-pewter)' }}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none',
              boxShadow: 'rgba(0,0,0,0.1) 0px 4px 12px',
              backgroundColor: 'var(--color-canvas-white)'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="mood" 
            stroke="#ff5a2f" 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            name="Mood"
          />
          <Line 
            type="monotone" 
            dataKey="stress" 
            stroke="#1f1f1f" 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            name="Stress"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-[var(--color-paper)] text-[14px] text-[var(--color-stone)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--color-ember-orange)] rounded-full" /> Mood
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--color-graphite)] rounded-full" /> Stress
        </div>
      </div>
    </div>
  );
}

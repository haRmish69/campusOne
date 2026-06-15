"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WellnessTrendChartProps {
  data: {
    date: string;
    mood: number;
    stress: number;
  }[];
}

export function WellnessTrendChart({ data }: WellnessTrendChartProps) {
  const hasData = data.some(d => d.mood > 0 || d.stress > 0);

  // If no data, render a "ghost" chart that shows the faint lines of an example chart
  // to give the user a sense of what will appear.
  if (!hasData) {
    const ghostData = Array.from({ length: 14 }).map((_, i) => ({
      date: `Day ${i+1}`,
      mood: 3 + Math.sin(i) * 1.5,
      stress: 3 + Math.cos(i) * 1.5,
    }));

    return (
      <div className="absolute inset-0 w-full h-full">
        {/* Ghost Chart */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none grayscale">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ghostData}
              margin={{ top: 5, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 5]} hide />
              <Line type="monotone" dataKey="mood" stroke="#ff5a2f" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="stress" stroke="#111827" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Call to action overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h4 className="text-[14px] font-[600] text-[#111827] mb-1">No data yet</h4>
          <p className="text-[13px] text-[#9ca3af] max-w-[200px] leading-relaxed">
            Complete your daily check-in to start building your wellness trend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col">
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
              dy={10}
            />
            <YAxis 
              domain={[0, 5]} 
              ticks={[1, 2, 3, 4, 5]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(8px)',
                fontSize: '12px',
                fontWeight: 500,
                color: '#1e293b'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 700 }}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="#f97316" 
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
              activeDot={{ r: 5, fill: '#f97316', stroke: '#ffffff', strokeWidth: 1.5 }}
              name="Mood"
            />
            <Line 
              type="monotone" 
              dataKey="stress" 
              stroke="#64748b" 
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
              activeDot={{ r: 5, fill: '#64748b', stroke: '#ffffff', strokeWidth: 1.5 }}
              name="Stress"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Custom Legend */}
      <div className="flex items-center justify-center gap-[24px] mt-[16px] pt-[16px] border-t border-[#f1f5f9]">
        <div className="flex items-center gap-[6px] group cursor-pointer">
          <div className="w-[8px] h-[8px] bg-[#f97316] rounded-full transition-transform" />
          <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider group-hover:text-[#475569] transition-colors">Mood</span>
        </div>
        <div className="flex items-center gap-[6px] group cursor-pointer">
          <div className="w-[8px] h-[8px] bg-[#64748b] rounded-full transition-transform" />
          <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider group-hover:text-[#475569] transition-colors">Stress</span>
        </div>
      </div>
    </div>
  );
}

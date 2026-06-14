"use client";

import Link from "next/link";
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Sparkles } from "lucide-react";
import "@/app/dashboard/dashboard.css";

export function BurnoutWidget({ data }: { data: any }) {
  if (!data) return null;

  // e.g. "Low", "Moderate", "High", "Critical"
  const label = data.label || "Unknown";
  
  // The only place green is allowed is for positive health status
  const isImproving = label === "Low" || label === "Improving";

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Burnout Risk
        </span>
        <Link href="/wellness" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--acc)', textDecoration: 'none' }}>
          Track →
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span className="burnout-score">{data.score}%</span>
        {isImproving && (
          <span className="improving-badge">Improving</span>
        )}
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${data.score}%`, backgroundColor: isImproving ? '#1B7A4A' : 'var(--acc)' }}
        />
      </div>

      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)', marginTop: '8px', marginBottom: '8px' }}>
        Key Drivers
      </p>

      {data.keyDrivers && data.keyDrivers.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.keyDrivers.map((driver: string, idx: number) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text2)' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text3)', flexShrink: 0, marginTop: '7px' }} />
              {driver}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>Not enough data to determine drivers.</p>
      )}

      {data.recommendation && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <Sparkles size={12} style={{ color: 'var(--acc)', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
              {data.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import Link from "next/link";
import "@/app/dashboard/dashboard.css";

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
      <div className="card animate-pulse">
        <div style={{ height: '16px', background: 'var(--surface2)', borderRadius: '4px', width: '33%', marginBottom: '16px' }}></div>
        <div style={{ height: '40px', background: 'var(--surface2)', borderRadius: '4px', width: '100%' }}></div>
      </div>
    );
  }

  if (!pulseData || pulseData.requiresOnboarding) return null;

  return (
    <div className="card">
      
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'var(--surface2)' }}>
            <Activity size={13} style={{ color: 'var(--text3)' }} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Campus Pulse
          </span>
        </div>
        {/* LIVE badge — acc-soft bg and acc text */}
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--acc)', backgroundColor: 'var(--acc-soft)', borderRadius: '20px', padding: '3px 8px', letterSpacing: '0.5px' }}>
          LIVE
        </span>
      </div>

      {/* Content */}
      <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
        {pulseData.count === 0 ? (
          <Link href="/wellness" style={{ color: 'var(--acc)', fontWeight: 600, textDecoration: 'none' }}>
            Not enough data. Be the first to log your wellness →
          </Link>
        ) : (
          pulseData.pulse
        )}
      </p>

    </div>
  );
}

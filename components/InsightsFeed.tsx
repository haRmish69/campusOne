"use client";

import { AlertTriangle, Bell } from "lucide-react";
import Link from "next/link";
import "@/app/dashboard/dashboard.css";

export function InsightsFeed({ alerts }: { alerts: any[] }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="card">
      <div className="section-header" style={{ marginBottom: '8px' }}>
        <h2 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Proactive Insights
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--acc)', backgroundColor: 'var(--acc-soft)', padding: '2px 8px', borderRadius: '20px' }}>
            {alerts.length}
          </span>
        </h2>
      </div>

      <div>
        {alerts.map((alert: any, idx: number) => {
          const isUrgent = alert.type === "WARNING" || alert.type === "CRITICAL";
          
          return (
            <div key={idx} className="insight-row">
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                {isUrgent ? (
                  <AlertTriangle size={16} style={{ color: 'var(--acc)' }} />
                ) : (
                  <Bell size={16} style={{ color: 'var(--acc)' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)', margin: '0 0 4px' }}>
                  {alert.title}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text2)', margin: '0 0 6px', lineHeight: 1.5 }}>
                  {alert.message}
                </p>
                {alert.actionLink && (
                  <Link href={alert.actionLink} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--acc)', textDecoration: 'none' }}>
                    {alert.actionText || "Take action →"}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

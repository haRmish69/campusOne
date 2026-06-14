"use client";

import { useState } from "react";
import { Notice } from "@prisma/client";
import { differenceInDays, isPast, startOfDay } from "date-fns";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import "@/app/notices/notices.css";

export function NoticeCard({ notice }: { notice: Notice }) {
  const [expanded, setExpanded] = useState(false);

  const getDeadlineInfo = (date: Date | string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    if (isPast(d) && differenceInDays(startOfDay(new Date()), startOfDay(d)) > 0) {
      return { text: "Past", class: "normal" };
    }
    
    const days = differenceInDays(startOfDay(d), startOfDay(new Date()));
    
    if (days <= 2) return { text: `in ${days === 1 ? "1 day" : days + " days"}`, class: "urgent" };
    if (days <= 5) return { text: `in ${days} days`, class: "warning" };
    return { text: `in ${days} days`, class: "normal" };
  };

  const deadline = getDeadlineInfo(notice.eventDate);

  return (
    <div className="card">
      {/* TOP ROW: tags left, deadline right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <span className="chip category">
            {notice.category}
          </span>
          <span className="chip meta">
            {notice.source}
          </span>
        </div>
        
        {deadline && (
          <div className={`deadline ${deadline.class}`}>
            <span className="dot"></span>
            <Calendar size={12} />
            {deadline.text}
          </div>
        )}
      </div>

      {/* TITLE */}
      <h3 className="card-title">
        {notice.title}
      </h3>

      {/* DESCRIPTION */}
      <p className="card-desc" style={expanded ? { display: 'block' } : {}}>
        {notice.body}
      </p>

      {/* AI ACTION */}
      {notice.actionRequired && (
        <>
          <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 11px' }}></div>
          <p className="ai-label">AI ACTION</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '12px' }}>
            <Sparkles style={{ width: '13px', height: '13px', color: 'var(--acc)', flexShrink: 0, marginTop: '1px' }} />
            <p className="ai-text">
              {notice.actionRequired}
            </p>
          </div>
        </>
      )}

      {/* READ MORE CTA */}
      {(notice.body.length > 100 || notice.actionRequired) && (
        <button 
          onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
          className="read-more"
        >
          {expanded ? "Show less" : "Read more"} <ArrowRight size={12} />
        </button>
      )}

    </div>
  );
}

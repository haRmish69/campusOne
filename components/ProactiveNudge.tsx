"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NudgeType =
  | "mess_feedback"
  | "study_gap"
  | "wellness_checkin"
  | "expense_check"
  | null;

interface NudgeData {
  nudge: string | null;
  type: NudgeType;
  actionLabel: string | null;
  actionHref: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProactiveNudge() {
  const [data, setData] = useState<NudgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [messFeedbackGiven, setMessFeedbackGiven] = useState<string | null>(
    null
  );
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch nudge exactly ONCE on mount (empty dependency array)
  useEffect(() => {
    let cancelled = false;

    async function fetchNudge() {
      try {
        const res = await fetch("/api/nudge");
        if (!res.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Network error, CORS issue, etc. — fail silently
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNudge();

    // Cleanup: prevent setState on unmounted component + clear dismiss timer
    return () => {
      cancelled = true;
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // ── Mess Feedback Handler ──────────────────────────────────────────────
  const handleMessFeedback = (feedback: string) => {
    setMessFeedbackGiven(feedback);
    // Show "Thanks! ✓" for 1.5s, then auto-dismiss
    dismissTimerRef.current = setTimeout(() => {
      setDismissed(true);
    }, 1500);
  };

  // ── Render Rules ───────────────────────────────────────────────────────
  // Loading: render NOTHING (no skeleton, no layout jump)
  if (loading) return null;
  // Null nudge or dismissed: render NOTHING
  if (!data?.nudge) return null;
  if (dismissed) return null;

  return (
    <div
      style={{
        gridColumn: "1 / -1",
        background: "var(--acc-soft)",
        border: "1px solid var(--acc)",
        borderRadius: "16px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        position: "relative",
        animation: "fade-in-up 0.3s ease-out both",
      }}
    >
      {/* AI Sparkle Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          borderRadius: "10px",
          background: "var(--acc)",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        <Sparkles size={16} color="#FFFFFF" />
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: "20px" }}>
        <p
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text1)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {data.nudge}
        </p>

        {/* Action Buttons — varies by type */}
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Mess Feedback: 3 inline buttons */}
          {data.type === "mess_feedback" && !messFeedbackGiven && (
            <>
              {["👍 Good", "😐 Average", "👎 Bad"].map((label) => (
                <button
                  key={label}
                  onClick={() => handleMessFeedback(label)}
                  style={{
                    padding: "5px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "20px",
                    border: "1px solid var(--acc)",
                    background: "var(--surface)",
                    color: "var(--acc)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              ))}
            </>
          )}

          {/* Mess Feedback: Confirmation state */}
          {data.type === "mess_feedback" && messFeedbackGiven && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--acc)",
              }}
            >
              Thanks! ✓
            </span>
          )}

          {/* Other types: Link-based navigation button */}
          {data.type !== "mess_feedback" &&
            data.actionHref &&
            data.actionLabel && (
              <Link
                href={data.actionHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "20px",
                  background: "var(--acc)",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  transition: "opacity 0.15s ease",
                }}
              >
                {data.actionLabel}
              </Link>
            )}
        </div>
      </div>

      {/* Dismiss (X) Button */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          color: "var(--text3)",
          transition: "color 0.15s ease",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

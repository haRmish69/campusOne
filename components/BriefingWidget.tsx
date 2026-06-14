"use client";

import { useState } from "react";
import { Sun, Moon, Loader2, X, Check, Heart } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import "@/app/dashboard/dashboard.css";

interface WellnessQuestion {
  id: string;
  question: string;
  options: { label: string; value: number | string }[];
}

export function BriefingWidget() {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [dynamicQuestions, setDynamicQuestions] = useState<WellnessQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"morning" | "evening" | null>(null);

  // Wellness check-in state
  const [showWellness, setShowWellness] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wellnessDone, setWellnessDone] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");

  const triggerBriefing = async (type: "morning" | "evening") => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingType(type);
    setBriefing(null);
    setShowWellness(false);
    setWellnessDone(false);
    setCurrentQuestion(0);
    setAnswers({});

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Failed to generate briefing");
      }

      const data = await res.json();
      setBriefing(data.briefing);
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        setDynamicQuestions(data.questions);
        setShowWellness(true);
      }
    } catch (error: any) {
      console.error("Briefing error:", error);
      setBriefing(`❌ ${error.message}`);
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const handleAnswer = (questionId: string, value: number | string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentQuestion < dynamicQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    } else {
      submitWellness(newAnswers);
    }
  };

  const submitWellness = async (finalAnswers: Record<string, number | string>) => {
    setIsSubmitting(true);

    const payloadText = Object.entries(finalAnswers)
      .map(([id, val]) => {
        const q = dynamicQuestions.find((q) => q.id === id);
        return `${q?.question || id}: ${val}`;
      })
      .join(". ");

    try {
      const res = await fetch("/api/wellness-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: payloadText,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save wellness data");
      }

      const data = await res.json();
      setConfirmationMsg(data.response || "Your wellness check-in has been logged! 💙");
      setWellnessDone(true);
      setShowWellness(false);
      toast.success("Wellness check-in saved!");
    } catch (error: any) {
      console.error("Wellness submit error:", error);
      toast.error("Failed to save wellness data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = dynamicQuestions[currentQuestion];
  const progress = ((currentQuestion + (answers[currentQ?.id] !== undefined ? 1 : 0)) / dynamicQuestions.length) * 100;

  return (
    <div className="card">
      <h2 className="section-heading" style={{ marginBottom: '16px' }}>Daily Briefing</h2>

      {/* ─── Trigger Buttons ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={() => triggerBriefing("morning")}
          disabled={isLoading}
          className="brief-btn"
          style={{ flex: 1 }}
        >
          {isLoading && loadingType === "morning" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sun size={16} />
          )}
          Morning Briefing
        </button>
        <button
          onClick={() => triggerBriefing("evening")}
          disabled={isLoading}
          className="brief-btn"
          style={{ flex: 1 }}
        >
          {isLoading && loadingType === "evening" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Moon size={16} />
          )}
          Evening Wrap-up
        </button>
      </div>

      {/* ─── Loading State ────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface2)', borderRadius: '9px' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--text3)' }} size={24} />
          <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0 }}>Generating your briefing...</p>
        </div>
      )}

      {/* ─── Briefing Card ────────────────────────────────────────── */}
      {briefing && !isLoading && (
        <div style={{ position: 'relative', padding: '20px', background: 'var(--surface2)', borderRadius: '9px', marginBottom: '16px' }}>
          <button
            onClick={() => { setBriefing(null); setShowWellness(false); setWellnessDone(false); }}
            style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
          >
            <X size={14} />
          </button>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>
            <ReactMarkdown
              components={{
                p: ({node, ...props}: any) => <p style={{ margin: '0 0 8px' }} {...props} />,
                ul: ({node, ...props}: any) => <ul style={{ margin: '0 0 8px', paddingLeft: '20px' }} {...props} />,
                ol: ({node, ...props}: any) => <ol style={{ margin: '0 0 8px', paddingLeft: '20px' }} {...props} />,
                li: ({node, ...props}: any) => <li style={{ marginBottom: '4px' }} {...props} />,
                strong: ({node, ...props}: any) => <strong style={{ fontWeight: 600, color: 'var(--text1)' }} {...props} />,
              }}
            >
              {briefing}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* ─── Wellness MCQ Check-in ────────────────────────────────── */}
      {showWellness && !wellnessDone && !isLoading && (
        <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', marginTop: '4px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Heart size={14} style={{ color: 'var(--acc)' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)', margin: 0 }}>Quick Check-in</h3>
            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 500, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 6px', borderRadius: '20px' }}>
              {currentQuestion + 1} / {dynamicQuestions.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar" style={{ marginBottom: '20px' }}>
            <div
              className="progress-fill"
              style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
            />
          </div>

          {/* Current Question */}
          {isSubmitting ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--acc)' }} size={24} />
              <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0 }}>Saving your check-in...</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text1)', marginBottom: '16px', margin: 0 }}>
                {currentQ.question}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '16px' }}>
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => handleAnswer(currentQ.id, opt.value)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        borderRadius: '9px',
                        border: `1.5px solid ${isSelected ? 'var(--acc)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--acc-soft)' : 'var(--surface)',
                        color: isSelected ? 'var(--acc)' : 'var(--text2)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {opt.label}
                      {isSelected && <Check size={14} style={{ color: 'var(--acc)' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Confirmation ─────────────────────────────────────────── */}
      {wellnessDone && (
        <div className="empty-state" style={{ marginTop: '16px', background: '#E2F4EC', border: '1px solid #1B7A4A33' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#1B7A4A22', flexShrink: 0 }}>
            <Check size={14} style={{ color: '#1B7A4A' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1B7A4A', margin: '0 0 4px' }}>Check-in Complete!</h3>
            <p style={{ fontSize: '12px', color: '#1B7A4A', margin: 0, opacity: 0.8 }}>{confirmationMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sun, Moon, Loader2, X, Check, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

// ─── Wellness Questions ──────────────────────────────────────────────────
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

    // Move to next question or submit
    if (currentQuestion < dynamicQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    } else {
      // All questions answered — submit
      submitWellness(newAnswers);
    }
  };

  const submitWellness = async (finalAnswers: Record<string, number | string>) => {
    setIsSubmitting(true);

    // Build a natural language summary from the MCQ answers
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
      toast.success("Wellness check-in saved! 💙");
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
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Daily Briefing</h2>
      </div>

      {/* ─── Trigger Buttons ──────────────────────────────────────── */}
      <div className="flex gap-3 mb-4">
        <Button
          variant="outline"
          onClick={() => triggerBriefing("morning")}
          disabled={isLoading}
          className="rounded-[8px] px-6 py-5 h-auto text-[15px] border-amber-300/50 text-amber-700 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm hover:shadow-md"
        >
          {isLoading && loadingType === "morning" ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Sun className="w-5 h-5 mr-2 text-amber-500" />
          )}
          🌅 Morning Briefing
        </Button>
        <Button
          variant="outline"
          onClick={() => triggerBriefing("evening")}
          disabled={isLoading}
          className="rounded-[8px] px-6 py-5 h-auto text-[15px] border-indigo-300/50 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-sm hover:shadow-md"
        >
          {isLoading && loadingType === "evening" ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Moon className="w-5 h-5 mr-2 text-indigo-500" />
          )}
          🌙 Evening Wrap-up
        </Button>
      </div>

      {/* ─── Loading State ────────────────────────────────────────── */}
      {isLoading && (
        <div className="p-6 rounded-[8px] border border-[var(--color-mist-border)] bg-[var(--color-fog)] text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--color-slate-blue)]" />
          <p className="text-sm text-[var(--color-slate-blue)]">Generating your briefing...</p>
        </div>
      )}

      {/* ─── Briefing Card ────────────────────────────────────────── */}
      {briefing && !isLoading && (
        <div className="relative p-6 rounded-[8px] border border-[var(--color-mist-border)] bg-gradient-to-br from-[var(--color-paper)] to-[var(--color-fog)] shadow-[var(--shadow-sm)]">
          <button
            onClick={() => { setBriefing(null); setShowWellness(false); setWellnessDone(false); }}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4 text-[var(--color-slate-blue)]" />
          </button>
          <div className="prose prose-sm max-w-none text-[var(--color-midnight-navy)] leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({node, ...props}: any) => <ul className="list-disc ml-4 mb-2" {...props} />,
                ol: ({node, ...props}: any) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
                strong: ({node, ...props}: any) => <strong className="font-semibold" {...props} />,
              }}
            >
              {briefing}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* ─── Wellness MCQ Check-in ────────────────────────────────── */}
      {showWellness && !wellnessDone && !isLoading && (
        <div className="mt-4 p-6 rounded-[8px] border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold text-[var(--color-midnight-navy)]">Quick Wellness Check-in</h3>
            <span className="ml-auto text-xs font-medium text-[var(--color-slate-blue)] bg-white/80 px-2 py-0.5 rounded-full">
              {currentQuestion + 1} / {dynamicQuestions.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-blue-100 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Current Question */}
          {isSubmitting ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
              <p className="text-sm text-[var(--color-slate-blue)]">Saving your check-in...</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <p className="text-[16px] font-medium text-[var(--color-midnight-navy)] mb-4">
                {currentQ.question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => handleAnswer(currentQ.id, opt.value)}
                      className={`
                        text-left px-4 py-3 rounded-[8px] border-2 text-[14px] font-medium transition-all duration-200
                        ${isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-200"
                          : "border-[var(--color-mist-border)] bg-white text-[var(--color-midnight-navy)] hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm"
                        }
                      `}
                    >
                      <span className="flex items-center justify-between">
                        {opt.label}
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation dots */}
              <div className="flex justify-center gap-1.5 mt-5">
                {dynamicQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === currentQuestion
                        ? "bg-blue-500 w-6"
                        : i < currentQuestion
                        ? "bg-blue-400"
                        : "bg-blue-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Confirmation ─────────────────────────────────────────── */}
      {wellnessDone && (
        <div className="mt-4 p-6 rounded-[8px] border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-green-50/60 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 shrink-0">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800 mb-1">Check-in Complete!</h3>
              <p className="text-sm text-emerald-700 leading-relaxed">{confirmationMsg}</p>
              <div className="flex gap-2 mt-3 text-xs text-emerald-600">
                <span className="bg-emerald-100 px-2 py-0.5 rounded-full">😴 Sleep: {answers.sleep}h</span>
                <span className="bg-emerald-100 px-2 py-0.5 rounded-full">😊 Mood: {answers.mood}/10</span>
                <span className="bg-emerald-100 px-2 py-0.5 rounded-full">😰 Stress: {answers.stress}/10</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

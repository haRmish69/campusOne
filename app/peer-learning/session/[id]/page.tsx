"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, CheckCircle2, Star, MessageSquare, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";

type SessionData = {
  id: string;
  requestId: string;
  topic: string;
  status: string;
  proposedSlots: any[];
  requesterSlotChoice: number | null;
  helperSlotChoice: number | null;
  agreedSlot: any | null;
  contactShared: boolean;
  scheduledFor: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  requesterRating: number | null;
  requesterReview: string | null;
  helperRating: number | null;
  helperReview: string | null;
  isRequester: boolean;
  requester: { id: string; name: string; branch: string; year: number; whatsappNumber: string | null } | null;
  helper: { id: string; name: string; branch: string; year: number; whatsappNumber: string | null } | null;
};

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [choosingSlot, setChoosingSlot] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const fetchSession = () => {
    fetch(`/api/peer/session/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.id) setSession(d); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchSession(); }, [id]);

  // Poll for updates every 10 seconds during pending_schedule
  useEffect(() => {
    if (session?.status !== "pending_schedule") return;
    const interval = setInterval(fetchSession, 10000);
    return () => clearInterval(interval);
  }, [session?.status]);

  const handleChooseSlot = async (slotIndex: number) => {
    setChoosingSlot(true);
    try {
      const res = await fetch(`/api/peer/session/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "choose-slot", slotIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || "Failed to choose slot");
    } finally {
      setChoosingSlot(false);
    }
  };

  const handleComplete = async () => {
    if (rating === 0) return toast.error("Please select a rating");
    setIsSubmittingRating(true);
    try {
      const res = await fetch(`/api/peer/session/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", rating, review }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete session");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleHelperRate = async () => {
    if (rating === 0) return toast.error("Please select a rating");
    setIsSubmittingRating(true);
    try {
      const res = await fetch(`/api/peer/session/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "helper-rate", rating, review }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-10 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-[var(--color-pearl)] animate-pulse rounded-[20px]" />)}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-10 max-w-4xl mx-auto text-center py-20">
        <p className="text-[var(--color-stone)]">Session not found</p>
        <Link href="/peer-learning" className="text-[var(--color-pewter)] hover:text-[var(--color-stone)] text-sm mt-2 inline-block">← Back to Study Peers</Link>
      </div>
    );
  }

  const otherPerson = session.isRequester ? session.helper : session.requester;
  const mySlotChoice = session.isRequester ? session.requesterSlotChoice : session.helperSlotChoice;
  const otherSlotChoice = session.isRequester ? session.helperSlotChoice : session.requesterSlotChoice;

  const handleCancelSession = async () => {
    if (!confirm("Are you sure you want to cancel this session?")) return;
    try {
      const res = await fetch(`/api/peer/help-request/${session.requestId}/select`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Session cancelled successfully");
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel session");
    }
  };

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/peer-learning" className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-stone)] hover:text-[var(--color-graphite)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Study Peers
        </Link>
        {session.isRequester && ["pending_schedule", "confirmed"].includes(session.status) && (
          <button onClick={handleCancelSession} className="text-[13px] font-medium text-[var(--color-stone)] hover:text-red-600 transition-colors px-3 py-1.5 rounded-[20px] hover:bg-[var(--color-pearl)]">
            Cancel Session
          </button>
        )}
      </div>

      {/* Topic chip */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-canvas-white)] border border-[var(--color-paper)] text-[var(--color-graphite)] text-[13px] font-medium mb-6">
        {session.topic}
      </div>

      {/* ── PHASE 1: Pending Schedule ── */}
      {session.status === "pending_schedule" && (
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--color-graphite)] mb-2">Choose a study time</h1>
          <p className="text-[var(--color-stone)] text-[14px] mb-8">
            Both you and {otherPerson?.name || "your partner"} need to pick a slot. When you both choose the same one, the session is confirmed automatically.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {session.proposedSlots.map((slot: any, i: number) => {
              const isMyChoice = mySlotChoice === i;
              const isOtherChoice = otherSlotChoice === i;

              return (
                <div
                  key={i}
                  className={`rounded-[20px] border p-6 transition-all duration-200 ${
                    isMyChoice
                      ? "border-[var(--color-ember-orange)] bg-[var(--color-canvas-white)] ring-1 ring-[var(--color-ember-orange)]"
                      : "border-[var(--color-paper)] bg-[var(--color-canvas-white)] hover:border-[var(--color-mist)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-[var(--color-pewter)]" />
                    <span className="font-semibold text-[var(--color-graphite)]">{slot.label || `Slot ${i + 1}`}</span>
                  </div>
                  <p className="text-[13px] text-[var(--color-stone)] mb-1">{slot.day}, {slot.date}</p>
                  <p className="text-[13px] text-[var(--color-stone)] mb-4 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {slot.startTime} – {slot.endTime}
                  </p>

                  <div className="flex flex-col gap-1 mb-4 text-[12px]">
                    <span className={slot.requesterFree ? "text-[var(--color-graphite)]" : "text-[var(--color-stone)]"}>
                      {slot.requesterFree ? "✓" : "✗"} {session.isRequester ? "You're" : (session.requester?.name || "Requester") + " is"} free
                    </span>
                    <span className={slot.helperFree ? "text-[var(--color-graphite)]" : "text-[var(--color-stone)]"}>
                      {slot.helperFree ? "✓" : "✗"} {!session.isRequester ? "You're" : (session.helper?.name || "Helper") + " is"} free
                    </span>
                  </div>

                  {isMyChoice ? (
                     <div className="text-center text-[13px] font-medium text-[var(--color-ember-orange)]">
                      ✓ Your choice
                      {otherSlotChoice === null && (
                        <p className="text-[11px] text-[var(--color-pewter)] mt-1">Waiting for {otherPerson?.name || "partner"}...</p>
                      )}
                    </div>
                  ) : mySlotChoice === null ? (
                    <button
                      onClick={() => handleChooseSlot(i)}
                      disabled={choosingSlot}
                      className="w-full px-4 py-2.5 rounded-[30px] bg-[var(--color-graphite)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {choosingSlot ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Choose This Time"}
                    </button>
                  ) : (
                    <div className="text-center text-[12px] text-[var(--color-pewter)]">Not selected</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PHASE 2: Confirmed ── */}
      {session.status === "confirmed" && (
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--color-graphite)] mb-2">Session confirmed!</h1>

          {/* Date & Time */}
          {session.agreedSlot && (
            <div className="mt-6 rounded-[20px] bg-[var(--color-pearl)] border border-[var(--color-paper)] p-6">
              <div className="flex items-center gap-3 text-[var(--color-graphite)]">
                <Calendar className="w-6 h-6" />
                <div>
                  <p className="font-bold text-[16px]">{session.agreedSlot.day}, {session.agreedSlot.date}</p>
                  <p className="text-[14px]">{session.agreedSlot.startTime} – {session.agreedSlot.endTime}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Card */}
          {session.contactShared && otherPerson && (
            <div className="mt-6 rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-[var(--color-pearl)] border border-[var(--color-paper)] flex items-center justify-center text-[var(--color-graphite)] font-bold text-xl">
                  {otherPerson.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-graphite)]">{otherPerson.name}</h3>
                  <p className="text-[12px] text-[var(--color-pewter)]">{otherPerson.branch} · Year {otherPerson.year}</p>
                </div>
              </div>

              {otherPerson.whatsappNumber && (
                <div className="flex items-center justify-between bg-[var(--color-pearl)] rounded-[20px] p-4 border border-[var(--color-paper)]">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[var(--color-graphite)]" />
                    <span className="font-mono text-[14px] text-[var(--color-graphite)]">{otherPerson.whatsappNumber}</span>
                  </div>
                  <a
                    href={`https://wa.me/${otherPerson.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
                  >
                    Open WhatsApp →
                  </a>
                </div>
              )}
              <p className="text-[12px] text-[var(--color-pewter)] mt-3 text-center">Only visible to both of you</p>
            </div>
          )}

          <p className="text-[13px] text-[var(--color-stone)] mt-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-graphite)]" />
            We've added this to your CampusFlow schedule
          </p>

          {/* Mark Complete Button (only for requester, after scheduled time) */}
          {session.isRequester && session.scheduledFor && new Date(session.scheduledFor) <= new Date() && (
            <div className="mt-8 rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-6">
              <h3 className="font-semibold text-[var(--color-graphite)] mb-3">How was your session with {otherPerson?.name}?</h3>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${s <= rating ? "text-[var(--color-ember-orange)] fill-[var(--color-ember-orange)]" : "text-[var(--color-mist)]"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Leave a comment (optional)"
                className="w-full px-4 py-3 rounded-[20px] border border-[var(--color-paper)] text-[13px] focus:outline-none focus:border-[var(--color-ember-orange)] resize-none h-20 mb-3"
                maxLength={300}
              />
              <button onClick={handleComplete} disabled={isSubmittingRating} className="px-6 py-3 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Complete & Submit Rating"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: Completed ── */}
      {session.status === "completed" && (
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--color-graphite)] mb-2">Session Complete</h1>

          {/* Show existing ratings */}
          {session.requesterRating && (
            <div className="mt-6 rounded-[20px] bg-[var(--color-pearl)] border border-[var(--color-paper)] p-6">
              <p className="text-[13px] text-[var(--color-stone)] mb-2">Rating given to helper:</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-6 h-6 ${s <= session.requesterRating! ? "text-[var(--color-ember-orange)] fill-[var(--color-ember-orange)]" : "text-[var(--color-mist)]"}`} />
                ))}
              </div>
              {session.requesterReview && <p className="text-[13px] text-[var(--color-stone)] mt-2 italic">"{session.requesterReview}"</p>}
            </div>
          )}

          {/* Helper rating form (if helper hasn't rated yet) */}
          {!session.isRequester && session.helperRating === null && (
            <div className="mt-6 rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-6">
              <h3 className="font-semibold text-[var(--color-graphite)] mb-3">Rate your experience with {session.requester?.name}</h3>
              <p className="text-[13px] text-[var(--color-stone)] mb-3">Were they prepared? Responsive?</p>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${s <= rating ? "text-[var(--color-ember-orange)] fill-[var(--color-ember-orange)]" : "text-[var(--color-mist)]"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Optional feedback"
                className="w-full px-4 py-3 rounded-[20px] border border-[var(--color-paper)] text-[13px] focus:outline-none focus:border-[var(--color-ember-orange)] resize-none h-20 mb-3"
                maxLength={300}
              />
              <button onClick={handleHelperRate} disabled={isSubmittingRating} className="px-6 py-3 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Rating"}
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/peer-learning" className="px-6 py-3 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity inline-block">
              Start another request →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

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
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-10 max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-500">Session not found</p>
        <Link href="/peer-learning" className="text-indigo-500 text-sm mt-2 inline-block">← Back to Study Peers</Link>
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
        <Link href="/peer-learning" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#0b3558] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Study Peers
        </Link>
        {session.isRequester && ["pending_schedule", "confirmed"].includes(session.status) && (
          <button onClick={handleCancelSession} className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
            Cancel Session
          </button>
        )}
      </div>

      {/* Topic chip */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6">
        📚 {session.topic}
      </div>

      {/* ── PHASE 1: Pending Schedule ── */}
      {session.status === "pending_schedule" && (
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0b3558] mb-2">Choose a study time</h1>
          <p className="text-gray-500 mb-8">
            Both you and {otherPerson?.name || "your partner"} need to pick a slot. When you both choose the same one, the session is confirmed automatically.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {session.proposedSlots.map((slot: any, i: number) => {
              const isMyChoice = mySlotChoice === i;
              const isOtherChoice = otherSlotChoice === i;

              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-6 transition-all duration-200 ${
                    isMyChoice
                      ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                      : "border-gray-100 bg-white hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-[#0b3558]">{slot.label || `Slot ${i + 1}`}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{slot.day}, {slot.date}</p>
                  <p className="text-sm text-gray-600 mb-4 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {slot.startTime} – {slot.endTime}
                  </p>

                  <div className="flex flex-col gap-1 mb-4 text-xs">
                    <span className={slot.requesterFree ? "text-emerald-600" : "text-red-500"}>
                      {slot.requesterFree ? "✓" : "✗"} {session.isRequester ? "You're" : (session.requester?.name || "Requester") + " is"} free
                    </span>
                    <span className={slot.helperFree ? "text-emerald-600" : "text-red-500"}>
                      {slot.helperFree ? "✓" : "✗"} {!session.isRequester ? "You're" : (session.helper?.name || "Helper") + " is"} free
                    </span>
                  </div>

                  {isMyChoice ? (
                    <div className="text-center text-sm font-medium text-indigo-600">
                      ✓ Your choice
                      {otherSlotChoice === null && (
                        <p className="text-xs text-gray-400 mt-1">Waiting for {otherPerson?.name || "partner"}...</p>
                      )}
                    </div>
                  ) : mySlotChoice === null ? (
                    <button
                      onClick={() => handleChooseSlot(i)}
                      disabled={choosingSlot}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b3558] text-white text-sm font-medium hover:bg-[#0b3558]/90 transition-colors disabled:opacity-50"
                    >
                      {choosingSlot ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Choose This Time"}
                    </button>
                  ) : (
                    <div className="text-center text-xs text-gray-400">Not selected</div>
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
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0b3558] mb-2">Session confirmed! 🎉</h1>

          {/* Date & Time */}
          {session.agreedSlot && (
            <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-100 p-6">
              <div className="flex items-center gap-3 text-emerald-700">
                <Calendar className="w-6 h-6" />
                <div>
                  <p className="font-bold text-lg">{session.agreedSlot.day}, {session.agreedSlot.date}</p>
                  <p className="text-sm">{session.agreedSlot.startTime} – {session.agreedSlot.endTime}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Card */}
          {session.contactShared && otherPerson && (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                  {otherPerson.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="font-semibold text-[#0b3558]">{otherPerson.name}</h3>
                  <p className="text-xs text-gray-400">{otherPerson.branch} · Year {otherPerson.year}</p>
                </div>
              </div>

              {otherPerson.whatsappNumber && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-emerald-500" />
                    <span className="font-mono text-sm text-[#0b3558]">{otherPerson.whatsappNumber}</span>
                  </div>
                  <a
                    href={`https://wa.me/${otherPerson.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Open WhatsApp →
                  </a>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3 text-center">Only visible to both of you</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            We've added this to your CampusFlow schedule
          </p>

          {/* Mark Complete Button (only for requester, after scheduled time) */}
          {session.isRequester && session.scheduledFor && new Date(session.scheduledFor) <= new Date() && (
            <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
              <h3 className="font-semibold text-[#0b3558] mb-3">How was your session with {otherPerson?.name}?</h3>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Leave a comment (optional)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none h-20 mb-3"
                maxLength={300}
              />
              <button onClick={handleComplete} disabled={isSubmittingRating} className="px-6 py-3 rounded-xl bg-[#0b3558] text-white text-sm font-semibold hover:bg-[#0b3558]/90 transition-colors disabled:opacity-50">
                {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Complete & Submit Rating"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: Completed ── */}
      {session.status === "completed" && (
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0b3558] mb-2">Session Complete ✅</h1>

          {/* Show existing ratings */}
          {session.requesterRating && (
            <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-100 p-6">
              <p className="text-sm text-gray-600 mb-2">Rating given to helper:</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-6 h-6 ${s <= session.requesterRating! ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                ))}
              </div>
              {session.requesterReview && <p className="text-sm text-gray-500 mt-2 italic">"{session.requesterReview}"</p>}
            </div>
          )}

          {/* Helper rating form (if helper hasn't rated yet) */}
          {!session.isRequester && session.helperRating === null && (
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
              <h3 className="font-semibold text-[#0b3558] mb-3">Rate your experience with {session.requester?.name}</h3>
              <p className="text-sm text-gray-500 mb-3">Were they prepared? Responsive?</p>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Optional feedback"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none h-20 mb-3"
                maxLength={300}
              />
              <button onClick={handleHelperRate} disabled={isSubmittingRating} className="px-6 py-3 rounded-xl bg-[#0b3558] text-white text-sm font-semibold hover:bg-[#0b3558]/90 transition-colors disabled:opacity-50">
                {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Rating"}
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/peer-learning" className="px-6 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors inline-block">
              Start another request →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

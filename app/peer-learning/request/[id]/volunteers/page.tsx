"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Users, Zap, BookOpen, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { RankedVolunteer } from "@/lib/reputationEngine";

const BADGE_STYLES: Record<string, string> = {
  "Top Helper": "bg-[var(--color-pearl)] text-[var(--color-graphite)] border border-[var(--color-paper)]",
  "Subject Expert": "bg-[var(--color-pearl)] text-[var(--color-graphite)] border border-[var(--color-paper)]",
  "Quick Responder": "bg-[var(--color-pearl)] text-[var(--color-graphite)] border border-[var(--color-paper)]",
};

export default function VolunteersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<RankedVolunteer[]>([]);
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [sortBy, setSortBy] = useState<"best" | "experienced" | "newest">("best");

  useEffect(() => {
    fetch(`/api/peer/help-request/${id}/volunteers`)
      .then((r) => r.json())
      .then((data) => {
        setVolunteers(data.volunteers || []);
        // Fetch topic from URL or request
        fetch(`/api/peer/help-request`)
          .then((r) => r.json())
          .then((requests) => {
            const req = (requests || []).find((r: any) => r.id === id);
            if (req) setTopic(req.topic);
          });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSelect = async (volunteerId: string) => {
    setIsSelecting(true);
    try {
      const res = await fetch(`/api/peer/help-request/${id}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Helper selected! Scheduling study time...");
      router.push(`/peer-learning/session/${data.session.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to select helper");
      setIsSelecting(false);
      setSelectedId(null);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("Withdraw this request? All volunteers will be notified.")) return;
    try {
      const res = await fetch(`/api/peer/help-request/${id}/select`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Request withdrawn");
      router.push("/peer-learning");
    } catch (err: any) { toast.error(err.message); }
  };

  const sorted = [...volunteers].sort((a, b) => {
    if (sortBy === "experienced") return b.totalHelped - a.totalHelped;
    if (sortBy === "newest") return 0; // keep original order
    return b.rankScore - a.rankScore; // best match (default)
  });

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-5xl mx-auto">
      <Link href="/peer-learning" className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-stone)] hover:text-[var(--color-graphite)] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Study Peers
      </Link>

      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-[var(--color-graphite)] mb-2">
          Who can help with "{topic || "..."}"?
        </h1>
        <p className="text-[14px] text-[var(--color-stone)]">
          {volunteers.length} student{volunteers.length !== 1 ? "s" : ""} volunteered. Choose one to start your session.
        </p>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        {(["best", "experienced", "newest"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-4 py-1.5 rounded-[20px] text-[12px] font-semibold transition-all ${
              sortBy === s ? "bg-[var(--color-graphite)] text-white" : "bg-[var(--color-pearl)] text-[var(--color-stone)] border border-[var(--color-paper)] hover:text-[var(--color-graphite)]"
            }`}
          >
            {s === "best" ? "Best Match" : s === "experienced" ? "Most Experienced" : "Newest"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-[var(--color-pearl)] animate-pulse rounded-[20px]" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--color-paper)] rounded-[20px]">
          <Users className="w-10 h-10 text-[var(--color-pewter)] mx-auto mb-3" />
          <p className="text-[14px] text-[var(--color-stone)]">No volunteers yet</p>
          <p className="text-[13px] text-[var(--color-pewter)] mt-1">Your request is still open. Check back later!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sorted.map((vol, i) => (
            <div key={vol.volunteerId} className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] hover:border-[var(--color-ember-orange)] transition-colors overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-pearl)] border border-[var(--color-paper)] flex items-center justify-center text-[var(--color-graphite)] font-bold text-lg">
                      {vol.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--color-graphite)]">{vol.name}</h3>
                      <p className="text-[12px] text-[var(--color-pewter)]">{vol.branch} · Year {vol.year}</p>
                    </div>
                  </div>
                  {vol.rankBadge && (
                    <span className={`text-[10px] px-2.5 py-1 rounded-[20px] font-semibold ${BADGE_STYLES[vol.rankBadge] || BADGE_STYLES["Top Helper"]}`}>
                      {vol.rankBadge}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-[12px] text-[var(--color-stone)]">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[var(--color-ember-orange)]" />
                    {vol.avgRating?.toFixed(1) || "New"}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-[var(--color-graphite)]" />
                    {vol.totalHelped} helped
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-[var(--color-stone)]" />
                    {Math.round(vol.responseRate * 100)}% response
                  </span>
                </div>

                {/* Expertise bar */}
                <div className="mb-4">
                  <p className="text-[12px] text-[var(--color-pewter)] mb-1.5">Subject expertise</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          level <= vol.topicExpertiseConfidence
                            ? "bg-[var(--color-graphite)]"
                            : "bg-[var(--color-pearl)] border border-[var(--color-paper)]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Message */}
                {vol.message && (
                  <div className="mb-4 bg-[var(--color-pearl)] rounded-[20px] p-3 border border-[var(--color-paper)]">
                    <p className="text-[13px] text-[var(--color-stone)] italic">"{vol.message}"</p>
                  </div>
                )}

                {/* Select button */}
                <button
                  onClick={() => setSelectedId(vol.volunteerId)}
                  disabled={isSelecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[30px] bg-[var(--color-graphite)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Select This Helper <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Withdraw link */}
      <div className="mt-8 text-center">
        <button onClick={handleWithdraw} className="text-[13px] text-[var(--color-stone)] hover:text-[var(--color-ember-orange)] transition-colors underline">
          Withdraw this request
        </button>
      </div>

      {/* Confirmation Modal */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-canvas-white)] rounded-[20px] p-8 max-w-md w-full border border-[var(--color-paper)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[var(--color-graphite)]">Confirm Selection</h3>
              <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-[var(--color-pearl)] rounded-full transition-colors">
                <X className="w-5 h-5 text-[var(--color-pewter)]" />
              </button>
            </div>
            <p className="text-[14px] text-[var(--color-stone)] mb-6">
              Select <strong>{sorted.find((v) => v.volunteerId === selectedId)?.name}</strong> to help you with <strong>{topic}</strong>?
              They'll be notified and we'll suggest study times.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSelectedId(null)} className="flex-1 px-4 py-3 rounded-[30px] border border-[var(--color-paper)] text-[13px] font-medium text-[var(--color-stone)] hover:bg-[var(--color-pearl)] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleSelect(selectedId)}
                disabled={isSelecting}
                className="flex-1 px-4 py-3 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSelecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Selection →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

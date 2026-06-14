"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Users, Zap, BookOpen, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { RankedVolunteer } from "@/lib/reputationEngine";

const BADGE_STYLES: Record<string, string> = {
  "Top Helper": "bg-yellow-100 text-yellow-700 border border-yellow-200",
  "Subject Expert": "bg-purple-100 text-purple-700 border border-purple-200",
  "Quick Responder": "bg-blue-100 text-blue-700 border border-blue-200",
};

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];

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
      <Link href="/peer-learning" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#0b3558] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Study Peers
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0b3558] mb-2">
          Who can help with "{topic || "..."}"?
        </h1>
        <p className="text-gray-500">
          {volunteers.length} student{volunteers.length !== 1 ? "s" : ""} volunteered. Choose one to start your session.
        </p>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        {(["best", "experienced", "newest"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              sortBy === s ? "bg-[#0b3558] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {s === "best" ? "Best Match" : s === "experienced" ? "Most Experienced" : "Newest"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No volunteers yet</p>
          <p className="text-sm text-gray-400 mt-1">Your request is still open. Check back later!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sorted.map((vol, i) => (
            <div key={vol.volunteerId} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* Top accent */}
              <div className="h-1 bg-gradient-to-r from-indigo-400 to-violet-500" />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {vol.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0b3558]">{vol.name}</h3>
                      <p className="text-xs text-gray-400">{vol.branch} · Year {vol.year}</p>
                    </div>
                  </div>
                  {vol.rankBadge && (
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${BADGE_STYLES[vol.rankBadge]}`}>
                      {vol.rankBadge}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    {vol.avgRating?.toFixed(1) || "New"}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    {vol.totalHelped} helped
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    {Math.round(vol.responseRate * 100)}% response
                  </span>
                </div>

                {/* Expertise bar */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-1.5">Subject expertise</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          level <= vol.topicExpertiseConfidence
                            ? "bg-gradient-to-r from-indigo-400 to-violet-500"
                            : "bg-gray-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Message */}
                {vol.message && (
                  <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-sm text-gray-600 italic">"{vol.message}"</p>
                  </div>
                )}

                {/* Select button */}
                <button
                  onClick={() => setSelectedId(vol.volunteerId)}
                  disabled={isSelecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0b3558] text-white text-sm font-semibold hover:bg-[#0b3558]/90 transition-colors disabled:opacity-50"
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
        <button onClick={handleWithdraw} className="text-sm text-red-500 hover:text-red-700 transition-colors underline">
          Withdraw this request
        </button>
      </div>

      {/* Confirmation Modal */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0b3558]">Confirm Selection</h3>
              <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Select <strong>{sorted.find((v) => v.volunteerId === selectedId)?.name}</strong> to help you with <strong>{topic}</strong>?
              They'll be notified and we'll suggest study times.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSelectedId(null)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleSelect(selectedId)}
                disabled={isSelecting}
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

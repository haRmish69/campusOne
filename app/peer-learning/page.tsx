"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, HelpCircle, Heart, Calendar, Trophy, Plus, X, Clock, Users, AlertTriangle, ChevronRight, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

type HelpRequestItem = {
  id: string;
  topic: string;
  description: string | null;
  urgency: string;
  isAnonymous: boolean;
  status: string;
  expiresAt: string;
  createdAt: string;
  volunteerCount: number;
};

type SessionItem = {
  id: string;
  topic: string;
  status: string;
  requesterId: string;
  helperId: string;
  requesterSlotChoice: number | null;
  helperSlotChoice: number | null;
  scheduledFor: string | null;
  requesterRating: number | null;
  helperRating: number | null;
  createdAt: string;
};

type NotificationItem = {
  id: string;
  type: string;
  referenceId: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

type LeaderboardEntry = {
  rank: number;
  profileId: string;
  name: string;
  branch: string;
  year: number;
  totalHelped: number;
  avgRating: number | null;
  reputationScore: number;
  topTopics: string[];
  badge: string | null;
};

const TABS = [
  { key: "get-help", label: "🙋 Get Help", icon: HelpCircle },
  { key: "help-campus", label: "🤝 Help Campus", icon: Heart },
  { key: "sessions", label: "📅 My Sessions", icon: Calendar },
  { key: "leaderboard", label: "🏆 Leaderboard", icon: Trophy },
] as const;

const URGENCY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  normal: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  selecting: "bg-indigo-100 text-indigo-700",
  matched: "bg-purple-100 text-purple-700",
  scheduled: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  expired: "bg-gray-100 text-gray-500",
};

export default function PeerLearningPage() {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("get-help");
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetch("/api/user/profile")
        .then((r) => r.json())
        .then((d) => { if (d?.id) setProfileId(d.id); })
        .catch(() => {});
    }
  }, [userId]);

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-6xl mx-auto">
      {/* Back */}
      <Link href="/campus-ecosystem" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#0b3558] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Campus Ecosystem
      </Link>

      {/* Hero */}
      <div className="relative mb-10 rounded-2xl bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 border border-violet-100/60 p-10 md:p-14 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-violet-200/30 to-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0b3558] mb-3">Study Peers</h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            Post a help request, volunteer to teach, and build your campus reputation — all powered by AI matching.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-10 bg-gray-100/80 rounded-full p-1.5 w-fit overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === key
                ? "bg-white text-[#006bff] shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "get-help" && <GetHelpTab profileId={profileId} />}
      {activeTab === "help-campus" && <HelpCampusTab profileId={profileId} />}
      {activeTab === "sessions" && <SessionsTab profileId={profileId} />}
      {activeTab === "leaderboard" && <LeaderboardTab profileId={profileId} />}
    </div>
  );
}

// ── TAB 1: Get Help ──
function GetHelpTab({ profileId }: { profileId: string | null }) {
  const [requests, setRequests] = useState<HelpRequestItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/peer/help-request");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { setRequests([]); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async () => {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/peer/help-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, description, isAnonymous }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setShowForm(false);
      setTopic("");
      setDescription("");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm("Withdraw this request?")) return;
    try {
      const res = await fetch(`/api/peer/help-request/${id}/select`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Request withdrawn");
      fetchRequests();
    } catch (err: any) { toast.error(err.message); }
  };

  const activeRequests = requests.filter((r) => !["completed", "cancelled", "expired"].includes(r.status));
  const pastRequests = requests.filter((r) => ["completed", "cancelled", "expired"].includes(r.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0b3558]">Your Help Requests</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#006bff] text-white text-sm font-medium hover:bg-[#005ae0] transition-colors">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Request"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 space-y-4 shadow-sm">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you need help with? (e.g. Binary Search Trees)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" maxLength={200} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details (optional) — your exam date, what you're stuck on..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-none h-24" maxLength={1000} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded" />
              Post anonymously
            </label>
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-[#0b3558] text-white text-sm font-medium hover:bg-[#0b3558]/90 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Request"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}</div>
      ) : activeRequests.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active requests</p>
          <p className="text-sm text-gray-400 mt-1">Post a help request and we'll find matching peers on your campus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeRequests.map((req) => (
            <div key={req.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-[#0b3558]">{req.topic}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_STYLES[req.urgency]}`}>
                      {req.urgency === "high" ? "🚨 Urgent" : req.urgency}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  {req.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{req.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {new Date(req.expiresAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {req.volunteerCount} volunteer{req.volunteerCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {req.volunteerCount > 0 && ["open", "selecting"].includes(req.status) && (
                    <Link href={`/peer-learning/request/${req.id}/volunteers`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors">
                      Choose a helper <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                  {["open", "selecting"].includes(req.status) && (
                    <button onClick={() => handleWithdraw(req.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pastRequests.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Past Requests</h3>
          <div className="space-y-2">
            {pastRequests.slice(0, 5).map((req) => (
              <div key={req.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">{req.topic}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status]}`}>{req.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB 2: Help Campus ──
function HelpCampusTab({ profileId }: { profileId: string | null }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [volunteering, setVolunteering] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/peer/notifications/${profileId}`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.notifications || data || [];
        const helpNeeded = items.filter((n: NotificationItem) => n.type === "help_needed");
        setNotifications(helpNeeded);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [profileId]);

  const handleVolunteer = async (requestId: string) => {
    setVolunteering((prev) => new Set(prev).add(requestId));
    try {
      const res = await fetch("/api/peer/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, message: messages[requestId] || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setNotifications((prev) => prev.filter((n) => n.referenceId !== requestId));
    } catch (err: any) {
      toast.error(err.message || "Failed to volunteer");
      setVolunteering((prev) => { const s = new Set(prev); s.delete(requestId); return s; });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0b3558]">Help Requests Near You</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No help requests right now</p>
          <p className="text-sm text-gray-400 mt-1">When a peer needs help with a topic you know, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">{n.message}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={messages[n.referenceId] || ""}
                  onChange={(e) => setMessages((m) => ({ ...m, [n.referenceId]: e.target.value }))}
                  placeholder="Add context to increase your chances (optional)"
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  maxLength={200}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVolunteer(n.referenceId)}
                    disabled={volunteering.has(n.referenceId)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {volunteering.has(n.referenceId) ? "Volunteering..." : "✅ I can help"}
                  </button>
                  <button
                    onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    Not my area
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TAB 3: My Sessions ──
function SessionsTab({ profileId }: { profileId: string | null }) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    fetch("/api/peer/help-request")
      .then(async () => {
        // Fetch sessions via a search across all user's requests/help
        const [reqRes] = await Promise.all([
          fetch("/api/peer/help-request"),
        ]);
        const requests = await reqRes.json();
        if (!Array.isArray(requests)) { setIsLoading(false); return; }

        // For each matched/scheduled/completed request, fetch the session
        const sessionPromises = requests
          .filter((r: any) => ["matched", "scheduled", "completed"].includes(r.status))
          .map(async (r: any) => {
            try {
              // We need to find sessions — use a workaround since we don't have a list API
              const sesRes = await fetch(`/api/peer/session/by-request/${r.id}`);
              if (sesRes.ok) return await sesRes.json();
              return null;
            } catch { return null; }
          });

        const results = (await Promise.all(sessionPromises)).filter(Boolean);
        setSessions(results);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [profileId]);

  const pending = sessions.filter((s) => s.status === "pending_schedule");
  const confirmed = sessions.filter((s) => s.status === "confirmed");
  const completed = sessions.filter((s) => s.status === "completed");

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-[#0b3558]">My Sessions</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sessions yet</p>
          <p className="text-sm text-gray-400 mt-1">Post a help request or volunteer to get matched.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-3">⏳ Pending Schedule</h3>
              <div className="space-y-3">
                {pending.map((s) => (
                  <Link key={s.id} href={`/peer-learning/session/${s.id}`} className="block rounded-2xl border border-amber-100 bg-amber-50/50 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0b3558]">{s.topic}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Choose a study time to confirm the session</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {confirmed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">✅ Upcoming Sessions</h3>
              <div className="space-y-3">
                {confirmed.map((s) => (
                  <Link key={s.id} href={`/peer-learning/session/${s.id}`} className="block rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0b3558]">{s.topic}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    {s.scheduledFor && <p className="text-sm text-emerald-600 mt-1">📅 {new Date(s.scheduledFor).toLocaleString()}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">✔️ Completed</h3>
              <div className="space-y-2">
                {completed.map((s) => (
                  <Link key={s.id} href={`/peer-learning/session/${s.id}`} className="block rounded-xl border border-gray-100 bg-gray-50 p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{s.topic}</span>
                      {s.requesterRating && <span className="text-xs text-amber-500">{"⭐".repeat(s.requesterRating)}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── TAB 4: Leaderboard ──
function LeaderboardTab({ profileId }: { profileId: string | null }) {
  const [data, setData] = useState<{ topHelpers: LeaderboardEntry[]; currentUserRank: number | null; currentUserScore: number | null } | null>(null);
  const [period, setPeriod] = useState<"all" | "month">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/peer/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [period]);

  const rankColors: Record<number, string> = {
    1: "border-l-4 border-l-yellow-400 bg-yellow-50/50",
    2: "border-l-4 border-l-gray-300 bg-gray-50/30",
    3: "border-l-4 border-l-amber-600 bg-amber-50/30",
  };

  const BADGE_STYLES: Record<string, string> = {
    "Top Helper": "bg-yellow-100 text-yellow-700",
    "Subject Expert": "bg-purple-100 text-purple-700",
    "Quick Responder": "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0b3558]">Campus Leaderboard</h2>
        <div className="flex bg-gray-100 rounded-full p-1">
          <button onClick={() => setPeriod("all")} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${period === "all" ? "bg-white text-[#006bff] shadow-sm" : "text-gray-500"}`}>All Time</button>
          <button onClick={() => setPeriod("month")} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${period === "month" ? "bg-white text-[#006bff] shadow-sm" : "text-gray-500"}`}>This Month</button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}</div>
      ) : !data || data.topHelpers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No helpers ranked yet</p>
          <p className="text-sm text-gray-400 mt-1">Complete sessions to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.topHelpers.map((h) => (
            <div key={h.profileId} className={`rounded-xl border border-gray-100 p-4 flex items-center gap-4 ${rankColors[h.rank] || "bg-white"}`}>
              <span className={`text-lg font-bold w-8 text-center ${h.rank <= 3 ? "text-[#0b3558]" : "text-gray-400"}`}>
                {h.rank <= 3 ? ["🥇", "🥈", "🥉"][h.rank - 1] : `#${h.rank}`}
              </span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {h.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#0b3558] truncate">{h.name}</span>
                  {h.badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${BADGE_STYLES[h.badge] || "bg-gray-100 text-gray-600"}`}>{h.badge}</span>}
                </div>
                <p className="text-xs text-gray-400">{h.branch} · Year {h.year}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                <span>📚 {h.totalHelped} helped</span>
                <span>⭐ {h.avgRating?.toFixed(1) || "New"}</span>
              </div>
            </div>
          ))}

          {/* Current user rank if not in top 10 */}
          {data.currentUserRank && data.currentUserRank > 10 && (
            <>
              <div className="text-center text-gray-300 py-1">···</div>
              <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4 flex items-center gap-4">
                <span className="text-sm font-bold text-indigo-600 w-8 text-center">#{data.currentUserRank}</span>
                <div className="flex-1">
                  <span className="font-semibold text-[#0b3558]">You</span>
                  <p className="text-xs text-gray-400">Score: {data.currentUserScore?.toFixed(0) || 0}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

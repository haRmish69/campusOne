"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { HelpCircle, Heart, Calendar, Trophy, Plus, X, Clock, Users, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

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
  { key: "get-help", label: "Get Help", icon: HelpCircle },
  { key: "help-campus", label: "Help Campus", icon: Heart },
  { key: "sessions", label: "My Sessions", icon: Calendar },
  { key: "leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

const URGENCY_STYLES: Record<string, string> = {
  high: "bg-[var(--color-pearl)] text-[var(--color-graphite)] border-[var(--color-paper)]",
  normal: "bg-[var(--color-pearl)] text-[var(--color-graphite)] border-[var(--color-paper)]",
  low: "bg-[var(--color-pearl)] text-[var(--color-stone)] border-[var(--color-paper)]",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[var(--color-pearl)] text-[var(--color-graphite)]",
  selecting: "bg-[var(--color-pearl)] text-[var(--color-graphite)]",
  matched: "bg-[var(--color-pearl)] text-[var(--color-graphite)]",
  scheduled: "bg-[var(--color-pearl)] text-[var(--color-graphite)]",
  completed: "bg-[var(--color-pearl)] text-[var(--color-stone)]",
  cancelled: "bg-[var(--color-fog)] text-[var(--color-stone)]",
  expired: "bg-[var(--color-fog)] text-[var(--color-stone)]",
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
    <div className="max-w-[1200px] mx-auto px-8 py-10">
      
      {/* Page Header */}
      <PageHeader
        backHref="/campus-ecosystem"
        backLabel="Back to Campus Ecosystem"
        title="Study Peers"
        subtitle="Request help, volunteer to teach, and build your campus reputation."
        ctaLabel="New Request"
        onCtaClick={() => setActiveTab("get-help")}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-[var(--color-canvas-white)] border border-[var(--color-paper)] rounded-[20px] p-1.5 w-fit overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 rounded-[20px] text-[13px] font-medium transition-colors whitespace-nowrap ${
              activeTab === key
                ? "bg-[var(--color-pearl)] text-[var(--color-ember-orange)] shadow-sm"
                : "bg-transparent text-[var(--color-stone)] hover:text-[var(--color-graphite)]"
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
        <h2 className="text-[18px] font-semibold text-[var(--color-graphite)]">Your Help Requests</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-[20px] bg-[var(--color-pearl)] text-[var(--color-graphite)] text-[13px] font-medium border border-[var(--color-paper)] hover:border-[var(--color-mist)] transition-colors">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Request"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-6 space-y-4">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you need help with? (e.g. Binary Search Trees)" className="w-full px-4 py-3 rounded-[20px] border border-[var(--color-paper)] text-[14px] focus:outline-none focus:border-[var(--color-ember-orange)] transition-colors" maxLength={200} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details (optional) — your exam date, what you're stuck on..." className="w-full px-4 py-3 rounded-[20px] border border-[var(--color-paper)] text-[14px] focus:outline-none focus:border-[var(--color-ember-orange)] transition-colors resize-none h-24" maxLength={1000} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] text-[var(--color-stone)]">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded" />
              Post anonymously
            </label>
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Request"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-[var(--color-pearl)] animate-pulse rounded-[20px]" />)}</div>
      ) : activeRequests.length === 0 && !showForm ? (
        <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] px-8 py-16 text-center">
          <div className="w-12 h-12 rounded-[12px] bg-[var(--color-pearl)] flex items-center justify-center mx-auto mb-4">
            <HelpCircle size={20} className="text-[var(--color-pewter)]" />
          </div>
          <p className="text-[16px] font-semibold text-[var(--color-graphite)] mb-1">No active requests</p>
          <p className="text-[14px] text-[var(--color-stone)]">Post a help request and we'll find matching peers on your campus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeRequests.map((req) => (
            <div key={req.id} className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-5 hover:border-[var(--color-ember-orange)] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-[var(--color-graphite)]">{req.topic}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-[20px] font-medium border ${URGENCY_STYLES[req.urgency] || URGENCY_STYLES.low}`}>
                      {req.urgency === "high" ? "Urgent" : req.urgency}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-[20px] font-medium border border-[var(--color-paper)] ${STATUS_STYLES[req.status] || STATUS_STYLES.open}`}>
                      {req.status}
                    </span>
                  </div>
                  {req.description && <p className="text-[14px] text-[var(--color-stone)] mb-3 line-clamp-2">{req.description}</p>}
                  <div className="flex items-center gap-4 text-[12px] text-[var(--color-pewter)]">
                    <span className="flex items-center gap-1"><Clock size={13} /> Expires {new Date(req.expiresAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Users size={13} /> {req.volunteerCount} volunteer{req.volunteerCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {req.volunteerCount > 0 && ["open", "selecting"].includes(req.status) && (
                    <Link href={`/peer-learning/request/${req.id}/volunteers`} className="flex items-center gap-1 px-4 py-2 rounded-[20px] bg-[var(--color-ember-orange)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity">
                      Choose helper <ChevronRight size={14} />
                    </Link>
                  )}
                  {["open", "selecting"].includes(req.status) && (
                    <button onClick={() => handleWithdraw(req.id)} className="text-[12px] text-[var(--color-stone)] hover:text-[var(--color-ember-orange)] transition-colors">
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
          <h3 className="text-[12px] font-semibold text-[var(--color-pewter)] uppercase tracking-wider mb-3">Past Requests</h3>
          <div className="space-y-2">
            {pastRequests.slice(0, 5).map((req) => (
              <div key={req.id} className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-pearl)] p-4 flex items-center justify-between">
                <span className="text-[14px] text-[var(--color-stone)]">{req.topic}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-[20px] font-medium border border-[var(--color-paper)] ${STATUS_STYLES[req.status] || STATUS_STYLES.completed}`}>{req.status}</span>
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
      <h2 className="text-[18px] font-semibold text-[var(--color-graphite)]">Help Requests Near You</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-[var(--color-pearl)] animate-pulse rounded-[20px]" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] px-8 py-16 text-center">
          <div className="w-12 h-12 rounded-[12px] bg-[var(--color-pearl)] flex items-center justify-center mx-auto mb-4">
            <Heart size={20} className="text-[var(--color-pewter)]" />
          </div>
          <p className="text-[16px] font-semibold text-[var(--color-graphite)] mb-1">No help requests right now</p>
          <p className="text-[14px] text-[var(--color-stone)]">When a peer needs help with a topic you know, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-6 shadow-sm">
              <p className="text-[14px] text-[var(--color-graphite)] mb-4 leading-relaxed">{n.message}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={messages[n.referenceId] || ""}
                  onChange={(e) => setMessages((m) => ({ ...m, [n.referenceId]: e.target.value }))}
                  placeholder="Add context to increase your chances (optional)"
                  className="flex-1 px-4 py-2 rounded-[20px] border border-[var(--color-paper)] text-[13px] focus:outline-none focus:border-[var(--color-ember-orange)]"
                  maxLength={200}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVolunteer(n.referenceId)}
                    disabled={volunteering.has(n.referenceId)}
                    className="px-4 py-2 rounded-[20px] bg-[var(--color-ember-orange)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                  >
                    {volunteering.has(n.referenceId) ? "Volunteering..." : "I can help"}
                  </button>
                  <button
                    onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                    className="px-4 py-2 rounded-[20px] bg-[var(--color-pearl)] border border-[var(--color-paper)] text-[var(--color-stone)] text-[13px] font-medium hover:text-[var(--color-graphite)] transition-colors whitespace-nowrap"
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
      <h2 className="text-[18px] font-semibold text-[var(--color-graphite)]">My Sessions</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-[var(--color-pearl)] animate-pulse rounded-[20px]" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] px-8 py-16 text-center">
          <div className="w-12 h-12 rounded-[12px] bg-[var(--color-pearl)] flex items-center justify-center mx-auto mb-4">
            <Calendar size={20} className="text-[var(--color-pewter)]" />
          </div>
          <p className="text-[16px] font-semibold text-[var(--color-graphite)] mb-1">No sessions yet</p>
          <p className="text-[14px] text-[var(--color-stone)]">Post a help request or volunteer to get matched.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="text-[12px] font-semibold text-[var(--color-ember-orange)] uppercase tracking-wider mb-3">Pending Schedule</h3>
              <div className="space-y-3">
                {pending.map((s) => (
                  <Link key={s.id} href={`/peer-learning/session/${s.id}`} className="block rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-5 hover:border-[var(--color-ember-orange)] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-graphite)]">{s.topic}</span>
                      <ChevronRight size={16} className="text-[var(--color-pewter)]" />
                    </div>
                    <p className="text-[13px] text-[var(--color-stone)] mt-1">Choose a study time to confirm the session</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {confirmed.length > 0 && (
            <div>
              <h3 className="text-[12px] font-semibold text-[var(--color-stone)] uppercase tracking-wider mb-3">Upcoming Sessions</h3>
              <div className="space-y-3">
                {confirmed.map((s) => (
                  <Link key={s.id} href={`/peer-learning/session/${s.id}`} className="block rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-5 hover:border-[var(--color-ember-orange)] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-graphite)]">{s.topic}</span>
                      <ChevronRight size={16} className="text-[var(--color-pewter)]" />
                    </div>
                    {s.scheduledFor && <p className="text-[13px] text-[var(--color-stone)] mt-1">Date: {new Date(s.scheduledFor).toLocaleString()}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h3 className="text-[12px] font-semibold text-[var(--color-pewter)] uppercase tracking-wider mb-3">Completed</h3>
              <div className="space-y-2">
                {completed.map((s) => (
                  <Link key={s.id} href={`/peer-learning/session/${s.id}`} className="block rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-pearl)] p-4 hover:border-[var(--color-mist)] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-[var(--color-stone)]">{s.topic}</span>
                      {s.requesterRating && <span className="text-[12px] text-[var(--color-ember-orange)]">{"★".repeat(s.requesterRating)}</span>}
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
    1: "border-l-4 border-l-[var(--color-ember-orange)] bg-[var(--color-canvas-white)]",
    2: "border-l-4 border-l-[var(--color-pewter)] bg-[var(--color-pearl)]",
    3: "border-l-4 border-l-[var(--color-paper)] bg-[var(--color-pearl)]",
  };

  const BADGE_STYLES: Record<string, string> = {
    "Top Helper": "bg-[var(--color-pearl)] text-[var(--color-graphite)]",
    "Subject Expert": "bg-[var(--color-pearl)] text-[var(--color-graphite)]",
    "Quick Responder": "bg-[var(--color-pearl)] text-[var(--color-graphite)]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-[var(--color-graphite)]">Campus Leaderboard</h2>
        <div className="flex bg-[var(--color-pearl)] rounded-[20px] p-1 border border-[var(--color-paper)]">
          <button onClick={() => setPeriod("all")} className={`px-4 py-1.5 rounded-[20px] text-[12px] font-semibold transition-all ${period === "all" ? "bg-[var(--color-canvas-white)] text-[var(--color-ember-orange)] shadow-sm" : "text-[var(--color-stone)]"}`}>All Time</button>
          <button onClick={() => setPeriod("month")} className={`px-4 py-1.5 rounded-[20px] text-[12px] font-semibold transition-all ${period === "month" ? "bg-[var(--color-canvas-white)] text-[var(--color-ember-orange)] shadow-sm" : "text-[var(--color-stone)]"}`}>This Month</button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-[var(--color-pearl)] animate-pulse rounded-[20px]" />)}</div>
      ) : !data || data.topHelpers.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] px-8 py-16 text-center">
          <div className="w-12 h-12 rounded-[12px] bg-[var(--color-pearl)] flex items-center justify-center mx-auto mb-4">
            <Trophy size={20} className="text-[var(--color-pewter)]" />
          </div>
          <p className="text-[16px] font-semibold text-[var(--color-graphite)] mb-1">No helpers ranked yet</p>
          <p className="text-[14px] text-[var(--color-stone)]">Complete sessions to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.topHelpers.map((h) => (
            <div key={h.profileId} className={`rounded-[20px] border border-[var(--color-paper)] p-4 flex items-center gap-4 ${rankColors[h.rank] || "bg-[var(--color-canvas-white)]"}`}>
              <span className={`text-[16px] font-bold w-8 text-center ${h.rank <= 3 ? "text-[var(--color-graphite)]" : "text-[var(--color-pewter)]"}`}>
                {h.rank <= 3 ? ["#1", "#2", "#3"][h.rank - 1] : `#${h.rank}`}
              </span>
              <div className="w-10 h-10 rounded-full bg-[var(--color-pearl)] flex items-center justify-center text-[var(--color-graphite)] font-bold text-[14px] shrink-0 border border-[var(--color-paper)]">
                {h.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--color-graphite)] truncate">{h.name}</span>
                  {h.badge && <span className={`text-[10px] px-2 py-0.5 rounded-[20px] font-semibold border border-[var(--color-paper)] ${BADGE_STYLES[h.badge] || "bg-[var(--color-pearl)] text-[var(--color-stone)]"}`}>{h.badge}</span>}
                </div>
                <p className="text-[12px] text-[var(--color-pewter)]">{h.branch} · Year {h.year}</p>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-[var(--color-stone)] shrink-0">
                <span>{h.totalHelped} helped</span>
                <span>★ {h.avgRating?.toFixed(1) || "New"}</span>
              </div>
            </div>
          ))}

          {/* Current user rank if not in top 10 */}
          {data.currentUserRank && data.currentUserRank > 10 && (
            <>
              <div className="text-center text-[var(--color-pewter)] py-1">···</div>
              <div className="rounded-[20px] border-2 border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-4 flex items-center gap-4">
                <span className="text-[14px] font-bold text-[var(--color-ember-orange)] w-8 text-center">#{data.currentUserRank}</span>
                <div className="flex-1">
                  <span className="font-semibold text-[var(--color-graphite)]">You</span>
                  <p className="text-[12px] text-[var(--color-pewter)]">Score: {data.currentUserScore?.toFixed(0) || 0}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

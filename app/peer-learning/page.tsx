"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import OnboardingFlow from "@/components/peer/OnboardingFlow";

function PeerLearningContent() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"request" | "help" | "connections">("request");

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      checkProfile();
      fetchData();
      
      const initialTopic = searchParams.get("topic");
      if (initialTopic) {
        setTopic(initialTopic);
      }
    }
  }, [userId, searchParams]);

  const checkProfile = async () => {
    const res = await fetch("/api/user/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      if (!data?.onboardingDone) {
        setNeedsOnboarding(true);
      }
    }
  };

  const fetchData = async () => {
    if (!userId) return;
    
    // Fetch all 3 lists
    Promise.all([
      fetch(`/api/peer/requests/${userId}`).then(r => r.json()),
      fetch(`/api/peer/incoming/${userId}`).then(r => r.json()),
      fetch(`/api/peer/connections/${userId}`).then(r => r.json())
    ]).then(([outData, inData, connData]) => {
      if (Array.isArray(outData)) setOutgoing(outData);
      if (Array.isArray(inData)) setIncoming(inData);
      if (Array.isArray(connData)) setConnections(connData);
    });
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/peer/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, description, isAnonymous })
      });
      if (res.ok) {
        setTopic("");
        setDescription("");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMatchAction = async (matchId: string, action: "accept" | "decline" | "busy") => {
    try {
      const res = await fetch(`/api/peer/match/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [selectedContactMatch, setSelectedContactMatch] = useState<string | null>(null);
  const [contactData, setContactData] = useState<any>(null);

  const fetchContact = async (matchId: string) => {
    try {
      const res = await fetch(`/api/peer/contact/${matchId}?profileId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setContactData(data);
        setSelectedContactMatch(matchId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (needsOnboarding) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <OnboardingFlow 
          initialData={profile} 
          onComplete={() => {
            setNeedsOnboarding(false);
            checkProfile();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-6xl mx-auto">

      {/* ── Hero Header ── */}
      <div className="relative mb-12 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border border-blue-100/60 p-10 md:p-14 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-blue-200/30 to-violet-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0b3558] mb-3">
            Peer Learning
          </h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            Ask for help, share what you know, and build your campus study network — all in one place.
          </p>
        </div>
      </div>

      {/* ── Pill Tabs ── */}
      <div className="flex items-center gap-2 mb-10 bg-gray-100/80 rounded-full p-1.5 w-fit">
        {([
          { key: "request", label: "🙋 Request Help" },
          { key: "help",    label: "🤝 Help a Peer" },
          { key: "connections", label: "🔗 My Connections" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200
              ${activeTab === key
                ? "bg-white text-[#006bff] shadow-sm"
                : "text-gray-500 hover:text-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          TAB 1 — Request Help
      ═══════════════════════════════════════════ */}
      {activeTab === "request" && (
        <div className="grid lg:grid-cols-5 gap-10">

          {/* Left: Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-md border-gray-100/80 rounded-2xl">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-xl font-bold text-[#0b3558]">
                  What do you want to learn?
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">We'll find the best-matched peer on your campus.</p>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <form onSubmit={handleCreateRequest} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Topic</label>
                    <Input
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. Calculus II, React Hooks"
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Details (Optional)</label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. I need help understanding integration by parts before Friday's exam."
                      rows={4}
                      className="text-base"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={isAnonymous}
                      onChange={e => setIsAnonymous(e.target.checked)}
                    />
                    <span className="text-sm text-gray-500">Post anonymously</span>
                  </label>
                  <Button type="submit" className="w-full h-12 text-base bg-[#006bff] text-white hover:bg-blue-700 rounded-xl" disabled={isSubmitting}>
                    {isSubmitting ? "Finding Matches..." : "🔍  Find a Peer"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right: Active Requests */}
          <div className="lg:col-span-3">
            <h3 className="text-xl font-bold text-[#0b3558] mb-6">Your Active Requests</h3>
            {outgoing.length === 0 ? (
              <div className="bg-gray-50/60 border border-dashed border-gray-200 rounded-2xl p-14 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="text-3xl">📭</span>
                </div>
                <p className="text-gray-400 text-lg font-medium">No active requests yet</p>
                <p className="text-gray-400 text-sm mt-1">Post a request and we'll start matching you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {outgoing.map((req) => (
                  <Card key={req.id} className="shadow-sm border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-base font-semibold text-gray-900">{req.topic}</h4>
                        <p className="text-sm text-gray-400">
                          {req.status === "open" ? "🔄 Searching for peers..." : "✅ Matched!"}
                        </p>
                      </div>
                      <Badge variant={req.acceptedCount > 0 ? "default" : "secondary"} className={`text-sm px-4 py-1.5 ${req.acceptedCount > 0 ? "bg-green-100 text-green-800" : ""}`}>
                        {req.acceptedCount} / {req.matchCount} Accepted
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 2 — Help a Peer
      ═══════════════════════════════════════════ */}
      {activeTab === "help" && (
        <div className="max-w-3xl">
          <h3 className="text-xl font-bold text-[#0b3558] mb-6">Peers who need your expertise</h3>
          {incoming.length === 0 ? (
            <div className="bg-gray-50/60 border border-dashed border-gray-200 rounded-2xl p-14 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">🧑‍🏫</span>
              </div>
              <p className="text-gray-400 text-lg font-medium">No pending requests right now</p>
              <p className="text-gray-400 text-sm mt-1">We'll notify you when someone needs help with a topic you know!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {incoming.map(({ match, request }) => (
                <Card key={match.id} className="shadow-sm border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-8">
                    <div className="mb-5">
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-semibold text-sm px-4 py-1.5 mb-3">
                        {request.topic}
                      </Badge>
                      <h4 className="text-base font-semibold text-gray-900">
                        {request.requesterId ? "A peer" : "Anonymous Student"} wants to learn this
                      </h4>
                      {request.description && (
                        <p className="text-sm text-gray-500 mt-3 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed italic">
                          "{request.description}"
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 pt-5 border-t border-gray-100">
                      <Button onClick={() => handleMatchAction(match.id, "accept")} className="flex-1 h-11 bg-[#006bff] hover:bg-blue-700 text-white rounded-xl">
                        ✅  I can help
                      </Button>
                      <Button onClick={() => handleMatchAction(match.id, "decline")} variant="outline" className="flex-1 h-11 border-gray-200 rounded-xl">
                        Pass
                      </Button>
                      <Button onClick={() => handleMatchAction(match.id, "busy")} variant="ghost" className="h-11 text-gray-400 hover:text-gray-600 rounded-xl">
                        Busy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 3 — My Connections
      ═══════════════════════════════════════════ */}
      {activeTab === "connections" && (
        <div>
          <h3 className="text-xl font-bold text-[#0b3558] mb-6">Your Learning Network</h3>
          {connections.length === 0 ? (
            <div className="bg-gray-50/60 border border-dashed border-gray-200 rounded-2xl p-14 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">🤝</span>
              </div>
              <p className="text-gray-400 text-lg font-medium">No connections yet</p>
              <p className="text-gray-400 text-sm mt-1">When you or a peer accept a match, it will appear here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map((conn) => (
                <Card key={conn.id} className="shadow-sm border-gray-100 rounded-2xl hover:shadow-md transition-shadow group">
                  <CardContent className="p-7 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg font-bold text-blue-700 shrink-0">
                        {conn.otherName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{conn.otherName}</h4>
                        <p className="text-sm text-blue-600 font-medium truncate">{conn.topic}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">Matched {new Date(conn.connectedAt).toLocaleDateString()}</p>
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => fetchContact(conn.id)}>
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Contact Reveal Dialog ── */}
      <Dialog open={!!selectedContactMatch} onOpenChange={(open) => !open && setSelectedContactMatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Information</DialogTitle>
          </DialogHeader>
          {contactData && (
            <div className="py-6">
              {contactData.contactRevealed ? (
                <div className="space-y-5">
                  <p className="text-gray-600">You matched with <strong>{contactData.otherName}</strong> for <strong>{contactData.topic}</strong>.</p>
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-400 mb-1">WhatsApp / Phone</p>
                    <p className="text-xl font-medium font-mono text-gray-900">
                      {contactData.whatsappNumber || "Not provided"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Contact Hidden</h3>
                  <p className="text-gray-500">
                    {contactData.reason || "One of you has not opted in to share contact details."}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PeerLearningPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Peer Learning...</div>}>
      <PeerLearningContent />
    </Suspense>
  );
}

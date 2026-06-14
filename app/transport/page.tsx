"use client";

import { useState, useEffect } from "react";
import { Bus, AlertTriangle, Users, Clock, Plus, MapPin, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";

type Route = {
  id: string; name: string; type: string; stops: any; operatingDays: any;
  frequency: string | null; notes: string | null;
};
type Update = {
  id: string; routeId: string | null; updateType: string; message: string;
  severity: string; upvotes: number; createdAt: string;
};
type CabPool = {
  id: string; destination: string; departureTime: string; seatsAvailable: number;
  estimatedCost: number | null; participants: any; status: string; notes: string | null;
  initiatorId: string; pendingRequests?: string | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function TransportPage() {
  const { user } = useUser();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPool, setShowNewPool] = useState(false);
  const [newPool, setNewPool] = useState({ destination: "", departureTime: "", seatsAvailable: 3, estimatedCost: "" });

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchUpdates(), fetchPools()]).then(() => setIsLoading(false));
  }, []);

  const fetchRoutes = async () => {
    try { const r = await fetch("/api/transport/routes"); setRoutes(await r.json()); } catch {}
  };
  const fetchUpdates = async () => {
    try { const r = await fetch("/api/transport/updates"); setUpdates(await r.json()); } catch {}
  };
  const fetchPools = async () => {
    try { const r = await fetch("/api/transport/cab-pools"); setPools(await r.json()); } catch {}
  };

  const handleCreatePool = async () => {
    try {
      const res = await fetch("/api/transport/cab-pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPool,
          estimatedCost: newPool.estimatedCost ? parseFloat(newPool.estimatedCost) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Cab pool created!");
      setShowNewPool(false);
      setNewPool({ destination: "", departureTime: "", seatsAvailable: 3, estimatedCost: "" });
      fetchPools();
    } catch (err: any) {
      toast.error(err.message || "Failed to create pool");
    }
  };

  const handleJoinPool = async (poolId: string) => {
    try {
      const res = await fetch(`/api/transport/cab-pools/${poolId}/join`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Request sent!");
      fetchPools();
    } catch (err: any) {
      toast.error(err.message || "Failed to join");
    }
  };

  const handleManageRequest = async (poolId: string, requesterId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/transport/cab-pools/${poolId}/join`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId, action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Request ${action}ed`);
      fetchPools();
    } catch (err: any) {
      toast.error(err.message || "Failed to manage request");
    }
  };

  const handleDeletePool = async (poolId: string) => {
    try {
      const res = await fetch(`/api/transport/cab-pools/${poolId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Pool deleted!");
      fetchPools();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pool");
    }
  };

  const parseJson = (val: any): any => {
    if (typeof val === "string") try { return JSON.parse(val); } catch { return val; }
    return val;
  };

  // Filter out pools that have already departed
  const activePools = pools.filter(p => new Date(p.departureTime) > new Date());

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-midnight-navy)] flex items-center gap-3">
          <Bus className="w-8 h-8 text-[var(--color-signal-blue)]" />
          Transport
        </h1>
        <p className="text-[var(--color-slate-blue)] mt-1">Bus schedules, live updates & cab pools</p>
      </div>

      {/* Live Alerts Banner */}
      {updates.filter(u => u.severity === "critical").length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="text-sm text-red-700 font-medium">
            {updates.find(u => u.severity === "critical")?.message}
          </div>
        </div>
      )}

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList className="bg-[var(--color-fog)] rounded-xl p-1">
          <TabsTrigger value="schedules" className="rounded-lg text-sm">🚌 Schedules</TabsTrigger>
          <TabsTrigger value="cabpool" className="rounded-lg text-sm">🚕 Cab Pool</TabsTrigger>
          <TabsTrigger value="updates" className="rounded-lg text-sm">📢 Live Updates</TabsTrigger>
        </TabsList>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-[var(--color-fog)] animate-pulse rounded-2xl" />)}</div>
          ) : routes.length === 0 ? (
            <div className="text-center py-12"><Bus className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No routes added yet</p></div>
          ) : routes.map(route => {
            const stops = parseJson(route.stops);
            const days = parseJson(route.operatingDays);
            return (
              <div key={route.id} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--color-midnight-navy)]">{route.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-blue-100 text-blue-700">{route.type}</span>
                  </div>
                  {route.frequency && <span className="text-xs text-muted-foreground">{route.frequency}</span>}
                </div>
                {Array.isArray(stops) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {stops.map((s: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-fog)] text-xs">
                        <MapPin className="w-3 h-3 text-[var(--color-signal-blue)]" />
                        {s.name} {s.time && <span className="text-muted-foreground">({s.time})</span>}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Operates: {Array.isArray(days) ? days.join(", ") : days}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Cab Pool Tab */}
        <TabsContent value="cabpool" className="space-y-4">
          <button onClick={() => setShowNewPool(!showNewPool)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-signal-blue)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Start a Pool
          </button>
          {showNewPool && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
              <input placeholder="Destination" value={newPool.destination} onChange={e => setNewPool({ ...newPool, destination: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm" />
              <input type="datetime-local" value={newPool.departureTime} onChange={e => setNewPool({ ...newPool, departureTime: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm" />
              <div className="flex gap-3">
                <input type="number" placeholder="Seats" value={newPool.seatsAvailable} onChange={e => setNewPool({ ...newPool, seatsAvailable: parseInt(e.target.value) || 1 })} className="w-1/2 px-3 py-2 rounded-lg border border-border/60 text-sm" min={1} max={6} />
                <input type="number" placeholder="Total cost (₹)" value={newPool.estimatedCost} onChange={e => setNewPool({ ...newPool, estimatedCost: e.target.value })} className="w-1/2 px-3 py-2 rounded-lg border border-border/60 text-sm" />
              </div>
              <button onClick={handleCreatePool} className="px-4 py-2 rounded-lg bg-[var(--color-midnight-navy)] text-white text-sm font-medium">Create Pool</button>
            </div>
          )}
          {activePools.length === 0 ? (
            <div className="text-center py-12"><Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No open pools right now</p></div>
          ) : activePools.map(pool => {
            const participants: string[] = parseJson(pool.participants) || [];
            const pendingRequests: any[] = pool.pendingRequests ? parseJson(pool.pendingRequests) : [];
            const seatsLeft = pool.seatsAvailable; // note: seatsAvailable is updated on DB side
            const costPerPerson = pool.estimatedCost ? Math.round(pool.estimatedCost / (participants.length + seatsLeft)) : null;
            
            const isInitiator = user?.id === pool.initiatorId;
            const hasRequested = pendingRequests.some(p => p.userId === user?.id && p.status === "pending");
            const isParticipant = participants.includes(user?.id || "");
            
            return (
              <div key={pool.id} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--color-midnight-navy)]">{pool.destination}</h3>
                      {isInitiator && (
                        <button
                          onClick={() => handleDeletePool(pool.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete Cab Pool"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(pool.departureTime).toLocaleString()}</span>
                      <span>{seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left</span>
                      {costPerPerson && <span>~₹{costPerPerson}/person</span>}
                    </div>
                  </div>
                  {!isInitiator && !isParticipant && seatsLeft > 0 && (
                    <button 
                      onClick={() => handleJoinPool(pool.id)} 
                      disabled={hasRequested}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        hasRequested 
                          ? "bg-amber-100 text-amber-700 cursor-not-allowed" 
                          : "bg-emerald-500 text-white hover:bg-emerald-600"
                      }`}
                    >
                      {hasRequested ? "Request Pending" : "Request to Join"}
                    </button>
                  )}
                  {isParticipant && !isInitiator && (
                     <span className="px-3 py-1.5 rounded-lg bg-[var(--color-fog)] text-[var(--color-midnight-navy)] text-xs font-medium">
                       Joined
                     </span>
                  )}
                </div>

                {isInitiator && pendingRequests.filter(p => p.status === "pending").length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <p className="text-xs font-semibold text-[var(--color-midnight-navy)] mb-2">Pending Requests</p>
                    <div className="space-y-2">
                      {pendingRequests.filter(p => p.status === "pending").map((req: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-[var(--color-fog)] p-2 rounded-lg">
                          <span className="text-xs text-[var(--color-slate-blue)]">User: {req.userId.substring(0, 8)}...</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleManageRequest(pool.id, req.userId, "accept")}
                              className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-200"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleManageRequest(pool.id, req.userId, "reject")}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-4">
          {updates.length === 0 ? (
            <div className="text-center py-12"><AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No active transport updates</p></div>
          ) : updates.map(u => (
            <div key={u.id} className={`rounded-xl border p-4 ${SEVERITY_COLORS[u.severity] || SEVERITY_COLORS.info}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase">{u.updateType}</span>
                  <p className="text-sm font-medium mt-0.5">{u.message}</p>
                  <p className="text-xs mt-1 opacity-70">{new Date(u.createdAt).toLocaleTimeString()}</p>
                </div>
                <span className="flex items-center gap-1 text-xs"><ThumbsUp className="w-3 h-3" />{u.upvotes}</span>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

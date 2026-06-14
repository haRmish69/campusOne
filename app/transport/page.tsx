"use client";

import { useState, useEffect } from "react";
import { Car, Clock, Plus, Users, Trash2, ArrowRight, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function TransportPage() {
  const { user } = useUser();
  const [pools, setPools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPool, setShowNewPool] = useState(false);
  const [newPool, setNewPool] = useState({ source: "", destination: "", departureTime: "", seatsAvailable: 3, estimatedCost: "" });

  useEffect(() => {
    fetchPools().then(() => setIsLoading(false));
  }, []);

  const fetchPools = async () => {
    try { 
      const r = await fetch("/api/transport/cab-pools"); 
      const data = await r.json(); 
      setPools(Array.isArray(data) ? data : []); 
    } catch { setPools([]); }
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
      toast.success("Travel pool created!");
      setShowNewPool(false);
      setNewPool({ source: "", destination: "", departureTime: "", seatsAvailable: 3, estimatedCost: "" });
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

  const activePools = pools.filter(p => new Date(p.departureTime) > new Date());
  
  const minDateTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-midnight-navy)] flex items-center gap-3">
          <Car className="w-8 h-8 text-[var(--color-signal-blue)]" />
          Travel Pool
        </h1>
        <p className="text-[var(--color-slate-blue)] mt-1">Share rides and split the total cost evenly with students from your campus.</p>
      </div>

      <div className="space-y-4">
        <button onClick={() => setShowNewPool(!showNewPool)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-signal-blue)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Start a Pool
        </button>
        {showNewPool && (
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
            <div className="flex gap-3">
              <input placeholder="Source (e.g. Campus)" value={newPool.source} onChange={e => setNewPool({ ...newPool, source: e.target.value })} className="w-1/2 px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-signal-blue)]/30 transition-all" />
              <input placeholder="Destination (e.g. Airport)" value={newPool.destination} onChange={e => setNewPool({ ...newPool, destination: e.target.value })} className="w-1/2 px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-signal-blue)]/30 transition-all" />
            </div>
            <input type="datetime-local" min={minDateTime} value={newPool.departureTime} onChange={e => setNewPool({ ...newPool, departureTime: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-signal-blue)]/30 transition-all" />
            <div className="flex gap-3">
              <input type="number" placeholder="Seats Available" value={newPool.seatsAvailable} onChange={e => setNewPool({ ...newPool, seatsAvailable: parseInt(e.target.value) || 1 })} className="w-1/2 px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-signal-blue)]/30 transition-all" min={1} max={6} />
              <input type="number" placeholder="Total ride cost (₹)" value={newPool.estimatedCost} onChange={e => setNewPool({ ...newPool, estimatedCost: e.target.value })} className="w-1/2 px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-signal-blue)]/30 transition-all" />
            </div>
            <button onClick={handleCreatePool} className="px-4 py-2 rounded-lg bg-[var(--color-midnight-navy)] text-white text-sm font-medium hover:bg-[var(--color-midnight-navy)]/90 transition-colors">Create Pool</button>
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-[var(--color-fog)] animate-pulse rounded-2xl" />)}</div>
        ) : activePools.length === 0 ? (
          <div className="text-center py-12"><Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No open pools right now</p></div>
        ) : activePools.map(pool => {
          const participants: string[] = parseJson(pool.participants) || [];
          const pendingRequests: any[] = pool.pendingRequests ? parseJson(pool.pendingRequests) : [];
          const seatsLeft = pool.seatsAvailable;
          const totalCost = pool.estimatedCost;
          
          const isInitiator = user?.id === pool.initiatorId;
          const hasRequested = pendingRequests.some(p => p.userId === user?.id && p.status === "pending");
          const isParticipant = participants.includes(user?.id || "");
          
          const initiatorName = pool.initiatorName || "Unknown";
          const participantNames = pool.participantNames || [];

          return (
            <div key={pool.id} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--color-midnight-navy)] flex items-center gap-2">
                        {pool.source ? (
                          <>
                            {pool.source} <ArrowRight className="w-4 h-4 text-muted-foreground" /> {pool.destination}
                          </>
                        ) : (
                          pool.destination
                        )}
                      </h3>
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

                    {!isInitiator && !isParticipant && seatsLeft > 0 && (
                      <button 
                        onClick={() => handleJoinPool(pool.id)} 
                        disabled={hasRequested}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ml-4 ${
                          hasRequested 
                            ? "bg-amber-100 text-amber-700 cursor-not-allowed" 
                            : "bg-emerald-500 text-white hover:bg-emerald-600"
                        }`}
                      >
                        {hasRequested ? "Request Pending" : "Request to Join"}
                      </button>
                    )}
                    {isParticipant && !isInitiator && (
                       <span className="px-3 py-1.5 rounded-lg bg-[var(--color-fog)] text-[var(--color-midnight-navy)] text-xs font-medium shrink-0 ml-4">
                         Joined
                       </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Created by:</span>
                        <span className="font-medium text-[var(--color-midnight-navy)]">{initiatorName} {isInitiator && "(You)"}</span>
                      </div>
                      
                      {participantNames.length > 1 && (
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground whitespace-nowrap">Passengers:</span>
                          <span className="text-[var(--color-midnight-navy)]">
                            {participantNames.join(", ")}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(pool.departureTime).toLocaleString()}</span>
                        {totalCost && <span>₹{totalCost} total (split evenly)</span>}
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-center space-y-2 bg-[var(--color-fog)]/50 p-3 rounded-xl border border-border/30">
                      <div className="text-xs font-medium text-[var(--color-slate-blue)]">Seat Availability</div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: participants.length }).map((_, i) => (
                          <UserIcon key={`filled-${i}`} className="w-5 h-5 text-[var(--color-midnight-navy)] fill-[var(--color-midnight-navy)]" />
                        ))}
                        {Array.from({ length: seatsLeft }).map((_, i) => (
                          <UserIcon key={`empty-${i}`} className="w-5 h-5 text-muted-foreground opacity-30" />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-1">
                        {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
                      </div>
                    </div>
                  </div>
                </div>
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
      </div>
    </div>
  );
}

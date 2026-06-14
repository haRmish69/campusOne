"use client";

import { useState, useEffect } from "react";
import { Car, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { PageHeader } from "@/components/PageHeader";

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
    <div className="max-w-[1200px] mx-auto px-8 py-10">
      
      {/* Page Header */}
      <PageHeader
        backHref="/campus-ecosystem"
        backLabel="Back to Campus Ecosystem"
        title="Travel Pool"
        subtitle="Share rides and split costs with students from your campus."
        ctaLabel="Start a Pool"
        onCtaClick={() => setShowNewPool(!showNewPool)}
      />

      {/* New Pool Form */}
      {showNewPool && (
        <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-5 space-y-3 mb-6">
          <div className="flex gap-3">
            <input placeholder="Source (e.g. Campus)" value={newPool.source} onChange={e => setNewPool({ ...newPool, source: e.target.value })} className="w-1/2 px-3 py-2 rounded-[12px] border border-[var(--color-paper)] text-[14px] outline-none text-[var(--color-graphite)] placeholder:text-[var(--color-stone)] bg-transparent" />
            <input placeholder="Destination (e.g. Airport)" value={newPool.destination} onChange={e => setNewPool({ ...newPool, destination: e.target.value })} className="w-1/2 px-3 py-2 rounded-[12px] border border-[var(--color-paper)] text-[14px] outline-none text-[var(--color-graphite)] placeholder:text-[var(--color-stone)] bg-transparent" />
          </div>
          <input type="datetime-local" min={minDateTime} value={newPool.departureTime} onChange={e => setNewPool({ ...newPool, departureTime: e.target.value })} className="w-full px-3 py-2 rounded-[12px] border border-[var(--color-paper)] text-[14px] outline-none text-[var(--color-graphite)] placeholder:text-[var(--color-stone)] bg-transparent" />
          <div className="flex gap-3">
            <input type="number" placeholder="Seats Available" value={newPool.seatsAvailable} onChange={e => setNewPool({ ...newPool, seatsAvailable: parseInt(e.target.value) || 1 })} className="w-1/2 px-3 py-2 rounded-[12px] border border-[var(--color-paper)] text-[14px] outline-none text-[var(--color-graphite)] placeholder:text-[var(--color-stone)] bg-transparent" min={1} max={6} />
            <input type="number" placeholder="Total ride cost (₹)" value={newPool.estimatedCost} onChange={e => setNewPool({ ...newPool, estimatedCost: e.target.value })} className="w-1/2 px-3 py-2 rounded-[12px] border border-[var(--color-paper)] text-[14px] outline-none text-[var(--color-graphite)] placeholder:text-[var(--color-stone)] bg-transparent" />
          </div>
          <button onClick={handleCreatePool} className="px-5 py-2.5 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[14px] font-medium transition-colors hover:opacity-90">Create Pool</button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        
        {/* LEFT — Active pools list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-[var(--color-graphite)]">Open Pools</h2>
            <span className="text-[12px] text-[var(--color-pewter)]">{activePools.length} available</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-[var(--color-pearl)] animate-pulse rounded-[20px]" />)}</div>
          ) : activePools.length === 0 ? (
            /* Empty state — proper structure */
            <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] px-8 py-16 text-center">
              <div className="w-12 h-12 rounded-[12px] bg-[var(--color-pearl)] flex items-center justify-center mx-auto mb-4">
                <Car size={20} className="text-[var(--color-pewter)]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[var(--color-graphite)] mb-1">No open pools right now</h3>
              <p className="text-[14px] text-[var(--color-stone)] mb-6">
                Be the first to start a pool and find fellow students heading your way.
              </p>
              <button
                onClick={() => setShowNewPool(true)}
                style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 4px 10px 0px' }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[14px] font-medium"
              >
                <Plus size={14} />
                Start a Pool
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activePools.map(pool => {
                const participants: string[] = parseJson(pool.participants) || [];
                const pendingRequests: any[] = pool.pendingRequests ? parseJson(pool.pendingRequests) : [];
                const seatsLeft = pool.seatsAvailable;
                const totalCost = pool.estimatedCost;
                
                const isInitiator = user?.id === pool.initiatorId;
                const hasRequested = pendingRequests.some(p => p.userId === user?.id && p.status === "pending");
                const isParticipant = participants.includes(user?.id || "");

                const destName = pool.source ? `${pool.source} → ${pool.destination}` : pool.destination;
                const costStr = totalCost ? `₹${totalCost} total` : '';

                return (
                  <div key={pool.id} className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin size={13} className="text-[var(--color-pewter)] shrink-0" />
                          <p className="text-[14px] font-semibold text-[var(--color-graphite)] truncate">{destName}</p>
                        </div>
                        <p className="text-[12px] text-[var(--color-pewter)]">
                          {new Date(pool.departureTime).toLocaleString()} · {seatsLeft} spot{seatsLeft !== 1 ? 's' : ''} left {costStr ? ` · ${costStr}` : ''}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isInitiator && (
                          <button
                            onClick={() => handleDeletePool(pool.id)}
                            className="p-2 border border-[var(--color-paper)] rounded-[20px] text-[var(--color-ember-orange)] hover:bg-[var(--color-pearl)] transition-colors"
                            title="Delete Cab Pool"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        {!isInitiator && !isParticipant && seatsLeft > 0 && (
                          <button 
                            onClick={() => handleJoinPool(pool.id)} 
                            disabled={hasRequested}
                            className={`px-4 py-2 rounded-[20px] text-[13px] font-medium transition-colors border ${
                              hasRequested 
                                ? "border-[var(--color-paper)] text-[var(--color-stone)] bg-[var(--color-pearl)] cursor-not-allowed" 
                                : "border-[var(--color-ember-orange)] text-[var(--color-ember-orange)] hover:bg-[var(--color-ember-orange)] hover:text-white"
                            }`}
                          >
                            {hasRequested ? "Pending" : "Join"}
                          </button>
                        )}
                        {isParticipant && !isInitiator && (
                          <span className="px-4 py-2 rounded-[20px] bg-[var(--color-pearl)] text-[var(--color-graphite)] text-[13px] font-medium border border-[var(--color-paper)]">
                            Joined
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pending Requests for initiator */}
                    {isInitiator && pendingRequests.filter(p => p.status === "pending").length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--color-paper)]">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-pewter)] mb-2">Pending Requests</p>
                        <div className="space-y-2">
                          {pendingRequests.filter(p => p.status === "pending").map((req: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-[var(--color-pearl)] p-2 rounded-[12px]">
                              <span className="text-[13px] text-[var(--color-stone)]">User: {req.userId.substring(0, 8)}...</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleManageRequest(pool.id, req.userId, "accept")}
                                  className="px-3 py-1.5 bg-[var(--color-canvas-white)] border border-[var(--color-paper)] text-[var(--color-graphite)] rounded-[20px] text-[12px] font-medium hover:border-[var(--color-ember-orange)] transition-colors"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleManageRequest(pool.id, req.userId, "reject")}
                                  className="px-3 py-1.5 bg-[var(--color-canvas-white)] border border-[var(--color-paper)] text-[var(--color-stone)] rounded-[20px] text-[12px] font-medium hover:text-[var(--color-ember-orange)] transition-colors"
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
          )}
        </div>

        {/* RIGHT — Info sidebar */}
        <div className="space-y-4">
          {/* How it works */}
          <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-6">
            <h3 className="text-[14px] font-semibold text-[var(--color-graphite)] mb-4">How it works</h3>
            {[
              { step: '1', text: 'Post your destination and departure time' },
              { step: '2', text: 'Peers at your campus join the pool' },
              { step: '3', text: 'Split the cab fare evenly on arrival' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3 mb-3 last:mb-0">
                <span className="w-5 h-5 rounded-full border border-[var(--color-paper)] bg-[var(--color-pearl)] flex items-center justify-center text-[11px] font-semibold text-[var(--color-pewter)] shrink-0 mt-0.5">
                  {item.step}
                </span>
                <p className="text-[13px] text-[var(--color-stone)] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

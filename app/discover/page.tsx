"use client";

import { useState, useEffect } from "react";
import { Compass, Search, MapPin, Mountain, Lightbulb, Star, ThumbsUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Place = {
  id: string; name: string; category: string; distanceMeters: number | null;
  direction: string | null; description: string; priceRange: string | null;
  mustTry: string | null; upvotes: number;
};
type SearchResult = {
  id: string; type: "place" | "trip" | "tip"; title: string; body: string; similarity: number;
};

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍕", stationery: "📚", medical: "💊", atm: "🏧", salon: "✂️",
  gym: "🏋️", entertainment: "🎮", emergency: "🚨", other: "📍",
};

export default function DiscoverPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { fetchPlaces(); }, [categoryFilter]);

  const fetchPlaces = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/local/places?${params}`);
      setPlaces(await res.json());
    } catch { } finally { setIsLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch("/api/local/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const categories = ["food", "stationery", "medical", "atm", "salon", "entertainment", "emergency"];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-midnight-navy)] flex items-center gap-3">
          <Compass className="w-8 h-8 text-[var(--color-electric-indigo)]" />
          Discover
        </h1>
        <p className="text-[var(--color-slate-blue)] mt-1">Local places, trips & campus survival tips</p>
      </div>

      {/* Smart Search */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-sm font-medium text-[var(--color-midnight-navy)] mb-2">What are you looking for?</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="cheap food, printer, weekend trip..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
          />
          <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2.5 rounded-xl bg-[var(--color-electric-indigo)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <Search className="w-4 h-4" />
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((r) => (
              <div key={r.id} className="rounded-xl bg-[var(--color-fog)] p-3 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-[var(--color-cloud)] text-[var(--color-slate-blue)] shrink-0 mt-0.5">
                  {r.type}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[var(--color-midnight-navy)] truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="places" className="space-y-4">
        <TabsList className="bg-[var(--color-fog)] rounded-xl p-1">
          <TabsTrigger value="places" className="rounded-lg text-sm">📍 Around Campus</TabsTrigger>
          <TabsTrigger value="trips" className="rounded-lg text-sm">🏔️ Trips</TabsTrigger>
          <TabsTrigger value="tips" className="rounded-lg text-sm">💡 Survival Guide</TabsTrigger>
        </TabsList>

        {/* Places Tab */}
        <TabsContent value="places" className="space-y-4">
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategoryFilter("")} className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ${!categoryFilter ? "bg-[var(--color-midnight-navy)] text-white" : "bg-[var(--color-fog)] text-[var(--color-slate-blue)]"}`}>All</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize shrink-0 ${categoryFilter === c ? "bg-[var(--color-midnight-navy)] text-white" : "bg-[var(--color-fog)] text-[var(--color-slate-blue)]"}`}>
                {CATEGORY_ICONS[c]} {c}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-[var(--color-fog)] animate-pulse rounded-2xl" />)}</div>
          ) : places.length === 0 ? (
            <div className="text-center py-12"><MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No places added yet. Be the first!</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {places.map(place => (
                <div key={place.id} className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[var(--color-midnight-navy)]">{place.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-[var(--color-fog)] text-[var(--color-slate-blue)]">
                          {CATEGORY_ICONS[place.category]} {place.category}
                        </span>
                        {place.distanceMeters && (
                          <span className="text-xs text-muted-foreground">{place.distanceMeters}m away</span>
                        )}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="w-3 h-3" /> {place.upvotes}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{place.description}</p>
                  {place.priceRange && <span className="text-xs font-medium text-emerald-600">{place.priceRange}</span>}
                  {place.mustTry && (
                    <p className="mt-2 text-xs text-[var(--color-electric-indigo)] flex items-center gap-1">
                      <Star className="w-3 h-3" /> {place.mustTry}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trips Tab — placeholder that fetches from API */}
        <TabsContent value="trips">
          <div className="text-center py-12">
            <Mountain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Trip recommendations coming soon! Use the search above to find trips.</p>
          </div>
        </TabsContent>

        {/* Tips Tab — placeholder */}
        <TabsContent value="tips">
          <div className="text-center py-12">
            <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Campus survival tips coming soon! Use the search above to find tips.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

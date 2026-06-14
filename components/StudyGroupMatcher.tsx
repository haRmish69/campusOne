"use client";

import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PeerMatch {
  id: string;
  name: string;
  major: string;
  gradYear: number;
  score: number;
}

export function StudyGroupMatcher({ subject }: { subject: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<PeerMatch[]>([]);
  const [error, setError] = useState("");

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && matches.length === 0) {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/study-group/match?subject=${encodeURIComponent(subject)}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || data.message || "Failed to find matches");
        }
        
        setMatches(data.matches || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="mt-4 gap-2 text-blue-600 border-blue-600/30 hover:bg-blue-50 transition-colors">
            <Users className="w-4 h-4" />
            Find Study Peers
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Study Group Matchmaker</DialogTitle>
          <DialogDescription>
            Finding peers for <strong>{subject}</strong> based on your academic profile.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Analyzing campus profiles...</p>
            </div>
          ) : error ? (
            <div className="bg-[var(--color-canvas-white)] text-red-600 p-4 rounded-[12px] text-sm">
              {error}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No matches found right now.</p>
              <p className="text-xs mt-2">Try again later when more students join.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="flex items-center justify-between p-3 border rounded-[20px] hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-foreground">{match.name}</p>
                    <p className="text-xs text-muted-foreground">{match.major} &bull; Class of {match.gradYear}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {match.score}% Match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

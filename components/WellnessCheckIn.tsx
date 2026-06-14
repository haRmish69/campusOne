"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, HeartPulse } from "lucide-react";

const MOODS = [
  { value: 1, emoji: "😢", label: "Awful" },
  { value: 2, emoji: "🙁", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

export function WellnessCheckIn() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [mood, setMood] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [stressLevel, setStressLevel] = useState<number>(3);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mood === null) {
      toast.error("Please select a mood.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Saving check-in...");

    try {
      const res = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          sleepHours,
          stressLevel,
          notes
        }),
      });

      if (!res.ok) throw new Error("Failed to save check-in");

      toast.success("Check-in saved! Have a great day.", { id: toastId });
      
      // Reset form (though typically users only do this once a day, so we could just hide it)
      setMood(null);
      setSleepHours(7);
      setStressLevel(3);
      setNotes("");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save check-in", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-sm mb-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center">
          <HeartPulse className="w-5 h-5 mr-2 text-pink-500" />
          Daily Check-in
        </CardTitle>
        <CardDescription>How are you feeling today?</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Mood Selector */}
          <div className="space-y-3">
            <Label className="text-base">Mood</Label>
            <div className="flex justify-between items-center bg-muted/20 p-2 rounded-[12px] border border-border/50">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center justify-center p-3 rounded-[12px] transition-all ${
                    mood === m.value 
                      ? "bg-primary/10 ring-2 ring-primary transform scale-110" 
                      : "hover:bg-muted opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className="text-3xl mb-1">{m.emoji}</span>
                  <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sleep Slider */}
            <div className="space-y-3 bg-blue-50/50 p-4 rounded-[12px] border border-blue-100">
              <div className="flex justify-between items-center">
                <Label className="text-blue-900 font-medium">Sleep</Label>
                <span className="text-sm font-bold text-blue-700">{sleepHours} hours</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="14" 
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-blue-400">
                <span>0h</span>
                <span>14h</span>
              </div>
            </div>

            {/* Stress Slider */}
            <div className="space-y-3 bg-amber-50/50 p-4 rounded-[12px] border border-amber-100">
              <div className="flex justify-between items-center">
                <Label className="text-amber-900 font-medium">Stress Level</Label>
                <span className="text-sm font-bold text-amber-700">{stressLevel} / 5</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="1"
                value={stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-amber-400">
                <span>Low (1)</span>
                <span>High (5)</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Journal / Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              placeholder="What's on your mind? Did anything specific trigger your stress today?" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-y"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting || mood === null} className="w-full bg-pink-600 hover:bg-pink-700">
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Check-in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const MOODS = [
  { value: 1, label: "Awful" },
  { value: 2, label: "Bad" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
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
    <div className="bg-white border border-[#e5e7eb] rounded-[24px] p-[28px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-shadow duration-300">
      <div className="mb-[32px]">
        <h3 className="text-[11px] uppercase font-bold text-[#6b7280] tracking-widest mb-1.5">Daily Log</h3>
        <p className="text-[16px] text-[#1f2937] font-semibold">How are you feeling today?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-[36px]">
        {/* Mood Selector */}
        <div className="space-y-[16px]">
          <label className="text-[12px] font-bold text-[#4b5563] uppercase tracking-wider">Mood</label>
          <div className="bg-[#f9fafb] p-1.5 rounded-2xl flex justify-between items-center border border-[#e5e7eb]">
            {MOODS.map((m) => {
              const isActive = mood === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`flex-1 py-[10px] rounded-[12px] text-[14px] font-semibold transition-all duration-300 transform ${
                    isActive 
                      ? "bg-white text-[#1f2937] shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]" 
                      : "text-[#6b7280] hover:text-[#374151] hover:bg-white/50"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px]">
          {/* Sleep Slider */}
          <div className="space-y-[16px] group">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-bold text-[#4b5563] uppercase tracking-wider">Sleep</label>
              <span className="text-[14px] font-bold text-[#1f2937] bg-[#f3f4f6] px-2.5 py-1 rounded-md">{sleepHours} <span className="text-[#6b7280] font-medium">hrs</span></span>
            </div>
            <input 
              type="range" min="0" max="14" step="0.5" value={sleepHours}
              onChange={(e) => setSleepHours(parseFloat(e.target.value))}
              className="w-full h-[6px] bg-[#e5e7eb] rounded-full appearance-none cursor-pointer outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[20px] [&::-webkit-slider-thumb]:h-[20px] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[2px] [&::-webkit-slider-thumb]:border-[#ff5a2f] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:hover:scale-110"
              style={{
                background: `linear-gradient(to right, #ff5a2f 0%, #ff5a2f ${(sleepHours / 14) * 100}%, #e5e7eb ${(sleepHours / 14) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>

          {/* Stress Slider */}
          <div className="space-y-[16px] group">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-bold text-[#4b5563] uppercase tracking-wider">Stress</label>
              <span className="text-[14px] font-bold text-[#1f2937] bg-[#f3f4f6] px-2.5 py-1 rounded-md">{stressLevel} <span className="text-[#6b7280] font-medium">/ 5</span></span>
            </div>
            <input 
              type="range" min="1" max="5" step="1" value={stressLevel}
              onChange={(e) => setStressLevel(parseInt(e.target.value))}
              className="w-full h-[6px] bg-[#e5e7eb] rounded-full appearance-none cursor-pointer outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[20px] [&::-webkit-slider-thumb]:h-[20px] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[2px] [&::-webkit-slider-thumb]:border-[#1f2937] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:hover:scale-110"
              style={{
                background: `linear-gradient(to right, #1f2937 0%, #1f2937 ${((stressLevel - 1) / 4) * 100}%, #e5e7eb ${((stressLevel - 1) / 4) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>

        {/* Notes / Journal */}
        <div className="space-y-[12px] pt-[8px]">
          <label htmlFor="notes" className="text-[12px] font-bold text-[#4b5563] uppercase tracking-wider">Journal</label>
          <div className="relative">
            <textarea 
              id="notes" 
              placeholder="What's on your mind? Did anything specific trigger your stress today?" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-[16px] focus:border-[#ff5a2f] focus:ring-4 focus:ring-[#ff5a2f]/10 focus:bg-white transition-all resize-none outline-none text-[14px] text-[#1f2937] placeholder-[#9ca3af]"
              rows={3}
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button 
            type="submit" 
            disabled={isSubmitting || mood === null} 
            className="w-full sm:w-auto px-8 h-[44px] bg-[#1f2937] hover:bg-[#374151] text-white rounded-xl text-[14px] font-bold tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving Log</>
            ) : (
              <>Save Check-in</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

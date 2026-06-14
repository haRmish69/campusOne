"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Loader2, AlertTriangle, CalendarClock } from "lucide-react";

export function SOSButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpen(true);
    if (!data) {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/sos");
        if (!res.ok) throw new Error("Failed to trigger SOS mode");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError("Could not analyze deadlines right now. Please try taking a deep breath anyway.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <Button 
        onClick={handleOpen}
        variant="destructive" 
        className="w-full gap-2 bg-[var(--color-canvas-white)] text-red-600 hover:bg-red-100 border border-red-200 justify-start mt-4"
      >
        <LifeBuoy className="w-4 h-4" />
        <span className="hidden md:inline">Feeling Overwhelmed?</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <LifeBuoy className="w-6 h-6 text-[var(--color-ember-orange)]" />
              SOS / Pause Mode
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              It is okay to feel overwhelmed. PocketBuddy has paused your notifications and sorted your priorities to help you regain control.
            </DialogDescription>
          </DialogHeader>

          {/* Breathing Animation */}
          <div className="flex flex-col items-center justify-center py-6 border-b border-border/50">
            <p className="text-sm text-muted-foreground mb-6 font-medium uppercase tracking-widest">Breathe</p>
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" style={{ animationDuration: '4s' }}></div>
              <div className="relative w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <HeartIcon />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-8 text-center animate-pulse">Inhale... Exhale...</p>
          </div>

          {/* AI Response Area */}
          <div className="pt-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p>Analyzing your upcoming deadlines to clear your plate...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-[var(--color-canvas-white)] text-red-600 rounded-[12px] text-sm text-center">
                {error}
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-[12px] text-indigo-900 leading-relaxed font-medium">
                  {data.message}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold flex items-center gap-2 text-red-700 mb-2">
                      <AlertTriangle className="w-4 h-4" /> 
                      Do Today (Critical)
                    </h4>
                    {data.critical?.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nothing critical right now. Take the day off.</p>
                    ) : (
                      <ul className="space-y-2">
                        {data.critical?.map((task: any) => (
                          <li key={task.id} className="p-3 bg-[var(--color-canvas-white)]/50 border border-red-100 rounded-[12px] text-sm font-medium text-red-900">
                            {task.title} <span className="text-xs text-[var(--color-ember-orange)] block font-normal mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold flex items-center gap-2 text-slate-600 mb-2">
                      <CalendarClock className="w-4 h-4" /> 
                      Can Wait (Rescheduled mentally)
                    </h4>
                    {data.reschedule?.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No other upcoming tasks.</p>
                    ) : (
                      <ul className="space-y-2 opacity-60 grayscale">
                        {data.reschedule?.map((task: any) => (
                          <li key={task.id} className="p-2 border border-slate-200 rounded-[12px] text-sm text-slate-700">
                            {task.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

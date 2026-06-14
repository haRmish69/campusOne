"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const routePrompts: Record<string, string> = {
  "/expenses": "Ask about my spending…",
  "/wellness": "Ask about my wellbeing…",
  "/mess": "Ask about today's menu…",
  "/deadlines": "Ask about my upcoming deadlines…",
  "/budget": "How am I doing on my budget?",
  "/notices": "Summarize my recent notices…",
  "/schedule": "What classes do I have today?",
  "/dashboard": "Give me a quick summary of my day…",
  "/placement": "Tell me about placement companies…",
  "/transport": "Any cab pools available today?",
  "/notes": "Search my study notes…",
};

export function AIFab() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Hide on chat page, landing page, and auth pages
  if (pathname === "/chat" || pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/onboarding") {
    return null;
  }

  const placeholder =
    routePrompts[pathname] ?? "Ask CampusFlow anything…";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      setOpen(false);
      setQuery("");
      router.push(`/chat?q=${encodeURIComponent(q)}`);
    } else {
      setOpen(false);
      router.push("/chat");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger 
        render={
          <button
            style={{ boxShadow: "rgba(0,0,0,0.25) 0px 4px 10px 0px" }}
            className="
              fixed bottom-6 right-6 z-50
              w-14 h-14 rounded-full
              bg-[var(--color-ember-orange)]
              flex items-center justify-center
              text-white transition-transform hover:scale-105
            "
            aria-label="Ask CampusFlow"
          />
        }
      >
        <Sparkles size={24} />
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-[20px] p-6">
        <p className="text-[14px] text-[var(--color-stone)] mb-3">
          Ask CampusFlow
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="
              flex-1 border border-[var(--color-paper)]
              rounded-[12px] px-4 py-3
              text-[16px] text-[var(--color-slate-dark)]
              outline-none focus:border-[var(--color-ember-orange)]
              bg-[var(--color-canvas-white)]
            "
            autoFocus
          />
          <button
            type="submit"
            className="
              px-5 py-3 rounded-[30px]
              bg-[var(--color-ember-orange)] text-white
              text-[16px] font-medium
              hover:opacity-90 transition-opacity
            "
          >
            Go
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

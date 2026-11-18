"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

export function VoiceFAB() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show the FAB if we're already on the chat page
  if (pathname === "/chat") return null;

  return (
    <Button
      onClick={() => router.push("/chat")}
      size="icon"
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 z-50 group"
      title="Ask CampusOne"
    >
      <Mic className="w-6 h-6 text-primary-foreground group-hover:animate-pulse" />
      
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
      </span>
    </Button>
  );
}

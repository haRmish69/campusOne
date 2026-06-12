"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SyncEmailButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing emails...", { description: "Fetching recent emails and extracting notices." });

    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Email sync not configured") {
          toast.error("Email Sync Not Configured", {
            id: toastId,
            description: "Please set up Gmail OAuth credentials in .env to use this feature.",
          });
        } else {
          throw new Error(data.error || "Failed to sync emails");
        }
        return;
      }

      toast.success("Sync Complete", {
        id: toastId,
        description: data.imported > 0 
          ? `Found ${data.relevantEmails} relevant emails. Imported ${data.imported} new notices.` 
          : "No new notices found in recent emails.",
      });
      
      if (data.imported > 0) {
        router.refresh();
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Sync Failed", {
        id: toastId,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={isSyncing}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
      Sync Gmail
    </Button>
  );
}

"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import "@/app/notices/notices.css";

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
    <button 
      onClick={handleSync} 
      disabled={isSyncing}
      className="btn-secondary"
      style={isSyncing ? { opacity: 0.5, pointerEvents: 'none' } : {}}
    >
      {isSyncing ? <Loader2 className="animate-spin" size={15} /> : <Mail size={15} />}
      Sync Gmail
    </button>
  );
}

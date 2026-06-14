"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function NotificationBell() {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/peer/notifications/${userId}?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Optimistically clear the badge since the API marks them as read when fetched
      setUnreadCount(0);
      fetchNotifications(); // Refresh to ensure they are marked read in state
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="relative text-[var(--color-stone)] hover:text-gray-900" />
        }
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-bold text-white items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Peer Learning Notifications</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center text-[var(--color-stone)] py-8">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-[12px] border ${notif.isRead ? 'bg-[var(--color-canvas-white)] border-[var(--color-paper)]' : 'bg-blue-50 border-blue-100'}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className={`text-sm ${notif.isRead ? 'text-gray-700' : 'text-blue-900 font-medium'}`}>
                    {notif.message}
                  </p>
                  {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />}
                </div>
                <p className="text-xs text-[var(--color-pewter)] mt-2">
                  {new Date(notif.createdAt).toLocaleString(undefined, { 
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

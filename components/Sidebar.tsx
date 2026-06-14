"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Bell, Utensils, CalendarClock, CalendarDays, Wallet, PieChart, Heart, User, Briefcase, Car, Compass, FolderOpen } from "lucide-react";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SOSButton } from "@/components/SOSButton";
import { NotificationBell } from "@/components/peer/NotificationBell";
import { Users } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/user/profile")
        .then(res => res.json())
        .then(data => {
          if (data && data.role === "admin") {
            setIsAdmin(true);
          }
        })
        .catch(() => {});
    }
  }, [isSignedIn]);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/notices", label: "Notices", icon: Bell },
    { href: "/mess", label: "Mess Menu", icon: Utensils },
    { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
    { href: "/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/notes", label: "My Notes", icon: FolderOpen },
    { href: "/placement", label: "Placement", icon: Briefcase },
    { href: "/transport", label: "Travel Pool", icon: Car },

    { href: "/peer-learning", label: "Study Peers", icon: Users },
  ];

  const pocketBuddyLinks = [
    { href: "/expenses", label: "Expenses", icon: Wallet },
    { href: "/budget", label: "Budget", icon: PieChart },
    { href: "/wellness", label: "Wellness", icon: Heart },
  ];

  if (pathname === "/") return null;

  return (
    <aside className="fixed bottom-0 left-0 w-full z-50 md:relative md:w-[240px] md:min-w-[240px] bg-card border-t md:border-t-0 md:border-r border-border/60 flex flex-col shrink-0 md:h-full md:flex">
      <div className="p-6 border-b border-border/40 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-midnight-navy">
            CampusFlow
          </h1>
          <p className="text-xs text-muted-foreground mt-1">AI Student Assistant</p>
        </div>
        <NotificationBell />
      </div>
      
      <nav className="flex-1 p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-2 justify-around md:justify-start overflow-x-auto md:overflow-y-auto w-full items-center md:items-stretch">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 shrink-0 ${
                isActive 
                  ? "bg-[var(--color-fog)] text-[var(--color-midnight-navy)] font-semibold shadow-sm" 
                  : "text-[var(--color-slate-blue)] hover:bg-[var(--color-fog)] hover:text-[var(--color-midnight-navy)]"
              }`}
            >
              <Icon className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          );
        })}

        <div className="hidden md:flex items-center gap-2 px-3 py-2 mt-2 mb-1 w-full">
          <div className="h-px bg-border/60 flex-1"></div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">PocketBuddy</span>
          <div className="h-px bg-border/60 flex-1"></div>
        </div>

        {pocketBuddyLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 shrink-0 ${
                isActive 
                  ? "bg-[var(--color-fog)] text-[var(--color-midnight-navy)] font-semibold shadow-sm" 
                  : "text-[var(--color-slate-blue)] hover:bg-[var(--color-fog)] hover:text-[var(--color-midnight-navy)]"
              }`}
            >
              <Icon className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          );
        })}
        
        {/* SOS Button */}
        <div className="mt-auto px-2 pb-2 w-full hidden md:block">
           <SOSButton />
        </div>
        <div className="md:hidden flex items-center justify-center px-3 py-2 shrink-0">
           <SOSButton />
        </div>
        
        {/* Mobile Auth Button */}
        <div className="md:hidden flex items-center justify-center px-3 py-2.5 shrink-0">
          {isLoaded && isSignedIn && (
            <UserButton showName>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Profile"
                  labelIcon={<User className="w-4 h-4" />}
                  href="/profile"
                />
              </UserButton.MenuItems>
            </UserButton>
          )}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <Button variant="outline" size="sm" className="h-8">Log In</Button>
            </SignInButton>
          )}
        </div>
      </nav>
      
      <div className="p-4 border-t border-border/40 hidden md:flex items-center justify-between">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {isLoaded && isSignedIn && (
            <UserButton showName>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Profile"
                  labelIcon={<User className="w-4 h-4" />}
                  href="/profile"
                />
              </UserButton.MenuItems>
            </UserButton>
          )}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">Sign In</Button>
            </SignInButton>
          )}
          <span className="hidden lg:inline ml-2">Powered by Gemini</span>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Bell, Utensils, CalendarClock, CalendarDays } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/notices", label: "Notices", icon: Bell },
    { href: "/mess", label: "Mess Menu", icon: Utensils },
    { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
    { href: "/schedule", label: "Schedule", icon: CalendarDays },
  ];

  if (pathname === "/") return null;

  return (
    <aside className="fixed bottom-0 left-0 w-full z-50 md:relative md:w-64 bg-card border-t md:border-t-0 md:border-r border-border/60 flex flex-col shrink-0 md:h-full md:flex">
      <div className="p-6 border-b border-border/40 hidden md:block">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tighter text-primary">
            CampusFlow
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-xs text-muted-foreground">AI Student Assistant</p>
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
                  ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          );
        })}
        
        {/* Mobile Auth Button */}
        <div className="md:hidden flex items-center justify-center px-3 py-2.5 shrink-0">
          {isLoaded && isSignedIn && <UserButton showName />}
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
            <UserButton showName />
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

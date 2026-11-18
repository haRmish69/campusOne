import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { AIFab } from "@/components/AIFab";
import { ClerkProvider } from "@clerk/nextjs";
import OnboardingCheck from "@/components/OnboardingCheck";

export const metadata: Metadata = {
  title: "CampusOne — Everything Campus. One Platform.",
  description: "CampusOne is an AI-powered student companion that brings academic management, campus information, smart scheduling, food information, deadlines and student networking together in one unified platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className="h-full antialiased"
        suppressHydrationWarning
      >
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Sora:wght@400;600;700;800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="h-full flex flex-col md:flex-row bg-[var(--color-canvas-white)]">
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
            {children}
          </main>
          <AIFab />
          <Toaster />
          <OnboardingCheck />
        </body>
      </html>
    </ClerkProvider>
  );
}

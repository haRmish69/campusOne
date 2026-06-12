import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { VoiceFAB } from "@/components/VoiceFAB";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CampusFlow",
  description: "Your intelligent campus assistant.",
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
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="h-full flex flex-col md:flex-row bg-background">
            <Sidebar />
            <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
              {children}
            </main>
            <VoiceFAB />
            <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

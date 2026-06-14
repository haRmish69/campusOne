import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { AIFab } from "@/components/AIFab";
import { ClerkProvider } from "@clerk/nextjs";
import OnboardingCheck from "@/components/OnboardingCheck";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
        className={`${plusJakarta.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="h-full flex flex-col md:flex-row bg-background">
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

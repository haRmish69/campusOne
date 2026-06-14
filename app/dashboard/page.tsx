import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { NoticeCard } from "@/components/NoticeCard";
import { DeadlineCard } from "@/components/DeadlineCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { CampusPulse } from "@/components/CampusPulse";
import { BriefingWidget } from "@/components/BriefingWidget";
import { BurnoutWidget } from "@/components/BurnoutWidget";
import { InsightsFeed } from "@/components/InsightsFeed";
import { computeBurnoutSignals, computeCompositeBurnout } from "@/lib/burnoutModel";
import { computeAlerts } from "@/lib/alertEngine";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[new Date().getDay()];
  const now = new Date();

  const [notices, deadlines, todaysClasses, profile] = await Promise.all([
    prisma.notice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.deadline.findMany({
      where: { 
        userId,
        isComplete: false,
        dueDate: { gte: now },
      },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    prisma.classSchedule.findMany({
      where: { 
        userId,
        day: todayName,
      },
      orderBy: { startTime: "asc" },
    }),
    userId ? prisma.userProfile.findUnique({ where: { userId } }) : Promise.resolve(null)
  ]);

  let burnoutData = null;
  let proactiveAlerts: any[] = [];
  if (userId) {
    try {
      const signals = await computeBurnoutSignals(userId);
      burnoutData = await computeCompositeBurnout(signals);
      proactiveAlerts = await computeAlerts(userId);
    } catch (e) {
      console.error("Error computing Ring 4 intelligence:", e);
    }
  }

  const filteredClasses = todaysClasses
    .filter(c => c.day.toLowerCase() === todayName.toLowerCase())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // --- PocketBuddy Mini Logic ---
  const currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  const currentExpenses = await prisma.expense.findMany({
    where: { userId, date: { gte: currentStartDate, lte: currentEndDate } },
  });
  const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const existingInsight = await prisma.wellnessInsight.findFirst({
    where: { userId, date: { gte: todayStart } },
    orderBy: { date: "desc" },
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {greeting()}, {profile?.name || "Student"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here is a quick overview of your campus life today.
          </p>
        </div>
        
        <Link href="/chat">
          <Button className="gap-2 bg-[var(--color-signal-blue)] hover:opacity-90 text-white shadow-[var(--shadow-sm-3)] h-11 px-6 rounded-[4px]">
            <Sparkles className="w-4 h-4" />
            Ask CampusFlow
          </Button>
        </Link>
      </div>

      <div className="flex flex-col space-y-12">
        <CampusPulse />

        {/* Daily Briefing */}
        <BriefingWidget />

        {/* Intelligence / Burnout & Insights */}
        {userId && (burnoutData || proactiveAlerts.length > 0) && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {burnoutData && (
              <div className="lg:col-span-1">
                <BurnoutWidget data={burnoutData} />
              </div>
            )}
            {proactiveAlerts.length > 0 && (
              <div className="lg:col-span-2">
                <InsightsFeed alerts={proactiveAlerts} />
              </div>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Timeline & Schedule */}
          <div className="lg:col-span-7 space-y-12">
            {/* Today's Classes */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  Classes Today <span className="text-sm font-normal text-muted-foreground ml-2">{todayName}</span>
                </h2>
                <Link href="/schedule" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View full <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              
              {filteredClasses.length === 0 ? (
                <div className="p-6 border border-[var(--color-paper)] rounded-[8px] bg-[var(--color-pearl)] text-center">
                  <p className="text-[var(--color-pewter)]">No classes scheduled for today! 🎉</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                  {filteredClasses.map(c => (
                    <div key={c.id} className="p-6 border border-[var(--color-paper)] rounded-[8px] bg-[var(--color-canvas-white)] shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
                      <span className="font-semibold text-[18px] text-[var(--color-graphite)]">{c.subject}</span>
                      <span className="text-[14px] text-[var(--color-pewter)]">{c.startTime} - {c.endTime}</span>
                      <span className="text-[14px] text-[var(--color-ember-orange)] font-medium">{c.room}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming Deadlines */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold tracking-tight">Upcoming Deadlines</h2>
                <Link href="/deadlines" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              
              {deadlines.length === 0 ? (
                <div className="p-6 border border-[var(--color-paper)] rounded-[8px] bg-[var(--color-pearl)] text-center">
                  <p className="text-[var(--color-pewter)]">No upcoming deadlines. You're all caught up!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {deadlines.map((deadline: any) => (
                    <DeadlineCard 
                      key={deadline.id} 
                      deadline={{...deadline, createdAt: deadline.createdAt.toISOString(), dueDate: deadline.dueDate.toISOString()}} 
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Briefings & Stats */}
          <div className="lg:col-span-5 space-y-12">
            {/* PocketBuddy Mini */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold tracking-tight">PocketBuddy Insights</h2>
                </div>
              </div>

              {existingInsight && (
                <div className="mb-6 p-6 rounded-lg bg-[var(--color-ember-orange)]/5 border border-[var(--color-ember-orange)]/20 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-ember-orange)]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                  <div className="absolute top-0 -left-4 w-32 h-32 bg-[var(--color-ember-orange)]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                  <div className="relative">
                    <h3 className="font-semibold text-[var(--color-graphite)] mb-2">Proactive Check-in</h3>
                    <p className="text-[var(--color-stone)] leading-relaxed">{existingInsight.message}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <Link href="/expenses" className="block">
                  <div className="p-6 border border-[var(--color-paper)] rounded-[8px] bg-[var(--color-canvas-white)] shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-[var(--color-pewter)] mb-1">This Month's Spend</h3>
                    <div className="text-3xl font-bold text-[var(--color-graphite)]">₹{currentTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                  </div>
                </Link>
                <Link href="/wellness" className="block">
                  <div className="p-6 border border-[var(--color-paper)] rounded-[8px] bg-[var(--color-canvas-white)] shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-[var(--color-pewter)] mb-1">Burnout Risk</h3>
                    {existingInsight ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-3xl font-bold ${existingInsight.score > 70 ? 'text-[var(--color-ember-orange)]' : 'text-emerald-600'}`}>{existingInsight.score}/100</span>
                        <span className={`text-sm font-medium ${existingInsight.score > 70 ? 'text-[var(--color-ember-orange)]' : 'text-emerald-600'}`}>
                          {existingInsight.score > 70 ? 'High' : 'Low'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-lg font-medium text-[var(--color-pewter)] mt-2">Not checked in today</div>
                    )}
                  </div>
                </Link>
              </div>
            </section>

            {/* Right Column: Notices */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold tracking-tight">Recent Notices</h2>
                <Link href="/notices" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              
              {notices.length === 0 ? (
                <div className="p-6 border border-[var(--color-paper)] rounded-[8px] bg-[var(--color-pearl)] text-center">
                  <p className="text-[var(--color-pewter)]">No recent notices.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {notices.map((notice: any) => (
                    <NoticeCard 
                      key={notice.id} 
                      notice={{...notice, createdAt: notice.createdAt.toISOString(), eventDate: notice.eventDate ? notice.eventDate.toISOString() : null}} 
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}

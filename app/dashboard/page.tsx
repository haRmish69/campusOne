import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { NoticeCard } from "@/components/NoticeCard";
import { DeadlineCard } from "@/components/DeadlineCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[new Date().getDay()];
  const now = new Date();

  const [notices, deadlines, todaysClasses] = await Promise.all([
    prisma.notice.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.deadline.findMany({
      where: { 
        isComplete: false,
        dueDate: { gte: now },
        OR: [{ userId }, { userId: null }]
      },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    prisma.classSchedule.findMany({
      where: { 
        day: todayName,
        OR: [{ userId }, { userId: null }]
      },
      orderBy: { startTime: "asc" },
    })
  ]);

  const filteredClasses = todaysClasses
    .filter(c => c.day.toLowerCase() === todayName.toLowerCase())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {greeting()}, Student! 👋
          </h1>
          <p className="text-muted-foreground">
            Here is a quick overview of your campus life today.
          </p>
        </div>
        
        <Link href="/chat">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-11 px-6">
            <Sparkles className="w-4 h-4" />
            Ask CampusFlow
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Deadlines & Classes */}
        <div className="lg:col-span-2 space-y-8">
          
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
              <div className="p-6 border border-dashed rounded-lg bg-muted/10 text-center">
                <p className="text-muted-foreground">No classes scheduled for today! 🎉</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredClasses.map(c => (
                  <div key={c.id} className="p-4 border rounded-lg bg-card shadow-sm flex flex-col gap-1 hover:border-primary/50 transition-colors">
                    <span className="font-semibold text-lg">{c.subject}</span>
                    <span className="text-sm text-muted-foreground">{c.startTime} - {c.endTime}</span>
                    <span className="text-sm text-amber-500/80">{c.room}</span>
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
              <div className="p-6 border border-dashed rounded-lg bg-muted/10 text-center">
                <p className="text-muted-foreground">No upcoming deadlines. You're all caught up!</p>
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

        {/* Right Column: Notices */}
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold tracking-tight">Recent Notices</h2>
              <Link href="/notices" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            {notices.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg bg-muted/10 text-center">
                <p className="text-muted-foreground">No recent notices.</p>
              </div>
            ) : (
              <div className="space-y-4">
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
  );
}

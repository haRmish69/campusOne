import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { CampusPulse } from "@/components/CampusPulse";
import { BriefingWidget } from "@/components/BriefingWidget";
import { BurnoutWidget } from "@/components/BurnoutWidget";
import { InsightsFeed } from "@/components/InsightsFeed";
import ProactiveNudge from "@/components/ProactiveNudge";
import { computeBurnoutSignals, computeCompositeBurnout } from "@/lib/burnoutModel";
import { computeAlerts } from "@/lib/alertEngine";

import "./dashboard.css";
import "@/app/notices/notices.css";

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
    <div className="dashboard">
      
      {/* Page Header */}
      <div className="db-header">
        <div>
          <h1 className="page-title">
            {greeting()}, {profile?.name || "Student"} 👋
          </h1>
          <p className="page-subtitle">
            Here's your campus overview for today.
          </p>
        </div>
        <Link href="/chat" className="btn-primary">
          <Sparkles size={16} />
          Ask CampusOne
        </Link>
      </div>

      <ProactiveNudge />

      {/* LEFT COLUMN */}
      <div className="main-col">
        <CampusPulse />
        <BriefingWidget />

        {/* Classes Today */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-heading">Classes Today</h2>
            <Link href="/schedule" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)', textDecoration: 'none' }}>
              View full →
            </Link>
          </div>

          {filteredClasses.length === 0 && (
            <div className="empty-state mt-[4px]">
              <CheckCircle2 size={16} style={{ color: 'var(--text3)' }} />
              <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
                No classes today. Enjoy your day off.
              </p>
            </div>
          )}

          {filteredClasses.length > 0 && (
            <div>
              {filteredClasses.map((cls) => (
                <div key={cls.id} className="class-row">
                  <div style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '40px' }}>{cls.startTime}</div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--acc)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text1)', margin: 0 }}>{cls.subject}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0 }}>{cls.room}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-heading">Upcoming Deadlines</h2>
            <Link href="/deadlines" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {deadlines.length === 0 && (
            <div className="empty-state mt-[4px]">
              <CheckCircle2 size={16} style={{ color: 'var(--text3)' }} />
              <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>You're all caught up. No deadlines this week.</p>
            </div>
          )}

          {deadlines.length > 0 && (
            <div>
              {deadlines.map((d: any) => {
                const hours = (new Date(d.dueDate).getTime() - now.getTime()) / 3600000;
                const isUrgent = hours < 48; // 2 days
                return (
                  <div key={d.id} className="insight-row">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isUrgent ? 'var(--urgent)' : 'var(--text3)', flexShrink: 0, marginTop: '6px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text2)', margin: '2px 0 0' }}>{d.subject} · due {new Date(d.dueDate).toLocaleDateString()}</p>
                    </div>
                    {isUrgent && (
                      <span className="deadline urgent" style={{ marginTop: '2px' }}>
                        <span className="dot"></span>
                        <Calendar size={12} />
                        in 1 day
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {userId && proactiveAlerts.length > 0 && (
          <InsightsFeed alerts={proactiveAlerts} />
        )}
      </div>

      {/* RIGHT COLUMN */}
      <div className="right-col">
        
        {/* PocketBuddy Insights */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'var(--surface2)' }}>
              <Sparkles size={12} style={{ color: 'var(--text3)' }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              PocketBuddy Insights
            </span>
          </div>
          
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text1)', margin: '0 0 6px' }}>
            Proactive Check-in
          </p>
          
          <p style={{ fontSize: '12px', color: 'var(--text2)', margin: '0 0 12px', lineHeight: 1.6 }}>
            {existingInsight ? existingInsight.message : "Everything looks smooth today! Keep up the good work and log your expenses and check-ins."}
          </p>
          
          <Link href="/wellness" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--acc)', textDecoration: 'none' }}>
            Read more →
          </Link>
        </div>

        {/* Burnout Score */}
        {userId && burnoutData ? (
          <BurnoutWidget data={burnoutData} />
        ) : (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Burnout Risk
              </span>
              <Link href="/wellness" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--acc)', textDecoration: 'none' }}>
                Track →
              </Link>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '8px' }}>Not enough data. Check-in today!</div>
          </div>
        )}

        {/* Monthly Spend Widget */}
        <div className="card">
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            This Month's Spend
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '4px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text1)', letterSpacing: '-0.5px', lineHeight: 1 }}>
              ₹{currentTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>
            {currentExpenses.length === 0 ? "No expenses logged yet. " : "Logged this month. "}
            <Link href="/expenses" style={{ color: 'var(--acc)', textDecoration: 'none', fontWeight: 600 }}>Log one →</Link>
          </p>
        </div>

        {/* Recent Notices (Mini) */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: '8px' }}>
            <h2 className="section-heading">Recent Notices</h2>
            <Link href="/notices" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          
          {notices.length === 0 ? (
            <div className="empty-state mt-[4px]">
              <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>No recent notices.</p>
            </div>
          ) : (
            <div>
              {notices.map((notice: any) => {
                const days = (new Date(notice.eventDate).getTime() - now.getTime()) / 86400000;
                let deadlineClass = 'normal';
                let deadlineText = 'in ' + Math.ceil(days) + ' days';
                if (days <= 2) deadlineClass = 'urgent';
                else if (days <= 5) deadlineClass = 'warning';
                if (days <= 0) { deadlineText = 'Past'; deadlineClass = 'normal'; }

                return (
                  <div key={notice.id} className="mini-notice-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span className="chip category" style={{ padding: '2px 6px', fontSize: '9px' }}>{notice.category}</span>
                        <span className="chip meta" style={{ padding: '2px 6px', fontSize: '9px' }}>{notice.source}</span>
                      </div>
                      <div className={`deadline ${deadlineClass}`} style={{ fontSize: '10px' }}>
                        {deadlineClass !== 'normal' && <span className="dot"></span>}
                        {deadlineText}
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text1)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {notice.title}
                    </p>

                    {notice.actionRequired && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                        <Sparkles style={{ width: '11px', height: '11px', color: 'var(--acc)', flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '11px', color: 'var(--text2)', margin: 0, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {notice.actionRequired}
                        </p>
                      </div>
                    )}

                    <Link href="/notices" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--acc)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                      Read more <Sparkles size={10} style={{ opacity: 0 }} /> {/* invisible spacer or simple arrow */}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

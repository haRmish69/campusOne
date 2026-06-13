import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const body = await req.json();
    const type: "morning" | "evening" = body.type || "morning";

    let userId = body.userId;
    if (!userId) {
      const authResult = await auth();
      userId = authResult.userId;
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── 1. Determine today's day string ─────────────────────────────────
    const now = new Date();
    const todayDay = now.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    });

    // ─── 2. Fetch today's classes ────────────────────────────────────────
    const classes = await prisma.classSchedule.findMany({
      where: { day: todayDay },
      orderBy: { startTime: "asc" },
      select: { subject: true, startTime: true, endTime: true, room: true, faculty: true },
    });

    // ─── 3. Fetch deadlines in the next 7 days ──────────────────────────
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const deadlines = await prisma.deadline.findMany({
      where: {
        dueDate: { gte: now, lte: sevenDaysLater },
        isComplete: false,
      },
      orderBy: { dueDate: "asc" },
      select: { title: true, subject: true, dueDate: true, type: true, notes: true },
    });

    // ─── 4. Fetch upcoming notices with events ──────────────────────────
    const notices = await prisma.notice.findMany({
      where: {
        eventDate: { gte: now, lte: sevenDaysLater },
      },
      orderBy: { eventDate: "asc" },
      select: { title: true, body: true, category: true, eventDate: true, venue: true },
    });

    // ─── 5. Fetch expense total for this month ──────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = await prisma.expense.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    });
    const monthlySpend = expenses._sum.amount || 0;
    const expenseCount = expenses._count || 0;

    // ─── 6. Build structured data payload ───────────────────────────────
    const istDateTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const classesText = classes.length > 0
      ? classes.map(c => `• ${c.startTime}–${c.endTime}: ${c.subject} (Room: ${c.room || "TBA"}, Faculty: ${c.faculty || "TBA"})`).join("\n")
      : "No classes scheduled today.";

    const deadlinesText = deadlines.length > 0
      ? deadlines.map(d => {
          const dueStr = new Date(d.dueDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", month: "short", day: "numeric" });
          return `• ${d.title} (${d.subject}) — due ${dueStr} [${d.type}]`;
        }).join("\n")
      : "No upcoming deadlines in the next 7 days. 🎉";

    const noticesText = notices.length > 0
      ? notices.map(n => {
          const eventStr = n.eventDate ? new Date(n.eventDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", month: "short", day: "numeric" }) : "";
          return `• ${n.title} (${n.category}) — ${eventStr}${n.venue ? ` at ${n.venue}` : ""}`;
        }).join("\n")
      : "No major campus events this week.";

    const expenseText = `₹${monthlySpend.toLocaleString("en-IN")} spent across ${expenseCount} transactions this month.`;

    // ─── 6b. Fetch recent wellness logs (last 3 days) ───────────────────
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentWellness = await prisma.wellnessLog.findMany({
      where: { date: { gte: threeDaysAgo } },
      orderBy: { date: "desc" },
      take: 5,
      select: { mood: true, sleepHours: true, stressLevel: true, notes: true, date: true },
    });

    const wellnessText = recentWellness.length > 0
      ? recentWellness.map(w => {
          const dateStr = new Date(w.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", month: "short", day: "numeric" });
          return `• ${dateStr}: Mood ${w.mood}/10, Stress ${w.stressLevel}/10, Sleep ${w.sleepHours ?? "?"}h${w.notes ? ` — "${w.notes}"` : ""}`;
        }).join("\n")
      : "No recent wellness data available.";

    // ─── 6c. Fetch yesterday's classes (for evening context) ────────────
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const yesterdayIdx = (new Date(now).getDay() + 6) % 7;
    const yesterdayDay = days[yesterdayIdx];
    const tomorrowIdx = (new Date(now).getDay() + 1) % 7;
    const tomorrowDay = days[tomorrowIdx];

    const tomorrowClasses = await prisma.classSchedule.findMany({
      where: { day: tomorrowDay },
      orderBy: { startTime: "asc" },
      select: { subject: true, startTime: true, endTime: true, room: true },
    });

    const tomorrowClassesText = tomorrowClasses.length > 0
      ? tomorrowClasses.map(c => `• ${c.startTime}–${c.endTime}: ${c.subject} (${c.room || "TBA"})`).join("\n")
      : "No classes scheduled tomorrow.";

    // ─── 7. Build system prompt ─────────────────────────────────────────
    const briefingType = type === "morning"
      ? "MORNING BRIEFING — The user is starting their day. Your role is to be their supportive, motivating campus mentor. Give them a clear overview of today's schedule, flag any urgent deadlines or campus events coming up this week, and mention their monthly spending snapshot. Be warm but concise."
      : "EVENING WRAP-UP — The user is wrapping up their day. Your role is to be a supportive, reflective campus mentor. Acknowledge what they had today, remind them of what's coming up tomorrow and this week, and share a quick spending check. Be warm and encouraging.";

    const systemPrompt = `You are CampusFlow, an elite AI campus mentor.
Current Date & Time (IST): ${istDateTime}
Today is: ${todayDay}

=== ${briefingType} ===

📚 TODAY'S CLASSES:
${classesText}

📅 TOMORROW'S CLASSES (${tomorrowDay}):
${tomorrowClassesText}

📋 UPCOMING DEADLINES (next 7 days):
${deadlinesText}

📢 CAMPUS EVENTS (next 7 days):
${noticesText}

💰 MONTHLY SPENDING:
${expenseText}

🧠 RECENT WELLNESS HISTORY (last 3 days):
${wellnessText}

INSTRUCTIONS:
1. Greet the user warmly with a ${type === "morning" ? "good morning" : "good evening"} energy.
2. Summarize today's data in a clear, structured, motivating way using markdown formatting (bullets, bold).
3. Highlight anything URGENT (exams due in 1-2 days, important events today).
4. If wellness history exists, REFERENCE it naturally. Examples:
   - "I noticed you've been sleeping only 5h the past 2 nights — try to get more rest tonight."
   - "Your stress has been climbing — remember to take breaks."
   - "Great to see your mood improving over the last few days! Keep it up."
   Do NOT just dump the raw numbers. Weave them into your advice naturally.
5. For evening briefings, mention tomorrow's schedule so they can prepare.
6. At the END, transition into a brief wellness check-in question (the UI will handle the actual MCQ, so just ask casually).
7. Keep the TOTAL response under 300 words.`;

    // ─── 8. Generate briefing via Gemini ────────────────────────────────
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Generate my ${type} briefing.`,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const briefingText = response.text || "I couldn't generate your briefing right now. Please try again.";

    return NextResponse.json({ briefing: briefingText, type });

  } catch (error: any) {
    console.error("Briefing API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

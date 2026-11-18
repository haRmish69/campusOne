import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { generateContentWithRetryAndFallback, sanitizeError } from "@/lib/gemini";

export async function POST(req: NextRequest) {

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

    // ─── 1. Determine today's day string & Fetch Profile ───────────────
    const now = new Date();
    const todayDay = now.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    });

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { name: true, major: true, instituteName: true }
    });
    const userName = profile?.name || "there";
    const userMajor = profile?.major || "your major";
    const userInstitute = profile?.instituteName || "campus";

    // ─── 2. Fetch today's classes ────────────────────────────────────────
    const classes = await prisma.classSchedule.findMany({
      where: { day: todayDay, userId },
      orderBy: { startTime: "asc" },
      select: { subject: true, startTime: true, endTime: true, room: true, faculty: true },
    });

    // ─── 3. Fetch deadlines in the next 7 days ──────────────────────────
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const deadlines = await prisma.deadline.findMany({
      where: {
        userId,
        dueDate: { gte: now, lte: sevenDaysLater },
        isComplete: false,
      },
      orderBy: { dueDate: "asc" },
      select: { title: true, subject: true, dueDate: true, type: true, notes: true },
    });

    // ─── 4. Fetch upcoming notices with events ──────────────────────────
    const notices = await prisma.notice.findMany({
      where: {
        userId,
        eventDate: { gte: now, lte: sevenDaysLater },
      },
      orderBy: { eventDate: "asc" },
      select: { title: true, body: true, category: true, eventDate: true, venue: true },
    });

    // ─── 5. Fetch expense total for this month ──────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = await prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: monthStart, lte: now },
      },
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
      where: { userId, date: { gte: threeDaysAgo } },
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
      where: { userId, day: tomorrowDay },
      orderBy: { startTime: "asc" },
      select: { subject: true, startTime: true, endTime: true, room: true },
    });

    const tomorrowClassesText = tomorrowClasses.length > 0
      ? tomorrowClasses.map(c => `• ${c.startTime}–${c.endTime}: ${c.subject} (${c.room || "TBA"})`).join("\n")
      : "No classes scheduled tomorrow.";

    // ─── 7. Construct System Prompt ─────────────────────────────────────
    const systemPrompt = `You are "PocketBuddy", a highly intelligent, empathetic, and personal AI assistant for ${userName}.
${userName} is a ${userMajor} student at ${userInstitute}. 
You are giving them their ${type} briefing.

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
1. Greet the user by their name (${userName}) warmly.
2. Generate a 'briefingMarkdown' string summarizing their data in a highly personalized, motivating way. DO NOT sound like a robot reading a list. Sound like a caring mentor.
3. Specifically reference their major (${userMajor}) or institute (${userInstitute}) if it makes sense (e.g., "As a ${userMajor} student, this OS class might be heavy...").
4. If their wellness history shows low sleep or high stress, offer genuine, context-aware advice (e.g., "I noticed you've been sleeping under 6 hours. With your project deadline tomorrow, please try to rest tonight!").
5. Keep the text under 350 words.
6. Generate exactly 5 'questions' for a multiple-choice wellness check-in:
   - Question 1 MUST have id="sleep", asking about sleep hours (values must be numbers).
   - Question 2 MUST have id="mood", asking about mood (values must be 1-10).
   - Question 3 MUST have id="stress", asking about stress (values must be 1-10).
   - Questions 4 & 5 MUST be hyper-personalized based on their specific schedule, deadlines, expenses, or major (e.g. "How prepared do you feel for the upcoming Database Systems exam?").
   - Each question must have 3-5 'options' with a 'label' (string) and 'value' (number or string).`;

    // ─── 8. Generate briefing via Gemini ────────────────────────────────
    const response = await generateContentWithRetryAndFallback({
      contents: `Generate my ${type} briefing.`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as any,
          properties: {
            briefingMarkdown: { type: "string" as any },
            questions: {
              type: "array" as any,
              items: {
                type: "object" as any,
                properties: {
                  id: { type: "string" as any },
                  question: { type: "string" as any },
                  options: {
                    type: "array" as any,
                    items: {
                      type: "object" as any,
                      properties: {
                        label: { type: "string" as any },
                        value: { type: "string" as any } // Use string to support both numbers and text generically in the parsed JSON, we'll cast on frontend if needed or let wellness-sync handle it
                      },
                      required: ["label", "value"]
                    }
                  }
                },
                required: ["id", "question", "options"]
              }
            }
          },
          required: ["briefingMarkdown", "questions"]
        }
      },
    });

    const rawJson = response.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = { briefingMarkdown: "I couldn't generate your briefing right now.", questions: [] };
    }

    return NextResponse.json({ 
      briefing: parsed.briefingMarkdown, 
      questions: parsed.questions,
      type 
    });

  } catch (error: any) {
    console.error("Briefing API Error:", sanitizeError(error));
    return NextResponse.json({ error: "AI analysis is temporarily unavailable. Please try again in a few moments." }, { status: 503 });
  }
}

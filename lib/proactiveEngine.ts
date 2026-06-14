import { prisma } from "./prisma";
import { parseTextToJSON } from "./gemini";

// ─── Types ───────────────────────────────────────────────────────────────────

type NudgeType = "mess_feedback" | "study_gap" | "wellness_checkin" | "expense_check" | null;

interface NudgeResult {
  nudge: string | null;
  type: NudgeType;
  actionLabel: string | null;
  actionHref: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NULL_RESULT: NudgeResult = {
  nudge: null,
  type: null,
  actionLabel: null,
  actionHref: null,
};

const VALID_TYPES: string[] = [
  "mess_feedback",
  "study_gap",
  "wellness_checkin",
  "expense_check",
];

const GEMINI_TIMEOUT_MS = 10000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapTypeToHref(type: NudgeType): string | null {
  switch (type) {
    case "study_gap":
      return `/chat?q=${encodeURIComponent("Can you help me make a study plan for my upcoming deadline?")}`;
    case "expense_check":
      return "/expenses";
    case "wellness_checkin":
      return "/wellness";
    case "mess_feedback":
    default:
      return null;
  }
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

/**
 * Evaluates the current user's state and returns a single proactive nudge.
 * NEVER throws — always returns NudgeResult (with nudge: null on any error).
 */
export async function evaluateUser(userId: string | null): Promise<NudgeResult> {
  try {
    const now = new Date();
    // "Monday", "Tuesday", ... — title-cased, matching ClassSchedule.day and MessMenu.day
    const dayName = now.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    });
    // "14:30" — zero-padded 24hr, matching ClassSchedule.startTime format "HH:MM"
    const currentTimeHHMM = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });

    // Build userId where clause defensively (handles null userId for unauthenticated)
    const userWhere = userId ? { userId } : {};

    // ── 1. Gather state snapshot via Promise.allSettled ──────────────────
    // Each query is isolated — one bad query cannot kill the others.
    const [
      lastExpenseResult,
      lastWellnessResult,
      todayClassesResult,
      upcomingDeadlinesResult,
      todayMessResult,
    ] = await Promise.allSettled([
      prisma.expense.findFirst({
        where: userWhere,
        orderBy: { createdAt: "desc" },
      }),
      prisma.wellnessLog.findFirst({
        where: userWhere,
        orderBy: { createdAt: "desc" },
      }),
      prisma.classSchedule.findMany({
        where: { ...userWhere, day: dayName },
        orderBy: { startTime: "asc" },
      }),
      prisma.deadline.findMany({
        where: {
          ...userWhere,
          isComplete: false,
          dueDate: {
            gte: now,
            lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { dueDate: "asc" },
        take: 3,
      }),
      prisma.messMenu.findMany({
        where: { day: dayName },
      }),
    ]);

    // Extract results defensively — failed queries default to null/[]
    const lastExpense =
      lastExpenseResult.status === "fulfilled" ? lastExpenseResult.value : null;
    const lastWellness =
      lastWellnessResult.status === "fulfilled"
        ? lastWellnessResult.value
        : null;
    const todayClasses =
      todayClassesResult.status === "fulfilled"
        ? todayClassesResult.value
        : [];
    const upcomingDeadlines =
      upcomingDeadlinesResult.status === "fulfilled"
        ? upcomingDeadlinesResult.value
        : [];
    const todayMess =
      todayMessResult.status === "fulfilled" ? todayMessResult.value : [];

    // ── 2. Compute derived values defensively ───────────────────────────

    let hoursSinceLastExpense: number | null = null;
    try {
      if (lastExpense?.createdAt) {
        hoursSinceLastExpense = Math.round(
          (now.getTime() - new Date(lastExpense.createdAt).getTime()) / 3600000
        );
      }
    } catch {
      /* safe fallback */
    }

    let hoursSinceLastWellnessLog: number | null = null;
    try {
      if (lastWellness?.createdAt) {
        hoursSinceLastWellnessLog = Math.round(
          (now.getTime() - new Date(lastWellness.createdAt).getTime()) /
            3600000
        );
      }
    } catch {
      /* safe fallback */
    }

    // Find the next upcoming class today
    let nextClass: {
      subject: string;
      startTime: string;
      room: string | null;
    } | null = null;
    let gapBeforeNextClassHours: number | null = null;
    try {
      const upcoming = todayClasses.find((c) => c.startTime > currentTimeHHMM);
      if (upcoming) {
        nextClass = {
          subject: upcoming.subject,
          startTime: upcoming.startTime,
          room: upcoming.room,
        };
        // Calculate gap: parse "HH:MM" strings to minutes, diff them
        const [classH, classM] = upcoming.startTime.split(":").map(Number);
        const [nowH, nowM] = currentTimeHHMM.split(":").map(Number);
        const classMinutes = classH * 60 + classM;
        const nowMinutes = nowH * 60 + nowM;
        gapBeforeNextClassHours =
          Math.round(((classMinutes - nowMinutes) / 60) * 10) / 10;
      }
    } catch {
      /* safe fallback */
    }

    // Upcoming deadlines summary (max 3, compact)
    const upcomingDeadlinesSummary = upcomingDeadlines.slice(0, 3).map((d) => {
      try {
        const daysRemaining = Math.max(
          0,
          Math.round(
            (new Date(d.dueDate).getTime() - now.getTime()) / 86400000
          )
        );
        return { title: d.title, subject: d.subject, daysRemaining };
      } catch {
        return {
          title: d.title || "Unknown",
          subject: d.subject || "Unknown",
          daysRemaining: 0,
        };
      }
    });

    // Meal heuristic: estimate if a meal recently ended based on current IST hour
    // Breakfast ~7:00-10:00, Lunch ~12:00-14:00, Dinner ~19:00-21:00
    let recentMealEndedMinutesAgo: number | null = null;
    try {
      if (todayMess.length > 0) {
        const [nowH, nowM] = currentTimeHHMM.split(":").map(Number);
        if (nowH >= 10 && nowH < 12) {
          // Breakfast recently ended (~10:00)
          recentMealEndedMinutesAgo = (nowH - 10) * 60 + nowM;
        } else if (nowH >= 14 && nowH < 16) {
          // Lunch recently ended (~14:00)
          recentMealEndedMinutesAgo = (nowH - 14) * 60 + nowM;
        } else if (nowH >= 21 && nowH < 23) {
          // Dinner recently ended (~21:00)
          recentMealEndedMinutesAgo = (nowH - 21) * 60 + nowM;
        }
      }
    } catch {
      /* safe fallback */
    }

    // ── 3. Empty-state short-circuit ────────────────────────────────────
    // If the user has zero data, skip Gemini entirely — no hallucinated nudge.
    const hasData =
      lastExpense ||
      lastWellness ||
      nextClass ||
      upcomingDeadlines.length > 0;
    if (!hasData) {
      return NULL_RESULT;
    }

    // ── 4. Build compact snapshot for Gemini ────────────────────────────
    const snapshot = {
      now: now.toISOString(),
      hoursSinceLastExpense,
      hoursSinceLastWellnessLog,
      nextClass,
      gapBeforeNextClassHours,
      upcomingDeadlines: upcomingDeadlinesSummary,
      recentMealEndedMinutesAgo,
    };

    // ── 5. Gemini call with timeout ────────────────────────────────────
    const NUDGE_PROMPT = `You are a proactive assistant for a college student app. Based on this student's current state (JSON below), suggest ONE short, friendly, specific nudge or question to show them right now. Pick the SINGLE most useful thing — do not list multiple. If genuinely nothing is useful right now, return null for the nudge field.

Rules:
- Keep the nudge under 20 words, warm and casual tone
- type must be exactly one of: 'mess_feedback', 'study_gap', 'wellness_checkin', 'expense_check', or null
- actionLabel: short button text (2-4 words) matching the type, or null

Return ONLY valid JSON, no markdown, no explanation:
{ "nudge": string | null, "type": string | null, "actionLabel": string | null }`;

    const geminiPromise = parseTextToJSON(
      JSON.stringify(snapshot),
      NUDGE_PROMPT
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini nudge timeout (4s)")), GEMINI_TIMEOUT_MS)
    );

    const result = await Promise.race([geminiPromise, timeoutPromise]);

    // ── 6. Validate Gemini response ────────────────────────────────────
    const nudgeText =
      typeof result.nudge === "string" &&
      result.nudge.length > 0 &&
      result.nudge.length <= 150
        ? result.nudge
        : null;

    if (!nudgeText) {
      return NULL_RESULT;
    }

    const rawType = typeof result.type === "string" ? result.type : null;
    const validatedType: NudgeType =
      rawType && VALID_TYPES.includes(rawType) ? (rawType as NudgeType) : null;

    const actionLabel =
      typeof result.actionLabel === "string" && result.actionLabel.length > 0
        ? result.actionLabel
        : null;

    // ── 7. Map type → actionHref ───────────────────────────────────────
    return {
      nudge: nudgeText,
      type: validatedType,
      actionLabel,
      actionHref: mapTypeToHref(validatedType),
    };
  } catch (error) {
    // NEVER throw — always return null result on any error
    console.error("[ProactiveEngine] Error (silent):", error);
    return NULL_RESULT;
  }
}

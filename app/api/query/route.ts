import { NextRequest, NextResponse } from "next/server";
import { getRealEmbedding } from "@/lib/embeddings";
import { dualSearch, SearchResult } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { 
  generateContentWithRetryAndFallback, 
  generateContentStreamWithRetryAndFallback, 
  isRetryableGeminiError, 
  sanitizeError 
} from "@/lib/gemini";
import { toolDeclarations, executeTool } from "@/lib/chatTools";

// ─── Context Token Budget ────────────────────────────────────────────────
const MAX_CONTEXT_CHARS = 24000; // ~6000 tokens at ~4 chars/token
const TOP_K_PRIVATE = 8;
const TOP_K_GLOBAL = 8;
const DIRECT_INJECT_CAP = 10; // max cab pools / transport updates injected

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || body.question;
    const sessionId = body.sessionId || "default_session";
    
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    let userId = body.userId;
    if (!userId) {
      const authResult = await auth();
      userId = authResult.userId;
    }

    // Save user message to database
    if (userId) {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: "user",
          content: query
        }
      });
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── 1. Fetch UserProfile Context ──────────────────────────────────
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    // ─── 2. Generate Embedding (NO day-prepend hack) ───────────────────
    const queryEmbedding = await getRealEmbedding(query);

    // ─── 3. Dual-Index Semantic Search ─────────────────────────────────
    const searchResults = dualSearch(queryEmbedding, userId, TOP_K_PRIVATE, TOP_K_GLOBAL);

    // ─── 4. Hydrate: Direct table lookups (no blind IN(...) across all) ─
    const contextParts: string[] = [];

    for (const hit of searchResults) {
      const text = await hydrateRecord(hit, userId);
      if (text) contextParts.push(text);
    }

    // ─── 5. Direct Context Injection (always-on, high-value data) ──────
    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" });

    // 5a. Today's mess menu (replaces the day-prepend hack)
    const todayMenus = await prisma.messMenu.findMany({
      where: { userId, day: { contains: dayName } }
    });
    for (const m of todayMenus) {
      contextParts.unshift(`[MESS_TODAY] ${m.day} ${m.meal}: ${m.items}`);
    }

    // 5b. Active Budget for current month
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const budget = await prisma.budget.findFirst({
      where: { userId, month: currentMonth }
    });
    if (budget) {
      const totalSpent = await prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          }
        },
        _sum: { amount: true }
      });
      const spent = totalSpent._sum.amount || 0;
      const remaining = budget.totalLimit - spent;
      contextParts.unshift(
        `[BUDGET] Month: ${currentMonth}. Total Limit: ₹${budget.totalLimit}. Spent: ₹${spent.toFixed(0)}. Remaining: ₹${remaining.toFixed(0)}. Category Limits: ${JSON.stringify(budget.categoryLimits)}.`
      );
    }

    // 5c. Active Cab Pools (PII-scrubbed, capped)
    const instituteName = profile?.instituteName;
    if (instituteName) {
      const cabPools = await prisma.cabPoolRequest.findMany({
        where: {
          instituteName,
          status: "open",
          departureTime: { gte: now },
        },
        orderBy: { departureTime: "asc" },
        take: DIRECT_INJECT_CAP,
      });
      for (const pool of cabPools) {
        const seatsTotal = pool.seatsAvailable + (Array.isArray(pool.participants) ? (pool.participants as string[]).length : 0);
        contextParts.push(
          `[CAB_POOL] To ${pool.destination} at ${pool.departureTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}. Seats: ${pool.seatsAvailable}/${seatsTotal} open. ${pool.source ? `From: ${pool.source} area.` : ""} Pool ID: ${pool.id.slice(-6)}. ${pool.notes || ""}`
        );
      }
      if (cabPools.length === DIRECT_INJECT_CAP) {
        contextParts.push(`[CAB_POOL] +more cab pools available — user can ask to see all.`);
      }

      // 5d. Active Transport Updates (capped)
      const transportUpdates = await prisma.transportUpdate.findMany({
        where: {
          instituteName,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        take: DIRECT_INJECT_CAP,
      });
      for (const update of transportUpdates) {
        contextParts.push(
          `[TRANSPORT_UPDATE] [${update.severity.toUpperCase()}] ${update.updateType}: ${update.message}`
        );
      }
    }

    // ─── 6. Token Budget Trimming ──────────────────────────────────────
    let context = contextParts.join("\n\n");
    if (context.length > MAX_CONTEXT_CHARS) {
      // Keep direct injections (at the front), trim lower-ranked hits from the end
      context = context.substring(0, MAX_CONTEXT_CHARS) + "\n\n[...context trimmed for length]";
    }

    // ─── 7. System Prompt ──────────────────────────────────────────────
    const istDateTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });

    const systemInstruction = `You are CampusOne, an elite AI assistant for students.
Current Date & Time (IST): ${istDateTime}

You have TWO capabilities:
1. ANSWER questions using the context below (retrieved from FAISS + direct data feeds).
2. MODIFY campus data using your tools. The tools search the MySQL database directly — they do NOT depend on the context below. The data EXISTS in the database even if you don't see it in the context.

CRITICAL: WHEN THE USER WANTS TO UPDATE, CHANGE, REPLACE, ADD, OR MODIFY ANY DATA — YOU MUST ALWAYS CALL THE APPROPRIATE TOOL. DO NOT say "I don't have that data". The tool will find it in the database.

Tool usage guidelines:
- update_mess_menu: When user wants to change food items for a specific day+meal. Pass the FULL updated items list.
- update_notice / update_deadline / update_schedule: When user wants to edit existing entries.
- add_notice / add_deadline / add_expense / add_wellness_log: When user wants to create new entries.

Context Tag Reference:
[NOTICE] Campus notices and announcements
[MESS_TODAY] Today's mess menu (always current)
[MESS] Mess menu for other days (from search)
[DEADLINE] Upcoming deadlines and assignments
[CLASS] Class schedule entries
[EXPENSE] Student's personal expense records (PRIVATE — never share with others)
[BUDGET] Student's monthly budget summary (PRIVATE)
[WELLNESS] Student's mood, stress, and sleep logs (PRIVATE — handle with care)
[HELP_REQUEST] Peer learning help requests
[STUDY_SESSION] Scheduled study sessions between peers
[EXPERTISE] Skills and topics peers can help with
[COMPANY] Placement portal company profiles
[INTERVIEW] Interview experiences shared by students
[PREP_QUESTION] Interview preparation questions
[TRANSPORT_ROUTE] Campus bus/shuttle schedules
[TRANSPORT_UPDATE] Live transport alerts and delays
[CAB_POOL] Active cab-sharing opportunities (PII-scrubbed — direct user to in-app join flow)

Behavioral Guardrails:
- [WELLNESS]: Treat health data with care. Do NOT diagnose or play therapist. For negative trends (low mood, high stress, poor sleep), be supportive and gently mention campus counseling resources. Be a caring campus assistant, not a doctor.
- [EXPENSE] / [BUDGET]: Present factual summaries only (totals, remaining, breakdowns). Do NOT frame responses as financial advice. Let the student decide.
- [CAB_POOL] / [HELP_REQUEST] (others'): NEVER invent or expose contact details. Direct the user to the in-app action (join request, accept, message via app). Only reference the Pool ID or Request ID.
- [INTERVIEW] / [COMPANY] / [PREP_QUESTION] / [TRANSPORT_ROUTE]: Freely shareable campus knowledge — no special handling needed.

For QUESTIONS only: Answer from the context below. If the context is completely missing the information, say: 'I don't have that information in my campus data.'

User Profile: Name: ${profile?.name || "Student"}, Major: ${profile?.major || "Unknown"}, Year: ${profile?.gradYear || "Unknown"}, College: ${profile?.instituteName || "Unknown"}.

Context:
${context}`;

    // ─── 8. Tool-Detection Call ─────────────────────────────────────────
    console.log("⏳ Starting tool-detection call...");
    const response = await generateContentWithRetryAndFallback({
      contents: query,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations as any }],
      },
    });
    console.log("✅ Tool-detection call complete");

    // ─── 9. Handle Tool Call ───────────────────────────────────────────
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart && functionCallPart.functionCall) {
      const toolName = functionCallPart.functionCall.name;
      const toolArgs = functionCallPart.functionCall.args || {};
      
      console.log(`🔧 Tool call: ${toolName}(${JSON.stringify(toolArgs)})`);
      const toolResult = await executeTool(toolName!, toolArgs, userId!);
      console.log(`✅ Tool result: ${toolResult}`);

      const followUp = await generateContentStreamWithRetryAndFallback({
        contents: [
          { role: "user", parts: [{ text: query }] },
          { role: "model", parts: parts },
          { role: "user", parts: [{ functionResponse: { name: toolName!, response: { result: toolResult } } }] },
        ],
        config: {
          systemInstruction: `You are CampusOne, a friendly AI assistant. The user asked to modify some campus data and the tool has executed. Summarize what was changed in a warm, helpful way. Keep it brief — 1-2 sentences max. Current Date & Time (IST): ${istDateTime}`,
        },
      });

      const encoder = new TextEncoder();
      let assistantMessage = "";
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of followUp) {
              if (chunk.text) {
                assistantMessage += chunk.text;
                controller.enqueue(encoder.encode(chunk.text));
              }
            }
          } catch (e) {
            console.error("Stream error:", e);
            controller.error(e);
          } finally {
            if (userId) {
              prisma.chatMessage.create({
                data: { sessionId, userId, role: "assistant", content: assistantMessage }
              }).catch(err => console.error("Failed to save assistant message:", err));
            }
            controller.close();
          }
        }
      });

      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // ─── 10. Normal Text Response ──────────────────────────────────────
    const alreadyHasText = response.text && response.text.trim().length > 0;
    
    let assistantMessage = "";
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (alreadyHasText) {
            assistantMessage = response.text!;
            controller.enqueue(encoder.encode(response.text!));
          } else {
            const streamResponse = await generateContentStreamWithRetryAndFallback({
              contents: query,
              config: {
                systemInstruction,
                thinkingConfig: { thinkingBudget: 1024 },
              },
            });
            for await (const chunk of streamResponse) {
              if (chunk.text) {
                assistantMessage += chunk.text;
                controller.enqueue(encoder.encode(chunk.text));
              }
            }
          }
        } catch (e) {
          console.error("Stream generation error:", e);
          controller.error(e);
        } finally {
          if (userId && assistantMessage) {
            prisma.chatMessage.create({
              data: { sessionId, userId, role: "assistant", content: assistantMessage }
            }).catch(err => console.error("Failed to save assistant message:", err));
          }
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error: any) {
    console.error("[Query API Error]:", sanitizeError(error));
    if (error.isHighDemand || isRetryableGeminiError(error)) {
      return NextResponse.json(
        { 
          error: "AI analysis is temporarily unavailable. Please try again in a few moments.",
          isHighDemand: true,
          canRetry: true 
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "AI analysis is temporarily unavailable. Please try again in a few moments.", canRetry: true },
      { status: 500 }
    );
  }
}

// ─── Hydration: Direct table lookup by (table, recordId) ─────────────────
// No more blind `IN (...)` across all tables!

async function hydrateRecord(hit: SearchResult, currentUserId: string): Promise<string | null> {
  const { table, recordId } = hit;

  try {
    switch (table) {
      case "Notice": {
        const r = await prisma.notice.findUnique({ where: { id: recordId } });
        if (!r || (r.userId && r.userId !== currentUserId)) return null;
        return `[NOTICE] ${r.title}: ${r.body}`;
      }
      case "MessMenu": {
        const r = await prisma.messMenu.findUnique({ where: { id: recordId } });
        if (!r || (r.userId && r.userId !== currentUserId)) return null;
        return `[MESS] ${r.day} ${r.meal}: ${r.items}`;
      }
      case "Deadline": {
        const r = await prisma.deadline.findUnique({ where: { id: recordId } });
        if (!r || (r.userId && r.userId !== currentUserId)) return null;
        return `[DEADLINE] ${r.title}: ${r.subject} due ${r.dueDate}. ${r.notes || ""}`;
      }
      case "ClassSchedule": {
        const r = await prisma.classSchedule.findUnique({ where: { id: recordId } });
        if (!r || (r.userId && r.userId !== currentUserId)) return null;
        return `[CLASS] ${r.subject}: ${r.day} ${r.startTime}-${r.endTime} at ${r.room || "TBD"}`;
      }
      // ── PocketBuddy (PRIVATE — strict userId enforcement) ──
      case "Expense": {
        const r = await prisma.expense.findUnique({ where: { id: recordId } });
        if (!r || r.userId !== currentUserId) return null; // STRICT
        return `[EXPENSE] ${r.category}: ₹${r.amount} on ${r.description} (${r.date.toISOString().split("T")[0]})`;
      }
      case "WellnessLog": {
        const r = await prisma.wellnessLog.findUnique({ where: { id: recordId } });
        if (!r || r.userId !== currentUserId) return null; // STRICT
        return `[WELLNESS] Mood: ${r.mood}/5, Stress: ${r.stressLevel}/5, Sleep: ${r.sleepHours || "?"}h. Notes: ${r.notes || "none"}. Date: ${r.date.toISOString().split("T")[0]}`;
      }
      // ── Campus Ecosystem (GLOBAL — campus-wide knowledge) ──
      case "Company": {
        const r = await prisma.company.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[COMPANY] ${r.name} (${r.domain}). Package: ₹${r.packageMin || "?"}–${r.packageMax || "?"}L. Rounds: ${r.interviewRounds || "?"}. Skills: ${JSON.stringify(r.topSkillsRequired)}.`;
      }
      case "InterviewExperience": {
        const r = await prisma.interviewExperience.findUnique({ where: { id: recordId } });
        if (!r) return null;
        // Anonymized by default
        const author = r.isAnonymous ? `a student (${r.batch}, ${r.branch})` : (r.studentName || `a student (${r.batch})`);
        return `[INTERVIEW] ${author} interviewed at company (${r.outcome}). Tips: ${r.overallTips.substring(0, 500)}`;
      }
      case "PrepQuestion": {
        const r = await prisma.prepQuestion.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[PREP_QUESTION] Round: ${r.round}, Difficulty: ${r.difficulty}. Q: ${r.question.substring(0, 300)}${r.answer ? ` A: ${r.answer.substring(0, 200)}` : ""}`;
      }
      case "TransportRoute": {
        const r = await prisma.transportRoute.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[TRANSPORT_ROUTE] ${r.name} (${r.type}). Stops: ${JSON.stringify(r.stops)}. Days: ${JSON.stringify(r.operatingDays)}.`;
      }
      case "ExpertiseSeed": {
        const r = await prisma.expertiseSeed.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[EXPERTISE] Topic: ${r.topic} (source: ${r.source}, confidence: ${r.confidence}/5). Profile: ${r.profileId.slice(-6)}`;
      }
      case "HelpRequest_open":
      case "HelpRequest_own": {
        const r = await prisma.helpRequest.findUnique({
          where: { id: recordId },
          include: { studySession: true }
        });
        if (!r) return null;
        // For own requests, show full detail. For others', scrub contact info.
        if (r.requesterId === currentUserId || table === "HelpRequest_own") {
          return `[HELP_REQUEST] Your request: "${r.topic}" (${r.status}). ${r.description || ""}${r.studySession ? ` Session: ${r.studySession.status}` : ""}`;
        }
        // Others' open requests — PII-scrubbed
        return `[HELP_REQUEST] Someone needs help with "${r.topic}" (${r.urgency} urgency). ${r.description ? r.description.substring(0, 200) : ""} Request ID: ${r.id.slice(-6)}.`;
      }
      // ── Local Discovery & Campus Knowledge (GLOBAL) ──
      case "CampusService": {
        const r = await prisma.campusService.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[SERVICE] ${r.name} (${r.category}) at ${r.location}. Status: ${r.currentStatus}. Timings: ${JSON.stringify(r.timings)}.`;
      }
      case "ProcessGuide": {
        const r = await prisma.processGuide.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[GUIDE] ${r.title}. Steps: ${JSON.stringify(r.steps)}. Documents: ${JSON.stringify(r.documentsRequired)}. Est. ${r.estimatedDays} days. ${r.tips || ""}`;
      }
      case "LocalPlace": {
        const r = await prisma.localPlace.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[PLACE] ${r.name} (${r.category}). ${r.description}. ${r.distanceMeters ? `${r.distanceMeters}m away.` : ""} ${r.mustTry ? `Must try: ${r.mustTry}` : ""}`;
      }
      case "TripRecommendation": {
        const r = await prisma.tripRecommendation.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[TRIP] ${r.destination} (${r.distanceKm}km, ~₹${r.estimatedCost}). ${r.bestFor}. How: ${r.howToGet.substring(0, 300)}. Highlights: ${JSON.stringify(r.highlights)}.`;
      }
      case "SurvivalTip": {
        const r = await prisma.survivalTip.findUnique({ where: { id: recordId } });
        if (!r) return null;
        return `[TIP] [${r.category}] ${r.title}: ${r.tip.substring(0, 400)}`;
      }
      default:
        console.warn(`Hydration: Unknown table "${table}" for record ${recordId}`);
        return null;
    }
  } catch (err) {
    console.error(`Hydration error for ${table}:${recordId}:`, err);
    return null;
  }
}

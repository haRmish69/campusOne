import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  sendChatMessageWithRetryAndFallback, 
  generateContentWithRetryAndFallback, 
  isRetryableGeminiError, 
  sanitizeError 
} from "@/lib/gemini";
import youtubeSearch from "youtube-search-api";
import { YoutubeTranscript } from "youtube-transcript";
import { getRealEmbedding } from "@/lib/embeddings";
import { dualSearch, SearchResult } from "@/lib/vectorStore";
import { toolDeclarations, executeTool } from "@/lib/chatTools";

// ─── Context Token Budget ────────────────────────────────────────────────
const MAX_CONTEXT_CHARS = 24000; // ~6000 tokens at ~4 chars/token
const TOP_K_PRIVATE = 8;
const TOP_K_GLOBAL = 8;
const DIRECT_INJECT_CAP = 10;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true }
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.chatMessage.deleteMany({
      where: { sessionId, userId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Chat Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  try {
    const body = await req.json();
    const query = body.query || body.question;
    const sessionId = body.sessionId || "default_session";
    const document = body.document as { name?: string; type?: string; base64?: string; text?: string } | undefined;
    const { userId } = await auth();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Save the user's message to the database
    await prisma.chatMessage.create({
      data: { sessionId, userId, role: "user", content: query }
    });

    // ─── FAISS-Based RAG Engine ─────────────────────────────────────────────
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
    const instituteName = profile?.instituteName || "";

    // 1. Generate embedding (NO day-prepend hack — clean query only)
    const queryEmbedding = await getRealEmbedding(query);

    // 2. Dual-Index Semantic Search (private + global)
    const searchResults = dualSearch(queryEmbedding, userId, TOP_K_PRIVATE, TOP_K_GLOBAL);

    // 3. Hydrate: Direct table lookups (no blind IN(...) across all tables)
    const contextParts: string[] = [];
    for (const hit of searchResults) {
      const text = await hydrateRecord(hit, userId);
      if (text) contextParts.push(text);
    }

    // 4. Direct Context Injections (always-on, high-value data)
    // 4a. Today's mess menu
    const todayMenus = await prisma.messMenu.findMany({
      where: { userId, day: { contains: dayName } }
    });
    for (const m of todayMenus) {
      contextParts.unshift(`[MESS_TODAY] ${m.day} ${m.meal}: ${m.items}`);
    }

    // 4b. Active Budget for current month
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
    } else {
      contextParts.unshift(`[BUDGET] The user has NOT set a budget for this month (${currentMonth}). Tell them to go to the Pocket Buddy dashboard to set one up.`);
    }

    // 4c. Active Cab Pools (PII-scrubbed, capped)
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

      // 4d. Active Transport Updates (capped)
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

    // 4e. AI Campus Brain — Student Uploaded College Documents & Notes
    const userNotes = await prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    for (const n of userNotes) {
      contextParts.unshift(
        `[COLLEGE_DOCUMENT / NOTE] "${n.title}" (${n.subject}): ${n.content.substring(0, 900)}${n.fileName ? ` [File: ${n.fileName}]` : ""}`
      );
    }

    // 4f. AI Campus Brain — Student Weekly Timetable & Class Schedule
    const weeklySchedule = await prisma.classSchedule.findMany({
      where: { userId },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });
    if (weeklySchedule.length > 0) {
      const scheduleLines = weeklySchedule.map(s => `• ${s.day}: ${s.subject} (${s.startTime}–${s.endTime}${s.room ? `, Room: ${s.room}` : ""}${s.faculty ? `, Prof: ${s.faculty}` : ""})`).join("\n");
      contextParts.unshift(`[MY_TIMETABLE]\n${scheduleLines}`);
    }

    // 4g. AI Campus Brain — Upcoming Deadlines & Submissions
    const pendingDeadlines = await prisma.deadline.findMany({
      where: { userId, isComplete: false },
      orderBy: { dueDate: "asc" },
      take: 8,
    });
    if (pendingDeadlines.length > 0) {
      const deadlineLines = pendingDeadlines.map(d => `• ${d.title} (${d.subject}) — Due: ${d.dueDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric" })} [${d.type.toUpperCase()}]`).join("\n");
      contextParts.unshift(`[UPCOMING_DEADLINES]\n${deadlineLines}`);
    }

    // 4h. AI Campus Brain — Academic Calendar Rules & Milestones
    const academicCalendarRef = `[ACADEMIC_CALENDAR] University Academic Calendar (2026-2027):
• Semester Duration: August 1 to December 18
• Mid-Semester Exams: October 12 – October 21
• Diwali / Autumn Break: November 1 – November 7
• End-Semester Practical & Lab Exams: November 24 – November 30
• End-Semester Theory Exams: December 3 – December 18
• Winter Vacation: December 20 – January 10
• Spring Semester Begins: January 11
• Spring Mid-Sem Exams: March 15 – March 24
• Spring End-Sem Exams: May 10 – May 25
• Mandatory Attendance Rule: Minimum 75% attendance required in each course to be eligible for end-semester exams.`;
    contextParts.unshift(academicCalendarRef);

    // 4i. Attached Document (if student uploaded in chat)
    if (document?.text) {
      contextParts.unshift(
        `[ATTACHED_COLLEGE_DOCUMENT: ${document.name || "Document"}]\n${document.text.substring(0, 15000)}`
      );
    }

    // 5. Token Budget Trimming
    let context = contextParts.join("\n\n");
    if (context.length > MAX_CONTEXT_CHARS) {
      context = context.substring(0, MAX_CONTEXT_CHARS) + "\n\n[...context trimmed for length]";
    }

    // 6. System Prompt with guardrails
    const istDateTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const systemInstruction = `You are CampusOne AI Campus Brain — an advanced AI assistant and intelligent academic companion for college students.
Current Date & Time (IST): ${istDateTime}

Your core superpowers include:
1. COLLEGE DOCUMENT UNDERSTANDING: Deeply analyze student-uploaded syllabi, circulars, lecture notes, textbook chapters, and assignment prompts. Extract actionable insights and answer conceptual questions.
2. SMART NOTICE EXTRACTION: When the user shares, pastes, or uploads a notice, circular, or announcement, automatically extract the key information and call 'extract_smart_notice' (or 'add_notice') with title, clean body, category, eventDate, venue, and a crisp actionRequired sentence.
3. ACADEMIC CALENDAR UNDERSTANDING: Answer questions about exam periods (mid-sems, end-sems), semester breaks, holidays, course registration windows, and attendance criteria (minimum 75% rule).
4. TIMETABLE & SCHEDULE INTELLIGENCE: Query the student's weekly class timetable, identify free slots, check professor/room locations, and detect scheduling conflicts.
5. DEADLINE IDENTIFICATION: Identify deadlines, project milestones, and exam dates from syllabi or text and call 'batch_extract_deadlines' (or 'add_deadline') to organize their submission schedule.
6. CONTEXTUAL ANSWERS FROM STUDENT NOTES: Synthesize answers using the student's personal notes and uploaded documents in [COLLEGE_DOCUMENT / NOTE].
7. DATA MODIFICATION TOOLS: Use your specialized tools whenever the user wants to add, update, or modify campus data (deadlines, schedules, mess items, wellness, expenses, documents).

CRITICAL: WHEN THE USER WANTS TO UPDATE, CHANGE, REPLACE, ADD, OR MODIFY ANY DATA — YOU MUST ALWAYS CALL THE APPROPRIATE TOOL. DO NOT say "I don't have that data". The tool will find it in the database.

Context Tag Reference:
[ACADEMIC_CALENDAR] Official university calendar milestones and semester dates
[ATTACHED_COLLEGE_DOCUMENT] Fresh document currently uploaded by the student in this turn
[COLLEGE_DOCUMENT / NOTE] Student's personal study notes and uploaded course documents
[MY_TIMETABLE] Student's full weekly class schedule
[UPCOMING_DEADLINES] Student's pending assignments, exams, and projects
[NOTICE] Campus notices and announcements
[MESS_TODAY] Today's mess menu (always current)
[MESS] Mess menu for other days (from search)
[DEADLINE] Upcoming deadlines and assignments
[CLASS] Class schedule entries
[EXPENSE] Student's personal expense records (PRIVATE — never share with others)
[BUDGET] Student's monthly budget summary (PRIVATE)
[WELLNESS] Student's mood, stress, and sleep logs (PRIVATE — handle with care)
[HELP_REQUEST] Peer learning help requests
[EXPERTISE] Skills and topics peers can help with
[COMPANY] Placement portal company profiles
[INTERVIEW] Interview experiences shared by students
[PREP_QUESTION] Interview preparation questions
[TRANSPORT_ROUTE] Campus bus/shuttle schedules
[TRANSPORT_UPDATE] Live transport alerts and delays
[CAB_POOL] Active cab-sharing opportunities (PII-scrubbed — direct user to in-app join flow)
[SERVICE] Campus services (library, medical, admin offices)
[GUIDE] Step-by-step process guides for campus procedures
[PLACE] Local places near campus (food, ATMs, medical)
[TRIP] Trip recommendations from campus
[TIP] Campus survival tips from seniors

Behavioral Guardrails:
- [WELLNESS]: Treat health data with care. Do NOT diagnose or play therapist. For negative trends, be supportive and gently mention campus counseling resources.
- [EXPENSE] / [BUDGET]: Present factual summaries only. Do NOT frame responses as financial advice.
- [CAB_POOL] / [HELP_REQUEST] (others'): NEVER invent or expose contact details. Direct the user to the in-app action.
- [INTERVIEW] / [COMPANY] / [PREP_QUESTION] / [TRANSPORT_ROUTE] / [SERVICE] / [GUIDE] / [PLACE] / [TRIP] / [TIP]: Freely shareable campus knowledge — no special handling needed.

For QUESTIONS only: Answer from the context below and attached documents. If the context is completely missing the information, say: 'I don't have that information in my campus data.'

User Profile: Name: ${profile?.name || "Student"}, Major: ${profile?.major || "Unknown"}, Year: ${profile?.gradYear || "Unknown"}, College: ${profile?.instituteName || "Unknown"}.

Context:
${context}`;
    // ────────────────────────────────────────────────────────────────────────

    // Define the tool for finding video lectures
    const findVideoLectureTool = {
      name: "find_video_lecture",
      description: "Searches YouTube for a video lecture and finds the exact timestamp explaining a specific concept.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          searchQuery: {
            type: Type.STRING,
            description: "The search query to find the relevant video on YouTube (e.g., 'Dijkstra algorithm tutorial').",
          },
          specificConcept: {
            type: Type.STRING,
            description: "The specific concept to isolate the timestamp for (e.g., 'relaxation step').",
          },
        },
        required: ["searchQuery", "specificConcept"],
      },
    };

    // Define the tool for generating flashcards
    const generateFlashcardsTool = {
      name: "generate_flashcards",
      description:
        "Generates a set of study flashcards for a given topic. Use this when the user asks you to create flashcards, study cards, revision cards, or wants to study/revise a topic using cards. Generate between 5 and 15 high-quality cards covering the key concepts.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: "The subject or topic the flashcards are about (e.g., 'Binary Search Trees', 'Photosynthesis').",
          },
          cards: {
            type: Type.ARRAY,
            description: "An array of flashcard objects.",
            items: {
              type: Type.OBJECT,
              properties: {
                front: {
                  type: Type.STRING,
                  description: "The question, term, or concept on the front of the card.",
                },
                back: {
                  type: Type.STRING,
                  description: "The detailed answer, definition, or explanation on the back of the card.",
                },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["topic", "cards"],
      },
    };

    const rawMessages = await prisma.chatMessage.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: "asc" },
      take: 20
    });

    const history = rawMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || " " }]
    }));

    let messagePayload: any = query;
    if (document?.base64 && (document.type?.startsWith("image/") || document.type === "application/pdf")) {
      messagePayload = [
        {
          inlineData: {
            mimeType: document.type,
            data: document.base64.replace(/^data:[^;]+;base64,/, ""),
          },
        },
        {
          text: query
            ? `${query}\n\n[Attached college document: "${document.name || "Document"}"]`
            : `Analyze this attached college document ("${document.name || "Document"}") and provide key highlights, important dates, and deadlines.`,
        },
      ];
    }

    const response = await sendChatMessageWithRetryAndFallback({
      history,
      message: messagePayload,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              findVideoLectureTool as any,
              generateFlashcardsTool as any,
              ...(toolDeclarations as any[])
            ],
          },
        ],
      },
    });

    let videoPayload = undefined;
    let flashcardPayload = undefined;
    let finalResponseText = response.text || "";

    // Execute all tools concurrently
    if (response.functionCalls && response.functionCalls.length > 0) {
      const responseTexts: string[] = [];

      await Promise.all(
        response.functionCalls.map(async (call: any) => {
          if (call.name === "generate_flashcards") {
            // ─── Flashcard Tool ──────────────────────────────────────────
            const { topic, cards } = call.args as {
              topic: string;
              cards: { front: string; back: string }[];
            };
            console.log(`Generating ${cards.length} flashcards for topic: ${topic}`);

            flashcardPayload = { topic, cards };
            responseTexts.push(`Here are your flashcards on **${topic}**! Click a card to flip it over, and use the arrows to navigate. Happy studying! 🎓`);
          } else if (call.name === "find_video_lecture") {
            // ─── Video Lecture Tool ────────────────────────────
            const { searchQuery, specificConcept } = call.args as any;
            console.log(`Searching YouTube for: ${searchQuery}`);

            try {
              const results = await youtubeSearch.GetListByKeyword(searchQuery, false, 1);
              if (results && results.items && results.items.length > 0) {
                const videoId = results.items[0].id;

                console.log(`Fetching transcript for video: ${videoId}`);
                const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);

                // Slice to first 400 chunks to avoid context limits
                const slicedTranscript = transcriptArray.slice(0, 400);
                const formattedTranscript = slicedTranscript.map((t) => `[${Math.round(t.offset)}]: ${t.text}`).join("\n");

                // Second AI call to find the exact timestamp
                const extractionResponse = await generateContentWithRetryAndFallback({
                  contents: `Given the following transcript from a video, find the exact integer second where the concept "${specificConcept}" is first explained. If it is not found, return 0. Return ONLY the integer value. Do not return any other text.
                  
Transcript:
${formattedTranscript}`,
                });

                const timestampRaw = extractionResponse.text || "0";
                let timestamp = parseInt(timestampRaw.trim(), 10);
                if (isNaN(timestamp)) timestamp = 0;

                console.log(`Concept found at timestamp: ${timestamp}`);

                videoPayload = {
                  videoId,
                  timestamp,
                  url: `https://www.youtube.com/embed/${videoId}?start=${timestamp}&autoplay=1`,
                };

                responseTexts.push(`Here is a video explaining exactly that concept, starting right where you need it!`);
              } else {
                responseTexts.push("I couldn't find a relevant video lecture on YouTube for that concept.");
              }
            } catch (e: any) {
              console.error("YouTube Tool Error:", e);
              if (e.message && e.message.includes("Transcript is disabled")) {
                console.log("Transcript disabled. Returning default video start.");
                const results = await youtubeSearch.GetListByKeyword(searchQuery, false, 1);
                if (results && results.items && results.items.length > 0) {
                  const videoId = results.items[0].id;
                  videoPayload = {
                    videoId,
                    timestamp: 0,
                    url: `https://www.youtube.com/embed/${videoId}?start=0&autoplay=1`,
                  };
                  responseTexts.push("I found a great video tutorial for you, but transcripts are disabled so I couldn't jump to the exact timestamp. You can watch it from the beginning!");
                } else {
                  responseTexts.push("I tried to find a video, but couldn't load it properly.");
                }
              } else {
                responseTexts.push("Sorry, I encountered an error while trying to fetch the video lecture.");
              }
            }
          } else {
            // ─── Campus Modification Tools ───────────────────────────
            try {
              console.log(`🔧 Campus Tool Call: ${call.name}`);
              const toolResult = await executeTool(call.name!, call.args, userId!);
              responseTexts.push(`I have executed your request: ${toolResult}`);
            } catch (err: any) {
              console.error(`Error executing tool ${call.name}:`, err);
              responseTexts.push(`I tried to execute the tool, but ran into an error: ${err.message}`);
            }
          }
        })
      );

      // Dynamically combine the outputs of all tools
      if (responseTexts.length > 0) {
        finalResponseText = responseTexts.join("\n\n");
      }
    }

    // Save the assistant's message to the database
    if (finalResponseText) {
      await prisma.chatMessage.create({
        data: { sessionId, userId, role: "assistant", content: finalResponseText }
      });
    }

    return NextResponse.json({
      role: "ai",
      text: finalResponseText,
      videoPayload,
      flashcardPayload,
    });

  } catch (error: any) {
    console.error("[Chat POST Error]:", sanitizeError(error));
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
      { 
        error: "AI analysis is temporarily unavailable. Please try again in a few moments.",
        canRetry: true
      },
      { status: 500 }
    );
  }
}

// ─── Hydration: Direct table lookup by (table, recordId) ─────────────────
// Copied from /api/query/route.ts — same secure hydration logic.

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
      case "Note": {
        const r = await prisma.note.findUnique({ where: { id: recordId } });
        if (!r || (r.userId && r.userId !== currentUserId)) return null;
        return `[COLLEGE_DOCUMENT / NOTE] ${r.title} (${r.subject}): ${r.content}`;
      }
      // ── PocketBuddy (PRIVATE — strict userId enforcement) ──
      case "Expense": {
        const r = await prisma.expense.findUnique({ where: { id: recordId } });
        if (!r || r.userId !== currentUserId) return null;
        return `[EXPENSE] ${r.category}: ₹${r.amount} on ${r.description} (${r.date.toISOString().split("T")[0]})`;
      }
      case "WellnessLog": {
        const r = await prisma.wellnessLog.findUnique({ where: { id: recordId } });
        if (!r || r.userId !== currentUserId) return null;
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
        if (r.requesterId === currentUserId || table === "HelpRequest_own") {
          return `[HELP_REQUEST] Your request: "${r.topic}" (${r.status}). ${r.description || ""}${r.studySession ? ` Session: ${r.studySession.status}` : ""}`;
        }
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

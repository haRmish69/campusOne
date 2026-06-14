import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, Type } from "@google/genai";
import youtubeSearch from "youtube-search-api";
import { YoutubeTranscript } from "youtube-transcript";
import { searchEverything } from "@/lib/searchEverything";
import { toolDeclarations, executeTool } from "@/lib/chatTools";

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

    // ─── Inject Campus RAG Engine ───────────────────────────────────────────
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
    const instituteName = profile?.instituteName || "";

    const searchResults = await searchEverything(`${dayName} ${query}`, instituteName, userId, 10);

    const TYPE_LABELS: Record<string, string> = {
      notice: "CAMPUS NOTICE", deadline: "DEADLINE", schedule: "CLASS",
      mess: "MESS MENU", expense: "EXPENSE", wellness: "WELLNESS",
      expertise: "PEER EXPERTISE", company: "COMPANY INFO",
      experience: "INTERVIEW EXPERIENCE", prep_question: "INTERVIEW QUESTION",
      transport: "TRANSPORT", service: "CAMPUS SERVICE", guide: "PROCESS GUIDE",
      place: "LOCAL PLACE", trip: "TRIP RECOMMENDATION", tip: "SURVIVAL TIP",
    };
    const contextParts = searchResults.map(r => {
      const label = TYPE_LABELS[r.type] ?? r.type.toUpperCase();
      return `[${label}] ${r.title}: ${r.body}`;
    });
    const context = contextParts.join("\n\n");

    const istDateTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const systemInstruction = `You are CampusFlow, an elite AI campus ecosystem assistant for students.
Current Date & Time (IST): ${istDateTime}

You have THREE capabilities:
1. ANSWER questions using the cross-domain context below.
2. MODIFY campus data using your tools (e.g. adding notices, expenses). The tools search the MySQL database directly.
3. GENERATE flashcards or find video lectures using the provided tools.

CRITICAL: WHEN THE USER WANTS TO UPDATE, CHANGE, REPLACE, ADD, OR MODIFY ANY DATA — YOU MUST ALWAYS CALL THE APPROPRIATE TOOL. DO NOT say "I don't have that data". The tool will find it in the database.

For QUESTIONS: Answer from the cross-domain context below. Connect information across domains when relevant. If missing, say: 'I don't have that information in my campus data.'

User Profile: Major: ${profile?.major || "Unknown"}, Year: ${profile?.gradYear || "Unknown"}, College: ${profile?.instituteName || "Unknown"}.

Cross-domain context (from 16 campus data sources):
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

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history,
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

    const response = await chat.sendMessage({ message: query });

    let videoPayload = undefined;
    let flashcardPayload = undefined;
    let finalResponseText = response.text || "";

    // Execute all tools concurrently
    if (response.functionCalls && response.functionCalls.length > 0) {
      const responseTexts: string[] = [];

      await Promise.all(
        response.functionCalls.map(async (call) => {
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
                const extractionResponse = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
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
    console.error("Chat POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getRealEmbedding } from "@/lib/embeddings";
import { semanticSearch } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { toolDeclarations, executeTool } from "@/lib/chatTools";

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
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

    // 1. Fetch UserProfile Context
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    // 2. Generate Real Embedding via Gemini
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
    // Only prepend day for pure questions, not for update/modify requests
    const queryEmbedding = await getRealEmbedding(`${dayName} ${query}`);

    // 3. FAISS Semantic Search
    const matchedIds = semanticSearch(queryEmbedding, 50);

    // 4. Fetch Actual Records from MySQL
    const [notices, menus, deadlines, classes, notes] = await Promise.all([
      prisma.notice.findMany({ where: { id: { in: matchedIds }, userId } }),
      prisma.messMenu.findMany({ where: { id: { in: matchedIds }, userId } }),
      prisma.deadline.findMany({ where: { id: { in: matchedIds }, userId } }),
      prisma.classSchedule.findMany({ where: { id: { in: matchedIds }, userId } }),
      prisma.note.findMany({ where: { id: { in: matchedIds }, userId } }),
    ]);

    // 5. Build RAG Context
    const contextParts = [
      ...notices.map(n => `[NOTICE] ${n.title}: ${n.body}`),
      ...menus.map(m => `[MESS] ${m.day} ${m.meal}: ${m.items}`),
      ...deadlines.map(d => `[DEADLINE] ${d.title}: ${d.subject} due ${d.dueDate}. ${d.notes}`),
      ...classes.map(c => `[CLASS] ${c.subject}: ${c.day} ${c.startTime}-${c.endTime} at ${c.room}`),
      ...notes.map(n => `[NOTE] ${n.title} (Subject/Folder: ${n.subject}): ${n.content}`)
    ];
    const context = contextParts.join("\n\n");

    // 6. System Prompt with Function Calling Instructions
    const istDateTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const systemInstruction = `You are CampusFlow, an elite AI assistant for students.
Current Date & Time (IST): ${istDateTime}

You have TWO capabilities:
1. ANSWER questions using the FAISS context below.
2. MODIFY campus data using your tools. The tools search the MySQL database directly — they do NOT depend on the FAISS context below. The data EXISTS in the database even if you don't see it in the context.

CRITICAL: WHEN THE USER WANTS TO UPDATE, CHANGE, REPLACE, ADD, OR MODIFY ANY DATA — YOU MUST ALWAYS CALL THE APPROPRIATE TOOL. DO NOT say "I don't have that data". The tool will find it in the database.

Tool usage guidelines:
- update_mess_menu: When user wants to change food items for a specific day+meal. Pass the FULL updated items list (keep unchanged items, replace only what user asked to change). Example: If current items are "TEA WITH BISCUITS" and user says "change tea to coffee", pass newItems="COFFEE WITH BISCUITS".
- update_notice / update_deadline / update_schedule: When user wants to edit existing entries.
- add_notice / add_deadline: When user wants to create new entries.

For QUESTIONS only: Answer from the context below. If missing, say: 'I don't have that information in my campus data.'

User Profile: Major: ${profile?.major || "Unknown"}, Year: ${profile?.gradYear || "Unknown"}, College: ${profile?.instituteName || "Unknown"}.

Context retrieved from FAISS:
${context}`;

    // 7. First Gemini Call — use gemini-2.5-flash (no thinking) for fast tool detection
    console.log("⏳ Starting tool-detection call...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });
    console.log("✅ Tool-detection call complete");

    // 8. Check if Gemini wants to call a function
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart && functionCallPart.functionCall) {
      // Execute the tool
      const toolName = functionCallPart.functionCall.name;
      const toolArgs = functionCallPart.functionCall.args || {};
      
      console.log(`🔧 Tool call: ${toolName}(${JSON.stringify(toolArgs)})`);
      const toolResult = await executeTool(toolName!, toolArgs, userId!);
      console.log(`✅ Tool result: ${toolResult}`);

      // Send the tool result back to Gemini for a natural language confirmation
      const followUp = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: query }] },
          { role: "model", parts: parts },
          { role: "user", parts: [{ functionResponse: { name: toolName!, response: { result: toolResult } } }] },
        ],
        config: {
          systemInstruction: `You are CampusFlow, a friendly AI assistant. The user asked to modify some campus data and the tool has executed. Summarize what was changed in a warm, helpful way. Keep it brief — 1-2 sentences max. Current Date & Time (IST): ${istDateTime}`,
        },
      });

      // Stream the follow-up response
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

    // 9. Normal text response (no tool call) — use the text we already have
    //    If gemini-2.5-flash already gave us text, just return it directly.
    //    Only do a second streaming call with 2.5-flash for richer answers.
    const alreadyHasText = response.text && response.text.trim().length > 0;
    
    let assistantMessage = "";
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (alreadyHasText) {
            // Use the text we already got — no second API call!
            assistantMessage = response.text!;
            controller.enqueue(encoder.encode(response.text!));
          } else {
            // Fallback: stream from 2.5-flash
            const streamResponse = await ai.models.generateContentStream({
              model: "gemini-2.5-flash",
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
    console.error("Query API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { searchAcrossTables } from "@/lib/vectorStore";
import { answerQuestion } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, history, sessionId } = body;

    if (!question || !sessionId) {
      return NextResponse.json({ error: "Missing question or sessionId" }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Save user message to DB
    await prisma.chatMessage.create({
      data: {
        role: "user",
        content: question,
        sessionId,
        userId
      }
    });

    // 2. Embed question
    const queryVector = await embedText(question);

    // 3. Search Vector Store
    const results = await searchAcrossTables(queryVector, userId, 5);

    // 4. Build context
    const contextParts = results.map(r => {
      let tag = "";
      if (r.type === "notice") tag = "[NOTICE]";
      if (r.type === "mess") tag = "[MESS]";
      if (r.type === "deadline") tag = "[DEADLINE]";
      if (r.type === "schedule") tag = "[CLASS SCHEDULE]";
      
      return `${tag} ${r.title}:\n${r.body}`;
    });
    
    const context = contextParts.join("\n\n");

    // 5. Generate response
    const fullResponse = await answerQuestion(question, context, history || []);

    // 6. Save assistant message to DB
    await prisma.chatMessage.create({
      data: {
        role: "assistant",
        content: fullResponse,
        sessionId,
        userId
      }
    });

    // 7. Stream the response to client in small chunks for a typing effect
    const encoder = new TextEncoder();
    const words = fullResponse.split(" ");
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < words.length; i++) {
            const word = (i === 0 ? "" : " ") + words[i];
            controller.enqueue(encoder.encode(word));
            // Small delay for typing effect
            await new Promise(resolve => setTimeout(resolve, 15));
          }
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error: any) {
    console.error("Query Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { searchAcrossTables } from "@/lib/vectorStore";
import { answerQuestionStream } from "@/lib/gemini";
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

    // 5. Generate stream
    const stream = await answerQuestionStream(question, context, history || []);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of stream) {
            const text = chunk.text();
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
          
          // Save assistant message to DB
          await prisma.chatMessage.create({
            data: {
              role: "assistant",
              content: fullResponse,
              sessionId,
              userId
            }
          });
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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { embedText } from "@/lib/embeddings";
import { addToFaissIndex } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let notes;
    if (search) {
      notes = await prisma.note.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: search } },
            { content: { contains: search } },
            { subject: { contains: search } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      notes = await prisma.note.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error("Error in GET /api/notes:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, subject, fileName, fileUrl } = body;

    if (!title || !subject) {
      return NextResponse.json({ error: "Missing required fields (title, subject)" }, { status: 400 });
    }

    // If content is empty (fast-path upload), use title + subject for embedding
    const noteContent = content || `${title} - ${subject}`;

    // Generate embedding for RAG support
    const embeddingText = `[NOTE] ${title} (Subject: ${subject}): ${noteContent}`;
    const embedding = await embedText(noteContent);

    // Save note to database
    const note = await prisma.note.create({
      data: {
        userId,
        title,
        content: noteContent,
        subject,
        fileName: fileName || null,
        fileUrl: fileUrl || null,
        embedding: embedding,
      },
    });

    // Add to local FAISS index for chat RAG context
    await addToFaissIndex(note.id, embeddingText);

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/notes:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

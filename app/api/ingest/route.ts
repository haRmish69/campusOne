import { NextRequest, NextResponse } from "next/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { addToIndex } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// ─── Smart Ingestion Prompt ──────────────────────────────────────────────
// Instead of blindly creating a Notice, the AI first classifies the entity.
// ─────────────────────────────────────────────────────────────────────────
const PROMPT = `You are a campus data classifier. Analyze the following text/image and determine what type of campus entity it is.

Step 1: Decide the entityType. It MUST be one of:
- "deadline" — if the text describes a submission deadline, assignment due date, exam date, or project due date.
- "notice" — if the text is a general announcement, event, placement drive, hostel rule, or informational notice.

Step 2: Extract the fields based on the entityType.

If entityType is "deadline", extract:
- entityType: "deadline"
- title: string (short and descriptive, e.g. "DBMS Project Submission")
- subject: string (the academic subject, e.g. "DBMS", "Operating Systems", "Mathematics")
- dueDate: ISO 8601 string (REQUIRED — the submission/exam date and time)
- type: string (must be one of: "exam", "assignment", "project", "other")
- notes: string or null (any additional details)

If entityType is "notice", extract:
- entityType: "notice"
- title: string (short and descriptive)
- body: string (the full content, formatted nicely)
- category: string (must be exactly one of: placement, exam, event, hostel, general)
- eventDate: ISO 8601 string or null if no date is mentioned
- venue: string or null if no venue is mentioned
- actionRequired: string or null (e.g. 'Register by Friday', 'Bring ID card')

Return ONLY a JSON object. No markdown, no preamble. Just raw JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { type, data, source } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Missing type or data" }, { status: 400 });
    }

    let parsed: any;
    if (type === "image") {
      let base64 = data;
      let mimeType = "image/jpeg";
      
      const match = data.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64 = match[2];
      }
      
      parsed = await parseImageToJSON(base64, mimeType, PROMPT);
    } else if (type === "text") {
      parsed = await parseTextToJSON(data, PROMPT);
    } else {
      return NextResponse.json({ error: "Invalid type. Must be 'image' or 'text'" }, { status: 400 });
    }

    // ─── ROUTE: Deadline ───────────────────────────────────────────────
    if (parsed.entityType === "deadline") {
      const title = parsed.title || "Untitled Deadline";
      const subject = parsed.subject || "General";
      const deadlineType = ["exam", "assignment", "project", "other"].includes(parsed.type?.toLowerCase())
        ? parsed.type.toLowerCase()
        : "other";
      
      let dueDate: Date;
      if (parsed.dueDate) {
        const d = new Date(parsed.dueDate);
        dueDate = isNaN(d.getTime()) ? new Date() : d;
      } else {
        // If AI couldn't extract a date, default to 7 days from now
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
      }

      const notes = parsed.notes || null;
      const embedding = await embedText(`${title} ${subject} ${notes || ""}`);

      const deadline = await prisma.deadline.create({
        data: {
          title,
          subject,
          dueDate,
          type: deadlineType,
          notes,
          embedding,
          userId: userId || null,
        }
      });

      // Add to FAISS index
      await addToIndex(deadline.id, `[DEADLINE] ${title} (${subject}) due ${dueDate.toISOString()}. ${notes || ""}`, "Deadline", userId || null, userId ? "private" : "global");

      return NextResponse.json({ success: true, entityType: "deadline", deadline }, { status: 201 });
    }

    // ─── ROUTE: Notice (default) ───────────────────────────────────────
    const validCategories = ["placement", "exam", "event", "hostel", "general"];
    const category = validCategories.includes(parsed.category?.toLowerCase()) 
      ? parsed.category.toLowerCase() 
      : "general";

    let eventDate: Date | null = null;
    if (parsed.eventDate) {
      const d = new Date(parsed.eventDate);
      if (!isNaN(d.getTime())) {
        eventDate = d;
      }
    }

    const title = parsed.title || "Untitled Notice";
    const bodyText = parsed.body || "No content found.";
    const venue = parsed.venue || null;
    const actionRequired = parsed.actionRequired || null;

    const embedding = await embedText(bodyText);

    const notice = await prisma.notice.create({
      data: {
        title,
        body: bodyText,
        category,
        eventDate,
        venue,
        actionRequired,
        source: source || null,
        embedding: embedding,
        userId: userId || null,
      }
    });

    // Add to FAISS for semantic search
    await addToIndex(notice.id, `[NOTICE] ${title}: ${bodyText}`, "Notice", userId || null, userId ? "private" : "global");

    return NextResponse.json({ success: true, entityType: "notice", notice }, { status: 201 });

  } catch (error: any) {
    console.error("Error in /api/ingest:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

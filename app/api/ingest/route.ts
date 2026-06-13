import { NextRequest, NextResponse } from "next/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { addToFaissIndex } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";

const PROMPT = `Extract the following fields from the notice. Return ONLY a JSON object.
Fields to extract:
- title: string (short and descriptive)
- body: string (the full content, formatted nicely)
- category: string (must be exactly one of: placement, exam, event, hostel, general)
- eventDate: ISO 8601 string or null if no date is mentioned
- venue: string or null if no venue is mentioned
- actionRequired: string or null (e.g. 'Register by Friday', 'Bring ID card')

No markdown, no preamble. Just raw JSON.`;

export async function POST(req: NextRequest) {
  try {
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

    // Validate category
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

    // Fallbacks
    const title = parsed.title || "Untitled Notice";
    const bodyText = parsed.body || "No content found.";
    const venue = parsed.venue || null;
    const actionRequired = parsed.actionRequired || null;

    // Generate embedding
    const embedding = await embedText(bodyText);

    // Save to DB
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
      }
    });

    // Add to FAISS for semantic search
    await addToFaissIndex(notice.id, `[NOTICE] ${title}: ${bodyText}`);

    return NextResponse.json({ success: true, notice }, { status: 201 });

  } catch (error: any) {
    console.error("Error in /api/ingest:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { prisma } from "@/lib/prisma";

const PROMPT = `Extract the following fields for a deadline/assignment from the text. Return ONLY a JSON object.
Fields to extract:
- title (string): Short descriptive title
- subject (string): Course or subject name
- dueDate (string): ISO-8601 formatted datetime string for the deadline. If year is missing, assume the current year. If time is missing, assume 23:59:00.
- type (string): "exam", "assignment", "project", or "other"
- notes (string): Any extra details or instructions. null if none.

If you cannot determine the due date, return null for dueDate.`;

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    if (!type || !data) {
      return NextResponse.json({ error: "Missing type or data" }, { status: 400 });
    }

    let extractedData: any;

    if (type === "image") {
      const mimeType = data.substring(data.indexOf(":") + 1, data.indexOf(";"));
      const base64Data = data.split(",")[1];
      extractedData = await parseImageToJSON(base64Data, mimeType, PROMPT);
    } else if (type === "text") {
      extractedData = await parseTextToJSON(data, PROMPT);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const { title, subject, dueDate, type: deadlineType, notes } = extractedData;
    
    // Parse dueDate string to Date object
    let parsedDate = new Date();
    if (dueDate) {
      const d = new Date(dueDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    } else {
       // fallback to 7 days from now if absolutely unable to parse
       parsedDate.setDate(parsedDate.getDate() + 7);
    }
    
    const embedString = `${subject || "Unknown"} ${title || "Deadline"} due on ${parsedDate.toISOString()}: ${notes || ""}`;
    const embedding = await embedText(embedString);

    const deadline = await prisma.deadline.create({
      data: {
        title: title || "Untitled Deadline",
        subject: subject || "General",
        dueDate: parsedDate,
        type: ["exam", "assignment", "project", "other"].includes(deadlineType) ? deadlineType : "other",
        notes: notes || null,
        embedding,
      }
    });

    return NextResponse.json({ success: true, deadline: { ...deadline, embedding: undefined } });
  } catch (error: any) {
    console.error("Deadline Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

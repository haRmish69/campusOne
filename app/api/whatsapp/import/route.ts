import { NextRequest, NextResponse } from "next/server";
import { parseWhatsAppExport } from "@/lib/whatsappParser";
import { embedText } from "@/lib/embeddings";
import { addToIndex } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";
import { generateContentWithRetryAndFallback, sanitizeError } from "@/lib/gemini";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const { fileContent } = await req.json();
    if (!fileContent) {
      return NextResponse.json({ error: "No file content provided" }, { status: 400 });
    }

    const messages = parseWhatsAppExport(fileContent);
    if (messages.length === 0) {
      return NextResponse.json({ error: "No valid messages found in the export" }, { status: 400 });
    }

    let instituteName = null;
    let major = null;

    if (userId) {
      const profile = await prisma.userProfile.findUnique({
        where: { userId }
      });
      if (profile) {
        instituteName = profile.instituteName;
        major = profile.major;
      }
    }

    const BATCH_SIZE = 20;
    const batches = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      batches.push(messages.slice(i, i + BATCH_SIZE));
    }

    let noticesImported = 0;
    let deadlinesImported = 0;
    let skippedBatches = 0;

    const PROMPT = `Below are timestamped chat messages from a college WhatsApp group.
Identify which messages contain genuine campus announcements, notices, or deadlines.
Ignore casual chat, greetings, and personal conversation.

For each item found, return ONLY a JSON array of objects.

Step 1: Decide the entityType ("deadline" or "notice").
- "deadline" for assignment due dates, exam dates, submissions, projects.
- "notice" for events, placements, general rules, announcements.

Step 2: Extract fields based on entityType.

If "deadline":
- entityType: "deadline"
- title: string (short and descriptive)
- subject: string (academic subject or "General")
- dueDate: ISO 8601 string (REQUIRED)
- type: string (one of: "exam", "assignment", "project", "other")
- notes: string or null
- originalTimestamp: string (ISO timestamp of the message)

If "notice":
- entityType: "notice"
- title: string (short and descriptive)
- body: string (full content)
- category: string (one of: "placement", "exam", "event", "hostel", "general")
- eventDate: ISO 8601 string or null
- venue: string or null
- actionRequired: string or null
- originalTimestamp: string (ISO timestamp of the message)

Messages to analyze:
`;

    // Process each batch sequentially to avoid concurrent rate limits on the free tier
    for (const batch of batches) {
      try {
        const batchText = batch.map(m => `[${m.timestamp?.toISOString()}] ${m.sender}: ${m.message}`).join("\n\n");
        
        const response = await generateContentWithRetryAndFallback({
          contents: PROMPT + batchText,
          config: {
            temperature: 0.2,
          }
        });

        let text = response.text || "[]";
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const extractedItems = JSON.parse(text);
        
        if (Array.isArray(extractedItems)) {
          for (const item of extractedItems) {
            
            if (item.entityType === "deadline") {
              const title = item.title || "Untitled Deadline";
              const existing = await prisma.deadline.findFirst({
                where: { userId, title }
              });

              if (!existing) {
                const dueDate = item.dueDate ? new Date(item.dueDate) : new Date();
                const notes = item.notes || null;
                const subject = item.subject || "General";
                const type = ["exam", "assignment", "project", "other"].includes(item.type?.toLowerCase()) ? item.type.toLowerCase() : "other";
                const embedding = await embedText(`${title} ${subject} ${notes || ""}`);

                const deadline = await prisma.deadline.create({
                  data: {
                    userId,
                    title,
                    subject,
                    dueDate,
                    type,
                    notes,
                    embedding,
                    instituteName,
                    major,
                    createdAt: item.originalTimestamp ? new Date(item.originalTimestamp) : new Date()
                  }
                });

                await addToIndex(deadline.id, `[DEADLINE] ${title} (${subject}) due ${dueDate.toISOString()}. ${notes || ""}`, "Deadline", userId || null, userId ? "private" : "global");
                deadlinesImported++;
              }
            } else {
              // Assume notice
              const title = item.title || "Untitled Notice";
              const existing = await prisma.notice.findFirst({
                where: { userId, title, source: "whatsapp" }
              });

              if (!existing) {
                const body = item.body || "No content";
                const category = ["placement", "exam", "event", "hostel", "general"].includes(item.category?.toLowerCase()) ? item.category.toLowerCase() : "general";
                const embedding = await embedText(body);

                const notice = await prisma.notice.create({
                  data: {
                    userId,
                    title,
                    body,
                    category,
                    eventDate: item.eventDate ? new Date(item.eventDate) : null,
                    venue: item.venue || null,
                    actionRequired: item.actionRequired || null,
                    source: "whatsapp",
                    embedding,
                    instituteName,
                    major,
                    createdAt: item.originalTimestamp ? new Date(item.originalTimestamp) : new Date()
                  }
                });

                await addToIndex(notice.id, `[NOTICE] ${title}: ${body}`, "Notice", userId || null, userId ? "private" : "global");
                noticesImported++;
              }
            }
          }
        }
        
        // Wait between batches to be nice to the experimental server
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (err) {
        console.error("Batch processing failed:", err);
        skippedBatches++;
      }
    }

    return NextResponse.json({
      totalMessages: messages.length,
      scannedBatches: batches.length,
      noticesImported,
      deadlinesImported,
      skippedBatches
    });

  } catch (error: any) {
    console.error("WhatsApp Import Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process import" }, { status: 500 });
  }
}

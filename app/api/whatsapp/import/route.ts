import { NextRequest, NextResponse } from "next/server";
import { parseWhatsAppExport } from "@/lib/whatsappParser";
import { embedText } from "@/lib/embeddings";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = "gemini-2.5-flash-lite"; // same experimental model we switched to

// Helper for batched API calls with retries
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      if (
        error.status === 429 || 
        error.status === 503 ||
        error.status === 500 ||
        error.message?.includes("429") ||
        error.message?.includes("503") ||
        error.message?.includes("high demand")
      ) {
        if (attempt === maxRetries) throw error;
        const baseDelay = error.status === 503 ? 3000 : 2000;
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`API overloaded/rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export async function POST(req: NextRequest) {
  try {
    const { fileContent } = await req.json();
    if (!fileContent) {
      return NextResponse.json({ error: "No file content provided" }, { status: 400 });
    }

    const messages = parseWhatsAppExport(fileContent);
    if (messages.length === 0) {
      return NextResponse.json({ error: "No valid messages found in the export" }, { status: 400 });
    }

    const BATCH_SIZE = 20;
    const batches = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      batches.push(messages.slice(i, i + BATCH_SIZE));
    }

    let noticesImported = 0;
    let skippedBatches = 0;

    const PROMPT = `Below are timestamped chat messages from a college WhatsApp group.
Identify which messages are genuine campus notices (placements, exams, events, hostel rules, general announcements).
Ignore casual chat, greetings, and personal conversation.
For each notice found, return ONLY a JSON array of objects with the following fields:
- title (string): A short, clear title for the notice
- body (string): The full content of the notice
- category (string): Must be exactly one of: "placement", "exam", "event", "hostel", "general"
- eventDate (string or null): ISO 8601 date string if a specific date/deadline is mentioned, otherwise null
- venue (string or null): Location if mentioned, otherwise null
- actionRequired (string or null): Short required action if any, otherwise null
- originalTimestamp (string): The ISO timestamp of the original message provided

Messages to analyze:
`;

    // Process each batch sequentially to avoid concurrent rate limits on the free tier
    for (const batch of batches) {
      try {
        const batchText = batch.map(m => `[${m.timestamp?.toISOString()}] ${m.sender}: ${m.message}`).join("\n\n");
        
        const response = await withRetry(() => ai.models.generateContent({
          model: MODEL,
          contents: PROMPT + batchText,
          config: {
            temperature: 0.2,
          }
        }));

        let text = response.text || "[]";
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const extractedNotices = JSON.parse(text);
        
        if (Array.isArray(extractedNotices)) {
          for (const noticeData of extractedNotices) {
            // Deduplication check: Do we already have a notice with this exact title and body?
            const existing = await prisma.notice.findFirst({
              where: {
                title: noticeData.title,
                body: noticeData.body,
                source: "whatsapp"
              }
            });

            if (!existing) {
              const embedding = await embedText(noticeData.body);
              await prisma.notice.create({
                data: {
                  title: noticeData.title,
                  body: noticeData.body,
                  category: noticeData.category || "general",
                  eventDate: noticeData.eventDate ? new Date(noticeData.eventDate) : null,
                  venue: noticeData.venue || null,
                  actionRequired: noticeData.actionRequired || null,
                  source: "whatsapp",
                  embedding,
                  createdAt: noticeData.originalTimestamp ? new Date(noticeData.originalTimestamp) : new Date()
                }
              });
              noticesImported++;
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
      skippedBatches
    });

  } catch (error: any) {
    console.error("WhatsApp Import Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process import" }, { status: 500 });
  }
}

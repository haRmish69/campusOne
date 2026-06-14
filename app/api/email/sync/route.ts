import { NextRequest, NextResponse } from "next/server";
import { fetchEmailsSince } from "@/lib/gmail";
import { embedText } from "@/lib/embeddings";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

import { auth } from "@clerk/nextjs/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = "gemini-2.5-flash";

// Helper for retries
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
    const { userId } = await auth();
    const label = process.env.GMAIL_LABEL || "CampusFlow";
    let emails = [];
    
    try {
      // Pass null to fetch the last 7 days (default behavior of fetchEmailsSince for new users)
      emails = await fetchEmailsSince(null, 10); 
    } catch (err: any) {
      if (err.message === "Email sync not configured") {
        return NextResponse.json({ error: "Email sync not configured" }, { status: 400 });
      }
      throw err;
    }

    if (emails.length === 0) {
      return NextResponse.json({ message: "No new emails found", imported: 0 });
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

    // Keyword filtering locally before hitting AI
    const keywords = ["exam", "placement", "notice", "deadline", "hostel", "event", "fest", "result", "urgent"];
    
    const relevantEmails = emails.filter(email => {
      const combined = (email.subject + " " + email.body).toLowerCase();
      return keywords.some(kw => combined.includes(kw));
    });

    if (relevantEmails.length === 0) {
      return NextResponse.json({ message: "No relevant notices found in recent emails", imported: 0 });
    }

    let noticesImported = 0;

    const PROMPT = `Extract a campus notice from the following email.
Ignore email signatures, casual greetings, or unrelated text.
Return ONLY a JSON array of objects (usually one, unless the email contains multiple notices) with these fields:
- title (string): A short, clear title
- body (string): The main content of the notice
- category (string): Must be exactly one of: "placement", "exam", "event", "hostel", "general"
- eventDate (string or null): ISO 8601 date string if a specific date/deadline is mentioned, otherwise null
- venue (string or null): Location if mentioned, otherwise null
- actionRequired (string or null): Short required action if any, otherwise null

Email Subject: `;

    for (const email of relevantEmails) {
      try {
        const fullPrompt = PROMPT + email.subject + "\n\nEmail Body:\n" + email.body;
        
        const response = await withRetry(() => ai.models.generateContent({
          model: MODEL,
          contents: fullPrompt,
          config: { temperature: 0.2 }
        }));

        let text = response.text || "[]";
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const extractedNotices = JSON.parse(text);
        
        if (Array.isArray(extractedNotices)) {
          for (const noticeData of extractedNotices) {
            // Deduplication
            const existing = await prisma.notice.findFirst({
              where: {
                userId,
                title: noticeData.title,
                source: "email"
              }
            });

            if (!existing) {
              const embedding = await embedText(noticeData.body);
              await prisma.notice.create({
                data: {
                  userId,
                  title: noticeData.title,
                  body: noticeData.body,
                  category: noticeData.category || "general",
                  eventDate: noticeData.eventDate ? new Date(noticeData.eventDate) : null,
                  venue: noticeData.venue || null,
                  actionRequired: noticeData.actionRequired || null,
                  source: "email",
                  embedding,
                  instituteName,
                  major,
                  createdAt: email.receivedAt
                }
              });
              noticesImported++;
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error("Failed to parse email into notice:", email.subject, err);
      }
    }

    return NextResponse.json({
      totalEmails: emails.length,
      relevantEmails: relevantEmails.length,
      imported: noticesImported
    });

  } catch (error: any) {
    console.error("Email Sync Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync emails" }, { status: 500 });
  }
}

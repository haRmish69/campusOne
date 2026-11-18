import { NextRequest, NextResponse } from "next/server";
import { fetchEmailsSince } from "@/lib/gmail";
import { embedText } from "@/lib/embeddings";
import { addToIndex } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";
import { generateContentWithRetryAndFallback, sanitizeError } from "@/lib/gemini";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const label = process.env.GMAIL_LABEL || "CampusOne";
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
      return NextResponse.json({ message: "No new emails found", imported: 0, deadlines: 0 });
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
    const keywords = ["exam", "placement", "notice", "deadline", "hostel", "event", "fest", "result", "urgent", "submit", "project", "assignment"];
    
    const relevantEmails = emails.filter(email => {
      const combined = (email.subject + " " + email.body).toLowerCase();
      return keywords.some(kw => combined.includes(kw));
    });

    if (relevantEmails.length === 0) {
      return NextResponse.json({ message: "No relevant notices or deadlines found in recent emails", imported: 0, deadlines: 0 });
    }

    let noticesImported = 0;
    let deadlinesImported = 0;

    const PROMPT = `Analyze the following email to determine if it is a campus notice or an academic deadline.
Ignore email signatures, casual greetings, or unrelated text.

For each item found, return ONLY a JSON array of objects (usually one, unless the email contains multiple).

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

If "notice":
- entityType: "notice"
- title: string (short and descriptive)
- body: string (full content)
- category: string (one of: "placement", "exam", "event", "hostel", "general")
- eventDate: ISO 8601 string or null
- venue: string or null
- actionRequired: string or null

Email Subject: `;

    for (const email of relevantEmails) {
      try {
        const fullPrompt = PROMPT + email.subject + "\n\nEmail Body:\n" + email.body;
        
        const response = await generateContentWithRetryAndFallback({
          contents: fullPrompt,
          config: { temperature: 0.2 }
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
                    createdAt: email.receivedAt
                  }
                });

                await addToIndex(deadline.id, `[DEADLINE] ${title} (${subject}) due ${dueDate.toISOString()}. ${notes || ""}`, "Deadline", userId || null, userId ? "private" : "global");
                deadlinesImported++;
              }

            } else {
              // Assume notice
              const title = item.title || "Untitled Notice";
              const existing = await prisma.notice.findFirst({
                where: { userId, title, source: "email" }
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
                    source: "email",
                    embedding,
                    instituteName,
                    major,
                    createdAt: email.receivedAt
                  }
                });

                await addToIndex(notice.id, `[NOTICE] ${title}: ${body}`, "Notice", userId || null, userId ? "private" : "global");
                noticesImported++;
              }
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error("Failed to parse email into notice/deadline:", email.subject, err);
      }
    }

    return NextResponse.json({
      totalEmails: emails.length,
      relevantEmails: relevantEmails.length,
      imported: noticesImported,
      deadlines: deadlinesImported
    });

  } catch (error: any) {
    console.error("Email Sync Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync emails" }, { status: 500 });
  }
}

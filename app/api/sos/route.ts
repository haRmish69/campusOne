import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = "gemini-2.5-flash";

// Reuse the withRetry wrapper logic here
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
        const delay = 2000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Log SOS usage as a severe wellness event
    if (userId) {
      await prisma.wellnessLog.create({
        data: {
          mood: 1,
          stressLevel: 5,
          sleepHours: null,
          notes: "Triggered SOS / Overwhelmed Mode.",
        }
      });
    }

    const now = new Date();
    // Look 14 days ahead
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const deadlines = await prisma.deadline.findMany({
      where: { 
        isComplete: false,
        dueDate: { gte: now, lte: twoWeeks },
        OR: [{ userId }, { userId: null }]
      },
      select: { id: true, title: true, subject: true, dueDate: true, type: true }
    });

    if (deadlines.length === 0) {
      return NextResponse.json({
        critical: [],
        reschedule: [],
        message: "You have no upcoming deadlines in the next two weeks. Take a break! Do something you love."
      });
    }

    const prompt = `The student is feeling severely overwhelmed and triggered an SOS panic button.
They have the following upcoming deadlines over the next 14 days:
${JSON.stringify(deadlines)}

Your job is to be a calming, practical AI assistant. You need to take the mental load off them by strictly categorizing these tasks.
1. "critical": Pick a maximum of 2 tasks that absolutely MUST be done today/tomorrow (e.g. exams tomorrow, assignments due in 24h).
2. "reschedule": Put all other tasks here. They can wait until the user has recovered.
3. "message": Write a highly empathetic, calming 2-sentence message acknowledging they are overwhelmed and giving them permission to focus ONLY on the critical tasks and ignore the rest for now.

Return strictly JSON:
{
  "critical": ["id1", "id2"],
  "reschedule": ["id3", "id4"],
  "message": "string"
}
No markdown formatting.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    }));

    let rawText = response.text ?? "";
    rawText = rawText.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse SOS JSON:", rawText);
      parsed = { critical: [], reschedule: deadlines.map(d => d.id), message: "Just breathe. Everything can wait. Focus on taking care of yourself right now." };
    }

    // Map IDs back to objects for the frontend
    const criticalTasks = deadlines.filter(d => parsed.critical?.includes(d.id));
    const rescheduleTasks = deadlines.filter(d => parsed.reschedule?.includes(d.id));

    // Fallback if the AI failed to map them
    if (criticalTasks.length === 0 && rescheduleTasks.length === 0 && deadlines.length > 0) {
      rescheduleTasks.push(...deadlines);
    }

    return NextResponse.json({
      critical: criticalTasks,
      reschedule: rescheduleTasks,
      message: parsed.message || "Take a deep breath. Focus only on the absolute essentials.",
    });

  } catch (error) {
    console.error("SOS Mode error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

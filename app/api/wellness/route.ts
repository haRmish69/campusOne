import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { addToFaissIndex } from "@/lib/vectorStore";

import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { mood, sleepHours, stressLevel, notes, date } = body;

    if (mood == null || sleepHours == null || stressLevel == null) {
      return NextResponse.json({ error: "Missing required fields (mood, sleepHours, stressLevel)" }, { status: 400 });
    }

    let embedding = null;
    if (notes && notes.trim().length > 0) {
      embedding = await embedText(`[WELLNESS] ${notes}`);
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

    const logDate = date ? new Date(date) : new Date();

    const log = await prisma.wellnessLog.create({
      data: {
        date: logDate,
        userId,
        mood: parseInt(mood),
        sleepHours: parseFloat(sleepHours),
        stressLevel: parseInt(stressLevel),
        notes: notes || null,
        embedding: embedding ? JSON.stringify(embedding) : undefined,
        instituteName,
        major,
      },
    });

    // Add to FAISS for semantic search
    await addToFaissIndex(log.id, `[WELLNESS] Mood: ${mood}/5, Stress: ${stressLevel}/5, Sleep: ${sleepHours}h. Notes: ${notes || "none"}`);

    // Invalidate today's cached Wellness Insight so the score updates dynamically 
    // after the user answers the briefing questions.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (userId) {
      await prisma.wellnessInsight.deleteMany({
        where: {
          userId,
          date: { gte: todayStart }
        }
      });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Failed to create wellness log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);
    
    // Set to start of day 14 days ago
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await prisma.wellnessLog.findMany({
      where: {
        userId,
        date: { gte: fourteenDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    // Remove the embedding field from the response to save bandwidth
    const safeLogs = logs.map(l => {
      const { embedding, ...rest } = l;
      return rest;
    });

    return NextResponse.json(safeLogs);
  } catch (error) {
    console.error("Failed to fetch wellness logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

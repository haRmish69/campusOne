import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile || !profile.instituteName) {
      return NextResponse.json({ 
        message: "We need your institute name to show the Campus Pulse.", 
        requiresOnboarding: true 
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Aggregate data first (anonymized at DB level)
    const stats = await prisma.wellnessLog.aggregate({
      where: {
        instituteName: profile.instituteName,
        date: { gte: sevenDaysAgo }
      },
      _avg: {
        mood: true,
        stressLevel: true,
      },
      _count: {
        id: true,
      }
    });

    if (stats._count.id === 0) {
      return NextResponse.json({
        pulse: `Not enough data for ${profile.instituteName} this week. Be the first to log your wellness!`,
        avgMood: 0,
        avgStress: 0,
        count: 0
      });
    }

    // Optional: fetch a few recent *anonymized* notes to give Gemini context. 
    // We strictly select ONLY the notes and major, NO user IDs.
    const recentLogs = await prisma.wellnessLog.findMany({
      where: {
        instituteName: profile.instituteName,
        date: { gte: sevenDaysAgo },
        notes: { not: null }
      },
      select: {
        notes: true,
        major: true,
        mood: true,
        stressLevel: true
      },
      take: 10,
      orderBy: { date: 'desc' }
    });

    const avgMood = stats._avg.mood ? stats._avg.mood.toFixed(1) : 0;
    const avgStress = stats._avg.stressLevel ? stats._avg.stressLevel.toFixed(1) : 0;

    const prompt = `You are the "Campus Pulse" AI for ${profile.instituteName}.
    Based on anonymized wellness logs from the last 7 days:
    - Average Mood: ${avgMood}/5 (1=Terrible, 5=Great)
    - Average Stress: ${avgStress}/5 (1=Chill, 5=Overwhelmed)
    - Total Logs: ${stats._count.id}
    
    Here is a sample of anonymous student notes:
    ${recentLogs.map(l => `- Major: ${l.major || "Unknown"}, Mood: ${l.mood}, Stress: ${l.stressLevel}, Note: "${l.notes}"`).join("\n")}
    
    Write a 2-3 sentence engaging "Campus Pulse" message summarizing the vibe on campus. Be empathetic. Mention if certain majors seem stressed. Do NOT mention specific users or raw data.`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: { temperature: 0.5 }
    });

    const pulseMessage = response.text?.trim() || "The campus vibe is neutral right now.";

    return NextResponse.json({
      pulse: pulseMessage,
      avgMood: stats._avg.mood,
      avgStress: stats._avg.stressLevel,
      count: stats._count.id
    });

  } catch (error) {
    console.error("Campus Pulse Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

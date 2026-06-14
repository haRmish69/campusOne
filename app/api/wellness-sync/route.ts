import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const body = await req.json();
    const text: string = body.text;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    let userId = body.userId;
    if (!userId) {
      const authResult = await auth();
      userId = authResult.userId;
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── 1. Extract structured wellness data using strict JSON mode ─────
    const extractionResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract wellness data from this user message. The user was asked about their sleep, mood (1-10), and stress level (1-10). Parse their natural language response into structured data.

If the user did not mention a specific value, use these defaults:
- mood: 5 (neutral)
- sleepHours: 7 (average)
- stressLevel: 5 (neutral)
- notes: summarize what they said in 1 sentence

User message: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as any,
          properties: {
            mood: {
              type: "number" as any,
              description: "Mood score from 1-10 (10 is best)",
            },
            sleepHours: {
              type: "number" as any,
              description: "Hours of sleep as a number",
            },
            stressLevel: {
              type: "number" as any,
              description: "Stress level from 1-10 (10 is most stressed)",
            },
            notes: {
              type: "string" as any,
              description: "Brief summary of the user's wellness message",
            },
          },
          required: ["mood", "sleepHours", "stressLevel", "notes"],
        },
      },
    });

    const rawJson = extractionResponse.text || "{}";
    console.log("🧠 Wellness extraction raw:", rawJson);

    let parsed: { mood: number; sleepHours: number; stressLevel: number; notes: string };

    try {
      parsed = JSON.parse(rawJson);
    } catch {
      console.error("Failed to parse wellness JSON:", rawJson);
      parsed = { mood: 5, sleepHours: 7, stressLevel: 5, notes: text.slice(0, 200) };
    }

    // Clamp values to valid ranges
    const mood = Math.max(1, Math.min(10, Math.round(parsed.mood || 5)));
    const stressLevel = Math.max(1, Math.min(10, Math.round(parsed.stressLevel || 5)));
    const sleepHours = Math.max(0, Math.min(24, parsed.sleepHours || 7));
    const notes = parsed.notes || text.slice(0, 200);

    // ─── 2. Save to database ────────────────────────────────────────────
    const wellnessLog = await prisma.wellnessLog.create({
      data: {
        userId,
        mood,
        sleepHours,
        stressLevel,
        notes,
      },
    });

    console.log(`✅ WellnessLog saved: id=${wellnessLog.id}, mood=${mood}, stress=${stressLevel}, sleep=${sleepHours}h`);

    // ─── 3. Generate empathetic confirmation ────────────────────────────
    const confirmationResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user just shared their wellness check-in. Here's what I extracted:
- Mood: ${mood}/10
- Sleep: ${sleepHours} hours
- Stress: ${stressLevel}/10
- Notes: ${notes}

Generate a short, warm, empathetic response (2-3 sentences max) acknowledging their state. If they seem stressed, offer encouragement. If they slept poorly, suggest rest. If they're doing great, celebrate that. Be genuine, not robotic.`,
      config: {
        systemInstruction: "You are CampusFlow, a caring AI campus mentor. Be warm, brief, and genuine. Use 1-2 relevant emojis.",
      },
    });

    const confirmationText = confirmationResponse.text || `Got it! I've logged your wellness check-in. Mood: ${mood}/10, Stress: ${stressLevel}/10, Sleep: ${sleepHours}h. Take care! 💙`;

    return NextResponse.json({
      response: confirmationText,
      logged: { mood, sleepHours, stressLevel, notes },
    });

  } catch (error: any) {
    console.error("Wellness Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

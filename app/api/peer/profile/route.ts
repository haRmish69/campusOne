import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { upsertExpertise, seedFromSchedule } from "@/lib/expertiseEngine";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, branch, instituteName, year, whatsappNumber, contactOptIn, selectedTopics } = body;

    // Validation
    if (!name || typeof name !== "string" || name.length > 100) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!branch || typeof branch !== "string") {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    }
    if (!instituteName || typeof instituteName !== "string") {
      return NextResponse.json({ error: "Invalid instituteName" }, { status: 400 });
    }
    if (typeof year !== "number" || year < 1 || year > 5) {
      return NextResponse.json({ error: "Invalid year. Must be 1-5." }, { status: 400 });
    }

    if (whatsappNumber && !/^\+?[0-9]{10,15}$/.test(whatsappNumber)) {
      return NextResponse.json({ error: "Invalid WhatsApp number format" }, { status: 400 });
    }

    if (!Array.isArray(selectedTopics) || selectedTopics.length > 5) {
      return NextResponse.json({ error: "Invalid topics list. Max 5 allowed." }, { status: 400 });
    }
    
    for (const topic of selectedTopics) {
      if (typeof topic !== "string" || topic.length > 100) {
        return NextResponse.json({ error: "Invalid topic name length" }, { status: 400 });
      }
    }

    const finalContactOptIn = whatsappNumber ? Boolean(contactOptIn) : false;

    // Actions
    // 1. Create or update UserProfile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        name,
        branch,
        major: branch, // Map branch to existing major field
        instituteName,
        year,
        gradYear: new Date().getFullYear() + (4 - year), // Rough mapping
        whatsappNumber,
        contactOptIn: finalContactOptIn,
        onboardingDone: true,
        profileComplete: true
      },
      create: {
        userId,
        name,
        branch,
        major: branch,
        instituteName,
        year,
        gradYear: new Date().getFullYear() + (4 - year),
        whatsappNumber,
        contactOptIn: finalContactOptIn,
        onboardingDone: true,
        profileComplete: true
      }
    });

    // 2. For each selectedTopic: upsertExpertise(profile.id, topic, "onboarding")
    // Wait, expertise engine expects profileId as the Clerk userId!
    for (const topic of selectedTopics) {
      await upsertExpertise(userId, topic, "onboarding");
    }

    // 3. seedFromSchedule(profile.id) — fire and forget
    seedFromSchedule(userId).catch(err => console.error("Schedule Seed error:", err));

    return NextResponse.json({ profile });

  } catch (error) {
    console.error("POST /api/peer/profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { findCandidatesForRequest, createMatchesAndNotify } from "@/lib/peerMatcher";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { topic, description, isAnonymous = true } = body;

    if (!topic || typeof topic !== "string" || topic.length > 200) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }

    if (description && (typeof description !== "string" || description.length > 1000)) {
      return NextResponse.json({ error: "Invalid description" }, { status: 400 });
    }

    // Validation: Profile must exist
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check active request cap
    const activeRequests = await prisma.learningRequest.count({
      where: {
        requesterId: userId,
        status: "open"
      }
    });

    if (activeRequests >= 3) {
      return NextResponse.json(
        { error: "You have 3 active open requests. Close one before posting a new one." },
        { status: 429 }
      );
    }

    // Actions
    const combinedText = `${topic} ${description ?? ""}`;
    const embedding = await embedText(combinedText);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const request = await prisma.learningRequest.create({
      data: {
        requesterId: userId,
        topic,
        description,
        isAnonymous,
        status: "open",
        embedding: JSON.stringify(embedding),
        expiresAt
      }
    });

    try {
      const candidates = await findCandidatesForRequest(request, userId, 5);

      if (candidates.length === 0) {
        await prisma.peerNotification.create({
          data: {
            profileId: userId,
            type: "new_request",
            referenceId: request.id,
            message: "No matches found yet — we'll notify you when someone joins."
          }
        });
      } else {
        await createMatchesAndNotify(request, candidates);
      }

      return NextResponse.json({ request, matchCount: candidates.length });
    } catch (matchError) {
      console.error("Matching error:", matchError);
      // Best effort matching — still return the request
      return NextResponse.json({ request, matchCount: 0 });
    }

  } catch (error) {
    console.error("POST /api/peer/request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

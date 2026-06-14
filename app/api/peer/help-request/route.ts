import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { embedText } from "@/lib/embeddings";
import { broadcastHelpRequest } from "@/lib/peerBroadcaster";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { topic, description, isAnonymous } = body;

    if (!topic || topic.trim().length < 3 || topic.trim().length > 200) {
      return NextResponse.json({ error: "Topic must be 3-200 characters" }, { status: 400 });
    }

    // Look up UserProfile
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Cap: max 3 open requests
    const openCount = await prisma.helpRequest.count({
      where: { requesterId: profile.id, status: { in: ["open", "selecting"] } },
    });
    if (openCount >= 3) {
      return NextResponse.json(
        { error: "You already have 3 open requests. Complete or cancel one first." },
        { status: 429 }
      );
    }

    // Duplicate check: same topic in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await prisma.helpRequest.findFirst({
      where: {
        requesterId: profile.id,
        topic: topic.trim(),
        createdAt: { gte: oneDayAgo },
        status: { notIn: ["cancelled", "expired"] },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "You already have an open request for this topic" },
        { status: 409 }
      );
    }

    // Auto-detect urgency from deadlines
    let urgency = "low";
    const twoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const fiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const urgentDeadline = await prisma.deadline.findFirst({
      where: {
        userId,
        title: { contains: topic.trim().split(" ")[0] },
        dueDate: { lte: twoDays },
      },
    });
    if (urgentDeadline) {
      urgency = "high";
    } else {
      const normalDeadline = await prisma.deadline.findFirst({
        where: {
          userId,
          title: { contains: topic.trim().split(" ")[0] },
          dueDate: { lte: fiveDays },
        },
      });
      if (normalDeadline) urgency = "normal";
    }

    // Generate embedding
    const embedding = await embedText(topic.trim() + " " + (description ?? ""));

    // Create help request
    const request = await prisma.helpRequest.create({
      data: {
        requesterId: profile.id,
        topic: topic.trim(),
        description: description?.trim() || null,
        isAnonymous: isAnonymous ?? false,
        urgency,
        embedding: JSON.stringify(embedding),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    // Increment totalRequested
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { totalRequested: { increment: 1 } },
    });

    // Broadcast to matching peers
    const broadcast = await broadcastHelpRequest(request, profile.id);

    return NextResponse.json({
      request,
      notifiedCount: broadcast.notified,
      urgency,
      message:
        broadcast.notified > 0
          ? `We notified ${broadcast.notified} students who know this topic.`
          : "No matches found yet — your request is open for 48 hours.",
    });
  } catch (error: any) {
    console.error("POST /api/peer/help-request error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const requests = await prisma.helpRequest.findMany({
      where: { requesterId: profile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, topic: true, description: true, urgency: true,
        isAnonymous: true, status: true, expiresAt: true, createdAt: true,
      },
    });

    // Attach volunteer counts
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const volunteerCount = await prisma.helpVolunteer.count({
          where: { requestId: r.id, status: "volunteered" },
        });
        return { ...r, volunteerCount };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("GET /api/peer/help-request error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

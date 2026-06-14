import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { updateResponseRate } from "@/lib/reputationEngine";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { requestId, message } = body;

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }
    if (message && message.length > 200) {
      return NextResponse.json({ error: "Message must be ≤ 200 characters" }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const request = await prisma.helpRequest.findUnique({ where: { id: requestId } });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (!["open", "selecting"].includes(request.status)) {
      return NextResponse.json({ error: "Request is no longer accepting volunteers" }, { status: 409 });
    }
    if (request.requesterId === profile.id) {
      return NextResponse.json({ error: "You can't volunteer on your own request" }, { status: 400 });
    }

    // Check if already volunteered
    const existing = await prisma.helpVolunteer.findUnique({
      where: { requestId_helperId: { requestId, helperId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "You've already volunteered for this request" }, { status: 409 });
    }

    // Create volunteer entry
    await prisma.helpVolunteer.create({
      data: {
        requestId,
        helperId: profile.id,
        status: "volunteered",
        message: message?.trim() || null,
        respondedAt: new Date(),
      },
    });

    // Update response rate
    await updateResponseRate(profile.id);

    // Notify requester (rate-limited: check if they got a notification in last 30 mins)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentNotification = await prisma.peerNotification.findFirst({
      where: {
        profileId: request.requesterId,
        type: "volunteer_list_ready",
        referenceId: requestId,
        createdAt: { gte: thirtyMinsAgo },
      },
    });

    if (!recentNotification) {
      const volunteerCount = await prisma.helpVolunteer.count({
        where: { requestId, status: "volunteered" },
      });
      await prisma.peerNotification.create({
        data: {
          profileId: request.requesterId,
          type: "volunteer_list_ready",
          referenceId: requestId,
          message: `${volunteerCount} student${volunteerCount > 1 ? "s" : ""} volunteered to help with "${request.topic}". Check the volunteer list!`,
          actionUrl: `/peer-learning/request/${requestId}/volunteers`,
        },
      });
    }

    return NextResponse.json({ message: "You've volunteered! The student will be in touch." });
  } catch (error: any) {
    console.error("POST /api/peer/volunteer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

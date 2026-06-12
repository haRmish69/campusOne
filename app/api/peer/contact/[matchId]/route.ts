import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId } = await params;
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");

    if (userId !== profileId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const match = await prisma.learningMatch.findUnique({
      where: { id: matchId }
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (profileId !== match.requesterId && profileId !== match.helperId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (match.status !== "accepted") {
      return NextResponse.json({ error: "Contact is only revealed when both parties accept" }, { status: 403 });
    }

    const requesterProfile = await prisma.userProfile.findUnique({ where: { userId: match.requesterId } });
    const helperProfile = await prisma.userProfile.findUnique({ where: { userId: match.helperId } });

    if (!requesterProfile || !helperProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const isRequester = profileId === match.requesterId;
    const otherProfile = isRequester ? helperProfile : requesterProfile;

    if (!requesterProfile.contactOptIn || !helperProfile.contactOptIn) {
      return NextResponse.json({
        contactRevealed: false,
        reason: "The other student has not opted in to share contact"
      });
    }

    const request = await prisma.learningRequest.findUnique({ where: { id: match.requestId } });

    return NextResponse.json({
      contactRevealed: true,
      otherName: otherProfile.name || "A peer",
      whatsappNumber: otherProfile.whatsappNumber,
      topic: request?.topic || "a topic"
    });

  } catch (error) {
    console.error("GET /api/peer/contact:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

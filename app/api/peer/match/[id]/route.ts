import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { upsertExpertise } from "@/lib/expertiseEngine";
import { findCandidatesForRequest, createMatchesAndNotify } from "@/lib/peerMatcher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (!["accept", "decline", "busy"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const match = await prisma.learningMatch.findUnique({
      where: { id }
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (userId !== match.helperId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (match.status !== "pending") {
      return NextResponse.json({ error: "This match is no longer pending" }, { status: 409 });
    }

    const request = await prisma.learningRequest.findUnique({
      where: { id: match.requestId }
    });

    if (!request) {
      return NextResponse.json({ error: "Original request not found" }, { status: 404 });
    }

    let updatedMatch;

    if (action === "accept") {
      updatedMatch = await prisma.learningMatch.update({
        where: { id },
        data: {
          helperAccepted: true,
          status: "accepted",
          respondedAt: new Date()
        }
      });

      upsertExpertise(match.helperId, request.topic, "accepted_request")
        .catch(err => console.error("Expertise update error:", err));

      const helperProfile = await prisma.userProfile.findUnique({ where: { userId: match.helperId } });
      const requesterProfile = await prisma.userProfile.findUnique({ where: { userId: match.requesterId } });

      const helperName = helperProfile?.name || "A peer";
      const requesterName = request.isAnonymous ? "A peer" : (requesterProfile?.name || "A student");

      await prisma.peerNotification.create({
        data: {
          profileId: match.requesterId,
          type: "match_accepted",
          referenceId: match.id,
          message: request.isAnonymous
            ? `A peer accepted your request to learn ${request.topic}!`
            : `${helperName} accepted your request to learn ${request.topic}!`
        }
      });

      if (helperProfile?.contactOptIn && requesterProfile?.contactOptIn) {
        await prisma.peerNotification.createMany({
          data: [
            {
              profileId: match.requesterId,
              type: "contact_revealed",
              referenceId: match.id,
              message: `Contact details are now shared for ${request.topic}.`
            },
            {
              profileId: match.helperId,
              type: "contact_revealed",
              referenceId: match.id,
              message: `Contact details are now shared for ${request.topic}.`
            }
          ]
        });
      } else {
        await prisma.peerNotification.create({
          data: {
            profileId: match.requesterId,
            type: "contact_revealed",
            referenceId: match.id,
            message: "Match accepted! Enable contact sharing in your profile to exchange WhatsApp."
          }
        });
      }

      if (request.status === "open") {
        await prisma.learningRequest.update({
          where: { id: request.id },
          data: { status: "matched" }
        });
      }

    } else if (action === "decline") {
      updatedMatch = await prisma.learningMatch.update({
        where: { id },
        data: {
          status: "declined",
          respondedAt: new Date()
        }
      });

      await prisma.peerNotification.create({
        data: {
          profileId: match.requesterId,
          type: "match_declined",
          referenceId: match.id,
          message: `A peer couldn't help with ${request.topic} — looking for others.`
        }
      });

      const newCandidates = await findCandidatesForRequest(request, match.requesterId, 1);
      if (newCandidates.length > 0) {
        await createMatchesAndNotify(request, newCandidates);
      }

    } else if (action === "busy") {
      updatedMatch = await prisma.learningMatch.update({
        where: { id },
        data: {
          status: "declined", // Treated as decline
          respondedAt: new Date()
        }
      });

      upsertExpertise(match.helperId, request.topic, "busy_tap")
        .catch(err => console.error("Expertise update error:", err));

      const newCandidates = await findCandidatesForRequest(request, match.requesterId, 1);
      if (newCandidates.length > 0) {
        await createMatchesAndNotify(request, newCandidates);
      }
    }

    return NextResponse.json({ match: updatedMatch });

  } catch (error) {
    console.error(`PATCH /api/peer/match Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

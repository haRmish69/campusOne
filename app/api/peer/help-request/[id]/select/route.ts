import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { proposeStudySlots } from "@/lib/scheduleNegotiator";
import { upsertExpertise } from "@/lib/expertiseEngine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { volunteerId } = body;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const request = await prisma.helpRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.requesterId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!["open", "selecting"].includes(request.status)) {
      return NextResponse.json({ error: "Request already matched" }, { status: 409 });
    }

    const volunteer = await prisma.helpVolunteer.findUnique({ where: { id: volunteerId } });
    if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
    if (volunteer.status !== "volunteered") {
      return NextResponse.json({ error: "Volunteer no longer available" }, { status: 409 });
    }

    // Propose study slots
    const slots = await proposeStudySlots(
      request.requesterId,
      volunteer.helperId,
      request.topic,
      request.urgency
    );

    // Transaction: select volunteer, mark others, create session
    const session = await prisma.$transaction(async (tx) => {
      // Mark selected
      await tx.helpVolunteer.update({
        where: { id: volunteerId },
        data: { status: "selected" },
      });

      // Mark all others as not_selected
      await tx.helpVolunteer.updateMany({
        where: { requestId: id, id: { not: volunteerId } },
        data: { status: "not_selected" },
      });

      // Update request status
      await tx.helpRequest.update({
        where: { id },
        data: { status: "matched" },
      });

      // Create study session
      const newSession = await tx.studySession.create({
        data: {
          requestId: id,
          requesterId: request.requesterId,
          helperId: volunteer.helperId,
          topic: request.topic,
          status: "pending_schedule",
          proposedSlots: JSON.stringify(slots),
        },
      });

      // Notify selected helper
      const requesterName = profile.name || "A student";
      await tx.peerNotification.create({
        data: {
          profileId: volunteer.helperId,
          type: "you_were_selected",
          referenceId: newSession.id,
          message: `${requesterName} chose you to help with "${request.topic}". Review the proposed study times.`,
          actionUrl: `/peer-learning/session/${newSession.id}`,
        },
      });

      // Notify non-selected volunteers
      const otherVolunteers = await tx.helpVolunteer.findMany({
        where: { requestId: id, id: { not: volunteerId }, status: "not_selected" },
      });
      for (const other of otherVolunteers) {
        await tx.peerNotification.create({
          data: {
            profileId: other.helperId,
            type: "request_cancelled",
            referenceId: id,
            message: `The student found help for "${request.topic}". Thanks for volunteering!`,
          },
        });
      }

      return newSession;
    });

    // Upsert expertise for the helper (outside transaction — non-critical)
    await upsertExpertise(volunteer.helperId, request.topic, "accepted_request");

    return NextResponse.json({ session, proposedSlots: slots });
  } catch (error: any) {
    console.error("POST select error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — withdraw request
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const request = await prisma.helpRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.requesterId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (request.status === "completed") {
      return NextResponse.json({ error: "Cannot cancel a completed request" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.helpRequest.update({ where: { id }, data: { status: "cancelled" } });

      // Cancel any linked session
      const session = await tx.studySession.findUnique({ where: { requestId: id } });
      if (session && session.status !== "completed") {
        await tx.studySession.update({ where: { id: session.id }, data: { status: "cancelled" } });
      }

      // Notify all volunteers
      const volunteers = await tx.helpVolunteer.findMany({
        where: { requestId: id, status: { in: ["volunteered", "selected"] } },
      });
      for (const vol of volunteers) {
        const msg = vol.status === "selected" 
           ? `The student cancelled the session. Your reputation is not affected.` 
           : `The request for "${request.topic}" was withdrawn.`;
        await tx.peerNotification.create({
          data: {
            profileId: vol.helperId,
            type: "request_cancelled",
            referenceId: id,
            message: msg,
          },
        });
      }
    });

    return NextResponse.json({ message: "Request cancelled" });
  } catch (error: any) {
    console.error("DELETE help-request error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { confirmSlotAgreement } from "@/lib/scheduleNegotiator";
import { computeReputationScore, updateResponseRate } from "@/lib/reputationEngine";
import { upsertExpertise } from "@/lib/expertiseEngine";

// PATCH — choose slot or complete session or helper rate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action } = body; // "choose-slot" | "complete" | "helper-rate"

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // ── Choose Slot ──
    if (action === "choose-slot") {
      const { slotIndex } = body;
      if (![0, 1, 2].includes(slotIndex)) {
        return NextResponse.json({ error: "slotIndex must be 0, 1, or 2" }, { status: 400 });
      }
      if (session.status !== "pending_schedule") {
        return NextResponse.json({ error: "Session is not in scheduling phase" }, { status: 409 });
      }
      if (profile.id !== session.requesterId && profile.id !== session.helperId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const isRequester = profile.id === session.requesterId;
      await prisma.studySession.update({
        where: { id },
        data: isRequester
          ? { requesterSlotChoice: slotIndex }
          : { helperSlotChoice: slotIndex },
      });

      // Notify the other party
      const otherProfileId = isRequester ? session.helperId : session.requesterId;
      const responderName = profile.name || "Your partner";
      await prisma.peerNotification.create({
        data: {
          profileId: otherProfileId,
          type: "slots_proposed",
          referenceId: id,
          message: `${responderName} chose a time slot for your "${session.topic}" session. Pick your preferred slot to confirm.`,
          actionUrl: `/peer-learning/session/${id}`,
        },
      });

      // Check for agreement
      const agreed = await confirmSlotAgreement(id);
      const updatedSession = await prisma.studySession.findUnique({ where: { id } });

      return NextResponse.json({
        agreed,
        agreedSlot: agreed ? updatedSession?.agreedSlot : null,
        message: agreed
          ? "Session confirmed! Contact details are now shared."
          : "Your choice recorded. Waiting for the other person.",
      });
    }

    // ── Complete Session ──
    if (action === "complete") {
      const { rating, review } = body;
      if (profile.id !== session.requesterId) {
        return NextResponse.json({ error: "Only the requester can mark complete" }, { status: 403 });
      }
      if (session.status !== "confirmed") {
        return NextResponse.json({ error: "Session is not confirmed yet" }, { status: 409 });
      }
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.studySession.update({
          where: { id },
          data: {
            status: "completed",
            completedAt: new Date(),
            requesterRating: rating,
            requesterReview: review?.trim() || null,
          },
        });

        // Update helper stats
        await tx.userProfile.update({
          where: { id: session.helperId },
          data: { totalHelped: { increment: 1 } },
        });

        // Recompute avgRating for helper
        const allRatings = await tx.studySession.findMany({
          where: { helperId: session.helperId, requesterRating: { not: null } },
          select: { requesterRating: true },
        });
        const avg =
          allRatings.reduce((sum, r) => sum + (r.requesterRating || 0), 0) /
          allRatings.length;

        await tx.userProfile.update({
          where: { id: session.helperId },
          data: { avgRating: parseFloat(avg.toFixed(2)) },
        });

        // Update help request status
        await tx.helpRequest.update({
          where: { id: session.requestId },
          data: { status: "completed" },
        });
      });

      // Non-critical: recompute reputation and expertise
      await computeReputationScore(session.helperId);
      await upsertExpertise(session.helperId, session.topic, "session_completed");
      await updateResponseRate(session.helperId);

      // Notify helper
      const requesterName = profile.name || "The student";
      await prisma.peerNotification.create({
        data: {
          profileId: session.helperId,
          type: "rate_your_session",
          referenceId: id,
          message: `${requesterName} marked the "${session.topic}" session complete and left a ${rating}⭐ rating. How was your experience?`,
          actionUrl: `/peer-learning/session/${id}`,
        },
      });

      return NextResponse.json({ message: "Session marked complete. Thank you!" });
    }

    // ── Helper Rate ──
    if (action === "helper-rate") {
      const { rating, review } = body;
      if (profile.id !== session.helperId) {
        return NextResponse.json({ error: "Only the helper can rate" }, { status: 403 });
      }
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
      }

      await prisma.studySession.update({
        where: { id },
        data: {
          helperRating: rating,
          helperReview: review?.trim() || null,
        },
      });

      return NextResponse.json({ message: "Rating submitted!" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — fetch session details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (profile.id !== session.requesterId && profile.id !== session.helperId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch both profiles
    const requesterProfile = await prisma.userProfile.findUnique({
      where: { id: session.requesterId },
      select: { id: true, name: true, branch: true, year: true, whatsappNumber: true },
    });
    const helperProfile = await prisma.userProfile.findUnique({
      where: { id: session.helperId },
      select: { id: true, name: true, branch: true, year: true, whatsappNumber: true },
    });

    // Only share contact details if contactShared is true
    const response: any = {
      ...session,
      proposedSlots: typeof session.proposedSlots === "string"
        ? JSON.parse(session.proposedSlots)
        : session.proposedSlots,
      agreedSlot: session.agreedSlot
        ? typeof session.agreedSlot === "string"
          ? JSON.parse(session.agreedSlot as string)
          : session.agreedSlot
        : null,
      requester: requesterProfile
        ? {
            id: requesterProfile.id,
            name: requesterProfile.name,
            branch: requesterProfile.branch,
            year: requesterProfile.year,
            whatsappNumber: session.contactShared ? requesterProfile.whatsappNumber : null,
          }
        : null,
      helper: helperProfile
        ? {
            id: helperProfile.id,
            name: helperProfile.name,
            branch: helperProfile.branch,
            year: helperProfile.year,
            whatsappNumber: session.contactShared ? helperProfile.whatsappNumber : null,
          }
        : null,
      isRequester: profile.id === session.requesterId,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("GET session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

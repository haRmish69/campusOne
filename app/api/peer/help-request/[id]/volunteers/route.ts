import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { rankVolunteers } from "@/lib/reputationEngine";

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

    const request = await prisma.helpRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.requesterId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!["open", "selecting"].includes(request.status)) {
      return NextResponse.json({ error: "Request is no longer accepting volunteers" }, { status: 400 });
    }

    const volunteers = await rankVolunteers(id, request.topic);

    // Transition to "selecting" if first time viewing with volunteers
    if (request.status === "open" && volunteers.length > 0) {
      await prisma.helpRequest.update({
        where: { id },
        data: { status: "selecting" },
      });
    }

    return NextResponse.json({ volunteers, requestStatus: request.status });
  } catch (error: any) {
    console.error("GET volunteers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

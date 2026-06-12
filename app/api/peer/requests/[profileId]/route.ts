import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId } = await params;
    if (userId !== profileId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.learningRequest.findMany({
      where: { requesterId: profileId },
      orderBy: { createdAt: "desc" }
    });

    const requestsWithCounts = await Promise.all(
      requests.map(async (request) => {
        const matches = await prisma.learningMatch.findMany({
          where: { requestId: request.id },
          select: { status: true }
        });

        const matchCount = matches.length;
        const acceptedCount = matches.filter(m => m.status === "accepted").length;

        return {
          ...request,
          matchCount,
          acceptedCount
        };
      })
    );

    return NextResponse.json(requestsWithCounts);

  } catch (error) {
    console.error("GET /api/peer/requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

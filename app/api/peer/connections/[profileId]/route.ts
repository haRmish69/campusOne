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

    const connections = await prisma.learningMatch.findMany({
      where: {
        status: "accepted",
        OR: [
          { requesterId: profileId },
          { helperId: profileId }
        ]
      },
      orderBy: { respondedAt: "desc" }
    });

    const result = await Promise.all(
      connections.map(async (match) => {
        const isRequester = match.requesterId === profileId;
        const otherUserId = isRequester ? match.helperId : match.requesterId;
        
        const [otherProfile, request] = await Promise.all([
          prisma.userProfile.findUnique({ where: { userId: otherUserId } }),
          prisma.learningRequest.findUnique({ where: { id: match.requestId } })
        ]);

        return {
          id: match.id,
          topic: request?.topic || "Unknown Topic",
          otherName: otherProfile?.name || "A peer",
          connectedAt: match.respondedAt || match.createdAt
        };
      })
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error("GET /api/peer/connections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const incomingMatches = await prisma.learningMatch.findMany({
      where: {
        helperId: profileId,
        status: "pending"
      },
      orderBy: { createdAt: "desc" }
    });

    const result = await Promise.all(
      incomingMatches.map(async (match) => {
        const request = await prisma.learningRequest.findUnique({
          where: { 
            id: match.requestId,
            expiresAt: { gt: new Date() } // exclude expired requests
          }
        });

        if (!request) return null;

        return {
          match,
          request: {
            id: request.id,
            topic: request.topic,
            description: request.description,
            createdAt: request.createdAt,
            // Only include requesterId if NOT anonymous
            requesterId: request.isAnonymous ? undefined : request.requesterId
          }
        };
      })
    );

    return NextResponse.json(result.filter(r => r !== null));

  } catch (error) {
    console.error("GET /api/peer/incoming:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

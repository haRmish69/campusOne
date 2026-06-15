import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Fetch all open requests from the SAME institute, excluding our own requests.
    const openRequests = await prisma.helpRequest.findMany({
      where: {
        status: "open",
        requesterId: { not: profile.id },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // We need the requester profiles. Let's fetch them manually to be safe.
    const requesterIds = Array.from(new Set(openRequests.map((r) => r.requesterId)));
    const requesters = await prisma.userProfile.findMany({
      where: { 
        id: { in: requesterIds },
        instituteName: profile.instituteName 
      }
    });

    const requesterMap = new Map(requesters.map((r) => [r.id, r]));

    // Map to mock "Notification" format so the UI doesn't need to be fully rewritten.
    const results = openRequests
      .filter((r) => requesterMap.has(r.requesterId)) // Only keep requests from the same institute
      .map((req) => {
        const reqProfile = requesterMap.get(req.requesterId)!;
        
        const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
        const getSuffix = (n: number) => suffixes[n] || "th";

        const urgencyPrefix = req.urgency === "high" ? "🚨 Urgent: " : "";
        
        const requesterDisplay = req.isAnonymous
          ? `A ${reqProfile.year || "?"}${getSuffix(reqProfile.year || 0)}-year ${reqProfile.branch || ""} student`
          : reqProfile.name || "A student";

        const descSnippet = req.description
          ? ` "${req.description.slice(0, 80)}${req.description.length > 80 ? "..." : ""}"`
          : "";

        const message = `${urgencyPrefix}${requesterDisplay} needs help with "${req.topic}".${descSnippet} Can you help?`;

        return {
          id: req.id,
          type: "help_needed",
          referenceId: req.id,
          message,
          actionUrl: `/peer-learning?tab=help&requestId=${req.id}`,
          isRead: false,
          createdAt: req.createdAt.toISOString(),
        };
      });

    const response = NextResponse.json(results);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error: any) {
    console.error("GET /api/peer/campus-requests error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

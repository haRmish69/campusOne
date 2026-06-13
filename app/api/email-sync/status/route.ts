import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json(
      { error: "profileId required" },
      { status: 400 }
    );
  }

  const logs = await prisma.emailSyncLog.findMany({
    where: { profileId },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: {
      id: true,
      triggeredBy: true,
      startedAt: true,
      completedAt: true,
      status: true,
      emailsFound: true,
      emailsProcessed: true,
      emailsSkipped: true,
      noticesCreated: true,
      deadlinesCreated: true,
      schedulesUpdated: true,
      errorMessage: true,
      // DO NOT return extractionLog to the client — contains email subjects
    },
  });

  return NextResponse.json({ logs });
}

import { NextRequest, NextResponse } from "next/server";
import { runEmailSync } from "@/lib/emailSync";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { profileId } = await req.json();

    if (!profileId || typeof profileId !== "string") {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400 }
      );
    }

    // Validate profile exists
    const profile = await prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { id: true, emailSyncEnabled: true },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }
    if (!profile.emailSyncEnabled) {
      return NextResponse.json(
        {
          error:
            "Email sync is not enabled for this profile. Enable it in Settings.",
        },
        { status: 403 }
      );
    }

    // Check if a sync is already running (prevent concurrent syncs)
    const runningSyncs = await prisma.emailSyncLog.count({
      where: { profileId, status: "running" },
    });
    if (runningSyncs > 0) {
      return NextResponse.json(
        { error: "A sync is already in progress. Please wait." },
        { status: 409 }
      );
    }

    const result = await runEmailSync(profileId, "manual_api");

    return NextResponse.json(
      { result },
      { status: result.success ? 200 : 500 }
    );
  } catch (error: unknown) {
    console.error("[POST /api/email-sync]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

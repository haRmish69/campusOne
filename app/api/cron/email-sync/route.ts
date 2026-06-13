import { NextRequest, NextResponse } from "next/server";
import { runEmailSync } from "@/lib/emailSync";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Verify this is called by the cron system, not a random HTTP request
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[Cron] CRON_SECRET is not set — cron endpoint is unprotected!"
    );
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all profiles with emailSyncEnabled=true
  const profiles = await prisma.userProfile.findMany({
    where: { emailSyncEnabled: true },
    select: { id: true },
  });

  if (profiles.length === 0) {
    return NextResponse.json({
      message: "No profiles with email sync enabled",
    });
  }

  // Process profiles sequentially — never in parallel for cron
  // Parallel would hammer Gemini rate limits
  const results = [];
  for (const profile of profiles) {
    try {
      const result = await runEmailSync(profile.id, "cron");
      results.push({ profileId: profile.id, ...result });
    } catch (error) {
      results.push({
        profileId: profile.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // 2-second gap between profiles to respect Gemini rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return NextResponse.json({ processed: profiles.length, results });
}

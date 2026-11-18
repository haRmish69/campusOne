import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { savedAt: "desc" },
    });

    const applications = await prisma.jobApplication.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      savedJobs,
      applications,
    });
  } catch (error: any) {
    console.error("GET Saved Jobs Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve saved jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, jobId, status, notes } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // ─── 1. Save Job ────────────────────────────────────────────────────────
    if (action === "save-job") {
      const saved = await prisma.savedJob.upsert({
        where: {
          userId_jobId: { userId, jobId },
        },
        update: { notes: notes || undefined },
        create: { userId, jobId, notes },
      });
      return NextResponse.json({ success: true, saved, message: "Job saved to your tracker" });
    }

    // ─── 2. Unsave Job ──────────────────────────────────────────────────────
    if (action === "unsave-job") {
      await prisma.savedJob.deleteMany({
        where: { userId, jobId },
      });
      return NextResponse.json({ success: true, message: "Job removed from saved list" });
    }

    // ─── 3. Update Application Tracking Status ─────────────────────────────
    // Status: "saved" | "applied" | "interviewing" | "offered" | "rejected"
    if (action === "update-status") {
      const validStatuses = ["saved", "applied", "interviewing", "offered", "rejected"];
      const targetStatus = validStatuses.includes(status) ? status : "applied";

      const appRecord = await prisma.jobApplication.upsert({
        where: {
          userId_jobId: { userId, jobId },
        },
        update: {
          status: targetStatus,
          notes: notes !== undefined ? notes : undefined,
          updatedAt: new Date(),
        },
        create: {
          userId,
          jobId,
          status: targetStatus,
          notes: notes || null,
        },
      });

      return NextResponse.json({
        success: true,
        application: appRecord,
        message: `Application marked as ${targetStatus}`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST Saved Jobs Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update job tracking" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Secure the Endpoint
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET is not configured.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Time-Window Querying
    const now = new Date();
    // 2 hours from now
    const windowStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    // 2 hours + 15 minutes from now
    const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000);

    const notificationsToCreate: any[] = [];

    // --- A. Process Deadlines ---
    const upcomingDeadlines = await prisma.deadline.findMany({
      where: {
        isComplete: false,
        dueDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    for (const deadline of upcomingDeadlines) {
      if (!deadline.userId) continue;
      notificationsToCreate.push({
        userId: deadline.userId,
        type: "deadline",
        referenceId: deadline.id,
        message: `Reminder: Deadline for "${deadline.title}" is in 2 hours!`,
      });
    }

    // --- B. Process Cab Pools (Travel Pools) ---
    const upcomingCabPools = await prisma.cabPoolRequest.findMany({
      where: {
        status: { in: ["open", "full"] },
        departureTime: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    for (const pool of upcomingCabPools) {
      // Collect all valid participants
      const participants = typeof pool.participants === "string" 
        ? JSON.parse(pool.participants) 
        : (Array.isArray(pool.participants) ? pool.participants : []);

      // Make sure we uniquely notify everyone
      const usersToNotify = new Set<string>([pool.initiatorId, ...participants]);

      for (const userId of Array.from(usersToNotify)) {
        if (!userId) continue;
        notificationsToCreate.push({
          userId: userId,
          type: "cab_pool",
          referenceId: pool.id,
          message: `Reminder: Your travel pool to ${pool.destination} departs in 2 hours!`,
        });
      }
    }

    // --- C. Process Class Schedules ---
    // Classes recur weekly. We determine the target day and time in UTC to match the DB format.
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const targetDay = days[windowStart.getUTCDay()];

    const startHH = windowStart.getUTCHours().toString().padStart(2, '0');
    const startMM = windowStart.getUTCMinutes().toString().padStart(2, '0');
    const startTimeStr = `${startHH}:${startMM}`;

    const endHH = windowEnd.getUTCHours().toString().padStart(2, '0');
    const endMM = windowEnd.getUTCMinutes().toString().padStart(2, '0');
    const endTimeStr = `${endHH}:${endMM}`;

    // Note: If the 15-minute window crosses midnight UTC, endTimeStr will be smaller than startTimeStr.
    // For a robust system, we handle the wraparound conditionally, but for this demo window (15m) we'll just 
    // handle the standard case where they are usually within the same day.
    let upcomingClasses = [];
    if (startTimeStr <= endTimeStr) {
      upcomingClasses = await prisma.classSchedule.findMany({
        where: {
          day: targetDay,
          startTime: {
            gte: startTimeStr,
            lte: endTimeStr,
          },
        },
      });
    } else {
      // Midnight wraparound case (e.g., 23:55 to 00:10)
      const classesBeforeMidnight = await prisma.classSchedule.findMany({
        where: { day: targetDay, startTime: { gte: startTimeStr } },
      });
      // The day for the end window has technically advanced by 1
      const nextDay = days[(windowStart.getUTCDay() + 1) % 7];
      const classesAfterMidnight = await prisma.classSchedule.findMany({
        where: { day: nextDay, startTime: { lte: endTimeStr } },
      });
      upcomingClasses = [...classesBeforeMidnight, ...classesAfterMidnight];
    }

    for (const cls of upcomingClasses) {
      if (!cls.userId) continue;
      // Because classes recur, we use a composite reference ID (classId + date) to ensure idempotency *per week*.
      const dateString = windowStart.toISOString().split('T')[0];
      const weeklyRefId = `${cls.id}_${dateString}`;
      
      notificationsToCreate.push({
        userId: cls.userId,
        type: "class",
        referenceId: weeklyRefId,
        message: `Reminder: Your class "${cls.subject}" starts in 2 hours at ${cls.room || "TBA"}.`,
      });
    }

    // 3 & 4. Notification Generation with Idempotency
    // We use createMany with skipDuplicates: true so if the cron runs twice, it silently ignores duplicates.
    let createdCount = 0;
    if (notificationsToCreate.length > 0) {
      const result = await prisma.notification.createMany({
        data: notificationsToCreate,
        skipDuplicates: true,
      });
      createdCount = result.count;
    }

    return NextResponse.json({
      message: "Cron executed successfully",
      processed: {
        deadlines: upcomingDeadlines.length,
        cabPools: upcomingCabPools.length,
        classes: upcomingClasses.length,
      },
      notificationsCreated: createdCount,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    });

  } catch (error: any) {
    console.error("Cron notification error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

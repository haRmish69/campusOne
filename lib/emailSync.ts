import { prisma } from "@/lib/prisma";
import { fetchEmailsSince } from "@/lib/gmail";
import {
  classifyPrivacy,
  extractEntity,
  ExtractedScheduleUpdate,
} from "@/lib/emailClassifier";
import { embedText } from "@/lib/embeddings";

export type SyncResult = {
  success: boolean;
  syncLogId: string;
  emailsFound: number;
  emailsProcessed: number;
  emailsSkipped: number;
  noticesCreated: number;
  deadlinesCreated: number;
  schedulesUpdated: number;
  errorMessage?: string;
  durationMs: number;
};

export async function runEmailSync(
  profileId: string,
  triggeredBy: "cron" | "chat" | "manual_api"
): Promise<SyncResult> {
  const startTime = Date.now();

  // Create sync log entry immediately — this is running state
  const syncLog = await prisma.emailSyncLog.create({
    data: {
      profileId,
      triggeredBy,
      status: "running",
    },
  });

  // Helper to finalize the log — always called, even on failure
  async function finalizeLog(
    status: string,
    counts: {
      emailsFound?: number;
      emailsProcessed?: number;
      emailsSkipped?: number;
      noticesCreated?: number;
      deadlinesCreated?: number;
      schedulesUpdated?: number;
    },
    extractionLogData: unknown[],
    errorMessage?: string
  ) {
    try {
      await prisma.emailSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status,
          completedAt: new Date(),
          ...counts,
          extractionLog: extractionLogData,
          errorMessage,
        },
      });
    } catch (e) {
      console.error("[Sync] Failed to finalize sync log:", e);
    }
  }

  const extractionLog: unknown[] = [];
  let emailsFound = 0;
  let emailsProcessed = 0;
  let emailsSkipped = 0;
  let noticesCreated = 0;
  let deadlinesCreated = 0;
  let schedulesUpdated = 0;

  try {
    // ── Step 1: Get last sync timestamp ──
    const profile = await prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { lastEmailSync: true, userId: true },
    });
    if (!profile) {
      await finalizeLog("failed", {}, [], "ProfileId not found");
      return {
        success: false,
        syncLogId: syncLog.id,
        emailsFound: 0,
        emailsProcessed: 0,
        emailsSkipped: 0,
        noticesCreated: 0,
        deadlinesCreated: 0,
        schedulesUpdated: 0,
        errorMessage: "ProfileId not found",
        durationMs: Date.now() - startTime,
      };
    }

    // ── Step 2: Fetch emails from Gmail ──
    // fetchEmailsSince handles the 7-day fallback for null lastEmailSync
    const emails = await fetchEmailsSince(profile.lastEmailSync, 30);
    emailsFound = emails.length;

    if (emails.length === 0) {
      await prisma.userProfile.update({
        where: { id: profileId },
        data: { lastEmailSync: new Date() },
      });
      await finalizeLog("completed", { emailsFound: 0 }, []);
      return {
        success: true,
        syncLogId: syncLog.id,
        emailsFound: 0,
        emailsProcessed: 0,
        emailsSkipped: 0,
        noticesCreated: 0,
        deadlinesCreated: 0,
        schedulesUpdated: 0,
        durationMs: Date.now() - startTime,
      };
    }

    // ── Step 3: Deduplicate against ProcessedEmail table ──
    const existingIds = await prisma.processedEmail.findMany({
      where: {
        gmailId: { in: emails.map((e) => e.gmailId) },
      },
      select: { gmailId: true },
    });
    const processedSet = new Set(existingIds.map((r) => r.gmailId));
    const newEmails = emails.filter((e) => !processedSet.has(e.gmailId));
    emailsSkipped += emails.length - newEmails.length;

    // ── Step 4: Process each email through the two-gate pipeline ──
    // Process SEQUENTIALLY to avoid Gemini rate limits
    for (const email of newEmails) {
      const logEntry: Record<string, unknown> = {
        gmailId: email.gmailId,
        subject: email.subject,
        from: email.from,
        receivedAt: email.receivedAt,
      };

      try {
        // ── Gate 1: Privacy Filter ──
        const privacy = await classifyPrivacy(
          email.subject,
          email.from,
          email.body
        );
        logEntry.privacyDecision = privacy;

        // Register this email as processed regardless of outcome
        await prisma.processedEmail.create({
          data: {
            gmailId: email.gmailId,
            subject: email.subject,
            receivedAt: email.receivedAt,
            profileId,
            syncLogId: syncLog.id,
            wasPrivate: privacy.isPrivate,
          },
        });

        if (privacy.isPrivate) {
          logEntry.decision = "skipped_private";
          extractionLog.push(logEntry);
          emailsSkipped++;
          continue;
        }

        // Skip if privacy classifier is uncertain
        if (privacy.confidence === "low") {
          logEntry.decision = "skipped_low_confidence";
          extractionLog.push(logEntry);
          emailsSkipped++;
          continue;
        }

        // ── Gate 2: Entity Extraction ──
        const entity = await extractEntity(
          email.subject,
          email.from,
          email.body,
          email.receivedAt
        );
        logEntry.entityType = entity.type;
        logEntry.extraction = entity;

        // ── Step 5: Persist extracted entity ──
        if (entity.type === "notice") {
          const embedding = await embedText(entity.body);
          await prisma.notice.create({
            data: {
              userId: profile.userId,
              title: entity.title,
              body: entity.body,
              category: entity.category,
              eventDate: entity.eventDate
                ? new Date(entity.eventDate)
                : null,
              venue: entity.venue,
              actionRequired: entity.actionRequired,
              source: `email:${email.from}`,
              embedding,
            },
          });
          noticesCreated++;
          logEntry.decision = "created_notice";
        } else if (entity.type === "deadline") {
          const embedding = await embedText(
            entity.title + " " + entity.subject
          );
          await prisma.deadline.create({
            data: {
              userId: profile.userId,
              title: entity.title,
              subject: entity.subject,
              dueDate: new Date(entity.dueDate),
              type: entity.deadlineType,
              notes: entity.notes,
              embedding,
            },
          });
          deadlinesCreated++;
          logEntry.decision = "created_deadline";
        } else if (entity.type === "schedule_update") {
          await handleScheduleUpdate(entity, profile.userId);
          schedulesUpdated++;
          logEntry.decision = "updated_schedule";
        } else {
          // entity.type === "ignore"
          logEntry.decision = "ignored";
          logEntry.ignoreReason = entity.reason;
          emailsSkipped++;
        }

        emailsProcessed++;
      } catch (emailError) {
        // One email failing must NOT abort the entire sync
        console.error(
          `[Sync] Failed to process email ${email.gmailId}:`,
          emailError
        );
        logEntry.decision = "error";
        logEntry.error =
          emailError instanceof Error
            ? emailError.message
            : String(emailError);
        emailsSkipped++;
      }

      extractionLog.push(logEntry);

      // Small delay between emails to avoid Gemini rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // ── Step 6: Update lastEmailSync timestamp ──
    await prisma.userProfile.update({
      where: { id: profileId },
      data: { lastEmailSync: new Date() },
    });

    const finalStatus =
      emailsSkipped > emailsProcessed ? "partial" : "completed";
    await finalizeLog(
      finalStatus,
      {
        emailsFound,
        emailsProcessed,
        emailsSkipped,
        noticesCreated,
        deadlinesCreated,
        schedulesUpdated,
      },
      extractionLog
    );

    return {
      success: true,
      syncLogId: syncLog.id,
      emailsFound,
      emailsProcessed,
      emailsSkipped,
      noticesCreated,
      deadlinesCreated,
      schedulesUpdated,
      durationMs: Date.now() - startTime,
    };
  } catch (fatalError) {
    // Fatal error — entire sync failed
    const msg =
      fatalError instanceof Error ? fatalError.message : String(fatalError);
    console.error("[Sync] Fatal error:", fatalError);
    await finalizeLog(
      "failed",
      { emailsFound, emailsProcessed, emailsSkipped },
      extractionLog,
      msg
    );

    return {
      success: false,
      syncLogId: syncLog.id,
      emailsFound,
      emailsProcessed,
      emailsSkipped,
      noticesCreated: 0,
      deadlinesCreated: 0,
      schedulesUpdated: 0,
      errorMessage: msg,
      durationMs: Date.now() - startTime,
    };
  }
}

// ── Schedule update handler ──
// Schedule updates are the most dangerous entity type — incorrect updates
// can corrupt the timetable. Be conservative.

async function handleScheduleUpdate(
  entity: ExtractedScheduleUpdate,
  userId: string
): Promise<void> {
  if (entity.updateKind === "cancelled") {
    // For v1: create a notice instead of deleting a recurring class
    const embedding = await embedText(
      `Cancelled: ${entity.subject} on ${entity.affectedDay}`
    );
    await prisma.notice.create({
      data: {
        userId,
        title: `Class Cancelled: ${entity.subject} (${entity.affectedDay})`,
        body:
          entity.notes ??
          `${entity.subject} class on ${entity.affectedDay} has been cancelled.`,
        category: "general",
        eventDate: null,
        venue: null,
        actionRequired: null,
        source: "email:schedule_update",
        embedding,
      },
    });
  } else if (entity.updateKind === "room_change") {
    // Find the matching ClassSchedule row and update the room
    if (entity.subject && entity.affectedDay && entity.originalTime) {
      const existing = await prisma.classSchedule.findFirst({
        where: {
          userId,
          subject: { contains: entity.subject.split(" ")[0] },
          day: entity.affectedDay,
          startTime: entity.originalTime,
        },
      });
      if (existing && entity.newRoom) {
        await prisma.classSchedule.update({
          where: { id: existing.id },
          data: { room: entity.newRoom },
        });
      }
    }
  } else if (
    entity.updateKind === "rescheduled" ||
    entity.updateKind === "new_class"
  ) {
    // Create a notice rather than auto-modifying the schedule
    const embedding = await embedText(
      `${entity.updateKind}: ${entity.subject} ${entity.affectedDay} ${entity.newTime ?? ""}`
    );
    await prisma.notice.create({
      data: {
        userId,
        title: `Schedule Update: ${entity.subject}`,
        body:
          entity.notes ??
          `${entity.subject} has been ${entity.updateKind}.`,
        category: "general",
        eventDate: null,
        venue: entity.newRoom,
        actionRequired: "Check updated timetable",
        source: "email:schedule_update",
        embedding,
      },
    });
  }
}

import { prisma } from "./prisma";

export type ProposedSlot = {
  index: number;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  requesterFree: boolean;
  helperFree: boolean;
  label: string;
};

// ── proposeStudySlots ──
export async function proposeStudySlots(
  requesterId: string,   // UserProfile.id
  helperId: string,       // UserProfile.id
  topic: string,
  urgency: string
): Promise<ProposedSlot[]> {
  // Fetch UserProfile to get Clerk userId for class schedule lookups
  const requesterProfile = await prisma.userProfile.findUnique({ where: { id: requesterId } });
  const helperProfile = await prisma.userProfile.findUnique({ where: { id: helperId } });

  if (!requesterProfile || !helperProfile) {
    return generateFallbackSlots(urgency);
  }

  // Determine the date range based on urgency
  const daysAhead = urgency === "high" ? 2 : urgency === "normal" ? 5 : 7;
  const now = new Date();

  // Fetch class schedules for both users
  const requesterSchedule = await prisma.classSchedule.findMany({
    where: { userId: requesterProfile.userId },
    select: { day: true, startTime: true, endTime: true },
  });

  const helperSchedule = await prisma.classSchedule.findMany({
    where: { userId: helperProfile.userId },
    select: { day: true, startTime: true, endTime: true },
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Build busy windows per day name
  const requesterBusy = buildBusyMap(requesterSchedule);
  const helperBusy = buildBusyMap(helperSchedule);

  // Preferred session windows (1-hour blocks between 6am-10pm)
  const preferredHours = [18, 19, 20, 17, 16, 15, 14, 10, 11, 9, 8];

  const candidates: ProposedSlot[] = [];

  for (let d = 0; d < daysAhead && candidates.length < 6; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);

    // Skip if it's today and already past 9pm
    if (d === 0 && now.getHours() >= 21) continue;

    const dayName = dayNames[date.getDay()];
    const dateStr = date.toISOString().split("T")[0];

    for (const hour of preferredHours) {
      // Skip hours that have already passed today
      if (d === 0 && hour <= now.getHours()) continue;

      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

      const requesterFree = !isTimeBlocked(requesterBusy[dayName] || [], hour);
      const helperFree = !isTimeBlocked(helperBusy[dayName] || [], hour);

      candidates.push({
        index: 0, // will be set later
        day: dayName,
        date: dateStr,
        startTime,
        endTime,
        requesterFree,
        helperFree,
        label: "", // will be set later
      });
    }
  }

  // Sort: both free first, then prefer evenings (6-9pm)
  candidates.sort((a, b) => {
    const aScore = (a.requesterFree && a.helperFree ? 100 : 0) +
      (parseInt(a.startTime) >= 17 && parseInt(a.startTime) <= 20 ? 50 : 0);
    const bScore = (b.requesterFree && b.helperFree ? 100 : 0) +
      (parseInt(b.startTime) >= 17 && parseInt(b.startTime) <= 20 ? 50 : 0);
    return bScore - aScore;
  });

  // Take top 3
  const topSlots = candidates.slice(0, 3);

  // Generate human-friendly labels
  for (let i = 0; i < topSlots.length; i++) {
    topSlots[i].index = i;
    topSlots[i].label = generateLabel(topSlots[i], now);
  }

  // If we couldn't find 3, pad with fallbacks
  while (topSlots.length < 3) {
    const fallback = generateFallbackSlots(urgency);
    for (const fb of fallback) {
      if (topSlots.length >= 3) break;
      fb.index = topSlots.length;
      topSlots.push(fb);
    }
  }

  return topSlots;
}

// ── confirmSlotAgreement ──
export async function confirmSlotAgreement(sessionId: string): Promise<boolean> {
  const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
  if (!session) return false;

  if (
    session.requesterSlotChoice !== null &&
    session.helperSlotChoice !== null &&
    session.requesterSlotChoice === session.helperSlotChoice
  ) {
    const slots = (typeof session.proposedSlots === "string"
      ? JSON.parse(session.proposedSlots)
      : session.proposedSlots) as ProposedSlot[];

    const agreed = slots[session.requesterSlotChoice];
    if (!agreed) return false;

    // Parse the scheduled time
    const scheduledFor = new Date(`${agreed.date}T${agreed.startTime}:00`);

    // Fetch profiles for creating schedule entries
    const requesterProfile = await prisma.userProfile.findUnique({ where: { id: session.requesterId } });
    const helperProfile = await prisma.userProfile.findUnique({ where: { id: session.helperId } });

    await prisma.$transaction(async (tx) => {
      // Update session
      await tx.studySession.update({
        where: { id: sessionId },
        data: {
          agreedSlot: agreed as any,
          status: "confirmed",
          confirmedAt: new Date(),
          scheduledFor,
          contactShared: true,
        },
      });

      // Create calendar entries for both users
      const scheduleData = {
        day: agreed.day,
        subject: `Study Session: ${session.topic}`,
        startTime: agreed.startTime,
        endTime: agreed.endTime,
        room: "TBD — contact shared",
        embedding: "[]",
      };

      if (requesterProfile) {
        await tx.classSchedule.create({
          data: { ...scheduleData, userId: requesterProfile.userId },
        });
      }
      if (helperProfile) {
        await tx.classSchedule.create({
          data: { ...scheduleData, userId: helperProfile.userId },
        });
      }

      // Notify both
      await tx.peerNotification.create({
        data: {
          profileId: session.requesterId,
          type: "session_confirmed",
          referenceId: sessionId,
          message: `Your study session for "${session.topic}" is confirmed for ${agreed.day}, ${agreed.date} at ${agreed.startTime}!`,
          actionUrl: `/peer-learning/session/${sessionId}`,
        },
      });
      await tx.peerNotification.create({
        data: {
          profileId: session.helperId,
          type: "session_confirmed",
          referenceId: sessionId,
          message: `Study session confirmed for "${session.topic}" on ${agreed.day}, ${agreed.date} at ${agreed.startTime}!`,
          actionUrl: `/peer-learning/session/${sessionId}`,
        },
      });

      // Contact revealed notifications
      await tx.peerNotification.create({
        data: {
          profileId: session.requesterId,
          type: "contact_revealed",
          referenceId: sessionId,
          message: "Contact details are now shared for your upcoming session.",
          actionUrl: `/peer-learning/session/${sessionId}`,
        },
      });
      await tx.peerNotification.create({
        data: {
          profileId: session.helperId,
          type: "contact_revealed",
          referenceId: sessionId,
          message: "Contact details are now shared for your upcoming session.",
          actionUrl: `/peer-learning/session/${sessionId}`,
        },
      });
    });

    return true;
  }

  return false;
}

// ── Helpers ──

function buildBusyMap(schedule: { day: string; startTime: string; endTime: string }[]) {
  const map: Record<string, { start: number; end: number }[]> = {};
  for (const entry of schedule) {
    if (!map[entry.day]) map[entry.day] = [];
    map[entry.day].push({
      start: parseTime(entry.startTime),
      end: parseTime(entry.endTime),
    });
  }
  return map;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

function isTimeBlocked(blocks: { start: number; end: number }[], hour: number): boolean {
  return blocks.some((b) => hour >= b.start && hour < b.end);
}

function generateLabel(slot: ProposedSlot, now: Date): string {
  const slotDate = new Date(slot.date);
  const diffDays = Math.floor((slotDate.getTime() - now.getTime()) / (86400000));
  const hour = parseInt(slot.startTime);
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  if (diffDays <= 0) return `Today ${timeOfDay}`;
  if (diffDays === 1) return `Tomorrow ${timeOfDay}`;
  if (diffDays <= 5) return `${slot.day} ${timeOfDay}`;
  return `This ${slot.day} ${timeOfDay}`;
}

function generateFallbackSlots(urgency: string): ProposedSlot[] {
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const slots: ProposedSlot[] = [];
  const offset = urgency === "high" ? 1 : 2;

  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset + i);
    slots.push({
      index: i,
      day: dayNames[d.getDay()],
      date: d.toISOString().split("T")[0],
      startTime: "18:00",
      endTime: "19:00",
      requesterFree: true,
      helperFree: true,
      label: i === 0 ? "Tomorrow evening" : `${dayNames[d.getDay()]} evening`,
    });
  }
  return slots;
}

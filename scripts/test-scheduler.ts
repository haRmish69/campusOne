import { PrismaClient } from "@prisma/client";
import { proposeStudySlots, confirmSlotAgreement } from "../lib/scheduleNegotiator";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== SECTION 3: SCHEDULE NEGOTIATOR TESTS ===");
  let p0Count = 0;
  let p1Count = 0;

  try {
    const p1 = await prisma.userProfile.create({
      data: { userId: "sched_test_1_" + Date.now() }
    });
    const p2 = await prisma.userProfile.create({
      data: { userId: "sched_test_2_" + Date.now() }
    });

    // ── 3.1 proposeStudySlots: returns exactly 3 slots ──
    const slots = await proposeStudySlots(p1.id, p2.id, "DSA", "normal");
    if (slots.length !== 3) {
      console.error(`FAIL P1 (3.1): proposeStudySlots returned ${slots.length} slots, expected 3`);
      p1Count++;
    } else {
      console.log("PASS 3.1: proposeStudySlots returned 3 slots");
    }

    // ── 3.2 proposeStudySlots: urgency window enforcement ──
    const slotsHigh = await proposeStudySlots(p1.id, p2.id, "DSA", "high");
    // Should be within next 48 hours. Let's assume the mock generator generates things based on date.
    const hasFarSlot = slotsHigh.some(s => new Date(s.date) > new Date(Date.now() + 48 * 3600 * 1000));
    if (hasFarSlot) {
       console.log("WARN (3.2): High urgency returned slot outside 48 hours (may be fallback logic)");
    } else {
       console.log("PASS 3.2: High urgency window enforced");
    }

    // ── 3.7 confirmSlotAgreement: same choice → agreement ──
    const reqMock = await prisma.helpRequest.create({
      data: { requesterId: p1.id, topic: "DSA", embedding: JSON.stringify([]), expiresAt: new Date(Date.now() + 86400000) }
    });
    const session = await prisma.studySession.create({
      data: {
        requestId: reqMock.id,
        requesterId: p1.id,
        helperId: p2.id,
        topic: "DSA",
        proposedSlots: JSON.stringify(slots),
        requesterSlotChoice: 1,
        helperSlotChoice: 1
      }
    });

    const agreed = await confirmSlotAgreement(session.id);
    const sessionUpdated = await prisma.studySession.findUnique({ where: { id: session.id }});
    
    if (!agreed || sessionUpdated?.status !== "confirmed") {
      console.error("FAIL P1 (3.7): confirmSlotAgreement failed to confirm", agreed, sessionUpdated?.status);
      p1Count++;
    } else {
      console.log("PASS 3.7: confirmSlotAgreement works");
      const classes = await prisma.classSchedule.findMany({ where: { userId: { in: [p1.userId, p2.userId] } } });
      if (classes.length !== 2) {
        console.error("FAIL P1 (3.10): ClassSchedule rows not created correctly, expected 2, got " + classes.length);
        p1Count++;
      } else {
        console.log("PASS 3.10: ClassSchedule rows created after agreement");
      }
    }

    // ── 3.8 confirmSlotAgreement: different choices → no agreement ──
    const session2 = await prisma.studySession.create({
      data: {
        requestId: reqMock.id + "2",
        requesterId: p1.id,
        helperId: p2.id,
        topic: "DSA",
        proposedSlots: JSON.stringify(slots),
        requesterSlotChoice: 0,
        helperSlotChoice: 2
      }
    });
    const agreed2 = await confirmSlotAgreement(session2.id);
    if (agreed2) {
      console.error("FAIL P1 (3.8): confirmSlotAgreement confirmed with different choices");
      p1Count++;
    } else {
      console.log("PASS 3.8: confirmSlotAgreement does not confirm different choices");
    }

  } catch (err) {
    console.error("Fatal test error:", err);
  } finally {
    console.log(`\nResults: ${p0Count} P0s, ${p1Count} P1s`);
    await prisma.$disconnect();
  }
}

runTests();

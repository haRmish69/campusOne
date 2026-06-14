import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function runTests() {
  console.log("=== SECTION 1: SCHEMA INTEGRITY TESTS ===");
  let p0Count = 0;
  let p1Count = 0;

  try {
    // Setup dummy profiles
    const requester = await prisma.userProfile.create({
      data: { userId: "req_test_" + Date.now(), instituteName: "Test Inst" }
    });
    const helper = await prisma.userProfile.create({
      data: { userId: "help_test_" + Date.now(), instituteName: "Test Inst" }
    });

    const req = await prisma.helpRequest.create({
      data: {
        requesterId: requester.id,
        topic: "Schema Test Topic",
        embedding: JSON.stringify([1,2,3]),
        expiresAt: new Date(Date.now() + 86400000)
      }
    });

    // ── 1.1 Unique constraint: HelpVolunteer ──
    try {
      await prisma.helpVolunteer.create({
        data: { requestId: req.id, helperId: helper.id }
      });
      await prisma.helpVolunteer.create({
        data: { requestId: req.id, helperId: helper.id }
      });
      console.error("FAIL P0: Duplicate volunteer created — no unique constraint");
      p0Count++;
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log("PASS 1.1: Unique constraint working on HelpVolunteer");
      } else {
        console.error("ERROR 1.1:", e);
      }
    }

    // ── 1.2 Unique constraint: StudySession per request ──
    try {
      await prisma.studySession.create({
        data: {
          requestId: req.id,
          requesterId: requester.id,
          helperId: helper.id,
          topic: "Test Topic",
          proposedSlots: JSON.stringify([])
        }
      });
      await prisma.studySession.create({
        data: {
          requestId: req.id, // same requestId
          requesterId: requester.id,
          helperId: helper.id,
          topic: "Test Topic",
          proposedSlots: JSON.stringify([])
        }
      });
      console.error("FAIL P0: Duplicate StudySession created for same requestId");
      p0Count++;
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log("PASS 1.2: Unique constraint working on StudySession");
      } else {
        console.error("ERROR 1.2:", e);
      }
    }

    // ── 1.3 ExpertiseSeed unique constraint ──
    try {
      // The expertise engine does an upsert check first, but the schema has @@unique([profileId, topic, source]). Let's test the schema.
      await prisma.expertiseSeed.create({
        data: { profileId: requester.id, topic: "dsa", source: "onboarding", embedding: JSON.stringify([1]) }
      });
      await prisma.expertiseSeed.create({
        data: { profileId: requester.id, topic: "dsa", source: "onboarding", embedding: JSON.stringify([1]) }
      });
      console.error("FAIL P0: Duplicate ExpertiseSeed created");
      p0Count++;
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log("PASS 1.3: Unique constraint working on ExpertiseSeed");
      } else {
        console.error("ERROR 1.3:", e);
      }
    }

    // ── 1.4 UserProfile reputation field defaults ──
    console.log("1.4 UserProfile Defaults:");
    console.log("  totalHelped:", requester.totalHelped);
    console.log("  totalRequested:", requester.totalRequested);
    console.log("  reputationScore:", requester.reputationScore);
    console.log("  responseRate:", requester.responseRate);
    console.log("  avgRating:", requester.avgRating);
    if (requester.avgRating !== null) {
      console.error("FAIL P1: avgRating default is not null. It is", requester.avgRating);
      p1Count++;
    } else {
      console.log("PASS 1.4: avgRating is null");
    }

    // ── 1.5 Cascade behavior on HelpRequest deletion ──
    try {
      await prisma.helpRequest.delete({ where: { id: req.id } });
      console.log("PASS 1.5: Deletion successful without FK crash. Checking orphans...");
      
      const orphanedVols = await prisma.helpVolunteer.findMany({ where: { requestId: req.id }});
      const orphanedSessions = await prisma.studySession.findMany({ where: { requestId: req.id }});
      
      if (orphanedVols.length > 0 || orphanedSessions.length > 0) {
        console.error(`FAIL P1: Orphans detected. Volunteers: ${orphanedVols.length}, Sessions: ${orphanedSessions.length}`);
        p1Count++;
      } else {
        console.log("PASS 1.5: No orphans created.");
      }
    } catch (e: any) {
      console.error("FAIL P1: FK crash on deletion", e.message);
      p1Count++;
    }

    // ── 1.6 Json field validation ──
    console.log("1.6 Note: Prisma allows any JSON in proposedSlots. We must validate in API.");

  } catch (err) {
    console.error("Fatal test error:", err);
  } finally {
    console.log(`\nResults: ${p0Count} P0s, ${p1Count} P1s`);
    await prisma.$disconnect();
  }
}

runTests();

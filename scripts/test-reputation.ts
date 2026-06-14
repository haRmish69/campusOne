import { PrismaClient } from "@prisma/client";
import { computeReputationScore, updateResponseRate, rankVolunteers } from "../lib/reputationEngine";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== SECTION 2: REPUTATION ENGINE TESTS ===");
  let p0Count = 0;
  let p1Count = 0;

  try {
    const p1 = await prisma.userProfile.create({
      data: { userId: "rep_test_1_" + Date.now(), instituteName: "Inst1" }
    });

    // ── 2.1 computeReputationScore: zero baseline ──
    const score1 = await computeReputationScore(p1.id);
    if (score1 !== 38) {
      console.error(`FAIL P1 (2.1): Zero baseline score is ${score1}, expected 38`);
      p1Count++;
    } else {
      console.log("PASS 2.1: Zero baseline score is 38");
    }

    // ── 2.2 computeReputationScore: experienced helper ──
    const p2 = await prisma.userProfile.create({
      data: { 
        userId: "rep_test_2_" + Date.now(), 
        instituteName: "Inst1",
        totalHelped: 12,
        avgRating: 4.7,
        responseRate: 0.95
      }
    });

    const reqMock = await prisma.helpRequest.create({
      data: { requesterId: p1.id, topic: "test", embedding: JSON.stringify([]), expiresAt: new Date(Date.now() + 86400000) }
    });

    for(let i=0; i<3; i++) {
      await prisma.studySession.create({
        data: {
          requestId: reqMock.id + i,
          requesterId: p1.id,
          helperId: p2.id,
          topic: "test",
          status: "completed",
          completedAt: new Date(),
          proposedSlots: JSON.stringify([])
        }
      });
    }

    const score2 = await computeReputationScore(p2.id);
    if (score2 !== 77) {
      console.error(`FAIL P1 (2.2): Experienced helper score is ${score2}, expected 77`);
      p1Count++;
    } else {
      console.log("PASS 2.2: Experienced helper score is 77");
    }

    // ── 2.3 computeReputationScore: recency cap ──
    for(let i=3; i<10; i++) {
      await prisma.studySession.create({
        data: {
          requestId: reqMock.id + i,
          requesterId: p1.id,
          helperId: p2.id,
          topic: "test",
          status: "completed",
          completedAt: new Date(),
          proposedSlots: JSON.stringify([])
        }
      });
    }
    const score3 = await computeReputationScore(p2.id);
    // Since recency cap is 100, 10 sessions * 20 = 200, but capped at 100.
    // So 100 * 0.15 = 15. The previous score used 3 sessions * 20 = 60 * 0.15 = 9.
    // So it should be 77.085 - 9 + 15 = 83.085 -> 83
    if (score3 !== 83) {
      console.error(`FAIL P1 (2.3): Recency cap score is ${score3}, expected 83`);
      p1Count++;
    } else {
      console.log("PASS 2.3: Recency cap works (score is 83)");
    }

    // ── 2.4 updateResponseRate: rolling window ──
    const p3 = await prisma.userProfile.create({
      data: { userId: "rep_test_3_" + Date.now(), instituteName: "Inst1" }
    });

    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    for(let i=0; i<5; i++) {
      await prisma.helpVolunteer.create({
        data: { requestId: reqMock.id + "old" + i, helperId: p3.id, notifiedAt: thirtyFiveDaysAgo }
      });
    }
    for(let i=0; i<3; i++) {
      await prisma.helpVolunteer.create({
        data: { requestId: reqMock.id + "new" + i, helperId: p3.id, notifiedAt: tenDaysAgo, respondedAt: new Date() }
      });
    }

    await updateResponseRate(p3.id);
    const p3Updated = await prisma.userProfile.findUnique({ where: { id: p3.id }});
    if (p3Updated?.responseRate !== 1.0) {
      console.error(`FAIL P1 (2.4): responseRate is ${p3Updated?.responseRate}, expected 1.0 (old rows included)`);
      p1Count++;
    } else {
      console.log("PASS 2.4: responseRate rolling window works (1.0)");
    }

    // ── 2.5 updateResponseRate: floor enforcement ──
    const p4 = await prisma.userProfile.create({
      data: { userId: "rep_test_4_" + Date.now(), instituteName: "Inst1" }
    });
    for(let i=0; i<10; i++) {
      await prisma.helpVolunteer.create({
        data: { requestId: reqMock.id + "bad" + i, helperId: p4.id, notifiedAt: tenDaysAgo } // no respondedAt
      });
    }
    await updateResponseRate(p4.id);
    const p4Updated = await prisma.userProfile.findUnique({ where: { id: p4.id }});
    if (p4Updated?.responseRate !== 0.1) {
      console.error(`FAIL P1 (2.5): responseRate floor is ${p4Updated?.responseRate}, expected 0.1`);
      p1Count++;
    } else {
      console.log("PASS 2.5: responseRate floor works (0.1)");
    }

    // ── 2.6 rankVolunteers: ordering ──
    const rankReq = await prisma.helpRequest.create({
      data: { requesterId: p1.id, topic: "DSA", embedding: JSON.stringify([]), expiresAt: new Date(Date.now() + 86400000) }
    });

    const volA = await prisma.userProfile.create({ data: { userId: "volA_" + Date.now(), reputationScore: 78, responseRate: 0.95, totalHelped: 12, avgRating: 4.6 } });
    const volB = await prisma.userProfile.create({ data: { userId: "volB_" + Date.now(), reputationScore: 45, responseRate: 0.7 } });
    const volC = await prisma.userProfile.create({ data: { userId: "volC_" + Date.now(), reputationScore: 15, responseRate: 0.5 } });

    // Expertise
    await prisma.expertiseSeed.create({ data: { profileId: volA.id, topic: "dsa", source: "test", confidence: 4, embedding: JSON.stringify([]) } });
    await prisma.expertiseSeed.create({ data: { profileId: volB.id, topic: "dsa", source: "test", confidence: 3, embedding: JSON.stringify([]) } });
    await prisma.expertiseSeed.create({ data: { profileId: volC.id, topic: "dsa", source: "test", confidence: 1, embedding: JSON.stringify([]) } });

    // Recent help
    for(let i=0; i<3; i++) {
      await prisma.studySession.create({ data: { requestId: rankReq.id + "volA" + i, requesterId: p1.id, helperId: volA.id, topic: "test", status: "completed", completedAt: tenDaysAgo, proposedSlots: JSON.stringify([]) }});
    }

    await prisma.helpVolunteer.create({ data: { requestId: rankReq.id, helperId: volA.id, status: "volunteered" }});
    await prisma.helpVolunteer.create({ data: { requestId: rankReq.id, helperId: volB.id, status: "volunteered" }});
    await prisma.helpVolunteer.create({ data: { requestId: rankReq.id, helperId: volC.id, status: "volunteered" }});

    const ranked = await rankVolunteers(rankReq.id, "DSA");
    if (ranked.length !== 3 || ranked[0].helperId !== volA.id || ranked[1].helperId !== volB.id || ranked[2].helperId !== volC.id) {
      console.error("FAIL P1 (2.6): rankVolunteers ordering incorrect", ranked.map(r => r.helperId));
      p1Count++;
    } else {
      console.log(`PASS 2.6: rankVolunteers ordering works (${ranked[0].rankScore}, ${ranked[1].rankScore}, ${ranked[2].rankScore})`);
      
      // ── 2.7 rankVolunteers: badge assignment ──
      if (ranked[0].rankBadge !== "Top Helper" || ranked[1].rankBadge !== "Subject Expert" || ranked[2].rankBadge !== null) {
        console.error("FAIL P2 (2.7): Badge assignment incorrect", ranked.map(r => r.rankBadge));
      } else {
        console.log("PASS 2.7: Badge assignment works");
      }
    }

    // ── 2.8 rankVolunteers: withdrawn volunteer excluded ──
    const volD = await prisma.userProfile.create({ data: { userId: "volD_" + Date.now() } });
    await prisma.helpVolunteer.create({ data: { requestId: rankReq.id, helperId: volD.id, status: "withdrawn" }});
    const ranked2 = await rankVolunteers(rankReq.id, "DSA");
    if (ranked2.find(r => r.helperId === volD.id)) {
      console.error("FAIL P0 (2.8): Withdrawn volunteer included in rankVolunteers");
      p0Count++;
    } else {
      console.log("PASS 2.8: Withdrawn volunteer excluded");
    }

  } catch (err) {
    console.error("Fatal test error:", err);
  } finally {
    console.log(`\nResults: ${p0Count} P0s, ${p1Count} P1s`);
    await prisma.$disconnect();
  }
}

runTests();

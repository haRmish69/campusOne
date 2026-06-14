import { PrismaClient } from "@prisma/client";
import { broadcastHelpRequest } from "../lib/peerBroadcaster";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== SECTION 4: BROADCASTER TESTS ===");
  let p0Count = 0;
  let p1Count = 0;

  try {
    const pReq = await prisma.userProfile.create({ data: { userId: "req_" + Date.now(), instituteName: "Inst1", reputationScore: 50, responseRate: 0.8 } });
    
    // ── 4.1 broadcastHelpRequest: requester not notified ──
    const reqMock1 = await prisma.helpRequest.create({ data: { requesterId: pReq.id, topic: "DSA test", embedding: JSON.stringify([1]), expiresAt: new Date(Date.now() + 86400000) } });
    
    await prisma.expertiseSeed.create({ data: { profileId: pReq.id, topic: "dsa test", confidence: 4, source: "test", embedding: JSON.stringify([1]) }});
    
    // Also create 20 valid candidates to test the cap
    const pCands: any[] = [];
    for(let i=0; i<20; i++) {
       const c = await prisma.userProfile.create({ data: { userId: "cand_" + i + "_" + Date.now(), instituteName: "Inst1", reputationScore: 50, responseRate: 0.8 }});
       pCands.push(c);
       await prisma.expertiseSeed.create({ data: { profileId: c.id, topic: "dsa test", confidence: 3, source: "test", embedding: JSON.stringify([1]) }});
    }

    const { notified } = await broadcastHelpRequest(reqMock1, pReq.id);

    const reqNotifications = await prisma.peerNotification.findMany({ where: { profileId: pReq.id, referenceId: reqMock1.id } });
    if (reqNotifications.length > 0) {
      console.error("FAIL P1 (4.1): Requester notified about their own request");
      p1Count++;
    } else {
      console.log("PASS 4.1: Requester not notified");
    }

    // ── 4.2 broadcastHelpRequest: top 15 cap ──
    if (notified !== 15) {
      console.error(`FAIL P1 (4.2): Notified ${notified} candidates, expected 15 cap`);
      p1Count++;
    } else {
      console.log("PASS 4.2: Top 15 cap works");
    }

    // ── 4.6 notification message: anonymous requester ──
    const reqMockAnon = await prisma.helpRequest.create({ data: { requesterId: pReq.id, topic: "Anon test", isAnonymous: true, embedding: JSON.stringify([1]), expiresAt: new Date(Date.now() + 86400000) } });
    const pCandAnon = await prisma.userProfile.create({ data: { userId: "cand_anon_" + Date.now(), instituteName: "Inst1" }});
    await prisma.expertiseSeed.create({ data: { profileId: pCandAnon.id, topic: "anon test", confidence: 5, source: "test", embedding: JSON.stringify([1]) }});
    
    await broadcastHelpRequest(reqMockAnon, pReq.id);
    const anonNotif = await prisma.peerNotification.findFirst({ where: { profileId: pCandAnon.id, referenceId: reqMockAnon.id }});
    if (anonNotif?.message.includes(pReq.name || "undefined")) {
       console.error("FAIL P1 (4.6): Anonymous notification includes name", anonNotif.message);
       p1Count++;
    } else {
       console.log("PASS 4.6: Anonymous notification hides name. Msg:", anonNotif?.message);
    }

  } catch (err) {
    console.error("Fatal test error:", err);
  } finally {
    console.log(`\nResults: ${p0Count} P0s, ${p1Count} P1s`);
    await prisma.$disconnect();
  }
}

runTests();

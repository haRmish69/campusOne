import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanOrphans() {
  const requests = await prisma.helpRequest.findMany({ select: { id: true } });
  const requestIds = new Set(requests.map(r => r.id));

  const volunteers = await prisma.helpVolunteer.findMany({ select: { id: true, requestId: true } });
  let vDeleted = 0;
  for (const v of volunteers) {
    if (!requestIds.has(v.requestId)) {
      await prisma.helpVolunteer.delete({ where: { id: v.id } });
      vDeleted++;
    }
  }

  const sessions = await prisma.studySession.findMany({ select: { id: true, requestId: true } });
  let sDeleted = 0;
  for (const s of sessions) {
    if (!requestIds.has(s.requestId)) {
      await prisma.studySession.delete({ where: { id: s.id } });
      sDeleted++;
    }
  }

  console.log(`Deleted ${vDeleted} orphaned volunteers and ${sDeleted} orphaned sessions.`);
}

cleanOrphans().finally(() => prisma.$disconnect());

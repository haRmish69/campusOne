const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notices = await prisma.notice.findMany({
    select: { id: true, title: true, userId: true }
  });
  console.log(JSON.stringify(notices, null, 2));
}

main().finally(() => prisma.$disconnect());

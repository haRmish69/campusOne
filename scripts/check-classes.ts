import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const classes = await prisma.classSchedule.findMany();
  console.log("Total classes:", classes.length);
  if (classes.length > 0) {
    const days = new Set(classes.map(c => c.day));
    console.log("Days with classes:", Array.from(days).join(", "));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());

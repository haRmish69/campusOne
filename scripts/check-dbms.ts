import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const notices = await prisma.notice.findMany({ where: { body: { contains: 'DBMS' } } });
  console.log('NOTICES:', notices);
  
  const deadlines = await prisma.deadline.findMany({ where: { title: { contains: 'DBMS' } } });
  console.log('DEADLINES:', deadlines);
}
main().finally(() => prisma.$disconnect());

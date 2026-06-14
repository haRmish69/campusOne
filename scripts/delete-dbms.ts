import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.notice.deleteMany({ where: { title: { contains: 'DBMS' } } });
  console.log('Deleted bogus notices');
}
main().finally(() => prisma.$disconnect());

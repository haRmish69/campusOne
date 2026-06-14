import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany();
  console.log('Companies:', companies.map(c => c.name));
  
  const experiences = await prisma.interviewExperience.findMany();
  console.log('Experiences count:', experiences.length);
}
main().finally(() => prisma.$disconnect());

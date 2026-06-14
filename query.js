const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.userProfile.count({
    where: {
      instituteName: {
        contains: 'dhanbad'
      }
    }
  });
  console.log('Users from Dhanbad:', users);

  const companies = await prisma.company.count({
    where: {
      instituteName: {
        contains: 'dhanbad'
      }
    }
  });
  console.log('Companies from Dhanbad:', companies);
}

main().finally(() => prisma.$disconnect());

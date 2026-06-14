import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the real user
  const realUsers = await prisma.userProfile.findMany({
    where: { NOT: { userId: { startsWith: "seed_" } } },
    orderBy: { updatedAt: "desc" },
    take: 1,
  });

  if (realUsers.length === 0) {
    console.error("No real user found. Please login to the app first.");
    return;
  }

  const realUserId = realUsers[0].userId;
  const seedUserId = "seed_user_01"; // Aarav Sharma

  console.log(`Found real user: ${realUsers[0].name} (${realUserId})`);
  console.log(`Merging with seed user: Aarav Sharma (${seedUserId})...`);

  // 1. Delete the real user profile so we don't have a unique constraint error
  await prisma.userProfile.delete({ where: { userId: realUserId } }).catch(() => {});

  // 2. Update the seed user profile to use the real user's Clerk ID
  await prisma.userProfile.update({
    where: { userId: seedUserId },
    data: { userId: realUserId },
  });

  // 3. Update relational tables
  await prisma.classSchedule.updateMany({
    where: { userId: seedUserId },
    data: { userId: realUserId },
  });

  await prisma.deadline.updateMany({
    where: { userId: seedUserId },
    data: { userId: realUserId },
  });

  await prisma.expense.updateMany({
    where: { userId: seedUserId },
    data: { userId: realUserId },
  });

  await prisma.wellnessLog.updateMany({
    where: { userId: seedUserId },
    data: { userId: realUserId },
  });

  // 4. Update Travel Pools (initiatorId)
  await prisma.cabPoolRequest.updateMany({
    where: { initiatorId: seedUserId },
    data: { initiatorId: realUserId },
  });

  // Handle participants array for pools
  const pools = await prisma.cabPoolRequest.findMany();
  for (const pool of pools) {
    if (typeof pool.participants === "string") {
      let parts = [];
      try { parts = JSON.parse(pool.participants); } catch(e){}
      if (parts.includes(seedUserId)) {
        const newParts = parts.map((id: string) => id === seedUserId ? realUserId : id);
        await prisma.cabPoolRequest.update({
          where: { id: pool.id },
          data: { participants: JSON.stringify(newParts) }
        });
      }
    }
  }

  console.log(`\n✅ Success! You are now logged in as Aarav Sharma.`);
  console.log(`Refresh your browser to see your new class schedules, deadlines, expenses, and travel pools!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

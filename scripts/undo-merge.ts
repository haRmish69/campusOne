import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function undo() {
  const realUserId = "user_3F4DkLKBAIDCkvtqOSB66Rgffj9"; // The Clerk ID we overwrote
  const seedUserId = "seed_user_01"; 

  console.log("Undoing the merge...");

  // 1. Revert the profile back to seed_user_01
  await prisma.userProfile.updateMany({
    where: { userId: realUserId },
    data: { userId: seedUserId },
  });

  // 2. Revert relational tables
  await prisma.classSchedule.updateMany({
    where: { userId: realUserId },
    data: { userId: seedUserId },
  });

  await prisma.deadline.updateMany({
    where: { userId: realUserId },
    data: { userId: seedUserId },
  });

  await prisma.expense.updateMany({
    where: { userId: realUserId },
    data: { userId: seedUserId },
  });

  await prisma.wellnessLog.updateMany({
    where: { userId: realUserId },
    data: { userId: seedUserId },
  });

  // 3. Revert Travel Pools
  await prisma.cabPoolRequest.updateMany({
    where: { initiatorId: realUserId },
    data: { initiatorId: seedUserId },
  });

  const pools = await prisma.cabPoolRequest.findMany();
  for (const pool of pools) {
    if (typeof pool.participants === "string") {
      let parts = [];
      try { parts = JSON.parse(pool.participants); } catch(e){}
      if (parts.includes(realUserId)) {
        const newParts = parts.map((id: string) => id === realUserId ? seedUserId : id);
        await prisma.cabPoolRequest.update({
          where: { id: pool.id },
          data: { participants: JSON.stringify(newParts) }
        });
      }
    }
  }

  // 4. Restore your original empty profile
  await prisma.userProfile.create({
    data: {
      userId: realUserId,
      name: "Nehmeet Patel",
      instituteName: "IIT ISM DHANBAD",
      profileComplete: true
    }
  }).catch(() => {});

  console.log("✅ Undo complete. Your original account is restored.");
}

undo()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

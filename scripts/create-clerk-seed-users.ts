import { createClerkClient } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load env vars
dotenv.config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

const prisma = new PrismaClient();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function main() {
  console.log("Setting up Clerk auth for seed users...");
  
  const seedEmails = [
    { email: "24je01@gmail.com", seedId: "seed_user_01", first: "Aarav", last: "Sharma" },
    { email: "24je02@gmail.com", seedId: "seed_user_02", first: "Vivaan", last: "Gupta" },
    { email: "24je03@gmail.com", seedId: "seed_user_03", first: "Aditya", last: "Verma" }
  ];

  for (const u of seedEmails) {
    try {
      // 1. Delete existing if any
      const existing = await clerkClient.users.getUserList({ emailAddress: [u.email] });
      if (existing.data && existing.data.length > 0) {
        await clerkClient.users.deleteUser(existing.data[0].id);
        console.log(`Deleted old Clerk user for ${u.email}`);
      }

      // 2. Create new user in Clerk
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [u.email],
        password: "CampusOne1234!",
        firstName: u.first,
        lastName: u.last,
        skipPasswordChecks: true, // Crucial: forces Clerk to accept the password!
      });

      console.log(`Created Clerk user ${u.email} -> ID: ${clerkUser.id}`);

      // 3. Update database
      await prisma.userProfile.updateMany({
        where: { userId: u.seedId },
        data: { userId: clerkUser.id }
      });

      // Relational tables
      await prisma.classSchedule.updateMany({ where: { userId: u.seedId }, data: { userId: clerkUser.id } });
      await prisma.deadline.updateMany({ where: { userId: u.seedId }, data: { userId: clerkUser.id } });
      await prisma.expense.updateMany({ where: { userId: u.seedId }, data: { userId: clerkUser.id } });
      await prisma.wellnessLog.updateMany({ where: { userId: u.seedId }, data: { userId: clerkUser.id } });
      await prisma.cabPoolRequest.updateMany({ where: { initiatorId: u.seedId }, data: { initiatorId: clerkUser.id } });

      const pools = await prisma.cabPoolRequest.findMany();
      for (const pool of pools) {
        if (typeof pool.participants === "string") {
          let parts = [];
          try { parts = JSON.parse(pool.participants); } catch(e){}
          if (parts.includes(u.seedId)) {
            const newParts = parts.map((id: string) => id === u.seedId ? clerkUser.id : id);
            await prisma.cabPoolRequest.update({
              where: { id: pool.id },
              data: { participants: JSON.stringify(newParts) }
            });
          }
        }
      }

      console.log(`Linked ${u.email} to DB seed ${u.seedId} successfully!`);
    } catch (e: any) {
      console.error(`Failed to process ${u.email}:`, e.message || e);
    }
  }
}

main().finally(() => prisma.$disconnect());

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enableString = process.env.ENABLE_DEMO_SEED || "";
  const enableDemoSeed = enableString.trim() === 'true';

  if (!enableDemoSeed) {
    console.log("Demo seed is disabled. Set ENABLE_DEMO_SEED=true to run.");
    return;
  }

  console.log("Generating 20 Ghost Students for Demo...");

  const institutes = ["Thapar Institute", "Stanford University"];
  const majors = ["Computer Science", "Mechanical Engineering", "Electronics"];
  const years = [2024, 2025, 2026, 2027];

  // Dummy subjects for deadlines
  const csSubjects = ["CS301: OS", "CS401: AI", "CS201: DSA"];

  for (let i = 1; i <= 20; i++) {
    const ghostId = `ghost_user_${i}`;
    const instituteName = i <= 15 ? institutes[0] : institutes[1]; // mostly Thapar
    const major = majors[i % majors.length];
    const gradYear = years[i % years.length];

    // Create or update UserProfile
    await prisma.userProfile.upsert({
      where: { userId: ghostId },
      update: {},
      create: {
        userId: ghostId,
        instituteName,
        major,
        gradYear,
        gender: i % 2 === 0 ? "Female" : "Male",
        profileComplete: true,
      }
    });

    // Create a random wellness log for Campus Pulse
    await prisma.wellnessLog.create({
      data: {
        date: new Date(),
        mood: Math.floor(Math.random() * 3) + 1, // 1 to 3 (make it seem stressed)
        stressLevel: Math.floor(Math.random() * 2) + 4, // 4 to 5 (high stress)
        notes: `Midterms are killing me. - ${major} student`,
        instituteName,
        major,
      }
    });

    // Create a deadline they are tracking (overlap with real users to test Matchmaker)
    if (major === "Computer Science") {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 5));
      await prisma.deadline.create({
        data: {
          title: "Final Project Submission",
          subject: csSubjects[i % csSubjects.length],
          dueDate,
          type: "project",
          userId: ghostId,
          instituteName,
          major,
          embedding: "[]", // fake embedding just to pass schema
        }
      });
    }
  }

  console.log("Seeding complete. Created 20 Ghost Profiles with Deadlines and Wellness Logs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

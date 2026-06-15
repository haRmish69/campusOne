import { prisma } from "../lib/prisma";

async function seedTestNotifications() {
  const userId = "user_3F4BdCcjGVlT4EIdc5hBtCScK8F"; // Nehmeet
  const user = await prisma.userProfile.findUnique({ where: { userId } });
  
  if (!user) {
    console.error("User Nehmeet not found!");
    return;
  }

  // Calculate a time exactly 2 hours and 5 minutes from NOW (in UTC)
  // This falls perfectly inside the 2h to 2h15m window the cron scans for.
  const targetTime = new Date(Date.now() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000);
  
  console.log("Seeding test data targeted for (UTC):", targetTime.toISOString());

  // 1. Seed Deadline
  const deadline = await prisma.deadline.create({
    data: {
      userId,
      title: "Test Cron Notification - Submit Hackathon Project",
      subject: "Hackathon",
      dueDate: targetTime,
      type: "project",
      isComplete: false,
      instituteName: user.instituteName,
      major: user.major,
      embedding: "[]",
    }
  });
  console.log("Created Deadline:", deadline.id);

  // 2. Seed Cab Pool
  const cabPool = await prisma.cabPoolRequest.create({
    data: {
      initiatorId: userId,
      instituteName: user.instituteName || "Unknown",
      source: "Campus",
      destination: "Airport",
      departureTime: targetTime,
      seatsAvailable: 3,
      participants: JSON.stringify([userId]),
      status: "open",
    }
  });
  console.log("Created Cab Pool:", cabPool.id);

  // 3. Seed Class Schedule
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDay = days[targetTime.getUTCDay()];
  const startHH = targetTime.getUTCHours().toString().padStart(2, '0');
  const startMM = targetTime.getUTCMinutes().toString().padStart(2, '0');
  const startTimeStr = `${startHH}:${startMM}`;

  // End time is just 1 hour later for the sake of valid data
  const endTime = new Date(targetTime.getTime() + 60 * 60 * 1000);
  const endHH = endTime.getUTCHours().toString().padStart(2, '0');
  const endMM = endTime.getUTCMinutes().toString().padStart(2, '0');
  const endTimeStr = `${endHH}:${endMM}`;

  const classSch = await prisma.classSchedule.create({
    data: {
      userId,
      day: targetDay,
      subject: "Test Cron Notification - Algorithms",
      startTime: startTimeStr,
      endTime: endTimeStr,
      room: "Room 101",
      faculty: "Prof. AI",
      instituteName: user.instituteName,
      major: user.major,
      embedding: "[]",
    }
  });
  console.log("Created Class Schedule:", classSch.id, "at", startTimeStr, "on", targetDay);

  console.log("\nDone! You can now test the API by opening your browser and going to:");
  console.log("http://localhost:3000/api/cron/notifications");
  console.log("\nNote: Make sure to temporarily disable the Authorization check in route.ts if testing directly from the browser, or use Postman/curl with the Bearer token!");
}

seedTestNotifications()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

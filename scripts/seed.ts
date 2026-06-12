import { PrismaClient } from "@prisma/client";
import { embedText } from "../lib/embeddings";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("Clearing existing data...");
  await prisma.notice.deleteMany();
  await prisma.messMenu.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.classSchedule.deleteMany();

  console.log("Seeding Notices...");
  const notice1 = {
    title: "Google Hackathon 2026",
    body: "The annual Google Campus Hackathon is back! Join us for a 48-hour coding sprint. Free pizza and swag. Top prize is a Pixel 10.",
    category: "event",
    eventDate: new Date("2026-07-15T09:00:00Z"),
    venue: "Main Auditorium",
  };
  await prisma.notice.create({
    data: { ...notice1, embedding: await embedText(`[NOTICE] ${notice1.title}: ${notice1.body}`) }
  });
  await delay(1500);

  const notice2 = {
    title: "Library Closure",
    body: "The Central Library will be closed for renovation this weekend. Online resources will remain available.",
    category: "general",
    eventDate: new Date("2026-06-20T00:00:00Z"),
    venue: "Central Library",
  };
  await prisma.notice.create({
    data: { ...notice2, embedding: await embedText(`[NOTICE] ${notice2.title}: ${notice2.body}`) }
  });
  await delay(1500);

  console.log("Seeding Mess Menu...");
  const mess1 = {
    day: "Monday",
    meal: "lunch",
    items: "Paneer Butter Masala, Roti, Rice, Dal, Gulab Jamun",
    isVeg: true,
  };
  await prisma.messMenu.create({
    data: { ...mess1, embedding: await embedText(`[MESS] ${mess1.day} ${mess1.meal}: ${mess1.items}`) }
  });
  await delay(1500);

  const mess2 = {
    day: "Tuesday",
    meal: "dinner",
    items: "Chicken Biryani, Raita, Salad",
    isVeg: false,
  };
  await prisma.messMenu.create({
    data: { ...mess2, embedding: await embedText(`[MESS] ${mess2.day} ${mess2.meal}: ${mess2.items}`) }
  });
  await delay(1500);

  console.log("Seeding Deadlines...");
  const now = new Date();
  const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const d1 = {
    title: "Operating Systems Assignment 3",
    subject: "CS301",
    dueDate: tmrw,
    type: "assignment",
    notes: "Implement page replacement algorithms (LRU, FIFO).",
  };
  await prisma.deadline.create({
    data: { ...d1, embedding: await embedText(`[DEADLINE] ${d1.title} (${d1.subject}) due on ${d1.dueDate}. ${d1.notes}`) }
  });
  await delay(1500);

  const d2 = {
    title: "Midterm Physics Exam",
    subject: "PHY101",
    dueDate: nextWeek,
    type: "exam",
    notes: "Covers Chapters 1-5.",
  };
  await prisma.deadline.create({
    data: { ...d2, embedding: await embedText(`[DEADLINE] ${d2.title} (${d2.subject}) due on ${d2.dueDate}. ${d2.notes}`) }
  });
  await delay(1500);

  console.log("Seeding Class Schedule...");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[now.getDay()];

  const c1 = {
    subject: "CS301: Operating Systems",
    faculty: "Dr. Smith",
    day: todayName,
    startTime: "10:00",
    endTime: "11:30",
    room: "Room 4B",
  };
  await prisma.classSchedule.create({
    data: { ...c1, embedding: await embedText(`${c1.subject} taught by ${c1.faculty} on ${c1.day} from ${c1.startTime} to ${c1.endTime} at ${c1.room}`) }
  });
  await delay(1500);

  const c2 = {
    subject: "PHY101: Physics",
    faculty: "Prof. Johnson",
    day: todayName,
    startTime: "13:00",
    endTime: "14:30",
    room: "Lab 2",
  };
  await prisma.classSchedule.create({
    data: { ...c2, embedding: await embedText(`${c2.subject} taught by ${c2.faculty} on ${c2.day} from ${c2.startTime} to ${c2.endTime} at ${c2.room}`) }
  });

  console.log("Seeding Complete! 🎉");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

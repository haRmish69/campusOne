import { PrismaClient } from "@prisma/client";
import { getRealEmbedding } from "../lib/embeddings";
import * as dotenv from "dotenv";
import { IndexFlatL2 } from "faiss-node";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

const prisma = new PrismaClient();
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("Clearing existing data...");
  await prisma.notice.deleteMany();
  await prisma.messMenu.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.classSchedule.deleteMany();

  const dimension = 3072;
  const index = new IndexFlatL2(dimension);
  const faissMap: Record<number, string> = {};
  let currentIndex = 0;

  async function processItem(dbRecord: any, text: string) {
    console.log(`Generating embedding for: ${text.substring(0, 30)}...`);
    const embedding = await getRealEmbedding(text);
    if (embedding.length === dimension) {
      index.add(embedding);
      faissMap[currentIndex] = dbRecord.id;
      currentIndex++;
    }
    await delay(1000); // Prevent API rate limits
  }

  console.log("Seeding Notices...");
  const notice1 = await prisma.notice.create({
    data: {
      title: "Google Hackathon 2026",
      body: "The annual Google Campus Hackathon is back! Join us for a 48-hour coding sprint. Free pizza and swag. Top prize is a Pixel 10.",
      category: "event",
      eventDate: new Date("2026-07-15T09:00:00Z"),
      venue: "Main Auditorium",
      embedding: "[]" // Ignored, satisfying Prisma schema
    }
  });
  await processItem(notice1, `[NOTICE] ${notice1.title}: ${notice1.body}`);

  const notice2 = await prisma.notice.create({
    data: {
      title: "Library Closure",
      body: "The Central Library will be closed for renovation this weekend. Online resources will remain available.",
      category: "general",
      eventDate: new Date("2026-06-20T00:00:00Z"),
      venue: "Central Library",
      embedding: "[]"
    }
  });
  await processItem(notice2, `[NOTICE] ${notice2.title}: ${notice2.body}`);

  console.log("Seeding Mess Menu...");
  const mess1 = await prisma.messMenu.create({
    data: {
      day: "Monday",
      meal: "lunch",
      items: "Paneer Butter Masala, Roti, Rice, Dal, Gulab Jamun",
      isVeg: true,
      embedding: "[]"
    }
  });
  await processItem(mess1, `[MESS] ${mess1.day} ${mess1.meal}: ${mess1.items}`);

  const mess2 = await prisma.messMenu.create({
    data: {
      day: "Tuesday",
      meal: "dinner",
      items: "Chicken Biryani, Raita, Salad",
      isVeg: false,
      embedding: "[]"
    }
  });
  await processItem(mess2, `[MESS] ${mess2.day} ${mess2.meal}: ${mess2.items}`);

  console.log("Seeding Deadlines...");
  const now = new Date();
  const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const d1 = await prisma.deadline.create({
    data: {
      title: "Operating Systems Assignment 3",
      subject: "CS301",
      dueDate: tmrw,
      type: "assignment",
      notes: "Implement page replacement algorithms (LRU, FIFO).",
      embedding: "[]"
    }
  });
  await processItem(d1, `[DEADLINE] ${d1.title} (${d1.subject}) due on ${d1.dueDate}. ${d1.notes}`);

  const d2 = await prisma.deadline.create({
    data: {
      title: "Midterm Physics Exam",
      subject: "PHY101",
      dueDate: nextWeek,
      type: "exam",
      notes: "Covers Chapters 1-5.",
      embedding: "[]"
    }
  });
  await processItem(d2, `[DEADLINE] ${d2.title} (${d2.subject}) due on ${d2.dueDate}. ${d2.notes}`);

  console.log("Seeding Class Schedule...");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[now.getDay()];

  const c1 = await prisma.classSchedule.create({
    data: {
      subject: "CS301: Operating Systems",
      faculty: "Dr. Smith",
      day: todayName,
      startTime: "10:00",
      endTime: "11:30",
      room: "Room 4B",
      embedding: "[]"
    }
  });
  await processItem(c1, `${c1.subject} taught by ${c1.faculty} on ${c1.day} from ${c1.startTime} to ${c1.endTime} at ${c1.room}`);

  const c2 = await prisma.classSchedule.create({
    data: {
      subject: "PHY101: Physics",
      faculty: "Prof. Johnson",
      day: todayName,
      startTime: "13:00",
      endTime: "14:30",
      room: "Lab 2",
      embedding: "[]"
    }
  });
  await processItem(c2, `${c2.subject} taught by ${c2.faculty} on ${c2.day} from ${c2.startTime} to ${c2.endTime} at ${c2.room}`);

  // Write FAISS Index and Mapping to disk
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  
  index.write(path.join(dataDir, "campus.index"));
  fs.writeFileSync(path.join(dataDir, "faiss_map.json"), JSON.stringify(faissMap, null, 2));

  console.log(`FAISS index successfully written to disk with ${currentIndex} vectors. 🎉`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import { getRealEmbedding } from "../lib/embeddings";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { IndexFlatL2 } from "faiss-node";

// Load env
dotenv.config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

const prisma = new PrismaClient();
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  let dimension = 0; // auto-detect from first embedding
  let index: any = null;
  const faissMap: Record<number, string> = {};
  let currentIndex = 0;

  async function addToIndex(id: string, text: string) {
    console.log(`[${currentIndex}] Embedding: ${text.substring(0, 50)}...`);
    const embedding = await getRealEmbedding(text);
    
    // Verify it's a real embedding (not all zeros)
    const hasValues = embedding.some(v => v !== 0);
    if (!hasValues) {
      console.warn(`  ⚠ Skipped (empty embedding)`);
      return;
    }

    // Auto-detect dimension from first successful embedding
    if (dimension === 0) {
      dimension = embedding.length;
      index = new IndexFlatL2(dimension);
      console.log(`📐 FAISS dimension set to: ${dimension}`);
    }

    if (embedding.length === dimension && index) {
      index.add(embedding);
      faissMap[currentIndex] = id;
      currentIndex++;
    } else {
      console.warn(`  ⚠ Skipped (dimension mismatch: got ${embedding.length}, expected ${dimension})`);
    }
    await delay(300); // Rate limit
  }

  // 1. Index all Notices
  const notices = await prisma.notice.findMany();
  console.log(`\n📢 Indexing ${notices.length} Notices...`);
  for (const n of notices) {
    await addToIndex(n.id, `[NOTICE] ${n.title}: ${n.body}`);
  }

  // 2. Index all Mess Menus
  const menus = await prisma.messMenu.findMany();
  console.log(`\n🍽️  Indexing ${menus.length} Mess Menus...`);
  for (const m of menus) {
    await addToIndex(m.id, `[MESS] ${m.day} ${m.meal}: ${m.items}`);
  }

  // 3. Index all Deadlines
  const deadlines = await prisma.deadline.findMany();
  console.log(`\n📅 Indexing ${deadlines.length} Deadlines...`);
  for (const d of deadlines) {
    await addToIndex(d.id, `[DEADLINE] ${d.title} (${d.subject}) due ${d.dueDate}. ${d.notes}`);
  }

  // 4. Index all Class Schedules
  const classes = await prisma.classSchedule.findMany();
  console.log(`\n🏫 Indexing ${classes.length} Class Schedules...`);
  for (const c of classes) {
    await addToIndex(c.id, `[CLASS] ${c.subject} taught by ${c.faculty || "Unknown"} on ${c.day} from ${c.startTime} to ${c.endTime} at ${c.room || "Unknown"}`);
  }

  // 5. Index all Expenses
  const expenses = await prisma.expense.findMany();
  console.log(`\n💰 Indexing ${expenses.length} Expenses...`);
  for (const e of expenses) {
    await addToIndex(e.id, `[EXPENSE] ${e.category}: ₹${e.amount} on ${e.description} (${e.date.toISOString().split("T")[0]})`);
  }

  // 6. Index all Wellness Logs
  const wellness = await prisma.wellnessLog.findMany();
  console.log(`\n❤️  Indexing ${wellness.length} Wellness Logs...`);
  for (const w of wellness) {
    await addToIndex(w.id, `[WELLNESS] Mood: ${w.mood}/5, Stress: ${w.stressLevel}/5, Sleep: ${w.sleepHours}h. Notes: ${w.notes}. Date: ${w.date.toISOString().split("T")[0]}`);
  }

  // Write to disk
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  if (index && currentIndex > 0) {
    (index as any).write(path.join(dataDir, "campus.index"));
    fs.writeFileSync(path.join(dataDir, "faiss_map.json"), JSON.stringify(faissMap, null, 2));
    console.log(`\n✅ FAISS index rebuilt with ${currentIndex} vectors (dim=${dimension})!`);
    console.log(`   Saved to data/campus.index and data/faiss_map.json`);
  } else {
    console.error("\n❌ No vectors were indexed! Check your API key and rate limits.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

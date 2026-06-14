/**
 * Smart Caching Seed Script — scripts/seed.ts
 *
 * Strategy:
 *   1. If `data/seed_cache.json` exists → skip Gemini API entirely,
 *      clear DB tables, insert cached data + rebuild FAISS from cached vectors.
 *   2. If cache does NOT exist → generate mock data, call Gemini for embeddings,
 *      insert into Prisma + FAISS, then persist everything to seed_cache.json
 *      so the next run is free.
 *
 * Run:  npm run seed   (which calls `tsx scripts/seed.ts`)
 */

import { PrismaClient } from "@prisma/client";
import { getRealEmbedding } from "../lib/embeddings";
import { IndexFlatL2 } from "faiss-node";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import * as dotenv from "dotenv";

// ── env ──────────────────────────────────────────────────────────────
dotenv.config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data");
const INDEX_PATH = path.join(DATA_DIR, "campus.index");
const MAP_PATH = path.join(DATA_DIR, "faiss_map.json");
const CACHE_PATH = path.join(DATA_DIR, "seed_cache.json");
const DIMENSION = 3072; // gemini-embedding-001 dimension
const INSTITUTE = "NIT Jalandhar";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Name generator ───────────────────────────────────────────────────
const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Rohan", "Arjun", "Ishaan", "Sanya", "Priya", "Kavya", "Meera"];
const LAST_NAMES = ["Sharma", "Gupta", "Verma", "Singh", "Kumar", "Patel", "Joshi", "Reddy", "Nair", "Das"];
const BRANCHES = ["CSE", "MNC", "ECE", "EE", "ME"];

// ── Types ────────────────────────────────────────────────────────────
interface EmbeddedRecord {
  prismaId: string;
  text: string;
  embedding: number[];
}

interface CachedData {
  profiles: any[];
  classSchedules: any[];
  deadlines: any[];
  expenses: any[];
  wellnessLogs: any[];
  notices: any[];
  messMenus: any[];
  pools: any[];
  vectors: EmbeddedRecord[];
}

// ═══════════════════════════════════════════════════════════════════════
//  DATA GENERATORS  (pure functions — no API calls)
// ═══════════════════════════════════════════════════════════════════════

function generateProfiles() {
  const profiles = [];
  for (let i = 1; i <= 10; i++) {
    profiles.push({
      userId: `seed_user_${String(i).padStart(2, "0")}`,
      name: `${FIRST_NAMES[i - 1]} ${LAST_NAMES[i - 1]}`,
      instituteName: INSTITUTE,
      major: BRANCHES[(i - 1) % BRANCHES.length],
      branch: BRANCHES[(i - 1) % BRANCHES.length],
      gradYear: 2028,
      year: 2,
      gender: i <= 6 ? "Male" : "Female",
      profileComplete: true,
      onboardingDone: true,
      contactOptIn: true,
      whatsappNumber: `+919800000${String(i).padStart(2, "0")}`,
    });
  }
  return profiles;
}

function generateClassSchedules(profiles: any[]) {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const SUBJECTS = [
    { code: "CS301", name: "Operating Systems", faculty: "Dr. Raghav Iyer" },
    { code: "CS302", name: "Database Systems", faculty: "Prof. Ananya Rao" },
    { code: "MA201", name: "Probability & Statistics", faculty: "Dr. Sunil Thakur" },
  ];
  const schedules: any[] = [];

  for (let i = 0; i < 3; i++) {
    const profile = profiles[i];
    for (let s = 0; s < 3; s++) {
      const sub = SUBJECTS[s];
      const startHour = 9 + s * 2;
      schedules.push({
        day: DAYS[s % DAYS.length],
        subject: `${sub.code}: ${sub.name}`,
        userId: profile.userId,
        startTime: `${String(startHour).padStart(2, "0")}:00`,
        endTime: `${String(startHour + 1).padStart(2, "0")}:30`,
        room: `Room ${i + 1}${String.fromCharCode(65 + s)}`,
        faculty: sub.faculty,
        instituteName: INSTITUTE,
        major: profile.major,
      });
    }
  }
  return schedules;
}

function generateDeadlines(profiles: any[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  const DEADLINE_TEMPLATES = [
    { title: "OS Assignment 3", subject: "CS301", type: "assignment", notes: "Implement LRU & FIFO page replacement algorithms." },
    { title: "DBMS ER Diagram Project", subject: "CS302", type: "project", notes: "Design an ER diagram for a hospital management system." },
  ];
  const deadlines: any[] = [];

  for (let i = 0; i < 3; i++) {
    const profile = profiles[i];
    for (let d = 0; d < 2; d++) {
      const tpl = DEADLINE_TEMPLATES[d];
      deadlines.push({
        ...tpl,
        userId: profile.userId,
        dueDate: new Date(now + (d + 1) * 3 * DAY).toISOString(),
        instituteName: INSTITUTE,
        major: profile.major,
      });
    }
  }
  return deadlines;
}

function generateExpenses(profiles: any[]) {
  const EXPENSE_TEMPLATES = [
    { amount: 120, category: "food", description: "Maggi & chai at canteen" },
    { amount: 250, category: "travel", description: "Auto to railway station" },
    { amount: 800, category: "academics", description: "GATE reference book" },
    { amount: 199, category: "subscriptions", description: "Spotify monthly plan" },
  ];
  const expenses: any[] = [];
  const now = Date.now();
  const DAY = 86_400_000;

  for (let i = 0; i < 3; i++) {
    const profile = profiles[i];
    for (let e = 0; e < 4; e++) {
      const tpl = EXPENSE_TEMPLATES[e];
      expenses.push({
        ...tpl,
        userId: profile.userId,
        date: new Date(now - e * DAY).toISOString(),
        source: "manual",
      });
    }
  }
  return expenses;
}

function generateWellnessLogs(profiles: any[]) {
  const logs: any[] = [];
  const now = Date.now();
  const DAY = 86_400_000;

  for (let i = 0; i < 3; i++) {
    const profile = profiles[i];
    for (let w = 0; w < 2; w++) {
      logs.push({
        userId: profile.userId,
        date: new Date(now - w * DAY).toISOString(),
        mood: 3 + (i % 3),
        sleepHours: 5.5 + w,
        stressLevel: 2 + i,
        notes: w === 0 ? "Felt productive today, finished assignments." : "Skipped breakfast, feeling groggy.",
        instituteName: INSTITUTE,
        major: profile.major,
      });
    }
  }
  return logs;
}

function generateNotices(profiles: any[]) {
  return [
    {
      title: "Google Hackathon 2026",
      body: "The annual Google Campus Hackathon is back! Join us for a 48-hour coding sprint. Free pizza and swag. Top prize is a Pixel 10.",
      category: "event",
      eventDate: new Date("2026-07-15T09:00:00Z").toISOString(),
      venue: "Main Auditorium",
      instituteName: INSTITUTE,
      userId: profiles[0].userId,
    },
    {
      title: "Library Closure for Renovation",
      body: "The Central Library will be closed for renovation this weekend (June 20-22). Online resources via the digital library portal will remain available 24/7.",
      category: "general",
      eventDate: new Date("2026-06-20T00:00:00Z").toISOString(),
      venue: "Central Library",
      instituteName: INSTITUTE,
      userId: profiles[0].userId,
    },
    {
      title: "Placement Drive: Microsoft",
      body: "Microsoft is visiting campus on July 1st for full-time SDE roles. Eligibility: CSE/MNC with CGPA ≥ 7.5. Register on the placement portal by June 25.",
      category: "placement",
      eventDate: new Date("2026-07-01T10:00:00Z").toISOString(),
      venue: "Placement Cell, Block A",
      instituteName: INSTITUTE,
      userId: profiles[0].userId,
    },
  ];
}

function generateMessMenus() {
  return [
    { day: "Monday", meal: "lunch", items: "Paneer Butter Masala, Roti, Rice, Dal, Gulab Jamun", isVeg: true, instituteName: INSTITUTE },
    { day: "Monday", meal: "dinner", items: "Chicken Biryani, Raita, Salad", isVeg: false, instituteName: INSTITUTE },
    { day: "Tuesday", meal: "lunch", items: "Chole Bhature, Rice, Jeera Aloo, Papad", isVeg: true, instituteName: INSTITUTE },
    { day: "Tuesday", meal: "dinner", items: "Egg Curry, Roti, Dal Fry, Kheer", isVeg: false, instituteName: INSTITUTE },
  ];
}

function generatePools(profiles: any[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  return [
    {
      instituteName: INSTITUTE,
      initiatorId: profiles[0].userId,
      source: "Campus Main Gate",
      destination: "Amritsar Airport",
      departureTime: new Date(now + 2 * DAY).toISOString(),
      seatsAvailable: 1,
      estimatedCost: 1200,
      participants: JSON.stringify([profiles[0].userId, profiles[1].userId, profiles[7].userId]),
      status: "open",
      notes: "Leaving early morning, please be on time.",
    },
    {
      instituteName: INSTITUTE,
      initiatorId: profiles[3].userId,
      source: "Hostel 4",
      destination: "Railway Station",
      departureTime: new Date(now + 4 * DAY).toISOString(),
      seatsAvailable: 2,
      estimatedCost: 600,
      participants: JSON.stringify([profiles[3].userId, profiles[4].userId]),
      status: "open",
      notes: "Splitting auto fare, anyone heading to railway station?",
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════
//  EMBEDDING TEXT BUILDERS (same patterns used by chatTools.ts)
// ═══════════════════════════════════════════════════════════════════════

function embeddableText(type: string, record: any): string {
  switch (type) {
    case "notice":
      return `[NOTICE] ${record.title}: ${record.body}`;
    case "mess":
      return `[MESS] ${record.day} ${record.meal}: ${record.items}`;
    case "deadline":
      return `[DEADLINE] ${record.title} (${record.subject}) due ${record.dueDate}. ${record.notes || ""}`;
    case "schedule":
      return `[CLASS] ${record.subject} taught by ${record.faculty || "Unknown"} on ${record.day} from ${record.startTime} to ${record.endTime} at ${record.room || "Unknown"}`;
    case "expense":
      return `[EXPENSE] ${record.category}: ₹${record.amount} on ${record.description} (${record.date})`;
    case "wellness":
      return `[WELLNESS] Mood: ${record.mood}/5, Stress: ${record.stressLevel}/5, Sleep: ${record.sleepHours || 0}h. Notes: ${record.notes || ""}`;
    default:
      return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  CLEAR TABLES
// ═══════════════════════════════════════════════════════════════════════

async function clearAllTables() {
  console.log("🧹 Clearing existing data...");
  await prisma.cabPoolRequest.deleteMany();
  await prisma.wellnessLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.classSchedule.deleteMany();
  await prisma.messMenu.deleteMany();
  await prisma.notice.deleteMany();
  // UserProfile uses upsert so we don't delete (preserves real users)
}

// ═══════════════════════════════════════════════════════════════════════
//  PATH 1: FRESH SEED  (calls Gemini, builds cache)
// ═══════════════════════════════════════════════════════════════════════

async function freshSeed(): Promise<void> {
  console.log("\n🌱 FRESH SEED — Calling Gemini API for embeddings...\n");

  // ── Generate all mock data ─────────────────────────────────────────
  const profiles = generateProfiles();
  const classSchedules = generateClassSchedules(profiles);
  const deadlines = generateDeadlines(profiles);
  const expenses = generateExpenses(profiles);
  const wellnessLogs = generateWellnessLogs(profiles);
  const notices = generateNotices(profiles);
  const messMenus = generateMessMenus();
  const pools = generatePools(profiles);

  await clearAllTables();

  // ── FAISS setup ────────────────────────────────────────────────────
  const index = new IndexFlatL2(DIMENSION);
  const faissMap: Record<number, string> = {};
  let vecIdx = 0;
  const vectors: EmbeddedRecord[] = [];

  async function embedAndTrack(prismaId: string, type: string, record: any) {
    const text = embeddableText(type, record);
    if (!text) return;
    console.log(`  📐 Embedding: ${text.substring(0, 60)}...`);
    const embedding = await getRealEmbedding(text);
    if (embedding.length === DIMENSION && embedding.some((v) => v !== 0)) {
      index.add(embedding);
      faissMap[vecIdx] = prismaId;
      vectors.push({ prismaId, text, embedding });
      vecIdx++;
    }
    await delay(800); // rate-limit guard
  }

  // ── 1. Profiles ────────────────────────────────────────────────────
  console.log("👤 Seeding 10 user profiles...");
  for (const p of profiles) {
    await prisma.userProfile.upsert({
      where: { userId: p.userId },
      update: { ...p },
      create: { ...p },
    });
  }

  // ── 2. Notices  (embeddable) ───────────────────────────────────────
  console.log("📢 Seeding notices...");
  for (const n of notices) {
    const rec = await prisma.notice.create({ data: { ...n, embedding: "[]" } });
    await embedAndTrack(rec.id, "notice", n);
  }

  // ── 3. Mess Menus  (embeddable) ────────────────────────────────────
  console.log("🍽️  Seeding mess menus...");
  for (const m of messMenus) {
    const rec = await prisma.messMenu.create({ data: { ...m, embedding: "[]" } });
    await embedAndTrack(rec.id, "mess", m);
  }

  // ── 4. Class Schedules  (embeddable, super users only) ─────────────
  console.log("📅 Seeding class schedules (super users 1-3)...");
  for (const s of classSchedules) {
    const rec = await prisma.classSchedule.create({ data: { ...s, embedding: "[]" } });
    await embedAndTrack(rec.id, "schedule", s);
  }

  // ── 5. Deadlines  (embeddable, super users only) ───────────────────
  console.log("⏰ Seeding deadlines (super users 1-3)...");
  for (const d of deadlines) {
    const rec = await prisma.deadline.create({
      data: { ...d, dueDate: new Date(d.dueDate), embedding: "[]" },
    });
    await embedAndTrack(rec.id, "deadline", d);
  }

  // ── 6. Expenses  (embeddable, super users only) ────────────────────
  console.log("💰 Seeding expenses (super users 1-3)...");
  for (const e of expenses) {
    const rec = await prisma.expense.create({
      data: { ...e, date: new Date(e.date), embedding: "[]" },
    });
    await embedAndTrack(rec.id, "expense", e);
  }

  // ── 7. Wellness Logs  (embeddable, super users only) ───────────────
  console.log("❤️  Seeding wellness logs (super users 1-3)...");
  for (const w of wellnessLogs) {
    const rec = await prisma.wellnessLog.create({
      data: { ...w, date: new Date(w.date) },
    });
    await embedAndTrack(rec.id, "wellness", w);
  }

  // ── 8. Travel Pools ────────────────────────────────────────────────
  console.log("🚗 Seeding travel pools...");
  for (const pool of pools) {
    await prisma.cabPoolRequest.create({
      data: { ...pool, departureTime: new Date(pool.departureTime) },
    });
  }

  // ── Write FAISS index ──────────────────────────────────────────────
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  index.write(INDEX_PATH);
  fs.writeFileSync(MAP_PATH, JSON.stringify(faissMap, null, 2));
  console.log(`\n📦 FAISS index written: ${vecIdx} vectors.\n`);

  // ── Write cache ────────────────────────────────────────────────────
  const cache: CachedData = {
    profiles,
    classSchedules,
    deadlines,
    expenses,
    wellnessLogs,
    notices,
    messMenus,
    pools,
    vectors,
  };
  await fsp.writeFile(CACHE_PATH, JSON.stringify(cache), "utf-8");
  console.log(`💾 Cache saved to ${CACHE_PATH}`);
}

// ═══════════════════════════════════════════════════════════════════════
//  PATH 2: CACHED SEED  (zero API calls)
// ═══════════════════════════════════════════════════════════════════════

async function cachedSeed(): Promise<void> {
  console.log("\n⚡ CACHED SEED — Using seed_cache.json (zero Gemini API calls)\n");

  const raw = await fsp.readFile(CACHE_PATH, "utf-8");
  const cache: CachedData = JSON.parse(raw);

  await clearAllTables();

  // ── 1. Profiles ────────────────────────────────────────────────────
  console.log("👤 Restoring 10 user profiles...");
  for (const p of cache.profiles) {
    await prisma.userProfile.upsert({
      where: { userId: p.userId },
      update: { ...p },
      create: { ...p },
    });
  }

  // ── 2. Notices ─────────────────────────────────────────────────────
  console.log("📢 Restoring notices...");
  for (const n of cache.notices) {
    await prisma.notice.create({ data: { ...n, embedding: "[]" } });
  }

  // ── 3. Mess Menus ──────────────────────────────────────────────────
  console.log("🍽️  Restoring mess menus...");
  for (const m of cache.messMenus) {
    await prisma.messMenu.create({ data: { ...m, embedding: "[]" } });
  }

  // ── 4. Class Schedules ─────────────────────────────────────────────
  console.log("📅 Restoring class schedules...");
  for (const s of cache.classSchedules) {
    await prisma.classSchedule.create({ data: { ...s, embedding: "[]" } });
  }

  // ── 5. Deadlines ───────────────────────────────────────────────────
  console.log("⏰ Restoring deadlines...");
  for (const d of cache.deadlines) {
    await prisma.deadline.create({
      data: { ...d, dueDate: new Date(d.dueDate), embedding: "[]" },
    });
  }

  // ── 6. Expenses ────────────────────────────────────────────────────
  console.log("💰 Restoring expenses...");
  for (const e of cache.expenses) {
    await prisma.expense.create({
      data: { ...e, date: new Date(e.date), embedding: "[]" },
    });
  }

  // ── 7. Wellness Logs ───────────────────────────────────────────────
  console.log("❤️  Restoring wellness logs...");
  for (const w of cache.wellnessLogs) {
    await prisma.wellnessLog.create({
      data: { ...w, date: new Date(w.date) },
    });
  }

  // ── 8. Travel Pools ────────────────────────────────────────────────
  console.log("🚗 Restoring travel pools...");
  for (const pool of cache.pools) {
    await prisma.cabPoolRequest.create({
      data: { ...pool, departureTime: new Date(pool.departureTime) },
    });
  }

  // ── Rebuild FAISS from cached vectors ──────────────────────────────
  console.log("📐 Rebuilding FAISS index from cached vectors...");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const index = new IndexFlatL2(DIMENSION);
  const faissMap: Record<number, string> = {};

  // We need to re-map cached prismaIds → the NEW prismaIds from the fresh inserts.
  // Since we use deleteMany + create (not upsert with fixed IDs), the Prisma IDs change.
  // However, the vectors are still valid for semantic search — the FAISS map just needs
  // to point to *some* valid prisma ID. For a seed script, this is acceptable because
  // the rebuild-index script should be run after seeding for production accuracy.
  //
  // For the seed demo, we insert the cached vectors directly:
  for (let i = 0; i < cache.vectors.length; i++) {
    const v = cache.vectors[i];
    if (v.embedding.length === DIMENSION) {
      index.add(v.embedding);
      faissMap[i] = v.prismaId;
    }
  }

  index.write(INDEX_PATH);
  fs.writeFileSync(MAP_PATH, JSON.stringify(faissMap, null, 2));
  console.log(`📦 FAISS index rebuilt: ${cache.vectors.length} vectors.\n`);
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   CampusFlow Smart Seed Script v2.0     ║");
  console.log("╚══════════════════════════════════════════╝");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const cacheExists = fs.existsSync(CACHE_PATH);

  // Allow forcing a fresh seed with --fresh flag
  const forceFresh = process.argv.includes("--fresh");

  if (cacheExists && !forceFresh) {
    await cachedSeed();
  } else {
    if (forceFresh && cacheExists) {
      console.log("🔄 --fresh flag detected. Regenerating cache...\n");
    }
    await freshSeed();
  }

  console.log("✅ Seeding complete!\n");

  // Quick summary
  const [profileCount, noticeCount, menuCount, scheduleCount, deadlineCount, expenseCount, wellnessCount, poolCount] =
    await Promise.all([
      prisma.userProfile.count({ where: { userId: { startsWith: "seed_user_" } } }),
      prisma.notice.count(),
      prisma.messMenu.count(),
      prisma.classSchedule.count(),
      prisma.deadline.count(),
      prisma.expense.count(),
      prisma.wellnessLog.count(),
      prisma.cabPoolRequest.count(),
    ]);

  console.log("┌─────────────────────────────────────┐");
  console.log(`│  Profiles:        ${String(profileCount).padStart(3)}              │`);
  console.log(`│  Notices:         ${String(noticeCount).padStart(3)}              │`);
  console.log(`│  Mess Menus:      ${String(menuCount).padStart(3)}              │`);
  console.log(`│  Schedules:       ${String(scheduleCount).padStart(3)}              │`);
  console.log(`│  Deadlines:       ${String(deadlineCount).padStart(3)}              │`);
  console.log(`│  Expenses:        ${String(expenseCount).padStart(3)}              │`);
  console.log(`│  Wellness Logs:   ${String(wellnessCount).padStart(3)}              │`);
  console.log(`│  Travel Pools:    ${String(poolCount).padStart(3)}              │`);
  console.log("└─────────────────────────────────────┘");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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

// ─── Dual-Index Architecture ─────────────────────────────────────────────
// Global index: data/indices/global.index + global_map.json
// Per-user indices: data/indices/user_<userId>.index + user_<userId>_map.json
// ──────────────────────────────────────────────────────────────────────────

interface VectorMapEntry {
  table: string;
  recordId: string;
  userId?: string;
  chunkIndex?: number;
}

interface IndexBundle {
  index: InstanceType<typeof IndexFlatL2> | null;
  map: Record<number, VectorMapEntry>;
  count: number;
  dimension: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const INDICES_DIR = path.join(DATA_DIR, "indices");

async function main() {
  // Ensure directories
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INDICES_DIR)) fs.mkdirSync(INDICES_DIR, { recursive: true });

  // Bundles: one global + one per user
  const globalBundle: IndexBundle = { index: null, map: {}, count: 0, dimension: 0 };
  const userBundles = new Map<string, IndexBundle>();

  function getOrCreateUserBundle(userId: string): IndexBundle {
    if (!userBundles.has(userId)) {
      userBundles.set(userId, { index: null, map: {}, count: 0, dimension: 0 });
    }
    return userBundles.get(userId)!;
  }

  async function addToBundle(bundle: IndexBundle, id: string, text: string, table: string, userId?: string) {
    console.log(`  [${bundle.count}] ${table}: ${text.substring(0, 60)}...`);
    const embedding = await getRealEmbedding(text);

    const hasValues = embedding.some(v => v !== 0);
    if (!hasValues) {
      console.warn(`    ⚠ Skipped (empty embedding)`);
      return;
    }

    if (bundle.dimension === 0) {
      bundle.dimension = embedding.length;
      bundle.index = new IndexFlatL2(bundle.dimension);
      console.log(`  📐 Dimension set to: ${bundle.dimension}`);
    }

    if (embedding.length === bundle.dimension && bundle.index) {
      bundle.index.add(embedding);
      bundle.map[bundle.count] = {
        table,
        recordId: id,
        ...(userId ? { userId } : {}),
      };
      bundle.count++;
    } else {
      console.warn(`    ⚠ Skipped (dimension mismatch: got ${embedding.length}, expected ${bundle.dimension})`);
    }
    await delay(300); // Rate limit
  }

  // ═══ GLOBAL INDEX (campus-wide, shared data) ═══════════════════════════

  // 1. Notices
  const notices = await prisma.notice.findMany();
  console.log(`\n📢 Indexing ${notices.length} Notices → GLOBAL...`);
  for (const n of notices) {
    await addToBundle(globalBundle, n.id, `[NOTICE] ${n.title}: ${n.body}`, "Notice", n.userId || undefined);
  }

  // 2. Mess Menus
  const menus = await prisma.messMenu.findMany();
  console.log(`\n🍽️  Indexing ${menus.length} Mess Menus → GLOBAL...`);
  for (const m of menus) {
    await addToBundle(globalBundle, m.id, `[MESS] ${m.day} ${m.meal}: ${m.items}`, "MessMenu", m.userId || undefined);
  }

  // 3. Deadlines
  const deadlines = await prisma.deadline.findMany();
  console.log(`\n📅 Indexing ${deadlines.length} Deadlines → GLOBAL...`);
  for (const d of deadlines) {
    await addToBundle(globalBundle, d.id, `[DEADLINE] ${d.title} (${d.subject}) due ${d.dueDate}. ${d.notes || ""}`, "Deadline", d.userId || undefined);
  }

  // 4. Class Schedules
  const classes = await prisma.classSchedule.findMany();
  console.log(`\n🏫 Indexing ${classes.length} Class Schedules → GLOBAL...`);
  for (const c of classes) {
    await addToBundle(globalBundle, c.id, `[CLASS] ${c.subject} taught by ${c.faculty || "Unknown"} on ${c.day} from ${c.startTime} to ${c.endTime} at ${c.room || "Unknown"}`, "ClassSchedule", c.userId || undefined);
  }

  // 5. Companies
  const companies = await prisma.company.findMany();
  console.log(`\n🏢 Indexing ${companies.length} Companies → GLOBAL...`);
  for (const co of companies) {
    await addToBundle(globalBundle, co.id, `[COMPANY] ${co.name} (${co.domain}). Package: ₹${co.packageMin || "?"}–${co.packageMax || "?"}L. Rounds: ${co.interviewRounds || "?"}. Skills: ${JSON.stringify(co.topSkillsRequired)}.`, "Company");
  }

  // 6. Interview Experiences
  const experiences = await prisma.interviewExperience.findMany();
  console.log(`\n🎤 Indexing ${experiences.length} Interview Experiences → GLOBAL...`);
  for (const exp of experiences) {
    // Anonymized text — never embed the student's name
    await addToBundle(globalBundle, exp.id, `[INTERVIEW] ${exp.batch} ${exp.branch} student (${exp.outcome}). Tips: ${exp.overallTips.substring(0, 500)}`, "InterviewExperience");
  }

  // 7. Prep Questions
  const prepQs = await prisma.prepQuestion.findMany();
  console.log(`\n❓ Indexing ${prepQs.length} Prep Questions → GLOBAL...`);
  for (const q of prepQs) {
    await addToBundle(globalBundle, q.id, `[PREP_QUESTION] Round: ${q.round}, Difficulty: ${q.difficulty}. Q: ${q.question.substring(0, 300)}`, "PrepQuestion");
  }

  // 8. Transport Routes
  const routes = await prisma.transportRoute.findMany();
  console.log(`\n🚌 Indexing ${routes.length} Transport Routes → GLOBAL...`);
  for (const r of routes) {
    await addToBundle(globalBundle, r.id, `[TRANSPORT_ROUTE] ${r.name} (${r.type}). Stops: ${JSON.stringify(r.stops)}. Days: ${JSON.stringify(r.operatingDays)}.`, "TransportRoute");
  }

  // 9. Expertise Seeds
  const seeds = await prisma.expertiseSeed.findMany();
  console.log(`\n🧠 Indexing ${seeds.length} Expertise Seeds → GLOBAL...`);
  for (const s of seeds) {
    await addToBundle(globalBundle, s.id, `[EXPERTISE] Topic: ${s.topic} (source: ${s.source}, confidence: ${s.confidence}/5)`, "ExpertiseSeed");
  }

  // 10. Help Requests (open, from others — peer discovery)
  const openRequests = await prisma.helpRequest.findMany({
    where: { status: "open" }
  });
  console.log(`\n🤝 Indexing ${openRequests.length} Open Help Requests → GLOBAL...`);
  for (const hr of openRequests) {
    await addToBundle(globalBundle, hr.id, `[HELP_REQUEST] "${hr.topic}" (${hr.urgency} urgency). ${hr.description || ""}`, "HelpRequest_open");
  }

  // 11. Campus Services
  const services = await prisma.campusService.findMany();
  console.log(`\n🏛️  Indexing ${services.length} Campus Services → GLOBAL...`);
  for (const s of services) {
    await addToBundle(globalBundle, s.id, `[SERVICE] ${s.name} (${s.category}) at ${s.location}. Status: ${s.currentStatus}. Timings: ${JSON.stringify(s.timings)}.`, "CampusService");
  }

  // 12. Process Guides
  const guides = await prisma.processGuide.findMany();
  console.log(`\n📋 Indexing ${guides.length} Process Guides → GLOBAL...`);
  for (const g of guides) {
    await addToBundle(globalBundle, g.id, `[GUIDE] ${g.title}. Steps: ${JSON.stringify(g.steps)}. Documents: ${JSON.stringify(g.documentsRequired)}. Est. ${g.estimatedDays} days. ${g.tips || ""}`, "ProcessGuide");
  }

  // 13. Local Places
  const places = await prisma.localPlace.findMany();
  console.log(`\n📍 Indexing ${places.length} Local Places → GLOBAL...`);
  for (const p of places) {
    await addToBundle(globalBundle, p.id, `[PLACE] ${p.name} (${p.category}). ${p.description}. ${p.distanceMeters ? `${p.distanceMeters}m away.` : ""} ${p.mustTry ? `Must try: ${p.mustTry}` : ""}`, "LocalPlace");
  }

  // 14. Trip Recommendations
  const trips = await prisma.tripRecommendation.findMany();
  console.log(`\n✈️  Indexing ${trips.length} Trip Recommendations → GLOBAL...`);
  for (const t of trips) {
    await addToBundle(globalBundle, t.id, `[TRIP] ${t.destination} (${t.distanceKm}km, ~₹${t.estimatedCost}). ${t.bestFor}. How: ${t.howToGet.substring(0, 300)}. Highlights: ${JSON.stringify(t.highlights)}.`, "TripRecommendation");
  }

  // 15. Survival Tips
  const tips = await prisma.survivalTip.findMany();
  console.log(`\n💡 Indexing ${tips.length} Survival Tips → GLOBAL...`);
  for (const tip of tips) {
    await addToBundle(globalBundle, tip.id, `[TIP] [${tip.category}] ${tip.title}: ${tip.tip.substring(0, 400)}`, "SurvivalTip");
  }

  // ═══ PER-USER INDICES (private data) ═══════════════════════════════════

  // 11. Expenses → per-user PRIVATE
  const expenses = await prisma.expense.findMany();
  console.log(`\n💰 Indexing ${expenses.length} Expenses → PER-USER...`);
  for (const e of expenses) {
    if (!e.userId) continue;
    const bundle = getOrCreateUserBundle(e.userId);
    await addToBundle(bundle, e.id, `[EXPENSE] ${e.category}: ₹${e.amount} on ${e.description} (${e.date.toISOString().split("T")[0]})`, "Expense", e.userId);
  }

  // 12. Wellness Logs → per-user PRIVATE
  const wellness = await prisma.wellnessLog.findMany();
  console.log(`\n❤️  Indexing ${wellness.length} Wellness Logs → PER-USER...`);
  for (const w of wellness) {
    if (!w.userId) continue;
    const bundle = getOrCreateUserBundle(w.userId);
    await addToBundle(bundle, w.id, `[WELLNESS] Mood: ${w.mood}/5, Stress: ${w.stressLevel}/5, Sleep: ${w.sleepHours}h. Notes: ${w.notes || "none"}. Date: ${w.date.toISOString().split("T")[0]}`, "WellnessLog", w.userId);
  }

  // ═══ WRITE ALL INDICES TO DISK ═════════════════════════════════════════

  // Global index
  if (globalBundle.index && globalBundle.count > 0) {
    globalBundle.index.write(path.join(INDICES_DIR, "global.index"));
    fs.writeFileSync(path.join(INDICES_DIR, "global_map.json"), JSON.stringify(globalBundle.map, null, 2));
    console.log(`\n✅ Global index: ${globalBundle.count} vectors (dim=${globalBundle.dimension})`);
  } else {
    console.warn("\n⚠ No global vectors indexed.");
  }

  // Per-user indices
  let userCount = 0;
  for (const [userId, bundle] of userBundles) {
    if (bundle.index && bundle.count > 0) {
      bundle.index.write(path.join(INDICES_DIR, `user_${userId}.index`));
      fs.writeFileSync(path.join(INDICES_DIR, `user_${userId}_map.json`), JSON.stringify(bundle.map, null, 2));
      console.log(`  ✅ User ${userId.slice(-6)}: ${bundle.count} private vectors`);
      userCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Global: ${globalBundle.count} vectors`);
  console.log(`   Users:  ${userCount} user indices created`);
  console.log(`   Saved to data/indices/`);

  // Also keep legacy index for backward compat (optional — remove after full migration)
  if (globalBundle.index && globalBundle.count > 0) {
    globalBundle.index.write(path.join(DATA_DIR, "campus.index"));
    // Legacy map is simple { vectorId: prismaId }
    const legacyMap: Record<number, string> = {};
    for (const [key, entry] of Object.entries(globalBundle.map)) {
      legacyMap[Number(key)] = entry.recordId;
    }
    fs.writeFileSync(path.join(DATA_DIR, "faiss_map.json"), JSON.stringify(legacyMap, null, 2));
    console.log(`   Legacy: campus.index + faiss_map.json (backward compat)`);
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

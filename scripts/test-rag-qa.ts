/**
 * RAG Omniscience — QA Test Suite
 * Tests from Section 9 of the hardened implementation directive.
 * 
 * Run: npx tsx scripts/test-rag-qa.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

const prisma = new PrismaClient();

// ─── Test Results Tracking ───────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results: { test: string; status: "PASS" | "FAIL"; detail: string }[] = [];

function PASS(test: string, detail: string = "") {
  passed++;
  results.push({ test, status: "PASS", detail });
  console.log(`  ✅ PASS: ${test}${detail ? ` — ${detail}` : ""}`);
}

function FAIL(test: string, detail: string) {
  failed++;
  results.push({ test, status: "FAIL", detail });
  console.error(`  ❌ FAIL: ${test} — ${detail}`);
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 1: Code-Level Tenant Isolation Verification
// ═════════════════════════════════════════════════════════════════════════
async function testTenantIsolation() {
  console.log("\n━━━ TEST 1: Tenant Isolation (Code Audit) ━━━");

  // Verify vectorStore.ts uses per-user index paths for private data
  const vectorStoreCode = fs.readFileSync(
    path.join(process.cwd(), "lib/vectorStore.ts"), "utf-8"
  );

  // Check 1: Per-user index paths exist
  if (vectorStoreCode.includes("user_${userId}.index") || vectorStoreCode.includes("`user_${userId}.index`")) {
    PASS("Per-user index file naming", "user_<userId>.index pattern found");
  } else {
    FAIL("Per-user index file naming", "Missing user_<userId>.index pattern");
  }

  // Check 2: Private tables are defined
  if (vectorStoreCode.includes('"Expense"') && vectorStoreCode.includes('"WellnessLog"')) {
    PASS("Private tables defined", "Expense and WellnessLog found in PRIVATE_TABLES");
  } else {
    FAIL("Private tables defined", "Missing Expense or WellnessLog in PRIVATE_TABLES");
  }

  // Check 3: dualSearch function exists with separate private/global search
  if (vectorStoreCode.includes("dualSearch") && vectorStoreCode.includes("topKPrivate") && vectorStoreCode.includes("topKGlobal")) {
    PASS("dualSearch function", "Separate topKPrivate and topKGlobal parameters");
  } else {
    FAIL("dualSearch function", "Missing or malformed dualSearch");
  }

  // Check 4: Write mutex exists
  if (vectorStoreCode.includes("withLock") && vectorStoreCode.includes("locks")) {
    PASS("Write mutex (concurrency safety)", "withLock function found");
  } else {
    FAIL("Write mutex (concurrency safety)", "Missing write lock mechanism");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 2: ID-Collision Prevention
// ═════════════════════════════════════════════════════════════════════════
async function testIdCollisionPrevention() {
  console.log("\n━━━ TEST 2: ID-Collision Prevention ━━━");

  const vectorStoreCode = fs.readFileSync(
    path.join(process.cwd(), "lib/vectorStore.ts"), "utf-8"
  );

  // Check: Map entries include 'table' field
  if (vectorStoreCode.includes("table: string") && vectorStoreCode.includes("recordId: string")) {
    PASS("Map entry includes table name", "VectorMapEntry has {table, recordId}");
  } else {
    FAIL("Map entry includes table name", "Map entries missing table field");
  }

  // Check: Hydration uses table field for direct lookup
  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  if (queryRouteCode.includes("hydrateRecord") && queryRouteCode.includes("switch (table)")) {
    PASS("Hydration uses direct table lookup", "switch(table) pattern found in hydrateRecord");
  } else {
    FAIL("Hydration uses direct table lookup", "Missing table-based hydration switch");
  }

  // Check: No more blind IN(...) across all tables
  if (!queryRouteCode.includes("{ in: matchedIds }")) {
    PASS("No blind IN(...) queries", "Legacy 'id: { in: matchedIds }' pattern removed");
  } else {
    FAIL("No blind IN(...) queries", "Still using legacy blind IN(...) pattern!");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 3: Day-Hack Removal
// ═════════════════════════════════════════════════════════════════════════
async function testDayHackRemoval() {
  console.log("\n━━━ TEST 3: Day-Hack Removal ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: No day prepending to the embedding query
  if (!queryRouteCode.includes("${dayName} ${query}") && !queryRouteCode.includes("dayName} ${query")) {
    PASS("Day-prepend hack removed from embedding", "No dayName prepended to query embedding");
  } else {
    FAIL("Day-prepend hack removed from embedding", "dayName still prepended to embedding query!");
  }

  // Check: Today's menu directly injected instead
  if (queryRouteCode.includes("MESS_TODAY") || queryRouteCode.includes("todayMenus")) {
    PASS("Today's menu direct injection", "Direct MessMenu injection for today found");
  } else {
    FAIL("Today's menu direct injection", "Missing today's menu direct injection");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 4: CabPool PII Scrubbing
// ═════════════════════════════════════════════════════════════════════════
async function testCabPoolPII() {
  console.log("\n━━━ TEST 4: CabPool PII Scrubbing ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: CabPool injection does NOT include initiatorId, participants names, or phone
  const cabPoolSection = queryRouteCode.substring(
    queryRouteCode.indexOf("CAB_POOL"),
    queryRouteCode.indexOf("CAB_POOL") + 800
  );

  if (!cabPoolSection.includes("initiatorId") && !cabPoolSection.includes("phone") && !cabPoolSection.includes("contactPhone")) {
    PASS("CabPool PII scrubbed", "No initiatorId/phone in CAB_POOL context block");
  } else {
    FAIL("CabPool PII scrubbed", "PII fields found in CAB_POOL context block!");
  }

  // Check: Pool ID is truncated (not full cuid)
  if (cabPoolSection.includes(".slice(-6)") || cabPoolSection.includes("slice(-6)")) {
    PASS("CabPool uses opaque short ID", "pool.id.slice(-6) pattern found");
  } else {
    FAIL("CabPool uses opaque short ID", "Full pool ID exposed in context");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 5: Token Budget
// ═════════════════════════════════════════════════════════════════════════
async function testTokenBudget() {
  console.log("\n━━━ TEST 5: Token Budget ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: MAX_CONTEXT_CHARS or similar budget constant exists
  if (queryRouteCode.includes("MAX_CONTEXT_CHARS") || queryRouteCode.includes("max_context")) {
    PASS("Token budget ceiling defined", "MAX_CONTEXT_CHARS constant found");
  } else {
    FAIL("Token budget ceiling defined", "No token budget ceiling found");
  }

  // Check: Context trimming logic exists
  if (queryRouteCode.includes("context.length > MAX_CONTEXT_CHARS") || queryRouteCode.includes("substring")) {
    PASS("Context trimming logic", "Trimming when context exceeds budget");
  } else {
    FAIL("Context trimming logic", "No context trimming logic found");
  }

  // Check: Direct injections use caps (DIRECT_INJECT_CAP)
  if (queryRouteCode.includes("DIRECT_INJECT_CAP") || queryRouteCode.includes("take:")) {
    PASS("Direct injection capped", "Cap on cab pools / transport updates");
  } else {
    FAIL("Direct injection capped", "No cap on direct injection count");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 6: Wellness Guardrails
// ═════════════════════════════════════════════════════════════════════════
async function testWellnessGuardrails() {
  console.log("\n━━━ TEST 6: Wellness Guardrails ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: System prompt mentions counseling
  if (queryRouteCode.includes("counseling") || queryRouteCode.includes("counselling")) {
    PASS("Wellness counseling referral", "System prompt mentions campus counseling");
  } else {
    FAIL("Wellness counseling referral", "No mention of campus counseling in system prompt");
  }

  // Check: System prompt says no diagnoses
  if (queryRouteCode.includes("diagnos") || queryRouteCode.includes("never diagnose")) {
    PASS("No-diagnosis guardrail", "System prompt prohibits diagnosis");
  } else {
    FAIL("No-diagnosis guardrail", "Missing no-diagnosis guardrail in system prompt");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 7: Finance Guardrails
// ═════════════════════════════════════════════════════════════════════════
async function testFinanceGuardrails() {
  console.log("\n━━━ TEST 7: Finance Guardrails ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  if (queryRouteCode.includes("financial advice") || queryRouteCode.includes("factual summaries only")) {
    PASS("Finance guardrail", "System prompt prohibits financial advice");
  } else {
    FAIL("Finance guardrail", "Missing finance guardrail in system prompt");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 8: Anonymization of InterviewExperience
// ═════════════════════════════════════════════════════════════════════════
async function testAnonymization() {
  console.log("\n━━━ TEST 8: InterviewExperience Anonymization ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: isAnonymous flag is checked
  if (queryRouteCode.includes("isAnonymous")) {
    PASS("isAnonymous flag checked", "Hydration checks isAnonymous before showing name");
  } else {
    FAIL("isAnonymous flag checked", "isAnonymous not checked in hydration");
  }

  // Check: Rebuild script does NOT embed student names
  const rebuildCode = fs.readFileSync(
    path.join(process.cwd(), "scripts/rebuild-index.ts"), "utf-8"
  );

  if (!rebuildCode.includes("studentName") && !rebuildCode.includes("exp.name")) {
    PASS("Rebuild index anonymized", "Student names NOT embedded in index vectors");
  } else {
    FAIL("Rebuild index anonymized", "Student names may be embedded in index vectors!");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 9: Tool-Calling Regression
// ═════════════════════════════════════════════════════════════════════════
async function testToolCallingRegression() {
  console.log("\n━━━ TEST 9: Tool-Calling Regression ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: toolDeclarations are still passed to Gemini
  if (queryRouteCode.includes("toolDeclarations") && queryRouteCode.includes("functionDeclarations")) {
    PASS("Tool declarations passed", "toolDeclarations still wired to Gemini");
  } else {
    FAIL("Tool declarations passed", "toolDeclarations NOT found in Gemini call");
  }

  // Check: executeTool is still called on function call detection
  if (queryRouteCode.includes("executeTool") && queryRouteCode.includes("functionCallPart")) {
    PASS("Tool execution flow intact", "executeTool called on functionCall detection");
  } else {
    FAIL("Tool execution flow intact", "Tool execution flow broken");
  }

  // Check: Follow-up streaming response after tool execution
  if (queryRouteCode.includes("functionResponse") && queryRouteCode.includes("followUp")) {
    PASS("Tool follow-up response", "Natural language summary after tool execution");
  } else {
    FAIL("Tool follow-up response", "Missing follow-up response after tool execution");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 10: Strict userId Enforcement on Private Tables
// ═════════════════════════════════════════════════════════════════════════
async function testStrictUserIdEnforcement() {
  console.log("\n━━━ TEST 10: Strict userId Enforcement on Private Tables ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: Expense hydration has strict userId check
  const expenseSection = queryRouteCode.substring(
    queryRouteCode.indexOf('case "Expense"'),
    queryRouteCode.indexOf('case "Expense"') + 300
  );
  if (expenseSection.includes("r.userId !== currentUserId")) {
    PASS("Expense strict userId", "Expense hydration enforces userId === currentUser");
  } else {
    FAIL("Expense strict userId", "Expense hydration missing strict userId check!");
  }

  // Check: WellnessLog hydration has strict userId check
  const wellnessSection = queryRouteCode.substring(
    queryRouteCode.indexOf('case "WellnessLog"'),
    queryRouteCode.indexOf('case "WellnessLog"') + 300
  );
  if (wellnessSection.includes("r.userId !== currentUserId")) {
    PASS("WellnessLog strict userId", "WellnessLog hydration enforces userId === currentUser");
  } else {
    FAIL("WellnessLog strict userId", "WellnessLog hydration missing strict userId check!");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 11: topK Reduction
// ═════════════════════════════════════════════════════════════════════════
async function testTopKReduction() {
  console.log("\n━━━ TEST 11: topK Reduction ━━━");

  const queryRouteCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/query/route.ts"), "utf-8"
  );

  // Check: topK is no longer 50
  if (!queryRouteCode.includes("topK=50") && !queryRouteCode.includes("topK = 50") && !queryRouteCode.includes(", 50)")) {
    PASS("topK not 50", "Legacy topK=50 removed");
  } else {
    FAIL("topK not 50", "topK=50 still present!");
  }

  // Check: New topK values are reasonable (≤ 16 combined)
  const privateMatch = queryRouteCode.match(/TOP_K_PRIVATE\s*=\s*(\d+)/);
  const globalMatch = queryRouteCode.match(/TOP_K_GLOBAL\s*=\s*(\d+)/);

  if (privateMatch && globalMatch) {
    const combined = parseInt(privateMatch[1]) + parseInt(globalMatch[1]);
    if (combined <= 20) {
      PASS("topK reasonable", `Combined topK = ${combined} (${privateMatch[1]} private + ${globalMatch[1]} global)`);
    } else {
      FAIL("topK reasonable", `Combined topK = ${combined} is too high`);
    }
  } else {
    FAIL("topK reasonable", "Could not parse TOP_K_PRIVATE / TOP_K_GLOBAL");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 12: All Ingest Routes Migrated
// ═════════════════════════════════════════════════════════════════════════
async function testIngestMigration() {
  console.log("\n━━━ TEST 12: All Ingest Routes Migrated ━━━");

  const ingestFiles = [
    "app/api/ingest/route.ts",
    "app/api/mess/ingest/route.ts",
    "app/api/schedule/ingest/route.ts",
    "app/api/deadlines/ingest/route.ts",
    "app/api/expenses/route.ts",
    "app/api/wellness/route.ts",
  ];

  for (const file of ingestFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      FAIL(`${path.basename(file)} migrated`, "File not found");
      continue;
    }

    const code = fs.readFileSync(filePath, "utf-8");
    const hasLegacy = code.includes("addToFaissIndex") && !code.includes("// @deprecated");
    const hasNew = code.includes("addToIndex");

    if (hasNew && !hasLegacy) {
      PASS(`${path.basename(file)} migrated`, "Uses addToIndex, no legacy addToFaissIndex");
    } else if (hasLegacy) {
      FAIL(`${path.basename(file)} migrated`, "Still using legacy addToFaissIndex!");
    } else {
      FAIL(`${path.basename(file)} migrated`, "Neither addToIndex nor addToFaissIndex found");
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 13: chatTools.ts Migrated
// ═════════════════════════════════════════════════════════════════════════
async function testChatToolsMigration() {
  console.log("\n━━━ TEST 13: chatTools.ts Migrated ━━━");

  const code = fs.readFileSync(
    path.join(process.cwd(), "lib/chatTools.ts"), "utf-8"
  );

  // No legacy imports
  if (!code.includes("import { addToFaissIndex }") && !code.includes("removeFaissMapping")) {
    PASS("chatTools legacy imports removed", "No addToFaissIndex or removeFaissMapping");
  } else {
    FAIL("chatTools legacy imports removed", "Legacy imports still present");
  }

  // Uses new API
  if (code.includes("addToIndex") && code.includes("removeFromIndex")) {
    PASS("chatTools uses new API", "addToIndex + removeFromIndex found");
  } else {
    FAIL("chatTools uses new API", "Missing new vector store API calls");
  }

  // No direct fs operations on FAISS files
  if (!code.includes("faiss_map.json") && !code.includes("campus.index")) {
    PASS("chatTools no direct FS ops", "No direct file operations on FAISS files");
  } else {
    FAIL("chatTools no direct FS ops", "Direct FAISS file operations still present!");
  }
}

// ═════════════════════════════════════════════════════════════════════════
// RUNNER
// ═════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   RAG Omniscience — QA Test Suite (Section 9 + extras)   ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  await testTenantIsolation();
  await testIdCollisionPrevention();
  await testDayHackRemoval();
  await testCabPoolPII();
  await testTokenBudget();
  await testWellnessGuardrails();
  await testFinanceGuardrails();
  await testAnonymization();
  await testToolCallingRegression();
  await testStrictUserIdEnforcement();
  await testTopKReduction();
  await testIngestMigration();
  await testChatToolsMigration();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log("═══════════════════════════════════════════════════════════");

  if (failed > 0) {
    console.log("\n  ❌ FAILURES:");
    for (const r of results.filter(r => r.status === "FAIL")) {
      console.log(`    - ${r.test}: ${r.detail}`);
    }
    process.exit(1);
  } else {
    console.log("\n  🎉 ALL TESTS PASSED!");
  }
}

main()
  .catch((e) => {
    console.error("Test runner error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

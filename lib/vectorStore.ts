import { IndexFlatL2 } from "faiss-node";
import { getRealEmbedding } from "./embeddings";
import * as fs from "fs";
import * as path from "path";

// ─── Dual-Index Architecture ─────────────────────────────────────────────
// Per-user index: data/indices/user_<userId>.index + user_<userId>_map.json
// Global index:   data/indices/global.index + global_map.json
//
// Each map entry stores: { table, recordId, userId?, chunkIndex }
// This solves: tenant starvation, ID-collision, blind multi-table hydration.
// ──────────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const INDICES_DIR = path.join(DATA_DIR, "indices");

// ─── In-Memory Write Mutex ───────────────────────────────────────────────
// Prevents concurrent fs.writeFileSync calls from corrupting index files.
const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  while (locks.has(key)) {
    await locks.get(key);
  }
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  locks.set(key, promise);
  try {
    return await fn();
  } finally {
    locks.delete(key);
    resolve!();
  }
}

// ─── Map Entry Type ──────────────────────────────────────────────────────
export interface VectorMapEntry {
  table: string;
  recordId: string;
  userId?: string;
  chunkIndex?: number;
}

// ─── Tables that belong in the per-user (private) index ──────────────────
const PRIVATE_TABLES = new Set([
  "Expense",
  "WellnessLog",
  "HelpRequest_own",  // user's own requests
  "StudySession_own", // user's own sessions
]);

// ─── Tables that belong in the global (shared) index ─────────────────────
const GLOBAL_TABLES = new Set([
  "Notice",
  "MessMenu",
  "Deadline",
  "ClassSchedule",
  "Company",
  "InterviewExperience",
  "PrepQuestion",
  "TransportRoute",
  "ExpertiseSeed",
  "HelpRequest_open",  // other users' open requests (peer discovery)
]);

// ─── Path helpers ────────────────────────────────────────────────────────

function getUserIndexPath(userId: string): string {
  return path.join(INDICES_DIR, `user_${userId}.index`);
}

function getUserMapPath(userId: string): string {
  return path.join(INDICES_DIR, `user_${userId}_map.json`);
}

function getGlobalIndexPath(): string {
  return path.join(INDICES_DIR, "global.index");
}

function getGlobalMapPath(): string {
  return path.join(INDICES_DIR, "global_map.json");
}

// ─── Legacy paths (for backward compat / migration) ──────────────────────

const LEGACY_INDEX_PATH = path.join(DATA_DIR, "campus.index");
const LEGACY_MAP_PATH = path.join(DATA_DIR, "faiss_map.json");

// ─── Helpers ─────────────────────────────────────────────────────────────

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INDICES_DIR)) fs.mkdirSync(INDICES_DIR, { recursive: true });
}

function readMap(mapPath: string): Record<number, VectorMapEntry> {
  if (!fs.existsSync(mapPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeMap(mapPath: string, map: Record<number, VectorMapEntry>) {
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
}

function getDimensionFromIndex(indexPath: string): number {
  if (fs.existsSync(indexPath)) {
    try {
      const idx = IndexFlatL2.read(indexPath);
      return idx.getDimension();
    } catch { /* fall through */ }
  }
  return 768; // fallback
}

// ─── Core: Add to Index ──────────────────────────────────────────────────

/**
 * Add a vector to the appropriate FAISS index (per-user or global).
 * 
 * @param recordId  - The Prisma record ID (cuid)
 * @param text      - The text to embed
 * @param table     - The Prisma table name (e.g., "Notice", "Expense")
 * @param userId    - The owning user's ID (null for truly global data)
 * @param indexType - "private" → per-user index, "global" → shared index
 * @param chunkIndex - For chunked records, the chunk number (default 0)
 */
export async function addToIndex(
  recordId: string,
  text: string,
  table: string,
  userId: string | null,
  indexType: "private" | "global" = "global",
  chunkIndex: number = 0
): Promise<void> {
  try {
    const embedding = await getRealEmbedding(text);
    const hasValues = embedding.some(v => v !== 0);
    if (!hasValues || embedding.length === 0) {
      console.warn(`FAISS: Skipped adding ${table}:${recordId} (bad embedding)`);
      return;
    }

    ensureDirs();

    const indexPath = indexType === "private" && userId
      ? getUserIndexPath(userId)
      : getGlobalIndexPath();
    const mapPath = indexType === "private" && userId
      ? getUserMapPath(userId)
      : getGlobalMapPath();
    const lockKey = indexPath; // Lock per index file

    await withLock(lockKey, async () => {
      let index: InstanceType<typeof IndexFlatL2>;
      let faissMap = readMap(mapPath);

      if (fs.existsSync(indexPath)) {
        index = IndexFlatL2.read(indexPath);
      } else {
        index = new IndexFlatL2(embedding.length);
      }

      // Deduplicate: check if this exact (table, recordId, chunkIndex) already exists
      for (const [, entry] of Object.entries(faissMap)) {
        if (entry.table === table && entry.recordId === recordId && (entry.chunkIndex || 0) === chunkIndex) {
          console.log(`FAISS: ${table}:${recordId} chunk ${chunkIndex} already indexed, skipping.`);
          return;
        }
      }

      const nextIndex = index.ntotal();
      index.add(embedding);

      faissMap[nextIndex] = {
        table,
        recordId,
        ...(userId ? { userId } : {}),
        ...(chunkIndex > 0 ? { chunkIndex } : {}),
      };

      index.write(indexPath);
      writeMap(mapPath, faissMap);

      console.log(`FAISS [${indexType}]: Added ${table}:${recordId} as vector #${nextIndex}`);
    });
  } catch (error) {
    console.error(`FAISS: Failed to add ${table}:${recordId}:`, error);
  }
}

/**
 * Backward-compatible wrapper. Routes to the correct index based on table name.
 * Used by existing chatTools.ts and ingest routes during migration.
 */
export async function addToFaissIndex(prismaId: string, text: string, table?: string, userId?: string): Promise<void> {
  // Infer table from the text tag if not provided (legacy compat)
  const inferredTable = table || inferTableFromText(text);
  const isPrivate = PRIVATE_TABLES.has(inferredTable);

  await addToIndex(
    prismaId,
    text,
    inferredTable,
    userId || null,
    isPrivate ? "private" : "global"
  );
}

function inferTableFromText(text: string): string {
  if (text.startsWith("[NOTICE]")) return "Notice";
  if (text.startsWith("[MESS]")) return "MessMenu";
  if (text.startsWith("[DEADLINE]")) return "Deadline";
  if (text.startsWith("[CLASS]")) return "ClassSchedule";
  if (text.startsWith("[EXPENSE]")) return "Expense";
  if (text.startsWith("[WELLNESS]")) return "WellnessLog";
  if (text.startsWith("[NOTE]")) return "Note";
  return "Unknown";
}

// ─── Core: Remove from Index ─────────────────────────────────────────────

/**
 * Remove a record from a FAISS map (marks it as deleted from search results).
 * Searches both the user's private index and the global index.
 */
export async function removeFromIndex(recordId: string, userId?: string): Promise<void> {
  const mapPaths: string[] = [getGlobalMapPath()];
  if (userId) mapPaths.push(getUserMapPath(userId));

  for (const mapPath of mapPaths) {
    if (!fs.existsSync(mapPath)) continue;
    const lockKey = mapPath.replace("_map.json", ".index");

    await withLock(lockKey, async () => {
      const faissMap = readMap(mapPath);
      let changed = false;

      for (const [key, entry] of Object.entries(faissMap)) {
        if (entry.recordId === recordId) {
          delete faissMap[Number(key)];
          changed = true;
        }
      }

      if (changed) {
        writeMap(mapPath, faissMap);
        console.log(`FAISS: Removed mapping for ${recordId} from ${path.basename(mapPath)}`);
      }
    });
  }
}

// ─── Core: Semantic Search (Dual-Index) ──────────────────────────────────

export interface SearchResult {
  table: string;
  recordId: string;
  userId?: string;
  chunkIndex?: number;
  distance: number;
  source: "private" | "global";
}

/**
 * Perform semantic search across both the user's private index and the global index.
 * Returns SearchResult[] with table, recordId, and distance for direct hydration.
 */
export function dualSearch(
  queryEmbedding: number[],
  userId: string,
  topKPrivate: number = 8,
  topKGlobal: number = 8
): SearchResult[] {
  const results: SearchResult[] = [];

  // 1. Search the user's private index
  const userIndexPath = getUserIndexPath(userId);
  const userMapPath = getUserMapPath(userId);
  if (fs.existsSync(userIndexPath) && fs.existsSync(userMapPath)) {
    const userMap = readMap(userMapPath);
    try {
      const userIndex = IndexFlatL2.read(userIndexPath);
      const dim = userIndex.getDimension();
      if (queryEmbedding.length === dim && userIndex.ntotal() > 0) {
        const safeK = Math.min(topKPrivate, userIndex.ntotal());
        const searchResult = userIndex.search(queryEmbedding, safeK);

        for (let i = 0; i < searchResult.labels.length; i++) {
          const label = searchResult.labels[i];
          if (label !== -1 && userMap[label]) {
            results.push({
              ...userMap[label],
              distance: searchResult.distances[i],
              source: "private",
            });
          }
        }
      }
    } catch (err) {
      console.error(`FAISS: Error searching user index for ${userId}:`, err);
    }
  }

  // 2. Search the global index
  const globalIndexPath = getGlobalIndexPath();
  const globalMapPath = getGlobalMapPath();
  if (fs.existsSync(globalIndexPath) && fs.existsSync(globalMapPath)) {
    const globalMap = readMap(globalMapPath);
    try {
      const globalIndex = IndexFlatL2.read(globalIndexPath);
      const dim = globalIndex.getDimension();
      if (queryEmbedding.length === dim && globalIndex.ntotal() > 0) {
        const safeK = Math.min(topKGlobal, globalIndex.ntotal());
        const searchResult = globalIndex.search(queryEmbedding, safeK);

        for (let i = 0; i < searchResult.labels.length; i++) {
          const label = searchResult.labels[i];
          if (label !== -1 && globalMap[label]) {
            results.push({
              ...globalMap[label],
              distance: searchResult.distances[i],
              source: "global",
            });
          }
        }
      }
    } catch (err) {
      console.error("FAISS: Error searching global index:", err);
    }
  }

  // 3. Deduplicate by (table, recordId) — keep the one with lower distance
  const seen = new Map<string, SearchResult>();
  for (const r of results) {
    const key = `${r.table}:${r.recordId}`;
    const existing = seen.get(key);
    if (!existing || r.distance < existing.distance) {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.distance - b.distance);
}

// ─── Legacy compat: semanticSearch (returns string[] of Prisma IDs) ──────

/**
 * @deprecated Use dualSearch() instead. This is kept only for backward compatibility.
 * Falls back to legacy single-index if dual-index is not yet populated.
 */
export function semanticSearch(queryEmbedding: number[], topK: number = 5): string[] {
  // Try legacy index first (backward compat during migration)
  if (fs.existsSync(LEGACY_INDEX_PATH) && fs.existsSync(LEGACY_MAP_PATH)) {
    const dim = getDimensionFromIndex(LEGACY_INDEX_PATH);
    if (queryEmbedding.length !== dim) {
      console.error(`Invalid query embedding dimension: ${queryEmbedding.length}, expected ${dim}`);
      return [];
    }

    const faissMap: Record<number, string> = JSON.parse(fs.readFileSync(LEGACY_MAP_PATH, "utf-8"));
    const index = IndexFlatL2.read(LEGACY_INDEX_PATH);

    const safeK = Math.min(topK, index.ntotal());
    if (safeK === 0) return [];

    const results = index.search(queryEmbedding, safeK);

    const matchedPrismaIds: string[] = [];
    for (const label of results.labels) {
      if (label !== -1 && faissMap[label]) {
        matchedPrismaIds.push(faissMap[label]);
      }
    }
    return matchedPrismaIds;
  }

  return [];
}

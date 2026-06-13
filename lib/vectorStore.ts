import { IndexFlatL2 } from "faiss-node";
import { getRealEmbedding } from "./embeddings";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const INDEX_PATH = path.join(DATA_DIR, "campus.index");
const MAP_PATH = path.join(DATA_DIR, "faiss_map.json");

/** Get dimension from existing index, or default */
function getDimension(): number {
  if (fs.existsSync(INDEX_PATH)) {
    try {
      const idx = IndexFlatL2.read(INDEX_PATH);
      return idx.getDimension();
    } catch { /* fall through */ }
  }
  return 768; // fallback
}

/**
 * Adds a single new vector to the existing FAISS index on disk.
 * Call this from any ingest route after inserting a record into MySQL.
 */
export async function addToFaissIndex(prismaId: string, text: string): Promise<void> {
  try {
    const embedding = await getRealEmbedding(text);
    const hasValues = embedding.some(v => v !== 0);
    if (!hasValues || embedding.length === 0) {
      console.warn(`FAISS: Skipped adding ${prismaId} (bad embedding)`);
      return;
    }

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    let index: InstanceType<typeof IndexFlatL2>;
    let faissMap: Record<number, string> = {};

    if (fs.existsSync(INDEX_PATH) && fs.existsSync(MAP_PATH)) {
      index = IndexFlatL2.read(INDEX_PATH);
      faissMap = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
    } else {
      index = new IndexFlatL2(embedding.length);
    }

    // Check if this ID is already in the map (avoid duplicates)
    const existingIds = Object.values(faissMap);
    if (existingIds.includes(prismaId)) {
      console.log(`FAISS: ${prismaId} already indexed, skipping.`);
      return;
    }

    const nextIndex = index.ntotal();
    index.add(embedding);
    faissMap[nextIndex] = prismaId;

    index.write(INDEX_PATH);
    fs.writeFileSync(MAP_PATH, JSON.stringify(faissMap, null, 2));

    console.log(`FAISS: Added vector #${nextIndex} for ${prismaId}`);
  } catch (error) {
    console.error(`FAISS: Failed to add ${prismaId}:`, error);
  }
}

/**
 * Performs a semantic search against the local FAISS index.
 * Returns an array of Prisma string IDs corresponding to the closest matches.
 */
export function semanticSearch(queryEmbedding: number[], topK: number = 5): string[] {
  const dim = getDimension();
  if (queryEmbedding.length !== dim) {
    console.error(`Invalid query embedding dimension: ${queryEmbedding.length}, expected ${dim}`);
    return [];
  }

  if (!fs.existsSync(INDEX_PATH) || !fs.existsSync(MAP_PATH)) {
    console.warn("FAISS index or map not found. Run: npm run rebuild-index");
    return [];
  }

  const faissMap: Record<number, string> = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
  const index = IndexFlatL2.read(INDEX_PATH);

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

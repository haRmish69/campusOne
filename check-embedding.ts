import { embedText } from "./lib/embeddings";
import { extractKeywords } from "./lib/gemini";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function checkEmbedding() {
  const query = "What is my schedule?";
  const keywords = await extractKeywords(query);
  console.log("Keywords:", keywords);
  const vector = await embedText(query);
  console.log("Vector non-zero count:", vector.filter(x => x !== 0).length);
}

checkEmbedding();

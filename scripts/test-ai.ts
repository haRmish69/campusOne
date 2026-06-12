import "dotenv/config";
import { extractKeywords } from "../lib/gemini";
import { embedText } from "../lib/embeddings";

async function main() {
  console.log("Testing embedText...");
  const vector = await embedText("The exam for Data Structures is on Monday in Room 204");
  
  let sumOfSquares = 0;
  for (const v of vector) {
    sumOfSquares += v * v;
  }
  const magnitude = Math.sqrt(sumOfSquares);
  
  console.log("Vector length:", vector.length);
  console.log("Vector magnitude:", magnitude);

  console.log("\nTesting extractKeywords...");
  const keywords = await extractKeywords("Annual placement drive for final year students. Companies visiting: Google, Microsoft, Infosys.");
  console.log("Keywords array:", keywords);
}

main().catch(console.error);

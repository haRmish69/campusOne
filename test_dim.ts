import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const models = ["gemini-embedding-001", "gemini-embedding-2"];
  
  for (const m of models) {
    try {
      const response = await ai.models.embedContent({
        model: m,
        contents: "Test text",
      });
      const dim = response.embeddings?.[0]?.values?.length;
      console.log(`Model ${m} dimension: ${dim}`);
    } catch (e: any) {
      console.error(`Model ${m} error: ${e.message}`);
    }
  }
}
main().catch(console.error);

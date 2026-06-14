import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function checkModel(modelName: string) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Hello",
    });
    console.log(`Success with ${modelName}:`, response.text);
  } catch (error: any) {
    console.error(`Error with ${modelName}:`, error.message);
  }
}

async function main() {
  await checkModel("gemini-2.5-flash");
  await checkModel("gemini-2.0-flash");
  await checkModel("gemini-3.5-flash");
}

main();

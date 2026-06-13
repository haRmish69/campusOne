import { GoogleGenAI } from "@google/genai";

let detectedDimension = 0;

export async function getRealEmbedding(text: string): Promise<number[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  if (!text || text.trim().length === 0) {
    return Array(detectedDimension || 768).fill(0);
  }

  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
    });
    
    const embedding = response.embeddings?.[0]?.values;
    
    if (!embedding || embedding.length === 0) {
      throw new Error("Empty embedding returned from Gemini");
    }

    // Auto-detect and log dimension on first successful call
    if (detectedDimension === 0) {
      detectedDimension = embedding.length;
      console.log(`📐 Embedding dimension detected: ${detectedDimension}`);
    }
    
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return Array(detectedDimension || 768).fill(0);
  }
}

export function getEmbeddingDimension(): number {
  return detectedDimension || 768;
}

// Backward-compatible aliases for existing code
export const embedText = getRealEmbedding;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, sumA = 0, sumB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    sumA += a[i] * a[i];
    sumB += b[i] * b[i];
  }
  const magA = Math.sqrt(sumA);
  const magB = Math.sqrt(sumB);
  return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
}

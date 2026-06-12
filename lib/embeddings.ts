import { extractKeywords } from "./gemini";

export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return Array(200).fill(0);
  }
  
  const truncated = text.substring(0, 2000).toLowerCase();
  
  // Extract words locally instead of using AI to save API quota
  const words = truncated.match(/\b[a-z]{4,}\b/g) || [];
  
  // Simple stopword removal
  const stopwords = new Set(["this", "that", "with", "from", "your", "have", "will", "they", "their", "what", "when", "where"]);
  const keywords = words.filter(w => !stopwords.has(w));

  const vector = new Float32Array(200).fill(0);
  
  for (const keyword of keywords) {
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = (hash * 31 + keyword.charCodeAt(i)) % 200;
    }
    vector[hash] += 1;
  }

  let sumOfSquares = 0;
  for (let i = 0; i < 200; i++) {
    sumOfSquares += vector[i] * vector[i];
  }
  
  const magnitude = Math.sqrt(sumOfSquares);
  if (magnitude > 0) {
    for (let i = 0; i < 200; i++) {
      vector[i] = vector[i] / magnitude;
    }
  }
  
  return Array.from(vector);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0 || b.length === 0) {
    return 0;
  }
  
  let dot = 0;
  let sumA = 0;
  let sumB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    sumA += a[i] * a[i];
    sumB += b[i] * b[i];
  }
  
  const magA = Math.sqrt(sumA);
  const magB = Math.sqrt(sumB);
  
  return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
}

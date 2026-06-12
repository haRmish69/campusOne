import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set in the environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const MODEL = "gemini-3.5-flash";

// Retry wrapper to handle 429 rate limits automatically
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (
        error.status === 429 || 
        error.status === 503 ||
        error.status === 500 ||
        error.message?.includes("429") ||
        error.message?.includes("503") ||
        error.message?.includes("high demand")
      ) {
        if (attempt === maxRetries) throw error;
        // Wait longer if it's high demand vs just rate limits
        const baseDelay = error.status === 503 ? 3000 : 2000;
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`API overloaded/rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export async function parseImageToJSON(base64: string, mimeType: string, prompt: string): Promise<Record<string, unknown>> {
  const attemptParse = async (currentPrompt: string) => {
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: currentPrompt },
          ],
        },
      ],
    }));
    let text = response.text ?? "";
    text = text.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    return JSON.parse(text);
  };

  try {
    return await attemptParse(prompt);
  } catch (error) {
    try {
      return await attemptParse(prompt + "\nRespond with ONLY raw JSON, no markdown.");
    } catch (secondError) {
      const response = await withRetry(() => ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64, mimeType } },
              { text: prompt },
            ],
          },
        ],
      }));
      const rawText = response.text ?? "";
      throw new Error("Gemini returned unparseable JSON: " + rawText.slice(0, 200));
    }
  }
}

export async function parseTextToJSON(text: string, prompt: string): Promise<Record<string, unknown>> {
  const attemptParse = async (currentPrompt: string) => {
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: `${currentPrompt}\n\nText:\n${text}`,
    }));
    let responseText = response.text ?? "";
    responseText = responseText.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    return JSON.parse(responseText);
  };

  try {
    return await attemptParse(prompt);
  } catch (error) {
    try {
      return await attemptParse(prompt + "\nRespond with ONLY raw JSON, no markdown.");
    } catch (secondError) {
      const response = await withRetry(() => ai.models.generateContent({
        model: MODEL,
        contents: `${prompt}\n\nText:\n${text}`,
      }));
      const rawText = response.text ?? "";
      throw new Error("Gemini returned unparseable JSON: " + rawText.slice(0, 200));
    }
  }
}

export async function extractKeywords(text: string): Promise<string[]> {
  try {
    const prompt = `Extract exactly 20 keywords from the following text. Return ONLY a JSON array of lowercase strings. No explanations, no markdown, no preamble.\n\nText: ${text}`;
    
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    }));
    let rawText = response.text ?? "";
    rawText = rawText.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
}

export async function answerQuestion(question: string, context: string, history: {role: string, content: string}[]): Promise<string> {
  const contents = history.map(h => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }]
  }));
  contents.push({
    role: "user" as const,
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }]
  });

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: "You are CampusFlow, a helpful AI assistant for college students.\nAnswer ONLY from the provided context. If the context does not contain enough information to answer, say exactly: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points."
    },
    contents,
  }));
  return response.text ?? "";
}

export async function answerQuestionStream(question: string, context: string, history: {role: string, content: string}[]) {
  const contents = history.map(h => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }]
  }));
  contents.push({
    role: "user" as const,
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }]
  });

  const response = await withRetry(() => ai.models.generateContentStream({
    model: MODEL,
    config: {
      systemInstruction: "You are CampusFlow, a helpful AI assistant for college students.\nAnswer ONLY from the provided context. If the context does not contain enough information to answer, say exactly: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points."
    },
    contents,
  }));
  return response;
}

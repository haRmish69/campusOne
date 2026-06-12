import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set in the environment.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function parseImageToJSON(base64: string, mimeType: string, prompt: string): Promise<Record<string, unknown>> {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const imagePart = { inlineData: { data: base64, mimeType } };
  
  const attemptParse = async (currentPrompt: string) => {
    const result = await model.generateContent([imagePart, currentPrompt]);
    let text = result.response.text();
    text = text.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    return JSON.parse(text);
  };

  try {
    return await attemptParse(prompt);
  } catch (error) {
    try {
      return await attemptParse(prompt + "\nRespond with ONLY raw JSON, no markdown.");
    } catch (secondError) {
      const result = await model.generateContent([imagePart, prompt]);
      const rawText = result.response.text();
      throw new Error("Gemini returned unparseable JSON: " + rawText.slice(0, 200));
    }
  }
}

export async function parseTextToJSON(text: string, prompt: string): Promise<Record<string, unknown>> {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const attemptParse = async (currentPrompt: string) => {
    const result = await model.generateContent(`${currentPrompt}\n\nText:\n${text}`);
    let responseText = result.response.text();
    responseText = responseText.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    return JSON.parse(responseText);
  };

  try {
    return await attemptParse(prompt);
  } catch (error) {
    try {
      return await attemptParse(prompt + "\nRespond with ONLY raw JSON, no markdown.");
    } catch (secondError) {
      const result = await model.generateContent(`${prompt}\n\nText:\n${text}`);
      const rawText = result.response.text();
      throw new Error("Gemini returned unparseable JSON: " + rawText.slice(0, 200));
    }
  }
}

export async function extractKeywords(text: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Extract exactly 20 keywords from the following text. Return ONLY a JSON array of lowercase strings. No explanations, no markdown, no preamble.\n\nText: ${text}`;
    
    const result = await model.generateContent(prompt);
    let rawText = result.response.text();
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
  const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    systemInstruction: "You are CampusFlow, a helpful AI assistant for college students.\nAnswer ONLY from the provided context. If the context does not contain enough information to answer, say exactly: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points."
  });

  const contents = history.map(h => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }]
  }));
  contents.push({
    role: "user",
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }]
  });

  const result = await model.generateContent({ contents });
  return result.response.text();
}

export async function answerQuestionStream(question: string, context: string, history: {role: string, content: string}[]) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    systemInstruction: "You are CampusFlow, a helpful AI assistant for college students.\nAnswer ONLY from the provided context. If the context does not contain enough information to answer, say exactly: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points."
  });

  const contents = history.map(h => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }]
  }));
  contents.push({
    role: "user",
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }]
  });

  const result = await model.generateContentStream({ contents });
  return result.stream;
}

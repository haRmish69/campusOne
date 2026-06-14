import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set in the environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const MODEL = "gemini-2.5-flash";

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

export async function categorizeExpense(description: string, amount: number): Promise<string> {
  const allowedCategories = ["food", "travel", "academics", "rent", "subscriptions", "entertainment", "other"];
  try {
    const prompt = `Categorize this student expense into ONE of: food, travel, academics, rent, subscriptions, entertainment, other. Expense: '${description}', amount: ${amount}. Return ONLY the category word, nothing else.`;
    
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    }));
    let rawText = (response.text ?? "").trim().toLowerCase();
    
    // strip out any punctuation just in case
    rawText = rawText.replace(/[^a-z]/g, '');
    
    if (allowedCategories.includes(rawText)) {
      return rawText;
    }
    return "other";
  } catch (error) {
    console.error("Gemini API Error (categorizeExpense):", error);
    return "other";
  }
}

export async function answerQuestion(question: string, context: string, history: {role: string, content: string}[], profileContext: string = ""): Promise<string> {
  const contents = history.map(h => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }]
  }));
  contents.push({
    role: "user" as const,
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }]
  });

  const istDateTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  const baseInstruction = `You are CampusFlow, an elite AI assistant for college students.\nCurrent Date & Time (IST): ${istDateTime}.\nAnswer ONLY from the provided context. Context may include: class schedules, notices, deadlines, mess menus, expenses, wellness logs, company profiles, interview experiences, prep questions, transport routes, cab pools, peer help requests, and expertise listings.\nUse the current date/time to give time-aware answers (e.g. "today", "tomorrow", "this week").\nIf the user asks about today's schedule/menu and the context contains weekly data but nothing for today, simply tell them they have nothing scheduled for today.\nBehavioral guardrails:\n- [WELLNESS]: Be supportive, never diagnose. For negative trends, gently mention campus counseling.\n- [EXPENSE]/[BUDGET]: Present factual summaries only. Do not give financial advice.\n- [CAB_POOL]/[HELP_REQUEST]: Never expose contact details. Direct user to in-app actions.\nIf data is completely missing, say: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points.`;
  
  const systemInstruction = profileContext ? `${baseInstruction}\n\n${profileContext}` : baseInstruction;

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction
    },
    contents,
  }));
  return response.text ?? "";
}

export async function answerQuestionStream(question: string, context: string, history: {role: string, content: string}[], profileContext: string = "") {
  const contents = history.map(h => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }]
  }));
  contents.push({
    role: "user" as const,
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }]
  });

  const istDateTime2 = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  const baseInstruction = `You are CampusFlow (including the PocketBuddy financial and wellness assistant), a helpful AI assistant for college students.\nCurrent Date & Time (IST): ${istDateTime2}.\nAnswer ONLY from the provided context, which may include class schedules, notices, deadlines, mess menus, expenses, and wellness logs.\nUse the current date/time to give time-aware answers (e.g. "today", "tomorrow", "this week").\nIf the user asks about today's schedule/menu and the context contains weekly data but nothing for today, simply tell them they have nothing scheduled for today (e.g., "You don't have any classes today"). If they ask about their spending or stress levels, use the retrieved expense and wellness context to answer intelligently. Otherwise, if the data is completely missing from the context, say exactly: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points.`;
  
  const systemInstruction = profileContext ? `${baseInstruction}\n\n${profileContext}` : baseInstruction;

  const response = await withRetry(() => ai.models.generateContentStream({
    model: MODEL,
    config: {
      systemInstruction
    },
    contents,
  }));
  return response;
}

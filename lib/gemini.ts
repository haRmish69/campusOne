import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set in the environment.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ─── Supported Model Hierarchy ──────────────────────────────────────────────
// Primary model confirmed available on current endpoint
export const PRIMARY_MODEL = "gemini-3.5-flash-lite";

// Verified fallback models supported by the existing API configuration
export const FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

// Backwards compatibility alias
export const MODEL = PRIMARY_MODEL;

// Exponential backoff retry delays (3 retries: 2s, 4s, 8s)
export const RETRY_DELAYS_MS = [2000, 4000, 8000];

/**
 * Sanitizes errors by removing sensitive API keys or credentials before logging or reporting.
 */
export function sanitizeError(error: any): string {
  if (!error) return "Unknown error";
  let msg = typeof error.message === "string" ? error.message : JSON.stringify(error);
  if (process.env.GEMINI_API_KEY) {
    msg = msg.replace(new RegExp(process.env.GEMINI_API_KEY, "g"), "[REDACTED_API_KEY]");
  }
  return msg;
}

/**
 * Determines whether a Gemini API error represents a temporary issue:
 * 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, 500 INTERNAL, or transient network failures.
 */
export function isRetryableGeminiError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 503 || status === 429 || status === 500) return true;

  const msg = typeof error.message === "string" ? error.message : JSON.stringify(error);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("500") ||
    msg.includes("INTERNAL") ||
    msg.includes("fetch failed") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("UND_ERR_CONNECT_TIMEOUT") ||
    msg.includes("network request failed") ||
    msg.includes("AbortError")
  );
}

/**
 * Executes a Gemini content generation call with automatic exponential backoff retry
 * (2s, 4s, 8s) on 503, 429, 500, or network errors, and falls back to supported
 * models if the primary model repeatedly fails or is unavailable.
 */
export async function generateContentWithRetryAndFallback(
  options: {
    contents: any;
    config?: any;
    model?: string;
  },
  onRetry?: (attempt: number, delayMs: number, error: any, model: string) => void
): Promise<any> {
  const modelsToTry = [
    options.model || PRIMARY_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== (options.model || PRIMARY_MODEL)),
  ];

  let lastError: any = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    const isFallback = mIdx > 0;

    if (isFallback) {
      console.warn(`[Gemini API] Primary model failed. Attempting fallback model: "${currentModel}"`);
    }

    // Try up to 3 retries (4 total attempts: 0 = initial, 1 = 1st retry, 2 = 2nd retry, 3 = 3rd retry)
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const sanitized = sanitizeError(err);
        const isRetryable = isRetryableGeminiError(err);
        const is404 = err.status === 404 || sanitized.includes("404") || sanitized.includes("NOT_FOUND");

        // If the model does not exist on this endpoint, immediately try the next model
        if (is404) {
          console.warn(`[Gemini API] Model "${currentModel}" returned 404/NOT_FOUND. Switching to fallback.`);
          break;
        }

        if (isRetryable && attempt < 3) {
          const delay = RETRY_DELAYS_MS[attempt]; // 2000, 4000, 8000 ms
          console.warn(
            `[Gemini API] Temporary error on model "${currentModel}" (attempt ${attempt + 1}/3). Retrying in ${delay}ms...`
          );
          if (onRetry) {
            onRetry(attempt + 1, delay, err, currentModel);
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (isRetryable && attempt === 3) {
          console.warn(`[Gemini API] Model "${currentModel}" exhausted all 3 retries. Moving to next fallback.`);
          break; // Try next model in modelsToTry
        } else {
          // Fatal/client error (e.g. malformed parameter)
          console.error(`[Gemini API] Non-retryable error on model "${currentModel}":`, sanitized);
          throw err;
        }
      }
    }
  }

  console.error("[Gemini API] All primary and fallback models exhausted:", sanitizeError(lastError));
  const friendlyError: any = new Error("AI analysis is temporarily unavailable. Please try again in a few moments.");
  friendlyError.status = 503;
  friendlyError.code = "UNAVAILABLE";
  friendlyError.isHighDemand = true;
  friendlyError.originalError = sanitizeError(lastError);
  throw friendlyError;
}

/**
 * Executes a streaming Gemini content generation call with exponential backoff and model fallback.
 */
export async function generateContentStreamWithRetryAndFallback(
  options: {
    contents: any;
    config?: any;
    model?: string;
  },
  onRetry?: (attempt: number, delayMs: number, error: any, model: string) => void
): Promise<any> {
  const modelsToTry = [
    options.model || PRIMARY_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== (options.model || PRIMARY_MODEL)),
  ];

  let lastError: any = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    if (mIdx > 0) {
      console.warn(`[Gemini API Stream] Primary model failed. Attempting fallback model: "${currentModel}"`);
    }

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContentStream({
          model: currentModel,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const sanitized = sanitizeError(err);
        const isRetryable = isRetryableGeminiError(err);
        const is404 = err.status === 404 || sanitized.includes("404") || sanitized.includes("NOT_FOUND");

        if (is404) {
          console.warn(`[Gemini API Stream] Model "${currentModel}" returned 404. Switching to fallback.`);
          break;
        }

        if (isRetryable && attempt < 3) {
          const delay = RETRY_DELAYS_MS[attempt];
          console.warn(
            `[Gemini API Stream] Temporary error on model "${currentModel}" (attempt ${attempt + 1}/3). Retrying in ${delay}ms...`
          );
          if (onRetry) onRetry(attempt + 1, delay, err, currentModel);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (isRetryable && attempt === 3) {
          console.warn(`[Gemini API Stream] Model "${currentModel}" exhausted 3 retries. Moving to next fallback.`);
          break;
        } else {
          throw err;
        }
      }
    }
  }

  const friendlyError: any = new Error("AI analysis is temporarily unavailable. Please try again in a few moments.");
  friendlyError.status = 503;
  friendlyError.isHighDemand = true;
  throw friendlyError;
}

/**
 * Executes a multi-turn chat message with exponential backoff and model fallback.
 */
export async function sendChatMessageWithRetryAndFallback(
  options: {
    history: any[];
    message: any;
    config: any;
    model?: string;
  },
  onRetry?: (attempt: number, delayMs: number, error: any, model: string) => void
): Promise<any> {
  const modelsToTry = [
    options.model || PRIMARY_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== (options.model || PRIMARY_MODEL)),
  ];

  let lastError: any = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    if (mIdx > 0) {
      console.warn(`[Gemini Chat] Switching to fallback model: "${currentModel}"`);
    }

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const chat = ai.chats.create({
          model: currentModel,
          history: options.history,
          config: options.config,
        });
        const response = await chat.sendMessage({ message: options.message });
        return response;
      } catch (err: any) {
        lastError = err;
        const sanitized = sanitizeError(err);
        const isRetryable = isRetryableGeminiError(err);
        const is404 = err.status === 404 || sanitized.includes("404") || sanitized.includes("NOT_FOUND");

        if (is404) {
          console.warn(`[Gemini Chat] Model "${currentModel}" returned 404. Switching to fallback.`);
          break;
        }

        if (isRetryable && attempt < 3) {
          const delay = RETRY_DELAYS_MS[attempt];
          console.warn(
            `[Gemini Chat] Temporary error on model "${currentModel}" (attempt ${attempt + 1}/3). Retrying in ${delay}ms...`
          );
          if (onRetry) onRetry(attempt + 1, delay, err, currentModel);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (isRetryable && attempt === 3) {
          console.warn(`[Gemini Chat] Model "${currentModel}" exhausted 3 retries. Moving to next fallback.`);
          break;
        } else {
          throw err;
        }
      }
    }
  }

  const friendlyError: any = new Error("AI analysis is temporarily unavailable. Please try again in a few moments.");
  friendlyError.status = 503;
  friendlyError.isHighDemand = true;
  throw friendlyError;
}

export async function parseImageToJSON(base64: string, mimeType: string, prompt: string): Promise<Record<string, unknown>> {
  const attemptParse = async (currentPrompt: string) => {
    const response = await generateContentWithRetryAndFallback({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: currentPrompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
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
      throw new Error("Failed to parse image with Gemini: " + sanitizeError(secondError));
    }
  }
}

export async function parseTextToJSON(text: string, prompt: string): Promise<Record<string, unknown>> {
  const attemptParse = async (currentPrompt: string) => {
    const response = await generateContentWithRetryAndFallback({
      contents: `${currentPrompt}\n\nText:\n${text}`,
      config: {
        responseMimeType: "application/json",
      },
    });
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
      throw new Error("Failed to parse text with Gemini: " + sanitizeError(secondError));
    }
  }
}

export async function extractKeywords(text: string): Promise<string[]> {
  try {
    const prompt = `Extract exactly 20 keywords from the following text. Return ONLY a JSON array of lowercase strings. No explanations, no markdown, no preamble.\n\nText: ${text}`;
    
    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    let rawText = response.text ?? "";
    rawText = rawText.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
    
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error (extractKeywords):", sanitizeError(error));
    return [];
  }
}

export async function categorizeExpense(description: string, amount: number): Promise<string> {
  const allowedCategories = ["food", "travel", "academics", "rent", "subscriptions", "entertainment", "other"];
  try {
    const prompt = `Categorize this student expense into ONE of: food, travel, academics, rent, subscriptions, entertainment, other. Expense: '${description}', amount: ${amount}. Return ONLY the category word, nothing else.`;
    
    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
    });
    let rawText = (response.text ?? "").trim().toLowerCase();
    rawText = rawText.replace(/[^a-z]/g, "");
    
    if (allowedCategories.includes(rawText)) {
      return rawText;
    }
    return "other";
  } catch (error) {
    console.error("Gemini API Error (categorizeExpense):", sanitizeError(error));
    return "other";
  }
}

export async function answerQuestion(
  question: string,
  context: string,
  history: { role: string; content: string }[],
  profileContext: string = ""
): Promise<string> {
  const contents = history.map((h) => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }],
  }));
  contents.push({
    role: "user" as const,
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }],
  });

  const istDateTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const baseInstruction = `You are CampusOne, an elite AI assistant for college students.\nCurrent Date & Time (IST): ${istDateTime}.\nAnswer ONLY from the provided context. Context may include: class schedules, notices, deadlines, mess menus, expenses, wellness logs, company profiles, interview experiences, prep questions, transport routes, cab pools, peer help requests, and expertise listings.\nUse the current date/time to give time-aware answers (e.g. "today", "tomorrow", "this week").\nIf the user asks about today's schedule/menu and the context contains weekly data but nothing for today, simply tell them they have nothing scheduled for today.\nBehavioral guardrails:\n- [WELLNESS]: Be supportive, never diagnose. For negative trends, gently mention campus counseling.\n- [EXPENSE]/[BUDGET]: Present factual summaries only. Do not give financial advice.\n- [CAB_POOL]/[HELP_REQUEST]: Never expose contact details. Direct user to in-app actions.\nIf data is completely missing, say: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points.`;

  const systemInstruction = profileContext ? `${baseInstruction}\n\n${profileContext}` : baseInstruction;

  const response = await generateContentWithRetryAndFallback({
    contents,
    config: {
      systemInstruction,
    },
  });
  return response.text ?? "";
}

export async function answerQuestionStream(
  question: string,
  context: string,
  history: { role: string; content: string }[],
  profileContext: string = ""
) {
  const contents = history.map((h) => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }],
  }));
  contents.push({
    role: "user" as const,
    parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }],
  });

  const istDateTime2 = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const baseInstruction = `You are CampusOne (including the PocketBuddy financial and wellness assistant), a helpful AI assistant for college students.\nCurrent Date & Time (IST): ${istDateTime2}.\nAnswer ONLY from the provided context, which may include class schedules, notices, deadlines, mess menus, expenses, and wellness logs.\nUse the current date/time to give time-aware answers (e.g. "today", "tomorrow", "this week").\nIf the user asks about today's schedule/menu and the context contains weekly data but nothing for today, simply tell them they have nothing scheduled for today (e.g., "You don't have any classes today"). If they ask about their spending or stress levels, use the retrieved expense and wellness context to answer intelligently. Otherwise, if the data is completely missing from the context, say exactly: 'I don't have that information in my campus data.'\nNever invent facts. Be warm, concise, and helpful. Format lists with bullet points.`;

  const systemInstruction = profileContext ? `${baseInstruction}\n\n${profileContext}` : baseInstruction;

  const response = await generateContentStreamWithRetryAndFallback({
    contents,
    config: {
      systemInstruction,
    },
  });
  return response;
}

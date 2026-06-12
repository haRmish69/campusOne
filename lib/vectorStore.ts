import { prisma } from "./prisma";
import { cosineSimilarity } from "./embeddings";

export type SearchResult = {
  id: string;
  type: "notice" | "mess" | "deadline" | "schedule" | "expense" | "wellness";
  title: string;
  body: string;
  similarity: number;
}

export async function searchAcrossTables(queryEmbedding: number[], userId: string, topK: number = 5): Promise<SearchResult[]> {
  const [notices, messMenus, deadlines, classes, expenses, wellnessLogs] = await Promise.all([
    prisma.notice.findMany(),
    prisma.messMenu.findMany(),
    prisma.deadline.findMany({
      where: { OR: [{ userId }, { userId: null }] }
    }),
    prisma.classSchedule.findMany({
      where: { OR: [{ userId }, { userId: null }] }
    }),
    prisma.expense.findMany(),
    prisma.wellnessLog.findMany()
  ]);

  const results: SearchResult[] = [];

  const parseEmbedding = (raw: unknown): number[] => {
    if (!raw) throw new Error("Null embedding");
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string") {
        const doubleParsed = JSON.parse(parsed);
        if (Array.isArray(doubleParsed)) return doubleParsed;
      }
    }
    throw new Error("Invalid embedding format");
  };

  for (const notice of notices) {
    if (!notice.embedding) continue;
    try {
      const embedding = parseEmbedding(notice.embedding);
      results.push({
        id: notice.id,
        type: "notice",
        title: notice.title,
        body: notice.body,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch {}
  }

  for (const menu of messMenus) {
    if (!menu.embedding) continue;
    try {
      const embedding = parseEmbedding(menu.embedding);
      results.push({
        id: menu.id,
        type: "mess",
        title: `${menu.day} ${menu.meal}`,
        body: menu.items,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch {}
  }

  for (const deadline of deadlines) {
    if (!deadline.embedding) continue;
    try {
      const embedding = parseEmbedding(deadline.embedding);
      results.push({
        id: deadline.id,
        type: "deadline",
        title: deadline.title,
        body: `${deadline.subject} due ${deadline.dueDate.toISOString()}`,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch {}
  }

  for (const cls of classes) {
    if (!cls.embedding) continue;
    try {
      const embedding = parseEmbedding(cls.embedding);
      results.push({
        id: cls.id,
        type: "schedule",
        title: cls.subject,
        body: `${cls.subject} taught by ${cls.faculty || "Unknown"} on ${cls.day} at ${cls.startTime}-${cls.endTime} in ${cls.room || "Unknown"}`,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch {}
  }

  for (const expense of expenses) {
    if (!expense.embedding) continue;
    try {
      const embedding = parseEmbedding(expense.embedding);
      results.push({
        id: expense.id,
        type: "expense",
        title: `Expense: ${expense.category}`,
        body: `Spent ₹${expense.amount} on ${expense.description} on ${expense.date.toISOString().split("T")[0]}`,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch {}
  }

  for (const log of wellnessLogs) {
    if (!log.embedding) continue;
    try {
      const embedding = parseEmbedding(log.embedding);
      results.push({
        id: log.id,
        type: "wellness",
        title: `Wellness Log`,
        // Wellness string template
        body: `Mood: ${log.mood}/5, Stress: ${log.stressLevel}/5, Sleep: ${log.sleepHours}h. Notes: ${log.notes}. Date: ${log.date.toISOString().split("T")[0]}`,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch {}
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

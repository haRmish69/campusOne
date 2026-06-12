import { prisma } from "./prisma";
import { cosineSimilarity } from "./embeddings";

export type SearchResult = {
  id: string;
  type: "notice" | "mess" | "deadline" | "schedule";
  title: string;
  body: string;
  similarity: number;
}

export async function searchAcrossTables(queryEmbedding: number[], userId: string, topK: number = 5): Promise<SearchResult[]> {
  const [notices, messMenus, deadlines, classes] = await Promise.all([
    prisma.notice.findMany(),
    prisma.messMenu.findMany(),
    prisma.deadline.findMany({
      where: { OR: [{ userId }, { userId: null }] }
    }),
    prisma.classSchedule.findMany({
      where: { OR: [{ userId }, { userId: null }] }
    })
  ]);

  const results: SearchResult[] = [];

  const parseEmbedding = (raw: any): number[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") return JSON.parse(raw);
    throw new Error("Invalid embedding format");
  };

  for (const notice of notices) {
    try {
      const embedding = parseEmbedding(notice.embedding);
      results.push({
        id: notice.id,
        type: "notice",
        title: notice.title,
        body: notice.body,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch (e) {
      console.warn(`Skipping notice ${notice.id} due to embedding parse error.`);
    }
  }

  for (const menu of messMenus) {
    try {
      const embedding = parseEmbedding(menu.embedding);
      results.push({
        id: menu.id,
        type: "mess",
        title: `${menu.day} ${menu.meal}`,
        body: menu.items,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch (e) {
      console.warn(`Skipping mess menu ${menu.id} due to embedding parse error.`);
    }
  }

  for (const deadline of deadlines) {
    try {
      const embedding = parseEmbedding(deadline.embedding);
      results.push({
        id: deadline.id,
        type: "deadline",
        title: deadline.title,
        body: `${deadline.subject} due ${deadline.dueDate.toISOString()}`,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch (e) {
      console.warn(`Skipping deadline ${deadline.id} due to embedding parse error.`);
    }
  }

  for (const cls of classes) {
    try {
      const embedding = parseEmbedding(cls.embedding);
      results.push({
        id: cls.id,
        type: "schedule",
        title: cls.subject,
        body: `${cls.subject} taught by ${cls.faculty || "Unknown"} on ${cls.day} at ${cls.startTime}-${cls.endTime} in ${cls.room || "Unknown"}`,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      });
    } catch (e) {
      console.warn(`Skipping class ${cls.id} due to embedding parse error.`);
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

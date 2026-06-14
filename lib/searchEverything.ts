import { prisma } from "./prisma";
import { embedText, cosineSimilarity } from "./embeddings";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  body: string;
  similarity: number;
};

/**
 * Unified cross-domain search across all Ring 1-3 tables.
 * Uses in-memory cosine similarity — perfectly fast for <100 students.
 * Replaces searchAcrossTables with 13-table coverage.
 */
export async function searchEverything(
  query: string,
  instituteName: string,
  userId: string,
  topK: number = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await embedText(query);
  const results: SearchResult[] = [];

  // Helper: score and push results
  function scoreAndPush(
    items: any[],
    type: string,
    titleFn: (item: any) => string,
    bodyFn: (item: any) => string
  ) {
    for (const item of items) {
      try {
        const emb = typeof item.embedding === "string"
          ? JSON.parse(item.embedding)
          : item.embedding;
        if (!Array.isArray(emb) || emb.length === 0) continue;
        const sim = cosineSimilarity(queryEmbedding, emb);
        results.push({
          id: item.id,
          type,
          title: titleFn(item),
          body: bodyFn(item),
          similarity: sim,
        });
      } catch {
        // Skip items with invalid embeddings
      }
    }
  }

  const userProfile = await prisma.userProfile.findUnique({ where: { userId } });
  const profileId = userProfile?.id || "";

  // Fetch all tables in parallel (Promise.allSettled — never let one failure block search)
  const [
    notices, deadlines, schedules, menus, expenses, wellness, expertise,
    companies, experiences, questions, routes, services, guides,
    places, trips, tips
  ] = await Promise.allSettled([
    prisma.notice.findMany({ where: { instituteName } }),
    prisma.deadline.findMany({ where: { userId } }),
    prisma.classSchedule.findMany({ where: { userId } }),
    prisma.messMenu.findMany({ where: { instituteName } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.wellnessLog.findMany({ where: { userId } }),
    prisma.expertiseSeed.findMany({ where: { profileId } }),
    prisma.company.findMany({ where: { instituteName } }),
    prisma.interviewExperience.findMany({ where: { instituteName } }),
    prisma.prepQuestion.findMany({ where: { instituteName } }),
    prisma.transportRoute.findMany({ where: { instituteName } }),
    prisma.campusService.findMany({ where: { instituteName } }),
    prisma.processGuide.findMany({ where: { instituteName } }),
    prisma.localPlace.findMany({ where: { instituteName } }),
    prisma.tripRecommendation.findMany({ where: { instituteName } }),
    prisma.survivalTip.findMany({ where: { instituteName } }),
  ]);

  // Score each table's results
  if (notices.status === "fulfilled") {
    scoreAndPush(notices.value, "notice", n => n.title, n => n.body);
  }
  if (deadlines.status === "fulfilled") {
    scoreAndPush(deadlines.value, "deadline", d => d.title, d => `${d.subject} due ${d.dueDate}`);
  }
  if (schedules.status === "fulfilled") {
    scoreAndPush(schedules.value, "schedule", s => `${s.subject} (${s.day})`, s => `${s.startTime}-${s.endTime} in ${s.room || "TBA"}`);
  }
  if (menus.status === "fulfilled") {
    scoreAndPush(menus.value, "mess", m => `${m.day} ${m.meal}`, m => m.items);
  }
  if (expenses.status === "fulfilled") {
    scoreAndPush(expenses.value, "expense", e => `₹${e.amount} ${e.category}`, e => e.description);
  }
  if (wellness.status === "fulfilled") {
    scoreAndPush(wellness.value.filter(w => w.embedding), "wellness", w => `Mood: ${w.mood}/5`, w => w.notes || "");
  }
  if (expertise.status === "fulfilled") {
    scoreAndPush(expertise.value, "expertise", e => e.topic, e => `Source: ${e.source}, Confidence: ${e.confidence}`);
  }
  if (companies.status === "fulfilled") {
    scoreAndPush(companies.value, "company", c => c.name, c => `${c.domain} | ${c.description || "No description"}`);
  }
  if (experiences.status === "fulfilled") {
    scoreAndPush(experiences.value, "experience", e => `Interview: ${e.outcome}`, e => e.overallTips);
  }
  if (questions.status === "fulfilled") {
    scoreAndPush(questions.value, "prep_question", q => `[${q.round}] Question`, q => q.question);
  }
  if (routes.status === "fulfilled") {
    scoreAndPush(routes.value, "transport", r => r.name, r => `${r.type} | ${r.notes || "No notes"}`);
  }
  if (services.status === "fulfilled") {
    scoreAndPush(services.value, "service", s => s.name, s => `${s.category} at ${s.location}`);
  }
  if (guides.status === "fulfilled") {
    scoreAndPush(guides.value, "guide", g => g.title, g => JSON.stringify(g.steps));
  }
  if (places.status === "fulfilled") {
    scoreAndPush(places.value, "place", p => p.name, p => p.description);
  }
  if (trips.status === "fulfilled") {
    scoreAndPush(trips.value, "trip", t => t.destination, t => t.howToGet);
  }
  if (tips.status === "fulfilled") {
    scoreAndPush(tips.value, "tip", t => t.title, t => t.tip);
  }

  // Sort by similarity, return top K
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

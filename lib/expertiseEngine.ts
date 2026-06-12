import { prisma } from "./prisma";
import { embedText } from "./embeddings";
import { ExpertiseSeed } from "@prisma/client";

export async function upsertExpertise(
  profileId: string, // We use Clerk's userId here
  topic: string,
  source: string
): Promise<ExpertiseSeed | null> {
  try {
    const normalizedTopic = topic.trim().toLowerCase();
    
    const existing = await prisma.expertiseSeed.findUnique({
      where: {
        profileId_topic_source: {
          profileId,
          topic: normalizedTopic,
          source
        }
      }
    });

    if (existing) {
      return await prisma.expertiseSeed.update({
        where: { id: existing.id },
        data: { confidence: existing.confidence + 1 }
      });
    }

    const embeddingArray = await embedText(normalizedTopic);

    return await prisma.expertiseSeed.create({
      data: {
        profileId,
        topic: normalizedTopic,
        source,
        confidence: 1,
        embedding: JSON.stringify(embeddingArray)
      }
    });

  } catch (error) {
    console.error(`upsertExpertise Error [${profileId}, ${topic}]:`, error);
    return null;
  }
}

export async function getExpertiseProfile(
  profileId: string
): Promise<{ topic: string; confidence: number; sources: string[] }[]> {
  const rows = await prisma.expertiseSeed.findMany({
    where: { profileId }
  });

  const grouped = new Map<string, { confidence: number; sources: Set<string> }>();

  for (const row of rows) {
    if (!grouped.has(row.topic)) {
      grouped.set(row.topic, { confidence: 0, sources: new Set() });
    }
    const data = grouped.get(row.topic)!;
    data.confidence += row.confidence;
    data.sources.add(row.source);
  }

  const result = Array.from(grouped.entries()).map(([topic, data]) => ({
    topic,
    confidence: data.confidence,
    sources: Array.from(data.sources)
  }));

  result.sort((a, b) => b.confidence - a.confidence);
  return result;
}

export async function seedFromSchedule(profileId: string): Promise<void> {
  try {
    // profileId is the Clerk userId
    const classes = await prisma.classSchedule.findMany({
      where: { userId: profileId },
      select: { subject: true }
    });

    const uniqueSubjects = Array.from(new Set(classes.map(c => c.subject)));

    for (const subject of uniqueSubjects) {
      if (subject.trim()) {
        await upsertExpertise(profileId, subject, "schedule");
      }
    }
  } catch (error) {
    console.error(`seedFromSchedule Error [${profileId}]:`, error);
  }
}

export async function getExpertiseSuggestions(
  profileId: string
): Promise<string[]> {
  const profile = await getExpertiseProfile(profileId);
  const classes = await prisma.classSchedule.findMany({
    where: { userId: profileId },
    select: { subject: true }
  });

  const suggestions = new Set<string>();
  
  for (const p of profile) {
    suggestions.add(p.topic);
  }
  
  for (const c of classes) {
    if (c.subject.trim()) {
      suggestions.add(c.subject.trim().toLowerCase());
    }
  }

  return Array.from(suggestions);
}

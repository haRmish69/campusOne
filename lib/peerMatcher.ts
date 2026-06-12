import { prisma } from "./prisma";
import { cosineSimilarity } from "./embeddings";
import { LearningRequest, ExpertiseSeed } from "@prisma/client";

export async function findCandidatesForRequest(
  request: LearningRequest,
  requesterId: string,
  topK: number = 5
): Promise<{ profileId: string; score: number; matchedTopic: string }[]> {
  try {
    let queryEmbedding: number[];
    if (typeof request.embedding === "string") {
      queryEmbedding = JSON.parse(request.embedding);
    } else {
      queryEmbedding = request.embedding as any as number[];
    }

    const requesterProfile = await prisma.userProfile.findUnique({
      where: { userId: requesterId }
    });

    if (!requesterProfile) {
      console.error("Requester profile not found for matching.");
      return [];
    }

    const existingMatches = await prisma.learningMatch.findMany({
      where: { requestId: request.id },
      select: { helperId: true }
    });
    const alreadyMatchedIds = new Set(existingMatches.map(m => m.helperId));

    const seeds = await prisma.expertiseSeed.findMany({
      where: {
        profileId: { not: requesterId },
        confidence: { gte: 1 }
      }
    });

    // SCALE NOTE: at >10k rows, replace with approximate nearest-neighbor search.
    
    // Pre-fetch candidate profiles to get branch and instituteName
    const candidateProfileIds = Array.from(new Set(seeds.map(s => s.profileId)));
    const candidateProfiles = await prisma.userProfile.findMany({
      where: { userId: { in: candidateProfileIds } }
    });
    const profileMap = new Map(candidateProfiles.map(p => [p.userId, p]));

    const candidateScores = new Map<string, { score: number; matchedTopic: string }>();

    for (const seed of seeds) {
      if (alreadyMatchedIds.has(seed.profileId)) continue;
      
      const seedProfile = profileMap.get(seed.profileId);
      if (!seedProfile) continue;

      let seedEmbedding: number[];
      if (typeof seed.embedding === "string") {
        seedEmbedding = JSON.parse(seed.embedding);
      } else {
        seedEmbedding = seed.embedding as any as number[];
      }

      let score = cosineSimilarity(queryEmbedding, seedEmbedding);

      if (seedProfile.instituteName === requesterProfile.instituteName) {
        score *= 1.3;
      }
      if (seedProfile.branch && requesterProfile.branch && seedProfile.branch.toLowerCase() === requesterProfile.branch.toLowerCase()) {
        score *= 1.1;
      }

      score *= (0.5 + seed.confidence * 0.25);

      const existingBest = candidateScores.get(seed.profileId);
      if (!existingBest || score > existingBest.score) {
        candidateScores.set(seed.profileId, { score, matchedTopic: seed.topic });
      }
    }

    const sortedCandidates = Array.from(candidateScores.entries())
      .map(([profileId, data]) => ({ profileId, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return sortedCandidates;
  } catch (error) {
    console.error("findCandidatesForRequest Error:", error);
    return [];
  }
}

export async function createMatchesAndNotify(
  request: LearningRequest,
  candidates: { profileId: string; score: number; matchedTopic: string }[]
): Promise<void> {
  for (const candidate of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        const match = await tx.learningMatch.create({
          data: {
            requestId: request.id,
            requesterId: request.requesterId,
            helperId: candidate.profileId,
            status: "pending"
          }
        });

        const message = request.isAnonymous
          ? `Someone wants to learn "${request.topic}" — can you help?`
          : `A student wants to learn "${request.topic}" — can you help?`;

        await tx.peerNotification.create({
          data: {
            profileId: candidate.profileId,
            type: "new_request",
            referenceId: match.id,
            message
          }
        });
      });
    } catch (error) {
      console.error(`createMatchesAndNotify Error for candidate ${candidate.profileId}:`, error);
      // Swallow error for this candidate so others can proceed
    }
  }
}

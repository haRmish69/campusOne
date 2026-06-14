import { prisma } from "./prisma";
import { cosineSimilarity } from "./embeddings";
import { HelpRequest } from "@prisma/client";

// ── broadcastHelpRequest ──
export async function broadcastHelpRequest(
  request: HelpRequest,
  requesterProfileId: string
): Promise<{ notified: number }> {
  try {
    const requesterProfile = await prisma.userProfile.findUnique({
      where: { id: requesterProfileId },
    });
    if (!requesterProfile) return { notified: 0 };

    let queryEmbedding: number[];
    if (typeof request.embedding === "string") {
      queryEmbedding = JSON.parse(request.embedding);
    } else {
      queryEmbedding = request.embedding as any as number[];
    }

    // Fetch all expertise seeds except the requester's
    const seeds = await prisma.expertiseSeed.findMany({
      where: { profileId: { not: requesterProfileId } },
    });

    if (seeds.length === 0) return { notified: 0 };

    // Fetch all candidate profiles
    const candidateIds = Array.from(new Set(seeds.map((s) => s.profileId)));
    const profiles = await prisma.userProfile.findMany({
      where: { id: { in: candidateIds } },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Score each seed
    const candidateScores = new Map<string, number>();

    for (const seed of seeds) {
      const profile = profileMap.get(seed.profileId);
      if (!profile) continue;

      let seedEmbedding: number[];
      if (typeof seed.embedding === "string") {
        seedEmbedding = JSON.parse(seed.embedding);
      } else {
        seedEmbedding = seed.embedding as any as number[];
      }

      let score = cosineSimilarity(queryEmbedding, seedEmbedding);

      // Multipliers
      if (profile.instituteName === requesterProfile.instituteName) {
        score *= 1.4; // same campus — near-required
      }
      if ((profile.year ?? 0) >= (requesterProfile.year ?? 0)) {
        score *= 1.2; // same or senior
      }
      score *= 0.5 + seed.confidence * 0.2; // confidence boost
      if (profile.responseRate < 0.3) {
        score *= 0.8; // penalize low responders
      }

      const existing = candidateScores.get(seed.profileId);
      if (!existing || score > existing) {
        candidateScores.set(seed.profileId, score);
      }
    }

    // Sort and take top 15
    const sorted = Array.from(candidateScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // Create notifications
    const message = buildNotificationMessage(request, requesterProfile);

    for (const [candidateProfileId] of sorted) {
      await prisma.peerNotification.create({
        data: {
          profileId: candidateProfileId,
          type: "help_needed",
          referenceId: request.id,
          message,
          actionUrl: `/peer-learning?tab=help&requestId=${request.id}`,
        },
      });
    }

    return { notified: sorted.length };
  } catch (error) {
    console.error("broadcastHelpRequest Error:", error);
    return { notified: 0 };
  }
}

// ── buildNotificationMessage ──
function buildNotificationMessage(
  request: HelpRequest,
  requester: { name: string | null; year: number | null; branch: string | null }
): string {
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  const getSuffix = (n: number) => suffixes[n] || "th";

  const urgencyPrefix =
    request.urgency === "high"
      ? "🚨 Urgent: "
      : "";

  const requesterDisplay = request.isAnonymous
    ? `A ${requester.year || "?"}${getSuffix(requester.year || 0)}-year ${requester.branch || ""} student`
    : requester.name || "A student";

  const descSnippet = request.description
    ? ` "${request.description.slice(0, 80)}${request.description.length > 80 ? "..." : ""}"`
    : "";

  return `${urgencyPrefix}${requesterDisplay} needs help with "${request.topic}".${descSnippet} Can you help?`;
}

import { prisma } from "./prisma";

// ── computeReputationScore ──
export async function computeReputationScore(profileId: string): Promise<number> {
  const profile = await prisma.userProfile.findUnique({ where: { id: profileId } });
  if (!profile) return 0;

  const { totalHelped, avgRating, responseRate } = profile;

  const weights = {
    totalHelped: 0.30,
    avgRating: 0.35,
    responseRate: 0.20,
    recencyBoost: 0.15,
  };

  // Log scale: 0→0, 5→50, 20→80, 100→100
  const helpedScore = Math.min(100, Math.log(totalHelped + 1) / Math.log(100) * 100);

  // Direct 1-5 → 0-100 (default 50 if no ratings yet)
  const ratingScore = avgRating ? (avgRating - 1) / 4 * 100 : 50;

  // Direct 0-1 → 0-100
  const responseScore = responseRate * 100;

  // Recent sessions in last 30 days
  const recentSessions = await prisma.studySession.count({
    where: {
      helperId: profileId,
      status: "completed",
      completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  const recencyScore = Math.min(100, recentSessions * 20);

  const composite =
    helpedScore * weights.totalHelped +
    ratingScore * weights.avgRating +
    responseScore * weights.responseRate +
    recencyScore * weights.recencyBoost;

  const rounded = Math.round(composite);

  await prisma.userProfile.update({
    where: { id: profileId },
    data: { reputationScore: rounded },
  });

  return rounded;
}

// ── updateResponseRate ──
export async function updateResponseRate(helperId: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const totalNotified = await prisma.helpVolunteer.count({
    where: { helperId, notifiedAt: { gte: thirtyDaysAgo } },
  });

  if (totalNotified === 0) return;

  const responded = await prisma.helpVolunteer.count({
    where: {
      helperId,
      notifiedAt: { gte: thirtyDaysAgo },
      respondedAt: { not: null },
    },
  });

  const rate = Math.max(0.1, responded / totalNotified);

  await prisma.userProfile.update({
    where: { id: helperId },
    data: { responseRate: parseFloat(rate.toFixed(2)) },
  });
}

// ── rankVolunteers ──
export type RankedVolunteer = {
  volunteerId: string;
  helperId: string;
  name: string;
  branch: string;
  year: number;
  reputationScore: number;
  totalHelped: number;
  avgRating: number | null;
  responseRate: number;
  topicExpertiseConfidence: number;
  message: string | null;
  rankScore: number;
  rankBadge: string | null;
};

export async function rankVolunteers(
  requestId: string,
  requestTopic: string
): Promise<RankedVolunteer[]> {
  const volunteers = await prisma.helpVolunteer.findMany({
    where: { requestId, status: "volunteered" },
  });

  if (volunteers.length === 0) return [];

  const normalizedTopic = requestTopic.trim().toLowerCase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const ranked: RankedVolunteer[] = [];

  for (const vol of volunteers) {
    const profile = await prisma.userProfile.findUnique({
      where: { id: vol.helperId },
    });
    if (!profile) continue;

    // Get expertise confidence for this specific topic
    const expertiseSeeds = await prisma.expertiseSeed.findMany({
      where: { profileId: vol.helperId },
    });

    let topicExpertiseConfidence = 0;
    for (const seed of expertiseSeeds) {
      if (seed.topic.toLowerCase() === normalizedTopic) {
        topicExpertiseConfidence += seed.confidence;
      }
    }
    topicExpertiseConfidence = Math.min(5, topicExpertiseConfidence);

    // Recent help count
    const recentHelpCount = await prisma.studySession.count({
      where: {
        helperId: vol.helperId,
        status: "completed",
        completedAt: { gte: thirtyDaysAgo },
      },
    });

    // Compute rank score
    const topicWeight = topicExpertiseConfidence * 10;       // 0-50
    const reputationWeight = profile.reputationScore * 0.4;  // 0-40
    const recencyWeight = Math.min(20, recentHelpCount * 5); // 0-20
    const responseWeight = profile.responseRate * 10;         // 0-10
    const rankScore = topicWeight + reputationWeight + recencyWeight + responseWeight;

    // Assign badge
    let rankBadge: string | null = null;
    if (profile.totalHelped >= 10 && (profile.avgRating ?? 0) >= 4.5) {
      rankBadge = "Top Helper";
    } else if (topicExpertiseConfidence >= 3) {
      rankBadge = "Subject Expert";
    } else if (profile.responseRate >= 0.9 && profile.totalHelped >= 3) {
      rankBadge = "Quick Responder";
    }

    ranked.push({
      volunteerId: vol.id,
      helperId: vol.helperId,
      name: profile.name || "Anonymous",
      branch: profile.branch || profile.major || "Unknown",
      year: profile.year || 1,
      reputationScore: profile.reputationScore,
      totalHelped: profile.totalHelped,
      avgRating: profile.avgRating,
      responseRate: profile.responseRate,
      topicExpertiseConfidence,
      message: vol.message,
      rankScore,
      rankBadge,
    });
  }

  ranked.sort((a, b) => b.rankScore - a.rankScore);
  return ranked;
}

import { prisma } from "./prisma";

export type BurnoutSignals = {
  deadlineClusterScore: number;
  overdueCount: number;
  scheduleLoadToday: number;
  selfReportedScore: number;
  peerIsolationScore: number;
  placementAnxietyScore: number;
  campusConfinementScore: number;
  nutritionScore: number;
  recoveryDeficitScore: number;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function computeBurnoutSignals(userId: string): Promise<BurnoutSignals> {
  const now = new Date();
  const todayDay = DAYS[now.getDay()];

  // 1. Deadline cluster: how many deadlines in next 48hrs
  const in48hrs = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const urgentDeadlines = await prisma.deadline.findMany({
    where: { userId, isComplete: false, dueDate: { gte: now, lte: in48hrs } },
  });
  const deadlineClusterScore = Math.min(10, urgentDeadlines.length * 2.5);

  // 2. Overdue count
  const overdueCount = await prisma.deadline.count({
    where: { userId, isComplete: false, dueDate: { lt: now } },
  });

  // 3. Schedule load today
  const todayClasses = await prisma.classSchedule.findMany({
    where: { userId, day: todayDay },
  });
  const scheduleLoadToday = Math.min(10, todayClasses.length * 1.5);

  // 4. Self-reported (latest wellness within 3 days)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const latestWellness = await prisma.wellnessLog.findFirst({
    where: { userId, date: { gte: threeDaysAgo } },
    orderBy: { date: "desc" },
  });
  const selfReportedScore = latestWellness
    ? Math.min(10, latestWellness.stressLevel * 2)
    : 5;

  // 5. Peer isolation
  const lastPeerActivity = await prisma.learningMatch.findFirst({
    where: {
      OR: [{ requesterId: userId }, { helperId: userId }],
      status: { in: ["accepted", "pending"] },
    },
    orderBy: { createdAt: "desc" },
  });
  const daysSincePeer = lastPeerActivity
    ? Math.floor((now.getTime() - lastPeerActivity.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : 30;
  const peerIsolationScore = Math.min(10, daysSincePeer / 1.5);

  // 6. Placement anxiety
  let placementAnxietyScore = 0;
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingPlacementNotice = await prisma.notice.findFirst({
    where: { category: "placement", eventDate: { gte: now, lte: sevenDaysLater } },
    orderBy: { eventDate: "asc" },
  });
  if (upcomingPlacementNotice) {
    const daysUntilDrive = Math.max(1,
      Math.floor((upcomingPlacementNotice.eventDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );
    // Check for skill gaps
    const skillGap = await prisma.skillGapAnalysis.findFirst({ where: { userId } });
    if (skillGap) {
      const gaps: any[] = typeof skillGap.gaps === "string" ? JSON.parse(skillGap.gaps) : (skillGap.gaps as any[]);
      const missingCount = gaps.filter(g => g.status === "missing").length;
      placementAnxietyScore = Math.min(10, missingCount * 2 + (7 - daysUntilDrive));
    } else {
      placementAnxietyScore = 3; // moderate default
    }
  }

  // 7. Campus confinement
  const lastTransport = await prisma.cabPoolRequest.findFirst({
    where: { initiatorId: userId },
    orderBy: { createdAt: "desc" },
  });
  const daysSinceTransport = lastTransport
    ? Math.floor((now.getTime() - lastTransport.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : 21;
  const campusConfinementScore = Math.min(10, daysSinceTransport / 2.5);

  // 8. Nutrition (proxy: meal ratings = ate)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ratingsThisWeek = await prisma.mealRating.count({
    where: { userId, createdAt: { gte: weekAgo } },
  });
  const expectedRatings = 21; // 3 meals × 7 days
  const missedMeals = Math.max(0, expectedRatings - ratingsThisWeek);
  const nutritionScore = Math.min(10, missedMeals / 2);

  // 9. Recovery deficit
  const lastTrip = await prisma.tripRecommendation.findFirst({
    where: { submittedBy: userId },
    orderBy: { createdAt: "desc" },
  });
  const daysSinceRecovery = lastTrip
    ? Math.floor((now.getTime() - lastTrip.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : 30;
  const recoveryDeficitScore = daysSinceRecovery >= 30 ? 10 : Math.min(10, daysSinceRecovery / 3);

  return {
    deadlineClusterScore,
    overdueCount,
    scheduleLoadToday,
    selfReportedScore,
    peerIsolationScore,
    placementAnxietyScore,
    campusConfinementScore,
    nutritionScore,
    recoveryDeficitScore,
  };
}

// Weights tuned for Indian engineering college context
const WEIGHTS: Record<string, number> = {
  deadlineClusterScore: 0.25,
  placementAnxietyScore: 0.20,
  selfReportedScore: 0.20,
  peerIsolationScore: 0.15,
  nutritionScore: 0.10,
  campusConfinementScore: 0.05,
  recoveryDeficitScore: 0.05,
};

export async function computeCompositeBurnout(signals: BurnoutSignals) {
  // Weighted composite
  const composite =
    signals.deadlineClusterScore * WEIGHTS.deadlineClusterScore +
    signals.placementAnxietyScore * WEIGHTS.placementAnxietyScore +
    signals.selfReportedScore * WEIGHTS.selfReportedScore +
    signals.peerIsolationScore * WEIGHTS.peerIsolationScore +
    signals.nutritionScore * WEIGHTS.nutritionScore +
    signals.campusConfinementScore * WEIGHTS.campusConfinementScore +
    signals.recoveryDeficitScore * WEIGHTS.recoveryDeficitScore;

  // Primary and secondary drivers (highest raw scores)
  const signalEntries = [
    { name: "deadlineClusterScore", value: signals.deadlineClusterScore },
    { name: "placementAnxietyScore", value: signals.placementAnxietyScore },
    { name: "selfReportedScore", value: signals.selfReportedScore },
    { name: "peerIsolationScore", value: signals.peerIsolationScore },
    { name: "nutritionScore", value: signals.nutritionScore },
    { name: "campusConfinementScore", value: signals.campusConfinementScore },
    { name: "recoveryDeficitScore", value: signals.recoveryDeficitScore },
  ].sort((a, b) => b.value - a.value);

  const primaryDriver = signalEntries[0].name;
  const secondaryDriver = signalEntries[1].name;

  // Trajectory: compare with last week's wellness insight
  let trajectory: "improving" | "stable" | "worsening" = "stable";
  // We'll use the last WellnessInsight score as a proxy
  const lastInsight = await prisma.wellnessInsight.findFirst({
    orderBy: { date: "desc" },
  });
  if (lastInsight) {
    const prevScore = lastInsight.score;
    if (composite > prevScore + 1) trajectory = "worsening";
    else if (composite < prevScore - 1) trajectory = "improving";
  }

  return {
    score: Math.round(composite * 10) / 10,
    primaryDriver,
    secondaryDriver,
    trajectory,
    signals,
  };
}

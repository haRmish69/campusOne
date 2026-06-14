import { prisma } from "./prisma";

export type AlertType =
  | "transport_disruption"
  | "cab_pool_available"
  | "service_deadline"
  | "peer_isolation"
  | "skill_gap_urgent"
  | "meal_skip_pattern"
  | "burnout_trajectory";

type Alert = {
  type: AlertType;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  actionLabel?: string;
  actionRoute?: string;
};

/**
 * Compute all cross-domain alerts for a user.
 * Called on dashboard load and periodically.
 */
export async function computeAlerts(userId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  // 1. skill_gap_urgent — drive in ≤3 days with missing skills
  try {
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingDrive = await prisma.notice.findFirst({
      where: { category: "placement", eventDate: { gte: now, lte: threeDaysLater } },
      orderBy: { eventDate: "asc" },
    });

    if (upcomingDrive) {
      const skillGaps = await prisma.skillGapAnalysis.findMany({ where: { userId } });
      for (const sg of skillGaps) {
        const gaps: any[] = typeof sg.gaps === "string" ? JSON.parse(sg.gaps) : (sg.gaps as any[]);
        const missingGaps = gaps.filter(g => g.status === "missing");
        if (missingGaps.length > 0) {
          const company = await prisma.company.findUnique({ where: { id: sg.companyId } });
          const daysUntil = Math.ceil((upcomingDrive.eventDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          const peerMatchIds: string[] = typeof sg.peerMatchIds === "string" ? JSON.parse(sg.peerMatchIds) : (sg.peerMatchIds as string[]);

          alerts.push({
            type: "skill_gap_urgent",
            title: `Urgent: ${missingGaps.length} skill gap(s) for ${company?.name || "a company"} in ${daysUntil} day(s)`,
            body: `You're missing ${missingGaps.map(g => g.skill).join(", ")}. ${peerMatchIds.length > 0 ? "Peers who can help have been identified." : "Post a peer learning request now."}`,
            severity: "critical",
            actionLabel: "View prep plan",
            actionRoute: `/placement/${sg.companyId}`,
          });
        }
      }
    }
  } catch (e) { console.error("Alert: skill_gap_urgent error:", e); }

  // 2. cab_pool_available — open pool going to interview location
  try {
    const openPools = await prisma.cabPoolRequest.findMany({
      where: { status: "open", departureTime: { gt: now } },
    });
    if (openPools.length > 0) {
      for (const pool of openPools.slice(0, 1)) {
        const participants: string[] = typeof pool.participants === "string"
          ? JSON.parse(pool.participants)
          : (pool.participants as string[]);
        if (!participants.includes(userId)) {
          const seatsLeft = pool.seatsAvailable - participants.length;
          const costPerPerson = pool.estimatedCost
            ? Math.round(pool.estimatedCost / pool.seatsAvailable)
            : null;
          alerts.push({
            type: "cab_pool_available",
            title: `Cab pool to ${pool.destination}`,
            body: `${participants.length} students sharing a cab. ${seatsLeft} seat(s) left. ${costPerPerson ? `~₹${costPerPerson}/person.` : ""}`,
            severity: "info",
            actionLabel: "Join the pool",
            actionRoute: "/transport",
          });
        }
      }
    }
  } catch (e) { console.error("Alert: cab_pool_available error:", e); }

  // 3. peer_isolation — no peer activity for 14 days
  try {
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recentPeerActivity = await prisma.studySession.findFirst({
      where: {
        OR: [{ requesterId: userId }, { helperId: userId }],
        createdAt: { gte: fourteenDaysAgo },
      },
    });
    if (!recentPeerActivity) {
      alerts.push({
        type: "peer_isolation",
        title: "No peer connections recently",
        body: "You haven't connected with study peers in over 2 weeks. Learning together reduces stress and improves retention.",
        severity: "warning",
        actionLabel: "Find a study peer",
        actionRoute: "/peer-learning",
      });
    }
  } catch (e) { console.error("Alert: peer_isolation error:", e); }

  // 4. transport_disruption — critical transport updates
  try {
    const criticalUpdates = await prisma.transportUpdate.findMany({
      where: { severity: "critical", expiresAt: { gt: now } },
    });
    for (const u of criticalUpdates.slice(0, 1)) {
      alerts.push({
        type: "transport_disruption",
        title: "Transport disruption",
        body: u.message,
        severity: "critical",
        actionRoute: "/transport",
      });
    }
  } catch (e) { console.error("Alert: transport_disruption error:", e); }

  // 5. meal_skip_pattern — 5+ meal skips detected
  try {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ratingsCount = await prisma.mealRating.count({
      where: { userId, createdAt: { gte: weekAgo } },
    });
    const expectedMeals = 21;
    const missed = expectedMeals - ratingsCount;
    if (missed >= 5) {
      alerts.push({
        type: "meal_skip_pattern",
        title: "Irregular eating pattern detected",
        body: `You've only logged ${ratingsCount} meals this week (expected ~21). Regular meals improve focus and reduce stress.`,
        severity: "warning",
        actionRoute: "/mess",
      });
    }
  } catch (e) { console.error("Alert: meal_skip_pattern error:", e); }

  return alerts;
}

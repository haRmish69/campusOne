import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";

    // Fetch all profiles in the same institute
    const allProfiles = await prisma.userProfile.findMany({
      where: { instituteName: profile.instituteName },
      select: {
        id: true,
        name: true,
        branch: true,
        year: true,
        totalHelped: true,
        avgRating: true,
        reputationScore: true,
      },
    });

    let profiles = [];

    if (period === "month") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentSessions = await prisma.studySession.findMany({
        where: {
          helperId: { in: allProfiles.map((p) => p.id) },
          status: "completed",
          completedAt: { gte: thirtyDaysAgo },
        },
        select: { helperId: true, requesterRating: true },
      });

      const statsMap = new Map();
      for (const s of recentSessions) {
        if (!statsMap.has(s.helperId)) {
          statsMap.set(s.helperId, { count: 0, ratingSum: 0, ratedCount: 0 });
        }
        const stat = statsMap.get(s.helperId);
        stat.count++;
        if (s.requesterRating) {
          stat.ratingSum += s.requesterRating;
          stat.ratedCount++;
        }
      }

      profiles = allProfiles
        .filter((p) => statsMap.has(p.id))
        .map((p) => {
          const stat = statsMap.get(p.id);
          return {
            ...p,
            totalHelped: stat.count,
            avgRating: stat.ratedCount > 0 ? stat.ratingSum / stat.ratedCount : p.avgRating,
            sortScore: stat.count * 100 + (stat.ratedCount > 0 ? stat.ratingSum / stat.ratedCount : 0),
          };
        });

      profiles.sort((a, b) => {
        if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;
        if (b.totalHelped !== a.totalHelped) return b.totalHelped - a.totalHelped;
        return (a.name || "").localeCompare(b.name || "");
      });
    } else {
      profiles = allProfiles.filter((p) => p.totalHelped >= 1);
      profiles.sort((a, b) => {
        if (b.reputationScore !== a.reputationScore) return b.reputationScore - a.reputationScore;
        if (b.totalHelped !== a.totalHelped) return b.totalHelped - a.totalHelped;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    // Rank assignment
    const topProfiles = profiles.slice(0, 10);

    const topHelpers = await Promise.all(
      topProfiles.map(async (p, i) => {
        const seeds = await prisma.expertiseSeed.findMany({
          where: { profileId: p.id },
          orderBy: { confidence: "desc" },
          take: 3,
          select: { topic: true },
        });

        let badge: string | null = null;
        if (p.totalHelped >= 10 && (p.avgRating ?? 0) >= 4.5) badge = "Top Helper";
        else if (seeds.length > 0) badge = "Subject Expert";

        return {
          rank: i + 1,
          profileId: p.id,
          name: p.name || "Anonymous",
          branch: p.branch || "Unknown",
          year: p.year || 0,
          totalHelped: p.totalHelped,
          avgRating: p.avgRating,
          reputationScore: p.reputationScore,
          topTopics: seeds.map((s) => s.topic),
          badge,
        };
      })
    );

    // Current user rank
    let currentUserRank: number | null = null;
    let currentUserScore: number | null = null;

    const userIndex = profiles.findIndex((p) => p.id === profile.id);
    if (userIndex !== -1) {
      currentUserRank = userIndex + 1;
      currentUserScore = profiles[userIndex].reputationScore; // Keep global score for display
    }

    return NextResponse.json({
      topHelpers,
      currentUserRank,
      currentUserScore,
    });
  } catch (error: any) {
    console.error("GET leaderboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

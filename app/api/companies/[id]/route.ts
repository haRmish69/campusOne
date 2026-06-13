import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET /api/companies/[id] — full company profile with experiences, questions, stats
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const [experiences, questions, allExperiences] = await Promise.all([
      prisma.interviewExperience.findMany({
        where: { companyId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.prepQuestion.findMany({
        where: { companyId: id },
        orderBy: { upvotes: "desc" },
        take: 10,
      }),
      prisma.interviewExperience.findMany({
        where: { companyId: id },
        select: { outcome: true, packageOffered: true },
      }),
    ]);

    // Aggregate stats
    const totalExperiences = allExperiences.length;
    const selectedCount = allExperiences.filter(
      (e) => e.outcome === "selected"
    ).length;
    const selectionRate =
      totalExperiences > 0 ? selectedCount / totalExperiences : 0;
    const packagesOffered = allExperiences
      .filter((e) => e.packageOffered != null)
      .map((e) => e.packageOffered as number);
    const avgPackage =
      packagesOffered.length > 0
        ? packagesOffered.reduce((a, b) => a + b, 0) / packagesOffered.length
        : null;

    return NextResponse.json({
      ...company,
      topSkillsRequired: typeof company.topSkillsRequired === "string"
        ? JSON.parse(company.topSkillsRequired as string)
        : company.topSkillsRequired,
      roundDescriptions: company.roundDescriptions
        ? typeof company.roundDescriptions === "string"
          ? JSON.parse(company.roundDescriptions as string)
          : company.roundDescriptions
        : null,
      recentExperiences: experiences,
      topQuestions: questions,
      stats: {
        totalExperiences,
        selectionRate: Math.round(selectionRate * 100),
        avgPackage: avgPackage ? Math.round(avgPackage * 10) / 10 : null,
      },
    });
  } catch (error) {
    console.error("GET /api/companies/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

const VALID_OUTCOMES = [
  "selected",
  "rejected_r1",
  "rejected_r2",
  "rejected_hr",
  "offer_declined",
];

// POST /api/companies/[id]/experience — submit interview experience
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: companyId } = await params;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      batch, branch, outcome, packageOffered, rounds,
      overallTips, isAnonymous, studentName,
    } = body;

    // Validation
    if (!VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json(
        { error: `outcome must be one of: ${VALID_OUTCOMES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!rounds || !Array.isArray(rounds) || rounds.length === 0) {
      return NextResponse.json(
        { error: "rounds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!overallTips || overallTips.length < 50) {
      return NextResponse.json(
        { error: "overallTips must be at least 50 characters" },
        { status: 400 }
      );
    }

    if (!batch || !branch) {
      return NextResponse.json(
        { error: "batch and branch are required" },
        { status: 400 }
      );
    }

    const embeddingText = `${company.name} ${branch} ${outcome} ${overallTips}`;
    const embedding = await embedText(embeddingText);

    const experience = await prisma.interviewExperience.create({
      data: {
        instituteName: company.instituteName,
        companyId,
        userId,
        studentName: isAnonymous ? null : (studentName || null),
        batch,
        branch,
        outcome,
        packageOffered: packageOffered || null,
        rounds: JSON.stringify(rounds),
        overallTips,
        isAnonymous: isAnonymous ?? true,
        embedding: JSON.stringify(embedding),
      },
    });

    // Increment campusVisitCount if batch is a new year for this company
    const existingYears = await prisma.interviewExperience.findMany({
      where: { companyId },
      select: { batch: true },
      distinct: ["batch"],
    });
    const uniqueYears = new Set(existingYears.map((e) => e.batch));
    if (uniqueYears.size > (company.campusVisitCount || 0)) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          campusVisitCount: uniqueYears.size,
          lastVisitedYear: Math.max(...Array.from(uniqueYears).map(Number).filter(n => !isNaN(n))) || null,
        },
      });
    }

    return NextResponse.json(experience, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies/[id]/experience error:", error);
    return NextResponse.json({ error: "Failed to create experience" }, { status: 500 });
  }
}

// DELETE /api/companies/[id]/experience — delete an interview experience
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const experienceId = url.searchParams.get("experienceId");

    if (!experienceId) {
      return NextResponse.json({ error: "Experience ID is required" }, { status: 400 });
    }

    const experience = await prisma.interviewExperience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    if (experience.userId !== userId) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own experiences" }, { status: 403 });
    }

    await prisma.interviewExperience.delete({
      where: { id: experienceId },
    });

    return NextResponse.json({ message: "Experience deleted" });
  } catch (error) {
    console.error("DELETE /api/companies/[id]/experience error:", error);
    return NextResponse.json({ error: "Failed to delete experience" }, { status: 500 });
  }
}

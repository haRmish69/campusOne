import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const REPORT_THRESHOLD = 3; // Auto-remove after this many unique reports

// POST /api/companies/[id]/report — report a company
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

    // Check if user already reported
    const existing = await prisma.companyReport.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already reported this company" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || null;

    // Create report and increment count
    const [, updatedCompany] = await prisma.$transaction([
      prisma.companyReport.create({
        data: { companyId, userId, reason },
      }),
      prisma.company.update({
        where: { id: companyId },
        data: { reportCount: { increment: 1 } },
      }),
    ]);

    // Auto-remove if threshold reached
    if (updatedCompany.reportCount >= REPORT_THRESHOLD) {
      await prisma.$transaction([
        prisma.companyReport.deleteMany({ where: { companyId } }),
        prisma.interviewExperience.deleteMany({ where: { companyId } }),
        prisma.prepQuestion.deleteMany({ where: { companyId } }),
        prisma.company.delete({ where: { id: companyId } }),
      ]);

      return NextResponse.json({
        message: "Company has been removed due to multiple reports",
        removed: true,
      });
    }

    return NextResponse.json({
      message: "Report submitted. Thank you for helping keep data accurate.",
      reportCount: updatedCompany.reportCount,
      removed: false,
    });
  } catch (error) {
    console.error("POST /api/companies/[id]/report error:", error);
    return NextResponse.json({ error: "Failed to report company" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// POST /api/companies/placement-drive — link a placement notice to a company
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { noticeId, companyName, visitDate } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }

    // Find or create company
    let company = await prisma.company.findFirst({
      where: {
        instituteName,
        name: { equals: companyName },
      },
    });

    let isNew = false;

    if (company) {
      // Update visit info
      const currentYear = new Date().getFullYear();
      await prisma.company.update({
        where: { id: company.id },
        data: {
          campusVisitCount: { increment: 1 },
          lastVisitedYear: currentYear,
        },
      });
    } else {
      // Create minimal company entry
      const embedding = await embedText(companyName);
      company = await prisma.company.create({
        data: {
          instituteName,
          name: companyName,
          domain: "other",
          topSkillsRequired: JSON.stringify([]),
          embedding: JSON.stringify(embedding),
          campusVisitCount: 1,
          lastVisitedYear: new Date().getFullYear(),
        },
      });
      isNew = true;
    }

    return NextResponse.json({ companyId: company.id, isNew });
  } catch (error) {
    console.error("POST /api/companies/placement-drive error:", error);
    return NextResponse.json({ error: "Failed to process placement drive" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { generatePrepGuide } from "@/lib/prepGuideGenerator";

// GET /api/companies/[id]/prep-guide — get or generate prep guide
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: companyId } = await params;

    // Check if guide already exists
    let guide = await prisma.companyPrepGuide.findUnique({ where: { companyId } });

    if (guide) {
      // Check if stale (more than 7 days old or new experiences added)
      const experienceCount = await prisma.interviewExperience.count({ where: { companyId } });
      const ageMs = Date.now() - guide.generatedAt.getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (ageMs < sevenDays && experienceCount <= guide.basedOnCount) {
        return NextResponse.json({
          ...guide,
          keyThemes: typeof guide.keyThemes === "string" ? JSON.parse(guide.keyThemes) : guide.keyThemes,
          doList: typeof guide.doList === "string" ? JSON.parse(guide.doList) : guide.doList,
          dontList: typeof guide.dontList === "string" ? JSON.parse(guide.dontList) : guide.dontList,
        });
      }
    }

    // Generate fresh guide
    try {
      const freshGuide = await generatePrepGuide(companyId);
      return NextResponse.json({
        ...freshGuide,
        keyThemes: typeof freshGuide.keyThemes === "string" ? JSON.parse(freshGuide.keyThemes as string) : freshGuide.keyThemes,
        doList: typeof freshGuide.doList === "string" ? JSON.parse(freshGuide.doList as string) : freshGuide.doList,
        dontList: typeof freshGuide.dontList === "string" ? JSON.parse(freshGuide.dontList as string) : freshGuide.dontList,
      });
    } catch (error: any) {
      if (error.message.includes("Need at least")) {
        return NextResponse.json({ error: error.message, minRequired: 2 }, { status: 422 });
      }
      throw error;
    }
  } catch (error) {
    console.error("GET /api/companies/[id]/prep-guide error:", error);
    return NextResponse.json({ error: "Failed to get prep guide" }, { status: 500 });
  }
}

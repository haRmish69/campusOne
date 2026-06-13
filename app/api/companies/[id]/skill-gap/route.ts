import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrRefreshSkillGap } from "@/lib/skillGapEngine";

// GET /api/companies/[id]/skill-gap?userId=xxx
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: companyId } = await params;

    // Use authenticated user
    const result = await getOrRefreshSkillGap(authUserId, companyId);

    return NextResponse.json({
      ...result,
      gaps: typeof result.gaps === "string" ? JSON.parse(result.gaps) : result.gaps,
      peerMatchIds: typeof result.peerMatchIds === "string"
        ? JSON.parse(result.peerMatchIds)
        : result.peerMatchIds,
    });
  } catch (error) {
    console.error("GET /api/companies/[id]/skill-gap error:", error);
    return NextResponse.json({ error: "Failed to analyze skill gap" }, { status: 500 });
  }
}

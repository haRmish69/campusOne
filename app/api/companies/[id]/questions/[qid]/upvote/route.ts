import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// PATCH /api/companies/[id]/questions/[qid]/upvote
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { qid } = await params;

    const question = await prisma.prepQuestion.findUnique({
      where: { id: qid },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Simple upvote — increment by 1
    // For hackathon scale (<100 students), this is fine without per-user tracking
    const updated = await prisma.prepQuestion.update({
      where: { id: qid },
      data: { upvotes: { increment: 1 } },
    });

    return NextResponse.json({ upvotes: updated.upvotes });
  } catch (error) {
    console.error("PATCH upvote error:", error);
    return NextResponse.json({ error: "Failed to upvote" }, { status: 500 });
  }
}

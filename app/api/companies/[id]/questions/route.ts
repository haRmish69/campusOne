import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// POST /api/companies/[id]/questions — add a prep question
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
    const { round, question, answer, difficulty } = body;

    if (!round || !question) {
      return NextResponse.json(
        { error: "round and question are required" },
        { status: 400 }
      );
    }

    const validRounds = ["oa", "technical", "hr", "managerial", "case_study"];
    if (!validRounds.includes(round)) {
      return NextResponse.json(
        { error: `round must be one of: ${validRounds.join(", ")}` },
        { status: 400 }
      );
    }

    const embeddingText = `${company.name} ${round} ${question}`;
    const embedding = await embedText(embeddingText);

    const prepQuestion = await prisma.prepQuestion.create({
      data: {
        instituteName: company.instituteName,
        companyId,
        round,
        question,
        answer: answer || null,
        difficulty: difficulty || "medium",
        submittedBy: userId,
        embedding: JSON.stringify(embedding),
      },
    });

    return NextResponse.json(prepQuestion, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies/[id]/questions error:", error);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}

// GET /api/companies/[id]/questions — list questions for a company
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    const { searchParams } = new URL(req.url);
    const round = searchParams.get("round");

    const where: any = { companyId };
    if (round) where.round = round;

    const questions = await prisma.prepQuestion.findMany({
      where,
      orderBy: { upvotes: "desc" },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("GET /api/companies/[id]/questions error:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

// DELETE /api/companies/[id]/questions — delete a prep question
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const questionId = url.searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const question = await prisma.prepQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (question.submittedBy !== userId) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own questions" }, { status: 403 });
    }

    await prisma.prepQuestion.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ message: "Question deleted" });
  } catch (error) {
    console.error("DELETE /api/companies/[id]/questions error:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}

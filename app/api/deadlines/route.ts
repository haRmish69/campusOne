import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deadlines = await prisma.deadline.findMany({
      where: {
        OR: [
          { userId },
          { userId: null }
        ]
      },
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        subject: true,
        dueDate: true,
        type: true,
        isComplete: true,
        notes: true,
        createdAt: true,
        embedding: false,
      }
    });

    return NextResponse.json({ deadlines });
  } catch (error: any) {
    console.error("Fetch Deadlines Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

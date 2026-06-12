import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const schedules = await prisma.classSchedule.findMany({
      where: {
        OR: [{ userId }, { userId: null }]
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        subject: true,
        faculty: true,
        day: true,
        startTime: true,
        endTime: true,
        room: true,
        createdAt: true,
        embedding: false,
      }
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error("Fetch Schedule Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const schedules = await prisma.classSchedule.findMany({
      where: { userId },
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

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subject, day, startTime, endTime, room, faculty } = body;

    if (!subject || !day || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = await prisma.classSchedule.create({
      data: {
        userId,
        subject,
        day,
        startTime,
        endTime,
        room: room || null,
        faculty: faculty || null,
        embedding: [],
      },
    });

    return NextResponse.json({ success: true, schedule: entry }, { status: 201 });
  } catch (error: any) {
    console.error("Create Schedule Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

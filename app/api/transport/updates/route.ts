import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET /api/transport/updates — active (non-expired) updates
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const updates = await prisma.transportUpdate.findMany({
      where: { instituteName, expiresAt: { gt: new Date() } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(updates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/transport/updates — report a transport update
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { routeId, updateType, message, severity } = body;

    if (!message || message.length < 10 || message.length > 200) {
      return NextResponse.json({ error: "message must be 10-200 chars" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

    const update = await prisma.transportUpdate.create({
      data: {
        instituteName,
        routeId: routeId || null,
        updateType: updateType || "general",
        message,
        reportedBy: userId,
        severity: severity || "info",
        expiresAt,
      },
    });

    return NextResponse.json(update, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create update" }, { status: 500 });
  }
}

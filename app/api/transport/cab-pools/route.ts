import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET /api/transport/cab-pools — open cab pools
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const { searchParams } = new URL(req.url);
    const destination = searchParams.get("destination");

    const where: any = {
      instituteName,
      status: "open",
      departureTime: { gt: new Date() },
    };
    if (destination) {
      where.destination = { contains: destination };
    }

    const pools = await prisma.cabPoolRequest.findMany({
      where,
      orderBy: { departureTime: "asc" },
    });
    return NextResponse.json(pools);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/transport/cab-pools — create a cab pool
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { destination, departureTime, seatsAvailable, estimatedCost, notes } = body;

    if (!destination || !departureTime || !seatsAvailable) {
      return NextResponse.json({ error: "destination, departureTime, seatsAvailable required" }, { status: 400 });
    }

    const departure = new Date(departureTime);
    if (departure <= new Date()) {
      return NextResponse.json({ error: "departureTime must be in the future" }, { status: 400 });
    }

    const pool = await prisma.cabPoolRequest.create({
      data: {
        instituteName,
        initiatorId: userId,
        destination,
        departureTime: departure,
        seatsAvailable,
        estimatedCost: estimatedCost || null,
        participants: JSON.stringify([userId]),
        notes: notes || null,
      },
    });

    return NextResponse.json(pool, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create pool" }, { status: 500 });
  }
}

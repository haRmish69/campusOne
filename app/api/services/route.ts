import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText, cosineSimilarity } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// GET /api/services — list all campus services
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: any = { instituteName };
    if (category) where.category = category;

    const services = await prisma.campusService.findMany({
      where,
      orderBy: { category: "asc" },
    });

    // Lazy expiry: if statusUpdatedAt > 4hrs ago, return "unknown"
    const fourHoursMs = 4 * 60 * 60 * 1000;
    const result = services.map((s) => ({
      ...s,
      currentStatus:
        s.statusUpdatedAt && Date.now() - s.statusUpdatedAt.getTime() < fourHoursMs
          ? s.currentStatus
          : "unknown",
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

// POST /api/services — create a service
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { name, category, location, timings, contactEmail, contactPhone } = body;

    if (!name || !category || !location) {
      return NextResponse.json({ error: "name, category, location required" }, { status: 400 });
    }

    const embedding = await embedText(`${name} ${category} ${location}`);

    const service = await prisma.campusService.create({
      data: {
        instituteName,
        name,
        category,
        location,
        timings: JSON.stringify(timings || []),
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        embedding: JSON.stringify(embedding),
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText, cosineSimilarity } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// GET /api/local/places — list local places
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

    const places = await prisma.localPlace.findMany({
      where,
      orderBy: { upvotes: "desc" },
    });

    return NextResponse.json(places);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 });
  }
}

// POST /api/local/places — contribute a local place
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { name, category, distanceMeters, direction, description, priceRange, timings, phone, mustTry } = body;

    if (!name || !description) {
      return NextResponse.json({ error: "name and description required" }, { status: 400 });
    }

    const embedding = await embedText(`${name} ${category || "other"} ${description}`);

    const place = await prisma.localPlace.create({
      data: {
        instituteName,
        name,
        category: category || "other",
        distanceMeters: distanceMeters || null,
        direction: direction || null,
        description,
        priceRange: priceRange || null,
        timings: timings || null,
        phone: phone || null,
        mustTry: mustTry || null,
        submittedBy: userId,
        embedding: JSON.stringify(embedding),
      },
    });

    return NextResponse.json(place, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create place" }, { status: 500 });
  }
}

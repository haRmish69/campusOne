import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// GET /api/transport/routes
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const { searchParams } = new URL(req.url);
    const day = searchParams.get("day");

    const routes = await prisma.transportRoute.findMany({
      where: { instituteName, isActive: true },
      orderBy: { name: "asc" },
    });

    // Filter by operating day if provided
    if (day) {
      return NextResponse.json(
        routes.filter((r) => {
          const days = typeof r.operatingDays === "string"
            ? JSON.parse(r.operatingDays)
            : r.operatingDays;
          return Array.isArray(days) && (
            days.includes(day) || days.includes("All") || days.includes("Weekdays")
          );
        })
      );
    }

    return NextResponse.json(routes);
  } catch (error) {
    console.error("GET /api/transport/routes error:", error);
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}

// POST /api/transport/routes
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { name, type, stops, operatingDays, frequency, notes } = body;

    if (!name || !type || !stops) {
      return NextResponse.json({ error: "name, type, stops required" }, { status: 400 });
    }

    const stopsText = Array.isArray(stops) ? stops.map((s: any) => s.name).join(" ") : "";
    const embedding = await embedText(`${name} ${type} ${stopsText}`);

    const route = await prisma.transportRoute.create({
      data: {
        instituteName,
        name,
        type,
        stops: JSON.stringify(stops),
        operatingDays: JSON.stringify(operatingDays || ["All"]),
        frequency: frequency || null,
        notes: notes || null,
        embedding: JSON.stringify(embedding),
      },
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error("POST /api/transport/routes error:", error);
    return NextResponse.json({ error: "Failed to create route" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// POST /api/transport/seed — seed demo transport data
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "Demo Campus";

    const existingCount = await prisma.transportRoute.count({ where: { instituteName } });
    if (existingCount > 0) return NextResponse.json({ message: "Already seeded", count: existingCount });

    const routes = [
      {
        name: "Campus → Railway Station",
        type: "bus",
        stops: [
          { name: "Main Gate", time: "08:00" },
          { name: "Clock Tower", time: "08:15" },
          { name: "Railway Station", time: "08:45" },
        ],
        operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        frequency: "Every 30 min (8AM-9PM)",
      },
      {
        name: "Hostel Loop Shuttle",
        type: "shuttle",
        stops: [
          { name: "Boys Hostel Block A", time: "07:30" },
          { name: "Girls Hostel", time: "07:35" },
          { name: "Academic Block", time: "07:45" },
          { name: "Library", time: "07:50" },
          { name: "Canteen", time: "07:55" },
        ],
        operatingDays: ["All"],
        frequency: "Every 15 min (7AM-11PM)",
      },
      {
        name: "Main Gate Auto Stand",
        type: "auto_stand",
        stops: [
          { name: "Main Gate", time: "Available 6AM-10PM" },
        ],
        operatingDays: ["All"],
        frequency: "On demand",
        notes: "Usual fare: ₹30 to railway station, ₹50 to bus stand. Always negotiate before sitting.",
      },
    ];

    for (const r of routes) {
      const stopsText = r.stops.map((s: any) => s.name).join(" ");
      const embedding = await embedText(`${r.name} ${r.type} ${stopsText}`);
      await prisma.transportRoute.create({
        data: {
          instituteName,
          name: r.name,
          type: r.type,
          stops: JSON.stringify(r.stops),
          operatingDays: JSON.stringify(r.operatingDays),
          frequency: r.frequency || null,
          notes: (r as any).notes || null,
          embedding: JSON.stringify(embedding),
        },
      });
    }

    return NextResponse.json({ message: "Transport seeded", count: routes.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Seed failed: " + (error as Error).message }, { status: 500 });
  }
}

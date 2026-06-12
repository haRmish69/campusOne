import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const menus = await prisma.messMenu.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        day: true,
        meal: true,
        items: true,
        isVeg: true,
        createdAt: true,
        embedding: false,
      }
    });

    return NextResponse.json({ menus });
  } catch (error: any) {
    console.error("Fetch Mess Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

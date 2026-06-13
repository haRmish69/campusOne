import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const menus = await prisma.messMenu.findMany({
      where: { userId },
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

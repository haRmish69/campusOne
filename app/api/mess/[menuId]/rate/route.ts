import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// POST /api/mess/[menuId]/rate — rate a mess menu item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ menuId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { menuId: messMenuId } = await params;

    const menu = await prisma.messMenu.findUnique({ where: { id: messMenuId } });
    if (!menu) return NextResponse.json({ error: "Menu not found" }, { status: 404 });

    const body = await req.json();
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const mealRating = await prisma.mealRating.upsert({
      where: { messMenuId_userId: { messMenuId, userId } },
      update: { rating, comment: comment || null },
      create: { messMenuId, userId, rating, comment: comment || null },
    });

    return NextResponse.json(mealRating);
  } catch (error) {
    console.error("POST rate error:", error);
    return NextResponse.json({ error: "Failed to rate" }, { status: 500 });
  }
}

// GET /api/mess/[menuId]/rate — get aggregate rating for a menu
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ menuId: string }> }
) {
  try {
    const { menuId: messMenuId } = await params;

    const ratings = await prisma.mealRating.findMany({
      where: { messMenuId },
    });

    if (ratings.length === 0) {
      return NextResponse.json({ average: null, count: 0, ratings: [] });
    }

    const average = ratings.reduce((a, r) => a + r.rating, 0) / ratings.length;
    return NextResponse.json({
      average: Math.round(average * 10) / 10,
      count: ratings.length,
      ratings,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET /api/food/group-orders — open group orders
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const orders = await prisma.groupOrder.findMany({
      where: {
        instituteName,
        status: "open",
        orderDeadline: { gt: new Date() },
      },
      orderBy: { orderDeadline: "asc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/food/group-orders — create a group order
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { platform, restaurantName, orderDeadline, deliveryLocation, notes } = body;

    if (!restaurantName || !orderDeadline || !deliveryLocation) {
      return NextResponse.json({ error: "restaurantName, orderDeadline, deliveryLocation required" }, { status: 400 });
    }

    const order = await prisma.groupOrder.create({
      data: {
        instituteName,
        initiatorId: userId,
        platform: platform || "other",
        restaurantName,
        orderDeadline: new Date(orderDeadline),
        deliveryLocation,
        participants: JSON.stringify([{ userId, items: "", amount: 0 }]),
        notes: notes || null,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

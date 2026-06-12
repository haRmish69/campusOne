import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId } = await params;
    if (userId !== profileId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.peerNotification.findMany({
        where: { profileId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.peerNotification.count({ where: { profileId } }),
      prisma.peerNotification.count({ where: { profileId, isRead: false } })
    ]);

    // Optimistically mark all as read
    prisma.peerNotification.updateMany({
      where: { profileId, isRead: false },
      data: { isRead: true }
    }).catch(err => console.error("Update notifications read status error:", err));

    return NextResponse.json({ notifications, unreadCount, total });

  } catch (error) {
    console.error("GET /api/peer/notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

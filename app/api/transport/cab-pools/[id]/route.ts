import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// DELETE /api/transport/cab-pools/[id] — delete a cab pool
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: poolId } = await params;

    const pool = await prisma.cabPoolRequest.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    if (pool.initiatorId !== userId) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own cab pools" }, { status: 403 });
    }

    await prisma.cabPoolRequest.delete({
      where: { id: poolId },
    });

    return NextResponse.json({ message: "Cab pool deleted" });
  } catch (error) {
    console.error("DELETE /api/transport/cab-pools/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete cab pool" }, { status: 500 });
  }
}

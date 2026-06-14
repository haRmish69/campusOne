import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// POST /api/transport/cab-pools/[id]/join — Request to join a cab pool
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: poolId } = await params;

    const pool = await prisma.cabPoolRequest.findUnique({ where: { id: poolId } });
    if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

    if (pool.status !== "open" || pool.departureTime <= new Date() || pool.seatsAvailable <= 0) {
      return NextResponse.json({ error: "Pool is no longer available" }, { status: 400 });
    }

    if (pool.initiatorId === userId) {
      return NextResponse.json({ error: "You are the initiator" }, { status: 400 });
    }

    const participants = typeof pool.participants === "string" ? JSON.parse(pool.participants) : (pool.participants as string[]);
    if (participants.includes(userId)) {
      return NextResponse.json({ error: "Already a participant" }, { status: 400 });
    }

    let pending = typeof pool.pendingRequests === "string" ? JSON.parse(pool.pendingRequests) : (pool.pendingRequests as any[] || []);
    
    // Check if already requested
    const existing = pending.find((p: any) => p.userId === userId);
    if (existing) {
      if (existing.status === "rejected") {
        return NextResponse.json({ error: "Your request was rejected" }, { status: 400 });
      }
      return NextResponse.json({ error: "Request already pending" }, { status: 400 });
    }

    pending.push({ userId, status: "pending" });

    await prisma.cabPoolRequest.update({
      where: { id: poolId },
      data: { pendingRequests: JSON.stringify(pending) },
    });

    return NextResponse.json({ message: "Request sent" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to request join" }, { status: 500 });
  }
}

// PATCH /api/transport/cab-pools/[id]/join — Accept or reject a join request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: poolId } = await params;
    const body = await req.json();
    const { requesterId, action } = body; // action: "accept" | "reject"

    if (!requesterId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pool = await prisma.cabPoolRequest.findUnique({ where: { id: poolId } });
    if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

    if (pool.initiatorId !== userId) {
      return NextResponse.json({ error: "Only the initiator can manage requests" }, { status: 403 });
    }

    let pending = typeof pool.pendingRequests === "string" ? JSON.parse(pool.pendingRequests) : (pool.pendingRequests as any[] || []);
    const reqIndex = pending.findIndex((p: any) => p.userId === requesterId && p.status === "pending");

    if (reqIndex === -1) {
      return NextResponse.json({ error: "Pending request not found" }, { status: 404 });
    }

    if (action === "reject") {
      pending[reqIndex].status = "rejected";
      await prisma.cabPoolRequest.update({
        where: { id: poolId },
        data: { pendingRequests: JSON.stringify(pending) },
      });
      return NextResponse.json({ message: "Request rejected" });
    }

    if (action === "accept") {
      if (pool.seatsAvailable <= 0) {
        return NextResponse.json({ error: "No seats available" }, { status: 400 });
      }

      pending[reqIndex].status = "accepted";
      const participants = typeof pool.participants === "string" ? JSON.parse(pool.participants) : (pool.participants as string[]);
      participants.push(requesterId);

      const newSeats = pool.seatsAvailable - 1;
      const newStatus = newSeats <= 0 ? "full" : "open";

      await prisma.cabPoolRequest.update({
        where: { id: poolId },
        data: {
          pendingRequests: JSON.stringify(pending),
          participants: JSON.stringify(participants),
          seatsAvailable: newSeats,
          status: newStatus,
        },
      });

      return NextResponse.json({ message: "Request accepted" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

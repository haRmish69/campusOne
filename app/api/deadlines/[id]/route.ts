import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const { isComplete } = await req.json();

    // Verify ownership
    const deadline = await prisma.deadline.findUnique({ where: { id: p.id } });
    if (!deadline) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (deadline.userId !== userId && deadline.userId !== null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.deadline.update({
      where: { id: p.id },
      data: { isComplete: Boolean(isComplete) },
      select: {
        id: true,
        isComplete: true,
      }
    });

    return NextResponse.json({ success: true, deadline: updated });
  } catch (error: any) {
    console.error("Update Deadline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const { id } = p;

    const deadline = await prisma.deadline.findUnique({ where: { id } });
    if (!deadline) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (deadline.userId !== userId && deadline.userId !== null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.deadline.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Deadline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

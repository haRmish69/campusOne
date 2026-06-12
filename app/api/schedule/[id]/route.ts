import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const { id } = p;

    // Optional: verify ownership before delete
    const cls = await prisma.classSchedule.findUnique({ where: { id } });
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (cls.userId !== userId && cls.userId !== null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.classSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Schedule Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

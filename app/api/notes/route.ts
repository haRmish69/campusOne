import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const whereClause: any = { userId };
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { subject: { contains: search } }
      ];
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error("GET notes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, subject, fileName, fileUrl } = body;

    if (!title || !subject) {
      return NextResponse.json({ error: "Title and subject are required" }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        userId,
        title,
        content: content || "",
        subject,
        fileName,
        fileUrl,
      }
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error("POST notes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

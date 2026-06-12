import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    // Remove embedding from response to keep payload size small
    const sanitizedNotices = notices.map((n: any) => {
      const { embedding, ...rest } = n;
      return rest;
    });

    return NextResponse.json({ notices: sanitizedNotices });
  } catch (error: any) {
    console.error("Error fetching notices:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

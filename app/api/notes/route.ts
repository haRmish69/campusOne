import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Note model has been removed
  return NextResponse.json({ success: true, notes: [] });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Note model has been removed" }, { status: 400 });
}

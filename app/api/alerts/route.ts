import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { computeAlerts } from "@/lib/alertEngine";

// GET /api/alerts — compute and return all active alerts
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const alerts = await computeAlerts(userId);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return NextResponse.json({ error: "Failed to compute alerts" }, { status: 500 });
  }
}

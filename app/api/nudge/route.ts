import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { evaluateUser } from "@/lib/proactiveEngine";

const NULL_RESPONSE = {
  nudge: null,
  type: null,
  actionLabel: null,
  actionHref: null,
};

/**
 * GET /api/nudge
 * Returns a proactive nudge for the current user.
 * ALWAYS returns status 200 — null nudge IS the error state.
 * The frontend never needs error-path UI for this endpoint.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    const result = await evaluateUser(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[NudgeAPI] Error (silent):", error);
    return NextResponse.json(NULL_RESPONSE, { status: 200 });
  }
}

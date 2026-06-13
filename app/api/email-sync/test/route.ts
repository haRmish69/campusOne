import { NextResponse } from "next/server";
import { validateAndRefreshToken, GmailAuthError } from "@/lib/gmail";

export async function GET() {
  try {
    // Check if Gmail env vars are configured at all
    if (
      !process.env.GMAIL_CLIENT_ID ||
      !process.env.GMAIL_CLIENT_SECRET ||
      !process.env.GMAIL_REFRESH_TOKEN
    ) {
      return NextResponse.json({
        valid: false,
        error:
          "Gmail OAuth credentials are not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env.local",
      });
    }

    await validateAndRefreshToken();
    return NextResponse.json({ valid: true });
  } catch (error) {
    if (error instanceof GmailAuthError) {
      return NextResponse.json({
        valid: false,
        code: error.code,
        error: error.message,
      });
    }
    return NextResponse.json({
      valid: false,
      error:
        error instanceof Error ? error.message : "Unknown error testing Gmail",
    });
  }
}

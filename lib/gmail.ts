import { google } from "googleapis";
import { decode } from "he";

// ── Types ──
export interface ParsedEmail {
  gmailId: string;
  threadId: string;
  subject: string;
  from: string;
  receivedAt: Date;
  body: string; // cleaned, truncated plain text — NEVER raw HTML
}

// ── OAuth2 client factory ──
// Call this fresh on every request — never cache the client object
// because the access token may have been refreshed

export function createOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob" // demo: no redirect URI needed
  );
  client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return client;
}

// ── Token validation ──
// Call this before any Gmail API call.
// Returns the refreshed credentials or throws a typed error.

export async function validateAndRefreshToken(): Promise<void> {
  const client = createOAuthClient();
  try {
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error(
        "Gmail OAuth: refresh succeeded but no access_token returned"
      );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("invalid_grant")) {
      throw new GmailAuthError(
        "REFRESH_TOKEN_EXPIRED",
        "Gmail refresh token has expired or been revoked. " +
          "Re-run the OAuth flow to generate a new refresh token. " +
          "See docs/gmail-oauth-setup.md for instructions."
      );
    }
    if (msg.includes("invalid_client")) {
      throw new GmailAuthError(
        "INVALID_CLIENT",
        "GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET is incorrect."
      );
    }
    throw new GmailAuthError("UNKNOWN_AUTH_ERROR", msg);
  }
}

export class GmailAuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "GmailAuthError";
  }
}

// ── HTML stripping ──
// Robust: handles nested tags, inline styles, scripts, entities

function stripHtml(html: string): string {
  // Remove script and style blocks entirely (content + tags)
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  // Replace block-level elements with newlines for readability
  text = text.replace(/<\/(p|div|tr|li|h[1-6]|br)>/gi, "\n");
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, " ");
  // Replace &nbsp; before decode
  text = text.replace(/&nbsp;/gi, " ");
  // Decode HTML entities (e.g. &amp; → &, &#39; → ')
  text = decode(text);
  // Normalize whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();
  return text;
}

// ── MIME body extraction ──
// Walks the MIME part tree to find the best text representation.
// Priority: text/plain > text/html (stripped) > empty string

interface MimePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: MimePart[];
}

function extractBody(payload: MimePart): string {
  function decode64(data: string): string {
    // Gmail uses base64url encoding (- and _ instead of + and /)
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
  }

  function walk(
    part: MimePart
  ): { text: string | null; html: string | null } {
    const result: { text: string | null; html: string | null } = {
      text: null,
      html: null,
    };

    if (part.mimeType === "text/plain" && part.body?.data) {
      result.text = decode64(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      result.html = decode64(part.body.data);
    } else if (part.parts) {
      for (const child of part.parts) {
        const childResult = walk(child);
        if (childResult.text) result.text = result.text ?? childResult.text;
        if (childResult.html) result.html = result.html ?? childResult.html;
      }
    }
    return result;
  }

  const { text, html } = walk(payload);

  if (text) return text;
  if (html) return stripHtml(html);
  return "";
}

// ── Forwarded chain removal ──
// Strips everything after "---------- Forwarded message ---------"
// or "On [date] [person] wrote:" patterns to prevent Gemini
// from extracting stale data from the original email.

function removeForwardedChains(text: string): string {
  const forwardPatterns = [
    /[-]{5,}\s*Forwarded message\s*[-]{5,}/i,
    /On .{10,50} wrote:/i,
    /From:\s*[\w.-]+@[\w.-]+/i, // inline "From:" header in reply chain
  ];
  for (const pattern of forwardPatterns) {
    const match = text.search(pattern);
    if (match > 100) {
      // only strip if there's meaningful content before it
      return text.slice(0, match).trim();
    }
  }
  return text;
}

// ── Main fetch function ──
// For new users (afterDate=null), we use a 7-day lookback window
// combined with the 30-email hard cap — whichever yields fewer emails.

export async function fetchEmailsSince(
  afterDate: Date | null,
  maxResults: number = 30
): Promise<ParsedEmail[]> {
  await validateAndRefreshToken();

  const auth = createOAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  // For new users (null lastEmailSync), default to 7 days ago
  const effectiveAfterDate =
    afterDate ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Build query — "category:primary" excludes Promotions/Social/Updates tabs
  // This is the first privacy gate — reduces volume before LLM filtering
  // Gmail after: uses Unix timestamp in SECONDS (not ms)
  const afterSeconds = Math.floor(effectiveAfterDate.getTime() / 1000);
  const query = `category:primary after:${afterSeconds}`;

  // Step 1: List message IDs (5 quota units)
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults, // hard cap enforced here
  });

  const messages = listResponse.data.messages ?? [];
  if (messages.length === 0) return [];

  // Log if we hit the cap — there might be more emails we're missing
  if (messages.length === maxResults) {
    console.warn(
      `[Gmail] Hit maxResults cap of ${maxResults}. ` +
        `There may be more unprocessed emails. ` +
        `Consider reducing sync interval or increasing cap.`
    );
  }

  // Step 2: Fetch full message for each ID (5 quota units each)
  // Use Promise.allSettled so one failed fetch doesn't abort the batch
  const fetchResults = await Promise.allSettled(
    messages.map((msg) =>
      gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full", // we need the full payload for body extraction
      })
    )
  );

  const parsed: ParsedEmail[] = [];

  for (const result of fetchResults) {
    if (result.status === "rejected") {
      console.error("[Gmail] Failed to fetch message:", result.reason);
      continue; // skip this message, process the rest
    }

    const message = result.value.data;
    const headers = message.payload?.headers ?? [];

    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? "";

    const subject = getHeader("Subject") || "(No subject)";
    const from = getHeader("From") || "Unknown";

    // Use internalDate (Gmail receipt time) not the Date header
    // internalDate is in milliseconds
    const receivedAt = message.internalDate
      ? new Date(parseInt(message.internalDate))
      : new Date();

    // Extract and clean body
    const rawBody = extractBody((message.payload as MimePart) ?? {});
    const cleanBody = removeForwardedChains(rawBody);

    // HARD TRUNCATE at 1500 chars — non-negotiable
    const truncatedBody = cleanBody.slice(0, 1500);

    if (truncatedBody.trim().length < 20) {
      // Skip emails with no meaningful body (image-only, tracking pixels, etc.)
      continue;
    }

    parsed.push({
      gmailId: message.id!,
      threadId: message.threadId!,
      subject,
      from,
      receivedAt,
      body: truncatedBody,
    });
  }

  return parsed;
}

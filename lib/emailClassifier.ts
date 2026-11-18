import { generateContentWithRetryAndFallback } from "./gemini";

// ── Gate 1: Privacy Filter ──
// Binary decision: is this email campus-relevant or private/irrelevant?
// NEVER pass private email content further in the pipeline.

export type PrivacyDecision = {
  isPrivate: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export async function classifyPrivacy(
  subject: string,
  from: string,
  bodyPreview: string // first 300 chars only
): Promise<PrivacyDecision> {
  const preview = bodyPreview.slice(0, 300);

  const prompt = `You are a privacy classifier for a college student's email.
Decide if this email is related to campus/academic life or is private/irrelevant.

CAMPUS-RELEVANT (classify as NOT private):
- College notices, announcements, events
- Exam schedules, results, timetable changes
- Assignment deadlines, project submissions
- Placement drives, internship opportunities
- Hostel, mess, library, admin communications
- Faculty or department communications
- Student club and society updates

PRIVATE/IRRELEVANT (classify as private):
- Personal conversations between individuals
- Banking, OTP, transaction, payment emails
- Shopping, delivery, e-commerce emails
- Social media notifications
- Marketing, promotional, newsletter emails
- Medical, insurance, government personal emails
- Job applications to external companies (not campus placement)
- Anything not directly related to the student's campus life

Email to classify:
Subject: ${subject}
From: ${from}
Body preview: ${preview}

Respond with ONLY a raw JSON object (no markdown):
{
  "isPrivate": true or false,
  "confidence": "high" or "medium" or "low",
  "reason": "one sentence explanation"
}`;

  try {
    const result = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: { temperature: 0.1 },
    });

    let text = result.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text) as PrivacyDecision;

    // Validate — if Gemini returns garbage, default to private (safe fail)
    if (typeof parsed.isPrivate !== "boolean") {
      console.warn(
        "[Privacy] Gemini returned invalid isPrivate, defaulting to private"
      );
      return {
        isPrivate: true,
        confidence: "low",
        reason:
          "Classifier returned invalid response — defaulted to private",
      };
    }
    if (!["high", "medium", "low"].includes(parsed.confidence)) {
      parsed.confidence = "low";
    }

    return parsed;
  } catch (error) {
    console.error("[Privacy] Classification failed:", error);
    // SAFE DEFAULT: if the classifier fails, treat as private
    // Never process an email we couldn't classify
    return {
      isPrivate: true,
      confidence: "low",
      reason:
        "Classification failed due to error — defaulted to private for safety",
    };
  }
}

// ── Gate 2: Entity Extractor ──
// Only called if Gate 1 says isPrivate=false AND confidence != "low"

export type EntityType = "notice" | "deadline" | "schedule_update" | "ignore";

export interface ExtractedNotice {
  type: "notice";
  title: string;
  body: string;
  category: "placement" | "exam" | "event" | "hostel" | "general";
  eventDate: string | null;
  venue: string | null;
  actionRequired: string | null;
}

export interface ExtractedDeadline {
  type: "deadline";
  title: string;
  subject: string;
  dueDate: string;
  deadlineType: "exam" | "assignment" | "project" | "other";
  notes: string | null;
}

export interface ExtractedScheduleUpdate {
  type: "schedule_update";
  updateKind: "cancelled" | "rescheduled" | "room_change" | "new_class";
  subject: string;
  affectedDay: string;
  originalTime: string | null;
  newTime: string | null;
  newRoom: string | null;
  notes: string | null;
}

export interface ExtractedIgnore {
  type: "ignore";
  reason: string;
}

export type ExtractionResult =
  | ExtractedNotice
  | ExtractedDeadline
  | ExtractedScheduleUpdate
  | ExtractedIgnore;

export async function extractEntity(
  subject: string,
  from: string,
  body: string,
  receivedAt: Date
): Promise<ExtractionResult> {
  const todayStr = receivedAt.toISOString().split("T")[0];

  const prompt = `You are an academic data extractor for a college student assistant.
Extract structured data from this campus email.
Today's date: ${todayStr}

Email:
Subject: ${subject}
From: ${from}
Body: ${body}

Classify this email into EXACTLY ONE category and return structured JSON:

If it's a general campus announcement, event, or notice:
{ "type": "notice", "title": "...", "body": "...", "category": "placement"|"exam"|"event"|"hostel"|"general", "eventDate": "YYYY-MM-DD or null", "venue": "... or null", "actionRequired": "... or null" }

If it mentions an assignment, project, or exam deadline:
{ "type": "deadline", "title": "...", "subject": "course name", "dueDate": "YYYY-MM-DD", "deadlineType": "exam"|"assignment"|"project"|"other", "notes": "... or null" }

If it mentions a class being cancelled, rescheduled, or room changed:
{ "type": "schedule_update", "updateKind": "cancelled"|"rescheduled"|"room_change"|"new_class", "subject": "...", "affectedDay": "Monday"|"Tuesday"|..., "originalTime": "HH:MM or null", "newTime": "HH:MM or null", "newRoom": "... or null", "notes": "... or null" }

If the email is campus-related but contains no actionable structured data:
{ "type": "ignore", "reason": "brief explanation" }

Rules:
- For deadlines: dueDate is REQUIRED. If you cannot determine a specific date, use "ignore".
- For schedule_update: affectedDay is REQUIRED.
- Never invent information not present in the email.
- If the email mentions multiple entities (e.g., both a deadline AND a cancelled class),
  extract the MORE ACTIONABLE one (deadline > schedule_update > notice).
- Return ONLY raw JSON. No markdown fences. No preamble.`;

  try {
    const result = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: { temperature: 0.1 },
    });

    let text = result.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text) as ExtractionResult;

    // Validate required fields per type
    if (parsed.type === "deadline") {
      if (
        !(parsed as ExtractedDeadline).dueDate ||
        !isValidDate((parsed as ExtractedDeadline).dueDate)
      ) {
        console.warn(
          "[Extractor] Deadline missing valid dueDate, converting to ignore"
        );
        return {
          type: "ignore",
          reason: "Deadline extracted but dueDate was invalid or missing",
        };
      }
    }
    if (parsed.type === "schedule_update") {
      if (
        !(parsed as ExtractedScheduleUpdate).affectedDay ||
        !isValidDay((parsed as ExtractedScheduleUpdate).affectedDay)
      ) {
        return {
          type: "ignore",
          reason: "Schedule update extracted but affectedDay was invalid",
        };
      }
    }

    return parsed;
  } catch (error) {
    console.error("[Extractor] Extraction failed:", error);
    return { type: "ignore", reason: "Extraction failed due to error" };
  }
}

function isValidDate(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isValidDay(str: string): boolean {
  return [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ].includes(str);
}

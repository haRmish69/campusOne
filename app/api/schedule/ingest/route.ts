import { NextRequest, NextResponse } from "next/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { addToFaissIndex } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const PROMPT = `Extract ALL classes from the timetable. Return a JSON ARRAY of objects (even if there is only one class).
Each object should have these fields:
- subject (string): Name or code of the course (e.g., "CS301: Operating Systems", "PHY101: Physics")
- faculty (string): Name of the professor or instructor. null if unknown.
- day (string): The full day name (e.g., "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday").
- startTime (string): Time in HH:MM format (24-hour).
- endTime (string): Time in HH:MM format (24-hour).
- room (string): Room or building where the class is held. null if unknown.

Return ONLY the JSON array, no markdown.`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data } = await req.json();

    if (!type || !data) {
      return NextResponse.json({ error: "Missing type or data" }, { status: 400 });
    }

    let extractedData: any;

    if (type === "image") {
      const mimeType = data.substring(data.indexOf(":") + 1, data.indexOf(";"));
      const base64Data = data.split(",")[1];
      extractedData = await parseImageToJSON(base64Data, mimeType, PROMPT);
    } else if (type === "text") {
      extractedData = await parseTextToJSON(data, PROMPT);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Normalize: if Gemini returned a single object instead of an array, wrap it
    const classes = Array.isArray(extractedData) ? extractedData : [extractedData];

    // Delete existing schedules for this user before ingesting the new ones
    await prisma.classSchedule.deleteMany({
      where: { userId }
    });

    let instituteName = null;
    let major = null;

    if (userId) {
      const profile = await prisma.userProfile.findUnique({
        where: { userId }
      });
      if (profile) {
        instituteName = profile.instituteName;
        major = profile.major;
      }
    }

    const createdSchedules = [];

    for (const cls of classes) {
      const { subject, faculty, day, startTime, endTime, room } = cls;
      
      const embedString = `class schedule timetable ${subject || "Class"} taught by ${faculty || "Unknown"} on ${day || "Unknown"} from ${startTime || "00:00"} to ${endTime || "00:00"} at ${room || "Unknown"}`;
      const embedding = await embedText(embedString);

      const schedule = await prisma.classSchedule.create({
        data: {
          subject: subject || "Unknown Subject",
          faculty: faculty || null,
          day: day || "Monday",
          startTime: startTime || "00:00",
          endTime: endTime || "00:00",
          room: room || null,
          userId,
          embedding,
          instituteName,
          major,
        }
      });
      // Add to FAISS for semantic search
      await addToFaissIndex(schedule.id, `[CLASS] ${subject || "Class"} taught by ${faculty || "Unknown"} on ${day || "Unknown"} from ${startTime || "00:00"} to ${endTime || "00:00"} at ${room || "Unknown"}`);
      createdSchedules.push({ ...schedule, embedding: undefined });
    }

    return NextResponse.json({ success: true, count: createdSchedules.length, schedules: createdSchedules });
  } catch (error: any) {
    console.error("Schedule Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

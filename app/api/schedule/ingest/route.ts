import { NextRequest, NextResponse } from "next/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const PROMPT = `Extract the following fields for a class schedule from the text. Return ONLY a JSON object.
Fields to extract:
- subject (string): Name or code of the course (e.g., "CS101", "Introduction to Physics")
- faculty (string): Name of the professor or instructor. null if unknown.
- day (string): The full day name (e.g., "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday").
- startTime (string): Time in 24-hour HH:MM format.
- endTime (string): Time in 24-hour HH:MM format.
- room (string): Room or building where the class is held. null if unknown.`;

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

    const { subject, faculty, day, startTime, endTime, room } = extractedData;
    
    const embedString = `${subject || "Class"} taught by ${faculty || "Unknown"} on ${day || "Unknown"} from ${startTime || "00:00"} to ${endTime || "00:00"} at ${room || "Unknown"}`;
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
      }
    });

    return NextResponse.json({ success: true, schedule: { ...schedule, embedding: undefined } });
  } catch (error: any) {
    console.error("Schedule Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

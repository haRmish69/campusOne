import { NextRequest, NextResponse } from "next/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { prisma } from "@/lib/prisma";

const PROMPT = `Extract the following fields from the mess menu. Return ONLY a JSON object.
Fields to extract:
- day (string): "Monday", "Tuesday", etc.
- meal (string): "breakfast", "lunch", or "dinner"
- items (string): Comma-separated list of food items
- isVeg (boolean): true if the menu is strictly vegetarian, false if it contains non-veg items like chicken, fish, egg, or meat.

If the day or meal is not explicitly stated, infer it from context or return "Unknown".`;

export async function POST(req: NextRequest) {
  try {
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

    const { day, meal, items, isVeg } = extractedData;
    
    const embedString = `${day || "Unknown"} ${meal || "Unknown"}: ${items || ""}`;
    const embedding = await embedText(embedString);

    const menu = await prisma.messMenu.create({
      data: {
        day: day || "Unknown",
        meal: meal || "Unknown",
        items: items || "Unknown",
        isVeg: typeof isVeg === "boolean" ? isVeg : true,
        embedding,
      }
    });

    return NextResponse.json({ success: true, menu: { ...menu, embedding: undefined } });
  } catch (error: any) {
    console.error("Mess Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

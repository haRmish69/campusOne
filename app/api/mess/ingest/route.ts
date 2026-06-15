import { NextRequest, NextResponse } from "next/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { addToIndex } from "@/lib/vectorStore";
import { prisma } from "@/lib/prisma";

import { auth } from "@clerk/nextjs/server";

const PROMPT = `Extract ALL meals for ALL days from the mess menu. Return ONLY a JSON ARRAY of objects.
Each object must have these fields:
- day (string): The full day name (e.g., "Monday", "Tuesday", "Wednesday").
- meal (string): The meal type (e.g., "Breakfast", "Lunch", "Evening Snack", "Dinner").
- items (string): Comma-separated list of all food items served for that meal.
- isVeg (boolean): true if the meal is strictly vegetarian, false if it contains non-veg items like chicken, fish, egg, or meat.

Return ONLY the JSON array, no markdown or extra text.`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
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

    // Wrap in array if single object returned
    const menus = Array.isArray(extractedData) ? extractedData : [extractedData];

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

    // Wipe old mess menus to avoid duplication for this user
    await prisma.messMenu.deleteMany({
      where: { userId }
    });

    const createdMenus = [];

    for (const menuObj of menus) {
      const { day, meal, items, isVeg } = menuObj;
      
      const embedString = `${day || "Unknown"} ${meal || "Unknown"}: ${items || ""}`;
      const embedding = await embedText(embedString);

      const menu = await prisma.messMenu.create({
        data: {
          userId,
          day: day || "Unknown",
          meal: meal || "Unknown",
          items: items || "Unknown",
          isVeg: typeof isVeg === "boolean" ? isVeg : true,
          embedding,
          instituteName,
          major,
        }
      });
      // Add to FAISS for semantic search
      await addToIndex(menu.id, `[MESS] ${day || "Unknown"} ${meal || "Unknown"}: ${items || ""}`, "MessMenu", userId, userId ? "private" : "global");
      createdMenus.push({ ...menu, embedding: undefined });
    }

    return NextResponse.json({ success: true, count: createdMenus.length, menus: createdMenus });
  } catch (error: any) {
    console.error("Mess Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

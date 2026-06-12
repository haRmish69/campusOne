import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getExpertiseSuggestions } from "@/lib/expertiseEngine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const suggestions = await getExpertiseSuggestions(userId);

    // If no suggestions, provide some default college topics
    const defaultTopics = [
      "Calculus", "Linear Algebra", "Data Structures", 
      "Algorithms", "Physics", "Chemistry", "Machine Learning", 
      "Web Development", "Database Management", "Computer Networks"
    ];

    const finalSuggestions = suggestions.length > 0 
      ? suggestions.slice(0, 10) 
      : defaultTopics;

    return NextResponse.json(finalSuggestions);

  } catch (error) {
    console.error("GET /api/peer/suggestions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseImageToJSON, parseTextToJSON } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, data, fileName } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Missing type or data" }, { status: 400 });
    }

    // Fetch user's existing folder names to let Gemini align with them
    const existingNotes = await prisma.note.findMany({
      where: { userId },
      select: { subject: true },
      distinct: ["subject"],
    });
    const currentSubjects = existingNotes.map((n) => n.subject);
    const subjectsListText = currentSubjects.length > 0 
      ? `Existing folders in user's library: [${currentSubjects.join(", ")}]. Try to classify this document into one of these folders if it matches, otherwise suggest a new appropriate academic subject folder (e.g., 'Operating Systems', 'Physics', 'Discrete Mathematics').`
      : "Suggest an appropriate academic subject folder name (e.g., 'Operating Systems', 'Physics', 'Discrete Mathematics').";

    let parsed: any;

    if (type === "file") {
      let base64 = data;
      let mimeType = "application/pdf";
      
      const match = data.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64 = match[2];
      }

      // FAST PATH: Use only the first tiny chunk of base64 data (roughly first page)
      // instead of sending the entire multi-MB file to Gemini Vision.
      // For PDFs, we send a small slice. For images, we send the full thing (they're usually small).
      const isPdf = mimeType === "application/pdf";
      
      if (isPdf) {
        // Strategy: Ask Gemini to classify based on filename + a small preview.
        // We send only the first ~100KB of the PDF (enough for the first page or two).
        const previewBase64 = base64.substring(0, 140000); // ~100KB of base64 data
        
        const fastPrompt = `You are analyzing a PDF document. Based on the filename and the first page preview, return ONLY a JSON object with:
- title: string (a descriptive title for this document)
- subject: string (the academic subject folder. ${subjectsListText} Keep it 1-3 words, capitalized like 'Operating Systems')

The filename is: "${fileName || "unknown"}"

Return ONLY raw JSON. No markdown code blocks.`;

        try {
          parsed = await parseImageToJSON(previewBase64, mimeType, fastPrompt);
          // Set content to empty for now — the file is saved as-is
          parsed.content = "";
        } catch (previewError) {
          console.error("Fast preview failed, trying filename-only classification:", previewError);
          
          // Ultimate fallback: classify purely from filename
          const fileNamePrompt = `Based on this filename, suggest a title and academic subject folder.
Filename: "${fileName || "document"}"
${subjectsListText}

Return ONLY a JSON object with:
- title: string (descriptive title based on the filename)  
- subject: string (academic subject folder, 1-3 words, capitalized)

Return ONLY raw JSON. No markdown.`;
          
          parsed = await parseTextToJSON(fileName || "document", fileNamePrompt);
          parsed.content = "";
        }
      } else {
        // For images: they're typically small, so send the full thing
        const imagePrompt = `Analyze this image/document. Return ONLY a JSON object with:
- title: string (descriptive title; use filename '${fileName || ""}' as inspiration)
- subject: string (academic subject folder. ${subjectsListText} Keep it 1-3 words, capitalized)

Return ONLY raw JSON. No markdown code blocks.`;

        parsed = await parseImageToJSON(base64, mimeType, imagePrompt);
        parsed.content = "";
      }
    } else {
      // type === "text"
      const textPrompt = `Analyze the provided notes/document content. Return ONLY a JSON object with:
- title: string (descriptive title)
- content: string (clean text extraction of the content)
- subject: string (academic subject folder. ${subjectsListText} Keep it 1-3 words, capitalized)

Return ONLY raw JSON. No markdown code blocks.`;

      parsed = await parseTextToJSON(data, textPrompt);
    }

    return NextResponse.json({
      success: true,
      title: parsed.title || fileName || "Untitled Note",
      content: parsed.content || "",
      subject: parsed.subject || "General",
    });

  } catch (error: any) {
    console.error("Error in /api/notes/detect-subject:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

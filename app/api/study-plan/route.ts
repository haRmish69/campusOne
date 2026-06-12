import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { answerQuestionStream } from "@/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch deadlines
    const deadlines = await prisma.deadline.findMany({
      where: { isComplete: false },
      orderBy: { dueDate: "asc" }
    });

    // 2. Fetch class schedule
    const classes = await prisma.classSchedule.findMany();

    // 3. Construct prompt
    const prompt = `You are a highly intelligent AI Study Planner. Create a weekly study schedule based on the student's classes and upcoming deadlines.
    
Here are their uncompleted upcoming deadlines:
${deadlines.length === 0 ? "None!" : deadlines.map(d => `- ${d.title} (${d.subject}) due on ${new Date(d.dueDate).toLocaleString()}`).join("\n")}

Here is their class schedule:
${classes.length === 0 ? "No classes uploaded." : classes.map(c => `- ${c.subject} on ${c.day} from ${c.startTime} to ${c.endTime}`).join("\n")}

Please provide a highly structured, realistic study plan for the week. Format the response beautifully using Markdown headings, bold text, and bullet points. Allocate specific time blocks for deep work, avoiding conflicts with their class schedule. Keep the tone encouraging but strictly practical.`;

    // 4. Stream response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const stream = await answerQuestionStream(prompt, "", []);
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk.text()));
          }
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(`\n\n[Error: ${err.message}]`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Study Plan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseImageToJSON, categorizeExpense } from "@/lib/gemini";
import { embedText } from "@/lib/embeddings";
import { addToFaissIndex } from "@/lib/vectorStore";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    let { amount, description, date, source, receiptImage, mimeType } = body;

    // Handle FileUpload generic format: { type: "image", data: "data:image/jpeg;base64,..." }
    if (body.type === "image" && body.data) {
      receiptImage = body.data;
      const match = body.data.match(/^data:(.*?);base64,/);
      mimeType = match ? match[1] : "image/jpeg";
      // Strip the prefix for Gemini
      receiptImage = body.data.replace(/^data:.*?;base64,/, "");
    }

    // Parse receipt if provided
    if (receiptImage && mimeType) {
      const prompt = "Extract the total amount and a short description (e.g. merchant/item) from this receipt. Return ONLY JSON: { \"amount\": number, \"description\": string }. No markdown.";
      const parsed = await parseImageToJSON(receiptImage, mimeType, prompt);
      
      if (typeof parsed.amount === "number") amount = parsed.amount;
      if (typeof parsed.description === "string") description = parsed.description;
      
      source = source || "receipt";
    }

    if (!amount || !description) {
      return NextResponse.json({ error: "Missing required fields (amount, description)" }, { status: 400 });
    }

    // Categorize
    const category = await categorizeExpense(description, amount);
    
    // Embed description for searching later
    const embedding = await embedText(`[EXPENSE] ${category} - ${description}`);

    const expense = await prisma.expense.create({
      data: {
        userId,
        amount: parseFloat(amount.toString()),
        description,
        category,
        date: date ? new Date(date) : new Date(),
        source: source || "manual",
        embedding: JSON.stringify(embedding),
      },
    });

    // Add to FAISS for semantic search
    await addToFaissIndex(expense.id, `[EXPENSE] ${category}: ₹${amount} on ${description}`);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM
    const category = searchParams.get("category");

    const where: any = { userId };
    if (category) {
      where.category = category;
    }
    
    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr);
      const m = parseInt(monthStr) - 1; // 0-indexed
      const startDate = new Date(year, m, 1);
      const endDate = new Date(year, m + 1, 0, 23, 59, 59, 999);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // Remove the embedding field from the response to save bandwidth
    const safeExpenses = expenses.map(e => {
      const { embedding, ...rest } = e;
      return rest;
    });

    return NextResponse.json(safeExpenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

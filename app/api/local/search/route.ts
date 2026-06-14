import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText, cosineSimilarity } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// POST /api/local/search — natural language search across places, trips, tips
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const queryEmbedding = await embedText(query);

    // Fetch all embeddable data from the 3 tables
    const [places, trips, tips] = await Promise.all([
      prisma.localPlace.findMany({ where: { instituteName } }),
      prisma.tripRecommendation.findMany({ where: { instituteName } }),
      prisma.survivalTip.findMany({ where: { instituteName } }),
    ]);

    type SearchResult = {
      id: string;
      type: "place" | "trip" | "tip";
      title: string;
      body: string;
      similarity: number;
    };

    const results: SearchResult[] = [];

    // Score places
    for (const p of places) {
      const emb = typeof p.embedding === "string" ? JSON.parse(p.embedding) : p.embedding;
      const sim = cosineSimilarity(queryEmbedding, emb as number[]);
      results.push({ id: p.id, type: "place", title: p.name, body: p.description, similarity: sim });
    }

    // Score trips
    for (const t of trips) {
      const emb = typeof t.embedding === "string" ? JSON.parse(t.embedding) : t.embedding;
      const sim = cosineSimilarity(queryEmbedding, emb as number[]);
      results.push({ id: t.id, type: "trip", title: t.destination, body: t.howToGet, similarity: sim });
    }

    // Score tips
    for (const t of tips) {
      const emb = typeof t.embedding === "string" ? JSON.parse(t.embedding) : t.embedding;
      const sim = cosineSimilarity(queryEmbedding, emb as number[]);
      results.push({ id: t.id, type: "tip", title: t.title, body: t.tip, similarity: sim });
    }

    // Sort by similarity, return top 5
    results.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json(results.slice(0, 5));
  } catch (error) {
    console.error("POST /api/local/search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

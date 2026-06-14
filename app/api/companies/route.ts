import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// GET /api/companies — list all companies
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const domain = searchParams.get("domain");

    const companyWhere: any = { instituteName };
    if (domain) companyWhere.domain = domain;

    let companies = await prisma.company.findMany({
      where: companyWhere,
      orderBy: [
        { lastVisitedYear: "desc" },
        { campusVisitCount: "desc" },
      ],
    });

    // Fuzzy search by name if search param provided
    if (search) {
      const q = search.toLowerCase();
      companies = companies.filter((c) =>
        c.name.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(companies);
  } catch (error) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

// POST /api/companies — create a company
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "";

    const body = await req.json();
    const {
      name, domain, packageMin, packageMax, interviewRounds,
      roundDescriptions, topSkillsRequired, description, websiteUrl,
      lastVisitedYear,
    } = body;

    if (!name || !domain || !topSkillsRequired) {
      return NextResponse.json(
        { error: "name, domain, and topSkillsRequired are required" },
        { status: 400 }
      );
    }

    // Check for duplicate (case-insensitive within same college, MySQL collation handles this)
    const existing = await prisma.company.findFirst({
      where: {
        instituteName,
        name: name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { exists: true, companyId: existing.id, companyName: existing.name },
        { status: 409 }
      );
    }

    const skills = Array.isArray(topSkillsRequired) ? topSkillsRequired : [];
    const embeddingText = `${name} ${domain} ${skills.join(" ")}`;
    const embedding = await embedText(embeddingText);

    const company = await prisma.company.create({
      data: {
        instituteName,
        name,
        domain,
        packageMin: packageMin || null,
        packageMax: packageMax || null,
        interviewRounds: interviewRounds || null,
        roundDescriptions: roundDescriptions ? JSON.stringify(roundDescriptions) : undefined,
        topSkillsRequired: JSON.stringify(skills),
        description: description || null,
        websiteUrl: websiteUrl || null,
        lastVisitedYear: lastVisitedYear || null,
        addedBy: userId,
        embedding: JSON.stringify(embedding),
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}

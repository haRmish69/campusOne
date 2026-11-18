import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// GET /api/companies — list all campus recruiters
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName?.trim() || "";

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const domain = searchParams.get("domain")?.trim();

    const companyWhere: any = {};
    if (instituteName && instituteName !== "All") {
      companyWhere.OR = [
        { instituteName },
        { instituteName: "" },
        { instituteName: "All" },
      ];
    }
    if (domain && domain !== "all") {
      companyWhere.domain = domain;
    }

    let companies = await prisma.company.findMany({
      where: companyWhere,
      orderBy: [
        { lastVisitedYear: "desc" },
        { campusVisitCount: "desc" },
        { createdAt: "desc" },
      ],
    });

    // Fuzzy search by name, role, or skills if search param provided
    if (search) {
      const q = search.toLowerCase();
      companies = companies.filter((c) => {
        const skills = typeof c.topSkillsRequired === "string" 
          ? c.topSkillsRequired.toLowerCase() 
          : JSON.stringify(c.topSkillsRequired || []).toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.jobRole && c.jobRole.toLowerCase().includes(q)) ||
          skills.includes(q)
        );
      });
    }

    return NextResponse.json(companies);
  } catch (error) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

// POST /api/companies — create or add a campus recruiter
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName?.trim() || "Campus Recruiter";

    const body = await req.json();
    const {
      name,
      jobRole,
      domain = "tech",
      topSkillsRequired,
      minCgpa,
      eligibleBranches,
      requiredExperience,
      description,
      deadline,
      packageMin,
      packageMax,
      interviewRounds,
      roundDescriptions,
      websiteUrl,
      lastVisitedYear = new Date().getFullYear(),
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Parse skills (handles comma-separated string or array)
    let parsedSkills: string[] = [];
    if (Array.isArray(topSkillsRequired)) {
      parsedSkills = topSkillsRequired.map((s: any) => String(s).trim()).filter(Boolean);
    } else if (typeof topSkillsRequired === "string") {
      try {
        const json = JSON.parse(topSkillsRequired);
        if (Array.isArray(json)) parsedSkills = json.map((s: any) => String(s).trim()).filter(Boolean);
        else parsedSkills = topSkillsRequired.split(",").map((s) => s.trim()).filter(Boolean);
      } catch {
        parsedSkills = topSkillsRequired.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    // Parse eligible branches
    let parsedBranches: string[] = [];
    if (Array.isArray(eligibleBranches)) {
      parsedBranches = eligibleBranches.map((b: any) => String(b).trim()).filter(Boolean);
    } else if (typeof eligibleBranches === "string") {
      parsedBranches = eligibleBranches.split(",").map((b) => b.trim()).filter(Boolean);
    }

    // Check for duplicate company
    const existing = await prisma.company.findFirst({
      where: {
        name: { equals: name.trim() },
        ...(jobRole?.trim() ? { jobRole: { equals: jobRole.trim() } } : {}),
      },
    });

    if (existing) {
      return NextResponse.json(
        { exists: true, companyId: existing.id, companyName: existing.name },
        { status: 409 }
      );
    }

    const embeddingText = `${name} ${jobRole || ""} ${domain} ${parsedSkills.join(" ")}`;
    let embedding: any = [];
    try {
      embedding = await embedText(embeddingText);
    } catch {
      embedding = [];
    }

    const company = await prisma.company.create({
      data: {
        instituteName,
        name: name.trim(),
        domain: domain || "tech",
        jobRole: jobRole?.trim() || null,
        minCgpa: minCgpa ? parseFloat(String(minCgpa)) : null,
        eligibleBranches: parsedBranches.length > 0 ? parsedBranches : undefined,
        requiredExperience: requiredExperience?.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        packageMin: packageMin ? parseFloat(String(packageMin)) : null,
        packageMax: packageMax ? parseFloat(String(packageMax)) : null,
        interviewRounds: interviewRounds ? parseInt(String(interviewRounds), 10) : null,
        roundDescriptions: roundDescriptions
          ? (Array.isArray(roundDescriptions) ? roundDescriptions : [String(roundDescriptions)])
          : undefined,
        topSkillsRequired: parsedSkills,
        description: description?.trim() || null,
        websiteUrl: websiteUrl?.trim() || null,
        lastVisitedYear: lastVisitedYear ? parseInt(String(lastVisitedYear), 10) : new Date().getFullYear(),
        campusVisitCount: 1,
        addedBy: userId,
        embedding: embedding.length > 0 ? embedding : [0],
      },
    });

    return NextResponse.json({ success: true, company }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json({ error: error.message || "Failed to create company" }, { status: 500 });
  }
}


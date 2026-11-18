import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { sanitizeError, isRetryableGeminiError } from "@/lib/gemini";

// ─── Programmatic Weighted Match Calculation ─────────────────────────────────
// Technical Skill (40%), Experience/Role (25%), Projects (20%), Education (15%)
function calculateProgrammaticMatchScore(
  studentSkills: string[],
  studentRole: string,
  studentExperience: string[],
  jobTitle: string,
  jobTags: string[],
  jobDescription: string
): {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  qualificationCompat: "High" | "Moderate" | "Developing" | "Not Assessed";
} {
  const normStudentSkills = studentSkills.map((s) => s.toLowerCase().trim());
  const normJobSkills = jobTags.map((t) => t.toLowerCase().trim());

  // 1. Technical Skills Score (Max 40 points)
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  normJobSkills.forEach((jobSkill) => {
    const isMatched = normStudentSkills.some(
      (ss) => ss.includes(jobSkill) || jobSkill.includes(ss)
    );
    if (isMatched) {
      const orig = studentSkills.find(
        (s) => s.toLowerCase().trim() === jobSkill || jobSkill.includes(s.toLowerCase().trim())
      );
      matchedSkills.push(orig || jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  });

  const skillMatchRatio =
    normJobSkills.length > 0 ? matchedSkills.length / normJobSkills.length : 0.6;
  const skillsScore = Math.min(40, Math.round(skillMatchRatio * 40));

  // 2. Role & Title Alignment (Max 25 points)
  const normStudentRole = studentRole.toLowerCase();
  const normJobTitle = jobTitle.toLowerCase();
  let roleScore = 12; // baseline
  if (
    normStudentRole &&
    (normJobTitle.includes(normStudentRole) || normStudentRole.includes(normJobTitle))
  ) {
    roleScore = 25;
  } else {
    // keyword overlap
    const roleWords = normStudentRole.split(/\s+/).filter((w) => w.length > 2);
    const titleMatches = roleWords.filter((w) => normJobTitle.includes(w)).length;
    if (titleMatches >= 2) roleScore = 22;
    else if (titleMatches === 1) roleScore = 18;
  }

  // 3. Project & Domain Relevance (Max 20 points)
  let projectScore = 10;
  const descLower = (jobDescription || "").toLowerCase();
  let projectHits = 0;
  studentExperience.forEach((exp) => {
    const words = exp.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => descLower.includes(w) || normJobTitle.includes(w))) {
      projectHits++;
    }
  });
  if (projectHits >= 2) projectScore = 20;
  else if (projectHits === 1) projectScore = 16;

  // 4. Qualification / Background (Max 15 points)
  let qualScore = 12;
  const isInternship =
    normJobTitle.includes("intern") || normJobTitle.includes("trainee");
  if (isInternship) qualScore = 15;
  else if (normJobTitle.includes("junior") || normJobTitle.includes("entry") || normJobTitle.includes("associate")) {
    qualScore = 14;
  } else if (normJobTitle.includes("senior") || normJobTitle.includes("lead") || normJobTitle.includes("architect")) {
    qualScore = 7; // student is early career
  }

  const totalScore = Math.min(98, Math.max(25, skillsScore + roleScore + projectScore + qualScore));

  const qualificationCompat: "High" | "Moderate" | "Developing" | "Not Assessed" =
    totalScore >= 75 ? "High" : totalScore >= 55 ? "Moderate" : "Developing";

  return {
    score: totalScore,
    matchedSkills: Array.from(new Set(matchedSkills)),
    missingSkills: Array.from(new Set(missingSkills)),
    qualificationCompat,
  };
}

// ─── Fetch Real Jobs from Providers ──────────────────────────────────────────
async function fetchRealJobs(keyword?: string, location?: string): Promise<any[]> {
  const jobs: any[] = [];

  // Provider 1: Remotive (Free, reliable active tech jobs)
  try {
    const searchParam = keyword ? `&search=${encodeURIComponent(keyword)}` : "";
    const remotiveUrl = `https://remotive.com/api/remote-jobs?limit=25${searchParam}`;
    const res = await fetch(remotiveUrl, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.jobs)) {
        data.jobs.forEach((j: any) => {
          jobs.push({
            externalId: `remotive-${j.id}`,
            title: j.title || "Software Engineer",
            companyName: j.company_name || "Tech Company",
            companyLogo: j.company_logo || null,
            location: j.candidate_required_location || "Remote",
            workplaceType: "remote",
            jobType: j.job_type === "full_time" ? "full_time" : j.job_type || "full_time",
            experienceLevel: j.title.toLowerCase().includes("senior")
              ? "senior"
              : j.title.toLowerCase().includes("lead")
              ? "senior"
              : j.title.toLowerCase().includes("intern")
              ? "internship"
              : "entry",
            salary: j.salary || null,
            requiredSkills: Array.isArray(j.tags) ? j.tags : [],
            description: j.description || "",
            originalUrl: j.url || "https://remotive.com",
            source: "Remotive",
            postedAt: j.publication_date ? new Date(j.publication_date) : new Date(),
          });
        });
      }
    }
  } catch (e) {
    console.warn("Remotive API warning:", e);
  }

  // Provider 2: Arbeitnow (Active engineering and developer positions)
  try {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        data.data.slice(0, 20).forEach((j: any) => {
          // If keyword filter provided, check title or tags
          const matchKw =
            !keyword ||
            j.title.toLowerCase().includes(keyword.toLowerCase()) ||
            (Array.isArray(j.tags) &&
              j.tags.some((t: string) => t.toLowerCase().includes(keyword.toLowerCase())));

          if (matchKw) {
            jobs.push({
              externalId: `arbeitnow-${j.slug || Math.random()}`,
              title: j.title,
              companyName: j.company_name,
              companyLogo: null,
              location: j.location || (j.remote ? "Remote" : "Hybrid"),
              workplaceType: j.remote ? "remote" : "hybrid",
              jobType:
                Array.isArray(j.job_types) && j.job_types.some((jt: string) => jt.toLowerCase().includes("intern"))
                  ? "internship"
                  : "full_time",
              experienceLevel: j.title.toLowerCase().includes("senior") ? "senior" : "entry",
              salary: null,
              requiredSkills: Array.isArray(j.tags) ? j.tags : ["Engineering"],
              description: j.description || "",
              originalUrl: j.url || "https://www.arbeitnow.com",
              source: "Arbeitnow",
              postedAt: j.created_at ? new Date(j.created_at * 1000) : new Date(),
            });
          }
        });
      }
    }
  } catch (e) {
    console.warn("Arbeitnow API warning:", e);
  }

  return jobs;
}

// ─── GET: Fetch, Match, and Categorize Real Jobs ─────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const locationParam = searchParams.get("location")?.trim() || "";
    const workplaceType = searchParams.get("workplaceType")?.trim() || "all";
    const jobTypeParam = searchParams.get("jobType")?.trim() || "all";
    const experienceParam = searchParams.get("experience")?.trim() || "all";
    const companyParam = searchParams.get("company")?.trim() || "";

    // 1. Fetch student's real resume data
    const savedResume = await prisma.note.findFirst({
      where: { userId, subject: "Placement Resume" },
      orderBy: { createdAt: "desc" },
    });

    if (!savedResume) {
      return NextResponse.json({
        success: true,
        hasResume: false,
        message: "Upload your resume in AI Resume & ATS Analyzer to discover jobs matching your profile.",
      });
    }

    const resumePayload = (savedResume.embedding as any) || {};
    const resumeAnalysis = resumePayload.analysis || {};
    const candidateSkills: string[] = resumeAnalysis.extractedSkills || [];
    const candidateExperience: string[] = resumeAnalysis.extractedExperience || [];
    const candidateTargetRole: string = resumePayload.targetRole || "Software Developer";

    // 2. Fetch real jobs from external providers
    const searchKeyword = query || (candidateSkills.length > 0 ? candidateSkills[0] : "Developer");
    const externalJobs = await fetchRealJobs(searchKeyword, locationParam);

    // 3. Cache & Upsert real jobs in database
    for (const j of externalJobs) {
      try {
        await prisma.jobListing.upsert({
          where: { externalId: j.externalId },
          update: {
            title: j.title,
            companyName: j.companyName,
            companyLogo: j.companyLogo,
            location: j.location,
            workplaceType: j.workplaceType,
            jobType: j.jobType,
            experienceLevel: j.experienceLevel,
            salary: j.salary,
            requiredSkills: j.requiredSkills,
            description: j.description,
            originalUrl: j.originalUrl,
            source: j.source,
            postedAt: j.postedAt,
          },
          create: {
            externalId: j.externalId,
            title: j.title,
            companyName: j.companyName,
            companyLogo: j.companyLogo,
            location: j.location,
            workplaceType: j.workplaceType,
            jobType: j.jobType,
            experienceLevel: j.experienceLevel,
            salary: j.salary,
            requiredSkills: j.requiredSkills,
            description: j.description,
            originalUrl: j.originalUrl,
            source: j.source,
            postedAt: j.postedAt,
          },
        });
      } catch (err) {
        // non-blocking
      }
    }

    // 4. Retrieve saved jobs and applications for this student
    const studentSavedJobs = await prisma.savedJob.findMany({
      where: { userId },
      select: { jobId: true, notes: true },
    });
    const savedJobIdMap = new Map(studentSavedJobs.map((s) => [s.jobId, s.notes]));

    const studentApplications = await prisma.jobApplication.findMany({
      where: { userId },
      select: { jobId: true, status: true, notes: true, appliedAt: true },
    });
    const applicationMap = new Map(studentApplications.map((a) => [a.jobId, a]));

    // 5. Query active database job listings matching filters
    const whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { title: { contains: query } },
        { companyName: { contains: query } },
      ];
    }
    if (companyParam) {
      whereClause.companyName = { contains: companyParam };
    }
    if (locationParam) {
      whereClause.location = { contains: locationParam };
    }
    if (workplaceType !== "all") {
      whereClause.workplaceType = workplaceType;
    }
    if (jobTypeParam !== "all") {
      whereClause.jobType = jobTypeParam;
    }
    if (experienceParam !== "all") {
      whereClause.experienceLevel = experienceParam;
    }

    const dbJobs = await prisma.jobListing.findMany({
      where: whereClause,
      take: 50,
      orderBy: { postedAt: "desc" },
    });

    // 6. Calculate Programmatic Match Scores for each real job
    const evaluatedJobs = dbJobs.map((job) => {
      const skillsArray: string[] =
        typeof job.requiredSkills === "string"
          ? JSON.parse(job.requiredSkills)
          : Array.isArray(job.requiredSkills)
          ? (job.requiredSkills as string[])
          : [];

      const match = calculateProgrammaticMatchScore(
        candidateSkills,
        candidateTargetRole,
        candidateExperience,
        job.title,
        skillsArray,
        job.description
      );

      const isSaved = savedJobIdMap.has(job.id);
      const appRecord = applicationMap.get(job.id);

      // Construct realistic explanation
      const whyItMatches =
        match.score >= 75
          ? `Your background strongly aligns with this position. You have direct project and coursework experience in ${match.matchedSkills.slice(0, 3).join(", ") || "core technical domains"}.`
          : match.score >= 50
          ? `Good potential alignment. You have foundational skills in ${match.matchedSkills.slice(0, 2).join(", ") || "software engineering"}, with high growth potential for the remaining requirements.`
          : `Emerging alignment. This position demands specific competencies in ${match.missingSkills.slice(0, 3).join(", ") || "specialized tools"} not strongly featured in your current resume.`;

      const recommendation =
        match.missingSkills.length > 0
          ? `Strengthen hands-on experience in ${match.missingSkills.slice(0, 2).join(" & ")} and mention applied projects on your resume to boost compatibility.`
          : `Review the company's tech stack and prepare relevant system design or coding examples for interview readiness.`;

      return {
        id: job.id,
        externalId: job.externalId,
        title: job.title,
        companyName: job.companyName,
        companyLogo: job.companyLogo,
        location: job.location,
        workplaceType: job.workplaceType,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
        salary: job.salary,
        requiredSkills: skillsArray,
        description: job.description,
        originalUrl: job.originalUrl,
        source: job.source,
        postedAt: job.postedAt,
        matchScore: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        qualificationCompat: match.qualificationCompat,
        whyItMatches,
        recommendation,
        isSaved,
        savedNotes: savedJobIdMap.get(job.id) || null,
        applicationStatus: appRecord?.status || null,
        appliedAt: appRecord?.appliedAt || null,
      };
    });

    // 7. Sort and Group into Dynamic Categories
    evaluatedJobs.sort((a, b) => b.matchScore - a.matchScore);

    const categories = {
      bestMatches: evaluatedJobs.filter((j) => j.matchScore >= 75),
      recommended: evaluatedJobs.filter((j) => j.matchScore >= 60 && j.matchScore < 75),
      skillGapOpportunities: evaluatedJobs.filter((j) => j.matchScore >= 40 && j.matchScore < 60),
      internships: evaluatedJobs.filter(
        (j) =>
          j.jobType === "internship" ||
          j.title.toLowerCase().includes("intern") ||
          j.title.toLowerCase().includes("trainee")
      ),
      recentlyPosted: [...evaluatedJobs].sort(
        (a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime()
      ),
    };

    return NextResponse.json({
      success: true,
      hasResume: true,
      candidateProfile: {
        targetRole: candidateTargetRole,
        skillsCount: candidateSkills.length,
        extractedSkills: candidateSkills,
      },
      jobs: evaluatedJobs,
      categories,
      totalCount: evaluatedJobs.length,
    });
  } catch (error: any) {
    console.error("[GET Job Matcher Error]:", sanitizeError(error));
    if (error.isHighDemand || isRetryableGeminiError(error)) {
      return NextResponse.json(
        { 
          error: "AI analysis is temporarily unavailable. Please try again in a few moments.",
          isHighDemand: true,
          canRetry: true
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { 
        error: "AI analysis is temporarily unavailable. Please try again in a few moments.",
        canRetry: true
      },
      { status: 500 }
    );
  }
}

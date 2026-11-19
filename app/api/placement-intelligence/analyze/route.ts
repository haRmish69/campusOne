import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { 
  generateContentWithRetryAndFallback, 
  isRetryableGeminiError, 
  sanitizeError 
} from "@/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: true, savedResume: null });
    }

    const saved = await prisma.note.findFirst({
      where: { userId, subject: "Placement Resume" },
      orderBy: { createdAt: "desc" },
    });

    if (!saved) {
      return NextResponse.json({ success: true, savedResume: null });
    }

    const payload = saved.embedding as any;

    return NextResponse.json({
      success: true,
      savedResume: {
        id: saved.id,
        fileName: saved.fileName || "Uploaded_Resume.pdf",
        createdAt: saved.createdAt,
        content: saved.content,
        analysis: payload?.analysis || null,
        targetRole: payload?.targetRole || "",
        jobDescription: payload?.jobDescription || "",
        fileSize: payload?.fileSize || null,
      },
    });
  } catch (error: any) {
    console.error("GET Placement Resume Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ─── 1. Remove Saved Resume ───────────────────────────────────────────
    if (action === "remove-resume") {
      await prisma.note.deleteMany({
        where: { userId, subject: "Placement Resume" },
      });
      return NextResponse.json({ success: true, message: "Resume removed" });
    }

    // ─── 2. Analyze Resume (PDF or Text) ──────────────────────────────────
    if (action === "analyze-resume") {
      const {
        resumeText,
        fileBase64,
        fileName,
        fileSize,
        fileType,
        targetRole,
        targetCompany,
        targetCompanyId,
        jobDescription,
      } = body;

      if (!resumeText?.trim() && !fileBase64) {
        return NextResponse.json(
          { error: "Please upload a PDF resume or provide resume text" },
          { status: 400 }
        );
      }

      // Retrieve recruiter data if a specific recruiter or company is selected
      let companySkills: string[] = [];
      let recruiterName = "";
      let recruiterJobDescription = "";
      let recruiterCgpa: number | null = null;
      let recruiterBranches: string[] = [];

      if (targetCompanyId && targetCompanyId !== "none" && targetCompanyId !== "other") {
        const comp = await prisma.company.findUnique({
          where: { id: targetCompanyId },
        });
        if (comp) {
          recruiterName = comp.name;
          if (comp.description) recruiterJobDescription = comp.description;
          if (comp.minCgpa) recruiterCgpa = comp.minCgpa;
          if (comp.eligibleBranches) {
            recruiterBranches =
              typeof comp.eligibleBranches === "string"
                ? JSON.parse(comp.eligibleBranches)
                : (comp.eligibleBranches as string[]);
          }
          if (comp.topSkillsRequired) {
            companySkills =
              typeof comp.topSkillsRequired === "string"
                ? JSON.parse(comp.topSkillsRequired)
                : (comp.topSkillsRequired as string[]);
          }
        }
      } else if (targetCompany && targetCompany !== "none" && targetCompany !== "other") {
        recruiterName = targetCompany;
        const comp = await prisma.company.findFirst({
          where: { name: { contains: targetCompany } },
        });
        if (comp?.topSkillsRequired) {
          companySkills =
            typeof comp.topSkillsRequired === "string"
              ? JSON.parse(comp.topSkillsRequired)
              : (comp.topSkillsRequired as string[]);
          if (comp.description) recruiterJobDescription = comp.description;
        }
      }

      const effectiveJobDescription = (jobDescription || recruiterJobDescription || "").trim();

      const promptText = `You are a Principal Technical Recruiter and an advanced ATS (Applicant Tracking System) Evaluation Engine used by top tech companies, finance firms, and enterprise recruiters.

${recruiterName ? `Target Recruiter / Company: "${recruiterName}"` : "Target Recruiter: General Industry Standard (No Specific Recruiter Selected — General ATS Benchmark)"}
Target Job Role: "${targetRole || "Software Development Engineer (SDE-1)"}"
${companySkills.length > 0 ? `Recruiter Explicit Required Skills: ${companySkills.join(", ")}` : ""}
${recruiterCgpa ? `Recruiter Minimum CGPA Criterion: ${recruiterCgpa}` : ""}
${recruiterBranches.length > 0 ? `Recruiter Eligible Branches: ${recruiterBranches.join(", ")}` : ""}
${effectiveJobDescription ? `Job Description (JD) to match against:\n"""\n${effectiveJobDescription.substring(0, 3000)}\n"""` : ""}

${resumeText ? `Student Resume Content:\n"""\n${resumeText.substring(0, 9000)}\n"""` : "Analyze the attached PDF resume directly for content, typography, structure, and keyword density."}

Evaluate this resume strictly and realistically against modern industry standard ATS filters (Workday, Greenhouse, Lever, Taleo) and recruiter standards.
${recruiterName ? `Calibrate specifically against the requirements, keywords, and domain expectations of ${recruiterName}.` : "Evaluate against general industry standards for the specified target job role."}
Calculate genuine, calibrated scores based on real evidence in the resume. DO NOT return fake 100% or random numbers.

Return a valid JSON object matching this schema:
{
  "atsScore": number (integer between 30 and 96 representing ATS pass likelihood),
  "verdict": string ("Interview Ready" | "Competitive Match" | "Needs Optimization" | "Significant Gaps"),
  "scoreBreakdown": {
    "keywordMatch": number (0-100),
    "impactQuantification": number (0-100, measures whether projects/experience cite metrics, numbers, %, or measurable outcomes),
    "formattingStructure": number (0-100, measures clear headings, dates, readability, margins),
    "sectionCompleteness": number (0-100, measures contact info, education, skills, projects, experience)
  },
  "strengths": string[] (3-5 concrete positive aspects found in the resume with specific examples),
  "missingSkills": string[] (3-6 technical or conceptual skills absent from the resume that this role demands),
  "missingKeywords": string[] (4-8 high-frequency ATS keywords and phrases missing from the resume),
  "formattingIssues": string[] (2-4 formatting or structural issues that could cause ATS parsing errors or recruiter drop-off),
  "actionableImprovements": string[] (4-6 specific, actionable changes to boost ATS score by 15-25 points),
  "extractedSkills": string[] (Comprehensive list of ALL technical languages, frameworks, libraries, databases, developer tools, and CRITICALLY all Core Computer Science concepts such as DSA, Data Structures, Algorithms, OS, Operating Systems, DBMS, Database Management, OOP, OOPS, Object Oriented Programming, System Design, Computer Networks that are explicitly present in the candidate resume),
  "extractedExperience": string[] (Key project or internship titles found in the resume),
  "parsedSections": {
    "technicalSkills": {
      "languages": string[],
      "frameworks": string[],
      "databases": string[],
      "tools": string[],
      "coreCs": string[],
      "aiMl": string[]
    },
    "projects": string[],
    "experience": string[],
    "education": string[],
    "certifications": string[],
    "achievements": string[]
  },
  "extractedText": string (plain text summary of the resume),
  "executiveSummary": string (2-3 sentences summarizing candidate positioning and fit)
};`;

      const contents: any[] = [];

      if (fileBase64) {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
        contents.push({
          inlineData: {
            mimeType: fileType || "application/pdf",
            data: cleanBase64,
          },
        });
      }

      contents.push({
        text: promptText,
      });

      const res = await generateContentWithRetryAndFallback({
        contents,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsedAnalysis = JSON.parse(res.text || "{}");

      // ─── Guarantee explicit Core CS skills are never omitted from extractedSkills ───
      const fullTextToScan = `${parsedAnalysis.extractedText || ""} ${resumeText || ""}`;
      const guaranteedSkills = new Set<string>(parsedAnalysis.extractedSkills || []);

      const coreCsMatchers: { pattern: RegExp; skill: string }[] = [
        { pattern: /\b(dsa|data\s*structures?(\s*&|\s*and)?\s*algorithms?)\b/i, skill: "DSA" },
        { pattern: /\b(os|operating\s*systems?)\b/i, skill: "OS" },
        { pattern: /\b(dbms|database\s*management(\s*systems?)?)\b/i, skill: "DBMS" },
        { pattern: /\b(oops?|object\s*oriented(\s*programming)?)\b/i, skill: "OOPS" },
        { pattern: /\b(cn|computer\s*networks?)\b/i, skill: "Computer Networks" },
        { pattern: /\b(system\s*design)\b/i, skill: "System Design" },
        { pattern: /\b(mysql)\b/i, skill: "MySQL" },
        { pattern: /\b(mongodb)\b/i, skill: "MongoDB" },
        { pattern: /\b(postgresql|postgres)\b/i, skill: "PostgreSQL" },
        { pattern: /\b(sqlite)\b/i, skill: "SQLite" },
        { pattern: /\b(qdrant)\b/i, skill: "Qdrant" },
        { pattern: /\b(docker)\b/i, skill: "Docker" },
        { pattern: /\b(linux)\b/i, skill: "Linux" },
        { pattern: /\b(git)\b/i, skill: "Git" },
        { pattern: /\b(github)\b/i, skill: "GitHub" },
        { pattern: /\b(postman)\b/i, skill: "Postman" },
        { pattern: /\b(c\s*\/\s*c\+\+|c\+\+|c)\b/i, skill: "C/C++" },
        { pattern: /\b(python)\b/i, skill: "Python" },
        { pattern: /\b(javascript)\b/i, skill: "JavaScript" },
        { pattern: /\b(typescript)\b/i, skill: "TypeScript" },
        { pattern: /\b(java)\b/i, skill: "Java" },
        { pattern: /\b(react(\.js)?)\b/i, skill: "React.js" },
        { pattern: /\b(next(\.js)?)\b/i, skill: "Next.js" },
        { pattern: /\b(node(\.js)?)\b/i, skill: "Node.js" },
        { pattern: /\b(express(\.js)?)\b/i, skill: "Express.js" },
        { pattern: /\b(tailwind(\s*css)?)\b/i, skill: "Tailwind CSS" },
        { pattern: /\b(rag)\b/i, skill: "RAG" },
        { pattern: /\b(llms?)\b/i, skill: "LLMs" },
        { pattern: /\b(whisper)\b/i, skill: "Whisper" },
      ];

      for (const matcher of coreCsMatchers) {
        if (matcher.pattern.test(fullTextToScan)) {
          guaranteedSkills.add(matcher.skill);
        }
      }

      parsedAnalysis.extractedSkills = Array.from(guaranteedSkills);

      // ─── Save securely to database associated with Clerk user ───────────
      await prisma.note.deleteMany({
        where: { userId, subject: "Placement Resume" },
      });

      await prisma.note.create({
        data: {
          userId,
          title: fileName || "Student Placement Resume",
          subject: "Placement Resume",
          fileName: fileName || "Resume.pdf",
          content: parsedAnalysis.extractedText || resumeText || "PDF Resume",
          embedding: {
            analysis: parsedAnalysis,
            targetRole,
            jobDescription: jobDescription || "",
            fileName: fileName || "Resume.pdf",
            fileSize: fileSize || null,
            analyzedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        analysis: parsedAnalysis,
        savedFileName: fileName || "Resume.pdf",
      });
    }

    // ─── 3. Generate Roadmap ──────────────────────────────────────────────
    if (action === "generate-roadmap") {
      const { targetRole, targetCompany, userSkills, weeksCount = 8 } = body;

      const prompt = `You are an elite Placement Preparation Coach at a top university.
Create a personalized, high-yield ${weeksCount}-week placement preparation roadmap for a student aiming for "${targetRole || "Software Engineering (SDE)"}"${targetCompany ? ` at ${targetCompany}` : ""}.
Student's currently verified skills: ${(userSkills || ["DSA", "Python", "SQL"]).join(", ")}.

Generate a structured JSON response:
{
  "targetRole": "${targetRole || "Software Engineer"}",
  "totalWeeks": ${weeksCount},
  "milestones": [
    {
      "week": 1,
      "phase": string (e.g. "DSA Foundations & Complexity Analysis"),
      "focus": string (e.g. "Arrays, Strings, Two-pointer & Sliding Window"),
      "deliverables": string[] (3 specific tasks, e.g. "Solve 20 LeetCode Mediums", "Master HashMaps"),
      "hoursPerWeek": number (e.g. 15)
    }
  ],
  "mockInterviewSchedule": [
    { "week": number, "type": string (e.g. "DSA Round 1"), "focusArea": string }
  ],
  "proTip": string
}`;

      const res = await generateContentWithRetryAndFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(res.text || "{}");
      return NextResponse.json({ success: true, roadmap: parsed });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Placement Intelligence Analysis API Error]:", sanitizeError(error));
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

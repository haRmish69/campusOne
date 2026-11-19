import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { 
  generateContentWithRetryAndFallback, 
  isRetryableGeminiError, 
  sanitizeError 
} from "@/lib/gemini";

// Helper to safely parse JSON or comma-separated company skills
function parseCompanySkills(skillsData: any): string[] {
  if (!skillsData) return [];
  if (Array.isArray(skillsData)) return skillsData.map(s => String(s).trim()).filter(Boolean);
  if (typeof skillsData === "string") {
    try {
      const parsed = JSON.parse(skillsData);
      if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
    } catch {
      return skillsData.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

// ─── Deterministic Skill Matcher & Verifier ──────────────────────────────────
// Ensures that NO skill present in the resume is ever marked as MISSING,
// and enforces that merely mentioning a skill classifies as MENTIONED/WEAK (not STRONG).
interface RawSkillItem {
  skill: string;
  category?: string;
  status?: string;
  classification?: string;
  evidence?: string;
  evidenceFromResume?: string;
  whyItMatters?: string;
  recommendation?: string;
  requiredLevel?: string;
  requiredProficiency?: string;
  importance?: "Critical" | "High" | "Medium";
}

function verifyAndEnforceSkillClassifications(
  evaluatedSkills: RawSkillItem[],
  resumeContent: string,
  candidateSkills: string[],
  targetRole: string,
  recruiterName?: string
) {
  const contentLower = (resumeContent || "").toLowerCase();
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());

  // Domain aliases dictionary for technical concepts
  const skillAliases: Record<string, RegExp[]> = {
    "dsa": [/\b(dsa|data\s*structures?(\s*&|\s*and)?\s*algorithms?)\b/i],
    "data structures": [/\b(dsa|data\s*structures?)\b/i],
    "algorithms": [/\b(dsa|algorithms?)\b/i],
    "os": [/\b(os|operating\s*systems?)\b/i],
    "operating systems": [/\b(os|operating\s*systems?)\b/i],
    "dbms": [/\b(dbms|database\s*management(\s*systems?)?|sql|mysql|mongodb|sqlite|postgres)\b/i],
    "database management systems": [/\b(dbms|database\s*management(\s*systems?)?)\b/i],
    "oops": [/\b(oops?|object\s*oriented(\s*programming)?)\b/i],
    "oop": [/\b(oops?|object\s*oriented(\s*programming)?)\b/i],
    "object-oriented programming": [/\b(oops?|object\s*oriented(\s*programming)?)\b/i],
    "system design": [/\b(system\s*design|architecture|distributed\s*systems?|microservices?)\b/i],
    "computer networks": [/\b(computer\s*networks?|networking|tcp\s*\/\s*ip|http|https)\b/i],
    "rest apis": [/\b(rest(\s*apis?|\s*ful\s*apis?)|api\s*design)\b/i],
    "mysql": [/\b(mysql)\b/i],
    "mongodb": [/\b(mongodb|mongo)\b/i],
    "postgresql": [/\b(postgresql|postgres)\b/i],
    "docker": [/\b(docker|containerization)\b/i],
    "linux": [/\b(linux|unix|bash)\b/i],
    "git": [/\b(git|github|version\s*control)\b/i],
    "c++": [/\b(c\+\+|c\s*\/\s*c\+\+)\b/i],
    "python": [/\b(python)\b/i],
    "javascript": [/\b(javascript|js|es6)\b/i],
    "typescript": [/\b(typescript|ts)\b/i],
    "java": [/\b(java)\b/i],
    "react.js": [/\b(react(\.js)?)\b/i],
    "next.js": [/\b(next(\.js)?)\b/i],
    "node.js": [/\b(node(\.js)?)\b/i],
    "rag": [/\b(rag|retrieval\s*augmented\s*generation)\b/i],
    "llms": [/\b(llms?|large\s*language\s*models?)\b/i],
    "whisper": [/\b(whisper)\b/i],
    "qdrant": [/\b(qdrant|vector\s*db|vector\s*database)\b/i],
  };

  const projectKeywords = [
    "developed", "built", "implemented", "designed", "created", "engineered",
    "project", "hackathon", "winner", "raati", "campusone", "gaushala"
  ];

  return evaluatedSkills.map(item => {
    const rawStatus = (item.status || item.classification || "NOT_ASSESSED").toUpperCase().replace(/\s+/g, "_");
    let status: "STRONG" | "MENTIONED" | "WEAK" | "MISSING" | "NOT_ASSESSED" = 
      ["STRONG", "MENTIONED", "WEAK", "MISSING", "NOT_ASSESSED"].includes(rawStatus)
        ? (rawStatus as any)
        : "NOT_ASSESSED";

    const skillName = item.skill.trim();
    const skillNameLower = skillName.toLowerCase();

    // Check if skill is present in resume
    let isPresentInResume = false;
    let resumeEvidenceSnippet = "";

    // 1. Direct candidate skills check
    if (candidateSkillsLower.some(s => s === skillNameLower || s.includes(skillNameLower) || skillNameLower.includes(s))) {
      isPresentInResume = true;
      resumeEvidenceSnippet = `Explicitly listed in verified technical skills list: ${skillName}`;
    }

    // 2. Alias / Regex match across entire resume text
    if (!isPresentInResume) {
      const matchers = skillAliases[skillNameLower];
      if (matchers) {
        for (const regex of matchers) {
          if (regex.test(contentLower)) {
            isPresentInResume = true;
            break;
          }
        }
      }
    }

    // 3. Fallback word-boundary check
    if (!isPresentInResume) {
      const escaped = skillNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRegex = new RegExp(`\\b${escaped}\\b`, "i");
      if (wordRegex.test(contentLower)) {
        isPresentInResume = true;
      }
    }

    // Locate the exact snippet in resume content if found
    if (isPresentInResume && (!resumeEvidenceSnippet || resumeEvidenceSnippet.startsWith("Explicitly listed"))) {
      // Find sentence or line containing the skill
      const lines = resumeContent.split(/[\r\n•|]+/);
      for (const line of lines) {
        if (line.toLowerCase().includes(skillNameLower)) {
          resumeEvidenceSnippet = line.trim().substring(0, 150);
          break;
        }
      }
      if (!resumeEvidenceSnippet) {
        const idx = contentLower.indexOf(skillNameLower);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(resumeContent.length, idx + skillName.length + 60);
          resumeEvidenceSnippet = "..." + resumeContent.substring(start, end).replace(/\s+/g, " ").trim() + "...";
        } else {
          resumeEvidenceSnippet = `Explicitly identified in candidate resume`;
        }
      }
    }

    // Check evidence of active project/experience usage
    let hasProjectApplication = false;
    if (isPresentInResume) {
      // Check if project or experience context mentions this skill
      const projectsTextMatch = (
        contentLower.includes("raati") || contentLower.includes("campusone") || contentLower.includes("gaushala")
      );
      if (projectsTextMatch) {
        // e.g., if skill appears near action verbs
        const idx = contentLower.indexOf(skillNameLower);
        if (idx !== -1) {
          const surrounding = contentLower.substring(Math.max(0, idx - 120), Math.min(contentLower.length, idx + 120));
          hasProjectApplication = projectKeywords.some(kw => surrounding.includes(kw));
        }
      }
    }

    // ─── STRICT RULE ENFORCEMENT ─────────────────────────────────────────────
    // Rule 1: NEVER mark a skill as MISSING if it is explicitly present in the resume!
    if (isPresentInResume && status === "MISSING") {
      if (hasProjectApplication) {
        status = "STRONG";
      } else {
        // Listed under skills or Core CS without deep project details
        status = "MENTIONED";
      }
    }

    // Rule 2: Do NOT assume that mentioning a skill means the candidate is proficient in it.
    // Keep skill presence separate from proficiency.
    // If a skill appears in a skills/core CS list (like DSA, OS, DBMS, OOPS), classify as MENTIONED, not Strong or Missing.
    if (isPresentInResume) {
      if (skillNameLower === "dsa" || skillNameLower === "os" || skillNameLower === "operating systems" || skillNameLower === "dbms" || skillNameLower === "oops" || skillNameLower === "oop") {
        status = "MENTIONED";
      } else if (status === "STRONG" && !hasProjectApplication) {
        status = "MENTIONED";
      }
    }

    // Rule 3: If not present anywhere in resume, ensure evidence clearly states it.
    // Never mark a skill as Weak without supporting evidence — mark MISSING or NOT_ASSESSED.
    if (!isPresentInResume) {
      status = "MISSING";
      resumeEvidenceSnippet = "Not found anywhere in resume (Technical Skills, Projects, Experience, Education, Certifications)";
    }

    // Build clear whyItMatters and recommendation
    let whyItMatters = item.whyItMatters || "";
    if (!whyItMatters || whyItMatters.length < 10) {
      whyItMatters = recruiterName
        ? `High-priority core requirement for ${targetRole} positions at ${recruiterName}.`
        : `Essential industry standard competency for modern ${targetRole} roles.`;
    }

    let recommendation = item.recommendation || "";
    if (status === "MISSING") {
      recommendation = `Acquire fundamental knowledge and build at least one hands-on portfolio project demonstrating ${skillName}.`;
    } else if (status === "MENTIONED") {
      recommendation = `You have listed ${skillName} in your resume; elevate it to STRONG by showcasing practical implementation, complex usage, or benchmarked results in a project.`;
    } else if (status === "WEAK") {
      recommendation = `Deepen your practical proficiency in ${skillName} through targeted problem-solving, unit testing, or production deployment.`;
    } else if (status === "STRONG") {
      recommendation = `Maintain proficiency and prepare to speak in-depth about architecture decisions, edge cases, and optimization during interviews.`;
    }

    return {
      skill: skillName,
      category: item.category || "Core Competency",
      status,
      // Backward compatibility fields
      classification: (status === "STRONG" ? "Strong" : status === "MENTIONED" ? "Beginner" : status === "WEAK" ? "Intermediate" : status === "MISSING" ? "Missing" : "Not Assessed") as any,
      evidence: resumeEvidenceSnippet || item.evidence || item.evidenceFromResume || "No direct proof cited",
      evidenceFromResume: resumeEvidenceSnippet || item.evidence || item.evidenceFromResume || "No direct proof cited",
      whyItMatters,
      recommendation,
      requiredLevel: item.requiredLevel || item.requiredProficiency || "Production Proficient",
      requiredProficiency: item.requiredProficiency || item.requiredLevel || "Production Proficient",
      importance: item.importance || "High",
    };
  });
}

// ─── GET: Fetch Saved Resume & Skill Gap Analysis History ────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedRole = searchParams.get("role")?.trim();
    const requestedCompanyId = searchParams.get("companyId")?.trim();

    // 1. Fetch authenticated student's saved resume
    const savedResume = await prisma.note.findFirst({
      where: { userId, subject: "Placement Resume" },
      orderBy: { createdAt: "desc" },
    });

    if (!savedResume) {
      return NextResponse.json({
        success: true,
        hasResume: false,
        message: "Upload your resume in AI Resume & ATS Analyzer to begin your personalized skill gap analysis.",
      });
    }

    const resumePayload = savedResume.embedding as any;
    const resumeAnalysis = resumePayload?.analysis || {};

    const resumeInfo = {
      id: savedResume.id,
      fileName: savedResume.fileName || "Uploaded_Resume.pdf",
      fileSize: resumePayload?.fileSize || null,
      uploadedAt: savedResume.createdAt,
      extractedSkills: resumeAnalysis.extractedSkills || [],
      extractedExperience: resumeAnalysis.extractedExperience || [],
      strengths: resumeAnalysis.strengths || [],
      targetRole: resumePayload?.targetRole || "",
    };

    // 2. Fetch historical skill gap analyses
    const historyNotes = await prisma.note.findMany({
      where: { userId, subject: "Skill Gap Analysis" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const history = historyNotes.map((note) => {
      const emb = note.embedding as any;
      return {
        id: note.id,
        targetRole: emb?.targetJobRole || note.title.replace("Skill Gap - ", ""),
        targetCompany: emb?.targetCompany || null,
        coveragePercentage: emb?.skillGapResults?.coveragePercentage || 0,
        readinessLevel: emb?.skillGapResults?.readinessLevel || "Developing",
        timestamp: emb?.analysisTimestamp || note.createdAt.toISOString(),
        totalEvaluated: emb?.skillGapResults?.totalSkillsEvaluated || 0,
        strongCount: emb?.skillGapResults?.strongCount || 0,
        mentionedCount: emb?.skillGapResults?.mentionedCount || 0,
        weakCount: emb?.skillGapResults?.weakCount || 0,
        missingCount: emb?.skillGapResults?.missingCount || 0,
        notAssessedCount: emb?.skillGapResults?.notAssessedCount || 0,
      };
    });

    // 3. Find latest analysis matching requested role or recruiter
    let activeAnalysis: any = null;
    if (requestedCompanyId && requestedCompanyId !== "none" && requestedCompanyId !== "other") {
      const matchedNote = historyNotes.find((n) => {
        const emb = n.embedding as any;
        return emb?.targetCompanyId === requestedCompanyId;
      });
      if (matchedNote) {
        activeAnalysis = (matchedNote.embedding as any);
      }
    }

    if (!activeAnalysis && requestedRole) {
      const matchedNote = historyNotes.find((n) => {
        const emb = n.embedding as any;
        return emb?.targetJobRole?.toLowerCase() === requestedRole.toLowerCase();
      });
      if (matchedNote) {
        activeAnalysis = (matchedNote.embedding as any);
      }
    }

    if (!activeAnalysis && historyNotes.length > 0) {
      activeAnalysis = (historyNotes[0].embedding as any);
    }

    return NextResponse.json({
      success: true,
      hasResume: true,
      resumeInfo,
      currentAnalysis: activeAnalysis || null,
      history,
    });
  } catch (error: any) {
    console.error("GET Skill Gap API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve skill gap information" },
      { status: 500 }
    );
  }
}

// ─── POST: Perform Dynamic AI Skill Gap Analysis ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      targetRole: inputTargetRole, 
      targetCompanyId, 
      targetCompany: inputTargetCompany, 
      jobDescription: inputJd 
    } = body;

    // 1. Fetch student's uploaded resume from database
    const savedResume = await prisma.note.findFirst({
      where: { userId, subject: "Placement Resume" },
      orderBy: { createdAt: "desc" },
    });

    if (!savedResume) {
      return NextResponse.json(
        {
          error: "Upload your resume in AI Resume & ATS Analyzer to begin your personalized skill gap analysis.",
          code: "NO_RESUME",
        },
        { status: 404 }
      );
    }

    const resumePayload = savedResume.embedding as any;
    const resumeAnalysis = resumePayload?.analysis || {};
    const resumeContent = savedResume.content || "";

    if (!resumeContent.trim() && (!resumeAnalysis.extractedSkills || resumeAnalysis.extractedSkills.length === 0)) {
      return NextResponse.json(
        {
          error: "Uploaded resume has empty or unreadable content. Please re-upload your resume in AI Resume & ATS Analyzer.",
          code: "EMPTY_RESUME",
        },
        { status: 400 }
      );
    }

    // 2. Fetch Recruiter Data if a specific recruiter or custom company is chosen
    let recruiterName = "";
    let recruiterJobRole = "";
    let recruiterSkills: string[] = [];
    let recruiterJd = "";
    let recruiterCgpa: number | null = null;
    let recruiterBranches: string[] = [];

    if (targetCompanyId && targetCompanyId !== "none" && targetCompanyId !== "other") {
      const companyRecord = await prisma.company.findUnique({
        where: { id: targetCompanyId },
      });
      if (companyRecord) {
        recruiterName = companyRecord.name;
        recruiterJobRole = companyRecord.jobRole || "";
        recruiterSkills = parseCompanySkills(companyRecord.topSkillsRequired);
        recruiterJd = companyRecord.description || "";
        recruiterCgpa = companyRecord.minCgpa || null;
        if (companyRecord.eligibleBranches) {
          recruiterBranches = parseCompanySkills(companyRecord.eligibleBranches);
        }
      }
    } else if (inputTargetCompany && inputTargetCompany !== "none" && inputTargetCompany !== "other") {
      recruiterName = inputTargetCompany;
      const comp = await prisma.company.findFirst({
        where: { name: { contains: inputTargetCompany } },
      });
      if (comp) {
        recruiterSkills = parseCompanySkills(comp.topSkillsRequired);
        if (comp.jobRole) recruiterJobRole = comp.jobRole;
        if (comp.description) recruiterJd = comp.description;
      }
    }

    const effectiveTargetRole = (
      inputTargetRole || recruiterJobRole || resumePayload?.targetRole || "Software Development Engineer (SDE-1)"
    ).trim();

    const effectiveJobDescription = (inputJd || recruiterJd || "").trim();

    // 3. Extract candidate's verified skills & sections
    const candidateExtractedSkills: string[] = resumeAnalysis.extractedSkills || [];
    const candidateExtractedExperience: string[] = resumeAnalysis.extractedExperience || [];
    const candidateStrengths: string[] = resumeAnalysis.strengths || [];

    // 4. Construct Gemini AI Prompt with strict evidence-based instructions
    const promptText = `You are a Principal Technical Recruiter and Senior Technical Hiring Bar Raiser at top tech companies.
You are performing an objective, evidence-based Skill Gap Analysis comparing a candidate's actual resume against the requirements for:
Role: "${effectiveTargetRole}"
${recruiterName ? `Target Recruiter: "${recruiterName}"` : "Target Recruiter: Industry Standard Benchmark"}
${recruiterSkills.length > 0 ? `Recruiter Explicitly Required Skills: ${recruiterSkills.join(", ")}` : ""}
${effectiveJobDescription ? `Job Description (JD):\n"""\n${effectiveJobDescription.substring(0, 2500)}\n"""` : ""}

CRITICAL RULES FOR EVALUATION:
1. BEFORE MARKING ANY SKILL AS MISSING, you MUST thoroughly search the ENTIRE candidate resume across all sections:
   - Technical Skills (Languages, Frameworks, Databases, Tools, and Core CS: DSA, OS, DBMS, OOPS, CN, etc.)
   - Projects
   - Experience & Internships
   - Education & Coursework
   - Certifications
   - Achievements & Competitions

2. USE THESE EXACT FIVE STATUS CATEGORIES:
   - "STRONG": Clearly demonstrated through projects or experience with practical application, complexity, or measurable outcomes.
   - "MENTIONED": Listed in the resume (e.g., under Technical Skills, Core CS, Coursework) but not sufficiently demonstrated with hands-on project or work experience.
   - "WEAK": Some evidence exists, but proficiency or job relevance is insufficient.
   - "MISSING": Not found anywhere in the resume across any section.
   - "NOT_ASSESSED": Insufficient evidence to evaluate.

3. NEVER MARK A SKILL AS MISSING IF IT IS EXPLICITLY PRESENT IN THE RESUME.
   - If a skill is explicitly listed under Core CS (e.g. DSA, OS, DBMS, OOPS) or Technical Skills, it MUST be classified as "MENTIONED" or "WEAK", NEVER "MISSING".

4. DO NOT ASSUME THAT MENTIONING A SKILL MEANS THE CANDIDATE IS PROFICIENT IN IT.
   - Listing a skill in a skills list without project or experience evidence means the status is "MENTIONED", not "STRONG".

5. FOR EVERY EVALUATED SKILL, PROVIDE:
   - "skill": Exact name of the skill
   - "category": Category (e.g. "Core CS", "Programming Languages", "Web Development", "AI & Machine Learning", "Databases & Storage", "Tools & DevOps", "Architecture & System Design")
   - "status": "STRONG" | "MENTIONED" | "WEAK" | "MISSING" | "NOT_ASSESSED"
   - "evidence": Specific quote or section from the resume proving its presence/application, or "Not found anywhere in resume"
   - "whyItMatters": Why this skill matters specifically for ${recruiterName ? recruiterName : "this role"}
   - "recommendation": Actionable improvement recommendation to advance this skill to STRONG
   - "importance": "Critical" | "High" | "Medium"
   - "requiredProficiency": Industry expectation for a successful candidate

CANDIDATE'S VERIFIED RESUME DATA:
- Extracted Skills: ${JSON.stringify(candidateExtractedSkills)}
- Key Projects & Roles: ${JSON.stringify(candidateExtractedExperience)}
- Identified Strengths: ${JSON.stringify(candidateStrengths)}
- Full Resume Content:
"""
${resumeContent.substring(0, 9000)}
"""

EVALUATION SCOPE:
- If Recruiter Explicitly Required Skills are provided (${recruiterSkills.join(", ")}), you MUST include every one of them in the evaluation.
- Also evaluate 10 to 14 additional core competencies standard for "${effectiveTargetRole}".
- Include Core CS concepts: Data Structures & Algorithms (DSA), Operating Systems (OS), Database Management Systems (DBMS), and Object-Oriented Programming (OOPS). Remember: if they are present in the resume, they MUST NOT be classified as MISSING!

Return a valid JSON object matching this schema:
{
  "targetJobRole": "${effectiveTargetRole}",
  "targetCompany": "${recruiterName || ""}",
  "metrics": {
    "totalSkillsEvaluated": number,
    "strongCount": number,
    "mentionedCount": number,
    "weakCount": number,
    "missingCount": number,
    "notAssessedCount": number,
    "coveragePercentage": number (integer 0-100),
    "readinessLevel": string ("Role Ready" | "Competitive Match" | "Developing Competency" | "Significant Gap"),
    "executiveSummary": string (2-3 sentences summarizing candidate positioning and fit)
  },
  "skillClassifications": [
    {
      "skill": string,
      "category": string,
      "status": "STRONG" | "MENTIONED" | "WEAK" | "MISSING" | "NOT_ASSESSED",
      "evidence": string,
      "whyItMatters": string,
      "recommendation": string,
      "importance": "Critical" | "High" | "Medium",
      "requiredProficiency": string
    }
  ],
  "recommendations": [
    {
      "skillName": string,
      "category": string,
      "status": "STRONG" | "MENTIONED" | "WEAK" | "MISSING" | "NOT_ASSESSED",
      "whyItMatters": string,
      "currentEvidence": string,
      "requiredProficiency": string,
      "actionableImprovement": string,
      "learningResources": string[],
      "practicalProjects": string[],
      "priority": "High" | "Medium" | "Low"
    }
  ]
}`;

    // 5. Call Gemini AI with retry and model fallback
    const res = await generateContentWithRetryAndFallback({
      contents: promptText,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(res.text || "{}");

    if (!parsed.skillClassifications || !Array.isArray(parsed.skillClassifications)) {
      throw new Error("Gemini AI returned incomplete skill gap analysis structure.");
    }

    // 6. Enforce deterministic verification: Never allow present skills to be MISSING
    const verifiedSkills = verifyAndEnforceSkillClassifications(
      parsed.skillClassifications,
      resumeContent,
      candidateExtractedSkills,
      effectiveTargetRole,
      recruiterName
    );

    // Calculate genuine, calibrated metrics from the verified skills
    const strongCount = verifiedSkills.filter((s) => s.status === "STRONG").length;
    const mentionedCount = verifiedSkills.filter((s) => s.status === "MENTIONED").length;
    const weakCount = verifiedSkills.filter((s) => s.status === "WEAK").length;
    const missingCount = verifiedSkills.filter((s) => s.status === "MISSING").length;
    const notAssessedCount = verifiedSkills.filter((s) => s.status === "NOT_ASSESSED").length;
    const totalSkillsEvaluated = verifiedSkills.length;

    // Coverage formula: Strong = 100%, Weak = 60%, Mentioned = 35%
    const calculatedCoverage = totalSkillsEvaluated > 0
      ? Math.round(((strongCount * 1.0 + weakCount * 0.6 + mentionedCount * 0.35) / totalSkillsEvaluated) * 100)
      : 0;

    let readinessLevel = "Significant Gap";
    if (calculatedCoverage >= 80) readinessLevel = "Role Ready";
    else if (calculatedCoverage >= 65) readinessLevel = "Competitive Match";
    else if (calculatedCoverage >= 50) readinessLevel = "Developing Competency";

    const verifiedMetrics = {
      totalSkillsEvaluated,
      strongCount,
      intermediateCount: weakCount, // backwards compatibility
      beginnerCount: mentionedCount, // backwards compatibility
      mentionedCount,
      weakCount,
      missingCount,
      notAssessedCount,
      coveragePercentage: calculatedCoverage,
      readinessLevel,
      executiveSummary: parsed.metrics?.executiveSummary || `Evaluated ${totalSkillsEvaluated} core skills against ${effectiveTargetRole} requirements.`,
    };

    // Format recommendations from verified skills needing attention
    const verifiedRecommendations = (parsed.recommendations || []).map((rec: any) => {
      const matchingVerified = verifiedSkills.find(
        (v) => v.skill.toLowerCase() === (rec.skillName || "").toLowerCase()
      );
      const status = matchingVerified ? matchingVerified.status : (rec.status || "MENTIONED");
      return {
        skillName: rec.skillName,
        category: rec.category || matchingVerified?.category || "Core Competency",
        status,
        currentClassification: matchingVerified?.classification || "Beginner",
        whyItMatters: rec.whyItMatters || matchingVerified?.whyItMatters || "",
        currentEvidence: matchingVerified?.evidence || rec.currentEvidence || "",
        requiredProficiency: rec.requiredProficiency || matchingVerified?.requiredProficiency || "Industry Standard",
        actionableImprovement: rec.actionableImprovement || matchingVerified?.recommendation || "",
        learningResources: rec.learningResources || ["Official Documentation", "LeetCode Curated Patterns"],
        practicalProjects: rec.practicalProjects || [`Implement ${rec.skillName} in a full-stack portfolio application.`],
        priority: rec.priority || (status === "MISSING" ? "High" : status === "MENTIONED" ? "Medium" : "Low"),
      };
    });

    const analysisTimestamp = new Date().toISOString();

    const analysisRecord = {
      resumeId: savedResume.id,
      targetJobRole: effectiveTargetRole,
      targetCompany: recruiterName || null,
      targetCompanyId: targetCompanyId || null,
      extractedSkills: candidateExtractedSkills,
      skillGapResults: verifiedMetrics,
      existingSkills: candidateExtractedSkills,
      strongSkills: verifiedSkills.filter(s => s.status === "STRONG").map(s => s.skill),
      skillsRequiringImprovement: verifiedSkills.filter(s => s.status === "MENTIONED" || s.status === "WEAK").map(s => s.skill),
      missingSkills: verifiedSkills.filter(s => s.status === "MISSING").map(s => s.skill),
      relevantTechnologiesNotMentioned: verifiedSkills.filter(s => s.status === "MISSING").map(s => s.skill),
      skillClassifications: verifiedSkills,
      recommendations: verifiedRecommendations,
      analysisTimestamp,
    };

    // 7. Save analysis into database associated with the Clerk user
    await prisma.note.create({
      data: {
        userId,
        title: `Skill Gap - ${effectiveTargetRole}${recruiterName ? ` (${recruiterName})` : ""}`,
        subject: "Skill Gap Analysis",
        fileName: savedResume.fileName || "Resume.pdf",
        content: JSON.stringify({
          targetRole: effectiveTargetRole,
          targetCompany: recruiterName,
          coveragePercentage: verifiedMetrics.coveragePercentage,
          readinessLevel: verifiedMetrics.readinessLevel,
          strongCount: verifiedMetrics.strongCount,
          mentionedCount: verifiedMetrics.mentionedCount,
          weakCount: verifiedMetrics.weakCount,
          missingCount: verifiedMetrics.missingCount,
          summary: verifiedMetrics.executiveSummary,
        }),
        embedding: analysisRecord,
      },
    });

    // 8. Update SkillGapAnalysis table for peer matching compatibility
    try {
      const companySlug = (recruiterName || effectiveTargetRole).toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 50);
      await prisma.skillGapAnalysis.upsert({
        where: {
          userId_companyId: {
            userId,
            companyId: companySlug,
          },
        },
        update: {
          gaps: verifiedSkills,
          peerMatchIds: [],
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        create: {
          userId,
          companyId: companySlug,
          gaps: verifiedSkills,
          peerMatchIds: [],
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (e) {
      console.warn("Could not upsert into SkillGapAnalysis table (non-blocking):", e);
    }

    return NextResponse.json({
      success: true,
      analysis: analysisRecord,
    });
  } catch (error: any) {
    console.error("[POST Skill Gap API Error]:", sanitizeError(error));
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

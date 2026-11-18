import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { 
  generateContentWithRetryAndFallback, 
  isRetryableGeminiError, 
  sanitizeError 
} from "@/lib/gemini";

// ─── GET: Fetch Saved Resume & Skill Gap Analysis History ────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedRole = searchParams.get("role")?.trim();

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
        coveragePercentage: emb?.skillGapResults?.coveragePercentage || 0,
        readinessLevel: emb?.skillGapResults?.readinessLevel || "Developing",
        timestamp: emb?.analysisTimestamp || note.createdAt.toISOString(),
        totalEvaluated: emb?.skillGapResults?.totalSkillsEvaluated || 0,
        strongCount: emb?.skillGapResults?.strongCount || 0,
        missingCount: emb?.skillGapResults?.missingCount || 0,
      };
    });

    // 3. Find latest analysis matching requested role or most recent
    let activeAnalysis: any = null;
    if (requestedRole) {
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
    const targetRole = (body.targetRole || "").trim();

    if (!targetRole) {
      return NextResponse.json(
        { error: "Target Job Role is required for Skill Gap Analysis" },
        { status: 400 }
      );
    }

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

    const candidateExtractedSkills: string[] = resumeAnalysis.extractedSkills || [];
    const candidateExtractedExperience: string[] = resumeAnalysis.extractedExperience || [];
    const candidateStrengths: string[] = resumeAnalysis.strengths || [];

    // 2. Construct Gemini AI Prompt with strict evidence-based instructions
    const promptText = `You are a Principal Engineering Director and Senior Technical Hiring Bar Raiser at top tech companies.
You are performing an objective, evidence-based Skill Gap Analysis for a student targeting the role of: "${targetRole}".

CRITICAL INSTRUCTIONS:
- You MUST evaluate strictly based on the actual evidence provided from the candidate's uploaded resume.
- DO NOT assume or invent proficiency in any skill unless substantiated by projects, experience, coursework, or verified resume text.
- If a skill is listed as a keyword only with no evidence of applied mastery, classify it as "Beginner".
- If there is insufficient evidence to determine proficiency, mark it as "Not Assessed".
- Every percentage and count MUST be calculated genuinely from the actual evaluated skills. NO STATIC, FAKE, OR HARDCODED SCORES.

CANDIDATE'S VERIFIED RESUME DATA:
- Extracted Skills: ${JSON.stringify(candidateExtractedSkills)}
- Key Projects & Roles: ${JSON.stringify(candidateExtractedExperience)}
- Identified Strengths: ${JSON.stringify(candidateStrengths)}
- Full Resume Content Summary:
"""
${resumeContent.substring(0, 8000)}
"""

EVALUATION REQUIREMENTS:
1. Identify 12 to 18 core technical competencies, tools, frameworks, and architecture paradigms critically demanded in 2026 for "${targetRole}".
2. Classify each evaluated skill into EXACTLY ONE of these five classifications:
   - "Strong": Strong, verifiable evidence in projects/experience with complex application or measurable outcome.
   - "Intermediate": Solid foundational usage demonstrated in academic or personal projects.
   - "Beginner": Mentioned as a keyword or minor reference without proof of depth.
   - "Missing": Standard prerequisite or high-demand technology for "${targetRole}" completely absent from candidate's resume.
   - "Not Assessed": Mentioned vaguely where depth cannot be reliably determined from available resume text.
3. Classify into grouping lists:
   - "existingSkills": All skills verified to exist in the candidate's resume.
   - "strongSkills": Skills where the candidate exhibits strong competency.
   - "skillsRequiringImprovement": Skills present but at Beginner/Intermediate level that must be strengthened for this role.
   - "missingSkills": Crucial technologies/concepts for this role not found in the resume.
   - "relevantTechnologiesNotMentioned": Complementary or emerging tools relevant to this role not in the resume.
4. Calculate genuine metrics:
   - totalSkillsEvaluated (count of skills in skillClassifications)
   - strongCount
   - intermediateCount
   - beginnerCount
   - missingCount
   - notAssessedCount
   - coveragePercentage: Integer (0 to 100), computed as: Math.round(((strongCount * 1.0 + intermediateCount * 0.6) / totalSkillsEvaluated) * 100)
   - readinessLevel: "Role Ready" (85-100) | "Competitive Match" (70-84) | "Developing Competency" (50-69) | "Significant Gap" (<50)
5. Generate Personalized Recommendations for the highest-priority skill gaps and areas needing improvement (5 to 8 recommendations):
   - skillName: Name of the skill
   - category: e.g. "Languages & Core", "Frameworks & Backend", "Databases & Storage", "Architecture & System Design", "Cloud & DevOps", "Testing & Tools"
   - whyItMatters: Exactly why this skill is vital for "${targetRole}"
   - currentEvidence: Specific quote or summary from candidate's resume, or "None found in resume"
   - currentClassification: "Strong" | "Intermediate" | "Beginner" | "Missing" | "Not Assessed"
   - requiredProficiency: Industry expectation for a successful candidate
   - learningResources: 2 to 3 curated resources (e.g. documentation, LeetCode patterns, official tutorials)
   - practicalProjects: 1 to 2 realistic portfolio project implementations that will prove competence to interviewers
   - priority: "High" | "Medium" | "Low"

Return ONLY a valid JSON object matching this schema:
{
  "targetJobRole": "${targetRole}",
  "metrics": {
    "totalSkillsEvaluated": number,
    "strongCount": number,
    "intermediateCount": number,
    "beginnerCount": number,
    "missingCount": number,
    "notAssessedCount": number,
    "coveragePercentage": number,
    "readinessLevel": string,
    "executiveSummary": string
  },
  "existingSkills": string[],
  "strongSkills": string[],
  "skillsRequiringImprovement": string[],
  "missingSkills": string[],
  "relevantTechnologiesNotMentioned": string[],
  "skillClassifications": [
    {
      "skill": string,
      "category": string,
      "classification": "Strong" | "Intermediate" | "Beginner" | "Missing" | "Not Assessed",
      "evidenceFromResume": string,
      "requiredLevel": string,
      "importance": "Critical" | "High" | "Medium"
    }
  ],
  "recommendations": [
    {
      "skillName": string,
      "category": string,
      "whyItMatters": string,
      "currentEvidence": string,
      "currentClassification": "Strong" | "Intermediate" | "Beginner" | "Missing" | "Not Assessed",
      "requiredProficiency": string,
      "learningResources": string[],
      "practicalProjects": string[],
      "priority": "High" | "Medium" | "Low"
    }
  ]
}`;

    // 3. Call Gemini AI with JSON response formatting
    const res = await generateContentWithRetryAndFallback({
      contents: promptText,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(res.text || "{}");

    if (!parsed.metrics || !parsed.skillClassifications) {
      throw new Error("Gemini AI returned incomplete skill gap analysis structure.");
    }

    const analysisTimestamp = new Date().toISOString();

    const analysisRecord = {
      resumeId: savedResume.id,
      targetJobRole: targetRole,
      extractedSkills: candidateExtractedSkills,
      skillGapResults: parsed.metrics,
      existingSkills: parsed.existingSkills || [],
      strongSkills: parsed.strongSkills || [],
      skillsRequiringImprovement: parsed.skillsRequiringImprovement || [],
      missingSkills: parsed.missingSkills || [],
      relevantTechnologiesNotMentioned: parsed.relevantTechnologiesNotMentioned || [],
      skillClassifications: parsed.skillClassifications || [],
      recommendations: parsed.recommendations || [],
      analysisTimestamp,
    };

    // 4. Save analysis into database associated with the Clerk user
    await prisma.note.create({
      data: {
        userId,
        title: `Skill Gap - ${targetRole}`,
        subject: "Skill Gap Analysis",
        fileName: savedResume.fileName || "Resume.pdf",
        content: JSON.stringify({
          targetRole,
          coveragePercentage: parsed.metrics.coveragePercentage,
          readinessLevel: parsed.metrics.readinessLevel,
          strongCount: parsed.metrics.strongCount,
          missingCount: parsed.metrics.missingCount,
          summary: parsed.metrics.executiveSummary,
        }),
        embedding: analysisRecord,
      },
    });

    // Also update SkillGapAnalysis table for peer matching compatibility
    try {
      const companySlug = targetRole.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 50);
      await prisma.skillGapAnalysis.upsert({
        where: {
          userId_companyId: {
            userId,
            companyId: companySlug,
          },
        },
        update: {
          gaps: parsed.skillClassifications,
          peerMatchIds: [],
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        create: {
          userId,
          companyId: companySlug,
          gaps: parsed.skillClassifications,
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

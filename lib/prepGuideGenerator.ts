import { prisma } from "./prisma";
import { generateContentWithRetryAndFallback } from "./gemini";

export async function generatePrepGuide(companyId: string): Promise<any> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Company not found");

  const experiences = await prisma.interviewExperience.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (experiences.length < 2) {
    throw new Error("Need at least 2 experiences to generate a prep guide");
  }

  const questions = await prisma.prepQuestion.findMany({
    where: { companyId },
    orderBy: { upvotes: "desc" },
    take: 15,
  });

  const skills = typeof company.topSkillsRequired === "string"
    ? JSON.parse(company.topSkillsRequired)
    : company.topSkillsRequired;

  // Build prompt from real data
  const experienceSummaries = experiences.map(e => {
    const rounds = typeof e.rounds === "string" ? JSON.parse(e.rounds) : e.rounds;
    return `- ${e.branch} student, ${e.batch} batch, outcome: ${e.outcome}
  Tips: ${e.overallTips}
  Rounds: ${rounds.map((r: any) => `${r.roundName}: ${(r.questions || []).join(", ")}`).join("; ")}`;
  }).join("\n");

  const topQuestions = questions.map(q =>
    `- [${q.round}] ${q.question} (${q.upvotes} upvotes)`
  ).join("\n");

  const prompt = `You are an expert placement prep coach. Based on the following real interview experiences and frequently asked questions for ${company.name} (${company.domain}), generate a structured prep guide.

Required skills: ${skills.join(", ")}

${experiences.length} Real Interview Experiences:
${experienceSummaries}

Top Questions:
${topQuestions}

Generate a JSON response with exactly this structure:
{
  "synthesisText": "A 200-300 word synthesis of common patterns, what to expect, and overall strategy",
  "keyThemes": ["theme1", "theme2", ...],
  "doList": ["do item 1", "do item 2", ...],
  "dontList": ["don't item 1", "don't item 2", ...]
}

Be specific and actionable. Reference actual patterns from the data.`;

  const response = await generateContentWithRetryAndFallback({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown code block
    const match = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (match) parsed = JSON.parse(match[1]);
    else throw new Error("Failed to parse AI response");
  }

  const guide = await prisma.companyPrepGuide.upsert({
    where: { companyId },
    update: {
      synthesisText: parsed.synthesisText,
      keyThemes: JSON.stringify(parsed.keyThemes),
      doList: JSON.stringify(parsed.doList),
      dontList: JSON.stringify(parsed.dontList),
      generatedAt: new Date(),
      basedOnCount: experiences.length,
    },
    create: {
      instituteName: company.instituteName,
      companyId,
      synthesisText: parsed.synthesisText,
      keyThemes: JSON.stringify(parsed.keyThemes),
      doList: JSON.stringify(parsed.doList),
      dontList: JSON.stringify(parsed.dontList),
      basedOnCount: experiences.length,
    },
  });

  return guide;
}

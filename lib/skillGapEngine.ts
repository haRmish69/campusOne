import { prisma } from "./prisma";
import { getExpertiseProfile } from "./expertiseEngine";


type GapEntry = {
  skill: string;
  status: "missing" | "weak" | "strong";
  priority: number;
};

export async function analyzeSkillGap(
  userId: string,
  companyId: string
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Company not found");

  const requiredSkills = typeof company.topSkillsRequired === "string" 
    ? JSON.parse(company.topSkillsRequired) 
    : (company.topSkillsRequired as string[]);
  const expertise = await getExpertiseProfile(userId);

  const gaps: GapEntry[] = [];

  for (const skill of requiredSkills) {
    const normalizedSkill = skill.trim().toLowerCase();
    const match = expertise.find(
      (e) => e.topic.toLowerCase() === normalizedSkill
    );

    let status: "missing" | "weak" | "strong";
    if (!match) {
      status = "missing";
    } else if (match.confidence >= 2) {
      status = "strong";
    } else {
      status = "weak";
    }

    gaps.push({ skill, status, priority: 0 });
  }

  // Assign priorities:
  // priority 1 = missing skills in top 3 requirements
  // priority 2 = weak skills in top requirements
  // priority 3 = missing skills lower in the list
  gaps.forEach((g, i) => {
    if (g.status === "missing" && i < 3) g.priority = 1;
    else if (g.status === "weak" && i < 3) g.priority = 2;
    else if (g.status === "missing") g.priority = 3;
    else g.priority = 4; // strong — no gap
  });

  gaps.sort((a, b) => a.priority - b.priority);

  // Find peer matches for gaps (missing or weak)
  // Peer matching for gaps is handled dynamically later when the user creates a real request.
  const peerMatchIds: string[] = [];
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.skillGapAnalysis.upsert({
    where: { userId_companyId: { userId, companyId } },
    update: {
      gaps: JSON.stringify(gaps),
      peerMatchIds: JSON.stringify(peerMatchIds),
      generatedAt: new Date(),
      expiresAt,
    },
    create: {
      userId,
      companyId,
      gaps: JSON.stringify(gaps),
      peerMatchIds: JSON.stringify(peerMatchIds),
      expiresAt,
    },
  });

  return result;
}

export async function getOrRefreshSkillGap(
  userId: string,
  companyId: string
) {
  const existing = await prisma.skillGapAnalysis.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });

  if (existing) {
    const age = Date.now() - existing.generatedAt.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (age < sevenDays) {
      return existing;
    }
  }

  return analyzeSkillGap(userId, companyId);
}

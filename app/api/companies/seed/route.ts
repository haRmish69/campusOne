import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// POST /api/companies/seed — seed demo data for hackathon
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "Demo Campus";

    // Check if already seeded
    const existingCount = await prisma.company.count({ where: { instituteName } });
    if (existingCount > 0) {
      return NextResponse.json({ message: "Already seeded", count: existingCount });
    }

    const companies = [
      {
        name: "Amazon",
        domain: "tech",
        packageMin: 18,
        packageMax: 32,
        interviewRounds: 4,
        roundDescriptions: ["Online Assessment", "Technical Round 1", "Technical Round 2", "Bar Raiser / HR"],
        topSkillsRequired: ["DSA", "System Design", "OOP", "Leadership Principles"],
        description: "One of the largest tech companies globally. Known for their rigorous LP-based interviews.",
        websiteUrl: "https://amazon.jobs",
        lastVisitedYear: 2025,
        campusVisitCount: 3,
      },
      {
        name: "Deloitte USI",
        domain: "consulting",
        packageMin: 7,
        packageMax: 12,
        interviewRounds: 3,
        roundDescriptions: ["Aptitude + Technical MCQ", "Case Study", "HR Interview"],
        topSkillsRequired: ["SQL", "Case Study", "Communication", "Business Analysis"],
        description: "Big 4 consulting firm with strong campus presence. Focus on analytical skills.",
        websiteUrl: "https://deloitte.com",
        lastVisitedYear: 2025,
        campusVisitCount: 5,
      },
      {
        name: "Infosys",
        domain: "tech",
        packageMin: 3.6,
        packageMax: 8,
        interviewRounds: 2,
        roundDescriptions: ["Online Assessment (Aptitude + Coding)", "HR Interview"],
        topSkillsRequired: ["Aptitude", "Basic Programming", "Communication"],
        description: "Major Indian IT services company. Mass recruiter with good training programs.",
        websiteUrl: "https://infosys.com",
        lastVisitedYear: 2025,
        campusVisitCount: 8,
      },
      {
        name: "Goldman Sachs",
        domain: "finance",
        packageMin: 20,
        packageMax: 45,
        interviewRounds: 5,
        roundDescriptions: ["HackerRank OA", "Technical Round 1", "Technical Round 2", "Quantitative Round", "HR / Culture Fit"],
        topSkillsRequired: ["DSA", "Probability", "SQL", "System Design", "Quantitative Aptitude"],
        description: "Premier investment bank. Extremely competitive process focused on quant + CS fundamentals.",
        websiteUrl: "https://goldmansachs.com",
        lastVisitedYear: 2024,
        campusVisitCount: 2,
      },
      {
        name: "Tata Motors",
        domain: "core",
        packageMin: 6,
        packageMax: 10,
        interviewRounds: 3,
        roundDescriptions: ["Written Test (Technical + Aptitude)", "Group Discussion", "Technical + HR Interview"],
        topSkillsRequired: ["Core Engineering", "Aptitude", "GD Skills", "Domain Knowledge"],
        description: "India's largest automobile manufacturer. Hires across engineering branches.",
        websiteUrl: "https://tatamotors.com",
        lastVisitedYear: 2025,
        campusVisitCount: 4,
      },
    ];

    const createdCompanies = [];

    for (const c of companies) {
      const embeddingText = `${c.name} ${c.domain} ${c.topSkillsRequired.join(" ")}`;
      const embedding = await embedText(embeddingText);

      const created = await prisma.company.create({
        data: {
          instituteName,
          name: c.name,
          domain: c.domain,
          packageMin: c.packageMin,
          packageMax: c.packageMax,
          interviewRounds: c.interviewRounds,
          roundDescriptions: JSON.stringify(c.roundDescriptions),
          topSkillsRequired: JSON.stringify(c.topSkillsRequired),
          description: c.description,
          websiteUrl: c.websiteUrl,
          lastVisitedYear: c.lastVisitedYear,
          campusVisitCount: c.campusVisitCount,
          embedding: JSON.stringify(embedding),
        },
      });
      createdCompanies.push(created);
    }

    // Seed interview experiences for each company
    const experiences = [
      // Amazon experiences
      {
        companyIndex: 0, batch: "2025", branch: "CSE", outcome: "selected",
        packageOffered: 26, isAnonymous: false, studentName: "Arjun K",
        rounds: [
          { roundName: "Online Assessment", duration: "90 min", questions: ["2 DSA problems (Medium-Hard)", "Workstyles Assessment"], tips: "Practice graph problems" },
          { roundName: "Technical Round 1", duration: "60 min", questions: ["Design a URL shortener", "Binary tree traversal variations"], tips: "Think aloud, explain your approach" },
          { roundName: "Bar Raiser", duration: "45 min", questions: ["Tell me about a time you disagreed with a manager", "System design: Design Twitter feed"], tips: "Use STAR method for LP questions" },
        ],
        overallTips: "Focus heavily on Leadership Principles — they care about them as much as coding. Practice at least 2 DSA problems daily for 30 days. System design is crucial for SDE-1+. Don't skip the behavioral prep, it's what separates Amazon from other FAANG interviews.",
      },
      {
        companyIndex: 0, batch: "2024", branch: "IT", outcome: "rejected_r2",
        rounds: [
          { roundName: "Online Assessment", duration: "90 min", questions: ["Array manipulation", "Graph BFS problem"], tips: "Time management is key" },
          { roundName: "Technical Round 1", duration: "50 min", questions: ["Linked list merge", "System design basics"], tips: "Know your time complexities" },
        ],
        overallTips: "I got rejected in round 2 because my system design fundamentals were weak. If you're from IT/ECE branch, make sure to study HLD concepts thoroughly. The interviewers are friendly but thorough. Don't just code — explain your thought process step by step.",
      },
      // Goldman Sachs
      {
        companyIndex: 3, batch: "2025", branch: "CSE", outcome: "selected",
        packageOffered: 35, isAnonymous: true,
        rounds: [
          { roundName: "HackerRank OA", duration: "120 min", questions: ["3 coding problems", "1 SQL query", "MCQs on probability"], tips: "SQL questions are tricky — practice joins and window functions" },
          { roundName: "Quantitative Round", duration: "45 min", questions: ["Probability puzzles", "Expected value calculations"], tips: "Brush up on combinatorics" },
        ],
        overallTips: "Goldman is unique — they test quantitative aptitude heavily even for tech roles. Spend time on probability, expected values, and mathematical reasoning. The coding rounds are standard LeetCode medium, but the quant round is what trips most people up. Prepare 50+ probability problems from Brainstellar.",
      },
      // Deloitte
      {
        companyIndex: 1, batch: "2025", branch: "MBA", outcome: "selected",
        packageOffered: 10.5, isAnonymous: false, studentName: "Priya S",
        rounds: [
          { roundName: "Case Study", duration: "30 min", questions: ["Market entry strategy for EV company in India"], tips: "Use frameworks but don't be robotic" },
          { roundName: "HR Interview", duration: "20 min", questions: ["Why consulting?", "Where do you see yourself in 5 years?"], tips: "Be genuine, they can tell when you're faking" },
        ],
        overallTips: "Deloitte values structured thinking above all else. Practice case studies from CaseCoach or Victor Cheng. The HR round is straightforward if you're honest. They appreciate candidates who show curiosity about their practice areas. Research which service line you want to join before the interview.",
      },
    ];

    for (const exp of experiences) {
      const company = createdCompanies[exp.companyIndex];
      const embeddingText = `${company.name} ${exp.branch} ${exp.outcome} ${exp.overallTips}`;
      const embedding = await embedText(embeddingText);

      await prisma.interviewExperience.create({
        data: {
          instituteName,
          companyId: company.id,
          studentName: exp.isAnonymous ? null : (exp.studentName || null),
          batch: exp.batch,
          branch: exp.branch,
          outcome: exp.outcome,
          packageOffered: (exp as any).packageOffered || null,
          rounds: JSON.stringify(exp.rounds),
          overallTips: exp.overallTips,
          isAnonymous: exp.isAnonymous ?? true,
          embedding: JSON.stringify(embedding),
        },
      });
    }

    // Seed prep questions
    const questions = [
      { companyIndex: 0, round: "oa", question: "Given an array of integers, find the maximum sum of a contiguous subarray (Kadane's Algorithm variation)", difficulty: "medium" },
      { companyIndex: 0, round: "technical", question: "Design a parking lot system — what classes would you use? How would you handle concurrency?", difficulty: "hard" },
      { companyIndex: 0, round: "hr", question: "Tell me about a time when you had to make a decision without enough data. What was the outcome?", difficulty: "medium", answer: "Use STAR method. Pick an example where you made a calculated risk and it paid off. Amazon values bias for action." },
      { companyIndex: 3, round: "oa", question: "Write a SQL query to find the second highest salary in each department using window functions", difficulty: "medium" },
      { companyIndex: 3, round: "technical", question: "You have a biased coin that lands heads 60% of the time. How would you use it to simulate a fair coin?", difficulty: "hard", answer: "Flip twice. HT = heads, TH = tails. HH or TT = flip again. This gives equal probability for each outcome." },
      { companyIndex: 1, round: "case_study", question: "A coffee chain wants to expand to Tier 2 cities in India. How would you evaluate this opportunity?", difficulty: "medium" },
      { companyIndex: 2, round: "oa", question: "Find the first non-repeating character in a string. What's the time complexity?", difficulty: "easy" },
      { companyIndex: 4, round: "technical", question: "Explain the difference between stress and strain. Where would you apply von Mises yield criterion?", difficulty: "medium" },
    ];

    for (const q of questions) {
      const company = createdCompanies[q.companyIndex];
      const embeddingText = `${company.name} ${q.round} ${q.question}`;
      const embedding = await embedText(embeddingText);

      await prisma.prepQuestion.create({
        data: {
          instituteName,
          companyId: company.id,
          round: q.round,
          question: q.question,
          answer: (q as any).answer || null,
          difficulty: q.difficulty,
          submittedBy: userId,
          embedding: JSON.stringify(embedding),
        },
      });
    }

    return NextResponse.json({
      message: "Seed complete",
      companies: createdCompanies.length,
      experiences: experiences.length,
      questions: questions.length,
    }, { status: 201 });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed: " + (error as Error).message }, { status: 500 });
  }
}

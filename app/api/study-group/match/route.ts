import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");

    if (!subject) {
      return NextResponse.json({ error: "Missing subject parameter" }, { status: 400 });
    }

    // 1. Get current user's profile
    const myProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!myProfile || !myProfile.instituteName) {
      return NextResponse.json({ 
        error: "Complete your profile to find study matches.",
        requiresOnboarding: true 
      });
    }

    // 2. Find other users at the SAME institute who have a class or deadline with this subject
    // We will just find UserProfiles of people who have ClassSchedules or Deadlines with this subject
    // For simplicity, let's find all UserProfiles at the same institute EXCEPT the current user
    const potentialPeers = await prisma.userProfile.findMany({
      where: {
        instituteName: myProfile.instituteName,
        userId: { not: userId },
      }
    });

    // 3. Score each peer
    const scoredPeers = [];

    for (const peer of potentialPeers) {
      let score = 0;

      // Major match = +50 points
      if (peer.major && myProfile.major && peer.major.toLowerCase() === myProfile.major.toLowerCase()) {
        score += 50;
      }

      // Grad Year match = +25 points
      if (peer.gradYear && myProfile.gradYear && peer.gradYear === myProfile.gradYear) {
        score += 25;
      }

      // Check if they actually share the subject (Deadline or ClassSchedule)
      const sharesClass = await prisma.classSchedule.findFirst({
        where: { userId: peer.userId, subject: { contains: subject } }
      });
      const sharesDeadline = await prisma.deadline.findFirst({
        where: { userId: peer.userId, subject: { contains: subject } }
      });

      if (sharesClass || sharesDeadline) {
        score += 25; // Subject match = +25 points
      } else {
        // If they don't even share the subject, they are a terrible match for this specific group
        score -= 50; 
      }

      if (score > 0) {
        scoredPeers.push({
          id: peer.userId,
          // Mask the ID to look like a friendly name for demo
          name: `Student (${peer.userId.substring(0, 5)}...)`, 
          major: peer.major || "Undeclared",
          gradYear: peer.gradYear || "Unknown",
          score,
        });
      }
    }

    // Sort by score descending
    scoredPeers.sort((a, b) => b.score - a.score);

    // Return top 5 matches
    return NextResponse.json({
      subject,
      matches: scoredPeers.slice(0, 5)
    });

  } catch (error) {
    console.error("Study Match Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

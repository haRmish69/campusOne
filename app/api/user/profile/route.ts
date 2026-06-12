import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId,
          profileComplete: false,
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    
    // Validate inputs loosely
    const { name, instituteName, major, gradYear, gender, skip } = data;

    if (skip) {
      // If skipped, we just mark it complete so we don't bother them again
      const profile = await prisma.userProfile.update({
        where: { userId },
        data: { profileComplete: true },
      });
      return NextResponse.json(profile);
    }

    const currentYear = new Date().getFullYear();
    const parsedGradYear = gradYear ? parseInt(gradYear, 10) : null;
    
    if (parsedGradYear && (parsedGradYear < currentYear || parsedGradYear > currentYear + 6)) {
      return NextResponse.json(
        { error: "Graduation year must be between the current year and +6 years." },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.update({
      where: { userId },
      data: {
        name: name || null,
        instituteName: instituteName || null,
        major: major || null,
        gradYear: parsedGradYear || null,
        gender: gender || null,
        profileComplete: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// POST /api/services/seed — seed campus services + process guides
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "Demo Campus";

    const existingCount = await prisma.campusService.count({ where: { instituteName } });
    if (existingCount > 0) return NextResponse.json({ message: "Already seeded", count: existingCount });

    const services = [
      { name: "Central Library", category: "library", location: "Main Academic Block, Ground Floor", timings: [{ days: "Monday-Saturday", hours: "08:00-22:00" }, { days: "Sunday", hours: "10:00-18:00" }], contactEmail: "library@campus.edu" },
      { name: "Exam Cell", category: "academic", location: "Admin Block, Room 204", timings: [{ days: "Monday-Friday", hours: "10:00-17:00" }], contactEmail: "exam@campus.edu", contactPhone: "011-2345678" },
      { name: "Medical Center", category: "medical", location: "Near Boys Hostel Block B", timings: [{ days: "Monday-Saturday", hours: "09:00-20:00" }, { days: "Emergency", hours: "24/7" }], contactPhone: "011-9876543" },
      { name: "Sports Complex", category: "sports", location: "Behind Academic Block", timings: [{ days: "All days", hours: "06:00-21:00" }] },
      { name: "Hostel Office", category: "hostel", location: "Hostel Admin Block", timings: [{ days: "Monday-Friday", hours: "09:00-16:00" }], contactEmail: "hostel@campus.edu" },
      { name: "Training & Placement Cell", category: "academic", location: "Admin Block, Room 301", timings: [{ days: "Monday-Friday", hours: "09:00-17:00" }], contactEmail: "placement@campus.edu" },
    ];

    const createdServices = [];
    for (const s of services) {
      const embedding = await embedText(`${s.name} ${s.category} ${s.location}`);
      const created = await prisma.campusService.create({
        data: {
          instituteName,
          name: s.name,
          category: s.category,
          location: s.location,
          timings: JSON.stringify(s.timings),
          contactEmail: (s as any).contactEmail || null,
          contactPhone: (s as any).contactPhone || null,
          embedding: JSON.stringify(embedding),
        },
      });
      createdServices.push(created);
    }

    // Process Guides
    const guides = [
      {
        serviceIndex: 0, // Library
        title: "How to get a library card",
        steps: [{ order: 1, instruction: "Go to the library counter with your admission letter" }, { order: 2, instruction: "Fill the registration form" }, { order: 3, instruction: "Submit passport-size photo" }, { order: 4, instruction: "Get library card same day" }],
        documentsRequired: ["Admission Letter", "Student ID", "Passport Photo"],
        estimatedDays: 1,
        fees: 0,
        tips: "Go early in the semester — the queue gets long after the first week.",
      },
      {
        serviceIndex: 1, // Exam Cell
        title: "How to apply for re-evaluation",
        steps: [{ order: 1, instruction: "Download re-evaluation form from the portal" }, { order: 2, instruction: "Fill the form and get HOD signature" }, { order: 3, instruction: "Pay ₹500/subject at the accounts office" }, { order: 4, instruction: "Submit at Exam Cell with payment receipt" }],
        documentsRequired: ["Re-evaluation Form", "HOD Signature", "Payment Receipt"],
        estimatedDays: 30,
        fees: 500,
        tips: "Re-evaluation results take about a month. You can check only the subjects you're borderline on — don't re-evaluate everything.",
      },
    ];

    for (const g of guides) {
      const service = createdServices[g.serviceIndex];
      const embedding = await embedText(`${g.title} ${service.name}`);
      await prisma.processGuide.create({
        data: {
          instituteName,
          serviceId: service.id,
          title: g.title,
          steps: JSON.stringify(g.steps),
          documentsRequired: JSON.stringify(g.documentsRequired),
          estimatedDays: g.estimatedDays,
          fees: g.fees,
          tips: g.tips,
          submittedBy: userId,
          embedding: JSON.stringify(embedding),
        },
      });
    }

    return NextResponse.json({
      message: "Services seeded",
      services: services.length,
      guides: guides.length,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Seed failed: " + (error as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

// POST /api/local/seed — seed local places, trip recs, survival tips
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "Demo Campus";

    const existingCount = await prisma.localPlace.count({ where: { instituteName } });
    if (existingCount > 0) return NextResponse.json({ message: "Already seeded", count: existingCount });

    // Places
    const places = [
      { name: "Chotu's Maggi Point", category: "food", distanceMeters: 200, direction: "Behind hostel block C", description: "The best late-night Maggi and chai spot near campus. Known for special butter Maggi and cutting chai. Gets crowded post 10PM.", priceRange: "₹20-60", mustTry: "Butter Maggi with extra cheese" },
      { name: "Campus Pharmacy", category: "medical", distanceMeters: 50, direction: "Inside campus, near admin block", description: "Basic medicines available. Has ORS, bandages, Crocin, and common cold meds. The pharmacist is helpful and often gives advice.", priceRange: "₹10-200", phone: "9876543210" },
      { name: "SBI ATM", category: "atm", distanceMeters: 100, direction: "Main gate, left side", description: "SBI ATM, usually has cash. Sometimes runs out on 1st of the month (salary day rush). HDFC ATM is 500m further near the market.", mustTry: null },
      { name: "Gupta Stationery", category: "stationery", distanceMeters: 300, direction: "Market area, first shop on left", description: "Has printouts (₹2/page), spiral binding, A4 sheets, pens, lab files. Can do color prints too. Also sells old exam papers!", priceRange: "₹2-50", mustTry: "Ask for previous year question papers" },
      { name: "Game Zone", category: "entertainment", distanceMeters: 800, direction: "Market area, above pizza shop", description: "PS5 gaming, pool table, and air hockey. Student discount on weekdays. Good place to destress.", priceRange: "₹100-200/hr" },
    ];

    for (const p of places) {
      const embedding = await embedText(`${p.name} ${p.category} ${p.description}`);
      await prisma.localPlace.create({
        data: { instituteName, submittedBy: userId, embedding: JSON.stringify(embedding), ...p, mustTry: p.mustTry || null, phone: (p as any).phone || null, timings: null },
      });
    }

    // Trip Recommendations
    const trips = [
      {
        destination: "Matheran Hill Station", distanceKm: 80, estimatedCost: 1200,
        howToGet: "Take a local train from the nearest station to Neral Junction (₹40). From Neral, take the toy train to Matheran (₹75, 2hrs). No vehicles allowed inside Matheran — it's completely eco-friendly!",
        bestFor: "weekend", bestSeason: "Monsoon (July-September)", highlights: ["Charlotte Lake", "Panorama Point", "Echo Point", "Horse riding"],
      },
      {
        destination: "Street Food Walk - Manek Chowk", distanceKm: 15, estimatedCost: 300,
        howToGet: "Take a bus from campus gate (Route 5, ₹15) or split an auto with friends (₹100). Best to go after 8PM when all stalls open.",
        bestFor: "evening", highlights: ["Pav Bhaji", "Kulfi Falooda", "Cheese Sandwich", "Fresh Juice"],
      },
    ];

    for (const t of trips) {
      const embedding = await embedText(`${t.destination} ${t.howToGet} ${t.highlights.join(" ")}`);
      await prisma.tripRecommendation.create({
        data: {
          instituteName, submittedBy: userId, embedding: JSON.stringify(embedding),
          destination: t.destination, distanceKm: t.distanceKm, estimatedCost: t.estimatedCost,
          howToGet: t.howToGet, bestFor: t.bestFor, bestSeason: t.bestSeason || null,
          highlights: JSON.stringify(t.highlights),
        },
      });
    }

    // Survival Tips
    const tips = [
      { category: "fresher", title: "Always carry your ID card", tip: "You'll need it for everything — library, lab, hostel entry, and even the mess. Without it, security won't let you in after 9PM. Keep a photocopy in your room as backup." },
      { category: "food", title: "Wednesday mess dinner is the best", tip: "Wednesday and Saturday dinners usually have the best menu (paneer + gulab jamun). Monday lunch is usually the worst — plan accordingly and keep backup snacks." },
      { category: "academic", title: "Sit in the first 3 rows", tip: "Attendance scanners sometimes miss the back rows, and some professors give bonus marks to students they recognize. It also helps with concentration." },
      { category: "money", title: "Split subscriptions with hostel mates", tip: "Netflix, Spotify, YouTube Premium — split family plans with your wing mates. A 4-person Netflix split is ₹50/month instead of ₹200." },
      { category: "hostel", title: "Invest in a good extension board", tip: "Your room will have max 2 sockets. Get a good surge protector with 4+ sockets. Also get a small table fan — AC hostels are never cold enough." },
    ];

    for (const t of tips) {
      const embedding = await embedText(`${t.category} ${t.title} ${t.tip}`);
      await prisma.survivalTip.create({
        data: { instituteName, submittedBy: userId, embedding: JSON.stringify(embedding), ...t },
      });
    }

    return NextResponse.json({
      message: "Local discovery seeded",
      places: places.length, trips: trips.length, tips: tips.length,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Seed failed: " + (error as Error).message }, { status: 500 });
  }
}

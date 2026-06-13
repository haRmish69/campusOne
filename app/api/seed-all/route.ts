// Quick seed script — runs all seed endpoints via internal fetch
// Usage: open http://localhost:3000/api/seed-all in browser while logged in

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const instituteName = profile?.instituteName || "Demo Campus";

    const results: Record<string, any> = {};

    // ── 1. SEED COMPANIES ──
    const existingCompanies = await prisma.company.count({ where: { instituteName } });
    if (existingCompanies === 0) {
      const companies = [
        { name: "Amazon", domain: "tech", skills: ["DSA", "System Design", "Java", "AWS"], interviewRounds: 4, packageMin: 25, packageMax: 45 },
        { name: "Goldman Sachs", domain: "finance", skills: ["DSA", "OOP", "Java", "SQL"], interviewRounds: 5, packageMin: 28, packageMax: 50 },
        { name: "Deloitte", domain: "consulting", skills: ["Case Studies", "Excel", "SQL", "Communication"], interviewRounds: 3, packageMin: 8, packageMax: 15 },
        { name: "Google", domain: "tech", skills: ["DSA", "System Design", "Python", "ML"], interviewRounds: 5, packageMin: 30, packageMax: 55 },
        { name: "TCS", domain: "IT services", skills: ["Aptitude", "Coding", "Communication", "SQL"], interviewRounds: 3, packageMin: 3.5, packageMax: 7 },
      ];
      for (const c of companies) {
        const embedding = await embedText(`${c.name} ${c.domain} ${c.skills.join(" ")}`);
        await prisma.company.create({
          data: {
            instituteName, name: c.name, domain: c.domain,
            topSkillsRequired: JSON.stringify(c.skills),
            interviewRounds: c.interviewRounds,
            packageMin: c.packageMin, packageMax: c.packageMax,
            embedding: JSON.stringify(embedding),
          },
        });
      }
      results.companies = companies.length;
    } else {
      results.companies = `Already seeded (${existingCompanies})`;
    }

    // ── 2. SEED TRANSPORT ──
    const existingRoutes = await prisma.transportRoute.count({ where: { instituteName } });
    if (existingRoutes === 0) {
      const routes = [
        { name: "Campus → Railway Station", type: "bus", stops: [{ name: "Main Gate", time: "08:00" }, { name: "Clock Tower", time: "08:15" }, { name: "Railway Station", time: "08:45" }], operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], frequency: "Every 30 min (8AM-9PM)" },
        { name: "Hostel Loop Shuttle", type: "shuttle", stops: [{ name: "Boys Hostel", time: "07:30" }, { name: "Girls Hostel", time: "07:35" }, { name: "Academic Block", time: "07:45" }, { name: "Library", time: "07:50" }], operatingDays: ["All"], frequency: "Every 15 min" },
        { name: "Main Gate Auto Stand", type: "auto_stand", stops: [{ name: "Main Gate", time: "6AM-10PM" }], operatingDays: ["All"], frequency: "On demand" },
      ];
      for (const r of routes) {
        const embedding = await embedText(`${r.name} ${r.type} ${r.stops.map(s => s.name).join(" ")}`);
        await prisma.transportRoute.create({
          data: { instituteName, name: r.name, type: r.type, stops: JSON.stringify(r.stops), operatingDays: JSON.stringify(r.operatingDays), frequency: r.frequency, embedding: JSON.stringify(embedding) },
        });
      }
      results.transport = routes.length;
    } else {
      results.transport = `Already seeded (${existingRoutes})`;
    }

    // ── 3. SEED SERVICES ──
    const existingServices = await prisma.campusService.count({ where: { instituteName } });
    if (existingServices === 0) {
      const services = [
        { name: "Central Library", category: "library", location: "Main Academic Block", timings: [{ days: "Mon-Sat", hours: "08:00-22:00" }] },
        { name: "Exam Cell", category: "academic", location: "Admin Block, Room 204", timings: [{ days: "Mon-Fri", hours: "10:00-17:00" }] },
        { name: "Medical Center", category: "medical", location: "Near Boys Hostel", timings: [{ days: "Mon-Sat", hours: "09:00-20:00" }] },
        { name: "Sports Complex", category: "sports", location: "Behind Academic Block", timings: [{ days: "All", hours: "06:00-21:00" }] },
        { name: "Hostel Office", category: "hostel", location: "Hostel Admin Block", timings: [{ days: "Mon-Fri", hours: "09:00-16:00" }] },
        { name: "T&P Cell", category: "academic", location: "Admin Block, Room 301", timings: [{ days: "Mon-Fri", hours: "09:00-17:00" }] },
      ];
      for (const s of services) {
        const embedding = await embedText(`${s.name} ${s.category} ${s.location}`);
        await prisma.campusService.create({
          data: { instituteName, name: s.name, category: s.category, location: s.location, timings: JSON.stringify(s.timings), embedding: JSON.stringify(embedding) },
        });
      }
      results.services = services.length;
    } else {
      results.services = `Already seeded (${existingServices})`;
    }

    // ── 4. SEED LOCAL PLACES ──
    const existingPlaces = await prisma.localPlace.count({ where: { instituteName } });
    if (existingPlaces === 0) {
      const places = [
        { name: "Chotu's Maggi Point", category: "food", distanceMeters: 200, direction: "Behind hostel C", description: "Best late-night Maggi & chai. Special butter Maggi is legendary.", priceRange: "₹20-60", mustTry: "Butter Maggi with extra cheese" },
        { name: "Campus Pharmacy", category: "medical", distanceMeters: 50, direction: "Inside campus", description: "Basic meds: ORS, Crocin, bandages. Pharmacist gives good advice.", priceRange: "₹10-200" },
        { name: "SBI ATM", category: "atm", distanceMeters: 100, direction: "Main gate, left", description: "Usually has cash. Runs out on 1st of month." },
        { name: "Gupta Stationery", category: "stationery", distanceMeters: 300, direction: "Market area", description: "Printouts ₹2/page, spiral binding, old exam papers available!", priceRange: "₹2-50", mustTry: "Ask for previous year papers" },
        { name: "Game Zone", category: "entertainment", distanceMeters: 800, direction: "Market area", description: "PS5 gaming, pool table. Student discount on weekdays.", priceRange: "₹100-200/hr" },
      ];
      for (const p of places) {
        const embedding = await embedText(`${p.name} ${p.category} ${p.description}`);
        await prisma.localPlace.create({
          data: {
            instituteName, submittedBy: userId, name: p.name, category: p.category,
            distanceMeters: p.distanceMeters || null, direction: p.direction || null,
            description: p.description, priceRange: p.priceRange || null,
            mustTry: (p as any).mustTry || null, embedding: JSON.stringify(embedding),
          },
        });
      }
      results.places = places.length;
    } else {
      results.places = `Already seeded (${existingPlaces})`;
    }

    // ── 5. SEED SURVIVAL TIPS ──
    const existingTips = await prisma.survivalTip.count({ where: { instituteName } });
    if (existingTips === 0) {
      const tips = [
        { category: "fresher", title: "Always carry your ID card", tip: "You need it for library, lab, hostel entry, and mess. Security won't let you in after 9PM without it." },
        { category: "food", title: "Wednesday dinner is the best", tip: "Wednesday and Saturday dinners have paneer + gulab jamun. Monday lunch is usually the worst." },
        { category: "academic", title: "Sit in the first 3 rows", tip: "Attendance scanners miss back rows. Some profs give bonus marks to students they recognize." },
        { category: "money", title: "Split subscriptions", tip: "Netflix, Spotify, YouTube Premium — split family plans with hostel mates. ₹50/month instead of ₹200." },
        { category: "hostel", title: "Get a good extension board", tip: "Your room has max 2 sockets. Get a surge protector with 4+ sockets and a small table fan." },
      ];
      for (const t of tips) {
        const embedding = await embedText(`${t.category} ${t.title} ${t.tip}`);
        await prisma.survivalTip.create({
          data: { instituteName, submittedBy: userId, category: t.category, title: t.title, tip: t.tip, embedding: JSON.stringify(embedding) },
        });
      }
      results.tips = tips.length;
    } else {
      results.tips = `Already seeded (${existingTips})`;
    }

    // ── 6. SEED TRIP RECOMMENDATIONS ──
    const existingTrips = await prisma.tripRecommendation.count({ where: { instituteName } });
    if (existingTrips === 0) {
      const trips = [
        { destination: "Matheran Hill Station", distanceKm: 80, estimatedCost: 1200, howToGet: "Local train to Neral Junction (₹40), then toy train to Matheran (₹75, 2hrs). No vehicles allowed!", bestFor: "weekend", bestSeason: "Monsoon", highlights: ["Charlotte Lake", "Panorama Point", "Horse riding"] },
        { destination: "Street Food Walk", distanceKm: 15, estimatedCost: 300, howToGet: "Bus Route 5 (₹15) or split an auto (₹100). Go after 8PM.", bestFor: "evening", highlights: ["Pav Bhaji", "Kulfi Falooda", "Cheese Sandwich"] },
      ];
      for (const t of trips) {
        const embedding = await embedText(`${t.destination} ${t.howToGet} ${t.highlights.join(" ")}`);
        await prisma.tripRecommendation.create({
          data: {
            instituteName, submittedBy: userId, destination: t.destination,
            distanceKm: t.distanceKm, estimatedCost: t.estimatedCost,
            howToGet: t.howToGet, bestFor: t.bestFor, bestSeason: t.bestSeason || null,
            highlights: JSON.stringify(t.highlights), embedding: JSON.stringify(embedding),
          },
        });
      }
      results.trips = trips.length;
    } else {
      results.trips = `Already seeded (${existingTrips})`;
    }

    return NextResponse.json({ message: "✅ All data seeded!", results }, { status: 201 });
  } catch (error) {
    console.error("Seed-all error:", error);
    return NextResponse.json({ error: "Seed failed: " + (error as Error).message }, { status: 500 });
  }
}

"use client";

import Link from "next/link";
import { Briefcase, Car, Users, ArrowRight } from "lucide-react";

const ecosystemItems = [
  {
    href: "/placement",
    icon: Briefcase,
    title: "Placement Hub",
    description:
      "Explore companies, read interview experiences from seniors, and get AI-powered skill gap analysis.",
    stats: ["Companies", "Experiences", "Questions"],
  },
  {
    href: "/transport",
    icon: Car,
    title: "Travel Pool",
    description:
      "Find campus bus schedules, share live updates, and pool cabs with students heading the same way.",
    stats: ["Routes", "Live Updates", "Cab Pools"],
  },
  {
    href: "/peer-learning",
    icon: Users,
    title: "Study Peers",
    description:
      "Request help, volunteer to teach, and build your campus reputation — powered by AI matching.",
    stats: ["Request Help", "Teach", "Connect"],
  },
];

export default function CampusEcosystemPage() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas-white)]">
      <div className="max-w-[1200px] mx-auto px-8 py-12">
        {/* PAGE HEADER — typographic, no background fill */}
        <div className="mb-12">
          {/* Eyebrow label */}
          <span className="text-[11px] font-semibold text-[var(--color-pewter)] uppercase tracking-widest">
            Campus Ecosystem
          </span>

          <h1 className="mt-3 text-[50px] font-light text-[var(--color-graphite)] leading-[1.34]">
            Your Campus, <span className="font-semibold">Connected.</span>
          </h1>

          <p className="mt-4 text-[18px] text-[var(--color-stone)] leading-relaxed max-w-[560px]">
            Everything here is shared with students at your institute.
            Crowdsourced by your peers, powered by AI, built for your campus.
          </p>
        </div>

        {/* THREE FEATURE CARDS — uniform, no color differentiation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ecosystemItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-8 hover:border-[var(--color-ember-orange)] transition-colors duration-200"
            >
              {/* Icon — pewter on pearl, no color */}
              <div className="w-12 h-12 rounded-[12px] bg-[var(--color-pearl)] flex items-center justify-center mb-6">
                <item.icon size={20} className="text-[var(--color-pewter)]" />
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-semibold text-[var(--color-graphite)] mb-2">
                {item.title}
              </h2>

              {/* Description */}
              <p className="text-[14px] text-[var(--color-stone)] leading-relaxed mb-8">
                {item.description}
              </p>

              {/* Footer stats + arrow */}
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-[var(--color-pewter)]">
                  {item.stats.join(" · ")}
                </p>
                <ArrowRight
                  size={16}
                  className="text-[var(--color-pewter)] group-hover:text-[var(--color-ember-orange)] group-hover:translate-x-0.5 transition-all"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

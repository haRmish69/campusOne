"use client";

import Link from "next/link";
import { Briefcase, Car, Users, ArrowRight, Globe, Sparkles } from "lucide-react";

const ecosystemCards = [
  {
    title: "Placement Hub",
    description:
      "Explore companies that visit your campus, read interview experiences from seniors, practice real questions, and get AI-powered prep guides.",
    href: "/placement",
    icon: Briefcase,
    gradient: "from-blue-500 to-indigo-600",
    bgGlow: "bg-blue-500/10",
    stats: "Companies · Experiences · Questions",
  },
  {
    title: "Travel Pool",
    description:
      "Find campus bus/shuttle schedules, share live transport updates, and pool cabs with fellow students heading the same way.",
    href: "/transport",
    icon: Car,
    gradient: "from-emerald-500 to-teal-600",
    bgGlow: "bg-emerald-500/10",
    stats: "Routes · Live Updates · Cab Pools",
  },
  {
    title: "Study Peers",
    description:
      "Request help on any topic, get matched with experts on your campus, and build your personal learning network — all anonymously.",
    href: "/peer-learning",
    icon: Users,
    gradient: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/10",
    stats: "Request Help · Teach · Connect",
  },
];

export default function CampusEcosystemPage() {
  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative mb-14 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/40 border border-blue-100/60 p-10 md:p-14 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-br from-violet-200/20 to-purple-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-6 right-8 hidden md:block">
          <Globe className="w-20 h-20 text-blue-200/40" strokeWidth={1} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-blue-600 tracking-wide uppercase">
              Campus Ecosystem
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0b3558] mb-3">
            Your Campus, Connected
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
            Everything here is shared with students at your institute.
            Crowdsourced by your peers, powered by AI, built for your campus.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {ecosystemCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Top gradient bar */}
              <div
                className={`h-1.5 w-full bg-gradient-to-r ${card.gradient}`}
              />

              <div className="p-8 flex flex-col flex-1">
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl ${card.bgGlow} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon
                    className={`w-7 h-7 bg-gradient-to-br ${card.gradient} bg-clip-text`}
                    style={{
                      color: card.gradient.includes("blue")
                        ? "#3b82f6"
                        : card.gradient.includes("emerald")
                        ? "#10b981"
                        : "#8b5cf6",
                    }}
                  />
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-[#0b3558] mb-3 group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h2>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-6">
                  {card.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-400 tracking-wide">
                    {card.stats}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:translate-x-1 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

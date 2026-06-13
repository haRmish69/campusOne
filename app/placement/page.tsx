"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, Search, TrendingUp, Users, ChevronRight, Building2, Star } from "lucide-react";
import { toast } from "sonner";

type Company = {
  id: string;
  name: string;
  domain: string;
  packageMin: number | null;
  packageMax: number | null;
  interviewRounds: number | null;
  topSkillsRequired: string | string[];
  campusVisitCount: number;
  lastVisitedYear: number | null;
  description: string | null;
};

const DOMAIN_COLORS: Record<string, string> = {
  tech: "bg-blue-100 text-blue-700",
  finance: "bg-emerald-100 text-emerald-700",
  consulting: "bg-purple-100 text-purple-700",
  core: "bg-amber-100 text-amber-700",
  product: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

export default function PlacementPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, [domainFilter]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (domainFilter) params.set("domain", domainFilter);
      const res = await fetch(`/api/companies?${params}`);
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = searchQuery
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : companies;

  const parseSkills = (skills: string | string[]): string[] => {
    if (Array.isArray(skills)) return skills;
    try { return JSON.parse(skills); } catch { return []; }
  };

  const formatPackage = (min: number | null, max: number | null) => {
    if (!min && !max) return "Not disclosed";
    if (min && max) return `₹${min}-${max} LPA`;
    if (min) return `₹${min}+ LPA`;
    return `Up to ₹${max} LPA`;
  };

  const domains = ["tech", "finance", "consulting", "core", "product", "other"];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-midnight-navy)] flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-[var(--color-electric-indigo)]" />
            Placement Hub
          </h1>
          <p className="text-[var(--color-slate-blue)] mt-1">
            Company profiles, interview experiences & skill gap analysis
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setDomainFilter("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              !domainFilter
                ? "bg-[var(--color-midnight-navy)] text-white"
                : "bg-[var(--color-fog)] text-[var(--color-slate-blue)] hover:bg-[var(--color-cloud)]"
            }`}
          >
            All
          </button>
          {domains.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all shrink-0 ${
                domainFilter === d
                  ? "bg-[var(--color-midnight-navy)] text-white"
                  : "bg-[var(--color-fog)] text-[var(--color-slate-blue)] hover:bg-[var(--color-cloud)]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Company Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-[var(--color-fog)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--color-midnight-navy)]">
            No companies found
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery
              ? "Try a different search term"
              : "No companies have been added for your campus yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => {
            const skills = parseSkills(company.topSkillsRequired);
            return (
              <Link
                key={company.id}
                href={`/placement/${company.id}`}
                className="group block"
              >
                <div className="rounded-2xl border border-border/60 bg-card p-5 hover:shadow-lg hover:border-[var(--color-electric-indigo)]/30 transition-all duration-300 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--color-midnight-navy)] truncate group-hover:text-[var(--color-electric-indigo)] transition-colors">
                        {company.name}
                      </h3>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          DOMAIN_COLORS[company.domain] || DOMAIN_COLORS.other
                        }`}
                      >
                        {company.domain}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[var(--color-electric-indigo)] transition-colors shrink-0 mt-1" />
                  </div>

                  {/* Package */}
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-[var(--color-midnight-navy)]">
                      {formatPackage(company.packageMin, company.packageMax)}
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {company.interviewRounds && (
                      <span>{company.interviewRounds} rounds</span>
                    )}
                    {company.campusVisitCount > 0 && (
                      <span>Visited {company.campusVisitCount}x</span>
                    )}
                    {company.lastVisitedYear && (
                      <span>Last: {company.lastVisitedYear}</span>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-[var(--color-fog)] text-[10px] font-medium text-[var(--color-slate-blue)]"
                      >
                        {skill}
                      </span>
                    ))}
                    {skills.length > 4 && (
                      <span className="px-2 py-0.5 rounded-md bg-[var(--color-fog)] text-[10px] font-medium text-muted-foreground">
                        +{skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

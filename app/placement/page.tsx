"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Search, TrendingUp, ArrowRight, Building2, Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AddCompanyModal from "./components/AddCompanyModal";
import { PageHeader } from "@/components/PageHeader";

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
  addedBy: string | null;
};

export default function PlacementPage() {
  const { user } = useUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, [domainFilter]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (domainFilter && domainFilter !== "All") params.set("domain", domainFilter.toLowerCase());
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

  const handleReport = async (companyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to report this company as having incorrect/fake information?")) return;
    try {
      const res = await fetch(`/api/companies/${companyId}/report`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to report");
      if (data.removed) {
        toast.success("Company removed due to multiple reports");
        fetchCompanies();
      } else {
        toast.success("Report submitted. Thank you!");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (companyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this company and all its experiences/questions? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Company deleted");
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.message);
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

  const domains = ['All', 'Tech', 'Finance', 'Consulting', 'Core', 'Product', 'Other'];

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-10">
      {/* Page Header */}
      <PageHeader
        backHref="/campus-ecosystem"
        backLabel="Back to Campus Ecosystem"
        title="Placement Hub"
        subtitle="Company profiles, interview experiences & skill gap analysis"
        ctaLabel="Add Company"
        onCtaClick={() => setIsModalOpen(true)}
      />

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] border border-[var(--color-paper)] rounded-[20px] px-4 py-2.5 bg-[var(--color-canvas-white)]">
          <Search size={14} className="text-[var(--color-pewter)] shrink-0" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-[14px] text-[var(--color-slate-dark)] outline-none placeholder:text-[var(--color-stone)] bg-transparent"
          />
        </div>

        {domains.map((f) => (
          <button
            key={f}
            onClick={() => setDomainFilter(f)}
            className={`px-4 py-2 rounded-[20px] text-[13px] font-medium transition-colors ${
              domainFilter === f
                ? 'border border-[var(--color-ember-orange)] text-[var(--color-ember-orange)] bg-[var(--color-canvas-white)]'
                : 'border border-[var(--color-paper)] text-[var(--color-stone)] bg-[var(--color-canvas-white)] hover:border-[var(--color-mist)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Company Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-[20px] bg-[var(--color-pearl)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] px-8 py-16 text-center">
          <div className="w-12 h-12 rounded-[12px] bg-[var(--color-pearl)] flex items-center justify-center mx-auto mb-4">
            <Building2 size={20} className="text-[var(--color-pewter)]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--color-graphite)] mb-1">
            No companies found
          </h3>
          <p className="text-[14px] text-[var(--color-stone)] mb-6">
            {searchQuery
              ? "Try a different search term"
              : "No companies have been added for your campus yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => {
            const skills = parseSkills(company.topSkillsRequired);
            const isOwner = user?.id === company.addedBy;
            return (
              <a
                key={company.id}
                href={`/placement/${company.id}`}
                className="group block rounded-[20px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] p-6 hover:border-[var(--color-ember-orange)] transition-colors relative"
              >
                {/* Action buttons */}
                <div className="absolute bottom-6 right-6 flex gap-1 z-10">
                  {isOwner && (
                    <button
                      title="Delete your company"
                      onClick={(e) => handleDelete(company.id, e)}
                      className="p-1.5 bg-[var(--color-canvas-white)] border border-[var(--color-paper)] text-[var(--color-ember-orange)] rounded-full hover:bg-[var(--color-pearl)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    title="Report incorrect or fake information"
                    onClick={(e) => handleReport(company.id, e)}
                    className="p-1.5 bg-[var(--color-canvas-white)] border border-[var(--color-paper)] text-[var(--color-stone)] rounded-full hover:bg-[var(--color-pearl)] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Flag size={13} />
                  </button>
                </div>

                {/* Top row: name + arrow */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-[16px] font-semibold text-[var(--color-graphite)] truncate pr-4">{company.name}</h3>
                  <ArrowRight size={14} className="text-[var(--color-pewter)] shrink-0 mt-0.5 group-hover:text-[var(--color-ember-orange)] transition-colors" />
                </div>

                {/* Category badge — ONE neutral style for ALL categories */}
                <span className="inline-block text-[11px] font-semibold text-[var(--color-stone)] border border-[var(--color-paper)] rounded-[20px] px-2.5 py-0.5 bg-[var(--color-pearl)] mb-4">
                  {company.domain}
                </span>

                {/* Package */}
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={13} className="text-[var(--color-pewter)]" />
                  <span className="text-[15px] font-semibold text-[var(--color-graphite)]">{formatPackage(company.packageMin, company.packageMax)}</span>
                </div>

                {/* Meta */}
                <p className="text-[12px] text-[var(--color-pewter)] mb-4">
                  {company.interviewRounds ? `${company.interviewRounds} rounds` : ''}{company.lastVisitedYear ? ` · Last: ${company.lastVisitedYear}` : ''}
                </p>

                {/* Skill tags */}
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] text-[var(--color-stone)] border border-[var(--color-paper)] rounded-[20px] px-2.5 py-0.5 bg-[var(--color-pearl)]"
                    >
                      {skill}
                    </span>
                  ))}
                  {skills.length > 4 && (
                    <span className="text-[11px] text-[var(--color-pewter)] border border-[var(--color-paper)] rounded-[20px] px-2.5 py-0.5">
                      +{skills.length - 4}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <AddCompanyModal 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            toast.success("Company added successfully!");
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
}

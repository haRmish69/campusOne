"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp,
  ThumbsUp, CheckCircle2, XCircle, Clock,
  Plus, Trash2, ExternalLink, Tag, X,
  Users, Star
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

type Company = {
  id: string; name: string; domain: string; packageMin: number | null;
  packageMax: number | null; interviewRounds: number | null;
  roundDescriptions: string[] | null; topSkillsRequired: string[];
  campusVisitCount: number; lastVisitedYear: number | null;
  description: string | null; websiteUrl: string | null;
  addedBy: string | null;
  recentExperiences: any[]; topQuestions: any[];
  stats: { totalExperiences: number; selectionRate: number; avgPackage: number | null };
};

type SkillGap = {
  gaps: { skill: string; status: string; priority: number }[];
  peerMatchIds: string[];
};

const OUTCOME_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  selected: { label: "Selected", color: "text-[#16A34A] bg-[#F0FDF4]", icon: CheckCircle2 },
  rejected_r1: { label: "Rejected R1", color: "text-[#DC2626] bg-[#FEF2F2]", icon: XCircle },
  rejected_r2: { label: "Rejected R2", color: "text-[#DC2626] bg-[#FEF2F2]", icon: XCircle },
  rejected_hr: { label: "Rejected HR", color: "text-[#DC2626] bg-[#FEF2F2]", icon: XCircle },
  offer_declined: { label: "Declined", color: "text-[#D97706] bg-[#FFFBEB]", icon: Clock },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-[#F3F4F6] text-[#374151]",
  medium: "bg-[#F3F4F6] text-[#111827]",
  hard: "bg-[#F3F4F6] text-[#111827]",
};

const ROUND_LABELS: Record<string, string> = {
  oa: "Online Assessment",
  technical: "Technical",
  hr: "HR",
  managerial: "Managerial",
  case_study: "Case Study",
};

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { user } = useUser();
  const { companyId } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchCompany();
    fetchSkillGap();
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setCompany(data);
    } catch {
      toast.error("Company not found");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSkillGap = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/skill-gap`);
      if (res.ok) {
        const data = await res.json();
        setSkillGap(data);
      }
    } catch {
      // Ignore
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1000px] mx-auto space-y-4">
        <div className="h-4 w-48 bg-[#E5E7EB] animate-pulse rounded" />
        <div className="h-48 bg-[#E5E7EB] animate-pulse rounded-[12px]" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-[#6B7280]">
        Company not found
      </div>
    );
  }

  const skills = Array.isArray(company.topSkillsRequired) ? company.topSkillsRequired : [];
  const coveredCount = skillGap?.gaps.filter(g => g.status === 'strong').length || 0;
  const totalSkills = skillGap?.gaps.length || (skills.length > 0 ? skills.length : 4);
  const progressPercent = totalSkills > 0 ? (coveredCount / totalSkills) : 0;
  const ringRadius = 44;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressOffset = ringCircumference * (1 - progressPercent);

  // Fallback gaps if none in db, mapped to topSkills
  let displayGaps = skillGap?.gaps || [];
  if (displayGaps.length === 0 && skills.length > 0) {
    displayGaps = skills.map(s => ({ skill: s, status: 'missing', priority: 1 }));
  }

  return (
    <div className="bg-[#F7F7F5] min-h-screen p-4 md:p-8" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[1000px] mx-auto">
        
        {/* 0 - Back link */}
        <button
          onClick={() => router.push("/placement")}
          className="flex items-center text-[#6B7280] hover:text-[#111827] transition-colors"
          style={{ fontSize: "14px", fontWeight: 400, marginBottom: "20px" }}
        >
          <ArrowLeft className="w-4 h-4 mr-[6px]" />
          Back to Placement Hub
        </button>

        {/* 1 - Hero Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]" style={{ marginBottom: "16px" }}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Left */}
            <div className="flex gap-3">
              <div className="w-[40px] h-[40px] rounded-[8px] bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <span className="text-[18px] text-[#6B7280] font-normal">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col justify-center gap-[8px]">
                <h1 className="text-[#111827] text-[28px] font-[600] leading-none m-0 pt-[6px]">
                  {company.name}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="bg-[#F3F4F6] text-[#374151] rounded-[6px] px-[8px] py-[2px] text-[12px] font-[400]">
                    {company.domain.toUpperCase()}
                  </span>
                  {(company.packageMin || company.packageMax) && (
                    <span className="text-[#6B7280] text-[13px] font-[400]">
                      ₹{company.packageMin || "?"}–{company.packageMax || "?"} LPA
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="w-[6px] h-[6px] rounded-full bg-[#16A34A]" />
                  <span className="text-[#16A34A] text-[13px] font-[500]">
                    Upcoming Drive
                  </span>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col items-end pt-[6px]">
              <div className="flex items-center h-[48px]">
                <div className="px-[24px] text-right">
                  <div className="text-[#111827] text-[24px] font-[600] leading-none">{company.stats.totalExperiences}</div>
                  <div className="text-[#9CA3AF] text-[10px] font-[500] uppercase tracking-[0.06em] mt-[4px]">Experiences</div>
                </div>
                <div className="w-px h-full bg-[#E5E7EB]" />
                <div className="px-[24px] text-right">
                  <div className="text-[#111827] text-[24px] font-[600] leading-none">{company.stats.selectionRate}%</div>
                  <div className="text-[#9CA3AF] text-[10px] font-[500] uppercase tracking-[0.06em] mt-[4px]">Selection Rate</div>
                </div>
                {company.interviewRounds !== null && (
                  <>
                    <div className="w-px h-full bg-[#E5E7EB]" />
                    <div className="pl-[24px] text-right">
                      <div className="text-[#111827] text-[24px] font-[600] leading-none">{company.interviewRounds}</div>
                      <div className="text-[#9CA3AF] text-[10px] font-[500] uppercase tracking-[0.06em] mt-[4px]">Rounds</div>
                    </div>
                  </>
                )}
              </div>
              {company.interviewRounds !== null && (
                <div className="text-[#9CA3AF] text-[11px] font-[400] mt-[12px]">
                  Online Test → Technical → HR
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2 - Readiness Card */}
        {displayGaps.length > 0 && (
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]" style={{ marginBottom: "16px" }}>
            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: "20px" }}>
              <h2 className="text-[#111827] text-[14px] font-[600] m-0">Skill Readiness</h2>
              <button onClick={() => router.push(`/peer-learning?from=placement&companyId=${companyId}`)} className="text-[#E8470A] text-[13px] font-[500] hover:underline bg-transparent border-none p-0 cursor-pointer">
                Find peers who can help with all gaps →
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-row gap-[32px]">
              {/* Left Column */}
              <div className="w-[120px] shrink-0 flex flex-col items-center">
                <div className="relative w-[96px] h-[96px]">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r={ringRadius} fill="none" stroke="#F3F4F6" strokeWidth="8" />
                    <circle 
                      cx="48" cy="48" r={ringRadius} fill="none" stroke="#E8470A" strokeWidth="8"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={progressOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#111827] text-[20px] font-[600]">
                      {coveredCount}/{totalSkills}
                    </span>
                  </div>
                </div>
                <div className="text-[#9CA3AF] text-[10px] font-[400] uppercase tracking-[0.08em] mt-[8px]">
                  Readiness
                </div>
              </div>

              {/* Right Column */}
              <div className="flex-1">
                {displayGaps.slice(0, 4).map((g, i) => {
                  const isCovered = g.status === 'strong';
                  const isWeak = g.status === 'weak';
                  const isMissing = g.status === 'missing' || !isCovered && !isWeak;

                  const badgeBg = isCovered ? "#F0FDF4" : isWeak ? "#FFFBEB" : "#FEF2F2";
                  const badgeText = isCovered ? "#16A34A" : isWeak ? "#D97706" : "#DC2626";
                  const statusLabel = isCovered ? "Covered" : isWeak ? "Weak" : "Missing";
                  const actionLabel = isCovered ? "Review →" : isMissing ? "Find peers →" : "Start prep →";

                  return (
                    <div key={i} className="flex justify-between items-center py-[12px] border-b border-[#E5E7EB] last:border-b-0">
                      <div className="text-[#111827] text-[14px] font-[500]">{g.skill}</div>
                      <div className="flex items-center justify-end text-right">
                        <span className="rounded-[4px] px-[8px] py-[2px] text-[12px] font-[500]" style={{ backgroundColor: badgeBg, color: badgeText }}>
                          {statusLabel}
                        </span>
                        <button onClick={() => router.push(`/peer-learning?topic=${g.skill}&from=placement&companyId=${companyId}`)} className="text-[#E8470A] text-[12px] font-[500] ml-[12px] hover:underline bg-transparent border-none p-0 cursor-pointer">
                          {actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3 - Tab Bar */}
        <div className="w-full border-b border-[#E5E7EB] mt-[4px]" style={{ marginBottom: "16px" }}>
          <div className="flex">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-[10px] mr-[28px] text-[14px] bg-transparent cursor-pointer ${
                activeTab === "overview"
                  ? "border-b-[2px] border-[#E8470A] text-[#111827] font-[500]"
                  : "border-b-[2px] border-transparent text-[#9CA3AF] font-[400] hover:text-[#111827]"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("experiences")}
              className={`pb-[10px] mr-[28px] text-[14px] bg-transparent cursor-pointer flex items-center ${
                activeTab === "experiences"
                  ? "border-b-[2px] border-[#E8470A] text-[#111827] font-[500]"
                  : "border-b-[2px] border-transparent text-[#9CA3AF] font-[400] hover:text-[#111827]"
              }`}
            >
              Experiences
              <span className="bg-[#F3F4F6] text-[#6B7280] rounded-[10px] px-[7px] py-[1px] text-[11px] font-[400] ml-[6px]">
                {company.stats.totalExperiences}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`pb-[10px] text-[14px] bg-transparent cursor-pointer flex items-center ${
                activeTab === "questions"
                  ? "border-b-[2px] border-[#E8470A] text-[#111827] font-[500]"
                  : "border-b-[2px] border-transparent text-[#9CA3AF] font-[400] hover:text-[#111827]"
              }`}
            >
              Questions
              <span className="bg-[#F3F4F6] text-[#6B7280] rounded-[10px] px-[7px] py-[1px] text-[11px] font-[400] ml-[6px]">
                {company.topQuestions.length}
              </span>
            </button>
          </div>
        </div>

        {/* 4 - Prep Roadmap Card / Tab Contents */}
        <div>
          {activeTab === "overview" && (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <h2 className="text-[#111827] text-[14px] font-[600] m-0 mb-[16px]">Preparation Roadmap</h2>
              {displayGaps.length > 0 ? (
                <div>
                  {displayGaps.map((g, i) => {
                    const isCovered = g.status === 'strong';
                    const isWeak = g.status === 'weak';
                    const isMissing = g.status === 'missing' || !isCovered && !isWeak;

                    const borderColor = isCovered ? "#16A34A" : isWeak ? "#D97706" : "#DC2626";
                    const badgeBg = isCovered ? "#F0FDF4" : isWeak ? "#FFFBEB" : "#FEF2F2";
                    const badgeText = isCovered ? "#16A34A" : isWeak ? "#D97706" : "#DC2626";
                    const statusLabel = isCovered ? "Covered" : isWeak ? "Weak" : "Missing";
                    const timeLabel = isCovered ? "Ready" : isWeak ? "~1 week" : "~3 weeks";
                    const ctaLabel = isCovered ? "Review" : isWeak ? "View plan" : "Start prep";

                    return (
                      <div key={i} className="flex justify-between items-center py-[14px] border-b border-[#F3F4F6] last:border-b-0" style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "16px", marginLeft: "-24px", paddingRight: "24px" }}>
                        <div className="flex items-center">
                          <span className="text-[#9CA3AF] text-[13px] font-[400] w-[20px]">{i + 1}.</span>
                          <span className="text-[#111827] text-[14px] font-[500] ml-[12px] mr-[16px] w-[140px] truncate">{g.skill}</span>
                          <span className="rounded-[4px] px-[8px] py-[2px] text-[12px] font-[500]" style={{ backgroundColor: badgeBg, color: badgeText }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-[#9CA3AF] text-[12px] font-[400] mr-[12px] w-[60px] text-right">{timeLabel}</span>
                          <button onClick={() => router.push(`/peer-learning?topic=${g.skill}&from=placement&companyId=${companyId}`)} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] px-[14px] py-[5px] text-[#374151] text-[13px] font-[400] cursor-pointer hover:bg-[#F9FAFB] transition-colors">
                            {ctaLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[#6B7280] text-[14px]">No roadmap data available.</div>
              )}
            </div>
          )}

          {activeTab === "experiences" && (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <h2 className="text-[#111827] text-[14px] font-[600] m-0 mb-[16px]">Interview Experiences</h2>
              {/* Simplified experiences state for brevity and fidelity to redesign focus */}
              <div className="text-[#6B7280] text-[14px]">
                 {company.recentExperiences.length > 0 ? `${company.recentExperiences.length} experiences loaded.` : 'No experiences shared yet.'}
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <h2 className="text-[#111827] text-[14px] font-[600] m-0 mb-[16px]">Top Questions</h2>
              <div className="text-[#6B7280] text-[14px]">
                 {company.topQuestions.length > 0 ? `${company.topQuestions.length} questions loaded.` : 'No questions shared yet.'}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

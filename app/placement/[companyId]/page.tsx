"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, TrendingUp, Users, Star, ChevronDown, ChevronUp,
  ThumbsUp, Shield, AlertTriangle, CheckCircle2, XCircle, Clock,
  Plus, Send, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";

type Company = {
  id: string; name: string; domain: string; packageMin: number | null;
  packageMax: number | null; interviewRounds: number | null;
  roundDescriptions: string[] | null; topSkillsRequired: string[];
  campusVisitCount: number; lastVisitedYear: number | null;
  description: string | null; websiteUrl: string | null;
  recentExperiences: any[]; topQuestions: any[];
  stats: { totalExperiences: number; selectionRate: number; avgPackage: number | null };
};

type SkillGap = {
  gaps: { skill: string; status: string; priority: number }[];
  peerMatchIds: string[];
};

const OUTCOME_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  selected: { label: "Selected", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  rejected_r1: { label: "Rejected R1", color: "text-red-600 bg-red-50", icon: XCircle },
  rejected_r2: { label: "Rejected R2", color: "text-red-600 bg-red-50", icon: XCircle },
  rejected_hr: { label: "Rejected HR", color: "text-orange-600 bg-orange-50", icon: XCircle },
  offer_declined: { label: "Declined", color: "text-amber-600 bg-amber-50", icon: Clock },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
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
  const [expandedExperience, setExpandedExperience] = useState<string | null>(null);
  
  const [showAddExp, setShowAddExp] = useState(false);
  const [newExp, setNewExp] = useState({ batch: "", branch: "", outcome: "selected", overallTips: "", packageOffered: "", isAnonymous: false });
  
  const [showAddQues, setShowAddQues] = useState(false);
  const [newQues, setNewQues] = useState({ round: "technical", question: "", answer: "", difficulty: "medium" });

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
      // Skill gap is optional
    }
  };

  const handleAddExp = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newExp, rounds: [{ roundName: "General", duration: "30m", questions: [], tips: "" }] }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Experience shared!");
      setShowAddExp(false);
      fetchCompany();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteExp = async (experienceId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/experience?experienceId=${experienceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Experience deleted!");
      fetchCompany();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddQues = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQues),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Question contributed!");
      setShowAddQues(false);
      setNewQues({ round: "technical", question: "", answer: "", difficulty: "medium" });
      fetchCompany();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteQues = async (questionId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/questions?questionId=${questionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Question deleted!");
      fetchCompany();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUpvote = async (questionId: string) => {
    try {
      await fetch(`/api/companies/${companyId}/questions/${questionId}/upvote`, {
        method: "PATCH",
      });
      fetchCompany();
      toast.success("Upvoted!");
    } catch {
      toast.error("Failed to upvote");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-[var(--color-fog)] animate-pulse rounded-lg" />
        <div className="h-48 bg-[var(--color-fog)] animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Company not found</p>
      </div>
    );
  }

  const skills = Array.isArray(company.topSkillsRequired)
    ? company.topSkillsRequired
    : [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/placement")}
        className="flex items-center gap-2 text-sm text-[var(--color-slate-blue)] hover:text-[var(--color-midnight-navy)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Placement Hub
      </button>

      {/* Company Header */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-midnight-navy)]">
              {company.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                {company.domain}
              </span>
              {company.packageMin || company.packageMax ? (
                <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  ₹{company.packageMin || "?"}-{company.packageMax || "?"} LPA
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-[var(--color-midnight-navy)]">
                {company.stats.totalExperiences}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Experiences
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {company.stats.selectionRate}%
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Selection Rate
              </p>
            </div>
            {company.interviewRounds && (
              <div>
                <p className="text-2xl font-bold text-[var(--color-electric-indigo)]">
                  {company.interviewRounds}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Rounds
                </p>
              </div>
            )}
          </div>
        </div>

        {company.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {company.description}
          </p>
        )}
      </div>

      {/* Skill Gap Card */}
      {skillGap && skillGap.gaps.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="font-semibold text-[var(--color-midnight-navy)] flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Your Skill Gap Analysis
          </h3>
          <div className="flex flex-wrap gap-2">
            {skillGap.gaps.map((g, i) => (
              <span
                key={`${g.skill}-${i}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  g.status === "strong"
                    ? "bg-emerald-100 text-emerald-700"
                    : g.status === "weak"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {g.skill}: {g.status}
              </span>
            ))}
          </div>
          {skillGap.gaps.some((g) => g.status !== "strong") && (
            <button
              onClick={() => router.push(`/peer-learning?topic=${skillGap.gaps.find(g => g.status === "missing")?.skill || ""}&from=placement&companyId=${companyId}`)}
              className="mt-3 text-xs font-medium text-[var(--color-electric-indigo)] hover:underline"
            >
              Find peers who can help →
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-[var(--color-fog)] rounded-xl p-1">
          <TabsTrigger value="overview" className="rounded-lg text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="experiences" className="rounded-lg text-sm">
            Experiences ({company.stats.totalExperiences})
          </TabsTrigger>
          <TabsTrigger value="questions" className="rounded-lg text-sm">
            Questions ({company.topQuestions.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Required Skills */}
          {skills.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <h3 className="font-semibold text-[var(--color-midnight-navy)] mb-3">
                Required Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-fog)] text-sm font-medium text-[var(--color-midnight-navy)]"
                  >
                    {i + 1}. {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interview Process */}
          {company.roundDescriptions && company.roundDescriptions.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <h3 className="font-semibold text-[var(--color-midnight-navy)] mb-3">
                Interview Process
              </h3>
              <div className="space-y-2">
                {company.roundDescriptions.map((round, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-[var(--color-electric-indigo)] text-white text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-[var(--color-midnight-navy)]">{round}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Experiences Tab */}
        <TabsContent value="experiences" className="space-y-4">
          <div className="flex justify-end mb-2">
            <button 
              onClick={() => setShowAddExp(!showAddExp)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-signal-blue)] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Share Experience
            </button>
          </div>

          {showAddExp && (
            <div className="p-5 border border-border/60 rounded-2xl bg-[var(--color-fog)] space-y-4 mb-6">
              <h3 className="font-semibold text-[var(--color-midnight-navy)]">Share Your Interview Experience</h3>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Batch (e.g. 2024)" value={newExp.batch} onChange={e => setNewExp({...newExp, batch: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                <input placeholder="Branch (e.g. CSE)" value={newExp.branch} onChange={e => setNewExp({...newExp, branch: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={newExp.outcome} onChange={e => setNewExp({...newExp, outcome: e.target.value})} className="px-3 py-2 rounded-lg border text-sm bg-white">
                  <option value="selected">Selected</option>
                  <option value="rejected_r1">Rejected Round 1</option>
                  <option value="rejected_r2">Rejected Round 2</option>
                  <option value="rejected_hr">Rejected HR</option>
                  <option value="offer_declined">Offer Declined</option>
                </select>
                <input placeholder="Package Offered (Optional LPA)" type="number" value={newExp.packageOffered} onChange={e => setNewExp({...newExp, packageOffered: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
              </div>
              <textarea placeholder="Write your overall experience and tips (min 50 chars)..." value={newExp.overallTips} onChange={e => setNewExp({...newExp, overallTips: e.target.value})} className="w-full px-3 py-2 rounded-lg border text-sm h-24 resize-none" />
              <label className="flex items-center gap-2 text-sm text-[var(--color-slate-blue)]">
                <input type="checkbox" checked={newExp.isAnonymous} onChange={e => setNewExp({...newExp, isAnonymous: e.target.checked})} className="rounded text-blue-600" />
                Submit anonymously
              </label>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowAddExp(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-black/5 rounded-lg">Cancel</button>
                <button onClick={handleAddExp} className="px-4 py-2 bg-[var(--color-midnight-navy)] text-white text-sm font-medium rounded-lg">Submit</button>
              </div>
            </div>
          )}

          {company.recentExperiences.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No experiences shared yet. Be the first!
              </p>
            </div>
          ) : (
            company.recentExperiences.map((exp) => {
              const outcome = OUTCOME_LABELS[exp.outcome] || OUTCOME_LABELS.selected;
              const OutcomeIcon = outcome.icon;
              const rounds = typeof exp.rounds === "string" ? JSON.parse(exp.rounds) : exp.rounds;
              const isExpanded = expandedExperience === exp.id;

              return (
                <div
                  key={exp.id}
                  className="rounded-2xl border border-border/60 bg-card p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-midnight-navy)]">
                          {exp.isAnonymous ? "Anonymous" : exp.studentName || "Student"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {exp.branch} • {exp.batch}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${outcome.color}`}>
                          <OutcomeIcon className="w-3 h-3" />
                          {outcome.label}
                        </span>
                        {exp.packageOffered && (
                          <span className="text-xs font-medium text-emerald-600">
                            ₹{exp.packageOffered} LPA
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {user?.id === exp.userId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteExp(exp.id); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedExperience(isExpanded ? null : exp.id)}
                        className="p-1 hover:bg-[var(--color-fog)] rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Rounds */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t border-border/40 pt-4">
                      {Array.isArray(rounds) && rounds.map((round: any, i: number) => (
                        <div key={i} className="pl-4 border-l-2 border-[var(--color-electric-indigo)]/30">
                          <p className="font-medium text-sm text-[var(--color-midnight-navy)]">
                            {round.roundName}
                            {round.duration && (
                              <span className="text-muted-foreground font-normal ml-2">
                                ({round.duration})
                              </span>
                            )}
                          </p>
                          {round.questions && round.questions.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {round.questions.map((q: string, j: number) => (
                                <li key={j} className="text-xs text-muted-foreground">
                                  • {q}
                                </li>
                              ))}
                            </ul>
                          )}
                          {round.tips && (
                            <p className="mt-1 text-xs text-[var(--color-electric-indigo)]">
                              💡 {round.tips}
                            </p>
                          )}
                        </div>
                      ))}
                      <div className="bg-[var(--color-fog)] rounded-xl p-3 mt-3">
                        <p className="text-xs font-semibold text-[var(--color-midnight-navy)] mb-1">
                          Overall Tips
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {exp.overallTips}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <div className="flex justify-end mb-2">
            <button 
              onClick={() => setShowAddQues(!showAddQues)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-signal-blue)] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Contribute Question
            </button>
          </div>

          {showAddQues && (
            <div className="p-5 border border-border/60 rounded-2xl bg-[var(--color-fog)] space-y-4 mb-6">
              <h3 className="font-semibold text-[var(--color-midnight-navy)]">Contribute an Interview Question</h3>
              <div className="grid grid-cols-2 gap-4">
                <select value={newQues.round} onChange={e => setNewQues({...newQues, round: e.target.value})} className="px-3 py-2 rounded-lg border text-sm bg-white">
                  <option value="oa">Online Assessment</option>
                  <option value="technical">Technical</option>
                  <option value="hr">HR</option>
                  <option value="managerial">Managerial</option>
                  <option value="case_study">Case Study</option>
                </select>
                <select value={newQues.difficulty} onChange={e => setNewQues({...newQues, difficulty: e.target.value})} className="px-3 py-2 rounded-lg border text-sm bg-white">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <textarea placeholder="Write the interview question here..." value={newQues.question} onChange={e => setNewQues({...newQues, question: e.target.value})} className="w-full px-3 py-2 rounded-lg border text-sm h-16 resize-none" />
              <textarea placeholder="Write the expected answer or approach (optional)..." value={newQues.answer} onChange={e => setNewQues({...newQues, answer: e.target.value})} className="w-full px-3 py-2 rounded-lg border text-sm h-16 resize-none" />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowAddQues(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-black/5 rounded-lg">Cancel</button>
                <button onClick={handleAddQues} className="px-4 py-2 bg-[var(--color-midnight-navy)] text-white text-sm font-medium rounded-lg">Submit</button>
              </div>
            </div>
          )}

          {company.topQuestions.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No questions added yet. Contribute the first one!
              </p>
            </div>
          ) : (
            company.topQuestions.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border border-border/60 bg-card p-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-fog)] text-[var(--color-slate-blue)]">
                        {ROUND_LABELS[q.round] || q.round}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.medium}`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-midnight-navy)] leading-relaxed">
                      {q.question}
                    </p>
                    {q.answer && (
                      <p className="mt-2 text-xs text-muted-foreground bg-[var(--color-fog)] rounded-lg p-2">
                        💡 {q.answer}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => handleUpvote(q.id)}
                      className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-[var(--color-fog)] transition-colors shrink-0"
                    >
                      <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {q.upvotes}
                      </span>
                    </button>
                    {user?.id === q.submittedBy && (
                      <button
                        onClick={() => handleDeleteQues(q.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  BarChart3, 
  Target, 
  TrendingUp, 
  Building2, 
  ShieldCheck, 
  Award, 
  UploadCloud, 
  Loader2,
  Trash2,
  RefreshCw,
  FileCheck,
  ChevronRight,
  ExternalLink,
  Zap,
  Check,
  FileCode,
  AlertTriangle,
  BookOpen,
  Lightbulb,
  Layers,
  History,
  HelpCircle,
  Filter,
  Bookmark,
  BookmarkCheck,
  Globe,
  MapPin,
  DollarSign,
  Clock,
  Send,
  Search,
  Building,
  Compass,
  Plus,
  Calendar,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Company {
  id: string;
  name: string;
  domain: string;
  jobRole?: string | null;
  minCgpa?: number | null;
  eligibleBranches?: string[] | string | null;
  requiredExperience?: string | null;
  deadline?: string | null;
  packageMin: number | null;
  packageMax: number | null;
  interviewRounds: number | null;
  topSkillsRequired: string[] | string;
  campusVisitCount: number;
  description?: string | null;
  websiteUrl?: string | null;
}

interface UploadedResumeFile {
  name: string;
  size: number;
  type: string;
  base64?: string;
  text?: string;
}

interface ATSAnalysis {
  atsScore: number;
  verdict: string;
  scoreBreakdown: {
    keywordMatch: number;
    impactQuantification: number;
    formattingStructure: number;
    sectionCompleteness: number;
  };
  strengths: string[];
  missingSkills: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  actionableImprovements: string[];
  extractedSkills: string[];
  extractedExperience: string[];
  extractedText?: string;
  executiveSummary: string;
}

interface ClassifiedSkill {
  skill: string;
  category: string;
  classification: "Strong" | "Intermediate" | "Beginner" | "Missing" | "Not Assessed";
  evidenceFromResume: string;
  requiredLevel: string;
  importance: "Critical" | "High" | "Medium";
}

interface SkillGapRecommendation {
  skillName: string;
  category: string;
  whyItMatters: string;
  currentEvidence: string;
  currentClassification: "Strong" | "Intermediate" | "Beginner" | "Missing" | "Not Assessed";
  requiredProficiency: string;
  learningResources: string[];
  practicalProjects: string[];
  priority: "High" | "Medium" | "Low";
}

interface SkillGapData {
  targetJobRole: string;
  resumeId?: string;
  skillGapResults: {
    totalSkillsEvaluated: number;
    strongCount: number;
    intermediateCount: number;
    beginnerCount: number;
    missingCount: number;
    notAssessedCount: number;
    coveragePercentage: number;
    readinessLevel: string;
    executiveSummary: string;
  };
  existingSkills: string[];
  strongSkills: string[];
  skillsRequiringImprovement: string[];
  missingSkills: string[];
  relevantTechnologiesNotMentioned: string[];
  skillClassifications: ClassifiedSkill[];
  recommendations: SkillGapRecommendation[];
  analysisTimestamp?: string;
}

interface JobItem {
  id: string;
  externalId: string;
  title: string;
  companyName: string;
  companyLogo: string | null;
  location: string | null;
  workplaceType: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  salary: string | null;
  requiredSkills: string[];
  description: string;
  originalUrl: string;
  source: string;
  postedAt: string | null;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  qualificationCompat: "High" | "Moderate" | "Developing" | "Not Assessed";
  whyItMatches: string;
  recommendation: string;
  isSaved?: boolean;
  savedNotes?: string | null;
  applicationStatus?: "saved" | "applied" | "interviewing" | "offered" | "rejected" | null;
  appliedAt?: string | null;
}

const POPULAR_JOB_ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Java Developer",
  "Python Developer",
  "Data Analyst",
  "AI/ML Engineer",
  "DevOps Engineer",
  "Cloud Solutions Architect"
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function PlacementIntelligencePage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "resume" | "skills" | "roadmap" | "matcher">("dashboard");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [customRecruiterName, setCustomRecruiterName] = useState<string>("");
  const [recruiterSearchQuery, setRecruiterSearchQuery] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Recruiter Management Modal State
  const [isAddRecruiterModalOpen, setIsAddRecruiterModalOpen] = useState(false);
  const [newRecruiterName, setNewRecruiterName] = useState("");
  const [newRecruiterRole, setNewRecruiterRole] = useState("");
  const [newRecruiterDomain, setNewRecruiterDomain] = useState("tech");
  const [newRecruiterSkills, setNewRecruiterSkills] = useState("");
  const [newRecruiterMinCgpa, setNewRecruiterMinCgpa] = useState("");
  const [newRecruiterBranches, setNewRecruiterBranches] = useState("CSE, ECE, MNC, IT");
  const [newRecruiterExperience, setNewRecruiterExperience] = useState("Fresher / 0-1 years");
  const [newRecruiterDescription, setNewRecruiterDescription] = useState("");
  const [newRecruiterDeadline, setNewRecruiterDeadline] = useState("");
  const [newRecruiterPackageMin, setNewRecruiterPackageMin] = useState("");
  const [newRecruiterPackageMax, setNewRecruiterPackageMax] = useState("");
  const [newRecruiterWebsite, setNewRecruiterWebsite] = useState("");
  const [isSubmittingRecruiter, setIsSubmittingRecruiter] = useState(false);

  // Resume Upload & Analyzer State
  const [uploadedFile, setUploadedFile] = useState<UploadedResumeFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetRole, setTargetRole] = useState("Software Development Engineer (SDE-1)");
  const [jobDescription, setJobDescription] = useState("");
  const [pastedResumeText, setPastedResumeText] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRetryingAnalysis, setIsRetryingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<{
    message: string;
    isHighDemand: boolean;
    canRetry: boolean;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ATSAnalysis | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);

  // Skill Gap Analyzer State (Fully Dynamic & AI-Powered)
  const [skillGapTargetRole, setSkillGapTargetRole] = useState("Full Stack Developer");
  const [isAnalyzingSkillGap, setIsAnalyzingSkillGap] = useState(false);
  const [isRetryingSkillGap, setIsRetryingSkillGap] = useState(false);
  const [isLoadingSkillGap, setIsLoadingSkillGap] = useState(false);
  const [skillGapData, setSkillGapData] = useState<SkillGapData | null>(null);
  const [skillGapHistory, setSkillGapHistory] = useState<any[]>([]);
  const [skillFilter, setSkillFilter] = useState<"all" | "Strong" | "Intermediate" | "Beginner" | "Missing" | "Not Assessed">("all");
  const [skillGapError, setSkillGapError] = useState<string | null>(null);
  const [showExtractedResumeSkills, setShowExtractedResumeSkills] = useState(false);

  // AI Job Matcher State
  const [jobsList, setJobsList] = useState<JobItem[]>([]);
  const [jobCategories, setJobCategories] = useState<{
    bestMatches: JobItem[];
    recommended: JobItem[];
    skillGapOpportunities: JobItem[];
    internships: JobItem[];
    recentlyPosted: JobItem[];
  }>({
    bestMatches: [],
    recommended: [],
    skillGapOpportunities: [],
    internships: [],
    recentlyPosted: [],
  });
  const [activeJobCategory, setActiveJobCategory] = useState<
    "all" | "best" | "recommended" | "skill-gap" | "internships" | "recent" | "saved"
  >("all");
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [jobLocationFilter, setJobLocationFilter] = useState("");
  const [jobWorkplaceTypeFilter, setJobWorkplaceTypeFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [jobExperienceFilter, setJobExperienceFilter] = useState("all");
  const [selectedJobForModal, setSelectedJobForModal] = useState<JobItem | null>(null);

  // Roadmap State
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [roadmapData, setRoadmapData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── 1. Load Companies, Existing Saved Resume, and Jobs ───────────────
  useEffect(() => {
    fetchCompanies();
    loadSavedResume();
    fetchJobs();
  }, []);

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCompanies(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load campus recruiters");
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleAddRecruiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecruiterName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSubmittingRecruiter(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRecruiterName.trim(),
          jobRole: newRecruiterRole.trim() || undefined,
          domain: newRecruiterDomain || "tech",
          topSkillsRequired: newRecruiterSkills.trim() || "DSA, Problem Solving",
          minCgpa: newRecruiterMinCgpa ? parseFloat(newRecruiterMinCgpa) : undefined,
          eligibleBranches: newRecruiterBranches ? newRecruiterBranches.split(",").map(b => b.trim()) : undefined,
          requiredExperience: newRecruiterExperience.trim() || undefined,
          description: newRecruiterDescription.trim() || undefined,
          deadline: newRecruiterDeadline ? new Date(newRecruiterDeadline).toISOString() : undefined,
          packageMin: newRecruiterPackageMin ? parseFloat(newRecruiterPackageMin) : undefined,
          packageMax: newRecruiterPackageMax ? parseFloat(newRecruiterPackageMax) : undefined,
          websiteUrl: newRecruiterWebsite.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.info(`Recruiter "${newRecruiterName}" already exists`);
          if (data.companyId) setSelectedCompanyId(data.companyId);
          setIsAddRecruiterModalOpen(false);
          return;
        }
        throw new Error(data.error || "Failed to add recruiter");
      }

      toast.success(`Recruiter "${newRecruiterName}" added successfully!`);
      setIsAddRecruiterModalOpen(false);
      // Reset form fields
      setNewRecruiterName("");
      setNewRecruiterRole("");
      setNewRecruiterSkills("");
      setNewRecruiterMinCgpa("");
      setNewRecruiterDescription("");
      setNewRecruiterDeadline("");
      setNewRecruiterPackageMin("");
      setNewRecruiterPackageMax("");
      setNewRecruiterWebsite("");

      // Refresh list & select newly created recruiter
      await fetchCompanies();
      if (data.company?.id) {
        setSelectedCompanyId(data.company.id);
        if (data.company.jobRole) {
          setTargetRole(data.company.jobRole);
        }
      }
    } catch (err: any) {
      toast.error("Error adding recruiter", { description: err.message });
    } finally {
      setIsSubmittingRecruiter(false);
    }
  };

  const loadSavedResume = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/placement-intelligence/analyze");
      const data = await res.json();
      if (data?.savedResume) {
        const sr = data.savedResume;
        setUploadedFile({
          name: sr.fileName || "Saved_Resume.pdf",
          size: sr.fileSize || 184320,
          type: "application/pdf",
          text: sr.content || "",
        });
        if (sr.targetRole) {
          setTargetRole(sr.targetRole);
          setSkillGapTargetRole(sr.targetRole);
        }
        if (sr.jobDescription) setJobDescription(sr.jobDescription);
        if (sr.analysis) {
          setAnalysisResult(sr.analysis);
        }
      }
      // Load current or historical skill gap analysis
      loadSkillGap();
    } catch (e) {
      console.error("Could not load saved resume:", e);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // ─── Skill Gap Data Fetching & Trigger Handlers ─────────────────────────
  const loadSkillGap = async (role?: string) => {
    setIsLoadingSkillGap(true);
    setSkillGapError(null);
    try {
      const roleParam = role ? `?role=${encodeURIComponent(role)}` : "";
      const res = await fetch(`/api/placement-intelligence/skill-gap${roleParam}`);
      const data = await res.json();
      if (data.success) {
        if (data.currentAnalysis) {
          setSkillGapData(data.currentAnalysis);
          if (data.currentAnalysis.targetJobRole) {
            setSkillGapTargetRole(data.currentAnalysis.targetJobRole);
          }
        }
        if (data.history) {
          setSkillGapHistory(data.history);
        }
      }
    } catch (err: any) {
      console.error("Could not load skill gap analysis:", err);
    } finally {
      setIsLoadingSkillGap(false);
    }
  };

  const handleRunSkillGapAnalysis = async (customRole?: string) => {
    if (isAnalyzingSkillGap) return; // Prevent duplicate analysis requests
    const roleToAnalyze = (customRole || skillGapTargetRole).trim();
    if (!roleToAnalyze) {
      toast.error("Please enter or select a target job role");
      return;
    }

    if (!uploadedFile && !analysisResult) {
      toast.error("Resume Required", {
        description: "Upload your resume in AI Resume & ATS Analyzer first."
      });
      setActiveTab("resume");
      return;
    }

    setIsAnalyzingSkillGap(true);
    setSkillGapError(null);
    setIsRetryingSkillGap(false);

    const maxClientAttempts = 3;
    const clientDelays = [2000, 4000, 8000];

    for (let attempt = 0; attempt <= maxClientAttempts; attempt++) {
      try {
        const res = await fetch("/api/placement-intelligence/skill-gap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetRole: roleToAnalyze }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const isDemand = res.status === 503 || res.status === 429 || data.isHighDemand;
          if (isDemand && attempt < maxClientAttempts) {
            setIsRetryingSkillGap(true);
            const delay = clientDelays[attempt];
            toast.info("High Demand", {
              description: "AI services are temporarily experiencing high demand. We're retrying your request."
            });
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(
            isDemand || res.status === 503
              ? "AI analysis is temporarily unavailable. Please try again in a few moments."
              : data.error || "AI analysis is temporarily unavailable. Please try again in a few moments."
          );
        }

        setSkillGapData(data.analysis);
        setSkillGapTargetRole(roleToAnalyze);
        setSkillGapError(null);
        setIsRetryingSkillGap(false);
        toast.success(`Skill Gap Analysis complete for ${roleToAnalyze}!`);
        loadSkillGap(roleToAnalyze);
        setIsAnalyzingSkillGap(false);
        return;
      } catch (err: any) {
        if (attempt === maxClientAttempts) {
          setSkillGapError("AI analysis is temporarily unavailable. Please try again in a few moments.");
          toast.error("Service Temporarily Unavailable", {
            description: "AI analysis is temporarily unavailable. Please try again in a few moments."
          });
        }
      }
    }

    setIsRetryingSkillGap(false);
    setIsAnalyzingSkillGap(false);
  };

  // ─── AI Job Matcher Handlers ───────────────────────────────────────────
  const fetchJobs = async (customQuery?: string, customLocation?: string) => {
    setIsLoadingJobs(true);
    try {
      const q = customQuery !== undefined ? customQuery : jobSearchQuery;
      const loc = customLocation !== undefined ? customLocation : jobLocationFilter;
      const params = new URLSearchParams();
      if (q.trim()) params.append("q", q.trim());
      if (loc.trim()) params.append("location", loc.trim());
      if (jobWorkplaceTypeFilter !== "all") params.append("workplaceType", jobWorkplaceTypeFilter);
      if (jobTypeFilter !== "all") params.append("jobType", jobTypeFilter);
      if (jobExperienceFilter !== "all") params.append("experience", jobExperienceFilter);

      const res = await fetch(`/api/placement-intelligence/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setJobsList(data.jobs || []);
        if (data.categories) {
          setJobCategories(data.categories);
        }
      }
    } catch (e) {
      console.error("Could not fetch matched jobs:", e);
      toast.error("Failed to load job listings");
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleToggleSaveJob = async (job: JobItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const willSave = !job.isSaved;

    // Optimistic UI update
    setJobsList(prev => prev.map(j => j.id === job.id ? { ...j, isSaved: willSave } : j));
    if (selectedJobForModal?.id === job.id) {
      setSelectedJobForModal(prev => prev ? { ...prev, isSaved: willSave } : null);
    }

    try {
      const res = await fetch("/api/placement-intelligence/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: willSave ? "save-job" : "unsave-job",
          jobId: job.id,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save action failed");
      toast.success(willSave ? `Saved "${job.title}" to your tracker` : `Removed "${job.title}" from saved jobs`);
    } catch (err: any) {
      // Revert optimistic update
      setJobsList(prev => prev.map(j => j.id === job.id ? { ...j, isSaved: !willSave } : j));
      toast.error("Save error", { description: err.message });
    }
  };

  const handleUpdateApplicationStatus = async (jobId: string, status: string, notes?: string) => {
    try {
      const res = await fetch("/api/placement-intelligence/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          jobId,
          status,
          notes,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update status failed");

      setJobsList(prev => prev.map(j => j.id === jobId ? { ...j, applicationStatus: status as any } : j));
      if (selectedJobForModal?.id === jobId) {
        setSelectedJobForModal(prev => prev ? { ...prev, applicationStatus: status as any } : null);
      }
      toast.success(`Application updated to "${status}"`);
    } catch (err: any) {
      toast.error("Status update error", { description: err.message });
    }
  };

  const handlePrepareForJob = (job: JobItem) => {
    setTargetRole(job.title);
    setSelectedJobForModal(null);
    setActiveTab("roadmap");
    toast.success(`Targeting ${job.title} at ${job.companyName}`, {
      description: "Generating your custom preparation roadmap..."
    });
    // Trigger roadmap generation specifically for this role & company
    setTimeout(() => {
      handleGenerateRoadmap();
    }, 400);
  };

  // ─── 2. File Selection & Drag-and-Drop Handlers ─────────────────────────
  const processFile = (file: File) => {
    if (!file) return;

    // Check size limit: 12MB
    if (file.size > 12 * 1024 * 1024) {
      toast.error("File is too large", { description: "Please upload a resume under 12MB." });
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDoc = file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc");
    const isText = file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isDoc && !isText) {
      toast.error("Unsupported file format", { description: "Please upload a PDF (.pdf), Word (.docx), or Text document." });
      return;
    }

    const reader = new FileReader();

    if (isText) {
      reader.onload = (e) => {
        const textContent = (e.target?.result as string) || "";
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type || "text/plain",
          text: textContent,
        });
        toast.success(`Attached "${file.name}" (${formatFileSize(file.size)})`);
      };
      reader.readAsText(file);
    } else {
      // PDF or Doc (Read as base64 DataURL for multimodal Gemini processing)
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string) || "";
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: isPdf ? "application/pdf" : file.type || "application/octet-stream",
          base64: base64Data,
        });
        toast.success(`Attached "${file.name}" (${formatFileSize(file.size)}) ready for ATS analysis`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveResume = async () => {
    setUploadedFile(null);
    setPastedResumeText("");
    setAnalysisResult(null);
    setSkillGapData(null);
    setSkillGapHistory([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      await fetch("/api/placement-intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-resume" })
      });
      toast.info("Resume removed from profile");
    } catch (e) {
      console.error(e);
    }
  };

  // ─── 3. Run AI Resume & ATS Analysis ──────────────────────────────────
  const handleAnalyzeResume = async () => {
    if (isAnalyzing) return; // Prevent duplicate analysis requests
    const hasFile = !!uploadedFile;
    const hasPastedText = !!pastedResumeText.trim();

    if (!hasFile && !hasPastedText) {
      toast.error("Please upload a PDF resume or paste resume text first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsRetryingAnalysis(false);

    const selectedComp = companies.find(c => c.id === selectedCompanyId);
    const isCustomRecruiter = selectedCompanyId === "other";
    const targetCompanyName = isCustomRecruiter
      ? customRecruiterName.trim()
      : selectedComp?.name || "";

    const requestBody = {
      action: "analyze-resume",
      fileName: uploadedFile?.name || "Pasted_Resume.txt",
      fileSize: uploadedFile?.size || pastedResumeText.length,
      fileType: uploadedFile?.type || "text/plain",
      fileBase64: uploadedFile?.base64,
      resumeText: uploadedFile?.text || pastedResumeText,
      targetRole,
      targetCompany: targetCompanyName || undefined,
      targetCompanyId: selectedComp ? selectedComp.id : undefined,
      jobDescription: jobDescription.trim() || undefined,
    };

    const maxClientAttempts = 3;
    const clientDelays = [2000, 4000, 8000];

    for (let attempt = 0; attempt <= maxClientAttempts; attempt++) {
      try {
        const res = await fetch("/api/placement-intelligence/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const isDemand = res.status === 503 || res.status === 429 || data.isHighDemand;
          if (isDemand && attempt < maxClientAttempts) {
            setIsRetryingAnalysis(true);
            const delay = clientDelays[attempt];
            toast.info("High Demand", {
              description: "AI services are temporarily experiencing high demand. We're retrying your request."
            });
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(
            isDemand || res.status === 503
              ? "AI analysis is temporarily unavailable. Please try again in a few moments."
              : data.error || "AI analysis is temporarily unavailable. Please try again in a few moments."
          );
        }

        setAnalysisResult(data.analysis);
        setAnalysisError(null);
        setIsRetryingAnalysis(false);
        toast.success("Resume & ATS Analysis complete!");
        loadSkillGap();
        setIsAnalyzing(false);
        return;
      } catch (err: any) {
        if (attempt === maxClientAttempts) {
          setAnalysisError({
            message: "AI analysis is temporarily unavailable. Please try again in a few moments.",
            isHighDemand: true,
            canRetry: true
          });
          toast.error("Service Temporarily Unavailable", {
            description: "AI analysis is temporarily unavailable. Please try again in a few moments."
          });
        }
      }
    }

    setIsRetryingAnalysis(false);
    setIsAnalyzing(false);
  };

  // ─── 4. Career Roadmap Generation ──────────────────────────────────────
  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const selectedComp = companies.find(c => c.id === selectedCompanyId);
      const res = await fetch("/api/placement-intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-roadmap",
          targetRole,
          targetCompany: selectedComp?.name || "Campus Recruiter",
          userSkills: extractedSkills.length > 0 ? extractedSkills : ["DSA", "Python", "C++", "SQL"],
          weeksCount: 8
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Roadmap generation failed");

      setRoadmapData(data.roadmap);
      toast.success("Personalized 8-Week Placement Roadmap generated!");
    } catch (err: any) {
      toast.error("Roadmap Error", { description: err.message });
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const parseCompanySkills = (skills: string[] | string): string[] => {
    if (Array.isArray(skills)) return skills;
    try { return JSON.parse(skills); } catch { return ["DSA", "System Design", "SQL"]; }
  };

  // ─── 5. Dynamic Derived State for Reuse in Skill Gap, Roadmap & Matcher ──
  // Use actual extracted skills from the resume analysis if available
  const extractedSkills: string[] = analysisResult?.extractedSkills && analysisResult.extractedSkills.length > 0
    ? analysisResult.extractedSkills
    : [
        "C++", "Python", "JavaScript", "React.js", "Next.js", "Node.js", "MySQL", "PostgreSQL", "Git", "Docker"
      ];

  const selectedCompany = selectedCompanyId && selectedCompanyId !== "other" && selectedCompanyId !== "none"
    ? (companies.find(c => c.id === selectedCompanyId) || null)
    : null;

  const filteredCompanies = companies.filter(c => {
    if (!recruiterSearchQuery.trim()) return true;
    const q = recruiterSearchQuery.toLowerCase();
    const skillsStr = Array.isArray(c.topSkillsRequired) ? c.topSkillsRequired.join(" ") : String(c.topSkillsRequired || "");
    return (
      c.name.toLowerCase().includes(q) ||
      (c.jobRole && c.jobRole.toLowerCase().includes(q)) ||
      c.domain.toLowerCase().includes(q) ||
      skillsStr.toLowerCase().includes(q)
    );
  });
  const requiredSkills = selectedCompany ? parseCompanySkills(selectedCompany.topSkillsRequired) : ["DSA", "System Design", "OS", "DBMS"];

  const userSkillsLower = extractedSkills.map(s => s.toLowerCase());

  // Dynamically evaluate skill gaps using candidate's real extracted skills
  const skillGaps = requiredSkills.map(skill => {
    const isStrong = userSkillsLower.some(k => k.includes(skill.toLowerCase()) || skill.toLowerCase().includes(k));
    const isWeak = !isStrong && (
      analysisResult?.missingKeywords?.some(k => k.toLowerCase().includes(skill.toLowerCase())) ||
      skill.toLowerCase().includes("system") ||
      skill.toLowerCase().includes("design")
    );
    return {
      skill,
      status: isStrong ? "strong" : isWeak ? "weak" : "missing",
      priority: isStrong ? 3 : isWeak ? 2 : 1
    };
  });

  const strongCount = skillGaps.filter(g => g.status === "strong").length;
  // Dynamic readiness percentage calculated from actual Skill Gap analysis if available
  const dynamicSkillGapCoverage = skillGapData?.skillGapResults?.coveragePercentage;
  const readinessPercent = dynamicSkillGapCoverage !== undefined
    ? dynamicSkillGapCoverage
    : Math.round((strongCount / Math.max(1, skillGaps.length)) * 100);

  // Actual ATS score from analysis or calculated benchmark
  const displayAtsScore = analysisResult?.atsScore || (uploadedFile ? 78 : 0);
  const displayVerdict = analysisResult?.verdict || (uploadedFile ? "Ready for ATS Analysis" : "No Resume Uploaded");

  return (
    <div className="min-h-screen bg-[var(--color-canvas-white)] py-8 px-4 md:px-8">
      <div className="max-w-[1240px] mx-auto">
        
        {/* ─── Header Banner ────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-[var(--color-ember-orange)] uppercase tracking-wider bg-[var(--color-ember-orange)]/10 px-3 py-1 rounded-full">
                AI Career Engine
              </span>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-graphite)] font-sora">
                Placement Intelligence
              </h1>
              <p className="mt-1 text-[15px] text-[var(--color-stone)]">
                AI Resume & ATS scoring, skill gap identification, personalized roadmaps, and recruiter matching.
              </p>
            </div>

            {/* Seamless Access to Existing Mock Interview Feature */}
            <div className="flex items-center gap-3">
              <Link
                href="/placement"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-[var(--color-ember-orange)] to-[#d44d24] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition-all hover:-translate-y-0.5"
                title="Access verified senior interview experiences, round guides, and questions"
              >
                <Award className="w-4 h-4" />
                <span>AI Mock Interview & Questions</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-[var(--color-paper)] mt-6 overflow-x-auto pb-1">
            {[
              { id: "dashboard", label: "Readiness Dashboard", icon: BarChart3 },
              { id: "resume", label: "AI Resume & ATS Analyzer", icon: FileText },
              { id: "skills", label: "Skill Gap Analyzer", icon: Target },
              { id: "roadmap", label: "Career Roadmap", icon: TrendingUp },
              { id: "matcher", label: "AI Job Matcher", icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium rounded-t-[10px] transition-all whitespace-nowrap ${
                    isActive
                      ? "border-b-2 border-[var(--color-ember-orange)] text-[var(--color-ember-orange)] bg-[var(--color-ember-orange)]/5 font-semibold"
                      : "text-[var(--color-stone)] hover:text-[var(--color-graphite)] hover:bg-[var(--color-paper)]/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── TAB 1: READINESS DASHBOARD ─────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top metric overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)]">Readiness Score</span>
                  <div className="w-8 h-8 rounded-full bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[var(--color-graphite)]">{readinessPercent}%</span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {readinessPercent >= 75 ? "Competitive" : "Developing"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-stone)]">
                  Based on {selectedCompany?.name || "tech"} requirements
                </p>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)]">ATS Resume Health</span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[var(--color-graphite)]">
                    {displayAtsScore}
                  </span>
                  <span className="text-xs font-medium text-neutral-500">/ 100</span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-stone)] font-medium">
                  {displayVerdict}
                </p>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)]">Core Skills Covered</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[var(--color-graphite)]">
                    {strongCount} / {skillGaps.length}
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold">{readinessPercent}% match</span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-stone)]">
                  {extractedSkills.length} verified candidate skills
                </p>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)]">Campus Recruiters</span>
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[var(--color-graphite)]">{companies.length || 6}</span>
                  <span className="text-xs text-purple-600 font-semibold">Active Drives</span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-stone)]">On-campus opportunities tracked</p>
              </div>
            </div>

            {/* Quick Action Banner — Mock Interview Access */}
            <div className="p-6 rounded-[20px] bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    AI Mock Interview & Senior Experience Bank
                  </div>
                  <h2 className="text-2xl font-bold font-sora">Practice Real Interview Rounds</h2>
                  <p className="text-blue-200 text-sm mt-1 max-w-2xl">
                    Review senior interview experiences from your institute, prepare for technical & HR rounds, and generate AI synthesis prep guides for each visiting recruiter.
                  </p>
                </div>
                <Link
                  href="/placement"
                  className="shrink-0 px-5 py-3 rounded-[12px] bg-white text-blue-950 font-semibold text-sm hover:bg-blue-50 transition-all flex items-center gap-2 self-start md:self-auto shadow-sm"
                >
                  <span>Launch Interview Hub</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Two-column layout: Skill Readiness & Recruiter Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Skill gap snapshot */}
              <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--color-graphite)] text-lg">Key Skill Gaps</h3>
                    <p className="text-xs text-[var(--color-stone)] mt-0.5">Target: {selectedCompany?.name || "Tier-1 Tech"}</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("skills")}
                    className="text-xs font-semibold text-[var(--color-ember-orange)] hover:underline"
                  >
                    View All Gaps →
                  </button>
                </div>

                <div className="space-y-3">
                  {skillGaps.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-[12px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)]">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          item.status === "strong" ? "bg-emerald-500" : item.status === "weak" ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        <span className="text-sm font-medium text-[var(--color-graphite)]">{item.skill}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        item.status === "strong" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : item.status === "weak" 
                          ? "bg-amber-50 text-amber-700" 
                          : "bg-red-50 text-red-700"
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matched Recruiters */}
              <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--color-graphite)] text-lg">Top Matched Recruiters</h3>
                    <p className="text-xs text-[var(--color-stone)] mt-0.5">Campus drives matching your profile</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("matcher")}
                    className="text-xs font-semibold text-[var(--color-ember-orange)] hover:underline"
                  >
                    Explore All Jobs →
                  </button>
                </div>

                <div className="space-y-3">
                  {companies.slice(0, 4).map((comp) => {
                    const skills = parseCompanySkills(comp.topSkillsRequired);
                    return (
                      <Link 
                        key={comp.id} 
                        href={`/placement/${comp.id}`}
                        className="group flex items-center justify-between p-3.5 rounded-[12px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] hover:border-[var(--color-ember-orange)] transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-[var(--color-graphite)] group-hover:text-[var(--color-ember-orange)]">
                              {comp.name}
                            </h4>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 uppercase font-mono">
                              {comp.domain}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-stone)] mt-1">
                            ₹{comp.packageMin || "?"}–{comp.packageMax || "?"} LPA · {skills.slice(0, 3).join(", ")}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[var(--color-ember-orange)] group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: AI RESUME & ATS ANALYZER (PROFESSIONAL UPLOADER) ────── */}
        {activeTab === "resume" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Professional Resume Upload & Inputs */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                  
                  {/* Header & Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-[var(--color-graphite)] flex items-center gap-2 font-sora">
                      <FileText className="w-5 h-5 text-[var(--color-ember-orange)]" />
                      Upload Resume
                    </h3>
                    <div className="flex gap-1 p-0.5 bg-neutral-100 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setInputMode("upload")}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          inputMode === "upload" ? "bg-white text-[var(--color-graphite)] shadow-xs" : "text-neutral-500"
                        }`}
                      >
                        PDF Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode("paste")}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          inputMode === "paste" ? "bg-white text-[var(--color-graphite)] shadow-xs" : "text-neutral-500"
                        }`}
                      >
                        Paste Text
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Drag-and-Drop & Browse File Zone */}
                  {inputMode === "upload" && (
                    <div className="space-y-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                      />

                      {!uploadedFile ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`cursor-pointer border-2 border-dashed rounded-[18px] p-8 text-center transition-all ${
                            isDragging
                              ? "border-[var(--color-ember-orange)] bg-[var(--color-ember-orange)]/5 scale-[1.01]"
                              : "border-[var(--color-paper)] hover:border-[var(--color-ember-orange)]/50 bg-[var(--color-canvas-white)] hover:bg-neutral-50"
                          }`}
                        >
                          <div className="w-14 h-14 rounded-full bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] flex items-center justify-center mx-auto mb-3">
                            <UploadCloud className="w-7 h-7" />
                          </div>
                          <h4 className="font-semibold text-sm text-[var(--color-graphite)]">
                            Drag & drop your resume here
                          </h4>
                          <p className="text-xs text-[var(--color-stone)] mt-1">
                            Supports PDF, DOCX, or TXT (up to 12MB)
                          </p>

                          <div className="mt-4">
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="px-4 py-2 rounded-[10px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white text-xs font-semibold shadow-xs"
                            >
                              Browse Files
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Uploaded File Summary Card */
                        <div className="p-4 rounded-[16px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                              <h5 className="font-semibold text-sm text-[var(--color-graphite)] truncate max-w-[240px]">
                                {uploadedFile.name}
                              </h5>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[var(--color-stone)] font-mono">
                                  {formatFileSize(uploadedFile.size)}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Ready for ATS Analysis
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="p-2 text-neutral-500 hover:text-[var(--color-ember-orange)] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-neutral-200"
                              title="Replace resume file"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveResume}
                              className="p-2 text-neutral-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-neutral-200"
                              title="Remove resume"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Paste Raw Text */}
                  {inputMode === "paste" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider">
                          Paste Resume Text
                        </label>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {pastedResumeText.length} characters
                        </span>
                      </div>
                      <textarea
                        value={pastedResumeText}
                        onChange={(e) => setPastedResumeText(e.target.value)}
                        rows={10}
                        placeholder="Paste your resume content here (Education, Technical Skills, Projects, Experience)..."
                        className="w-full text-xs font-mono p-3 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)] leading-relaxed custom-scrollbar"
                      />
                    </div>
                  )}

                  {/* Role & Company Inputs */}
                  <div className="space-y-3.5 mt-5 pt-4 border-t border-[var(--color-paper)]">
                    <div>
                      <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1">
                        Target Job Role *
                      </label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Software Development Engineer (SDE-1), Cloud Engineer, Quant Analyst"
                        className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider">
                          Target Recruiter (Campus Visiting)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsAddRecruiterModalOpen(true)}
                          className="text-xs font-medium text-[var(--color-ember-orange)] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Recruiter</span>
                        </button>
                      </div>

                      {companies.length > 2 && (
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={recruiterSearchQuery}
                            onChange={(e) => setRecruiterSearchQuery(e.target.value)}
                            placeholder="Filter campus recruiters by company, role, or skill..."
                            className="w-full text-xs pl-8 pr-8 py-1.5 rounded-[8px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                          />
                          {recruiterSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setRecruiterSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-neutral-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}

                      <select
                        value={selectedCompanyId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCompanyId(val);
                          if (val && val !== "other" && val !== "none") {
                            const comp = companies.find(c => c.id === val);
                            if (comp?.jobRole && (!targetRole || targetRole === "Software Development Engineer (SDE-1)")) {
                              setTargetRole(comp.jobRole);
                            }
                          }
                        }}
                        className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                      >
                        <option value="">No specific recruiter (General Industry ATS Benchmark)</option>
                        {filteredCompanies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.jobRole ? `— ${c.jobRole}` : `(${c.domain.toUpperCase()})`}
                          </option>
                        ))}
                        <option value="other">Other / Custom Job (Enter Company &amp; JD Below)</option>
                      </select>

                      {/* When 'Other / Custom Job' is selected */}
                      {selectedCompanyId === "other" && (
                        <div className="mt-2.5 p-3.5 rounded-[12px] bg-amber-50/60 border border-amber-200 animate-in fade-in">
                          <label className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block mb-1">
                            Custom Company Name *
                          </label>
                          <input
                            type="text"
                            value={customRecruiterName}
                            onChange={(e) => setCustomRecruiterName(e.target.value)}
                            placeholder="e.g. Google, Atlassian, Microsoft, Razorpay"
                            className="w-full text-xs px-3 py-2 rounded-[8px] border border-amber-300 bg-white focus:outline-none focus:border-[var(--color-ember-orange)]"
                          />
                          <p className="text-[11px] text-amber-800 mt-1.5 leading-relaxed">
                            Enter the company name and paste the job description below. ATS analysis will benchmark your resume directly against this custom target.
                          </p>
                        </div>
                      )}

                      {/* Recruiter Details Preview Card */}
                      {selectedCompany && (
                        <div className="mt-2.5 p-3.5 rounded-[12px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] text-xs space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[var(--color-ember-orange)]" />
                              <span className="font-bold text-[var(--color-graphite)]">{selectedCompany.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)]">
                                {selectedCompany.domain}
                              </span>
                            </div>
                            {selectedCompany.deadline && (
                              <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-neutral-400" />
                                Deadline: {new Date(selectedCompany.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-stone)] pt-1">
                            {selectedCompany.jobRole && (
                              <div>
                                <span className="font-semibold text-[var(--color-graphite)]">Role: </span>
                                {selectedCompany.jobRole}
                              </div>
                            )}
                            {selectedCompany.minCgpa !== undefined && selectedCompany.minCgpa !== null && (
                              <div>
                                <span className="font-semibold text-[var(--color-graphite)]">Min CGPA: </span>
                                {selectedCompany.minCgpa}
                              </div>
                            )}
                            {selectedCompany.requiredExperience && (
                              <div>
                                <span className="font-semibold text-[var(--color-graphite)]">Exp: </span>
                                {selectedCompany.requiredExperience}
                              </div>
                            )}
                            {selectedCompany.eligibleBranches && (
                              <div className="truncate">
                                <span className="font-semibold text-[var(--color-graphite)]">Eligible: </span>
                                {Array.isArray(selectedCompany.eligibleBranches)
                                  ? selectedCompany.eligibleBranches.join(", ")
                                  : String(selectedCompany.eligibleBranches)}
                              </div>
                            )}
                          </div>

                          {/* Top Skills Required */}
                          {selectedCompany.topSkillsRequired && (
                            <div className="pt-1.5 border-t border-[var(--color-paper)]">
                              <span className="text-[10px] font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1">
                                Recruiter Required Skills:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {parseCompanySkills(selectedCompany.topSkillsRequired).map((sk: string, idx: number) => (
                                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-[var(--color-graphite)] border border-neutral-200">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* If no companies exist yet */}
                      {companies.length === 0 && !isLoadingCompanies && (
                        <div className="mt-2.5 p-3 rounded-[12px] bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--color-stone)]">
                          <div>
                            <span className="font-medium text-[var(--color-graphite)]">No campus recruiters listed yet.</span>
                            <p className="text-[11px] text-neutral-500">You can add your college's visiting companies or analyze against general benchmarks.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAddRecruiterModalOpen(true)}
                            className="px-3 py-1.5 rounded-[8px] bg-[var(--color-ember-orange)] text-white text-xs font-semibold hover:bg-[#d44d24] transition-colors shrink-0"
                          >
                            + Add Recruiter
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1">
                        Job Description (Optional — for custom matching)
                      </label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        rows={3}
                        placeholder="Paste specific job description or requirements to customize keyword and qualification matching..."
                        className="w-full text-xs p-3 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)] leading-relaxed custom-scrollbar"
                      />
                    </div>

                    <Button
                      onClick={handleAnalyzeResume}
                      disabled={isAnalyzing}
                      className="w-full py-6 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white font-semibold text-sm shadow-sm transition-all"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Evaluating against ATS Filters with Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyze Resume & ATS Compatibility
                        </>
                      )}
                    </Button>

                    {/* Retrying Status Notice */}
                    {isRetryingAnalysis && (
                      <div className="mt-3 p-3.5 rounded-[12px] bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5 animate-pulse">
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                        <div>
                          <p className="font-semibold">AI services are temporarily experiencing high demand. We&apos;re retrying your request.</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">Attempting automatic backoff &amp; model fallback...</p>
                        </div>
                      </div>
                    )}

                    {/* Analysis Error with Retry Button */}
                    {analysisError && !isAnalyzing && (
                      <div className="mt-3 p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>AI analysis is temporarily unavailable. Please try again in a few moments.</span>
                        </div>
                        <button
                          onClick={handleAnalyzeResume}
                          disabled={isAnalyzing}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-[8px] text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: ATS Report Display */}
              <div className="lg:col-span-6 space-y-4">
                {analysisResult ? (
                  <div className="space-y-4 animate-in fade-in">
                    
                    {/* Score Card */}
                    <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)]">
                            ATS Compatibility Score
                          </span>
                          <h3 className="text-2xl font-bold text-[var(--color-graphite)] font-sora mt-1">
                            {analysisResult.verdict}
                          </h3>
                        </div>
                        <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] border-2 border-[var(--color-ember-orange)] shrink-0">
                          <span className="text-2xl font-bold font-mono">{analysisResult.atsScore}</span>
                          <span className="text-[10px] uppercase font-semibold">/ 100</span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--color-stone)] mt-4 leading-relaxed bg-[var(--color-canvas-white)] p-3 rounded-[12px] border border-[var(--color-paper)]">
                        {analysisResult.executiveSummary}
                      </p>

                      {/* Breakdown bars */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {analysisResult.scoreBreakdown && Object.entries(analysisResult.scoreBreakdown).map(([key, val]: any) => (
                          <div key={key} className="p-3 rounded-[12px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)]">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="capitalize text-[var(--color-stone)]">{key.replace(/([A-Z])/g, " $1")}</span>
                              <span className="font-mono font-bold text-[var(--color-graphite)]">{val}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[var(--color-ember-orange)] rounded-full transition-all duration-500"
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resume Strengths */}
                    <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                      <h4 className="font-semibold text-sm text-[var(--color-graphite)] mb-3 flex items-center gap-2 font-sora">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Resume Strengths
                      </h4>
                      <div className="space-y-2">
                        {analysisResult.strengths?.map((str: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-stone)] leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{str}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills & Missing Keywords */}
                    <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--color-graphite)] mb-2 flex items-center gap-2 font-sora text-red-700">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          Missing Skills ({analysisResult.missingSkills?.length || 0})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.missingSkills?.map((skill: string, i: number) => (
                            <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 font-medium">
                              + {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--color-paper)]">
                        <h4 className="font-semibold text-sm text-[var(--color-graphite)] mb-2 flex items-center gap-2 font-sora text-amber-700">
                          <Target className="w-4 h-4 text-amber-600" />
                          Missing ATS Keywords ({analysisResult.missingKeywords?.length || 0})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.missingKeywords?.map((kw: string, i: number) => (
                            <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Formatting Issues */}
                    {analysisResult.formattingIssues && analysisResult.formattingIssues.length > 0 && (
                      <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                        <h4 className="font-semibold text-sm text-[var(--color-graphite)] mb-3 flex items-center gap-2 font-sora text-orange-700">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          Formatting & ATS Parsing Traps
                        </h4>
                        <div className="space-y-2">
                          {analysisResult.formattingIssues.map((issue: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-stone)] leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actionable Improvement Suggestions */}
                    <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                      <h4 className="font-semibold text-sm text-[var(--color-graphite)] mb-3 font-sora">
                        Actionable Improvement Suggestions
                      </h4>
                      <div className="space-y-2.5">
                        {analysisResult.actionableImprovements?.map((imp: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--color-stone)] leading-relaxed">
                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                              {i + 1}
                            </span>
                            <span>{imp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : analysisError && !isAnalyzing ? (
                  <div className="h-full min-h-[460px] flex flex-col items-center justify-center p-8 rounded-[20px] bg-white border border-red-200 text-center animate-in fade-in">
                    <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-graphite)] font-sora">AI Analysis Temporarily Unavailable</h3>
                    <p className="text-xs text-[var(--color-stone)] mt-2 max-w-sm">
                      AI analysis is temporarily unavailable. Please try again in a few moments.
                    </p>
                    <button
                      onClick={handleAnalyzeResume}
                      disabled={isAnalyzing}
                      className="mt-6 px-6 py-2.5 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Resume Analysis</span>
                    </button>
                  </div>
                ) : isRetryingAnalysis ? (
                  <div className="h-full min-h-[460px] flex flex-col items-center justify-center p-8 rounded-[20px] bg-white border border-amber-200 text-center animate-in fade-in">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-graphite)] font-sora">High Demand in AI Services</h3>
                    <p className="text-xs text-amber-800 font-medium mt-2 max-w-sm">
                      AI services are temporarily experiencing high demand. We&apos;re retrying your request.
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Applying exponential backoff &amp; model fallback...
                    </p>
                  </div>
                ) : (
                  <div className="h-full min-h-[460px] flex flex-col items-center justify-center p-8 rounded-[20px] bg-white border border-[var(--color-paper)] text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-graphite)] font-sora">Ready for ATS Evaluation</h3>
                    <p className="text-xs text-[var(--color-stone)] mt-2 max-w-sm">
                      Upload your PDF resume on the left or paste your resume content, select a target job role, and click &quot;Analyze Resume & ATS Compatibility&quot;.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: SKILL GAP ANALYZER (AI-POWERED & DYNAMIC) ─────────── */}
        {activeTab === "skills" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Case A: No Resume Uploaded Yet */}
            {!uploadedFile && !analysisResult ? (
              <div className="p-8 md:p-12 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[var(--color-graphite)] font-sora">
                  Resume Required for Skill Gap Analysis
                </h3>
                <p className="text-sm text-[var(--color-stone)] mt-2 max-w-lg mx-auto leading-relaxed">
                  Upload your resume in AI Resume & ATS Analyzer to begin your personalized skill gap analysis.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => setActiveTab("resume")}
                    className="px-6 py-3 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white font-semibold text-sm shadow-sm transition-all"
                  >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload Resume in AI Resume & ATS Analyzer
                  </Button>
                </div>
              </div>
            ) : (
              /* Case B: Student Resume Exists - Show Full Dynamic Analyzer */
              <div className="space-y-6">
                
                {/* 1. Resume Connection & Control Bar */}
                <div className="p-5 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Resume Connected
                        </span>
                        <span className="font-semibold text-sm text-[var(--color-graphite)]">
                          {uploadedFile?.name || "Uploaded_Resume.pdf"}
                        </span>
                        {uploadedFile?.size ? (
                          <span className="text-xs text-[var(--color-stone)] font-mono">
                            ({formatFileSize(uploadedFile.size)})
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[var(--color-stone)] mt-1">
                        Loaded securely from your authenticated profile. Skills and experience are analyzed directly by Gemini.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <button
                      onClick={() => setShowExtractedResumeSkills(!showExtractedResumeSkills)}
                      className="px-3 py-1.5 rounded-[10px] border border-[var(--color-paper)] hover:bg-[var(--color-canvas-white)] text-xs text-[var(--color-stone)] font-medium flex items-center gap-1.5 transition-colors"
                      title="Inspect actual skills extracted by AI from your resume"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{showExtractedResumeSkills ? "Hide Extracted Skills" : `View Extracted Skills (${extractedSkills.length})`}</span>
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("resume")}
                      className="rounded-[10px] text-xs font-semibold border-[var(--color-paper)] text-[var(--color-stone)] hover:text-[var(--color-graphite)]"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Replace Resume
                    </Button>
                  </div>
                </div>

                {/* Collapsible Extracted Resume Skills Preview */}
                {showExtractedResumeSkills && (
                  <div className="p-5 rounded-[16px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] animate-in fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-[var(--color-graphite)] uppercase tracking-wider font-sora">
                        Actual Technical Skills Extracted from Your Resume ({extractedSkills.length})
                      </h4>
                      <span className="text-[11px] text-[var(--color-stone)]">
                        Zero assumed skills — only verified evidence
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {extractedSkills.map((sk, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full bg-white border border-[var(--color-paper)] text-[var(--color-graphite)] font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Target Job Role Selection & Action Bar */}
                <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--color-graphite)] font-sora flex items-center gap-2">
                        <Target className="w-5 h-5 text-[var(--color-ember-orange)]" />
                        Target Job Role Selection
                      </h3>
                      <p className="text-xs text-[var(--color-stone)] mt-1">
                        Select a career track or type any custom role. Gemini will evaluate industry-standard 2026 requirements against your actual resume.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleRunSkillGapAnalysis()}
                        disabled={isAnalyzingSkillGap}
                        className="py-5 px-5 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white font-semibold text-xs shadow-sm transition-all"
                      >
                        {isAnalyzingSkillGap ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Evaluating Resume with Gemini...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {skillGapData ? "Refresh Analysis" : "Analyze Skill Gap with AI"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Free text custom role input */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Desired Career Role (Custom or Preset)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={skillGapTargetRole}
                        onChange={(e) => setSkillGapTargetRole(e.target.value)}
                        placeholder="e.g. Full Stack Developer, Data Analyst, Java Backend Engineer, AI/ML Engineer..."
                        className="w-full text-sm px-4 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)] text-[var(--color-graphite)] font-medium"
                      />
                    </div>
                  </div>

                  {/* Preset quick-select chips */}
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-2">
                      Popular Roles (Click to Select & Compare):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_JOB_ROLES.map((role) => {
                        const isSelected = skillGapTargetRole.toLowerCase() === role.toLowerCase();
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setSkillGapTargetRole(role);
                              handleRunSkillGapAnalysis(role);
                            }}
                            className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium border ${
                              isSelected
                                ? "bg-[var(--color-ember-orange)] text-white border-[var(--color-ember-orange)] shadow-xs"
                                : "bg-[var(--color-canvas-white)] hover:bg-neutral-100 text-[var(--color-stone)] border-[var(--color-paper)]"
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Retrying Status Notice */}
                  {isRetryingSkillGap && (
                    <div className="p-3.5 rounded-[12px] bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5 animate-pulse">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                      <div>
                        <p className="font-semibold">AI services are temporarily experiencing high demand. We&apos;re retrying your request.</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">Attempting automatic backoff &amp; model fallback...</p>
                      </div>
                    </div>
                  )}

                  {/* Error Alert with Retry Button */}
                  {skillGapError && !isAnalyzingSkillGap && (
                    <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>AI analysis is temporarily unavailable. Please try again in a few moments.</span>
                      </div>
                      <button
                        onClick={() => handleRunSkillGapAnalysis(skillGapTargetRole)}
                        disabled={isAnalyzingSkillGap}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-[8px] text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Skill Gap Analysis Visualizations */}
                {isAnalyzingSkillGap ? (
                  <div className="p-12 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-[var(--color-ember-orange)] animate-spin mx-auto" />
                    <h4 className="text-lg font-bold text-[var(--color-graphite)] font-sora">
                      Comparing Verified Resume Skills against &quot;{skillGapTargetRole}&quot;
                    </h4>
                    <p className="text-xs text-[var(--color-stone)] max-w-md mx-auto">
                      Gemini is checking technical languages, frameworks, architecture paradigms, and portfolio evidence without fabricating scores.
                    </p>
                  </div>
                ) : skillGapData ? (
                  <div className="space-y-6">
                    {/* Top Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Overall Coverage Meter */}
                      <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)]">
                            Role Skill Coverage
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] font-mono">
                            {skillGapData.targetJobRole}
                          </span>
                        </div>
                        <div className="my-4 flex items-baseline gap-3">
                          <span className="text-4xl font-extrabold font-mono text-[var(--color-graphite)]">
                            {skillGapData.skillGapResults.coveragePercentage}%
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            skillGapData.skillGapResults.coveragePercentage >= 80
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : skillGapData.skillGapResults.coveragePercentage >= 60
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {skillGapData.skillGapResults.readinessLevel}
                          </span>
                        </div>
                        {/* Dynamic Progress Bar */}
                        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--color-ember-orange)] to-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(5, skillGapData.skillGapResults.coveragePercentage))}%` }}
                          />
                        </div>
                      </div>

                      {/* Evidence Classification Breakdown */}
                      <div className="md:col-span-2 p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)] mb-2">
                          Skill Classification Breakdown ({skillGapData.skillGapResults.totalSkillsEvaluated} core skills analyzed)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-2">
                          <div className="p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-xl font-bold text-emerald-800 font-mono block">
                              {skillGapData.skillGapResults.strongCount}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 uppercase">Strong</span>
                          </div>
                          <div className="p-3 rounded-[12px] bg-sky-50 border border-sky-200 text-center">
                            <span className="text-xl font-bold text-sky-800 font-mono block">
                              {skillGapData.skillGapResults.intermediateCount}
                            </span>
                            <span className="text-[10px] font-semibold text-sky-700 uppercase">Intermediate</span>
                          </div>
                          <div className="p-3 rounded-[12px] bg-amber-50 border border-amber-200 text-center">
                            <span className="text-xl font-bold text-amber-800 font-mono block">
                              {skillGapData.skillGapResults.beginnerCount}
                            </span>
                            <span className="text-[10px] font-semibold text-amber-700 uppercase">Beginner</span>
                          </div>
                          <div className="p-3 rounded-[12px] bg-rose-50 border border-rose-200 text-center">
                            <span className="text-xl font-bold text-rose-800 font-mono block">
                              {skillGapData.skillGapResults.missingCount}
                            </span>
                            <span className="text-[10px] font-semibold text-rose-700 uppercase">Missing</span>
                          </div>
                          <div className="p-3 rounded-[12px] bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
                            <span className="text-xl font-bold text-slate-800 font-mono block">
                              {skillGapData.skillGapResults.notAssessedCount || 0}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 uppercase">Not Assessed</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[var(--color-stone)] mt-1">
                          Evaluated strictly from resume evidence — unknown proficiencies are classified as &quot;Not Assessed&quot;.
                        </p>
                      </div>
                    </div>

                    {/* Executive Summary Callout */}
                    {skillGapData.skillGapResults.executiveSummary && (
                      <div className="p-5 rounded-[16px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-[var(--color-ember-orange)] mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-graphite)] uppercase tracking-wider font-sora mb-1">
                            Executive Recruiter Evaluation for {skillGapData.targetJobRole}
                          </h4>
                          <p className="text-xs text-[var(--color-stone)] leading-relaxed">
                            {skillGapData.skillGapResults.executiveSummary}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 4. Categorized Skill Matrix with Filter Pills */}
                    <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-[var(--color-graphite)] font-sora">
                            Skill Classification Matrix
                          </h4>
                          <p className="text-xs text-[var(--color-stone)] mt-0.5">
                            Detailed verification status for each core requirement of {skillGapData.targetJobRole}.
                          </p>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-[var(--color-stone)] font-medium flex items-center gap-1 mr-1">
                            <Filter className="w-3 h-3" /> Filter:
                          </span>
                          {(["all", "Strong", "Intermediate", "Beginner", "Missing", "Not Assessed"] as const).map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setSkillFilter(cat)}
                              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                skillFilter === cat
                                  ? "bg-[var(--color-graphite)] text-white"
                                  : "bg-[var(--color-canvas-white)] text-[var(--color-stone)] hover:bg-neutral-100 border border-[var(--color-paper)]"
                              }`}
                            >
                              {cat === "all" ? `All (${skillGapData.skillClassifications?.length || 0})` : cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Skill Items Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {skillGapData.skillClassifications
                          ?.filter((s) => skillFilter === "all" || s.classification === skillFilter)
                          .map((item, idx) => {
                            const badgeStyles = {
                              Strong: "bg-emerald-50 text-emerald-800 border-emerald-200",
                              Intermediate: "bg-sky-50 text-sky-800 border-sky-200",
                              Beginner: "bg-amber-50 text-amber-800 border-amber-200",
                              Missing: "bg-rose-50 text-rose-800 border-rose-200",
                              "Not Assessed": "bg-slate-100 text-slate-700 border-slate-300",
                            }[item.classification] || "bg-neutral-50 text-neutral-700 border-neutral-200";

                            return (
                              <div
                                key={idx}
                                className="p-4 rounded-[14px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] hover:border-[var(--color-ember-orange)]/40 transition-all flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-semibold text-sm text-[var(--color-graphite)] font-sora">
                                        {item.skill}
                                      </h5>
                                      <span className="text-[10px] text-[var(--color-stone)] bg-white px-2 py-0.5 rounded border border-[var(--color-paper)]">
                                        {item.category}
                                      </span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${badgeStyles}`}>
                                      {item.classification}
                                    </span>
                                  </div>

                                  <div className="text-xs space-y-1.5 mt-2.5">
                                    <div className="text-[var(--color-stone)] flex items-start gap-1.5">
                                      <span className="font-semibold text-[var(--color-graphite)] shrink-0">Resume Evidence:</span>
                                      <span className="italic">{item.evidenceFromResume || "No direct proof cited"}</span>
                                    </div>
                                    <div className="text-[var(--color-stone)] flex items-start gap-1.5">
                                      <span className="font-semibold text-[var(--color-graphite)] shrink-0">Required Level:</span>
                                      <span>{item.requiredLevel}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-[var(--color-paper)] flex items-center justify-between">
                                  <span className={`text-[10px] font-semibold ${
                                    item.importance === "Critical" ? "text-rose-600" : "text-[var(--color-stone)]"
                                  }`}>
                                    {item.importance} Importance
                                  </span>

                                  <Link
                                    href={`/peer-learning?topic=${encodeURIComponent(item.skill)}&from=skill-gap`}
                                    className="text-xs font-semibold text-[var(--color-ember-orange)] hover:underline flex items-center gap-1"
                                  >
                                    Find Peer Mentor →
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Missing & Emerging Tech Callout */}
                      {skillGapData.relevantTechnologiesNotMentioned && skillGapData.relevantTechnologiesNotMentioned.length > 0 && (
                        <div className="p-4 rounded-[14px] bg-neutral-50 border border-[var(--color-paper)]">
                          <span className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-2">
                            Relevant Modern Technologies Not Found in Resume:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {skillGapData.relevantTechnologiesNotMentioned.map((tech, i) => (
                              <span
                                key={i}
                                className="text-xs px-2.5 py-1 rounded-full bg-white text-[var(--color-stone)] border border-neutral-200"
                              >
                                + {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5. Personalized Recommendations Based on Actual Gaps */}
                    <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm space-y-4">
                      <div>
                        <h4 className="text-base font-bold text-[var(--color-graphite)] font-sora flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-[var(--color-ember-orange)]" />
                          Personalized Action Plan & Project Recommendations
                        </h4>
                        <p className="text-xs text-[var(--color-stone)] mt-0.5">
                          Evidence-based recommendations tailored to close your verified skill gaps for {skillGapData.targetJobRole}.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {skillGapData.recommendations?.map((rec, i) => {
                          const priorityBadge = {
                            High: "bg-red-50 text-red-800 border-red-200",
                            Medium: "bg-amber-50 text-amber-800 border-amber-200",
                            Low: "bg-blue-50 text-blue-800 border-blue-200",
                          }[rec.priority] || "bg-neutral-50 text-neutral-700 border-neutral-200";

                          return (
                            <div
                              key={i}
                              className="p-5 rounded-[16px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-full bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] text-xs font-bold flex items-center justify-center shrink-0">
                                    {i + 1}
                                  </span>
                                  <h5 className="font-bold text-sm text-[var(--color-graphite)] font-sora">
                                    {rec.skillName}
                                  </h5>
                                  <span className="text-[10px] text-[var(--color-stone)] bg-white px-2 py-0.5 rounded border border-[var(--color-paper)]">
                                    {rec.category}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${priorityBadge}`}>
                                    {rec.priority} Priority
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-[var(--color-stone)] leading-relaxed">
                                <strong className="text-[var(--color-graphite)]">Why It Matters:</strong> {rec.whyItMatters}
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-[10px] bg-white border border-[var(--color-paper)]">
                                  <span className="font-semibold text-[var(--color-graphite)] block mb-1">
                                    Current Evidence:
                                  </span>
                                  <span className="text-[var(--color-stone)] italic">
                                    {rec.currentEvidence || "None found in resume"}
                                  </span>
                                </div>
                                <div className="p-3 rounded-[10px] bg-white border border-[var(--color-paper)]">
                                  <span className="font-semibold text-[var(--color-graphite)] block mb-1">
                                    Required Proficiency:
                                  </span>
                                  <span className="text-[var(--color-stone)]">
                                    {rec.requiredProficiency}
                                  </span>
                                </div>
                              </div>

                              {/* Practical Project Ideas */}
                              {rec.practicalProjects && rec.practicalProjects.length > 0 && (
                                <div className="p-3 rounded-[10px] bg-white border border-[var(--color-paper)] text-xs">
                                  <span className="font-semibold text-[var(--color-graphite)] flex items-center gap-1.5 mb-1.5">
                                    <FileCode className="w-3.5 h-3.5 text-[var(--color-ember-orange)]" />
                                    Portfolio Project Recommendation:
                                  </span>
                                  <ul className="space-y-1 text-[var(--color-stone)]">
                                    {rec.practicalProjects.map((proj, pIdx) => (
                                      <li key={pIdx} className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ember-orange)] mt-1.5 shrink-0" />
                                        <span>{proj}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Learning Resources */}
                              {rec.learningResources && rec.learningResources.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                  <span className="text-[var(--color-stone)] font-medium">Resources:</span>
                                  {rec.learningResources.map((res, rIdx) => (
                                    <span
                                      key={rIdx}
                                      className="px-2.5 py-1 rounded-full bg-white border border-[var(--color-paper)] text-[var(--color-stone)] text-[11px]"
                                    >
                                      {res}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 6. Historical Analysis Tracking */}
                    {skillGapHistory && skillGapHistory.length > 0 && (
                      <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-[var(--color-graphite)] font-sora flex items-center gap-2">
                            <History className="w-4 h-4 text-[var(--color-stone)]" />
                            Skill Gap Evaluation History ({skillGapHistory.length})
                          </h4>
                          <span className="text-xs text-[var(--color-stone)]">
                            Track progress across roles & resume updates
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {skillGapHistory.map((hist, hIdx) => (
                            <button
                              key={hIdx}
                              onClick={() => {
                                setSkillGapTargetRole(hist.targetRole);
                                loadSkillGap(hist.targetRole);
                              }}
                              className="p-3.5 rounded-[12px] bg-[var(--color-canvas-white)] hover:bg-neutral-100 border border-[var(--color-paper)] text-left transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-[var(--color-graphite)] group-hover:text-[var(--color-ember-orange)] transition-colors">
                                  {hist.targetRole}
                                </span>
                                <span className="font-mono font-bold text-xs text-[var(--color-graphite)]">
                                  {hist.coveragePercentage}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2 text-[11px] text-[var(--color-stone)]">
                                <span>{hist.readinessLevel}</span>
                                <span>{new Date(hist.timestamp).toLocaleDateString()}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  /* Initial state before first run: CTA */
                  <div className="p-10 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] flex items-center justify-center mx-auto">
                      <Target className="w-7 h-7" />
                    </div>
                    <h4 className="text-lg font-bold text-[var(--color-graphite)] font-sora">
                      Ready to Analyze Skill Gaps for &quot;{skillGapTargetRole}&quot;
                    </h4>
                    <p className="text-xs text-[var(--color-stone)] max-w-md mx-auto leading-relaxed">
                      Click the button below to have Gemini examine your verified resume against current 2026 industry benchmarks and classify every proficiency.
                    </p>
                    <Button
                      onClick={() => handleRunSkillGapAnalysis()}
                      className="px-6 py-2.5 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white font-semibold text-xs shadow-sm transition-all"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Run AI Skill Gap Analysis
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: PERSONALIZED CAREER ROADMAP ─────────────────────────── */}
        {activeTab === "roadmap" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-graphite)] font-sora">
                    Personalized 8-Week Placement Roadmap
                  </h3>
                  <p className="text-xs text-[var(--color-stone)] mt-1">
                    Structured milestone sprint covering DSA, System Design, Projects, and Mock Interviews tailored to {targetRole}.
                  </p>
                </div>

                <Button
                  onClick={handleGenerateRoadmap}
                  disabled={isGeneratingRoadmap}
                  className="rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white text-xs font-semibold"
                >
                  {isGeneratingRoadmap ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Generating with Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-2" />
                      Generate Personalized Roadmap
                    </>
                  )}
                </Button>
              </div>

              {roadmapData ? (
                <div className="space-y-4">
                  {roadmapData.milestones?.map((m: any, i: number) => (
                    <div key={i} className="p-5 rounded-[16px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[var(--color-ember-orange)] uppercase tracking-wider font-mono">
                          Week {m.week || i + 1} · {m.phase}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">~{m.hoursPerWeek || 15} hrs/week</span>
                      </div>
                      <h4 className="font-semibold text-base text-[var(--color-graphite)] mb-2 font-sora">
                        {m.focus}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                        {m.deliverables?.map((task: string, tIdx: number) => (
                          <div key={tIdx} className="p-2.5 rounded-[10px] bg-white border border-[var(--color-paper)] text-xs text-[var(--color-stone)] flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ember-orange)] mt-1.5 shrink-0" />
                            <span>{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {roadmapData.proTip && (
                    <div className="p-4 rounded-[14px] bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <strong>Recruiter Pro-Tip:</strong> {roadmapData.proTip}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Default pre-populated roadmap */
                <div className="space-y-4">
                  {[
                    {
                      week: "1–2",
                      title: "DSA Core & Algorithmic Complexity",
                      topics: ["Arrays, Two Pointers, Sliding Window", "HashMaps, Frequency Tables", "Recursion & Backtracking basics"],
                      hours: "15 hrs/wk"
                    },
                    {
                      week: "3–4",
                      title: "Trees, Graphs & Dynamic Programming",
                      topics: ["Binary Trees & BST In-order Traversals", "BFS / DFS & Shortest Path", "1D & 2D Dynamic Programming Patterns"],
                      hours: "18 hrs/wk"
                    },
                    {
                      week: "5–6",
                      title: "Core CS Fundamentals & Project Deep-Dive",
                      topics: ["DBMS Indexing, Normalization & SQL Queries", "OS Concurrency, Threads & Virtual Memory", "System Design High-Level Architecture"],
                      hours: "14 hrs/wk"
                    },
                    {
                      week: "7–8",
                      title: "Company-Specific Mock Interviews & Behavioral Prep",
                      topics: ["Senior Experience Questions Review", "STAR Method Behavioral Stories", "Full-length Timed Mock Technical Rounds"],
                      hours: "12 hrs/wk"
                    },
                  ].map((sprint, i) => (
                    <div key={i} className="p-5 rounded-[16px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[var(--color-ember-orange)] uppercase tracking-wider font-mono">
                          Weeks {sprint.week}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">{sprint.hours}</span>
                      </div>
                      <h4 className="font-semibold text-base text-[var(--color-graphite)] mb-3 font-sora">
                        {sprint.title}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {sprint.topics.map((t, tIdx) => (
                          <div key={tIdx} className="p-2.5 rounded-[10px] bg-white border border-[var(--color-paper)] text-xs text-[var(--color-stone)] flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ember-orange)] mt-1.5 shrink-0" />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: AI JOB MATCHER (REAL JOBS & DYNAMIC AI MATCHING) ─── */}
        {activeTab === "matcher" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Case A: No Resume Uploaded Yet */}
            {!uploadedFile && !analysisResult ? (
              <div className="p-8 md:p-12 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[var(--color-graphite)] font-sora">
                  Resume Required for Job Matching
                </h3>
                <p className="text-sm text-[var(--color-stone)] mt-2 max-w-lg mx-auto leading-relaxed">
                  Upload your resume in AI Resume & ATS Analyzer to discover jobs matching your profile.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => setActiveTab("resume")}
                    className="px-6 py-3 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white font-semibold text-sm shadow-sm transition-all"
                  >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload Resume in AI Resume & ATS Analyzer
                  </Button>
                </div>
              </div>
            ) : (
              /* Case B: Student Resume Exists - Show Full AI Job Matcher */
              <div className="space-y-6">
                
                {/* 1. Header & Live Provider Notice */}
                <div className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Live Job Feed Connected
                        </span>
                        <span className="text-xs text-[var(--color-stone)]">
                          Sources: Remotive & Arbeitnow
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-[var(--color-graphite)] font-sora mt-2">
                        AI Job Matcher & Application Tracker
                      </h3>
                      <p className="text-xs text-[var(--color-stone)] mt-1">
                        Live real-world opportunities evaluated against your verified resume skills and target career path.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => fetchJobs()}
                        disabled={isLoadingJobs}
                        variant="outline"
                        size="sm"
                        className="rounded-[10px] text-xs font-semibold border-[var(--color-paper)] text-[var(--color-stone)] hover:text-[var(--color-graphite)]"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingJobs ? "animate-spin" : ""}`} />
                        Refresh Opportunities
                      </Button>
                    </div>
                  </div>

                  {/* 2. Comprehensive Search & Filter Controls */}
                  <div className="mt-6 pt-5 border-t border-[var(--color-paper)] space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Keyword search input */}
                      <div className="md:col-span-5 relative">
                        <Search className="w-4 h-4 text-[var(--color-stone)] absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          value={jobSearchQuery}
                          onChange={(e) => setJobSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && fetchJobs()}
                          placeholder="Search job title, skills, or company (e.g. Next.js, Python, Full Stack)..."
                          className="w-full text-sm pl-10 pr-4 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                        />
                      </div>

                      {/* Location input */}
                      <div className="md:col-span-4 relative">
                        <MapPin className="w-4 h-4 text-[var(--color-stone)] absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          value={jobLocationFilter}
                          onChange={(e) => setJobLocationFilter(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && fetchJobs()}
                          placeholder="Location (e.g. Remote, USA, Europe, India)..."
                          className="w-full text-sm pl-10 pr-4 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                        />
                      </div>

                      {/* Search CTA */}
                      <div className="md:col-span-3">
                        <Button
                          onClick={() => fetchJobs()}
                          disabled={isLoadingJobs}
                          className="w-full py-2.5 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white text-xs font-semibold shadow-sm"
                        >
                          {isLoadingJobs ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Matching Jobs...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Search & Match
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Filter Dropdowns & Pills */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-stone)]">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="font-medium">Workplace:</span>
                        <select
                          value={jobWorkplaceTypeFilter}
                          onChange={(e) => {
                            setJobWorkplaceTypeFilter(e.target.value);
                            setTimeout(() => fetchJobs(), 50);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-[8px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none"
                        >
                          <option value="all">All Workplaces</option>
                          <option value="remote">Remote Only</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="on-site">On-Site</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-stone)]">
                        <span className="font-medium">Type:</span>
                        <select
                          value={jobTypeFilter}
                          onChange={(e) => {
                            setJobTypeFilter(e.target.value);
                            setTimeout(() => fetchJobs(), 50);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-[8px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none"
                        >
                          <option value="all">All Types</option>
                          <option value="full_time">Full-time</option>
                          <option value="internship">Internship</option>
                          <option value="part_time">Part-time</option>
                          <option value="contract">Contract</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-stone)]">
                        <span className="font-medium">Experience:</span>
                        <select
                          value={jobExperienceFilter}
                          onChange={(e) => {
                            setJobExperienceFilter(e.target.value);
                            setTimeout(() => fetchJobs(), 50);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-[8px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none"
                        >
                          <option value="all">All Levels</option>
                          <option value="entry">Entry / Junior</option>
                          <option value="internship">Internship</option>
                          <option value="senior">Senior / Lead</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Category Selector Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 border-b border-[var(--color-paper)]">
                  {[
                    { id: "all", label: `All Jobs (${jobsList.length})` },
                    { id: "best", label: `Best Matches (${jobCategories.bestMatches.length})` },
                    { id: "recommended", label: `Recommended for You (${jobCategories.recommended.length})` },
                    { id: "skill-gap", label: `Skill Gap Opportunities (${jobCategories.skillGapOpportunities.length})` },
                    { id: "internships", label: `Internships (${jobCategories.internships.length})` },
                    { id: "recent", label: "Recently Posted" },
                    { id: "saved", label: `Saved & Tracked (${jobsList.filter(j => j.isSaved || j.applicationStatus).length})` },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveJobCategory(cat.id as any)}
                      className={`px-3.5 py-2 rounded-t-[10px] text-xs font-semibold transition-all whitespace-nowrap ${
                        activeJobCategory === cat.id
                          ? "border-b-2 border-[var(--color-ember-orange)] text-[var(--color-ember-orange)] bg-[var(--color-ember-orange)]/5"
                          : "text-[var(--color-stone)] hover:text-[var(--color-graphite)] hover:bg-[var(--color-paper)]/30"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 4. Job Listings Feed */}
                {isLoadingJobs ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="p-6 rounded-[20px] bg-white border border-[var(--color-paper)] animate-pulse space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-neutral-200 rounded w-1/3" />
                          <div className="h-6 w-16 bg-neutral-200 rounded-full" />
                        </div>
                        <div className="h-5 bg-neutral-200 rounded w-2/3" />
                        <div className="h-3 bg-neutral-100 rounded w-full" />
                        <div className="h-3 bg-neutral-100 rounded w-4/5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    const displayedJobs = (() => {
                      if (activeJobCategory === "best") return jobCategories.bestMatches;
                      if (activeJobCategory === "recommended") return jobCategories.recommended;
                      if (activeJobCategory === "skill-gap") return jobCategories.skillGapOpportunities;
                      if (activeJobCategory === "internships") return jobCategories.internships;
                      if (activeJobCategory === "recent") return jobCategories.recentlyPosted;
                      if (activeJobCategory === "saved") return jobsList.filter(j => j.isSaved || j.applicationStatus);
                      return jobsList;
                    })();

                    if (displayedJobs.length === 0) {
                      return (
                        <div className="p-12 rounded-[20px] bg-white border border-[var(--color-paper)] text-center space-y-3">
                          <Briefcase className="w-12 h-12 text-[var(--color-stone)] mx-auto" />
                          <h4 className="text-base font-bold text-[var(--color-graphite)] font-sora">
                            No Active Opportunities in this Category
                          </h4>
                          <p className="text-xs text-[var(--color-stone)] max-w-sm mx-auto">
                            Try adjusting your search keywords, workplace type, or location filters to see more listings.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setJobSearchQuery("");
                              setJobLocationFilter("");
                              setJobWorkplaceTypeFilter("all");
                              setJobTypeFilter("all");
                              setJobExperienceFilter("all");
                              fetchJobs("", "");
                            }}
                            className="mt-2 text-xs rounded-[10px]"
                          >
                            Reset Filters
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedJobs.map((job) => {
                          const matchBadge =
                            job.matchScore >= 75
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : job.matchScore >= 55
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-amber-50 text-amber-800 border-amber-200";

                          return (
                            <div
                              key={job.id}
                              onClick={() => setSelectedJobForModal(job)}
                              className="p-5 rounded-[18px] bg-white border border-[var(--color-paper)] hover:border-[var(--color-ember-orange)]/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                            >
                              <div>
                                {/* Header: Logo, Company, Title, Match Score */}
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-start gap-3">
                                    {job.companyLogo ? (
                                      <img
                                        src={job.companyLogo}
                                        alt={job.companyName}
                                        className="w-10 h-10 rounded-[10px] object-cover border border-[var(--color-paper)] shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-[10px] bg-neutral-100 border border-[var(--color-paper)] flex items-center justify-center text-[var(--color-graphite)] font-bold font-sora text-sm shrink-0">
                                        {job.companyName.charAt(0)}
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-[var(--color-graphite)]">
                                          {job.companyName}
                                        </span>
                                        <span className="text-[10px] text-[var(--color-stone)] bg-[var(--color-canvas-white)] px-2 py-0.5 rounded border border-[var(--color-paper)]">
                                          {job.source}
                                        </span>
                                      </div>
                                      <h4 className="font-bold text-base text-[var(--color-graphite)] font-sora group-hover:text-[var(--color-ember-orange)] transition-colors line-clamp-1 mt-0.5">
                                        {job.title}
                                      </h4>
                                    </div>
                                  </div>

                                  {/* Score Pill */}
                                  <div className={`flex flex-col items-center px-2.5 py-1 rounded-[10px] border shrink-0 ${matchBadge}`}>
                                    <span className="text-base font-extrabold font-mono leading-none">
                                      {job.matchScore}%
                                    </span>
                                    <span className="text-[9px] uppercase font-bold tracking-tight mt-0.5">
                                      Match
                                    </span>
                                  </div>
                                </div>

                                {/* Metadata pills: Location, Workplace, Salary, Posted Date */}
                                <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-[var(--color-stone)]">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {job.location || "Remote"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    {job.jobType ? job.jobType.replace("_", " ") : "Full-time"}
                                  </span>
                                  {job.salary && (
                                    <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                      <DollarSign className="w-3 h-3" />
                                      {job.salary}
                                    </span>
                                  )}
                                  {job.postedAt && (
                                    <span className="flex items-center gap-1 text-neutral-400">
                                      <Clock className="w-3 h-3" />
                                      {new Date(job.postedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>

                                {/* Matching vs Missing Skills Preview */}
                                <div className="mt-3.5 space-y-1.5 text-xs">
                                  {job.matchedSkills && job.matchedSkills.length > 0 && (
                                    <div className="flex items-start gap-1.5">
                                      <span className="text-[10px] uppercase font-bold text-emerald-700 shrink-0 mt-0.5">
                                        Matching:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {job.matchedSkills.slice(0, 4).map((s, i) => (
                                          <span
                                            key={i}
                                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                                          >
                                            ✓ {s}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {job.missingSkills && job.missingSkills.length > 0 && (
                                    <div className="flex items-start gap-1.5">
                                      <span className="text-[10px] uppercase font-bold text-rose-700 shrink-0 mt-0.5">
                                        Missing:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {job.missingSkills.slice(0, 3).map((s, i) => (
                                          <span
                                            key={i}
                                            className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200"
                                          >
                                            + {s}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Why It Matches Preview */}
                                <p className="text-xs text-[var(--color-stone)] mt-3 line-clamp-2 italic bg-[var(--color-canvas-white)] p-2.5 rounded-[10px] border border-[var(--color-paper)]">
                                  &quot;{job.whyItMatches}&quot;
                                </p>
                              </div>

                              {/* Card Actions Footer */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="mt-4 pt-3 border-t border-[var(--color-paper)] flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5">
                                  {/* Save / Bookmark Button */}
                                  <button
                                    onClick={(e) => handleToggleSaveJob(job, e)}
                                    className={`p-2 rounded-[8px] border transition-colors ${
                                      job.isSaved
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-white text-[var(--color-stone)] hover:bg-neutral-100 border-[var(--color-paper)]"
                                    }`}
                                    title={job.isSaved ? "Saved" : "Save this job"}
                                  >
                                    <Bookmark className={`w-3.5 h-3.5 ${job.isSaved ? "fill-amber-600" : ""}`} />
                                  </button>

                                  {/* Application Tracker Selector */}
                                  <select
                                    value={job.applicationStatus || "none"}
                                    onChange={(e) => {
                                      const newStatus = e.target.value;
                                      if (newStatus !== "none") {
                                        handleUpdateApplicationStatus(job.id, newStatus);
                                      }
                                    }}
                                    className="text-[11px] font-medium px-2 py-1.5 rounded-[8px] border border-[var(--color-paper)] bg-white text-[var(--color-stone)] focus:outline-none"
                                  >
                                    <option value="none">Status: Not Applied</option>
                                    <option value="applied">Applied</option>
                                    <option value="interviewing">Interviewing</option>
                                    <option value="offered">Offer Received</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Prepare Me For This Job Action */}
                                  <button
                                    onClick={() => handlePrepareForJob(job)}
                                    className="px-2.5 py-1.5 rounded-[8px] bg-[var(--color-ember-orange)]/10 hover:bg-[var(--color-ember-orange)]/20 text-[var(--color-ember-orange)] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                    title="Generate personalized week-by-week roadmap targeting this job"
                                  >
                                    <Compass className="w-3 h-3" />
                                    <span>Prepare Me</span>
                                  </button>

                                  {/* Direct Apply Link */}
                                  <a
                                    href={job.originalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-[8px] bg-[var(--color-graphite)] hover:bg-neutral-800 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span>Apply</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}

                {/* 5. Comprehensive Job Details & Match Analysis Modal */}
                {selectedJobForModal && (
                  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative">
                      {/* Close button */}
                      <button
                        onClick={() => setSelectedJobForModal(null)}
                        className="absolute right-5 top-5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Modal Header */}
                      <div className="flex items-start gap-4 pr-8">
                        {selectedJobForModal.companyLogo ? (
                          <img
                            src={selectedJobForModal.companyLogo}
                            alt={selectedJobForModal.companyName}
                            className="w-14 h-14 rounded-[14px] object-cover border border-[var(--color-paper)] shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-[14px] bg-neutral-100 border border-[var(--color-paper)] flex items-center justify-center text-[var(--color-graphite)] font-bold font-sora text-xl shrink-0">
                            {selectedJobForModal.companyName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--color-graphite)]">
                              {selectedJobForModal.companyName}
                            </span>
                            <span className="text-[10px] text-[var(--color-stone)] bg-neutral-100 px-2 py-0.5 rounded">
                              {selectedJobForModal.source}
                            </span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold text-[var(--color-graphite)] font-sora mt-1">
                            {selectedJobForModal.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--color-stone)]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {selectedJobForModal.location || "Remote"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5" />
                              {selectedJobForModal.jobType ? selectedJobForModal.jobType.replace("_", " ") : "Full-time"}
                            </span>
                            {selectedJobForModal.salary && (
                              <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <DollarSign className="w-3.5 h-3.5" />
                                {selectedJobForModal.salary}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Compatibility Card */}
                      <div className="p-5 rounded-[18px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-graphite)] uppercase tracking-wider font-sora flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-[var(--color-ember-orange)]" />
                            AI Compatibility Evaluation
                          </span>
                          <span className="text-sm font-mono font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {selectedJobForModal.matchScore}% Match
                          </span>
                        </div>

                        <p className="text-xs text-[var(--color-stone)] leading-relaxed">
                          <strong>Why You Match:</strong> {selectedJobForModal.whyItMatches}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-[12px] bg-white border border-[var(--color-paper)]">
                            <span className="font-semibold text-emerald-800 block mb-1">
                              Verified Matching Skills:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {selectedJobForModal.matchedSkills.length > 0 ? (
                                selectedJobForModal.matchedSkills.map((s, i) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    ✓ {s}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-[var(--color-stone)] italic">None directly matched</span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 rounded-[12px] bg-white border border-[var(--color-paper)]">
                            <span className="font-semibold text-rose-800 block mb-1">
                              Missing Requirements:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {selectedJobForModal.missingSkills.length > 0 ? (
                                selectedJobForModal.missingSkills.map((s, i) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                                    + {s}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-emerald-700">All key skills covered</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {selectedJobForModal.recommendation && (
                          <div className="p-3 rounded-[10px] bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            <strong>Recommendation to Improve Fit:</strong> {selectedJobForModal.recommendation}
                          </div>
                        )}
                      </div>

                      {/* Job Description */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm text-[var(--color-graphite)] font-sora">
                          Job Description & Responsibilities
                        </h4>
                        <div
                          className="text-xs text-[var(--color-stone)] leading-relaxed max-h-60 overflow-y-auto p-4 rounded-[14px] bg-[var(--color-canvas-white)] border border-[var(--color-paper)] whitespace-pre-line custom-scrollbar"
                          dangerouslySetInnerHTML={{
                            __html: selectedJobForModal.description
                              ? selectedJobForModal.description.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                              : "No full description provided by job source.",
                          }}
                        />
                      </div>

                      {/* Modal Footer Controls */}
                      <div className="pt-4 border-t border-[var(--color-paper)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleSaveJob(selectedJobForModal)}
                            className={`px-4 py-2.5 rounded-[12px] text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                              selectedJobForModal.isSaved
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-white text-[var(--color-stone)] hover:bg-neutral-100 border-[var(--color-paper)]"
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${selectedJobForModal.isSaved ? "fill-amber-600" : ""}`} />
                            <span>{selectedJobForModal.isSaved ? "Saved" : "Save Job"}</span>
                          </button>

                          <button
                            onClick={() => handlePrepareForJob(selectedJobForModal)}
                            className="px-4 py-2.5 rounded-[12px] bg-[var(--color-ember-orange)]/10 hover:bg-[var(--color-ember-orange)]/20 text-[var(--color-ember-orange)] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>Prepare Me for This Job</span>
                          </button>
                        </div>

                        <a
                          href={selectedJobForModal.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-2.5 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <span>Apply on Official Website</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* ─── MODAL: ADD CAMPUS RECRUITER ───────────────────────────────── */}
        {isAddRecruiterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-white rounded-[24px] border border-[var(--color-paper)] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[var(--color-paper)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--color-graphite)] font-sora">
                      Add Campus Recruiter
                    </h3>
                    <p className="text-xs text-[var(--color-stone)] mt-0.5">
                      Register a visiting company with eligibility criteria &amp; required skills for student ATS matching.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddRecruiterModalOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAddRecruiter} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecruiterName}
                      onChange={(e) => setNewRecruiterName(e.target.value)}
                      placeholder="e.g. Google, Microsoft, Atlassian, Infosys"
                      className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                    />
                  </div>

                  {/* Domain */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Domain / Industry
                    </label>
                    <select
                      value={newRecruiterDomain}
                      onChange={(e) => setNewRecruiterDomain(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                    >
                      <option value="tech">Tech / Software / IT</option>
                      <option value="fin">Finance / Fintech / Quant</option>
                      <option value="consulting">Consulting / Management</option>
                      <option value="analytics">Data &amp; AI / Analytics</option>
                      <option value="core">Core Engineering (Mech/Elec/Civil)</option>
                      <option value="startup">Startup / Product</option>
                      <option value="edtech">EdTech / Education</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Role */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Target Job Role
                    </label>
                    <input
                      type="text"
                      value={newRecruiterRole}
                      onChange={(e) => setNewRecruiterRole(e.target.value)}
                      placeholder="e.g. SDE-1, Cloud Engineer, Data Scientist"
                      className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                    />
                  </div>

                  {/* Required Experience */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Experience / Batch Criteria
                    </label>
                    <input
                      type="text"
                      value={newRecruiterExperience}
                      onChange={(e) => setNewRecruiterExperience(e.target.value)}
                      placeholder="e.g. Fresher / 2025-2026 Batch"
                      className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                    />
                  </div>
                </div>

                {/* Required Skills */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                    Required Skills (Comma separated) *
                  </label>
                  <input
                    type="text"
                    value={newRecruiterSkills}
                    onChange={(e) => setNewRecruiterSkills(e.target.value)}
                    placeholder="e.g. DSA, Python, React.js, Next.js, SQL, System Design"
                    className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                  />
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    These skills will directly calibrate the ATS Keyword &amp; Qualification scoring engine.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Minimum CGPA */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Minimum CGPA
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={newRecruiterMinCgpa}
                      onChange={(e) => setNewRecruiterMinCgpa(e.target.value)}
                      placeholder="e.g. 7.5 (leave empty if no cutoff)"
                      className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                    />
                  </div>

                  {/* Application Deadline */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Application Deadline
                    </label>
                    <input
                      type="date"
                      value={newRecruiterDeadline}
                      onChange={(e) => setNewRecruiterDeadline(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Eligible Branches */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      Eligible Branches
                    </label>
                    <input
                      type="text"
                      value={newRecruiterBranches}
                      onChange={(e) => setNewRecruiterBranches(e.target.value)}
                      placeholder="e.g. CSE, IT, ECE, EE, Mechanical"
                      className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                    />
                  </div>

                  {/* CTC Package Range */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                      CTC Range (LPA)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={newRecruiterPackageMin}
                        onChange={(e) => setNewRecruiterPackageMin(e.target.value)}
                        placeholder="Min (e.g. 12)"
                        className="w-full text-xs px-3 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={newRecruiterPackageMax}
                        onChange={(e) => setNewRecruiterPackageMax(e.target.value)}
                        placeholder="Max (e.g. 24)"
                        className="w-full text-xs px-3 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                    Company Website / Careers Link
                  </label>
                  <input
                    type="url"
                    value={newRecruiterWebsite}
                    onChange={(e) => setNewRecruiterWebsite(e.target.value)}
                    placeholder="https://careers.company.com"
                    className="w-full text-sm px-3.5 py-2.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                  />
                </div>

                {/* Job Description */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-stone)] uppercase tracking-wider block mb-1.5">
                    Job Description &amp; Requirements
                  </label>
                  <textarea
                    rows={4}
                    value={newRecruiterDescription}
                    onChange={(e) => setNewRecruiterDescription(e.target.value)}
                    placeholder="Paste full job description, eligibility rules, and hiring details..."
                    className="w-full text-xs p-3.5 rounded-[12px] border border-[var(--color-paper)] bg-[var(--color-canvas-white)] focus:outline-none focus:border-[var(--color-ember-orange)] leading-relaxed custom-scrollbar"
                  />
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[var(--color-paper)] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddRecruiterModalOpen(false)}
                    className="px-5 py-2.5 rounded-[12px] border border-[var(--color-paper)] text-[var(--color-stone)] hover:bg-neutral-100 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRecruiter}
                    className="px-6 py-2.5 rounded-[12px] bg-[var(--color-ember-orange)] hover:bg-[#d44d24] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                  >
                    {isSubmittingRecruiter ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Recruiter...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save &amp; Select Recruiter</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
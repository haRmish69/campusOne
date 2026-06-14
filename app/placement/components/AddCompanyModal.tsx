"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Building2, AlertCircle } from "lucide-react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddCompanyModal({ onClose, onSuccess }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    domain: "tech",
    packageMin: "",
    packageMax: "",
    interviewRounds: "",
    topSkillsRequired: "",
    lastVisitedYear: new Date().getFullYear().toString(),
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<{ companyId: string; companyName: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setDuplicate(null);

    try {
      const skillsArray = formData.topSkillsRequired
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      if (skillsArray.length === 0) {
        setError("Please add at least one skill");
        setIsLoading(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        domain: formData.domain,
        packageMin: formData.packageMin ? parseFloat(formData.packageMin) : null,
        packageMax: formData.packageMax ? parseFloat(formData.packageMax) : null,
        interviewRounds: formData.interviewRounds ? parseInt(formData.interviewRounds) : null,
        lastVisitedYear: formData.lastVisitedYear ? parseInt(formData.lastVisitedYear) : null,
        topSkillsRequired: skillsArray,
        description: formData.description || null,
      };

      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        // Duplicate found
        const data = await res.json();
        setDuplicate({ companyId: data.companyId, companyName: data.companyName });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add company");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToExistingCompany = () => {
    if (duplicate) {
      onClose();
      router.push(`/placement/${duplicate.companyId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-[20px] shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border/60 flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="text-xl font-semibold text-[var(--color-midnight-navy)] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--color-electric-indigo)]" />
            Add Company
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:bg-[var(--color-fog)] rounded-[12px] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate detected */}
        {duplicate && (
          <div className="p-5 space-y-4">
            <div className="p-4 bg-[var(--color-pearl)] border border-[var(--color-paper)] rounded-[20px] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--color-stone)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--color-graphite)]">
                  &quot;{duplicate.companyName}&quot; already exists for your college!
                </p>
                <p className="text-xs text-[var(--color-stone)] mt-1">
                  Would you like to share your experience or add questions instead?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-slate-blue)] hover:text-[var(--color-midnight-navy)] transition-colors"
              >
                It&apos;s a different company
              </button>
              <button
                type="button"
                onClick={goToExistingCompany}
                className="px-4 py-2 bg-[var(--color-midnight-navy)] hover:bg-[var(--color-midnight-navy)]/90 text-white text-sm font-medium rounded-[20px] shadow-sm transition-colors"
              >
                Go to Company Page →
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {!duplicate && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 text-sm text-[var(--color-ember-orange)] bg-[var(--color-canvas-white)] rounded-[20px] border border-[var(--color-paper)]">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                Company Name *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Google"
                className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                Domain *
              </label>
              <select
                required
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
              >
                <option value="tech">Tech</option>
                <option value="finance">Finance</option>
                <option value="consulting">Consulting</option>
                <option value="core">Core</option>
                <option value="product">Product</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                  Min Package (LPA)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.packageMin}
                  onChange={(e) => setFormData({ ...formData, packageMin: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                  Max Package (LPA)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.packageMax}
                  onChange={(e) => setFormData({ ...formData, packageMax: e.target.value })}
                  placeholder="e.g. 20"
                  className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                  Interview Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.interviewRounds}
                  onChange={(e) => setFormData({ ...formData, interviewRounds: e.target.value })}
                  placeholder="e.g. 4"
                  className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                  Last Visited Year
                </label>
                <input
                  type="number"
                  min="2000"
                  max={new Date().getFullYear()}
                  value={formData.lastVisitedYear}
                  onChange={(e) => setFormData({ ...formData, lastVisitedYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                Top Skills Required * <span className="text-xs text-muted-foreground">(comma separated)</span>
              </label>
              <input
                required
                type="text"
                value={formData.topSkillsRequired}
                onChange={(e) => setFormData({ ...formData, topSkillsRequired: e.target.value })}
                placeholder="e.g. React, Node.js, System Design"
                className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-slate-blue)]">
                Description <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief info about the company, role offered, etc."
                className="w-full px-3 py-2 rounded-[20px] border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 h-20 resize-none"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border/60">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-[var(--color-slate-blue)] hover:text-[var(--color-midnight-navy)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-[var(--color-midnight-navy)] hover:bg-[var(--color-midnight-navy)]/90 text-white text-sm font-medium rounded-[20px] shadow-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? "Adding..." : "Add Company"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

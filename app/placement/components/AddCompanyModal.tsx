"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

const DOMAINS = [
  { value: "tech", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "consulting", label: "Consulting" },
  { value: "core", label: "Core Engineering" },
  { value: "product", label: "Product" },
  { value: "other", label: "Other" },
];

export default function AddCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    domain: "tech",
    packageMin: "",
    packageMax: "",
    interviewRounds: "",
    description: "",
    websiteUrl: "",
    lastVisitedYear: new Date().getFullYear().toString(),
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return;
    if (skills.length === 0) {
      alert("Please add at least one skill requirement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          domain: form.domain,
          packageMin: form.packageMin ? parseFloat(form.packageMin) : null,
          packageMax: form.packageMax ? parseFloat(form.packageMax) : null,
          interviewRounds: form.interviewRounds ? parseInt(form.interviewRounds) : null,
          topSkillsRequired: skills,
          description: form.description.trim() || null,
          websiteUrl: form.websiteUrl.trim() || null,
          lastVisitedYear: form.lastVisitedYear ? parseInt(form.lastVisitedYear) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add company");
      }

      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to add company");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-border/40 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-slate-800">Add New Company</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Google, TCS, Infosys"
              className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
              required
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domain <span className="text-red-500">*</span></label>
            <select
              value={form.domain}
              onChange={e => setForm({ ...form, domain: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all bg-white"
            >
              {DOMAINS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Package Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Package (LPA)</label>
              <input
                type="number"
                value={form.packageMin}
                onChange={e => setForm({ ...form, packageMin: e.target.value })}
                placeholder="e.g. 8"
                step="0.1"
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Package (LPA)</label>
              <input
                type="number"
                value={form.packageMax}
                onChange={e => setForm({ ...form, packageMax: e.target.value })}
                placeholder="e.g. 15"
                step="0.1"
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
              />
            </div>
          </div>

          {/* Interview Rounds & Last Visited Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Rounds</label>
              <input
                type="number"
                value={form.interviewRounds}
                onChange={e => setForm({ ...form, interviewRounds: e.target.value })}
                placeholder="e.g. 3"
                min="1"
                max="10"
                className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Visited Year</label>
              <input
                type="number"
                value={form.lastVisitedYear}
                onChange={e => setForm({ ...form, lastVisitedYear: e.target.value })}
                placeholder="e.g. 2026"
                min="2020"
                max="2030"
                className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a skill and press Enter"
                className="flex-1 px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-3 py-2 rounded-lg bg-[var(--color-fog)] text-[var(--color-midnight-navy)] text-sm font-medium hover:bg-[var(--color-cloud)] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description about the company and roles offered..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all resize-none"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website URL</label>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-indigo)]/30 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-midnight-navy)] hover:bg-[var(--color-midnight-navy)]/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Add Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

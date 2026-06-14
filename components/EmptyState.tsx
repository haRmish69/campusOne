"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  subtitle: string;
  ctaLabel: string;
  onCtaClick: () => void;
}

export function EmptyState({
  icon: Icon,
  heading,
  subtitle,
  ctaLabel,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 pb-10 text-center">
      <Icon size={48} className="text-[var(--color-fog)] mb-6" />
      <h3 className="text-[24px] font-semibold text-[var(--color-graphite)] mb-2">
        {heading}
      </h3>
      <p className="text-[16px] text-[var(--color-stone)] mb-8 max-w-sm">
        {subtitle}
      </p>
      <button
        onClick={onCtaClick}
        style={{ boxShadow: "rgba(0,0,0,0.25) 0px 4px 10px 0px" }}
        className="px-6 py-3 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[16px] font-medium hover:opacity-90 transition-opacity"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

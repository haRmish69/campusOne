import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCtaClick: () => void;
}

export function PageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
}: PageHeaderProps) {
  return (
    <>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-[13px] text-[var(--color-pewter)] hover:text-[var(--color-slate-dark)] mb-8 transition-colors"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </Link>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-semibold text-[var(--color-graphite)]">
            {title}
          </h1>
          <p className="text-[15px] text-[var(--color-stone)] mt-1">
            {subtitle}
          </p>
        </div>
        <button
          onClick={onCtaClick}
          style={{ boxShadow: "rgba(0,0,0,0.25) 0px 4px 10px 0px" }}
          className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-[30px] bg-[var(--color-ember-orange)] text-white text-[14px] font-medium transition-all"
        >
          <Plus size={14} />
          {ctaLabel}
        </button>
      </div>
    </>
  );
}

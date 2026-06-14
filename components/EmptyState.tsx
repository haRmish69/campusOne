"use client";

import { Calendar, Receipt, Bell, Utensils, HeartPulse } from "lucide-react";
import { useRouter } from "next/navigation";

const iconMap = {
  Calendar,
  Receipt,
  Bell,
  Utensils,
  HeartPulse,
};

export type EmptyStateIconName = keyof typeof iconMap;

interface EmptyStateProps {
  iconName: EmptyStateIconName;
  heading: string;
  subtitle: string;
  ctaLabel: string;
  ctaAction?: "upload" | "chat" | "none";
  onCtaClick?: () => void;
}

export function EmptyState({
  iconName,
  heading,
  subtitle,
  ctaLabel,
  ctaAction = "none",
  onCtaClick,
}: EmptyStateProps) {
  const Icon = iconMap[iconName];
  const router = useRouter();

  const handleAction = () => {
    if (onCtaClick) {
      onCtaClick();
      return;
    }
    if (ctaAction === "upload") {
      document.getElementById('file-upload-input')?.click();
    } else if (ctaAction === "chat") {
      router.push('/chat');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-[40px] text-center bg-[#f5f5f5] rounded-[20px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.25)] border border-[#e5e7eb]">
      <Icon size={48} className="text-[#cbcbcb] mb-6" />
      <h3 className="text-[20px] font-bold text-[#1f1f1f] mb-2">
        {heading}
      </h3>
      <p className="text-[14px] text-[#707070] mb-8 max-w-sm">
        {subtitle}
      </p>
      {(ctaAction !== "none" || onCtaClick) && (
        <button
          onClick={handleAction}
          className="px-[24px] py-[12px] w-auto rounded-[50px] bg-[#ff5a2f] text-white text-[16px] font-[600] hover:bg-[#e04e28] transition-colors inline-flex items-center justify-center"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

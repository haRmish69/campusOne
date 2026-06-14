"use client";

import { EmptyState } from "@/components/EmptyState";
import { Utensils } from "lucide-react";

export function MessEmptyState() {
  return (
    <EmptyState 
      icon={Utensils} 
      heading="No menus uploaded" 
      subtitle="Upload today's menu to see what's for dinner" 
      ctaLabel="Upload Menu" 
      onCtaClick={() => document.getElementById('file-upload-input')?.click()} 
    />
  );
}

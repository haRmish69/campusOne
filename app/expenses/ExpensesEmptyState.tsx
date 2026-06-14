"use client";

import { EmptyState } from "@/components/EmptyState";
import { Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

export function ExpensesEmptyState() {
  const router = useRouter();
  return (
    <EmptyState 
      icon={Receipt} 
      heading="No expenses logged" 
      subtitle="Say 'I spent ₹200 on lunch' in the chat to log your first expense" 
      ctaLabel="Open Chat" 
      onCtaClick={() => router.push('/chat')} 
    />
  );
}

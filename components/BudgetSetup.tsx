"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

interface BudgetSetupProps {
  currentBudget: {
    totalLimit: number;
    categoryLimits: Record<string, number>;
  } | null;
  month: string;
}

const CATEGORIES = ["food", "travel", "academics", "rent", "subscriptions", "entertainment", "other"];

export function BudgetSetup({ currentBudget, month }: BudgetSetupProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [totalLimit, setTotalLimit] = useState(currentBudget?.totalLimit?.toString() || "");
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    CATEGORIES.forEach(c => {
      initial[c] = currentBudget?.categoryLimits?.[c]?.toString() || "";
    });
    return initial;
  });

  const handleLimitChange = (category: string, value: string) => {
    setLimits(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalLimit) {
      toast.error("Please set a total monthly limit.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Saving budget...");

    try {
      const categoryLimits: Record<string, number> = {};
      CATEGORIES.forEach(c => {
        categoryLimits[c] = parseFloat(limits[c]) || 0;
      });

      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          totalLimit: parseFloat(totalLimit),
          categoryLimits
        }),
      });

      if (!res.ok) throw new Error("Failed to save budget");

      toast.success("Budget updated successfully!", { id: toastId });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save budget", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-sm mb-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Budget Setup</CardTitle>
        <CardDescription>Set your spending limits for {new Date(month + "-01").toLocaleDateString('default', { month: 'long', year: 'numeric' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <Label htmlFor="totalLimit" className="text-base font-semibold text-primary">Total Monthly Limit (₹)</Label>
            <Input 
              id="totalLimit" 
              type="number" 
              placeholder="e.g. 15000" 
              value={totalLimit}
              onChange={(e) => setTotalLimit(e.target.value)}
              className="text-lg font-medium"
              required
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Category Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORIES.map(category => (
                <div key={category} className="space-y-1.5 flex flex-col justify-end">
                  <Label htmlFor={`limit-${category}`} className="capitalize">{category}</Label>
                  <Input 
                    id={`limit-${category}`}
                    type="number" 
                    placeholder="₹ 0" 
                    value={limits[category]}
                    onChange={(e) => handleLimitChange(category, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Budget</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface CategoryStatus {
  category: string;
  limit: number;
  spent: number;
  percentage: number;
  status: string; // "under" | "near" | "over"
}

interface BudgetStatusProps {
  categoryStatus: CategoryStatus[];
}

export function BudgetStatus({ categoryStatus }: BudgetStatusProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});

  const hasNearOrOver = categoryStatus.some(c => c.status === "near" || c.status === "over");

  const handleGetSuggestions = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Analyzing budget...", {
      description: "Gemini is generating smart spending suggestions."
    });

    try {
      const res = await fetch("/api/suggestions", { method: "POST" });
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      
      const data = await res.json();
      
      const newSuggestions: Record<string, string[]> = {};
      if (Array.isArray(data.suggestions)) {
        data.suggestions.forEach((s: any) => {
          newSuggestions[s.category] = s.suggestions;
        });
      }
      
      setSuggestions(newSuggestions);
      
      if (data.suggestions.length > 0) {
        toast.success("Suggestions ready!", { id: toastId });
      } else {
        toast.success("You're doing great! No specific suggestions needed right now.", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  if (categoryStatus.length === 0) {
    return (
      <Card className="w-full shadow-sm">
        <CardContent className="pt-6 text-center text-muted-foreground">
          No budget limits set yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-sm mb-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Budget Status</CardTitle>
        <CardDescription>Track your spending against your limits.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-5">
          {categoryStatus.map((cat) => {
            let colorClass = "bg-emerald-500";
            let textColor = "text-emerald-700";
            let bgLight = "bg-emerald-50";
            let icon = <Info className="w-4 h-4 mr-1 text-emerald-600" />;

            if (cat.status === "over") {
              colorClass = "bg-red-500";
              textColor = "text-red-700";
              bgLight = "bg-red-50";
              icon = <AlertTriangle className="w-4 h-4 mr-1 text-red-600" />;
            } else if (cat.status === "near") {
              colorClass = "bg-amber-500";
              textColor = "text-amber-700";
              bgLight = "bg-amber-50";
              icon = <AlertTriangle className="w-4 h-4 mr-1 text-amber-600" />;
            }

            const catSuggestions = suggestions[cat.category];

            return (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{cat.category}</span>
                  <span className="text-muted-foreground tabular-nums">
                    ₹{cat.spent.toLocaleString()} / ₹{cat.limit.toLocaleString()}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                  />
                </div>
                
                {/* Status Indicator */}
                <div className={`text-xs ${textColor} flex items-center justify-between`}>
                  <div className="flex items-center">
                    {icon}
                    {cat.percentage.toFixed(0)}% spent
                  </div>
                </div>

                {/* AI Suggestions Dropdown/Cards */}
                {catSuggestions && catSuggestions.length > 0 && (
                  <div className={`mt-3 p-3 rounded-lg border border-dashed ${bgLight} text-sm space-y-2`}>
                    <div className="flex items-center font-semibold text-midnight-navy mb-1">
                      <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
                      Smart Suggestions
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {catSuggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasNearOrOver && (
          <Button 
            variant="outline" 
            className="w-full mt-4 bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-amber-700 hover:text-amber-800"
            onClick={handleGetSuggestions}
            disabled={isGenerating}
          >
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Lightbulb className="w-4 h-4 mr-2" /> Get AI Spending Suggestions</>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FileUpload } from "./FileUpload";

export function ExpenseEntry() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("auto");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      toast.error("Please fill in amount and description");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Adding expense...");

    try {
      const payload: any = {
        amount: parseFloat(amount),
        description,
        date: new Date(date).toISOString(),
        source: "manual",
      };

      // Only pass category if they overrode the "auto" suggestion
      if (category !== "auto") {
        payload.category = category;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to add expense");

      toast.success("Expense added successfully!", { id: toastId });
      
      // Reset form
      setAmount("");
      setDescription("");
      setCategory("auto");
      setDate(new Date().toISOString().split("T")[0]);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CATEGORY_OPTIONS = [
    { value: "auto", label: "✨ Auto" },
    { value: "food", label: "Food" },
    { value: "travel", label: "Transport" },
    { value: "academics", label: "Academics" },
    { value: "rent", label: "Rent" },
    { value: "subscriptions", label: "Subscriptions" },
    { value: "entertainment", label: "Entertainment" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="w-full bg-[#ffffff] border border-[#f0f0f0] rounded-[16px] shadow-[0px_2px_12px_rgba(0,0,0,0.06)] p-[24px]">
      <div className="mb-[16px]">
        <span className="text-[10px] uppercase font-bold text-[#ff5a2f] bg-[#ff5a2f]/10 px-2 py-1 rounded-[50px] inline-block">
          + Log Expense
        </span>
      </div>
      
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#1f1f1f] rounded-[10px] p-[3px] h-[32px]">
          <TabsTrigger 
            value="manual" 
            className="py-1 h-full data-[state=active]:bg-white data-[state=active]:text-[#1f1f1f] data-[state=active]:font-[500] data-[state=active]:shadow-[0px_1px_4px_rgba(0,0,0,0.08)] text-[#555555] text-[12px] transition-all rounded-[8px]"
          >
            Manual Entry
          </TabsTrigger>
          <TabsTrigger 
            value="receipt" 
            className="py-1 h-full data-[state=active]:bg-white data-[state=active]:text-[#1f1f1f] data-[state=active]:font-[500] data-[state=active]:shadow-[0px_1px_4px_rgba(0,0,0,0.08)] text-[#555555] text-[12px] transition-all rounded-[8px]"
          >
            Scan Receipt
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-[10px] font-bold text-[#a5a5a5] uppercase tracking-[0.07em]">Amount (₹)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="e.g. 250" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-[36px] bg-[#fafafa] border-0 border-b border-[#efefef] rounded-none px-0 text-[13px] font-[500] text-[#1f1f1f] placeholder:text-[#cbcbcb] placeholder:font-normal focus-visible:ring-0 focus-visible:shadow-[0_0_0_2px_rgba(255,90,47,0.15)] focus-visible:bg-[#ffffff] focus-visible:border-transparent focus-visible:rounded-[4px] focus-visible:px-2 focus-visible:-mx-2 transition-all duration-150 ease-out"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date" className="text-[10px] font-bold text-[#a5a5a5] uppercase tracking-[0.07em]">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="h-[36px] bg-[#fafafa] border-0 border-b border-[#efefef] rounded-none px-0 text-[13px] font-[500] text-[#1f1f1f] focus-visible:ring-0 focus-visible:shadow-[0_0_0_2px_rgba(255,90,47,0.15)] focus-visible:bg-[#ffffff] focus-visible:border-transparent focus-visible:rounded-[4px] focus-visible:px-2 focus-visible:-mx-2 transition-all duration-150 ease-out"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="description" className="text-[10px] font-bold text-[#a5a5a5] uppercase tracking-[0.07em]">Description</Label>
              <Input 
                id="description" 
                placeholder="e.g. Lunch at cafeteria" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-[36px] bg-[#fafafa] border-0 border-b border-[#efefef] rounded-none px-0 text-[13px] font-[500] text-[#1f1f1f] placeholder:text-[#cbcbcb] placeholder:font-normal focus-visible:ring-0 focus-visible:shadow-[0_0_0_2px_rgba(255,90,47,0.15)] focus-visible:bg-[#ffffff] focus-visible:border-transparent focus-visible:rounded-[4px] focus-visible:px-2 focus-visible:-mx-2 transition-all duration-150 ease-out"
              />
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-[10px] font-bold text-[#a5a5a5] uppercase tracking-[0.07em] block mb-1">Category</Label>
              <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-1 px-1">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`whitespace-nowrap px-[14px] py-[6px] rounded-[20px] text-[11px] font-[500] transition-colors ${
                      category === opt.value
                        ? "bg-[#ff5a2f] text-white"
                        : "bg-[#f5f5f5] text-[#707070] hover:bg-[#e5e5e5]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-[180px] h-[40px] bg-[#ff6b45] hover:bg-[#ff5a2f] text-white rounded-[50px] text-[13px] font-[600] tracking-[0.02em] shadow-[0px_3px_8px_rgba(255,90,47,0.15)] transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <>Add Expense <span className="text-[14px] leading-none ml-1">&rarr;</span></>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="receipt">
          <div className="pt-2">
            <FileUpload apiEndpoint="/api/expenses" onSuccess={() => router.refresh()} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

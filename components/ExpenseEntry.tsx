"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Receipt } from "lucide-react";
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

  return (
    <Card className="w-full shadow-sm mb-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Log an Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual"><Plus className="w-4 h-4 mr-2" /> Manual Entry</TabsTrigger>
            <TabsTrigger value="receipt"><Receipt className="w-4 h-4 mr-2" /> Scan Receipt</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    step="0.01" 
                    placeholder="e.g. 250" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="e.g. Lunch at cafeteria" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val || "")}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">✨ Auto Categorize (AI)</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="academics">Academics</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="subscriptions">Subscriptions</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Add Expense"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="receipt">
            <div className="pt-2">
              <FileUpload apiEndpoint="/api/expenses" onSuccess={() => router.refresh()} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

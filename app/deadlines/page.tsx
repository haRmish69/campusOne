"use client";

import { useState, useEffect } from "react";
import { Deadline } from "@prisma/client";
import { FileUpload } from "@/components/FileUpload";
import { DeadlineCard } from "@/components/DeadlineCard";
import { EmptyState } from "@/components/EmptyState";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeadlines = async () => {
    try {
      const res = await fetch("/api/deadlines");
      const data = await res.json();
      if (data.deadlines) {
        setDeadlines(data.deadlines);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const handleToggleComplete = async (id: string, isComplete: boolean) => {
    // Optimistic update
    setDeadlines(prev => 
      prev.map(d => d.id === id ? { ...d, isComplete } : d)
    );
    
    if (isComplete) {
      toast.success("Marked as completed!");
    }

    try {
      await fetch(`/api/deadlines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete }),
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
      // Revert on error
      fetchDeadlines();
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setDeadlines(prev => prev.filter(d => d.id !== id));
    toast.success("Deadline deleted!");
    
    try {
      await fetch(`/api/deadlines/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete deadline");
      fetchDeadlines(); // Revert
    }
  };

  const upcoming = deadlines.filter(d => !d.isComplete);
  const completed = deadlines.filter(d => d.isComplete);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Deadline Brain</h1>
        <p className="text-muted-foreground">
          Never miss an assignment again. Upload a syllabus or paste instructions, and AI will automatically add the deadlines to your tracker.
        </p>
      </div>
      
      <div className="flex flex-col space-y-12">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6 text-[var(--color-midnight-navy)]">Add Deadline</h2>
            <div className="max-w-2xl">
              <FileUpload apiEndpoint="/api/deadlines/ingest" onSuccess={fetchDeadlines} />
            </div>
          </div>
        </div>
        
        <div>
          <Tabs defaultValue="upcoming" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-midnight-navy)]">Your Tracker</h2>
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="upcoming" className="mt-0">
              {isLoading ? (
                <div className="text-center py-12">Loading...</div>
              ) : upcoming.length === 0 ? (
                <EmptyState 
                  iconName="Calendar" 
                  heading="You're all caught up" 
                  subtitle="Upload your syllabus to auto-extract deadlines" 
                  ctaLabel="Upload Syllabus" 
                  ctaAction="upload"
                />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {upcoming.map((deadline) => (
                    <DeadlineCard 
                      key={deadline.id} 
                      deadline={deadline} 
                      onToggleComplete={handleToggleComplete} 
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0">
              {completed.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
                  <p className="text-muted-foreground">No completed deadlines.</p>
                  <p className="text-sm text-muted-foreground mt-1">Get to work!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {completed.map((deadline) => (
                    <DeadlineCard 
                      key={deadline.id} 
                      deadline={deadline} 
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

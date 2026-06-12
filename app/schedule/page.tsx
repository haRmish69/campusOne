"use client";

import { useState, useEffect } from "react";
import { ClassSchedule } from "@prisma/client";
import { FileUpload } from "@/components/FileUpload";
import { ClassCard } from "@/components/ClassCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [studyPlan, setStudyPlan] = useState("");

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    toast.success("Class deleted!");
    
    try {
      await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete class");
      fetchSchedule(); // Revert
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const generateStudyPlan = async () => {
    setIsGeneratingPlan(true);
    setStudyPlan("");
    try {
      const res = await fetch("/api/study-plan");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setStudyPlan(prev => prev + text);
      }
    } catch (error) {
      console.error(error);
      setStudyPlan("Failed to generate study plan. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Group by days
  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const groupedSchedules = daysOrder.map(day => {
    const classesForDay = schedules.filter(s => s.day.toLowerCase() === day.toLowerCase());
    return {
      day,
      classes: classesForDay.sort((a, b) => a.startTime.localeCompare(b.startTime))
    };
  }).filter(group => group.classes.length > 0);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Class Schedule</h1>
          <p className="text-muted-foreground max-w-xl">
            Upload your timetable and let AI parse it. Then, generate a personalized weekly study plan based on your classes and deadlines.
          </p>
        </div>
        
        {schedules.length > 0 && (
          <Button 
            onClick={generateStudyPlan} 
            disabled={isGeneratingPlan}
            className="shrink-0 bg-primary hover:bg-primary/90 shadow-md transition-all gap-2 h-11 px-6 font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            {isGeneratingPlan ? "Thinking..." : "Generate AI Study Plan"}
          </Button>
        )}
      </div>

      {studyPlan && (
        <div className="mb-12 p-6 rounded-xl border border-primary/20 bg-primary/5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-24 h-24" />
          </div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            Your Custom Study Plan
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border">
            <ReactMarkdown
              components={{
                p: ({node, ...props}: any) => <p className="mb-3" {...props} />,
                ul: ({node, ...props}: any) => <ul className="list-disc ml-4 mb-3" {...props} />,
                ol: ({node, ...props}: any) => <ol className="list-decimal ml-4 mb-3" {...props} />,
                li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
                h3: ({node, ...props}: any) => <h3 className="text-lg font-semibold mt-6 mb-2" {...props} />,
              }}
            >
              {studyPlan}
            </ReactMarkdown>
          </div>
        </div>
      )}
      
      <div className="flex flex-col space-y-12">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6 text-[var(--color-midnight-navy)]">Add Classes</h2>
            <div className="max-w-2xl">
              <FileUpload apiEndpoint="/api/schedule/ingest" onSuccess={fetchSchedule} />
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-8 text-[var(--color-midnight-navy)]">Your Week</h2>
          
          {isLoading ? (
            <div className="text-center py-12">Loading schedule...</div>
          ) : groupedSchedules.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-lg bg-muted/10">
              <p className="text-muted-foreground">Your schedule is empty.</p>
              <p className="text-sm text-muted-foreground mt-1">Upload a picture of your timetable to begin.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedSchedules.map((group) => (
                <div key={group.day} className="relative">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                    {group.day}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[16px]">
                    {group.classes.map(c => (
                      <ClassCard key={c.id} classItem={c} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

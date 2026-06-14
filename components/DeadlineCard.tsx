"use client";

import { Deadline } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, FileText, BookOpen, PenTool, LayoutTemplate, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DeadlineCardProps {
  deadline: Deadline;
  onToggleComplete?: (id: string, isComplete: boolean) => void;
  onDelete?: (id: string) => void;
}

export function DeadlineCard({ deadline, onToggleComplete, onDelete }: DeadlineCardProps) {
  const isComplete = deadline.isComplete;
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "exam": return <PenTool className="w-4 h-4" />;
      case "assignment": return <FileText className="w-4 h-4" />;
      case "project": return <LayoutTemplate className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const formattedDate = new Date(deadline.dueDate).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });

  const now = new Date();
  const due = new Date(deadline.dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
  
  let timeStr = "";
  if (isComplete) {
    timeStr = "Done";
  } else if (diffDays < 0) {
    timeStr = "Overdue";
  } else if (diffDays === 0) {
    timeStr = "Due Today";
  } else if (diffDays === 1) {
    timeStr = "Due Tomorrow";
  } else {
    timeStr = `In ${diffDays} days`;
  }

  return (
    <Card className={`overflow-hidden border transition-all duration-200 group relative ${isComplete ? 'opacity-60 bg-muted/50 border-border/40' : 'bg-card border-border/60 hover:shadow-md'}`}>
      <div className="flex p-6 gap-5 items-start pr-12">
        <div className="pt-1">
          <Checkbox 
            checked={isComplete} 
            onCheckedChange={onToggleComplete ? ((checked) => onToggleComplete(deadline.id, checked as boolean)) : undefined}
            disabled={!onToggleComplete}
            className="w-5 h-5 rounded-full border-[var(--color-paper)] data-[state=checked]:bg-[#10b981] data-[state=checked]:text-white data-[state=checked]:border-[#10b981] transition-colors"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className={`text-[12px] font-semibold px-2 py-0.5 rounded-[4px] flex items-center gap-1.5 ${isComplete ? 'bg-[var(--color-pearl)] text-[var(--color-pewter)]' : 'bg-[var(--color-ember-orange)]/10 text-[var(--color-ember-orange)]'}`}>
              {getTypeIcon(deadline.type)}
              <span className="uppercase tracking-wider">{deadline.subject}</span>
            </div>
            
            <div className={`text-[12px] flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] ${
              isComplete ? 'text-[var(--color-pewter)]' :
              diffDays < 0 ? 'text-red-600 font-bold bg-[var(--color-canvas-white)]' :
              diffDays <= 1 ? 'text-[var(--color-ember-orange)] font-bold' :
              diffDays <= 7 ? 'text-amber-500 font-medium' :
              'text-[var(--color-slate-blue)] font-medium'
            }`}>
              <CalendarClock className="w-3.5 h-3.5" />
              {timeStr}
            </div>
          </div>
          
          <CardTitle className={`text-lg font-bold truncate ${isComplete ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {deadline.title}
          </CardTitle>
          
          <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            <span>{formattedDate}</span>
          </div>
          
          {deadline.notes && (
            <p className={`text-sm mt-3 pt-3 border-t line-clamp-2 ${isComplete ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
              {deadline.notes}
            </p>
          )}

          {!isComplete && deadline.type === "exam" && diffDays <= 7 && (
            <div className="mt-4 pt-3 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
              <Link href={`/peer-learning?topic=${encodeURIComponent(deadline.subject)}`}>
                <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Find Peer to Study
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {onDelete && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.preventDefault(); onDelete(deadline.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Notice } from "@prisma/client";
import { formatDistanceToNow, isPast } from "date-fns";
import { Calendar, MapPin, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const categoryColors: Record<string, string> = {
  placement: "bg-green-500/10 text-green-500 border-green-500/20",
  exam: "bg-red-500/10 text-red-500 border-red-500/20",
  event: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  hostel: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  general: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export function NoticeCard({ notice }: { notice: Notice }) {
  const [expanded, setExpanded] = useState(false);

  const getDaysText = (date: Date | string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    if (isPast(d)) return "Past";
    return formatDistanceToNow(d, { addSuffix: true });
  };

  const daysText = getDaysText(notice.eventDate);
  const colorClass = categoryColors[notice.category?.toLowerCase()] || categoryColors.general;

  return (
    <Card className="flex flex-col overflow-hidden border border-border/50 bg-card hover:border-border transition-all duration-200 shadow-sm hover:shadow-md">
      {notice.actionRequired && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-amber-500 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{notice.actionRequired}</span>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge variant="outline" className={`uppercase text-[10px] tracking-wider font-semibold ${colorClass}`}>
            {notice.category}
          </Badge>
          {daysText && (
            <div className="flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">
              <Calendar className="w-3 h-3 mr-1" />
              {daysText}
            </div>
          )}
        </div>
        <CardTitle className="text-xl font-bold leading-tight tracking-tight text-card-foreground">
          {notice.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1">
        {notice.venue && (
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 mr-1.5 opacity-70 shrink-0" />
            {notice.venue}
          </div>
        )}
        
        <div className="relative">
          <div className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
            {notice.body}
          </div>
          {!expanded && notice.body.length > 150 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          )}
        </div>
      </CardContent>
      
      {notice.body.length > 150 && (
        <CardFooter className="pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3 mr-1" /> Show Less</>
            ) : (
              <><ChevronDown className="w-3 h-3 mr-1" /> Read More</>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

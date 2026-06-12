"use client";

import { ClassSchedule } from "@prisma/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, UserCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClassCardProps {
  classItem: ClassSchedule;
  onDelete?: (id: string) => void;
}

export function ClassCard({ classItem, onDelete }: ClassCardProps) {
  return (
    <Card className="overflow-hidden border border-border/50 bg-card hover:border-border hover:shadow-md transition-all duration-200">
      <CardHeader className="p-4 relative group">
        <div className="flex items-center justify-between mb-2 pr-6">
          <CardTitle className="text-lg font-bold text-foreground line-clamp-1" title={classItem.subject}>
            {classItem.subject}
          </CardTitle>
          <div className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-primary/10 text-primary shrink-0 ml-2">
            {classItem.day.substring(0, 3)}
          </div>
        </div>
        
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0 text-primary/70" />
            <span>{classItem.startTime} - {classItem.endTime}</span>
          </div>
          
          {classItem.room && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0 text-amber-500/80" />
              <span className="truncate" title={classItem.room}>{classItem.room}</span>
            </div>
          )}
          
          {classItem.faculty && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="w-4 h-4 shrink-0 text-blue-500/80" />
              <span className="truncate" title={classItem.faculty}>{classItem.faculty}</span>
            </div>
          )}
        </div>

        {onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.preventDefault(); onDelete(classItem.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
    </Card>
  );
}

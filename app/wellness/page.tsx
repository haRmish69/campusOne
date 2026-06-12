import { Heart } from "lucide-react";
import { WellnessCheckIn } from "@/components/WellnessCheckIn";
import { BurnoutRadar } from "@/components/BurnoutRadar";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function WellnessPage() {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const logs = await prisma.wellnessLog.findMany({
    where: { date: { gte: fourteenDaysAgo } },
    orderBy: { date: "asc" },
  });

  // Create an array of the last 14 days for the trend graph
  const trendData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(fourteenDaysAgo.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    
    // Find log for this day
    const log = logs.find(l => {
      const lDate = new Date(l.date);
      return lDate.toISOString().split("T")[0] === dateStr;
    });

    return {
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      mood: log ? log.mood : 0, // 0 means no data
      stress: log ? log.stressLevel : 0,
    };
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Heart className="w-8 h-8 text-primary" />
          Wellness & Burnout
        </h1>
        <p className="text-muted-foreground">
          Log your daily feelings and let AI help you balance your academic life.
        </p>
      </div>

      <BurnoutRadar />

      <div className="flex flex-col gap-8 mb-10">
        <WellnessCheckIn />
        
        <Card className="w-full shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-xl">14-Day Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-end min-h-[300px]">
            {logs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Not enough data yet. Complete a check-in to start tracking!
              </div>
            ) : (
              <div className="flex items-end justify-between h-48 mt-auto gap-1">
                {trendData.map((day, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full relative flex flex-col justify-end items-center h-full gap-1 px-0.5">
                      {/* Stress Bar (Amber) */}
                      {day.stress > 0 && (
                        <div 
                          className="w-full bg-amber-200 rounded-t-sm"
                          style={{ height: `${(day.stress / 5) * 100}%` }}
                          title={`Stress: ${day.stress}/5`}
                        />
                      )}
                      {/* Mood Bar (Pink) */}
                      {day.mood > 0 && (
                        <div 
                          className="w-full bg-pink-400 rounded-b-sm"
                          style={{ height: `${(day.mood / 5) * 100}%` }}
                          title={`Mood: ${day.mood}/5`}
                        />
                      )}
                      
                      {day.mood === 0 && day.stress === 0 && (
                        <div className="w-full bg-muted/30 rounded-md h-4" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-2 truncate w-full text-center">
                      {day.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-400 rounded-sm" /> Mood
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-200 rounded-sm" /> Stress
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

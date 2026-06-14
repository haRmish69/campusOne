import { Heart } from "lucide-react";
import { WellnessCheckIn } from "@/components/WellnessCheckIn";
import { WellnessTrendChart } from "@/components/WellnessTrendChart";
import { BurnoutRadar } from "@/components/BurnoutRadar";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WellnessPage() {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const logs = await prisma.wellnessLog.findMany({
    where: { userId, date: { gte: fourteenDaysAgo } },
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
            <WellnessTrendChart data={trendData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

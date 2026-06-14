import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { WellnessDashboard } from "@/components/WellnessDashboard";

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
    <div className="container mx-auto pt-[28px] pb-10 px-4 max-w-[960px] font-[family-name:var(--font-plus-jakarta-sans)]">
      <div className="bg-[#f5f5f5] border border-[#ebebeb] rounded-[20px] p-[28px]">
        
        <div className="mb-[24px]">
          <h1 className="text-[20px] font-bold text-[#1f1f1f] flex items-center gap-3 leading-tight">
            <div className="w-[12px] h-[12px] rounded-[6px] bg-[#ff5a2f]" />
            Wellness & Burnout
          </h1>
          <p className="text-[12px] text-[#a5a5a5] mt-1">
            Log your daily feelings and let AI help you balance your academic life.
          </p>
        </div>

        <WellnessDashboard trendData={trendData} />
        
      </div>
    </div>
  );
}

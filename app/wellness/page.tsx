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
    <div className="min-h-[calc(100vh-80px)] relative overflow-hidden bg-[#faf9f8]">
      {/* Decorative rich background blobs for depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-[#ff5a2f]/10 via-[#ff9a85]/5 to-transparent rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-blue-400/10 via-indigo-400/5 to-transparent rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="container mx-auto pt-[32px] pb-12 px-4 max-w-[1000px] font-[family-name:var(--font-plus-jakarta-sans)] relative z-10">
        <div className="mb-[40px]">
          <h1 className="text-[32px] font-bold text-[#1e293b] tracking-tight leading-tight">
            Wellness Tracker
          </h1>
          <p className="text-[15px] text-[#64748b] mt-2 max-w-lg leading-relaxed font-medium">
            Log your daily mood and stress levels. Our AI analyzes your trends to help balance your academic life.
          </p>
        </div>

        <WellnessDashboard trendData={trendData} />
      </div>
    </div>
  );
}

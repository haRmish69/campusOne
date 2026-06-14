import { FileUpload } from "@/components/FileUpload";
import { MessCard } from "@/components/MessCard";
import { EmptyState } from "@/components/EmptyState";
import { Utensils } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MessMenu } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MessPage() {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  const menusRaw = await prisma.messMenu.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      day: true,
      meal: true,
      items: true,
      isVeg: true,
      createdAt: true,
      embedding: false,
    }
  });

  const menus = menusRaw as MessMenu[];

  // Group by days
  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const groupedMenus = daysOrder.map(day => {
    const menusForDay = menus.filter(m => m.day.toLowerCase() === day.toLowerCase());
    
    // Sort chronologically
    const getMealWeight = (mealName: string) => {
      const m = mealName.toLowerCase();
      if (m.includes("first breakfast")) return 1;
      if (m.includes("second breakfast")) return 2;
      if (m.includes("third breakfast")) return 3;
      if (m.includes("breakfast")) return 4;
      if (m.includes("lunch")) return 5;
      if (m.includes("snack") || m.includes("tea")) return 6;
      if (m.includes("dinner")) return 7;
      return 8;
    };
    
    menusForDay.sort((a, b) => getMealWeight(a.meal) - getMealWeight(b.meal));

    return {
      day,
      menus: menusForDay
    };
  }).filter(group => group.menus.length > 0);

  const knownDays = daysOrder.map(d => d.toLowerCase());
  const unknownMenus = menus.filter(m => !knownDays.includes(m.day.toLowerCase()));
  if (unknownMenus.length > 0) {
    groupedMenus.push({ day: "Other / Unknown", menus: unknownMenus });
  }

  const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl bg-[#F7F7F5] min-h-screen">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-[600] text-[#111827] mb-1">Mess Menu</h1>
          <p className="text-[14px] text-[#6B7280] max-w-[520px]">
            Upload a picture of the mess menu. AI will automatically parse the dishes, check if it's Veg or Non-Veg, and add it to your campus timeline.
          </p>
        </div>
        {menus.length > 0 && (
          <a href="#" className="text-[13px] font-[500] text-[#E8470A] hover:underline mt-2">
            View full week →
          </a>
        )}
      </div>
      
      <div className="flex flex-col space-y-12">
        <div className="max-w-2xl">
          <FileUpload apiEndpoint="/api/mess/ingest" />
        </div>
        
        <div>
          <div className="flex items-center mb-8">
            <h2 className="text-[16px] font-[600] text-[#111827]">
              Current Menus
            </h2>
            <span className="bg-[#F3F4F6] text-[#6B7280] rounded-[10px] px-[8px] py-[1px] text-[12px] font-[500] ml-[8px]">
              {menus.length}
            </span>
          </div>
          
          {menus.length === 0 ? (
            <EmptyState 
              icon={Utensils} 
              heading="No menus uploaded" 
              subtitle="Upload today's menu to see what's for dinner" 
              ctaLabel="Upload Menu" 
              onCtaClick={() => document.getElementById('file-upload-input')?.click()} 
            />
          ) : (
            <div className="space-y-12">
              {groupedMenus.map((group) => {
                const isToday = group.day.toLowerCase() === todayString.toLowerCase();
                
                // Get the date based on the current week (simplified for display)
                const today = new Date();
                const dayIndex = daysOrder.findIndex(d => d.toLowerCase() === group.day.toLowerCase());
                const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0 is Monday
                const diff = dayIndex - currentDayIndex;
                const groupDate = new Date(today);
                groupDate.setDate(today.getDate() + diff);
                const dateString = groupDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

                return (
                  <div key={group.day} className="flex flex-col">
                    <div className="flex items-center mb-[16px] border-b border-[#E5E7EB] pb-[16px]">
                      {isToday && (
                        <span className="bg-[#111827] text-white rounded-[6px] px-[8px] py-[2px] text-[11px] font-[600] tracking-[0.06em] mr-[8px]">
                          TODAY
                        </span>
                      )}
                      <h3 className="text-[15px] font-[600] text-[#111827]">
                        {group.day}, {dateString}
                      </h3>
                    </div>
                    
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${group.menus.length >= 4 ? 'lg:grid-cols-4' : group.menus.length === 3 ? 'lg:grid-cols-3' : group.menus.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-[12px]`}>
                      {group.menus.map((menu) => {
                        return (
                          <div key={menu.id}>
                            <MessCard menu={menu} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

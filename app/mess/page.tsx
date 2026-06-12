import { FileUpload } from "@/components/FileUpload";
import { MessCard } from "@/components/MessCard";
import { prisma } from "@/lib/prisma";
import { MessMenu } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function MessPage() {
  const menusRaw = await prisma.messMenu.findMany({
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mess Menu Module</h1>
        <p className="text-muted-foreground">
          Upload a picture of the mess menu. AI will automatically parse the dishes, check if it's Veg or Non-Veg, and add it to your campus timeline.
        </p>
      </div>
      
      <div className="flex flex-col space-y-12">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6 text-[var(--color-midnight-navy)]">Add Menu</h2>
            <div className="max-w-2xl">
              <FileUpload apiEndpoint="/api/mess/ingest" />
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-8 text-[var(--color-midnight-navy)]">
            Current Menus <span className="text-muted-foreground text-sm font-normal ml-2">({menus.length})</span>
          </h2>
          
          {menus.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
              <p className="text-muted-foreground">No menus uploaded yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Upload today's menu to get started.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {groupedMenus.map((group) => (
                <div key={group.day} className="relative">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-[var(--color-midnight-navy)]">
                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                    {group.day}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.menus.map((menu) => (
                      <MessCard key={menu.id} menu={menu} />
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

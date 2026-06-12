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

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mess Menu Module</h1>
        <p className="text-muted-foreground">
          Upload a picture of the mess menu. AI will automatically parse the dishes, check if it's Veg or Non-Veg, and add it to your campus timeline.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-4">Add Menu</h2>
            <FileUpload apiEndpoint="/api/mess/ingest" />
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold tracking-tight mb-4">
            Current Menus <span className="text-muted-foreground text-sm font-normal ml-2">({menus.length})</span>
          </h2>
          
          {menus.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
              <p className="text-muted-foreground">No menus uploaded yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Upload today's menu to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menus.map((menu) => (
                <MessCard key={menu.id} menu={menu} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

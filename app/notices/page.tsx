import { FileUpload } from "@/components/FileUpload";
import { NoticeCard } from "@/components/NoticeCard";
import { SyncEmailButton } from "@/components/SyncEmailButton";
import { prisma } from "@/lib/prisma";
import { Notice } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const noticesRaw = await prisma.notice.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      eventDate: true,
      venue: true,
      actionRequired: true,
      source: true,
      createdAt: true,
      embedding: false, // Omit large embedding data
    }
  });

  // Cast safely since we omitted embedding but NoticeCard expects Notice
  const notices = noticesRaw as Notice[];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Smart Notice Digester</h1>
        <p className="text-muted-foreground">
          Upload any campus notice (image, PDF, or text). CampusFlow's AI will automatically extract the details, categorize it, and make it searchable.
        </p>
      </div>
      
      <div className="flex flex-col space-y-12">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-midnight-navy)]">Add Notice</h2>
              <SyncEmailButton />
            </div>
            <div className="max-w-2xl">
              <FileUpload />
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-8 text-[var(--color-midnight-navy)]">
            Recent Notices <span className="text-muted-foreground text-sm font-normal ml-2">({notices.length})</span>
          </h2>
          
          {notices.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
              <p className="text-muted-foreground">No notices ingested yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Upload your first notice to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {notices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { FileUpload } from "@/components/FileUpload";
import { NoticeList } from "@/components/NoticeList";
import { SyncEmailButton } from "@/components/SyncEmailButton";
import { prisma } from "@/lib/prisma";
import { Notice } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import "./notices.css";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  const noticesRaw = await prisma.notice.findMany({
    where: { userId },
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
    <div className="page-main">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Notices</h1>
          <p className="page-subtitle">Upload any campus notice — AI will extract, categorize, and make it searchable.</p>
        </div>
        <div className="page-header-right">
          <SyncEmailButton />
        </div>
      </div>
      
      <div className="upload-section">
        <div className="max-w-2xl">
          <FileUpload apiEndpoint="/api/notices/ingest" />
        </div>
      </div>
      
      <div>
        <NoticeList initialNotices={notices} />
      </div>
    </div>
  );
}

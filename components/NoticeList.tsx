"use client";

import { useState } from "react";
import { Notice } from "@prisma/client";
import { NoticeCard } from "@/components/NoticeCard";
import { EmptyState } from "@/components/EmptyState";
import { Bell } from "lucide-react";
import "@/app/notices/notices.css";

type FilterType = "All" | "Placement" | "Exam" | "General";

export function NoticeList({ initialNotices }: { initialNotices: Notice[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  const filteredNotices = initialNotices.filter((notice) => {
    if (activeFilter === "All") return true;
    return notice.category.toLowerCase() === activeFilter.toLowerCase();
  });

  const filters: FilterType[] = ["All", "Placement", "Exam", "General"];

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          Recent Notices
          <span className="count-badge">{filteredNotices.length}</span>
        </div>

        <div className="filter-row">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`filter-pill ${activeFilter === filter ? "active" : ""}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      
      {filteredNotices.length === 0 ? (
        <EmptyState 
          icon={Bell} 
          heading={activeFilter === "All" ? "No notices yet" : `No ${activeFilter.toLowerCase()} notices`}
          subtitle={activeFilter === "All" ? "Upload a notice or sync your email to get started" : "Try selecting a different filter"}
          ctaLabel="Upload Notice" 
          onCtaClick={() => document.getElementById('file-upload-input')?.click()} 
        />
      ) : (
        <div className="card-grid">
          {filteredNotices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}

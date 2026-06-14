"use client";

import { useState, useEffect, useMemo } from "react";
import { ClassSchedule } from "@prisma/client";
import { FileUpload } from "@/components/FileUpload";
import { AddClassModal } from "@/components/AddClassModal";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Menu,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────
const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// ─── Mini Calendar ────────────────────────────────────────────
function MiniCalendar({ today, currentWeekStart }: { today: Date; currentWeekStart: Date }) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Mon=0
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Group cells into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="select-none mb-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#111827] text-[13px] font-[600]">
          {MONTH_NAMES[month]} {year}
        </span>
        <div className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4 text-[#9CA3AF] cursor-pointer" />
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] cursor-pointer" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-[500] text-[#9CA3AF] tracking-[0.04em] pb-1.5">{d}</div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="grid grid-cols-7 rounded-[6px]">
            {week.map((day, i) => {
              if (day === null) return <div key={i} className="h-7" />;
              const cellDate = new Date(year, month, day);
              const isToday = isSameDay(cellDate, today);
              const isWeekend = i === 5 || i === 6;

              return (
                <div
                  key={i}
                  className="h-7 flex items-center justify-center text-[13px] transition-colors"
                >
                  {isToday ? (
                    <div className="bg-[#E8470A] text-white rounded-full w-[28px] h-[28px] flex items-center justify-center font-[600]">
                      {day}
                    </div>
                  ) : (
                    <span className={`font-[400] ${isWeekend ? "text-[#D1D5DB]" : "text-[#374151]"}`}>
                      {day}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Class Block ──────────────────────────────────────────────
function ClassBlock({
  cls,
  minHour,
  hourHeight,
  colWidth,
  colIndex,
  colCount,
  onDelete,
}: {
  cls: ClassSchedule;
  minHour: number;
  hourHeight: number;
  colWidth?: number;
  colIndex: number;
  colCount: number;
  onDelete: (id: string) => void;
}) {
  const startMin = timeToMinutes(cls.startTime);
  const endMin = timeToMinutes(cls.endTime);
  const top = ((startMin / 60) - minHour) * hourHeight;
  const height = Math.max(((endMin - startMin) / 60) * hourHeight, 28);
  
  const isLab = cls.subject.toLowerCase().includes("lab");

  const widthPercent = 100 / colCount;
  const leftPercent = colIndex * widthPercent;

  return (
    <div
      className="absolute cursor-pointer transition-all duration-200 group"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        paddingRight: "2px",
        paddingLeft: colIndex > 0 ? "2px" : "0px",
      }}
    >
      <div
        className="h-full rounded-[8px] overflow-hidden relative flex flex-col transition-all duration-200"
        style={{
          backgroundColor: "#F8F9FA",
          border: "1px solid #E5E7EB",
          borderLeft: "3px solid #D1D5DB",
          padding: "6px 10px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#F1F3F5";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#F8F9FA";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          className="text-[12px] font-[600] text-[#374151] leading-tight overflow-hidden text-ellipsis whitespace-nowrap"
          title={cls.subject}
        >
          {cls.subject}
        </div>
        
        {height > 40 && (
          <div className="text-[11px] font-[400] mt-0.5 text-[#9CA3AF] truncate">
            {cls.startTime} – {cls.endTime}
          </div>
        )}

        {isLab && height > 50 && (
          <div className="mt-1">
            <span className="bg-[#F3F4F6] text-[#6B7280] rounded-[4px] px-[5px] py-[1px] text-[10px] font-[500]">
              LAB
            </span>
          </div>
        )}
        
        {height > 56 && !isLab && cls.room && (
          <div className="text-[11px] font-[400] text-[#9CA3AF] truncate mt-0.5">
            {cls.room}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(cls.id); }}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity bg-transparent"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [studyPlan, setStudyPlan] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(-1);

  const today = useMemo(() => new Date(), []);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(today));

  useEffect(() => {
    // Update current time indicator every minute
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (data.schedules) setSchedules(data.schedules);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    toast.success("Class deleted!");
    try {
      await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete class");
      fetchSchedule();
    }
  };

  useEffect(() => { fetchSchedule(); }, []);

  const generateStudyPlan = async () => {
    setIsGeneratingPlan(true);
    setStudyPlan("");
    try {
      const res = await fetch("/api/study-plan");
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setStudyPlan((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      console.error(error);
      setStudyPlan("Failed to generate study plan. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // ── Compute time axis bounds ──
  const { minHour, maxHour } = useMemo(() => {
    if (schedules.length === 0) return { minHour: 8, maxHour: 18 };
    let mn = 24, mx = 0;
    for (const s of schedules) {
      const sh = Math.floor(timeToMinutes(s.startTime) / 60);
      const eh = Math.ceil(timeToMinutes(s.endTime) / 60);
      if (sh < mn) mn = sh;
      if (eh > mx) mx = eh;
    }
    return { minHour: Math.max(mn - 1, 0), maxHour: Math.min(mx + 1, 24) };
  }, [schedules]);

  const hourHeight = 60;
  const totalHours = maxHour - minHour;
  const gridHeight = totalHours * hourHeight;

  // ── Week dates ──
  const weekDates = useMemo(() => {
    return DAYS_ORDER.map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // ── Today's day name ──
  const todayDayName = DAYS_ORDER[(today.getDay() + 6) % 7];

  // ── Today's classes ──
  const todaysClasses = useMemo(() => {
    return schedules
      .filter((s) => s.day.toLowerCase() === todayDayName.toLowerCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, todayDayName]);

  // ── Group classes by day + handle overlaps ──
  const classesByDay = useMemo(() => {
    const map: Record<string, ClassSchedule[]> = {};
    for (const day of DAYS_ORDER) map[day] = [];
    for (const s of schedules) {
      const key = DAYS_ORDER.find((d) => d.toLowerCase() === s.day.toLowerCase());
      if (key) map[key].push(s);
    }
    return map;
  }, [schedules]);

  function getOverlapGroups(classes: ClassSchedule[]): ClassSchedule[][] {
    if (classes.length === 0) return [];
    const sorted = [...classes].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const groups: ClassSchedule[][] = [];
    let current: ClassSchedule[] = [sorted[0]];
    let currentEnd = timeToMinutes(sorted[0].endTime);
    for (let i = 1; i < sorted.length; i++) {
      const start = timeToMinutes(sorted[i].startTime);
      if (start < currentEnd) {
        current.push(sorted[i]);
        currentEnd = Math.max(currentEnd, timeToMinutes(sorted[i].endTime));
      } else {
        groups.push(current);
        current = [sorted[i]];
        currentEnd = timeToMinutes(sorted[i].endTime);
      }
    }
    groups.push(current);
    return groups;
  }

  // ── Navigation ──
  const goToPrevWeek = () => setCurrentWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeekStart((prev) => addDays(prev, 7));
  const goToToday = () => setCurrentWeekStart(getMonday(today));

  // ── Determine displayed month/year from current week ──
  const displayMonth = weekDates[3]; // Use Thursday to determine month
  const weekStartStr = `${MONTH_SHORT[weekDates[0].getMonth()]} ${weekDates[0].getDate()}`;
  const weekEndStr = `${weekDates[6].getDate()}`;

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ──
  const sidebarContent = (
    <div className="w-[260px] flex-shrink-0 bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-[16px] overflow-y-auto">
      <MiniCalendar today={today} currentWeekStart={currentWeekStart} />

      <div className="h-px bg-[#E5E7EB] w-full mb-6" />

      {/* Actions */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => { setShowUpload(!showUpload); setSidebarOpen(false); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-[400] text-[#374151] border border-[#E5E7EB] rounded-[8px] hover:bg-[#F9FAFB] transition-colors"
        >
          <Upload className="w-4 h-4" /> Upload Timetable
        </button>
        {schedules.length > 0 && (
          <button
            onClick={() => { generateStudyPlan(); setSidebarOpen(false); }}
            disabled={isGeneratingPlan}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-[500] text-white bg-[#E8470A] rounded-[8px] hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isGeneratingPlan ? "Thinking..." : "AI Study Plan"}
          </button>
        )}
      </div>

      {/* Today's classes */}
      <div>
        <h3 className="text-[10px] font-[600] text-[#9CA3AF] tracking-[0.08em] uppercase mb-3">
          Today&apos;s Classes
        </h3>
        {todaysClasses.length === 0 ? (
          <p className="text-[12px] text-[#6B7280]">No classes today</p>
        ) : (
          <div className="space-y-0">
            {todaysClasses.map((cls) => {
              return (
                <div
                  key={cls.id}
                  className="flex items-start gap-2 py-[10px] px-[12px] border-b border-[#F3F4F6] last:border-b-0 group/class transition-colors"
                >
                  <div className="w-[3px] h-full min-h-[32px] rounded-full shrink-0 bg-[#E5E7EB] group-hover/class:bg-[#E8470A] transition-colors" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-[500] text-[#111827] leading-tight truncate">{cls.subject}</div>
                    <div className="text-[12px] font-[400] text-[#9CA3AF] mt-0.5">
                      {cls.startTime} – {cls.endTime}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5] overflow-hidden font-sans">
      {/* ── HEADER ── */}
      <div className="shrink-0 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-[8px] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-baseline">
              <h1 className="text-[22px] font-[600] text-[#111827] m-0">
                {MONTH_NAMES[displayMonth.getMonth()]} {displayMonth.getFullYear()}
              </h1>
              <span className="text-[13px] font-[400] text-[#9CA3AF] ml-[10px]">
                Week of {weekStartStr} – {weekEndStr}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-[14px] py-[6px] text-[13px] font-[400] text-[#374151] bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] hover:bg-[#F9FAFB] transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevWeek}
                className="w-[32px] h-[32px] flex items-center justify-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextWeek}
                className="w-[32px] h-[32px] flex items-center justify-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-[6px] px-[16px] py-[6px] text-[13px] font-[500] text-[#FFFFFF] bg-[#E8470A] rounded-[8px] hover:opacity-90 transition-opacity ml-2 border-none"
            >
              <Plus className="w-4 h-4" /> Add Class
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-[20px]">
        {/* Mobile sidebar drawer overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#F7F7F5] p-5 overflow-y-auto shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[#111827]">Schedule</span>
                <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded text-[#6B7280] hover:bg-[#E5E7EB]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          {sidebarContent}
        </aside>

        {/* ── CALENDAR GRID ── */}
        <main className="flex-1 overflow-auto bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-[#6B7280] text-sm">
              Loading schedule…
            </div>
          ) : (
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#E5E7EB]">
                <div className="flex">
                  {/* Time gutter spacer */}
                  <div className="w-[56px] shrink-0" />
                  {/* Day columns */}
                  {DAYS_ORDER.map((day, i) => {
                    const date = weekDates[i];
                    const isToday = isSameDay(date, today);
                    const isWeekend = i === 5 || i === 6;
                    
                    return (
                      <div key={day} className={`flex-1 text-center py-[12px] border-l border-[#F3F4F6] first:border-l-0 ${isWeekend ? "bg-[#FAFAFA]" : ""}`}>
                        <div className="text-[11px] font-[500] text-[#9CA3AF] tracking-[0.05em] uppercase mb-1">
                          {DAY_SHORT[i]}
                        </div>
                        <div
                          className={`mx-auto inline-flex items-center justify-center w-[34px] h-[34px] text-[20px] font-[600] rounded-full transition-colors
                            ${isToday ? "bg-[#E8470A] text-[#FFFFFF]" : (isWeekend ? "text-[#EF4444]" : "text-[#111827]")}
                          `}
                        >
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time grid */}
              <div className="flex relative" style={{ height: `${gridHeight}px` }}>
                {/* Time labels */}
                <div className="w-[56px] shrink-0 relative bg-[#FFFFFF]">
                  {Array.from({ length: totalHours }, (_, i) => (
                    <div
                      key={i}
                      className="absolute right-3 text-[11px] font-[400] text-[#D1D5DB] leading-none"
                      style={{ top: `${i * hourHeight - 6}px` }}
                    >
                      {formatHour(minHour + i)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS_ORDER.map((day, dayIdx) => {
                  const date = weekDates[dayIdx];
                  const isToday = isSameDay(date, today);
                  const isWeekend = dayIdx === 5 || dayIdx === 6;
                  const dayClasses = classesByDay[day] || [];
                  const groups = getOverlapGroups(dayClasses);

                  return (
                    <div
                      key={day}
                      className={`flex-1 relative border-l border-[#F3F4F6] ${isWeekend ? "bg-[#FAFAFA]" : ""}`}
                    >
                      {/* Hour lines */}
                      {Array.from({ length: totalHours }, (_, i) => (
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-t border-[#F3F4F6]"
                          style={{ top: `${i * hourHeight}px` }}
                        />
                      ))}

                      {/* Current Time Indicator */}
                      {isToday && currentTimeMinutes >= minHour * 60 && currentTimeMinutes <= maxHour * 60 && (
                        <div 
                          className="absolute left-0 right-0 border-t-[2px] border-[#E8470A] z-10 pointer-events-none"
                          style={{ top: `${((currentTimeMinutes / 60) - minHour) * hourHeight}px` }}
                        >
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[#E8470A] -ml-[3.5px]" />
                        </div>
                      )}

                      {/* Class blocks */}
                      <div className="absolute inset-0 px-[2px]">
                        {groups.flatMap((group) =>
                          group.map((cls, colIdx) => (
                            <ClassBlock
                              key={cls.id}
                              cls={cls}
                              minHour={minHour}
                              hourHeight={hourHeight}
                              colIndex={colIdx}
                              colCount={group.length}
                              onDelete={handleDelete}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Upload panel (collapsible below calendar) ── */}
      {showUpload && (
        <div className="shrink-0 border-t border-[#E5E7EB] bg-[#F7F7F5] p-4 md:p-6 z-20">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#111827]">Upload Timetable</h3>
              <button onClick={() => setShowUpload(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <FileUpload apiEndpoint="/api/schedule/ingest" onSuccess={() => { fetchSchedule(); setShowUpload(false); }} />
          </div>
        </div>
      )}

      {/* ── Study Plan panel ── */}
      {studyPlan && (
        <div className="shrink-0 border-t border-[#E5E7EB] bg-[#FFFFFF] max-h-[40vh] overflow-y-auto z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-[600] flex items-center gap-2 text-[#111827]">
                <Sparkles className="w-5 h-5 text-[#E8470A]" />
                Your Custom Study Plan
              </h2>
              <button
                onClick={() => setStudyPlan("")}
                className="text-[#6B7280] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-[#374151]">
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }: any) => <p className="mb-3" {...props} />,
                  ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-3" {...props} />,
                  ol: ({ node, ...props }: any) => <ol className="list-decimal ml-4 mb-3" {...props} />,
                  li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
                  h3: ({ node, ...props }: any) => <h3 className="text-[16px] font-[600] mt-6 mb-2 text-[#111827]" {...props} />,
                }}
              >
                {studyPlan}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Class Modal ── */}
      <AddClassModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchSchedule}
      />
    </div>
  );
}

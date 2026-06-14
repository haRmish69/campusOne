"use client";

import { useState, useEffect, useMemo } from "react";
import { ClassSchedule } from "@prisma/client";
import { FileUpload } from "@/components/FileUpload";
import { AddClassModal } from "@/components/AddClassModal";
import { Button } from "@/components/ui/button";
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

// ─── Color palette for class blocks ───────────────────────────
const CLASS_COLORS = [
  { bg: "#e8f0fe", border: "#006bff", text: "#003d99" },   // Signal Blue
  { bg: "#f3e8ff", border: "#8247f5", text: "#5b21b6" },   // Violet
  { bg: "#fff7e6", border: "#ffa600", text: "#9a6700" },   // Amber
  { bg: "#e6f7ff", border: "#0099ff", text: "#006bb3" },   // Cyan
  { bg: "#fce8ff", border: "#e55cff", text: "#a21caf" },   // Magenta
  { bg: "#e8faf0", border: "#10b981", text: "#065f46" },   // Emerald
];

function hashSubjectToColor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CLASS_COLORS[Math.abs(hash) % CLASS_COLORS.length];
}

// ─── Helpers ──────────────────────────────────────────────────
const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

  const weekEnd = addDays(currentWeekStart, 6);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none">
      <div className="text-sm font-semibold text-[var(--color-midnight-navy)] mb-3">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-[var(--color-steel-blue)] pb-1.5">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="h-7" />;
          const cellDate = new Date(year, month, day);
          const isToday = isSameDay(cellDate, today);
          const isInWeek = cellDate >= currentWeekStart && cellDate <= weekEnd;

          return (
            <div
              key={i}
              className={`h-7 flex items-center justify-center text-xs transition-colors
                ${isInWeek ? "bg-[var(--color-signal-blue)]/[0.06]" : ""}
                ${isToday ? "bg-[var(--color-signal-blue)] text-white rounded-full font-bold" : "text-[var(--color-carbon)]"}
              `}
            >
              {day}
            </div>
          );
        })}
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
  const color = hashSubjectToColor(cls.subject);

  const widthPercent = 100 / colCount;
  const leftPercent = colIndex * widthPercent;

  return (
    <div
      className="absolute group cursor-default transition-all duration-200 hover:shadow-md hover:z-10"
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
        className="h-full rounded-md px-2 py-1.5 overflow-hidden border-l-[3px] relative"
        style={{
          backgroundColor: color.bg,
          borderLeftColor: color.border,
        }}
      >
        <div
          className="text-[11px] font-semibold leading-tight truncate"
          style={{ color: color.text }}
          title={cls.subject}
        >
          {cls.subject}
        </div>
        {height > 40 && (
          <div className="text-[10px] text-[var(--color-slate-blue)] mt-0.5 truncate">
            {cls.startTime} – {cls.endTime}
          </div>
        )}
        {height > 56 && cls.room && (
          <div className="text-[10px] text-[var(--color-steel-blue)] truncate">{cls.room}</div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(cls.id); }}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-white/80 text-[var(--color-slate-blue)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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

  const today = useMemo(() => new Date(), []);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(today));

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
    if (schedules.length === 0) return { minHour: 8, maxHour: 17 };
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

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ──
  const sidebarContent = (
    <div className="space-y-6">
      <MiniCalendar today={today} currentWeekStart={currentWeekStart} />

      {/* Today's classes */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--color-slate-blue)] uppercase tracking-wider mb-2">
          Today&apos;s Classes
        </h3>
        {todaysClasses.length === 0 ? (
          <p className="text-xs text-[var(--color-steel-blue)]">No classes today 🎉</p>
        ) : (
          <div className="space-y-2">
            {todaysClasses.map((cls) => {
              const color = hashSubjectToColor(cls.subject);
              return (
                <div
                  key={cls.id}
                  className="flex items-start gap-2 py-1.5"
                >
                  <div className="w-1 h-full min-h-[32px] rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color.border }} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--color-midnight-navy)] truncate">{cls.subject}</div>
                    <div className="text-[10px] text-[var(--color-slate-blue)]">
                      {cls.startTime} – {cls.endTime}{cls.room ? ` · ${cls.room}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => { setShowUpload(!showUpload); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--color-slate-blue)] border border-[var(--color-mist-border)] rounded hover:bg-[var(--color-fog)] transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Timetable
        </button>
        {schedules.length > 0 && (
          <button
            onClick={() => { generateStudyPlan(); setSidebarOpen(false); }}
            disabled={isGeneratingPlan}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-[var(--color-signal-blue)] rounded hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGeneratingPlan ? "Thinking..." : "AI Study Plan"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── HEADER ── */}
      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-[var(--color-mist-border)] bg-white">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-slate-blue)] hover:bg-[var(--color-fog)] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-xl md:text-2xl font-bold text-[var(--color-midnight-navy)]">
              {MONTH_NAMES[displayMonth.getMonth()]} {displayMonth.getFullYear()}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-medium border border-[var(--color-mist-border)] rounded text-[var(--color-midnight-navy)] hover:bg-[var(--color-fog)] transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToPrevWeek}
              className="w-8 h-8 flex items-center justify-center rounded text-[var(--color-slate-blue)] hover:bg-[var(--color-fog)] transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextWeek}
              className="w-8 h-8 flex items-center justify-center rounded text-[var(--color-slate-blue)] hover:bg-[var(--color-fog)] transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-signal-blue)] rounded hover:opacity-90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Class
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar drawer overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-[var(--color-mist-border)] p-5 overflow-y-auto shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[var(--color-midnight-navy)]">Schedule</span>
                <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-slate-blue)] hover:bg-[var(--color-fog)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-[260px] shrink-0 border-r border-[var(--color-mist-border)] bg-white p-5 overflow-y-auto">
          {sidebarContent}
        </aside>

        {/* ── CALENDAR GRID ── */}
        <main className="flex-1 overflow-auto bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-[var(--color-slate-blue)] text-sm">
              Loading schedule…
            </div>
          ) : (
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="sticky top-0 z-10 bg-white border-b border-[var(--color-mist-border)]">
                <div className="flex">
                  {/* Time gutter spacer */}
                  <div className="w-14 shrink-0" />
                  {/* Day columns */}
                  {DAYS_ORDER.map((day, i) => {
                    const date = weekDates[i];
                    const isToday = isSameDay(date, today);
                    return (
                      <div key={day} className="flex-1 text-center py-2.5 border-l border-[var(--color-mist-border)] first:border-l-0">
                        <div className="text-[11px] font-medium text-[var(--color-steel-blue)] uppercase tracking-wider">
                          {DAY_SHORT[i]}
                        </div>
                        <div
                          className={`inline-flex items-center justify-center w-8 h-8 text-sm font-semibold mt-0.5 rounded-full transition-colors
                            ${isToday ? "bg-[var(--color-signal-blue)] text-white" : "text-[var(--color-midnight-navy)]"}
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
                <div className="w-14 shrink-0 relative">
                  {Array.from({ length: totalHours }, (_, i) => (
                    <div
                      key={i}
                      className="absolute right-2 text-[10px] text-[var(--color-steel-blue)] leading-none"
                      style={{ top: `${i * hourHeight - 5}px` }}
                    >
                      {formatHour(minHour + i)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS_ORDER.map((day, dayIdx) => {
                  const isToday = isSameDay(weekDates[dayIdx], today);
                  const dayClasses = classesByDay[day] || [];
                  const groups = getOverlapGroups(dayClasses);

                  return (
                    <div
                      key={day}
                      className={`flex-1 relative border-l border-[var(--color-mist-border)]
                        ${isToday ? "bg-[#f0f6ff]" : ""}
                      `}
                    >
                      {/* Hour lines */}
                      {Array.from({ length: totalHours }, (_, i) => (
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-t border-[var(--color-fog)]"
                          style={{ top: `${i * hourHeight}px` }}
                        />
                      ))}

                      {/* Class blocks */}
                      <div className="absolute inset-0 px-0.5">
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

              {/* Empty state overlay */}
              {schedules.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "120px" }}>
                  <div className="text-center pointer-events-auto">
                    <div className="text-4xl mb-3">📅</div>
                    <h3 className="text-sm font-semibold text-[var(--color-midnight-navy)] mb-1">No classes yet</h3>
                    <p className="text-xs text-[var(--color-slate-blue)] mb-3 max-w-[240px]">
                      Upload a timetable photo or add classes manually to get started.
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="text-xs font-medium text-[var(--color-signal-blue)] hover:underline"
                    >
                      + Add your first class
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Upload panel (collapsible below calendar) ── */}
      {showUpload && (
        <div className="shrink-0 border-t border-[var(--color-mist-border)] bg-[var(--color-mist)] p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--color-midnight-navy)]">Upload Timetable</h3>
              <button onClick={() => setShowUpload(false)} className="text-[var(--color-slate-blue)] hover:text-[var(--color-carbon)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <FileUpload apiEndpoint="/api/schedule/ingest" onSuccess={() => { fetchSchedule(); setShowUpload(false); }} />
          </div>
        </div>
      )}

      {/* ── Study Plan panel ── */}
      {studyPlan && (
        <div className="shrink-0 border-t border-[var(--color-mist-border)] bg-white max-h-[40vh] overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--color-midnight-navy)]">
                <Sparkles className="w-5 h-5 text-[var(--color-signal-blue)]" />
                Your Custom Study Plan
              </h2>
              <button
                onClick={() => setStudyPlan("")}
                className="text-[var(--color-slate-blue)] hover:text-[var(--color-carbon)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-[var(--color-carbon)]">
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }: any) => <p className="mb-3" {...props} />,
                  ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-3" {...props} />,
                  ol: ({ node, ...props }: any) => <ol className="list-decimal ml-4 mb-3" {...props} />,
                  li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
                  h3: ({ node, ...props }: any) => <h3 className="text-lg font-semibold mt-6 mb-2" {...props} />,
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

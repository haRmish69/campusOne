"use client";

import { useState } from "react";
import { X, Calendar, Clock, MapPin, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface AddClassModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function AddClassModal({ open, onClose, onSuccess }: AddClassModalProps) {
  const [subject, setSubject] = useState("");
  const [day, setDay] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  const [faculty, setFaculty] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setSubject("");
    setDay("Monday");
    setStartTime("09:00");
    setEndTime("10:00");
    setRoom("");
    setFaculty("");
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), day, startTime, endTime, room: room.trim(), faculty: faculty.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add class");
      }
      toast.success("Class added!");
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add class");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ boxShadow: "rgba(71, 103, 136, 0.08) 0px 8px 30px 0px, rgba(71, 103, 136, 0.04) 0px 4px 10px 0px" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-slate-blue)] hover:bg-[var(--color-fog)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-8 space-y-5">
          {/* Subject — large borderless input */}
          <input
            type="text"
            placeholder="Class Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            autoFocus
            className="w-full text-xl font-semibold text-[var(--color-midnight-navy)] placeholder:text-[var(--color-steel-blue)] bg-transparent border-0 outline-none focus:ring-0 p-0"
          />

          <div className="h-px bg-[var(--color-fog)]" />

          {/* Day selector */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-[var(--color-slate-blue)] shrink-0" />
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="flex-1 text-sm bg-[var(--color-mist)] border border-[var(--color-mist-border)] rounded px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-signal-blue)] transition-colors"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Time row */}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--color-slate-blue)] shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 text-sm bg-[var(--color-mist)] border border-[var(--color-mist-border)] rounded px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-signal-blue)] transition-colors"
              />
              <span className="text-[var(--color-steel-blue)] text-sm">→</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 text-sm bg-[var(--color-mist)] border border-[var(--color-mist-border)] rounded px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-signal-blue)] transition-colors"
              />
            </div>
          </div>

          {/* Room */}
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-[var(--color-slate-blue)] shrink-0" />
            <input
              type="text"
              placeholder="Room (optional)"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="flex-1 text-sm bg-[var(--color-mist)] border border-[var(--color-mist-border)] rounded px-3 py-2 text-[var(--color-carbon)] placeholder:text-[var(--color-steel-blue)] outline-none focus:border-[var(--color-signal-blue)] transition-colors"
            />
          </div>

          {/* Faculty */}
          <div className="flex items-center gap-3">
            <UserCheck className="w-4 h-4 text-[var(--color-slate-blue)] shrink-0" />
            <input
              type="text"
              placeholder="Faculty (optional)"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="flex-1 text-sm bg-[var(--color-mist)] border border-[var(--color-mist-border)] rounded px-3 py-2 text-[var(--color-carbon)] placeholder:text-[var(--color-steel-blue)] outline-none focus:border-[var(--color-signal-blue)] transition-colors"
            />
          </div>

          <div className="h-px bg-[var(--color-fog)]" />

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { resetForm(); onClose(); }}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-[var(--color-slate-blue)] border border-[var(--color-mist-border)] rounded hover:bg-[var(--color-fog)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !subject.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-signal-blue)] rounded hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Class"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

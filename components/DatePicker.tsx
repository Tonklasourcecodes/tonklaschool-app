"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const TH_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function parseThai(val: string): Date | null {
  const parts = val.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const ce = y > 2500 ? y - 543 : y;
  const dt = new Date(ce, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

function toThai(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear() + 543;
  return `${d}/${m}/${y}`;
}

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function DatePicker({ value, onChange, placeholder = "เลือกวันที่", required, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = parseThai(value);
  const today = new Date();

  const [view, setView] = useState<Date>(() => selected ?? today);

  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() { setView(new Date(year, month - 1, 1)); }
  function nextMonth() { setView(new Date(year, month + 1, 1)); }

  function selectDay(day: number) {
    const dt = new Date(year, month, day);
    onChange(toThai(dt));
    setOpen(false);
  }

  function isSelected(day: number) {
    if (!selected) return false;
    return selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;
  }

  function isToday(day: number) {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  }

  const inputCls = `w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 cursor-pointer ${open ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"} ${className ?? ""}`;

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          readOnly
          required={required}
          className={inputCls}
          value={value}
          placeholder={placeholder}
          onClick={() => setOpen((v) => !v)}
        />
        <Calendar
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: open ? "#059669" : "#CBD5E1" }}
        />
      </div>

      {open && (
        <div
          className="absolute z-50 mt-2 rounded-2xl bg-white p-4 select-none"
          style={{
            width: 280,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-bold text-slate-800">
              {TH_MONTHS[month]} {year + 543}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {TH_DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className="relative flex items-center justify-center h-8 w-full rounded-lg text-sm transition-all font-medium"
                  style={{
                    background: sel ? "linear-gradient(135deg,#10b981,#059669)" : tod ? "#F0FDF4" : "transparent",
                    color: sel ? "white" : tod ? "#059669" : "#374151",
                    fontWeight: sel || tod ? 700 : 500,
                  }}
                  onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; }}
                  onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = tod ? "#F0FDF4" : "transparent"; }}
                >
                  {day}
                  {tod && !sel && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ล้างค่า
            </button>
            <button
              type="button"
              onClick={() => { onChange(toThai(today)); setOpen(false); }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

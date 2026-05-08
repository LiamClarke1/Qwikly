"use client";

import { useMemo, useState } from "react";
import type { ContactAvailabilitySlot } from "@/app/api/web/contact-availability/route";

const TZ = "Africa/Johannesburg";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sastTodayKey(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + 120 * 60_000);
  return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth() + 1}-${shifted.getUTCDate()}`;
}

function ymdKey(year: number, month1: number, day: number): string {
  return `${year}-${month1}-${day}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function monthLabel(year: number, month0: number): string {
  return new Date(Date.UTC(year, month0, 1)).toLocaleDateString("en-ZA", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

function availabilityKeyForSlot(slot: ContactAvailabilitySlot): string {
  const d = new Date(slot.start);
  const shifted = new Date(d.getTime() + 120 * 60_000);
  return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth() + 1}-${shifted.getUTCDate()}`;
}

export type CalendarPickerProps = {
  availability: Record<string, ContactAvailabilitySlot[]>;
  selectedSlot: ContactAvailabilitySlot | null;
  onSelect: (slot: ContactAvailabilitySlot | null) => void;
};

export default function CalendarPicker({
  availability,
  selectedSlot,
  onSelect,
}: CalendarPickerProps) {
  const todayKey = sastTodayKey();
  const [todayY, todayM1] = todayKey.split("-").map(Number);

  const availableKeyList = useMemo(() => Object.keys(availability), [availability]);
  const availableKeys = useMemo(() => new Set(availableKeyList), [availableKeyList]);
  const lastAvailableKey = useMemo(() => {
    let last: string | null = null;
    let lastTime = -Infinity;
    for (const key of availableKeyList) {
      const [y, m, d] = key.split("-").map(Number);
      const t = Date.UTC(y, m - 1, d);
      if (t > lastTime) {
        lastTime = t;
        last = key;
      }
    }
    return last;
  }, [availableKeyList]);

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth0, setViewMonth0] = useState(todayM1 - 1);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    selectedSlot ? availabilityKeyForSlot(selectedSlot) : null
  );

  const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth0, 1));
  const startOffset = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth0 + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ day: null, key: null });
    } else {
      const key = ymdKey(viewYear, viewMonth0 + 1, dayNum);
      cells.push({ day: dayNum, key });
    }
  }

  const canPrev = !(viewYear === todayY && viewMonth0 === todayM1 - 1);
  const canNext = (() => {
    if (!lastAvailableKey) return false;
    const [ly, lm] = lastAvailableKey.split("-").map(Number);
    return viewYear < ly || (viewYear === ly && viewMonth0 < lm - 1);
  })();

  function handleDayClick(key: string | null) {
    if (!key || !availableKeys.has(key)) return;
    setSelectedDayKey(key);
    onSelect(null);
  }

  function handleSlotClick(slot: ContactAvailabilitySlot) {
    onSelect(slot);
  }

  const slotsForSelectedDay = selectedDayKey ? availability[selectedDayKey] ?? [] : [];

  return (
    <div className="bg-white border border-ink/15 rounded-xl p-4 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-base text-ink">{monthLabel(viewYear, viewMonth0)}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!canPrev) return;
                  if (viewMonth0 === 0) {
                    setViewYear((y) => y - 1);
                    setViewMonth0(11);
                  } else {
                    setViewMonth0((m) => m - 1);
                  }
                }}
                disabled={!canPrev}
                aria-label="Previous month"
                className="w-7 h-7 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canNext) return;
                  if (viewMonth0 === 11) {
                    setViewYear((y) => y + 1);
                    setViewMonth0(0);
                  } else {
                    setViewMonth0((m) => m + 1);
                  }
                }}
                disabled={!canNext}
                aria-label="Next month"
                className="w-7 h-7 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] uppercase tracking-wider text-ink-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (cell.day === null) return <div key={i} className="aspect-square" />;
              const isAvailable = cell.key !== null && availableKeys.has(cell.key);
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDayKey;
              const base =
                "aspect-square flex items-center justify-center text-sm rounded-md transition-colors";
              if (isSelected) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(cell.key)}
                    className={`${base} bg-ember text-paper font-medium`}
                  >
                    {cell.day}
                  </button>
                );
              }
              if (isAvailable) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(cell.key)}
                    className={`${base} text-ink hover:bg-ember/10 ${isToday ? "ring-1 ring-ember/40" : ""}`}
                  >
                    {cell.day}
                  </button>
                );
              }
              return (
                <div
                  key={i}
                  className={`${base} text-ink-400/50 cursor-not-allowed ${isToday ? "ring-1 ring-ink/10" : ""}`}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:border-l md:border-ink/10 md:pl-5">
          {!selectedDayKey ? (
            <p className="text-sm text-ink-400">Pick a day to see times.</p>
          ) : slotsForSelectedDay.length === 0 ? (
            <p className="text-sm text-ink-400">No times left on this day.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
              {slotsForSelectedDay.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => handleSlotClick(slot)}
                    className={`text-sm py-2.5 px-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-ember text-paper border-ember"
                        : "bg-white text-ink border-ink/15 hover:border-ember/60"
                    }`}
                  >
                    {timeLabel(slot.start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-400 mt-4">
        15-minute Google Meet, Africa/Johannesburg time.
      </p>
    </div>
  );
}

"use client";

import { cn } from "@/lib/cn";

// Contact info filter pills. Cream ed-card row, single line, 6 pills.
// Mirrors the Mission Control filter-bar treatment, simple commas in copy,
// no em or en dashes anywhere in this file.
export type ContactFilter =
  | "all"
  | "has_email"
  | "has_phone"
  | "email_and_phone"
  | "email_only"
  | "phone_only";

export interface ContactFilterCounts {
  all: number;
  has_email: number;
  has_phone: number;
  email_and_phone: number;
  email_only: number;
  phone_only: number;
}

const PILLS: { key: ContactFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "has_email", label: "Has email" },
  { key: "has_phone", label: "Has phone" },
  { key: "email_and_phone", label: "Email + Phone" },
  { key: "email_only", label: "Email only" },
  { key: "phone_only", label: "Phone only" },
];

export function ContactFilterPills({
  active,
  counts,
  onChange,
}: {
  active: ContactFilter;
  counts: ContactFilterCounts;
  onChange: (next: ContactFilter) => void;
}) {
  return (
    <div className="ed-card !p-3 md:!p-4 flex flex-wrap items-center gap-2">
      <span className="eyebrow text-ink-500 mr-1">Contact info:</span>
      {PILLS.map((p) => {
        const isActive = active === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors",
              isActive
                ? "bg-ember text-cream ring-1 ring-ember"
                : "bg-[#F1EADD] text-ink ring-1 ring-[#E8DFD0] hover:bg-[#EBE3D2]"
            )}
          >
            <span>{p.label}</span>
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                isActive ? "text-cream/85" : "text-ink-500"
              )}
            >
              {counts[p.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

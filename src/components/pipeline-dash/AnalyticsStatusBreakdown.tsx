"use client";

import { useMemo } from "react";

export interface StatusProspectRow {
  status: string | null;
}

interface BreakdownItem {
  key: string;
  label: string;
  matcher: (status: string) => boolean;
}

// Order mirrors the spec exactly.
const ITEMS: BreakdownItem[] = [
  { key: "new", label: "Not contacted", matcher: (s) => s === "new" || s === "" },
  { key: "contacted", label: "Contacted", matcher: (s) => s === "contacted" },
  { key: "replied", label: "Replied", matcher: (s) => s === "replied" },
  { key: "discovery", label: "Discovery booked", matcher: (s) => s === "discovery_booked" || s === "discovery" },
  { key: "demo", label: "Demo booked", matcher: (s) => s === "demo_booked" || s === "demo" || s === "booked" },
  { key: "signed", label: "Signed", matcher: (s) => s === "signed" || s === "won" },
  { key: "lost", label: "Lost", matcher: (s) => s === "dead" || s === "lost" },
];

const TONE: Record<string, string> = {
  new: "bg-[#E2EAF3] text-[#2C5784] ring-1 ring-[#CCD8E8]",
  contacted: "bg-[#F1EADD] text-[#3C3C38] ring-1 ring-[#E8DFD0]",
  replied: "bg-[#FAEFD8] text-[#B8770E] ring-1 ring-[#EFDDB6]",
  discovery: "bg-[#E5F1E9] text-[#1F7A3A] ring-1 ring-[#CDE3D5]",
  demo: "bg-[#E5F1E9] text-[#1F7A3A] ring-1 ring-[#CDE3D5]",
  signed: "bg-[#E5F1E9] text-[#1F7A3A] ring-1 ring-[#CDE3D5]",
  lost: "bg-[#F7E2DE] text-[#B33B2E] ring-1 ring-[#EFCFC7]",
};

export function AnalyticsStatusBreakdown({
  prospects,
}: {
  prospects: StatusProspectRow[];
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const item of ITEMS) c[item.key] = 0;
    for (const p of prospects) {
      const s = (p.status || "").toLowerCase();
      for (const item of ITEMS) {
        if (item.matcher(s)) {
          c[item.key] += 1;
          break;
        }
      }
    }
    return c;
  }, [prospects]);

  return (
    <div className="ed-card flex flex-col gap-3">
      <div className="font-display text-[18px] tracking-tight text-ink">
        Status breakdown
      </div>
      <ul className="flex flex-col gap-2">
        {ITEMS.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between px-3 py-2 rounded-full"
            style={{ backgroundColor: "#F9F6F2" }}
          >
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[item.key] || "bg-[#F1EADD] text-[#3C3C38] ring-1 ring-[#E8DFD0]"}`}
            >
              {item.label}
            </span>
            <span className="font-mono num text-[14px] text-ink">
              {counts[item.key] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

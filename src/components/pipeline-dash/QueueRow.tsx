"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { StatusPill, prospectStatusTone } from "./StatusPill";

export interface QueueRowData {
  id: string;
  name: string | null;
  industry: string | null;
  city: string | null;
  enrichment_score: number | null;
  email_verified: boolean | null;
  status: string | null;
}

// Row in the "Top of queue" panel on the Pipeline dashboard hub.
// Score badge on the left, name + meta in the middle, status pill on the right.
export function QueueRow({ prospect }: { prospect: QueueRowData }) {
  const raw = prospect.enrichment_score ?? 0;
  const score = Math.max(1, Math.min(10, Math.round(raw)));
  const meta = [prospect.industry, prospect.city].filter(Boolean).join(", ");

  return (
    <Link
      href={`/dashboard/pipeline/prospects/${prospect.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b border-ink/[0.06] last:border-b-0 hover:bg-[#F9F6F2] transition-colors"
    >
      <span
        aria-hidden
        className="w-8 h-8 rounded-full bg-ember text-cream font-mono text-[13px] font-medium inline-flex items-center justify-center shrink-0 tabular-nums"
        title={`Score ${score}`}
      >
        {score}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-medium text-ink truncate">
            {prospect.name || "Unnamed business"}
          </span>
          {prospect.email_verified ? (
            <ShieldCheck
              className="w-3.5 h-3.5 text-[#1F7A3A] shrink-0"
              aria-label="Verified"
            />
          ) : null}
        </div>
        <div className="text-[12px] text-ink-500 truncate">
          {meta || "Industry pending"}
        </div>
      </div>
      <StatusPill tone={prospectStatusTone(prospect.status || "new")}>
        {prospect.status === "new" || !prospect.status
          ? "Not contacted"
          : prospect.status}
      </StatusPill>
    </Link>
  );
}

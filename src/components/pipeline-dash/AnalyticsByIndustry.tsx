"use client";

import { useMemo } from "react";

export interface ProspectRow {
  id: string;
  industry: string | null;
  status: string | null;
}

export interface MeetingRow {
  id: string;
  prospect_id: string | null;
  industry?: string | null;
}

interface IndustryStats {
  industry: string;
  total: number;
  contacted: number;
  replied: number;
  booked: number;
  replyRate: number;
  bookRate: number;
}

const REPLIED_STATUSES = new Set(["replied", "qualified", "booked"]);
const BOOKED_STATUSES = new Set(["booked", "qualified"]);
const CONTACTED_STATUSES = new Set([
  "contacted",
  "replied",
  "qualified",
  "booked",
  "dead",
]);

function bucketByIndustry(
  prospects: ProspectRow[],
  meetingsByProspect: Map<string, number>
): IndustryStats[] {
  const map = new Map<string, IndustryStats>();
  for (const p of prospects) {
    const industry = (p.industry || "Unspecified").trim() || "Unspecified";
    if (!map.has(industry)) {
      map.set(industry, {
        industry,
        total: 0,
        contacted: 0,
        replied: 0,
        booked: 0,
        replyRate: 0,
        bookRate: 0,
      });
    }
    const s = map.get(industry)!;
    s.total += 1;
    const status = (p.status || "").toLowerCase();
    if (CONTACTED_STATUSES.has(status)) s.contacted += 1;
    if (REPLIED_STATUSES.has(status)) s.replied += 1;
    if (BOOKED_STATUSES.has(status) || meetingsByProspect.has(p.id)) s.booked += 1;
  }
  const out = Array.from(map.values());
  for (const s of out) {
    s.replyRate = s.contacted > 0 ? Math.round((s.replied / s.contacted) * 100) : 0;
    s.bookRate = s.contacted > 0 ? Math.round((s.booked / s.contacted) * 100) : 0;
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

export function AnalyticsByIndustry({
  prospects,
  meetings,
}: {
  prospects: ProspectRow[];
  meetings: MeetingRow[];
}) {
  const rows = useMemo(() => {
    const meetingsByProspect = new Map<string, number>();
    for (const m of meetings) {
      if (!m.prospect_id) continue;
      meetingsByProspect.set(
        m.prospect_id,
        (meetingsByProspect.get(m.prospect_id) || 0) + 1
      );
    }
    return bucketByIndustry(prospects, meetingsByProspect);
  }, [prospects, meetings]);

  if (rows.length === 0) {
    return (
      <div className="ed-card !p-6 text-center">
        <p className="text-[13.5px] text-ink-500">
          No industry data yet. Generate prospects to populate this table.
        </p>
      </div>
    );
  }

  return (
    <div className="ed-card !p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-[#F9F6F2] border-b border-ink/[0.08]">
              <Th>Industry</Th>
              <Th align="right">Total</Th>
              <Th align="right">Contacted</Th>
              <Th align="right">Replied</Th>
              <Th align="right">Booked</Th>
              <Th align="right">Reply rate</Th>
              <Th align="right">Book rate</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {rows.map((r) => (
              <tr key={r.industry}>
                <Td>{r.industry}</Td>
                <Td align="right" mono>
                  {r.total}
                </Td>
                <Td align="right" mono>
                  {r.contacted}
                </Td>
                <Td align="right" mono>
                  {r.replied}
                </Td>
                <Td align="right" mono>
                  {r.booked}
                </Td>
                <Td align="right" mono>
                  {r.replyRate}%
                </Td>
                <Td align="right" mono>
                  {r.bookRate}%
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-500 font-mono ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 text-[13.5px] text-ink ${
        align === "right" ? "text-right" : "text-left"
      } ${mono ? "font-mono num" : ""}`}
    >
      {children}
    </td>
  );
}

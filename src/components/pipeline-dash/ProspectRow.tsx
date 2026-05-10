"use client";

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusPill, prospectStatusTone } from "./StatusPill";

export interface ProspectRowData {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  email: string | null;
  email_verified: boolean | null;
  status: string | null;
  source: string | null;
}

export function ProspectRow({
  prospect,
  onClick,
}: {
  prospect: ProspectRowData;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-colors",
        "hover:bg-[#F9F6F2]"
      )}
    >
      <td className="px-4 py-3 text-[13.5px] text-ink font-medium whitespace-nowrap">
        {prospect.name || "Unknown"}
      </td>
      <td className="px-4 py-3 text-[13px] text-ink-500 whitespace-nowrap">
        {prospect.title || ","}
      </td>
      <td className="px-4 py-3 text-[13px] text-ink whitespace-nowrap">
        {prospect.company || ","}
      </td>
      <td className="px-4 py-3 text-[13px] text-ink-500 whitespace-nowrap">
        {prospect.industry || ","}
      </td>
      <td className="px-4 py-3 text-[13px] text-ink-500 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono">{prospect.email || ","}</span>
          {prospect.email_verified ? (
            <span
              title="Verified"
              className="inline-flex items-center text-[#1F7A3A]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          ) : null}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusPill tone={prospectStatusTone(prospect.status)}>
          {(prospect.status || "new").toLowerCase()}
        </StatusPill>
      </td>
      <td className="px-4 py-3 text-[13px] text-ink-500 whitespace-nowrap">
        {prospect.source || "Manual"}
      </td>
    </tr>
  );
}

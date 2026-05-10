"use client";

import { Users, Send, MessageSquare, CalendarCheck } from "lucide-react";
import { StatusPill, campaignStatusTone } from "./StatusPill";
import { timeAgo } from "@/lib/format";

export interface CampaignCardData {
  id: string;
  name: string | null;
  icp_slug: string | null;
  status: string | null;
  prospects_count: number | null;
  sent_count: number | null;
  replies_count: number | null;
  meetings_count: number | null;
  last_activity_at: string | null;
}

export function CampaignCard({ campaign }: { campaign: CampaignCardData }) {
  return (
    <article className="ed-card flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="font-display text-[20px] leading-tight tracking-tight text-ink truncate">
            {campaign.name || "Untitled campaign"}
          </h3>
          {campaign.icp_slug ? (
            <span className="text-[11.5px] font-mono text-ink-500 uppercase tracking-wider">
              ICP, {campaign.icp_slug}
            </span>
          ) : null}
        </div>
        <StatusPill tone={campaignStatusTone(campaign.status)}>
          {(campaign.status || "draft").toLowerCase()}
        </StatusPill>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          icon={<Users className="w-3.5 h-3.5" />}
          label="Prospects"
          value={campaign.prospects_count ?? 0}
        />
        <Stat
          icon={<Send className="w-3.5 h-3.5" />}
          label="Sent"
          value={campaign.sent_count ?? 0}
        />
        <Stat
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          label="Replies"
          value={campaign.replies_count ?? 0}
        />
        <Stat
          icon={<CalendarCheck className="w-3.5 h-3.5" />}
          label="Meetings"
          value={campaign.meetings_count ?? 0}
        />
      </div>

      <footer className="flex items-center justify-between text-[12px] text-ink-500 pt-2 border-t border-ink/[0.06]">
        <span className="font-mono">
          {campaign.last_activity_at
            ? `Last activity ${timeAgo(campaign.last_activity_at)}`
            : "No activity yet"}
        </span>
      </footer>
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-[#F9F6F2] px-3 py-2.5 border border-ink/[0.06]">
      <div className="flex items-center gap-1.5 text-ink-500">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-mono">
          {label}
        </span>
      </div>
      <span className="num font-mono text-[20px] leading-none text-ink">
        {value}
      </span>
    </div>
  );
}

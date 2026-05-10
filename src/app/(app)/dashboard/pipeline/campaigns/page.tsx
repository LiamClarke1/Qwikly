"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  CampaignCard,
  type CampaignCardData,
} from "@/components/pipeline-dash/CampaignCard";

async function safeQuery<T>(
  build: () => Promise<{ data: T[] | null; error: { message?: string } | null }>
): Promise<T[]> {
  try {
    const { data, error } = await build();
    if (error) return [];
    return (data || []) as T[];
  } catch {
    return [];
  }
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<CampaignCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await safeQuery<CampaignCardData>(() =>
        supabase
          .from("pipeline_campaigns")
          .select(
            "id, name, icp_slug, status, prospects_count, sent_count, replies_count, meetings_count, last_activity_at"
          )
          .order("last_activity_at", { ascending: false, nullsFirst: false })
          .limit(200)
      );
      if (cancelled) return;
      // Belt-and-braces sort, in case last_activity_at is null in places.
      const sorted = [...data].sort((a, b) => {
        const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return tb - ta;
      });
      setRows(sorted);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pb-6 border-b border-ink/[0.08]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard/pipeline"
              className="eyebrow text-ink-500 hover:text-ember"
            >
              Pipeline
            </Link>
            <h1 className="font-display text-[36px] md:text-[42px] leading-[1.05] tracking-tight text-ink">
              Campaigns
            </h1>
            <p className="text-ink-500 text-[14px]">
              <span className="num font-mono">{rows.length}</span>{" "}
              {rows.length === 1 ? "campaign" : "campaigns"}, sorted by last activity.
            </p>
          </div>
          <Link
            href="/dashboard/pipeline/setup"
            className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2.5 text-[13.5px] font-medium hover:bg-ink-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create campaign
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="ed-card !p-6 text-[13px] text-ink-500">Loading,</div>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="ed-card !p-10 flex flex-col items-center text-center gap-4">
      <span className="w-10 h-10 rounded-full bg-[#F4EEE4] inline-flex items-center justify-center">
        <Megaphone className="w-5 h-5 text-ink-500" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-[22px] tracking-tight text-ink">
          No campaigns yet
        </p>
        <p className="text-[13.5px] text-ink-500 max-w-[44ch]">
          No campaigns yet. Run setup to launch your first.
        </p>
      </div>
      <Link
        href="/dashboard/pipeline/setup"
        className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2.5 text-[13px] font-medium hover:bg-ink-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Open setup
      </Link>
    </div>
  );
}

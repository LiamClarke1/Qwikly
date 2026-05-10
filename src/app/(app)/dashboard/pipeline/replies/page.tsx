"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ReplyRow, type ReplyRowData } from "@/components/pipeline-dash/ReplyRow";
import {
  ReplyDetailDrawer,
  type ReplyDetail,
} from "@/components/pipeline-dash/ReplyDetailDrawer";

const DEMO_REPLIES: ReplyDetail[] = [
  {
    id: "demo-r1",
    prospect_name: "Amina Patel",
    prospect_company: "Sandown Wellness Studio",
    prospect_email: "amina@sandownwellness.co.za",
    classification: "interested",
    received_at: new Date(Date.now() - 1800000).toISOString(),
    thread: [
      {
        id: "t1",
        direction: "outbound",
        subject: "Quick idea for after hours bookings",
        body: "Hi Amina, noticed you offer Saturday slots. Would a 15 minute walk-through be useful?",
        at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "t2",
        direction: "inbound",
        subject: "Re: Quick idea for after hours bookings",
        body: "Yes, please send a time. Tuesdays after 4pm work best.",
        at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
  {
    id: "demo-r2",
    prospect_name: "Themba Mokoena",
    prospect_company: "Mokoena Plumbing",
    prospect_email: "themba@mokoenaplumbing.co.za",
    classification: "ask_later",
    received_at: new Date(Date.now() - 7200000).toISOString(),
    thread: [],
  },
  {
    id: "demo-r3",
    prospect_name: "Lara van der Merwe",
    prospect_company: "Rosebank Aesthetic Clinic",
    prospect_email: "lara@rosebankaesthetic.co.za",
    classification: "ooo",
    received_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    thread: [],
  },
  {
    id: "demo-r4",
    prospect_name: "Kabelo Sithole",
    prospect_company: "Sithole Auto Repairs",
    prospect_email: "kabelo@sitholeauto.co.za",
    classification: "not_interested",
    received_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    thread: [],
  },
];

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

export default function RepliesPage() {
  const sp = useSearchParams();
  const demoFlag = sp.get("demo") === "1";
  const [rows, setRows] = useState<ReplyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ReplyDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await safeQuery<ReplyDetail>(() =>
        supabase
          .from("pipeline_replies")
          .select(
            "id, prospect_name, prospect_company, prospect_email, classification, received_at, snippet, read, thread"
          )
          .order("received_at", { ascending: false })
          .limit(200)
      );
      if (cancelled) return;
      if (data.length === 0 && demoFlag) {
        setRows(DEMO_REPLIES);
      } else {
        setRows(data);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [demoFlag]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pb-6 border-b border-ink/[0.08]">
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/pipeline"
            className="eyebrow text-ink-500 hover:text-ember"
          >
            Pipeline
          </Link>
          <h1 className="font-display text-[36px] md:text-[42px] leading-[1.05] tracking-tight text-ink">
            Replies
          </h1>
          <p className="text-ink-500 text-[14px]">
            Inbound responses from your campaigns. Triage, snooze, or hand off.
          </p>
        </div>
      </header>

      <div className="ed-card !p-0 overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-[13px] text-ink-500">Loading,</div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col">
            {rows.map((r) => (
              <li key={r.id}>
                <ReplyRow
                  reply={
                    {
                      id: r.id,
                      prospect_name: r.prospect_name,
                      prospect_company: r.prospect_company,
                      // The full snippet lives on row data, fall back to first thread line.
                      snippet:
                        (r as unknown as { snippet?: string | null }).snippet ||
                        r.thread?.[r.thread.length - 1]?.body ||
                        "",
                      classification: r.classification,
                      received_at: r.received_at,
                      read: (r as unknown as { read?: boolean | null }).read ?? null,
                    } as ReplyRowData
                  }
                  active={active?.id === r.id}
                  onClick={() => setActive(r)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReplyDetailDrawer reply={active} onClose={() => setActive(null)} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-12 flex flex-col items-center text-center gap-4">
      <span className="w-10 h-10 rounded-full bg-[#F4EEE4] inline-flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-ink-500" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-[20px] tracking-tight text-ink">
          No replies yet
        </p>
        <p className="text-[13.5px] text-ink-500 max-w-[48ch]">
          No replies yet. Replies arrive here when prospects engage with your campaigns.
        </p>
      </div>
    </div>
  );
}

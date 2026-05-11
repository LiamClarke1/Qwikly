"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProspectRow, type ProspectRowData } from "@/components/pipeline-dash/ProspectRow";
import { type ProspectDetail } from "@/components/pipeline-dash/ProspectDetailDrawer";

const DEMO_PROSPECTS: ProspectDetail[] = [
  {
    id: "demo-1",
    name: "Sipho Khumalo",
    title: "Practice Owner",
    company: "Bryanston Family Dental",
    industry: "Dental",
    email: "sipho@bfdental.co.za",
    email_verified: true,
    status: "new",
    source: "Dental, GP Sandton",
    enrichment: {
      website: "bfdental.co.za",
      employees: "6",
      years_active: "11",
    },
    recent_emails: [],
    status_history: [{ at: new Date().toISOString(), status: "new" }],
  },
  {
    id: "demo-2",
    name: "Amina Patel",
    title: "Operations Manager",
    company: "Sandown Wellness Studio",
    industry: "Wellness",
    email: "amina@sandownwellness.co.za",
    email_verified: true,
    status: "contacted",
    source: "Wellness, GP Sandton",
    enrichment: { website: "sandownwellness.co.za", employees: "12" },
    recent_emails: [
      {
        id: "m1",
        direction: "outbound",
        subject: "Quick idea for after hours bookings",
        snippet: "Hi Amina, noticed you offer Saturday slots,",
        at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    status_history: [
      { at: new Date(Date.now() - 86400000).toISOString(), status: "contacted" },
      { at: new Date(Date.now() - 172800000).toISOString(), status: "new" },
    ],
  },
  {
    id: "demo-3",
    name: "Themba Mokoena",
    title: "Founder",
    company: "Mokoena Plumbing",
    industry: "Trades",
    email: "themba@mokoenaplumbing.co.za",
    email_verified: false,
    status: "replied",
    source: "Trades, JHB North",
    enrichment: { phone: "+27 11 555 0102" },
    recent_emails: [],
    status_history: [
      { at: new Date(Date.now() - 3600000).toISOString(), status: "replied" },
    ],
  },
  {
    id: "demo-4",
    name: "Lara van der Merwe",
    title: "Practice Owner",
    company: "Rosebank Aesthetic Clinic",
    industry: "Aesthetics",
    email: "lara@rosebankaesthetic.co.za",
    email_verified: true,
    status: "qualified",
    source: "Aesthetics, GP Rosebank",
    enrichment: { website: "rosebankaesthetic.co.za", employees: "8" },
    recent_emails: [],
    status_history: [
      { at: new Date(Date.now() - 7200000).toISOString(), status: "qualified" },
    ],
  },
  {
    id: "demo-5",
    name: "Kabelo Sithole",
    title: "Service Manager",
    company: "Sithole Auto Repairs",
    industry: "Automotive",
    email: "kabelo@sitholeauto.co.za",
    email_verified: true,
    status: "booked",
    source: "Automotive, JHB East",
    enrichment: {},
    recent_emails: [],
    status_history: [],
  },
  {
    id: "demo-6",
    name: "Nadia Govender",
    title: "Director",
    company: "Govender Legal",
    industry: "Legal",
    email: "nadia@govenderlegal.co.za",
    email_verified: true,
    status: "dead",
    source: "Manual",
    enrichment: {},
    recent_emails: [],
    status_history: [],
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

export default function ProspectsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const demoFlag = sp.get("demo") === "1";
  const [rows, setRows] = useState<ProspectDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Schema columns: first_name + last_name + company. We compose
      // ProspectDetail.name from these on the client.
      const raw = await safeQuery<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        title: string | null;
        company: string | null;
        industry: string | null;
        email: string | null;
        email_verified: boolean | null;
        status: string | null;
        source: string | null;
      }>(() =>
        supabase
          .from("pipeline_prospects")
          .select(
            "id, first_name, last_name, title, company, industry, email, email_verified, status, source",
          )
          .order("enrichment_score", { ascending: false, nullsFirst: false })
          .limit(500),
      );
      if (cancelled) return;
      const composed: ProspectDetail[] = raw.map((r) => {
        const fullName = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
        const display = r.company?.trim() || fullName || "Untitled prospect";
        return {
          id: r.id,
          name: display,
          title: r.title,
          company: r.company,
          industry: r.industry,
          email: r.email,
          email_verified: r.email_verified,
          status: r.status,
          source: r.source,
          enrichment: null,
          recent_emails: [],
          status_history: [],
        } as ProspectDetail;
      });
      if (composed.length === 0 && demoFlag) {
        setRows(DEMO_PROSPECTS);
      } else {
        setRows(composed);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [demoFlag]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((p) => {
      return [p.name, p.company, p.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [rows, q]);

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
              Prospects
            </h1>
            <p className="text-ink-500 text-[14px]">
              <span className="num font-mono">{rows.length}</span>{" "}
              {rows.length === 1 ? "contact" : "contacts"} in your pool.
            </p>
          </div>
          <Link
            href="/dashboard/pipeline/generate"
            className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2.5 text-[13.5px] font-medium hover:bg-ink-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate more
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, company, or email,"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-ink/10 text-[13.5px] text-ink placeholder:text-ink-400 focus:outline-none focus:border-ink/25"
          />
        </div>

        <div className="ed-card !p-0 overflow-hidden">
          {loading ? (
            <div className="px-5 py-8 text-[13px] text-ink-500">Loading,</div>
          ) : filtered.length === 0 && rows.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13.5px] text-ink-500">
              No prospects match {`"${q}"`}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-[#F9F6F2] border-b border-ink/[0.08]">
                    <Th>Name</Th>
                    <Th>Title</Th>
                    <Th>Company</Th>
                    <Th>Industry</Th>
                    <Th>Email</Th>
                    <Th>Status</Th>
                    <Th>Source</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06]">
                  {filtered.map((p) => (
                    <ProspectRow
                      key={p.id}
                      prospect={p as ProspectRowData}
                      onClick={() =>
                        router.push(`/dashboard/pipeline/prospects/${p.id}`)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-500 font-mono">
      {children}
    </th>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-12 flex flex-col items-center text-center gap-4">
      <span className="w-10 h-10 rounded-full bg-[#F4EEE4] inline-flex items-center justify-center">
        <Users className="w-5 h-5 text-ink-500" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-[20px] tracking-tight text-ink">
          No prospects yet
        </p>
        <p className="text-[13.5px] text-ink-500 max-w-[42ch]">
          No prospects yet. Generate your first list.
        </p>
      </div>
      <Link
        href="/dashboard/pipeline/generate"
        className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2.5 text-[13px] font-medium hover:bg-ink-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Generate prospects
      </Link>
    </div>
  );
}

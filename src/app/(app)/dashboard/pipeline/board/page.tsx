// Pipeline kanban board, server component.
// Reads all pipeline_prospects for the signed-in tenant, joins against
// pipeline_meetings to split the 'qualified' status into Discovery (meeting
// 'booked') and Demo (meeting 'held'). All Supabase reads are soft-failed so
// the board renders even when the schema is not yet provisioned.

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { KanbanBoard, type BoardProspect } from "@/components/pipeline-dash/KanbanBoard";

export const dynamic = "force-dynamic";

interface ProspectRow {
  id: string;
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  industry: string | null;
  city: string | null;
  status: string | null;
  enrichment_score: number | null;
  created_at: string;
}

interface MeetingRow {
  prospect_id: string;
  status: string | null;
  created_at: string;
}

export default async function PipelineBoardPage({
  searchParams,
}: {
  searchParams: { sprint?: string };
}) {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const db = supabaseAdmin();
  const { data: biz } = await db
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const businessId = (biz as { id?: string } | null)?.id ?? null;

  let prospects: ProspectRow[] = [];
  let meetings: MeetingRow[] = [];

  if (businessId) {
    try {
      const { data, error } = await db
        .from("pipeline_prospects")
        .select(
          "id, company, first_name, last_name, title, industry, city, status, enrichment_score, created_at",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error && data) prospects = data as ProspectRow[];
    } catch {
      // Soft-fail: render empty columns.
    }

    try {
      const { data, error } = await db
        .from("pipeline_meetings")
        .select("prospect_id, status, created_at")
        .eq("business_id", businessId);
      if (!error && data) meetings = data as MeetingRow[];
    } catch {
      // Soft-fail.
    }
  }

  // Build per-prospect latest meeting status. If a prospect has both a 'held'
  // and a 'booked' record, we prefer 'held' so the card sits in Demo.
  const meetingByProspect = new Map<string, "booked" | "held" | null>();
  for (const m of meetings) {
    const s = (m.status || "").toLowerCase();
    const current = meetingByProspect.get(m.prospect_id) ?? null;
    if (s === "held") {
      meetingByProspect.set(m.prospect_id, "held");
    } else if (s === "booked" && current !== "held") {
      meetingByProspect.set(m.prospect_id, "booked");
    }
  }

  const boardProspects: BoardProspect[] = prospects.map((p) => {
    const meetingStatus = meetingByProspect.get(p.id) ?? null;
    const displayName =
      (p.company && p.company.trim()) ||
      [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
      "Untitled prospect";

    return {
      id: p.id,
      displayName,
      industry: p.industry || null,
      city: p.city || null,
      score: typeof p.enrichment_score === "number" ? p.enrichment_score : null,
      status: (p.status || "new") as BoardProspect["status"],
      meetingStatus,
    };
  });

  const sprintMode = (searchParams?.sprint || "").toLowerCase() === "10x25";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pb-6 border-b border-ink/[0.08]">
        <div className="eyebrow text-ink-500">Pipeline</div>
        <h1 className="font-display text-[40px] md:text-[48px] leading-[1.05] tracking-tight text-ink">
          Pipeline
        </h1>
        <p className="text-ink-500 text-[15px] max-w-[680px]">
          Drag a prospect by changing its status. Right-click any pill for the full menu.
        </p>
      </header>

      {sprintMode ? (
        <div className="ed-card !p-4 flex items-center gap-3 border-ember/30 bg-[#FAEFD8]">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ember text-paper text-[12px] font-mono">
            25
          </span>
          <div className="flex flex-col">
            <div className="text-ink font-medium text-[13.5px]">
              Sprint mode, focus on these 10
            </div>
            <div className="text-ink-500 text-[12.5px]">
              25 minute timer, top 10 cold prospects only. Other columns dimmed.
            </div>
          </div>
        </div>
      ) : null}

      <KanbanBoard prospects={boardProspects} sprintMode={sprintMode} />
    </div>
  );
}

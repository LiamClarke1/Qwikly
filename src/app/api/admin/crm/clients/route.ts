import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { nextAnchorDate, todaySast } from "@/lib/billing/anchor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const q        = searchParams.get("q")?.trim() ?? "";
  const status   = searchParams.get("status")?.split(",").filter(Boolean) ?? [];
  const plan     = searchParams.get("plan")?.split(",").filter(Boolean) ?? [];
  const tagIds   = searchParams.get("tag")?.split(",").filter(Boolean) ?? [];
  const billing  = searchParams.get("billing")?.split(",").filter(Boolean) ?? [];
  const sortBy   = searchParams.get("sort") ?? "created_at";
  const sortDir  = searchParams.get("dir") === "asc";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const offset   = (page - 1) * limit;

  const db = supabaseAdmin();

  // Build filtered client IDs first if tag filter is active
  let allowedByTag: number[] | null = null;
  if (tagIds.length > 0) {
    const { data } = await db
      .from("crm_client_tags")
      .select("client_id")
      .in("tag_id", tagIds);
    allowedByTag = Array.from(new Set((data ?? []).map(r => r.client_id)));
    if (allowedByTag.length === 0) {
      return NextResponse.json({ clients: [], total: 0, pages: 0 });
    }
  }

  let query = db
    .from("clients")
    .select(`
      id, business_name, owner_name, client_email, whatsapp_number,
      logo_url, trade, industry, website,
      crm_status, plan, mrr_zar, health_score, ltv_zar,
      onboarding_step, onboarding_complete, onboarding_completed_at,
      web_widget_status, web_widget_enabled,
      account_manager_id, created_at, deletion_scheduled_at,
      billing_anchor_day, billing_anchor_set_at
    `, { count: "exact" });

  if (status.length)          query = query.in("crm_status", status);
  if (plan.length)            query = query.in("plan", plan);
  if (allowedByTag)           query = query.in("id", allowedByTag);
  if (q) {
    query = query.or(
      `business_name.ilike.%${q}%,owner_name.ilike.%${q}%,client_email.ilike.%${q}%,whatsapp_number.ilike.%${q}%,trade.ilike.%${q}%`
    );
  }

  const validSorts = new Set(["business_name","mrr_zar","health_score","created_at","plan","crm_status","next_invoice_at"]);
  const col = validSorts.has(sortBy) ? sortBy : "created_at";
  query = query.order(col, { ascending: sortDir }).range(offset, offset + limit - 1);

  const { data: clients, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (clients ?? []).map(c => c.id);
  if (ids.length === 0) return NextResponse.json({ clients: [], total: 0, pages: 0 });

  // Fetch tags, channels, last activity in parallel
  const [tagsRes, convosRes] = await Promise.all([
    db.from("crm_client_tags").select("client_id, crm_tags(id, name, color)").in("client_id", ids),
    db.from("conversations")
      .select("client_id, channel, created_at")
      .in("client_id", ids)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const tagsByClient: Record<number, { id: string; name: string; color: string }[]> = {};
  for (const row of (tagsRes.data ?? [])) {
    const tag = row.crm_tags as unknown as { id: string; name: string; color: string } | null;
    if (!tag) continue;
    if (!tagsByClient[row.client_id]) tagsByClient[row.client_id] = [];
    tagsByClient[row.client_id].push(tag);
  }

  const channelsByClient: Record<number, Set<string>> = {};
  const lastActivityByClient: Record<number, string> = {};
  const convoCountByClient: Record<number, number> = {};
  for (const c of (convosRes.data ?? [])) {
    if (!channelsByClient[c.client_id]) channelsByClient[c.client_id] = new Set();
    channelsByClient[c.client_id].add(c.channel ?? "whatsapp");
    if (!lastActivityByClient[c.client_id]) lastActivityByClient[c.client_id] = c.created_at;
    convoCountByClient[c.client_id] = (convoCountByClient[c.client_id] ?? 0) + 1;
  }

  // Enrich with billing computed fields
  const clientIds = (clients ?? []).map(c => c.id);
  let latestByClient = new Map<number, { status: string; due_at: string | null }>();
  if (clientIds.length > 0) {
    const latestInvRes = await db
      .from("qwikly_billing_invoices")
      .select("client_id, status, due_at, created_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });
    for (const row of (latestInvRes.data ?? []) as { client_id: number; status: string; due_at: string | null }[]) {
      if (!latestByClient.has(row.client_id)) {
        latestByClient.set(row.client_id, { status: row.status, due_at: row.due_at });
      }
    }
  }

  const todayDate = todaySast();
  let enriched = (clients ?? []).map(c => {
    const anchor = (c as { billing_anchor_day?: number | null }).billing_anchor_day ?? null;
    let next_invoice_at: string | null = null;
    let days_overdue: number | null = null;
    if (anchor) {
      next_invoice_at = nextAnchorDate(anchor, todayDate).toISOString().slice(0, 10);
    }
    const latest = latestByClient.get(c.id);
    if (latest?.status === "overdue" && latest.due_at) {
      days_overdue = Math.max(0, Math.floor((todayDate.getTime() - new Date(latest.due_at).getTime()) / 86_400_000));
    }
    return {
      ...c,
      tags: tagsByClient[c.id] ?? [],
      channels: Array.from(channelsByClient[c.id] ?? new Set<string>()),
      last_activity_at: lastActivityByClient[c.id] ?? null,
      conversation_count: convoCountByClient[c.id] ?? 0,
      next_invoice_at,
      latest_billing_invoice_status: latest?.status ?? null,
      days_overdue,
    };
  });

  // Apply billing filter (post-fetch, since computed fields aren't in the DB)
  if (billing.length > 0) {
    enriched = enriched.filter(c => {
      const anchor = c.billing_anchor_day;
      return billing.some(b => {
        if (b === "upcoming_week") {
          if (!c.next_invoice_at) return false;
          const days = (new Date(c.next_invoice_at).getTime() - todayDate.getTime()) / 86_400_000;
          return days <= 7;
        }
        if (b === "awaiting_verification") return c.latest_billing_invoice_status === "awaiting_verification";
        if (b === "overdue") return c.latest_billing_invoice_status === "overdue";
        if (b === "draft") return c.latest_billing_invoice_status === "draft";
        if (b === "no_anchor") return !anchor;
        return false;
      });
    });
  }

  const total = count ?? 0;
  return NextResponse.json({
    clients: enriched,
    total,
    pages: Math.ceil(total / limit),
  });
}

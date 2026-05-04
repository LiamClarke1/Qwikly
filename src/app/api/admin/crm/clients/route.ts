import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const q        = searchParams.get("q")?.trim() ?? "";
  const status   = searchParams.get("status")?.split(",").filter(Boolean) ?? [];
  const plan     = searchParams.get("plan")?.split(",").filter(Boolean) ?? [];
  const tagIds   = searchParams.get("tag")?.split(",").filter(Boolean) ?? [];
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
      account_manager_id, created_at
    `, { count: "exact" });

  if (status.length)          query = query.in("crm_status", status);
  if (plan.length)            query = query.in("plan", plan);
  if (allowedByTag)           query = query.in("id", allowedByTag);
  if (q) {
    query = query.or(
      `business_name.ilike.%${q}%,owner_name.ilike.%${q}%,client_email.ilike.%${q}%,whatsapp_number.ilike.%${q}%,trade.ilike.%${q}%`
    );
  }

  const validSorts = new Set(["business_name","mrr_zar","health_score","created_at","plan","crm_status"]);
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

  const total = count ?? 0;
  return NextResponse.json({
    clients: (clients ?? []).map(c => ({
      ...c,
      tags: tagsByClient[c.id] ?? [],
      channels: Array.from(channelsByClient[c.id] ?? new Set<string>()),
      last_activity_at: lastActivityByClient[c.id] ?? null,
      conversation_count: convoCountByClient[c.id] ?? 0,
    })),
    total,
    pages: Math.ceil(total / limit),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  business_name:          z.string().optional(),
  owner_name:             z.string().optional(),
  client_email:           z.string().email().optional(),
  whatsapp_number:        z.string().optional(),
  logo_url:               z.string().url().nullable().optional(),
  industry:               z.string().nullable().optional(),
  website:                z.string().nullable().optional(),
  address:                z.string().nullable().optional(),
  crm_status:             z.enum(["onboarding","active","at_risk","paused","churned","pending_deletion"]).optional(),
  plan:                   z.enum(["trial","starter","pro","premium","billions"]).optional(),
  billing_cycle:          z.enum(["monthly","annual"]).nullable().optional(),
  mrr_zar:                z.number().int().min(0).optional(),
  health_score:           z.number().int().min(0).max(100).optional(),
  account_manager_id:     z.string().uuid().nullable().optional(),
  ltv_zar:                z.number().int().min(0).optional(),
  next_renewal_at:        z.string().nullable().optional(),
  trial_ends_at:          z.string().nullable().optional(),
  deletion_scheduled_at:  z.string().nullable().optional(),
  web_widget_enabled:     z.boolean().optional(),
}).strict();

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [clientRes, tagsRes, convosRes, notesCountRes, tasksOpenRes, bookingsRes] = await Promise.all([
    db.from("clients").select("*").eq("id", id).maybeSingle(),
    db.from("crm_client_tags").select("crm_tags(id,name,color)").eq("client_id", id),
    db.from("conversations").select("channel, created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(5000),
    db.from("crm_notes").select("id", { count: "exact", head: true }).eq("client_id", id),
    db.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", id).eq("status", "open"),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("client_id", id),
  ]);

  if (!clientRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tags = (tagsRes.data ?? [])
    .map(r => r.crm_tags as unknown as { id: string; name: string; color: string } | null)
    .filter((t): t is { id: string; name: string; color: string } => t !== null);

  const channelSet = new Set<string>();
  let lastActivity: string | null = null;
  for (const c of (convosRes.data ?? [])) {
    channelSet.add(c.channel ?? "whatsapp");
    if (!lastActivity) lastActivity = c.created_at;
  }

  return NextResponse.json({
    client: {
      ...clientRes.data,
      tags,
      channels: Array.from(channelSet),
      last_activity_at: lastActivity,
      conversation_count: convosRes.data?.length ?? 0,
      notes_count: notesCountRes.count ?? 0,
      tasks_open: tasksOpenRes.count ?? 0,
      bookings_total: bookingsRes.count ?? 0,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("clients")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.crm_status) {
    await db.from("crm_events").insert({
      client_id: id,
      actor_id: auth.userId,
      event_type: "status_changed",
      payload: { to: parsed.data.crm_status },
    });
  }
  if (parsed.data.plan) {
    await db.from("crm_events").insert({
      client_id: id,
      actor_id: auth.userId,
      event_type: "plan_changed",
      payload: { to: parsed.data.plan },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — schedules the client for deletion in 30 days.
// Immediately revokes widget access and marks them pending_deletion.
// The /api/cron/client-cleanup job hard-deletes after 30 days.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const deletionScheduledAt = new Date().toISOString();

  const db = supabaseAdmin();
  await db.from("clients").update({
    crm_status:            "pending_deletion",
    deletion_scheduled_at: deletionScheduledAt,
    web_widget_enabled:    false,
  }).eq("id", id);

  await db.from("crm_events").insert({
    client_id:  id,
    actor_id:   auth.userId,
    event_type: "client_deletion_scheduled",
    payload:    { deletion_scheduled_at: deletionScheduledAt },
  });

  return NextResponse.json({ ok: true, deletion_scheduled_at: deletionScheduledAt });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Runs daily at 03:00 SAST.
// Hard-deletes any client whose deletion_scheduled_at is older than 30 days
// and whose crm_status is still "pending_deletion".
// Deletes all associated data in dependency order before removing the client row.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Find clients past the 30-day window
  const { data: expiredClients, error: fetchErr } = await db
    .from("clients")
    .select("id, business_name, deletion_scheduled_at")
    .eq("crm_status", "pending_deletion")
    .lt("deletion_scheduled_at", cutoff);

  if (fetchErr) {
    console.error("[client-cleanup] fetch error:", fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!expiredClients?.length) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const ids = expiredClients.map(c => c.id);
  const errors: string[] = [];

  for (const id of ids) {
    try {
      // Delete associated data in dependency order
      await Promise.all([
        db.from("crm_events").delete().eq("client_id", id),
        db.from("crm_notes").delete().eq("client_id", id),
        db.from("crm_tasks").delete().eq("client_id", id),
        db.from("crm_contacts").delete().eq("client_id", id),
        db.from("crm_files").delete().eq("client_id", id),
        db.from("crm_reports").delete().eq("client_id", id),
        db.from("crm_client_tags").delete().eq("client_id", id),
      ]);

      // Conversations + messages (messages likely cascade from conversations)
      await db.from("conversations").delete().eq("client_id", id);

      // Bookings and commission records (tables may not exist on all envs)
      await Promise.allSettled([
        db.from("bookings").delete().eq("client_id", id),
        db.from("commissions").delete().eq("client_id", id),
        db.from("invoices").delete().eq("client_id", id),
      ]);

      // Finally remove the client record itself
      const { error: deleteErr } = await db.from("clients").delete().eq("id", id);
      if (deleteErr) throw new Error(deleteErr.message);

      console.log(`[client-cleanup] hard-deleted client ${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[client-cleanup] failed to delete client ${id}:`, msg);
      errors.push(`client ${id}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    deleted: ids.length - errors.length,
    failed: errors.length,
    errors: errors.length ? errors : undefined,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/booking-availability";
import { supabaseAdmin } from "@/lib/supabase-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

// GET /api/web/availability?tenantId=qw_pk_xxx
//
// Public, called from the embed widget when the inline calendar opens.
// Returns slots that respect the owner's Google Calendar + the 20-minute
// buffer rule. Same pause/trial gates the chat route uses, so a paused or
// expired tenant cannot leak booking slots.
//
// tenantId is the public_key the widget already knows (data-qwikly-id).
// We resolve it to the numeric clients.id internally.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId")?.trim();

  if (!tenantId) {
    return NextResponse.json({ ok: false, reason: "invalid_tenant" }, { status: 400, headers: CORS });
  }

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, crm_status, auth_user_id")
    .eq("public_key", tenantId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ ok: false, reason: "client_not_found" }, { status: 404, headers: CORS });
  }
  const clientId = String(client.id);
  if (client.crm_status === "pending_deletion") {
    return NextResponse.json({ ok: false, reason: "service_suspended" }, { status: 403, headers: CORS });
  }

  // Manual pause, separate select so the route is safe before the
  // ai_paused migration is applied (see chat/route.ts for the same pattern).
  const { data: pauseRow } = await db
    .from("clients")
    .select("ai_paused")
    .eq("id", clientId)
    .maybeSingle();
  if (pauseRow?.ai_paused) {
    return NextResponse.json({ ok: false, reason: "paused" }, { status: 403, headers: CORS });
  }

  if (client.auth_user_id) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("plan, trial_ends_at")
      .eq("user_id", client.auth_user_id)
      .maybeSingle();
    const trialExpired =
      (sub?.plan === "trial" || !sub) &&
      sub?.trial_ends_at &&
      new Date(sub.trial_ends_at) < new Date();
    if (trialExpired) {
      return NextResponse.json({ ok: false, reason: "trial_expired" }, { status: 403, headers: CORS });
    }
  }

  const result = await getAvailableSlots(clientId, { durationMin: 30 });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 503, headers: CORS });
  }

  return NextResponse.json(
    { ok: true, timezone: "Africa/Johannesburg", durationMin: 30, slots: result.slots },
    { headers: CORS }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bookMeeting } from "@/lib/booking-create";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, retryAfterSeconds } from "@/lib/rate-limit";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

// Email-only booking. Per project memory, the chat asks for email, never phone,
// so visitor_phone is intentionally not accepted by this endpoint.
const Body = z.object({
  tenant_id: z.string().min(1, "tenant_id required"),
  conversation_id: z.string().max(120).optional(),
  visitor_name: z.string().trim().min(1).max(200),
  visitor_email: z.string().trim().email().max(320),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});

// POST /api/web/bookings
//
// Public, called from the embed widget after a visitor picks a slot and
// fills in the details form. Wraps bookMeeting() which (a) re-checks
// availability against Google Calendar, (b) creates the event with a
// Google Meet link, (c) emails the visitor a branded confirmation, and
// (d) emails the business owner via notifyLeadCaptured-style logic.
export async function POST(req: NextRequest) {
  // Per-IP cap, this endpoint mutates state and creates calendar events.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipOk = await checkRateLimit(`web-bookings:ip:${ip}`, 5);
  if (!ipOk) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { ...CORS, "Retry-After": String(retryAfterSeconds("minute")) } }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400, headers: CORS });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_body", details: parsed.error.flatten() },
      { status: 400, headers: CORS }
    );
  }
  const { tenant_id, conversation_id, visitor_name, visitor_email, start, end, notes } = parsed.data;

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, crm_status, auth_user_id")
    .eq("public_key", tenant_id)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ ok: false, reason: "client_not_found" }, { status: 404, headers: CORS });
  }
  const clientIdStr = String(client.id);
  if (client.crm_status === "pending_deletion") {
    return NextResponse.json({ ok: false, reason: "service_suspended" }, { status: 403, headers: CORS });
  }

  // Manual pause, separate select so the route is safe before the
  // ai_paused migration has been applied (mirrors chat/intake routes).
  const { data: pauseRow } = await db
    .from("clients")
    .select("ai_paused")
    .eq("id", clientIdStr)
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

  const result = await bookMeeting({
    clientId: clientIdStr,
    visitorName: visitor_name,
    visitorEmail: visitor_email,
    start,
    end,
    notes: notes ?? null,
    conversationId: conversation_id ?? null,
  });

  if (!result.ok) {
    const status = result.reason === "slot_taken" ? 409 : 503;
    return NextResponse.json({ ok: false, reason: result.reason }, { status, headers: CORS });
  }

  return NextResponse.json(
    {
      ok: true,
      eventId: result.eventId,
      meetLink: result.meetLink,
      eventLink: result.eventLink,
      start: result.start,
      end: result.end,
      label: result.label,
    },
    { headers: CORS }
  );
}

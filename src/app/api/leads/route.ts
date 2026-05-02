import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { v2Auth } from "@/lib/v2-auth";
import { resend, FROM } from "@/lib/resend";
import { PLAN_CONFIG, resolvePlan } from "@/lib/plan";
import {
  leadNotificationHtml,
  capReachedNotificationHtml,
} from "@/lib/email/templates/lead-v2";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

// ─── POST /api/leads (PUBLIC) ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    api_key?: string;
    name?: string;
    contact?: string;
    need?: string;
    preferred_time?: string;
    visitor_email?: string;
    raw_conversation?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const { api_key, contact } = body;
  if (!api_key || !contact) {
    return NextResponse.json(
      { error: "api_key and contact are required" },
      { status: 400, headers: CORS }
    );
  }

  const allowed = await checkRateLimit(api_key, 100);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429, headers: CORS });
  }

  const db = supabaseAdmin();

  const { data: business } = await db
    .from("businesses")
    .select("id, name, contact_email, user_id")
    .eq("api_key", api_key)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "invalid_api_key" }, { status: 401, headers: CORS });
  }

  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, current_period_start, current_period_end")
    .eq("user_id", business.user_id)
    .maybeSingle();

  const plan = (sub?.plan ?? "starter") as "starter" | "pro" | "premium";
  const usagePeriod = await ensureUsagePeriod(db, business.id, sub);
  const planConfig = PLAN_CONFIG[resolvePlan(plan)];
  const leadCap = planConfig.leadLimit; // null = no hard cap (premium)

  // ── Lead cap enforcement ──────────────────────────────────────────────────────
  if (leadCap !== null && usagePeriod.leads_captured >= leadCap) {
    // Only email on the first blocked request (when exactly at cap)
    if (usagePeriod.leads_captured === leadCap) {
      resend.emails
        .send({
          from: FROM,
          to: [business.contact_email],
          subject: "You've hit your Qwikly lead cap — upgrade to keep capturing",
          html: capReachedNotificationHtml({ businessName: business.name }),
        })
        .catch(() => {});
    }
    return NextResponse.json({ ok: true, capped: true }, { headers: CORS });
  }

  // ── Store lead ────────────────────────────────────────────────────────────────
  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert({
      business_id: business.id,
      name: body.name ?? null,
      contact,
      need: body.need ?? null,
      preferred_time: body.preferred_time ?? null,
      visitor_email: body.visitor_email ?? null,
      raw_conversation: body.raw_conversation ?? null,
    })
    .select("id, confirm_token, name, need, preferred_time, visitor_email")
    .single();

  if (leadError || !lead) {
    console.error("[leads] insert error:", leadError?.message);
    return NextResponse.json({ error: "failed_to_store" }, { status: 500, headers: CORS });
  }

  if (!lead.confirm_token) {
    console.error("[leads] confirm_token missing on lead:", lead.id);
    return NextResponse.json({ error: "failed_to_store" }, { status: 500, headers: CORS });
  }

  // ── Increment usage ───────────────────────────────────────────────────────────
  // Track top-up count when a paid plan goes over its included cap (soft overflow for billing)
  const isOverCap = leadCap !== null && usagePeriod.leads_captured >= leadCap;
  await db
    .from("usage_periods")
    .update({
      leads_captured: usagePeriod.leads_captured + 1,
      ...(isOverCap ? { top_up_count: usagePeriod.top_up_count + 1 } : {}),
    })
    .eq("id", usagePeriod.id);

  // ── Send notification email ───────────────────────────────────────────────────
  const confirmUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=confirm`;
  const suggestUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=suggest`;

  resend.emails
    .send({
      from: FROM,
      to: [business.contact_email],
      subject: `New lead from your website — ${lead.name ?? contact}`,
      html: leadNotificationHtml({
        businessName: business.name,
        leadName: lead.name,
        contact,
        need: lead.need,
        preferredTime: lead.preferred_time,
        visitorEmail: lead.visitor_email,
        confirmUrl,
        suggestUrl,
      }),
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, lead_id: lead.id }, { headers: CORS });
}

// ─── GET /api/leads (AUTH) ────────────────────────────────────────────────────

export async function GET() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .select("id, name, contact, need, preferred_time, visitor_email, status, captured_at")
    .eq("business_id", auth.businessId)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  }

  return NextResponse.json(data ?? []);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function ensureUsagePeriod(
  db: ReturnType<typeof supabaseAdmin>,
  businessId: string,
  sub: { current_period_start?: string | null; current_period_end?: string | null } | null
) {
  const now = new Date();

  const periodStart = sub?.current_period_start
    ? new Date(sub.current_period_start)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { data: existing } = await db
    .from("usage_periods")
    .select("id, leads_captured, top_up_count")
    .eq("business_id", businessId)
    .lte("period_start", now.toISOString())
    .gte("period_end", now.toISOString())
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await db
    .from("usage_periods")
    .upsert(
      {
        business_id: businessId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        leads_captured: 0,
        top_up_count: 0,
      },
      { onConflict: "business_id,period_start", ignoreDuplicates: true }
    )
    .select("id, leads_captured, top_up_count")
    .maybeSingle();

  if (created) return created;

  const { data: fetched } = await db
    .from("usage_periods")
    .select("id, leads_captured, top_up_count")
    .eq("business_id", businessId)
    .lte("period_start", now.toISOString())
    .gte("period_end", now.toISOString())
    .maybeSingle();

  return fetched!;
}

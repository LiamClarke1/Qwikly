import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM, ghostedFollowupHtml } from "@/lib/resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

// Window: visitors who gave us their email but never became a lead, dormant
// for at least 24h and at most 72h. Outside that window we either give them
// space (under 24h) or write them off (over 72h, the nudge stops feeling
// timely and starts feeling like spam).
const MIN_DORMANT_MS = 24 * 60 * 60 * 1000;
const MAX_DORMANT_MS = 72 * 60 * 60 * 1000;

type ConvoRow = {
  id: number;
  client_id: number;
  customer_name: string | null;
  customer_email: string;
  updated_at: string;
};

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const legacyHeader = req.headers.get("x-cron-secret");
  if (
    !secret ||
    (authHeader !== `Bearer ${secret}` && legacyHeader !== secret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = Date.now();
  const minUpdated = new Date(now - MAX_DORMANT_MS).toISOString();
  const maxUpdated = new Date(now - MIN_DORMANT_MS).toISOString();

  const { data: rows, error } = await db
    .from("conversations")
    .select("id, client_id, customer_name, customer_email, updated_at")
    .eq("is_lead", false)
    .is("follow_up_sent_at", null)
    .not("customer_email", "is", null)
    .gte("updated_at", minUpdated)
    .lte("updated_at", maxUpdated)
    .limit(200);

  if (error) {
    console.error("[ghosted-followup] query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const candidates = (rows ?? []).filter(
    (r): r is ConvoRow => !!r && typeof r.customer_email === "string" && r.customer_email.trim().length > 0
  );

  if (!candidates.length) return NextResponse.json({ sent: 0, failed: 0 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "no_resend_key" }, { status: 500 });
  }

  // Cache business lookups so a busy day with many ghosted convos for one
  // tenant doesn't fan out into N duplicate selects.
  const businessCache = new Map<number, { businessName: string; replyTo: string | null }>();

  let sent = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      let bizInfo = businessCache.get(row.client_id);
      if (!bizInfo) {
        const { data: client } = await db
          .from("clients")
          .select("business_name, auth_user_id")
          .eq("id", row.client_id)
          .maybeSingle();
        const clientRow = client as { business_name?: string | null; auth_user_id?: string | null } | null;

        let replyTo: string | null = null;
        if (clientRow?.auth_user_id) {
          const { data: business } = await db
            .from("businesses")
            .select("notification_email, contact_email")
            .eq("user_id", clientRow.auth_user_id)
            .maybeSingle();
          const bizRow = business as { notification_email?: string | null; contact_email?: string | null } | null;
          replyTo = (bizRow?.notification_email?.trim() || bizRow?.contact_email?.trim()) ?? null;
        }

        bizInfo = {
          businessName: clientRow?.business_name?.trim() || "Qwikly",
          replyTo,
        };
        businessCache.set(row.client_id, bizInfo);
      }

      const subject = `Quick follow-up from ${bizInfo.businessName}`;
      const html = ghostedFollowupHtml({
        visitorName: row.customer_name,
        businessName: bizInfo.businessName,
        replyUrl: SITE,
      });

      const { data, error: sendError } = await resend.emails.send({
        from: FROM,
        to: [row.customer_email.trim()],
        replyTo: bizInfo.replyTo ?? undefined,
        subject,
        html,
      });

      if (sendError) {
        console.error("[ghosted-followup] send failed", {
          conversationId: row.id,
          clientId: row.client_id,
          error: sendError.message ?? String(sendError),
        });
        failed++;
        continue;
      }

      // Stamp follow_up_sent_at AFTER a successful send so a transient send
      // failure leaves the row eligible for the next tick.
      const { error: stampError } = await db
        .from("conversations")
        .update({ follow_up_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      if (stampError) {
        console.error("[ghosted-followup] stamp failed (email already sent)", {
          conversationId: row.id,
          clientId: row.client_id,
          messageId: data?.id ?? null,
          error: stampError.message,
        });
        // Email went out, just couldn't mark it. Count as sent so we don't
        // double-report, but leave a loud log so an operator can backfill.
      }

      sent++;
    } catch (err) {
      console.error("[ghosted-followup] unexpected error", {
        conversationId: row.id,
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// Vercel Cron uses GET by default in some configurations. Accept both so the
// schedule fires regardless of how the platform invokes it.
export async function GET(req: NextRequest) {
  return handle(req);
}

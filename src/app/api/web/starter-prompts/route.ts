import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateStarterPrompts } from "@/lib/starter-prompts";
import { checkRateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipOk = await checkRateLimit(`starter-prompts:ip:${ip}`, 30);
  if (!ipOk) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { ...CORS, "Retry-After": String(retryAfterSeconds("minute")) } }
    );
  }

  const tenantId = req.nextUrl.searchParams.get("tenant_id");
  if (!tenantId || tenantId.length < 4) {
    return NextResponse.json(
      { ok: false, reason: "invalid_tenant_id" },
      { status: 400, headers: CORS }
    );
  }

  // Same pause/trial gates the chat route uses, so a paused or trial-expired
  // tenant cannot leak suggested prompts to visitors after the assistant has
  // been shut off.
  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("auth_user_id, ai_paused")
    .eq("public_key", tenantId)
    .maybeSingle();

  if (client?.ai_paused) {
    return NextResponse.json({ ok: false, reason: "paused" }, { status: 403, headers: CORS });
  }
  if (client?.auth_user_id) {
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

  const result = await getOrGenerateStarterPrompts(tenantId);
  return NextResponse.json(result, { headers: CORS });
}

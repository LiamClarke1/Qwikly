import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertTenantActive } from "@/lib/billing/tenant-gate";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUCCESS_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "no-store",
};

const ERROR_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key_required" }, { status: 400, headers: ERROR_HEADERS });
  }

  const db = supabaseAdmin();

  const { data: business, error } = await db
    .from("businesses")
    .select("id, name, accent_colour, greeting, qualifying_questions, branding_removed, user_id")
    .eq("api_key", key)
    .maybeSingle();

  if (error || !business) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: ERROR_HEADERS });
  }

  // Same trial gate the chat route uses, so a paused or trial-expired tenant
  // does not hand a v2 widget back its branding/greeting and cannot re-open
  // the chat after the assistant has been shut off.
  if (business.user_id) {
    const gate = await assertTenantActive(db, { kind: "auth_user_id", userId: business.user_id });
    if (!gate.ok) {
      return NextResponse.json({ error: "paused" }, { status: 403, headers: ERROR_HEADERS });
    }
  }

  return NextResponse.json(
    {
      business_id: business.id,
      name: business.name,
      accent_colour: business.accent_colour,
      greeting: business.greeting,
      qualifying_questions: business.qualifying_questions ?? [],
      branding_removed: business.branding_removed,
    },
    { headers: SUCCESS_HEADERS }
  );
}

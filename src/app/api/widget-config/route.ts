import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key_required" }, { status: 400, headers: CORS });
  }

  const db = supabaseAdmin();

  const { data: business, error } = await db
    .from("businesses")
    .select("id, name, accent_colour, greeting, qualifying_questions, branding_removed, user_id")
    .eq("api_key", key)
    .maybeSingle();

  if (error || !business) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }

  const { data: sub } = await db
    .from("subscriptions")
    .select("plan")
    .eq("user_id", business.user_id)
    .maybeSingle();

  const plan = sub?.plan ?? "starter";
  // Starter plan: force branding on regardless of stored value
  const brandingRemoved = plan === "starter" ? false : business.branding_removed;

  return NextResponse.json(
    {
      business_id: business.id,
      name: business.name,
      accent_colour: business.accent_colour,
      greeting: business.greeting,
      qualifying_questions: business.qualifying_questions ?? [],
      branding_removed: brandingRemoved,
    },
    { headers: CORS }
  );
}

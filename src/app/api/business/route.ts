import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const PATCHABLE = ["name", "industry", "contact_email", "accent_colour", "greeting", "qualifying_questions"] as const;

export async function GET() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("businesses")
    .select("id, name, industry, contact_email, accent_colour, greeting, qualifying_questions, api_key, branding_removed, created_at")
    .eq("id", auth.businessId)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ...data,
    branding_removed: auth.plan === "starter" ? false : data.branding_removed,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  for (const field of PATCHABLE) {
    if (field in body) updates[field] = body[field];
  }

  if ("branding_removed" in body && auth.plan !== "starter") {
    updates.branding_removed = Boolean(body.branding_removed);
  }

  if (body.rotate_api_key === true) {
    updates.api_key = `qw_${randomBytes(24).toString("hex")}`;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("businesses")
    .update(updates)
    .eq("id", auth.businessId)
    .select("id, name, industry, contact_email, accent_colour, greeting, qualifying_questions, api_key, branding_removed, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ...data,
    branding_removed: auth.plan === "starter" ? false : data.branding_removed,
  });
}

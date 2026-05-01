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
    if (!(field in body)) continue;
    if (field === "qualifying_questions") {
      const val = body[field];
      if (!Array.isArray(val) || val.some((q) => typeof q !== "string")) {
        return NextResponse.json({ error: "qualifying_questions must be an array of strings" }, { status: 400 });
      }
    }
    if (field === "accent_colour") {
      if (typeof body[field] !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(body[field] as string)) {
        return NextResponse.json({ error: "accent_colour must be a valid 6-digit hex colour (e.g. #E85A2C)" }, { status: 400 });
      }
    }
    updates[field] = body[field];
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

  if (error) {
    console.error("[business PATCH] update error:", error.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    branding_removed: auth.plan === "starter" ? false : data.branding_removed,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const PATCHABLE = [
  "name",
  "industry",
  "contact_email",
  "notification_email",
  "lead_emails_enabled",
  "owner_first_name",
  "accent_colour",
  "greeting",
  "qualifying_questions",
] as const;

// SELECT * keeps the API resilient to schema drift — when a migration adds
// new columns (e.g. owner_first_name) the dashboard keeps working even if
// the column doesn't exist yet on this DB; missing fields just come back
// undefined and the frontend handles them with `??` defaults.
function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  // Postgres "undefined column" / PostgREST schema cache mismatch error codes
  return error.code === "42703" || (error.message ?? "").toLowerCase().includes("does not exist");
}

export async function GET() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("businesses")
    .select("*")
    .eq("id", auth.businessId)
    .maybeSingle();

  if (error) {
    console.error("[business GET] db error:", error);
    return NextResponse.json(
      { error: "db_error", message: error.message, hint: error.hint ?? null },
      { status: 500 }
    );
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
    if (field === "notification_email") {
      const val = body[field];
      if (val !== null && val !== "" && (typeof val !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))) {
        return NextResponse.json({ error: "notification_email must be a valid email or null" }, { status: 400 });
      }
      updates[field] = val === "" ? null : val;
      continue;
    }
    if (field === "lead_emails_enabled") {
      updates[field] = Boolean(body[field]);
      continue;
    }
    if (field === "owner_first_name") {
      const val = body[field];
      if (val !== null && typeof val !== "string") {
        return NextResponse.json({ error: "owner_first_name must be a string or null" }, { status: 400 });
      }
      const trimmed = typeof val === "string" ? val.trim() : null;
      updates[field] = trimmed && trimmed.length > 0 ? trimmed : null;
      continue;
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
  let { data, error } = await db
    .from("businesses")
    .update(updates)
    .eq("id", auth.businessId)
    .select("*")
    .single();

  // Drop unknown columns (e.g. when a migration hasn't been applied yet) and retry.
  // Lets the dashboard keep working through partial deploys.
  if (error && isMissingColumnError(error)) {
    const safeUpdates = { ...updates };
    for (const key of Object.keys(updates)) {
      if ((error.message ?? "").toLowerCase().includes(key.toLowerCase())) {
        delete safeUpdates[key];
      }
    }
    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: "schema_outdated", message: "The database is missing a column the app expects. Run pending migrations." },
        { status: 503 }
      );
    }
    ({ data, error } = await db
      .from("businesses")
      .update(safeUpdates)
      .eq("id", auth.businessId)
      .select("*")
      .single());
  }

  if (error) {
    console.error("[business PATCH] update error:", error.message);
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    branding_removed: auth.plan === "starter" ? false : data.branding_removed,
  });
}

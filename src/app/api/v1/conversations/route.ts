import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

// Verify an API key and return the associated client_id + scopes
async function resolveApiKey(authHeader: string | null): Promise<{ clientId: number; scopes: string[] } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith("qw_live_")) return null;

  const hash = createHash("sha256").update(raw).digest("hex");

  const db = supabaseAdmin();
  const { data: key } = await db
    .from("api_keys")
    .select("client_id, scopes, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!key || key.revoked_at) return null;

  // Update last_used_at in the background (fire-and-forget)
  void db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);

  return { clientId: key.client_id as number, scopes: key.scopes as string[] };
}

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  if (!auth.scopes.includes("conversations:read")) {
    return NextResponse.json({ error: "Insufficient scope — conversations:read required" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const params = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);
  const offset = parseInt(params.get("offset") ?? "0");
  const status = params.get("status");

  let query = db
    .from("conversations")
    .select("id, customer_phone, status, created_at, updated_at")
    .eq("client_id", auth.clientId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    data: data ?? [],
    pagination: { limit, offset, count: data?.length ?? 0 },
  });
}

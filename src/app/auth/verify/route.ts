import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function redirectWith(reason: "verified" | "expired" | "invalid" | "already") {
  const url = new URL("/dashboard", APP_URL);
  url.searchParams.set("verify", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return redirectWith("invalid");

  const db = supabaseAdmin();
  const tokenHash = hashToken(token);

  const { data: row, error: lookupError } = await db
    .from("email_verifications")
    .select("id, client_id, expires_at, consumed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError || !row) return redirectWith("invalid");
  if (row.consumed_at) return redirectWith("already");
  if (new Date(row.expires_at as string).getTime() < Date.now()) return redirectWith("expired");

  const nowIso = new Date().toISOString();

  const { error: consumeError } = await db
    .from("email_verifications")
    .update({ consumed_at: nowIso })
    .eq("id", row.id);

  if (consumeError) return redirectWith("invalid");

  const { error: verifyError } = await db
    .from("clients")
    .update({ email_verified_at: nowIso })
    .eq("id", row.client_id);

  if (verifyError) return redirectWith("invalid");

  return redirectWith("verified");
}

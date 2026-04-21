import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const db = supabaseAdmin();
  await db.from("clients").update({
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
  }).eq("id", clientId);

  return NextResponse.json({ ok: true });
}

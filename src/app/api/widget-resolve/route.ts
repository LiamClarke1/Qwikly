import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  const { data } = await db
    .from("clients")
    .select("id")
    .eq("public_key", key)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }

  return NextResponse.json(
    { client_id: String(data.id) },
    { headers: { ...CORS, "Cache-Control": "public, max-age=300" } }
  );
}

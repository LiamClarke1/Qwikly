import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["new", "confirmed", "suggest_other", "closed", "no_show"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { status } = body;
  if (!status || !(ALLOWED_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  const { data: lead } = await db
    .from("leads")
    .select("id, business_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!lead || lead.business_id !== auth.businessId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await db
    .from("leads")
    .update({ status })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const { data } = await db.from("crm_saved_views").select("*").order("created_at");
  return NextResponse.json({ views: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = z.object({
    name:     z.string().min(1).max(100),
    filters:  z.record(z.string(), z.unknown()),
    sort_by:  z.string().nullable().optional(),
    sort_dir: z.string().nullable().optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("crm_saved_views")
    .insert({ ...parsed.data, owner_id: auth.userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ view: data }, { status: 201 });
}

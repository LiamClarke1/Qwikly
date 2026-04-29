import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TaskSchema = z.object({
  title:       z.string().min(1).max(500),
  description: z.string().max(5000).nullable().optional(),
  status:      z.enum(["open","in_progress","done","cancelled"]).optional(),
  priority:    z.enum(["low","medium","high","urgent"]).optional(),
  due_at:      z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const statusFilter = req.nextUrl.searchParams.get("status");
  const db = supabaseAdmin();

  let query = db.from("crm_tasks").select("*").eq("client_id", id).order("due_at", { ascending: true, nullsFirst: false });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = TaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("crm_tasks")
    .insert({ client_id: id, ...parsed.data })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("crm_events").insert({
    client_id: id, actor_id: auth.userId, event_type: "task_created", payload: { task_id: data.id, title: data.title },
  });

  return NextResponse.json({ task: data }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title:       z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  status:      z.enum(["open","in_progress","done","cancelled"]).optional(),
  priority:    z.enum(["low","medium","high","urgent"]).optional(),
  due_at:      z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "done" && !updates.done_at) {
    updates.done_at = new Date().toISOString();
  }

  const db = supabaseAdmin();
  const { error } = await db.from("crm_tasks").update(updates).eq("id", params.taskId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  await db.from("crm_tasks").delete().eq("id", params.taskId);
  return NextResponse.json({ ok: true });
}

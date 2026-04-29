import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const { data: file } = await db.from("crm_files").select("storage_path").eq("id", params.fileId).maybeSingle();

  if (file?.storage_path) {
    await db.storage.from("crm-files").remove([file.storage_path]);
  }

  await db.from("crm_files").delete().eq("id", params.fileId);
  return NextResponse.json({ ok: true });
}

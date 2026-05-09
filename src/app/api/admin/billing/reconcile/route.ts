import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { parseBankCsv, buildMatches, applyReconcileResult } from "@/lib/billing/bank-reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST: dry-run match (no DB writes). Returns matches + summary so the admin
 *  can review before applying. */
export async function POST(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseBankCsv(text);
  const sb = supabaseAdmin();
  const result = await buildMatches(sb, rows);

  return NextResponse.json({
    ok: true,
    filename: file.name,
    ...result,
  });
}

/** PATCH: apply a previously-previewed reconciliation run. The client posts
 *  the same CSV again (kept simple, no temp storage), we re-parse, re-match,
 *  then write. */
export async function PATCH(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const notes = (form.get("notes") as string) ?? null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseBankCsv(text);
  const sb = supabaseAdmin();
  const result = await buildMatches(sb, rows);

  const { run_id } = await applyReconcileResult(sb, result, {
    uploadedBy: auth.userId,
    filename: file.name,
    notes,
  });

  return NextResponse.json({
    ok: true,
    run_id,
    filename: file.name,
    ...result,
  });
}

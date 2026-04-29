import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("crm_files")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sign URLs for download
  const files = await Promise.all((data ?? []).map(async f => {
    const { data: signedUrl } = await db.storage
      .from("crm-files")
      .createSignedUrl(f.storage_path, 3600);
    return { ...f, url: signedUrl?.signedUrl ?? null };
  }));

  return NextResponse.json({ files });
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
  const parsed = z.object({
    name:      z.string().min(1).max(255),
    mime_type: z.string().optional(),
    size_bytes: z.number().int().positive().optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = supabaseAdmin();
  const storage_path = `clients/${id}/${Date.now()}-${parsed.data.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { data: uploadData, error: uploadError } = await db.storage
    .from("crm-files")
    .createSignedUploadUrl(storage_path);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: file, error } = await db
    .from("crm_files")
    .insert({
      client_id:    id,
      uploaded_by:  auth.userId,
      name:         parsed.data.name,
      mime_type:    parsed.data.mime_type ?? null,
      size_bytes:   parsed.data.size_bytes ?? null,
      storage_path,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    file,
    upload_url: uploadData.signedUrl,
    upload_token: uploadData.token,
  }, { status: 201 });
}

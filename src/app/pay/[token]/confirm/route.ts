import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyInvoicePayToken } from "@/lib/invoiceLinks";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const verified = verifyInvoicePayToken(params.token);
  if (!verified.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("file");
  const note = (formData.get("note") as string | null) ?? "";

  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "proof_required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const inv = await sb
    .from("qwikly_billing_invoices")
    .select("id, status")
    .eq("id", verified.invoiceId)
    .maybeSingle();

  if (inv.error || !inv.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const status = inv.data.status as string;

  if (status === "paid") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  if (status === "awaiting_verification") {
    return NextResponse.json({ ok: true, status: "awaiting_verification", already: true });
  }

  if (status !== "sent" && status !== "overdue") {
    return NextResponse.json({ error: "invalid_status_transition", from: status }, { status: 409 });
  }

  // Upload proof to Supabase Storage
  const storagePath = `${verified.invoiceId}/${Date.now()}-${safeFilename(file.name)}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await sb.storage
    .from("payment-proofs")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    // Bucket likely doesn't exist — give a clear operator hint
    if (
      uploadError.message.toLowerCase().includes("bucket") ||
      uploadError.message.toLowerCase().includes("not found") ||
      (uploadError as { statusCode?: string }).statusCode === "404"
    ) {
      console.error(
        '[billing/confirm] Storage upload failed — "payment-proofs" bucket not found. ' +
        'Create it in Supabase Storage (private, no public read) before this feature ships.',
        uploadError
      );
      return NextResponse.json(
        {
          error: "storage_not_configured",
          hint: 'Create the "payment-proofs" bucket in Supabase Storage',
        },
        { status: 500 }
      );
    }
    console.error("[billing/confirm] Storage upload error:", uploadError);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const upd = await sb
    .from("qwikly_billing_invoices")
    .update({
      status: "awaiting_verification",
      client_marked_paid_at: nowIso,
      client_payment_note: note || null,
      proof_storage_path: storagePath,
      proof_uploaded_at: nowIso,
      proof_mime_type: file.type,
    })
    .eq("id", verified.invoiceId)
    .eq("status", status);

  if (upd.error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "awaiting_verification" });
}

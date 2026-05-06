import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

const ALLOWED_EXTS: Record<string, string> = {
  "application/pdf":   "pdf",
  "image/jpeg":        "jpg",
  "image/png":         "png",
  "image/webp":        "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function detectMimeFromBytes(buf: Uint8Array): string | null {
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return "image/webp";
  if (buf[0] === 0x50 && buf[1] === 0x4B) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return "application/msword";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const tenantId      = formData.get("tenantId") as string | null;
    const sessionId     = formData.get("sessionId") as string | null;
    const conversationId = formData.get("conversationId") as string | null;
    const file          = formData.get("file") as File | null;

    if (!tenantId || !sessionId || !conversationId || !file) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: CORS });
    }

    const db = supabaseAdmin();

    // Resolve client from public_key
    const { data: client } = await db
      .from("clients")
      .select("id, doc_visitor_upload, doc_allowed_types, doc_max_size_mb")
      .eq("public_key", tenantId)
      .maybeSingle();

    if (!client) return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
    if (!client.doc_visitor_upload) return NextResponse.json({ error: "uploads_disabled" }, { status: 403, headers: CORS });

    // Verify the sessionId owns this conversation
    const { data: convo } = await db
      .from("conversations")
      .select("id, client_id, visitor_id")
      .eq("id", conversationId)
      .eq("client_id", client.id)
      .maybeSingle();

    if (!convo) return NextResponse.json({ error: "conversation_not_found" }, { status: 404, headers: CORS });
    if (convo.visitor_id && convo.visitor_id !== sessionId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403, headers: CORS });
    }

    // Size check
    const maxBytes = (client.doc_max_size_mb ?? 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "file_too_large", max_mb: client.doc_max_size_mb ?? 10 }, { status: 413, headers: CORS });
    }

    const fileBuffer = new Uint8Array(await file.arrayBuffer());

    // Magic bytes MIME verification
    const detectedMime = detectMimeFromBytes(fileBuffer);
    if (!detectedMime) {
      return NextResponse.json({ error: "unsupported_file_type" }, { status: 415, headers: CORS });
    }

    // Check against client's allowed types
    const allowedTypes: string[] = client.doc_allowed_types ?? ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(detectedMime)) {
      return NextResponse.json({ error: "file_type_not_allowed" }, { status: 415, headers: CORS });
    }

    const ext = ALLOWED_EXTS[detectedMime] ?? "bin";
    const docId = randomUUID();
    const storageName = `${randomUUID()}.${ext}`;
    const storagePath = `${client.id}/${conversationId}/${docId}/${storageName}`;

    // Upload to Supabase Storage
    const { error: storageErr } = await db.storage
      .from("conversation-documents")
      .upload(storagePath, fileBuffer, { contentType: detectedMime, upsert: false });

    if (storageErr) {
      console.error("[web/documents/upload] storage error:", storageErr);
      return NextResponse.json({ error: "upload_failed" }, { status: 500, headers: CORS });
    }

    // Insert document record
    const { data: doc, error: docErr } = await db
      .from("conversation_documents")
      .insert({
        id:              docId,
        client_id:       client.id,
        conversation_id: conversationId,
        uploaded_by:     "visitor",
        file_name:       file.name,
        storage_name:    storageName,
        file_size:       file.size,
        file_type:       detectedMime,
        storage_path:    storagePath,
        status:          "active",
      })
      .select()
      .single();

    if (docErr) {
      console.error("[web/documents/upload] db error:", docErr);
      return NextResponse.json({ error: "db_failed" }, { status: 500, headers: CORS });
    }

    // Insert message_log entry
    await db.from("messages_log").insert({
      conversation_id: conversationId,
      role:            "customer",
      content:         JSON.stringify({ filename: file.name, size: file.size }),
      message_type:    "document",
      attachment_id:   docId,
    });

    await db.from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ document: doc }, { status: 201, headers: CORS });
  } catch (err) {
    console.error("[web/documents/upload] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: CORS });
  }
}

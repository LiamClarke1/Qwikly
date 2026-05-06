import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

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
    // Auth
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const conversationId = formData.get("conversationId") as string | null;
    const file           = formData.get("file") as File | null;

    if (!conversationId || !file) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Resolve client for this user
    const { data: client } = await db
      .from("clients")
      .select("id, doc_business_send, doc_max_size_mb, doc_business_send_label")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!client) return NextResponse.json({ error: "client_not_found" }, { status: 404 });
    if (!client.doc_business_send) return NextResponse.json({ error: "send_disabled" }, { status: 403 });

    // Verify conversation belongs to this client
    const { data: convo } = await db
      .from("conversations")
      .select("id, client_id")
      .eq("id", conversationId)
      .eq("client_id", client.id)
      .maybeSingle();

    if (!convo) return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });

    // Size check
    const maxBytes = (client.doc_max_size_mb ?? 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "file_too_large", max_mb: client.doc_max_size_mb ?? 10 }, { status: 413 });
    }

    const fileBuffer = new Uint8Array(await file.arrayBuffer());

    // Magic bytes MIME verification
    const detectedMime = detectMimeFromBytes(fileBuffer);
    if (!detectedMime) {
      return NextResponse.json({ error: "unsupported_file_type" }, { status: 415 });
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
      console.error("[documents/send] storage error:", storageErr);
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    // Insert document record
    const { data: doc, error: docErr } = await db
      .from("conversation_documents")
      .insert({
        id:              docId,
        client_id:       client.id,
        conversation_id: conversationId,
        uploaded_by:     "business",
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
      console.error("[documents/send] db error:", docErr);
      return NextResponse.json({ error: "db_failed" }, { status: 500 });
    }

    // Insert message_log entry (document message)
    await db.from("messages_log").insert({
      conversation_id: conversationId,
      role:            "owner",
      content:         JSON.stringify({ filename: file.name, size: file.size }),
      message_type:    "document",
      attachment_id:   docId,
    });

    // Optional companion text message shown to visitor
    const label = client.doc_business_send_label?.trim();
    if (label) {
      await db.from("messages_log").insert({
        conversation_id: conversationId,
        role:            "owner",
        content:         label,
      });
    }

    await db.from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    console.error("[documents/send] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

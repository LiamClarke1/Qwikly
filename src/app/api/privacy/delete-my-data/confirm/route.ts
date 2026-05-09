import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyPrivacyDeletionToken } from "@/lib/privacy-token";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const verified = verifyPrivacyDeletionToken(token);
  if (!verified.ok) {
    const message =
      verified.reason === "expired"
        ? "This confirmation link has expired. Please request deletion again."
        : "This confirmation link is invalid.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const { rid, email } = verified.payload;
  const db = supabaseAdmin();

  const { data: requestRow, error: fetchErr } = await db
    .from("privacy_deletion_requests")
    .select("id, email, confirmed_at")
    .eq("id", rid)
    .maybeSingle();

  if (fetchErr) {
    console.error("[privacy:confirm] fetch error:", fetchErr.message);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }

  if (!requestRow) {
    return NextResponse.json(
      { ok: false, error: "This deletion request was not found." },
      { status: 404 }
    );
  }

  if (requestRow.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Token mismatch." }, { status: 400 });
  }

  if (requestRow.confirmed_at) {
    return NextResponse.json({
      ok: true,
      already_confirmed: true,
      message: "This request has already been processed. Your data is being removed.",
    });
  }

  const now = new Date().toISOString();

  const { data: conversations, error: convErr } = await db
    .from("conversations")
    .select("id")
    .ilike("customer_email", email)
    .is("deleted_at", null);

  if (convErr) {
    console.error("[privacy:confirm] conversation lookup error:", convErr.message);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }

  const conversationIds = (conversations ?? []).map((c) => c.id);
  let messagesAffected = 0;
  let documentsAffected = 0;

  if (conversationIds.length > 0) {
    const { error: convSoftErr } = await db
      .from("conversations")
      .update({ deleted_at: now })
      .in("id", conversationIds);
    if (convSoftErr) {
      console.error("[privacy:confirm] conversation soft-delete failed:", convSoftErr.message);
      return NextResponse.json({ ok: false, error: "Soft-delete failed." }, { status: 500 });
    }

    const { data: updatedMsgs, error: msgErr } = await db
      .from("messages_log")
      .update({ deleted_at: now })
      .in("conversation_id", conversationIds)
      .is("deleted_at", null)
      .select("id");
    if (msgErr) {
      console.error("[privacy:confirm] messages soft-delete failed:", msgErr.message);
    }
    messagesAffected = updatedMsgs?.length ?? 0;

    const { data: updatedDocs, error: docErr } = await db
      .from("conversation_documents")
      .update({ deleted_at: now, status: "deleted" })
      .in("conversation_id", conversationIds)
      .is("deleted_at", null)
      .select("id");
    if (docErr) {
      console.error("[privacy:confirm] documents soft-delete failed:", docErr.message);
    }
    documentsAffected = updatedDocs?.length ?? 0;
  }

  await db
    .from("privacy_deletion_requests")
    .update({
      confirmed_at: now,
      conversations_affected: conversationIds.length,
      messages_affected: messagesAffected,
      documents_affected: documentsAffected,
    })
    .eq("id", rid);

  return NextResponse.json({
    ok: true,
    conversations_affected: conversationIds.length,
    messages_affected: messagesAffected,
    documents_affected: documentsAffected,
    message:
      conversationIds.length > 0
        ? "Your data has been soft-deleted and will be permanently removed on the next daily retention run."
        : "We did not find any data linked to that email. If you think this is wrong, contact hello@qwikly.co.za.",
  });
}

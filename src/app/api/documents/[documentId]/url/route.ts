import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const db = supabaseAdmin();

  // Fetch the document
  const { data: doc } = await db
    .from("conversation_documents")
    .select("id, client_id, conversation_id, storage_path, status, uploaded_by")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  if (doc.status === "deleted") return NextResponse.json({ error: "deleted" }, { status: 410, headers: CORS });

  // Authorization: try cookie auth first (dashboard user)
  let authorized = false;

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

  if (user) {
    // Dashboard user: must own the client
    const { data: owned } = await db
      .from("clients")
      .select("id")
      .eq("id", doc.client_id)
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (owned) authorized = true;
  }

  // Fallback: visitor session — must own the conversation
  if (!authorized && sessionId) {
    const { data: convo } = await db
      .from("conversations")
      .select("visitor_id")
      .eq("id", doc.conversation_id)
      .maybeSingle();
    if (convo?.visitor_id === sessionId) authorized = true;
  }

  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403, headers: CORS });
  }

  const { data: signed, error: signErr } = await db.storage
    .from("conversation-documents")
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL);

  if (signErr || !signed?.signedUrl) {
    console.error("[documents/url] sign error:", signErr);
    return NextResponse.json({ error: "sign_failed" }, { status: 500, headers: CORS });
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();

  return NextResponse.json(
    { url: signed.signedUrl, expires_at: expiresAt },
    { headers: CORS }
  );
}

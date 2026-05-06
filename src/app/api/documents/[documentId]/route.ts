import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;

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

    const db = supabaseAdmin();

    // Fetch document
    const { data: doc } = await db
      .from("conversation_documents")
      .select("id, client_id, storage_path, status")
      .eq("id", documentId)
      .maybeSingle();

    if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (doc.status === "deleted") return NextResponse.json({ ok: true });

    // Verify ownership
    const { data: owned } = await db
      .from("clients")
      .select("id")
      .eq("id", doc.client_id)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!owned) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Remove from Storage
    await db.storage
      .from("conversation-documents")
      .remove([doc.storage_path]);

    // Soft delete
    await db
      .from("conversation_documents")
      .update({ status: "deleted", updated_at: new Date().toISOString() })
      .eq("id", documentId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[documents/delete] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

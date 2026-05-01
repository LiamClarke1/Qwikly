import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getClientId(): Promise<number | null> {
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
  if (!user) return null;
  const db = supabaseAdmin();
  const { data } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  return data ? (data.id as number) : null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("email_links")
    .delete()
    .eq("id", params.id)
    .eq("client_id", clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

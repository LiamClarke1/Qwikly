import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

const VALID_STATUSES = ["correct", "needs_fix"] as const;
type TrainingStatus = (typeof VALID_STATUSES)[number];

async function getClientId(): Promise<number | null> {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return client?.id ?? null;
}

// POST /api/logs/[id]/training
// [id] is the message UUID in messages_log
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messageId?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messageId, status } = body;

  if (!messageId || typeof messageId !== "string") {
    return NextResponse.json({ error: "Missing or invalid messageId" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status as TrainingStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Must be one of: correct, needs_fix" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Verify the message belongs to a conversation owned by this client (tenant isolation)
  // Join messages_log -> conversations to confirm client ownership
  const { data: message } = await db
    .from("messages_log")
    .select("id, conversation_id, conversations!inner(client_id)")
    .eq("id", messageId)
    .eq("conversations.client_id", clientId)
    .maybeSingle();

  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await db
    .from("messages_log")
    .update({ training_status: status as TrainingStatus })
    .eq("id", messageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

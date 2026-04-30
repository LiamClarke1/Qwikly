import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

const VALID_SENTIMENTS = ["positive", "neutral", "negative"] as const;
type Sentiment = (typeof VALID_SENTIMENTS)[number];

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

// POST /api/logs/[id]/sentiment
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sentiment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sentiment } = body;
  if (!VALID_SENTIMENTS.includes(sentiment as Sentiment)) {
    return NextResponse.json(
      { error: "Invalid sentiment. Must be one of: positive, neutral, negative" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Verify conversation belongs to this client (tenant isolation)
  const { data: convo } = await db
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await db
    .from("conversations")
    .update({ sentiment: sentiment as Sentiment })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

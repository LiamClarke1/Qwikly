import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getAuthenticatedClientId(req: NextRequest): Promise<number | null> {
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
  const { data: c } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  return c ? (c.id as number) : null;
}

// GET /api/sequences — list sequences for the authenticated client
export async function GET(req: NextRequest) {
  const clientId = await getAuthenticatedClientId(req);
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("email_sequences")
    .select(`
      id, name, trigger_type, status, created_at,
      email_sequence_steps(id, position, delay_hours, subject, heading, body, cta_text, cta_url),
      email_sequence_enrollments(id, status)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

// POST /api/sequences — create a sequence (with steps)
export async function POST(req: NextRequest) {
  const clientId = await getAuthenticatedClientId(req);
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: seq, error } = await db
    .from("email_sequences")
    .insert({ client_id: clientId, name: body.name, trigger_type: body.trigger_type ?? "manual", status: "draft" })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.steps?.length) {
    await db.from("email_sequence_steps").insert(
      body.steps.map((s: { subject: string; body: string; delay_hours?: number; position?: number; heading?: string; cta_text?: string; cta_url?: string }, i: number) => ({
        sequence_id: seq.id,
        position: s.position ?? i,
        delay_hours: s.delay_hours ?? 24,
        subject: s.subject,
        heading: s.heading ?? null,
        body: s.body,
        cta_text: s.cta_text ?? null,
        cta_url: s.cta_url ?? null,
      }))
    );
  }

  return NextResponse.json({ id: seq.id }, { status: 201 });
}

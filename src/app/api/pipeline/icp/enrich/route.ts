import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-server";
import { runEnrichment } from "@/lib/pipeline/enrichment/run";
import { checkCapForTenant } from "@/lib/pipeline/billing/cap-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // enrichment is one Anthropic call plus two Places calls

interface RequestBody {
  websiteUrl?: string;
  offer?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  if (!body.websiteUrl || !body.offer) {
    return NextResponse.json({ error: "websiteUrl and offer are required" }, { status: 400 });
  }

  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    },
  );

  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, plan, products")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "no client row" }, { status: 404 });
  }

  const c = client as { id: number | string; plan: string; products: unknown };
  const products = Array.isArray(c.products) ? (c.products as string[]) : [];
  if (!products.includes("outbound")) {
    return NextResponse.json({ error: "outbound product not active" }, { status: 403 });
  }

  // Cap check up front. Projected cost for one enrichment run: ~300 cents
  // (one Anthropic synthesis + two Google Places lookups, all small).
  const cap = await checkCapForTenant({
    clientId: c.id,
    plan: c.plan,
    projectedCents: 300,
  });
  if (cap.over) {
    return NextResponse.json(
      {
        error: "cap_reached",
        message: "Monthly data budget reached. Top up to continue.",
        spentCents: cap.spentCents,
        capCents: cap.capCents,
      },
      { status: 402 },
    );
  }

  try {
    const enriched = await runEnrichment({
      clientId: c.id,
      websiteUrl: body.websiteUrl,
      offer: body.offer,
    });
    return NextResponse.json(enriched);
  } catch (err: unknown) {
    console.error("[icp/enrich] synthesis failed", err);
    return NextResponse.json(
      { error: "synthesis_failed", message: "Couldn't build your ICP. Please try again." },
      { status: 500 },
    );
  }
}

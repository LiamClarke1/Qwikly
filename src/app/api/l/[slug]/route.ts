import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

function appendUtms(url: string, params: Record<string, string | null | undefined>): string {
  try {
    const u = new URL(url);
    Object.entries(params).forEach(([k, v]) => {
      if (v) u.searchParams.set(k, v);
    });
    return u.toString();
  } catch {
    return url;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const db = supabaseAdmin();
  const slug = params.slug;

  const { data: link } = await db
    .from("email_links")
    .select("id, destination_url, utm_source, utm_medium, utm_content, campaign")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL!), { status: 302 });
  }

  // Hash IP for unique-click detection (no PII stored)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const ipHash = createHash("sha256").update(ip + link.id).digest("hex").slice(0, 16);

  const userAgent = req.headers.get("user-agent") ?? undefined;

  // Check if this is a unique click today
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await db
    .from("email_link_clicks")
    .select("id")
    .eq("link_id", link.id)
    .eq("ip_hash", ipHash)
    .gte("clicked_at", `${today}T00:00:00Z`)
    .maybeSingle();

  const isUnique = !existing;

  // Insert click event + update counters (fire-and-forget style, don't block redirect)
  Promise.all([
    db.from("email_link_clicks").insert({
      link_id: link.id,
      ip_hash: ipHash,
      user_agent: userAgent,
      is_unique: isUnique,
    }),
    db.rpc("increment_link_clicks", {
      p_link_id: link.id,
      p_is_unique: isUnique,
    }),
  ]).catch(err => console.error("[/api/l] click tracking failed", err));

  const destination = appendUtms(link.destination_url, {
    utm_source: link.utm_source,
    utm_medium: link.utm_medium,
    utm_content: link.utm_content,
    utm_campaign: link.campaign,
  });

  return NextResponse.redirect(destination, { status: 302 });
}

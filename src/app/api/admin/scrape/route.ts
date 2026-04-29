import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return false;
  const db = supabaseAdmin();
  const { data } = await db.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
  return !!data;
}

function extractSections(html: string): { title: string; body: string }[] {
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const sections: { title: string; body: string }[] = [];

  const sectionRe = /<(h[123])[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<h[123]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(clean)) !== null) {
    const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const body = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (title.length > 1 && body.length > 20) {
      sections.push({ title: title.slice(0, 120), body: body.slice(0, 800) });
    }
  }

  if (sections.length === 0) {
    const text = clean.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 50) {
      const hostname = "";
      sections.push({ title: `Website content${hostname ? ` — ${hostname}` : ""}`, body: text.slice(0, 800) });
    }
  }

  return sections.slice(0, 30);
}

export async function POST(req: NextRequest) {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { client_id, url } = await req.json() as { client_id: number | string; url: string };
  if (!client_id || !url) return NextResponse.json({ error: "Missing client_id or url" }, { status: 400 });

  let hostname = "";
  try { hostname = new URL(url).hostname; } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "Qwikly-Scraper/1.0" },
    });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
  }

  const sections = extractSections(html);
  if (sections.length === 0) return NextResponse.json({ error: "No content extracted" }, { status: 422 });

  const db = supabaseAdmin();

  // Delete previously scraped articles for this client
  await db
    .from("kb_articles")
    .delete()
    .eq("client_id", Number(client_id))
    .ilike("title", `[${hostname}]%`);

  const now = new Date().toISOString();
  const rows = sections.map(s => ({
    client_id: Number(client_id),
    title: `[${hostname}] ${s.title}`,
    body: s.body,
    is_active: true,
    is_public: true,
    updated_at: now,
  }));

  const { error } = await db.from("kb_articles").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, sections: rows.length, hostname });
}

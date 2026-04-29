import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let body: { client_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ verified: false, reason: "bad_request" }, { status: 400 }); }

  const { client_id } = body;
  if (!client_id) return NextResponse.json({ verified: false, reason: "missing_client_id" }, { status: 400 });

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("web_widget_domain")
    .eq("id", client_id)
    .maybeSingle();

  if (!client?.web_widget_domain) {
    return NextResponse.json({ verified: false, reason: "no_domain" }, { status: 400 });
  }

  const rawDomain = client.web_widget_domain as string;
  const siteUrl = rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`;

  let html = "";
  try {
    const res = await fetch(siteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Qwikly-Verifier/1.0" },
    });
    html = await res.text();
  } catch {
    return NextResponse.json({ verified: false, reason: "site_unreachable", diagnostics: ["site_unreachable"] });
  }

  const htmlLower = html.toLowerCase();
  const hasQwikly = htmlLower.includes("qwikly");
  const hasClientId = html.includes(String(client_id));

  if (hasQwikly && hasClientId) {
    await supabaseAdmin.from("clients").update({
      web_widget_status: "verified",
      web_widget_verified_at: new Date().toISOString(),
    }).eq("id", client_id);
    return NextResponse.json({ verified: true });
  }

  const diagnostics: string[] = [];
  if (!hasQwikly) diagnostics.push("widget_script_not_found");
  else if (!hasClientId) diagnostics.push("wrong_client_id");
  else diagnostics.push("script_tag_malformed");

  return NextResponse.json({ verified: false, reason: "not_found", diagnostics });
}

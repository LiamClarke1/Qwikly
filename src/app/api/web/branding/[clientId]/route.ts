// DEPRECATED: used only by the legacy public/widget/widget.js (numeric client ID).
// New embeds use /api/embed/branding/[tenantId] (public_key) via public/embed.js.
// Do not add new features here — consolidate into the tenantId endpoint when widget.js is retired.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=30",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { clientId } = params;

  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("business_name, web_widget_color, web_widget_greeting, ai_greeting, web_widget_launcher_label, web_widget_position, web_widget_enabled, invoice_logo_url")
    .eq("id", clientId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Check trial expiry for non-hardcoded clients
  if (clientId !== "1") {
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("auth_user_id")
      .eq("id", clientId)
      .maybeSingle();

    if (client?.auth_user_id) {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, trial_ends_at")
        .eq("user_id", client.auth_user_id)
        .maybeSingle();

      const trialExpired =
        (sub?.plan === "trial" || !sub) &&
        sub?.trial_ends_at &&
        new Date(sub.trial_ends_at) < new Date();

      if (trialExpired) {
        return NextResponse.json({ error: "paused" }, { status: 403 });
      }
    }
  }

  const greeting = data.ai_greeting?.trim() || data.web_widget_greeting?.trim() || "Hi! How can we help you today?";

  return NextResponse.json({
    name: data.business_name ?? "Us",
    color: data.web_widget_color ?? "#E85A2C",
    greeting,
    launcher_label: data.web_widget_launcher_label ?? "Message us",
    position: data.web_widget_position ?? "bottom-right",
    logo: data.invoice_logo_url ?? null,
  }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

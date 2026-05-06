import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=30",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;
  const db = supabaseAdmin();

  const { data } = await db
    .from("clients")
    .select(
      "business_name, web_widget_color, web_widget_greeting, ai_greeting, web_widget_launcher_label, web_widget_position, web_widget_enabled, auth_user_id, invoice_logo_url, doc_visitor_upload, doc_allowed_types, doc_max_size_mb, doc_visitor_prompt"
    )
    .eq("public_key", tenantId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }
  if (!data.web_widget_enabled) {
    return NextResponse.json({ error: "disabled" }, { status: 403, headers: CORS });
  }

  // Block if trial has expired and no paid plan is active
  if (data.auth_user_id) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("plan, trial_ends_at")
      .eq("user_id", data.auth_user_id)
      .maybeSingle();

    const trialExpired =
      (sub?.plan === "trial" || !sub) &&
      sub?.trial_ends_at &&
      new Date(sub.trial_ends_at) < new Date();

    if (trialExpired) {
      return NextResponse.json({ error: "paused" }, { status: 403, headers: CORS });
    }
  }

  // ai_greeting is set via the assistant settings page ("Opening greeting").
  // web_widget_greeting is set during onboarding. ai_greeting takes priority when present,
  // so changes made post-onboarding are immediately reflected in the widget.
  const greeting =
    data.ai_greeting?.trim() ||
    data.web_widget_greeting?.trim() ||
    "Hi! How can we help?";

  return NextResponse.json(
    {
      name: data.business_name ?? "Us",
      color: data.web_widget_color ?? "#E85A2C",
      greeting,
      launcher_label: data.web_widget_launcher_label ?? "Message us",
      position: data.web_widget_position ?? "bottom-right",
      logo: data.invoice_logo_url ?? null,
      doc_visitor_upload:  data.doc_visitor_upload  ?? true,
      doc_allowed_types:   data.doc_allowed_types   ?? ["application/pdf", "image/jpeg", "image/png"],
      doc_max_size_mb:     data.doc_max_size_mb      ?? 10,
      doc_visitor_prompt:  data.doc_visitor_prompt   ?? null,
    },
    { headers: CORS }
  );
}

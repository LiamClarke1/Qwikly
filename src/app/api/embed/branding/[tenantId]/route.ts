import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;

  const { data } = await supabaseAdmin
    .from("clients")
    .select(
      "business_name, web_widget_color, web_widget_greeting, web_widget_launcher_label, web_widget_position, web_widget_enabled"
    )
    .eq("public_key", tenantId)
    .maybeSingle();

  if (!data || !data.web_widget_enabled) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }

  return NextResponse.json(
    {
      name: data.business_name ?? "Us",
      color: data.web_widget_color ?? "#E85A2C",
      greeting: data.web_widget_greeting ?? "Hi! How can we help?",
      launcher_label: data.web_widget_launcher_label ?? "Message us",
      position: data.web_widget_position ?? "bottom-right",
    },
    { headers: CORS }
  );
}

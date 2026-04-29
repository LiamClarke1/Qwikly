import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { clientId } = params;

  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("business_name, web_widget_color, web_widget_greeting, web_widget_launcher_label, web_widget_position, web_widget_enabled")
    .eq("id", clientId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!data.web_widget_enabled) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  return NextResponse.json({
    name: data.business_name ?? "Us",
    color: data.web_widget_color ?? "#E85A2C",
    greeting: data.web_widget_greeting ?? "Hi! How can we help you today?",
    launcher_label: data.web_widget_launcher_label ?? "Message us",
    position: data.web_widget_position ?? "bottom-right",
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

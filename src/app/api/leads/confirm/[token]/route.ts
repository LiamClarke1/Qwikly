import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { visitorConfirmationHtml } from "@/lib/email/templates/lead-v2";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const action = req.nextUrl.searchParams.get("action") ?? "confirm";
  const { token } = params;

  const db = supabaseAdmin();

  const { data: lead } = await db
    .from("leads")
    .select("id, name, visitor_email, preferred_time, business_id, status")
    .eq("confirm_token", token)
    .maybeSingle();

  if (!lead) {
    return NextResponse.redirect(`${BASE_URL}/?lead=not_found`);
  }

  if (action === "confirm") {
    await db.from("leads").update({ status: "confirmed" }).eq("id", lead.id);

    if (lead.visitor_email) {
      const { data: biz } = await db
        .from("businesses")
        .select("name")
        .eq("id", lead.business_id)
        .maybeSingle();

      resend.emails
        .send({
          from: FROM,
          to: [lead.visitor_email],
          subject: `Your booking is confirmed — ${biz?.name ?? "your request"}`,
          html: visitorConfirmationHtml({
            visitorName: lead.name,
            businessName: biz?.name ?? "the business",
            preferredTime: lead.preferred_time,
          }),
        })
        .catch(() => {});
    }

    return NextResponse.redirect(`${BASE_URL}/?lead=confirmed`);
  }

  // action === "suggest"
  await db.from("leads").update({ status: "suggest_other" }).eq("id", lead.id);
  return NextResponse.redirect(`${BASE_URL}/?lead=suggest_other`);
}

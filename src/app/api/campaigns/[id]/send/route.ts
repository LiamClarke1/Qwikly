import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendWhatsAppMessage, interpolate } from "@/lib/twilio-whatsapp";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const campaignId = params.id;

  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status === "sent") {
    return NextResponse.json({ error: "Campaign already sent" }, { status: 400 });
  }

  await supabase
    .from("campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  const { data: client } = await supabase
    .from("clients")
    .select("business_name")
    .eq("id", campaign.client_id)
    .single();

  let contactQuery = supabase
    .from("contacts")
    .select("id, name, phone")
    .eq("client_id", campaign.client_id)
    .not("phone", "is", null);

  const lifecycleFilter = campaign.audience_filter?.lifecycle;
  if (lifecycleFilter?.length) {
    contactQuery = contactQuery.in("lifecycle_stage", lifecycleFilter);
  }

  const { data: contacts } = await contactQuery;

  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contacts ?? []) {
    const message = interpolate(campaign.message_body, {
      name: contact.name ?? "",
      business: client?.business_name ?? "",
    });

    try {
      await sendWhatsAppMessage(contact.phone, message);
      await supabase.from("campaign_recipients").insert({
        campaign_id: campaignId,
        contact_id: contact.id,
        phone: contact.phone,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      sentCount++;
    } catch (err: unknown) {
      await supabase.from("campaign_recipients").insert({
        campaign_id: campaignId,
        contact_id: contact.id,
        phone: contact.phone,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
      failedCount++;
    }
  }

  await supabase
    .from("campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
    })
    .eq("id", campaignId);

  return NextResponse.json({ sent: sentCount, failed: failedCount });
}

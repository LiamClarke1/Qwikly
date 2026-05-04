import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage, interpolate } from "@/lib/twilio-whatsapp";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify session
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const campaignId = params.id;

  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Verify campaign's client belongs to this user
  const { data: ownedClient } = await supabase
    .from("clients")
    .select("id")
    .eq("id", campaign.client_id)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!ownedClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    .maybeSingle();

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

  // Find contacts already successfully sent to in this campaign run.
  // This makes the endpoint safely resumable — if the function times out
  // mid-send, re-calling it won't duplicate messages to already-sent contacts.
  const { data: alreadySent } = await supabase
    .from("campaign_recipients")
    .select("contact_id")
    .eq("campaign_id", campaignId)
    .eq("status", "sent");

  const alreadySentIds = new Set((alreadySent ?? []).map((r) => r.contact_id).filter(Boolean));
  const pendingContacts = (contacts ?? []).filter((c) => !alreadySentIds.has(c.id));

  let sentCount = alreadySentIds.size; // count previously sent recipients too
  let failedCount = 0;

  for (const contact of pendingContacts) {
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

  // Only mark "sent" when all recipients have been processed (sent or failed).
  // If this function was cut short by a timeout, status stays "sending" and
  // can be resumed by re-calling the endpoint.
  const totalContacts = (contacts ?? []).length;
  const processedCount = sentCount + failedCount;
  const allProcessed = processedCount >= totalContacts;

  await supabase
    .from("campaigns")
    .update({
      status: allProcessed ? "sent" : "sending",
      ...(allProcessed && { sent_at: new Date().toISOString() }),
      sent_count: sentCount,
    })
    .eq("id", campaignId);

  return NextResponse.json({ sent: sentCount, failed: failedCount, resumed: alreadySentIds.size > 0 });
}

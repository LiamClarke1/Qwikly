// Run this in Supabase SQL editor before deploying:
// CREATE TABLE IF NOT EXISTS automation_logs (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   automation_id uuid NOT NULL,
//   source_id text NOT NULL,
//   fired_at timestamptz DEFAULT now(),
//   UNIQUE(automation_id, source_id)
// );

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage, interpolate } from "@/lib/twilio-whatsapp";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const now = new Date();

  const { data: automations } = await supabase
    .from("automations")
    .select("id, client_id, trigger_type, trigger_config, action_type, action_config, fire_count")
    .eq("is_active", true);

  if (!automations?.length) return NextResponse.json({ fired: 0 });

  let fired = 0;

  for (const automation of automations) {
    const { trigger_type, trigger_config, action_config } = automation;
    const clientId = automation.client_id;

    try {
      if (trigger_type === "booking_created" || trigger_type === "booking_completed") {
        const delayHours: number = trigger_config?.delay_hours ?? 0;
        const windowEnd = new Date(now.getTime() - delayHours * 3600 * 1000);
        const windowStart = new Date(windowEnd.getTime() - 15 * 60 * 1000);

        let q = supabase
          .from("bookings")
          .select("id, customer_phone, customer_name, booking_datetime")
          .eq("client_id", clientId)
          .gte(trigger_type === "booking_created" ? "created_at" : "updated_at", windowStart.toISOString())
          .lte(trigger_type === "booking_created" ? "created_at" : "updated_at", windowEnd.toISOString());

        if (trigger_type === "booking_completed") {
          q = q.eq("status", "completed");
        }

        const { data: bookings } = await q;
        if (!bookings?.length) continue;

        const { data: client } = await supabase
          .from("clients")
          .select("business_name")
          .eq("id", clientId)
          .single();

        for (const booking of bookings) {
          const { data: existing } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("source_id", booking.id)
            .maybeSingle();

          if (existing) continue;

          const message = interpolate(action_config?.template_body ?? "", {
            name: booking.customer_name ?? "",
            business: client?.business_name ?? "",
            time: booking.booking_datetime
              ? new Date(booking.booking_datetime).toLocaleString()
              : "",
          });

          await sendWhatsAppMessage(booking.customer_phone, message);

          await supabase.from("automation_logs").insert({
            automation_id: automation.id,
            source_id: booking.id,
          });

          await supabase
            .from("automations")
            .update({ fire_count: (automation.fire_count as number) + 1, last_fired_at: now.toISOString() })
            .eq("id", automation.id);

          fired++;
        }
      } else if (trigger_type === "no_show") {
        const delayHours: number = trigger_config?.delay_hours ?? 0;
        const windowEnd = new Date(now.getTime() - delayHours * 3600 * 1000);
        const windowStart = new Date(windowEnd.getTime() - 15 * 60 * 1000);

        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, customer_phone, customer_name, booking_datetime")
          .eq("client_id", clientId)
          .eq("status", "no-show")
          .gte("booking_datetime", windowStart.toISOString())
          .lte("booking_datetime", windowEnd.toISOString());

        if (!bookings?.length) continue;

        const { data: client } = await supabase
          .from("clients")
          .select("business_name")
          .eq("id", clientId)
          .single();

        for (const booking of bookings) {
          const { data: existing } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("source_id", booking.id)
            .maybeSingle();

          if (existing) continue;

          const message = interpolate(action_config?.template_body ?? "", {
            name: booking.customer_name ?? "",
            business: client?.business_name ?? "",
            time: booking.booking_datetime
              ? new Date(booking.booking_datetime).toLocaleString()
              : "",
          });

          await sendWhatsAppMessage(booking.customer_phone, message);

          await supabase.from("automation_logs").insert({
            automation_id: automation.id,
            source_id: booking.id,
          });

          await supabase
            .from("automations")
            .update({ fire_count: (automation.fire_count as number) + 1, last_fired_at: now.toISOString() })
            .eq("id", automation.id);

          fired++;
        }
      } else if (trigger_type === "recall_due") {
        const daysSince: number = trigger_config?.days_since ?? 0;
        const windowEnd = new Date(now.getTime() - daysSince * 86400 * 1000);
        const windowStart = new Date(windowEnd.getTime() - 86400 * 1000);

        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, phone, name, last_booking_at")
          .eq("client_id", clientId)
          .not("phone", "is", null)
          .gte("last_booking_at", windowStart.toISOString())
          .lte("last_booking_at", windowEnd.toISOString());

        if (!contacts?.length) continue;

        const { data: client } = await supabase
          .from("clients")
          .select("business_name")
          .eq("id", clientId)
          .single();

        for (const contact of contacts) {
          const { data: existing } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("source_id", contact.id)
            .maybeSingle();

          if (existing) continue;

          const message = interpolate(action_config?.template_body ?? "", {
            name: contact.name ?? "",
            business: client?.business_name ?? "",
            time: "",
          });

          await sendWhatsAppMessage(contact.phone, message);

          await supabase.from("automation_logs").insert({
            automation_id: automation.id,
            source_id: contact.id,
          });

          await supabase
            .from("automations")
            .update({ fire_count: (automation.fire_count as number) + 1, last_fired_at: now.toISOString() })
            .eq("id", automation.id);

          fired++;
        }
      }
    } catch {
      // continue processing remaining automations on individual failure
    }
  }

  return NextResponse.json({ fired });
}

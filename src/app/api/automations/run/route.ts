// automation_logs table is created in migration-reliability-fixes.sql

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage, interpolate } from "@/lib/twilio-whatsapp";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
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
          .maybeSingle();

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
              ? new Date(booking.booking_datetime).toLocaleString("en-ZA", {
              timeZone: "Africa/Johannesburg",
              weekday: "short", day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })
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
          .maybeSingle();

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
              ? new Date(booking.booking_datetime).toLocaleString("en-ZA", {
              timeZone: "Africa/Johannesburg",
              weekday: "short", day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })
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
          .maybeSingle();

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
      } else if (trigger_type === "job_starting_soon") {
        // Look FORWARD: find bookings starting in [now + delay_minutes, now + delay_minutes + 15 min]
        const delayMinutes: number = trigger_config?.delay_minutes ?? 60;
        const windowStart = new Date(now.getTime() + delayMinutes * 60 * 1000);
        const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000);

        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, customer_phone, customer_name, booking_datetime")
          .eq("client_id", clientId)
          .not("status", "in", '("no-show","cancelled","completed")')
          .gte("booking_datetime", windowStart.toISOString())
          .lte("booking_datetime", windowEnd.toISOString());

        if (!bookings?.length) continue;

        const { data: client } = await supabase
          .from("clients")
          .select("business_name")
          .eq("id", clientId)
          .maybeSingle();

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
              ? new Date(booking.booking_datetime).toLocaleString("en-ZA", {
                timeZone: "Africa/Johannesburg",
                weekday: "short", day: "numeric", month: "short",
                hour: "2-digit", minute: "2-digit",
              })
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
      } else if (trigger_type === "quote_sent") {
        // Fires delay_hours after an invoice was sent and is still unpaid — follow up on unanswered quotes
        const delayHours: number = trigger_config?.delay_hours ?? 24;
        const windowEnd = new Date(now.getTime() - delayHours * 3600 * 1000);
        const windowStart = new Date(windowEnd.getTime() - 15 * 60 * 1000);

        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, customer_mobile, customer_name, invoice_number")
          .eq("client_id", clientId)
          .in("status", ["sent", "overdue"])
          .gte("sent_at", windowStart.toISOString())
          .lte("sent_at", windowEnd.toISOString())
          .not("customer_mobile", "is", null);

        if (!invoices?.length) continue;

        const { data: client } = await supabase
          .from("clients")
          .select("business_name")
          .eq("id", clientId)
          .maybeSingle();

        for (const invoice of invoices) {
          const { data: existing } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("source_id", invoice.id)
            .maybeSingle();

          if (existing) continue;

          const message = interpolate(action_config?.template_body ?? "", {
            name: invoice.customer_name ?? "",
            business: client?.business_name ?? "",
            time: "",
          });

          await sendWhatsAppMessage((invoice as { customer_mobile: string }).customer_mobile, message);

          await supabase.from("automation_logs").insert({
            automation_id: automation.id,
            source_id: invoice.id,
          });

          await supabase
            .from("automations")
            .update({ fire_count: (automation.fire_count as number) + 1, last_fired_at: now.toISOString() })
            .eq("id", automation.id);

          fired++;
        }
      } else if (trigger_type === "payment_due") {
        // Fires when an invoice's due_at falls in the window and it is still unpaid
        const delayHours: number = trigger_config?.delay_hours ?? 0;
        const windowEnd = new Date(now.getTime() - delayHours * 3600 * 1000);
        const windowStart = new Date(windowEnd.getTime() - 15 * 60 * 1000);

        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, customer_mobile, customer_name, invoice_number, total_zar")
          .eq("client_id", clientId)
          .in("status", ["sent", "overdue"])
          .gte("due_at", windowStart.toISOString())
          .lte("due_at", windowEnd.toISOString())
          .not("customer_mobile", "is", null);

        if (!invoices?.length) continue;

        const { data: client } = await supabase
          .from("clients")
          .select("business_name")
          .eq("id", clientId)
          .maybeSingle();

        for (const invoice of invoices) {
          const { data: existing } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("source_id", invoice.id)
            .maybeSingle();

          if (existing) continue;

          const message = interpolate(action_config?.template_body ?? "", {
            name: invoice.customer_name ?? "",
            business: client?.business_name ?? "",
            time: "",
          });

          await sendWhatsAppMessage((invoice as { customer_mobile: string }).customer_mobile, message);

          await supabase.from("automation_logs").insert({
            automation_id: automation.id,
            source_id: invoice.id,
          });

          await supabase
            .from("automations")
            .update({ fire_count: (automation.fire_count as number) + 1, last_fired_at: now.toISOString() })
            .eq("id", automation.id);

          fired++;
        }
      }
    } catch (err) {
      console.error("[automations/run] automation failed", {
        automationId: automation.id,
        clientId: automation.client_id,
        triggerType: automation.trigger_type,
        error: err instanceof Error ? err.message : String(err),
      });
      // Increment error counter on the automation row so owners can see failures in the dashboard.
      await supabase
        .from("automations")
        .update({ error_count: ((automation as { error_count?: number }).error_count ?? 0) + 1 })
        .eq("id", automation.id);
    }
  }

  return NextResponse.json({ fired });
}

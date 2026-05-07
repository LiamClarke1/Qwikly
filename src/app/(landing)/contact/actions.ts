"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  resend,
  FROM,
  setupCallSlotPickerHtml,
  contactFormHostNotificationHtml,
  contactFormVisitorAckHtml,
} from "@/lib/resend";
import { getAvailableSlots } from "@/lib/booking-availability";
import { signBookingToken, signRescheduleToken } from "@/lib/booking-link";

const QWIKLY_OWN_CLIENT_ID = "1";
const SETUP_CALL_SUBJECT = "Book a setup call";
const SLOT_EXPIRY_SECONDS = 48 * 60 * 60;

const schema = z.object({
  name: z.string().min(2, "Name required").max(100),
  email: z.string().email("Valid email required"),
  phone: z.string().max(20).optional(),
  subject: z.string().min(2, "Subject required").max(200),
  message: z.string().min(10, "Message too short").max(3000),
});

export type ContactFormState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  setupCallTriggered?: boolean;
  sentToEmail?: string;
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject"),
    message: formData.get("message"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, phone, subject, message } = parsed.data;

  const db = supabaseAdmin();
  const { error: dbError } = await db
    .from("support_messages")
    .insert({ name, email, phone: phone ?? null, subject, message });

  if (dbError) {
    console.error("support_messages insert error:", dbError);
    return { success: false, error: "Could not save message. Please try emailing us directly." };
  }

  // NOTE: temporarily routing to clarkeagency1@outlook.com directly while we
  // sort out SPF for Resend on qwikly.co.za. Sending hello@ -> hello@ over
  // Resend was getting rejected at the MX (SPF fail + self-domain loop check),
  // so the form silently dropped the first test submission. Visible labels
  // everywhere still show hello@qwikly.co.za. Once SPF includes
  // amazonses.com and qwikly.co.za is verified in Resend, flip back to
  // ["hello@qwikly.co.za"] for brand consistency.
  await resend.emails.send({
    from: "Qwikly Contact <hello@qwikly.co.za>",
    to: ["clarkeagency1@outlook.com"],
    replyTo: email,
    subject: `[Qwikly Contact] ${subject}`,
    html: contactFormHostNotificationHtml({ name, email, phone: phone ?? null, subject, message }),
  });

  // Always send the visitor a branded ack so they know we got it. The slot
  // picker (below) only fires for the "Book a setup call" subject; without
  // this ack, every other subject leaves the visitor with no email at all.
  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `We got your message, ${name.split(" ")[0]}`,
      html: contactFormVisitorAckHtml({ visitorName: name, subject, message }),
    });
  } catch (err) {
    console.error("[contact] visitor ack send failed:", err);
  }

  let setupCallTriggered = false;
  if (subject === SETUP_CALL_SUBJECT) {
    try {
      const avail = await getAvailableSlots(QWIKLY_OWN_CLIENT_ID, { maxSlots: 6, maxPerDay: 2 });
      if (avail.ok && avail.slots.length > 0) {
        const top3 = avail.slots.slice(0, 3);
        const exp = Math.floor(Date.now() / 1000) + SLOT_EXPIRY_SECONDS;
        const slots = top3.map((s) => ({
          token: signBookingToken({
            n: name,
            e: email,
            p: phone ?? "",
            s: s.start,
            d: s.end,
            x: exp,
          }),
          label: s.label,
        }));
        const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://qwikly.co.za").replace(/\/$/, "");
        const firstName = name.split(" ")[0];
        const rescheduleToken = signRescheduleToken({
          n: name,
          e: email,
          p: phone ?? "",
          l: top3.map((s) => s.label),
          x: exp,
        });
        await resend.emails.send({
          from: FROM,
          to: [email],
          subject: "Pick a time for your Qwikly setup call",
          html: setupCallSlotPickerHtml({ visitorName: firstName, slots, baseUrl, rescheduleToken }),
        });
        setupCallTriggered = true;
      } else {
        console.warn("[contact] setup-call slots unavailable:", avail);
      }
    } catch (err) {
      console.error("[contact] setup-call slot email failed:", err);
    }
  }

  return { success: true, setupCallTriggered, sentToEmail: email };
}

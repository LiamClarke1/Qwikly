"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  resend,
  FROM,
  contactFormHostNotificationHtml,
  contactFormVisitorAckHtml,
} from "@/lib/resend";
import { bookMeeting } from "@/lib/booking-create";

const QWIKLY_OWN_CLIENT_ID = process.env.QWIKLY_OWNER_CLIENT_ID ?? "1";
const SETUP_CALL_SUBJECT = "Book a setup call";

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
  bookedLabel?: string;
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

  await resend.emails.send({
    from: "Qwikly Contact <hello@qwikly.co.za>",
    to: ["clarkeagency1@outlook.com"],
    replyTo: email,
    subject: `[Qwikly Contact] ${subject}`,
    html: contactFormHostNotificationHtml({ name, email, phone: phone ?? null, subject, message }),
  });

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

  return { success: true, sentToEmail: email };
}

const setupCallSchema = z.object({
  name: z.string().min(2, "Name required").max(100),
  email: z.string().email("Valid email required"),
  phone: z.string().max(20).optional(),
  slot_start: z.string().datetime({ offset: true }),
  slot_end: z.string().datetime({ offset: true }),
});

export type SetupCallState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  revertToTextarea?: boolean;
  retry?: boolean;
  setupCallTriggered?: boolean;
  sentToEmail?: string;
  bookedLabel?: string;
};

export async function bookSetupCall(
  _prev: SetupCallState,
  formData: FormData
): Promise<SetupCallState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    slot_start: formData.get("slot_start"),
    slot_end: formData.get("slot_end"),
  };

  const parsed = setupCallSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, phone, slot_start, slot_end } = parsed.data;

  const db = supabaseAdmin();
  const { error: dbError } = await db.from("support_messages").insert({
    name,
    email,
    phone: phone ?? null,
    subject: SETUP_CALL_SUBJECT,
    message: `Slot booked via /contact picker: ${slot_start} → ${slot_end}`,
  });
  if (dbError) {
    console.error("[bookSetupCall] support_messages insert error:", dbError);
  }

  const result = await bookMeeting({
    clientId: QWIKLY_OWN_CLIENT_ID,
    visitorName: name,
    visitorEmail: email,
    visitorPhone: phone ?? null,
    start: slot_start,
    end: slot_end,
    notes: "Booked via /contact setup-call picker.",
    conversationId: null,
  });

  if (!result.ok) {
    if (result.reason === "slot_taken") {
      return {
        success: false,
        error: "That slot was just taken — pick another time.",
        retry: true,
      };
    }
    if (result.reason === "calendar_not_connected" || result.reason === "calendar_disconnected") {
      return {
        success: false,
        error: "Live calendar is offline right now — drop us a note instead.",
        revertToTextarea: true,
      };
    }
    return {
      success: false,
      error: "Couldn't lock that in. Try another time, or send a note instead.",
    };
  }

  return {
    success: true,
    setupCallTriggered: true,
    sentToEmail: email,
    bookedLabel: result.label,
  };
}

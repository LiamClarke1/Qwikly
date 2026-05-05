"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend } from "@/lib/resend";

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

  function esc(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

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
    html: `
      <p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;${phone ? ` | ${esc(phone)}` : ""}</p>
      <p><strong>Subject:</strong> ${esc(subject)}</p>
      <hr />
      <p style="white-space:pre-wrap">${esc(message)}</p>
    `,
  });

  return { success: true };
}

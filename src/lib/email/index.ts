import { Resend } from "resend";

export const FROM = process.env.RESEND_FROM ?? "Qwikly <onboarding@resend.dev>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export async function sendEmail(
  opts: SendEmailOptions
): Promise<{ id?: string; error?: string }> {
  const client = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await client.emails.send({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    ...(opts.tags ? { tags: opts.tags } : {}),
  });

  if (error) return { error: error.message };
  return { id: data?.id };
}

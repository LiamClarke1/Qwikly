import twilio from "twilio";

const getClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const FROM = process.env.TWILIO_WHATSAPP_NUMBER ?? "whatsapp:+14155238886";

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const phone = to.startsWith("whatsapp:") ? to : `whatsapp:${to.startsWith("+") ? to : `+${to.replace(/\D/g, "")}`}`;
  await getClient().messages.create({ from: FROM, to: phone, body });
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

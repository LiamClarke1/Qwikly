import twilio from "twilio";
import { fmt, fmtDate } from "@/lib/money";
import { signInvoicePayToken } from "@/lib/invoiceLinks";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

export interface SendInvoiceWhatsAppInput {
  toPhone: string;
  invoiceId: string;
  clientName: string;
  invoiceNumber: string;
  amountZAR: number;
  dueDate: string | Date;
  pdfUrl: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function normalisePhone(raw: string): string {
  if (raw.startsWith("whatsapp:")) return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return `whatsapp:${trimmed}`;
  return `whatsapp:+${trimmed.replace(/\D/g, "")}`;
}

function buildBody(d: SendInvoiceWhatsAppInput, payUrl: string): string {
  return [
    `Hi ${d.clientName}, your invoice *${d.invoiceNumber}* from Qwikly is ready.`,
    "",
    `Amount due *${fmt(d.amountZAR)}*, due ${fmtDate(d.dueDate)}.`,
    "",
    `View invoice: ${d.pdfUrl}`,
    "",
    `Already paid? Mark as paid here: ${payUrl}`,
    "",
    "Reply HELP if you have any questions.",
  ].join("\n");
}

export async function sendInvoiceWhatsApp(input: SendInvoiceWhatsAppInput): Promise<SendResult> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return { ok: false, error: "Twilio credentials not configured" };
  }
  if (!input.toPhone) {
    return { ok: false, error: "Missing recipient phone" };
  }

  const from = process.env.TWILIO_WHATSAPP_NUMBER ?? "whatsapp:+14155238886";
  const payUrl = `${BASE_URL}/pay/${signInvoicePayToken(input.invoiceId)}`;

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({
      from,
      to: normalisePhone(input.toPhone),
      body: buildBody(input, payUrl),
    });
    return { ok: true, id: msg.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

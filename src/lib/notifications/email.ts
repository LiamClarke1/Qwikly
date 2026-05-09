import { resend, FROM } from "@/lib/resend";
import { fmt, fmtDate } from "@/lib/money";
import { signInvoicePayToken } from "@/lib/invoiceLinks";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

export interface SendInvoiceEmailInput {
  to: string;
  invoiceId: string;
  clientName: string;
  invoiceNumber: string;
  amountZAR: number;
  dueDate: string | Date;
  pdfUrl: string;
  plainTextSummary?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function buildHtml(d: SendInvoiceEmailInput, payUrl: string): string {
  const accent = "#E85A2C";
  const due = fmtDate(d.dueDate);
  const amount = fmt(d.amountZAR);
  const summary = d.plainTextSummary
    ? `<p style="margin:0 0 20px;font-size:13px;color:#9CA3AF;line-height:1.6;">${escapeHtml(d.plainTextSummary)}</p>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:28px;">
          <span style="font-size:20px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">
            Qwikly<span style="color:${accent};">.</span>
          </span>
        </td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">Invoice ${escapeHtml(d.invoiceNumber)}</p>
          <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">Hi ${escapeHtml(d.clientName)}, your invoice is ready.</h1>
          <p style="margin:0 0 20px;font-size:13px;color:#9CA3AF;line-height:1.6;">Amount due <strong style="color:#F4F4F5;">${amount}</strong>, due ${due}.</p>
          ${summary}
          <table cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr><td>
              <a href="${d.pdfUrl}" style="display:inline-block;background:${accent};color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
                View invoice
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 12px;font-size:13px;color:#9CA3AF;line-height:1.6;">Already settled? Click below to let us know and we'll confirm.</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td>
              <a href="${payUrl}" style="display:inline-block;background:transparent;color:#F4F4F5;font-size:14px;font-weight:600;padding:11px 26px;border-radius:10px;text-decoration:none;border:1px solid rgba(255,255,255,0.18);">
                I've paid
              </a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#6B7280;line-height:1.6;">If you have any questions, simply reply to this email.</p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Sent by <a href="https://qwikly.co.za" style="color:${accent};text-decoration:none;">Qwikly</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPlainText(d: SendInvoiceEmailInput, payUrl: string): string {
  const due = fmtDate(d.dueDate);
  const amount = fmt(d.amountZAR);
  const summary = d.plainTextSummary ? `\n\n${d.plainTextSummary}` : "";
  return `Hi ${d.clientName},\n\nYour invoice ${d.invoiceNumber} is ready. Amount due ${amount}, due ${due}.${summary}\n\nView invoice: ${d.pdfUrl}\n\nAlready paid? Mark this invoice as paid: ${payUrl}\n\nIf you have any questions, reply to this email.\n\nQwikly`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  if (!input.to) {
    return { ok: false, error: "Missing recipient email" };
  }

  const subject = `Invoice ${input.invoiceNumber} from Qwikly, ${fmt(input.amountZAR)}`;

  const payUrl = `${BASE_URL}/pay/${signInvoicePayToken(input.invoiceId)}`;

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: [input.to],
      subject,
      html: buildHtml(input, payUrl),
      text: buildPlainText(input, payUrl),
    });
    if (res.error) {
      return { ok: false, error: String(res.error.message ?? res.error) };
    }
    return { ok: true, id: res.data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

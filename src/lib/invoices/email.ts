import { fmt, fmtDate } from "@/lib/money";

interface InvoiceEmailData {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  totalZar: number;
  dueAt: string;
  publicUrl: string;
  lineItems: Array<{ description: string; quantity: number; unit_price_zar: number; line_total_zar: number }>;
  subtotalZar: number;
  vatZar: number;
  paymentTerms?: string | null;
  logoUrl?: string | null;
  accentColor?: string;
  footerText?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBranch?: string | null;
}

function base(accent: string, content: string) {
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
        ${content}
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Powered by <a href="https://qwikly.co.za" style="color:${accent};text-decoration:none;">Qwikly</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function invoiceIssuedHtml(d: InvoiceEmailData): string {
  const accent = d.accentColor ?? "#E85A2C";
  const rows = d.lineItems.map(li =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#F4F4F5;font-size:13px;">${li.description}${li.quantity !== 1 ? ` × ${li.quantity}` : ""}</td>
      <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#F4F4F5;font-size:13px;text-align:right;white-space:nowrap;">${fmt(li.line_total_zar)}</td>
    </tr>`
  ).join("");

  const totals = [
    `<tr><td style="padding:4px 0;color:#9CA3AF;font-size:12px;">Subtotal</td><td style="padding:4px 0;color:#F4F4F5;font-size:12px;text-align:right;">${fmt(d.subtotalZar)}</td></tr>`,
    d.vatZar > 0 ? `<tr><td style="padding:4px 0;color:#9CA3AF;font-size:12px;">VAT (15%)</td><td style="padding:4px 0;color:#F4F4F5;font-size:12px;text-align:right;">${fmt(d.vatZar)}</td></tr>` : "",
    `<tr><td style="padding:8px 0 0;color:#F4F4F5;font-size:15px;font-weight:700;border-top:1px solid rgba(255,255,255,0.08);">Total due</td><td style="padding:8px 0 0;color:${accent};font-size:15px;font-weight:700;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${fmt(d.totalZar)}</td></tr>`,
  ].join("");

  const bankSection = d.bankName && d.bankAccount ? `
    <tr><td colspan="2" style="padding-top:20px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;">EFT payment details</p>
      <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.8;">
        Bank: <span style="color:#F4F4F5;">${d.bankName}</span><br>
        Account: <span style="color:#F4F4F5;">${d.bankAccount}</span><br>
        ${d.bankBranch ? `Branch code: <span style="color:#F4F4F5;">${d.bankBranch}</span><br>` : ""}
        Reference: <span style="color:#F4F4F5;">${d.invoiceNumber}</span>
      </p>
    </td></tr>` : "";

  const content = `
    <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">Invoice ${d.invoiceNumber}</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You have an invoice from ${d.businessName}</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;line-height:1.6;">Due ${fmtDate(d.dueAt)}${d.paymentTerms ? ` · ${d.paymentTerms}` : ""}</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${rows}</table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${totals}</table>
      ${bankSection}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr><td>
          <a href="${d.publicUrl}" style="display:inline-block;background:${accent};color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
            View &amp; Pay Invoice
          </a>
        </td></tr>
      </table>
      ${d.footerText ? `<p style="margin:20px 0 0;font-size:11px;color:#6B7280;line-height:1.6;">${d.footerText}</p>` : ""}
    </td></tr>`;

  return base(accent, content);
}

export function invoiceReminderHtml(d: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  totalZar: number;
  dueAt: string;
  publicUrl: string;
  daysOverdue?: number;
  accentColor?: string;
}): string {
  const accent = d.accentColor ?? "#E85A2C";
  const isOverdue = (d.daysOverdue ?? 0) > 0;
  const subject = isOverdue
    ? `Your invoice ${d.invoiceNumber} is ${d.daysOverdue} day${d.daysOverdue === 1 ? "" : "s"} overdue`
    : `Reminder: Invoice ${d.invoiceNumber} is due ${fmtDate(d.dueAt)}`;

  const content = `
    <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${isOverdue ? "#C3431C" : accent};">${isOverdue ? "Overdue" : "Payment reminder"}</p>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">${subject}</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;line-height:1.6;">
        Hi ${d.customerName}, ${isOverdue
          ? `your invoice of <strong style="color:#F4F4F5;">${fmt(d.totalZar)}</strong> from ${d.businessName} was due on ${fmtDate(d.dueAt)}. Please settle this as soon as possible.`
          : `your invoice of <strong style="color:#F4F4F5;">${fmt(d.totalZar)}</strong> from ${d.businessName} is due on <strong style="color:#F4F4F5;">${fmtDate(d.dueAt)}</strong>.`
        }
      </p>
      <a href="${d.publicUrl}" style="display:inline-block;background:${accent};color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
        Pay Now · ${fmt(d.totalZar)}
      </a>
    </td></tr>`;

  return base(accent, content);
}

export function invoiceReceiptHtml(d: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  amountPaidZar: number;
  paidAt: string;
  receiptNumber: string;
  publicUrl: string;
  accentColor?: string;
}): string {
  const accent = d.accentColor ?? "#E85A2C";
  const content = `
    <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#3C5A3D;">Payment received</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;">Receipt ${d.receiptNumber}</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;line-height:1.6;">
        Hi ${d.customerName}, ${d.businessName} has received your payment of <strong style="color:#F4F4F5;">${fmt(d.amountPaidZar)}</strong> on ${fmtDate(d.paidAt)}.
      </p>
      <a href="${d.publicUrl}" style="display:inline-block;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#F4F4F5;font-size:13px;font-weight:500;padding:10px 24px;border-radius:10px;text-decoration:none;">
        View receipt
      </a>
    </td></tr>`;
  return base(accent, content);
}

export function qwiklyBillingInvoiceHtml(d: {
  businessName: string;
  billingEmail: string;
  periodStart: string;
  periodEnd: string;
  invoiceNumber: string;
  plan: string;
  subscriptionZar: number;
  dueAt: string;
  billingUrl: string;
}): string {
  const accent = "#E85A2C";
  const planLabel = d.plan.charAt(0).toUpperCase() + d.plan.slice(1);
  const content = `
    <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">Qwikly subscription invoice</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;">${d.invoiceNumber}</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;line-height:1.6;">
        Hi ${d.businessName}, here is your Qwikly ${planLabel} plan subscription for ${fmtDate(d.periodStart)} – ${fmtDate(d.periodEnd)}.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#9CA3AF;font-size:13px;">Qwikly ${planLabel} plan — monthly subscription</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#F4F4F5;font-size:13px;text-align:right;">${fmt(d.subscriptionZar)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0 0;color:#F4F4F5;font-size:15px;font-weight:700;">Total due</td>
          <td style="padding:8px 0 0;color:${accent};font-size:15px;font-weight:700;text-align:right;">${fmt(d.subscriptionZar)}</td>
        </tr>
      </table>
      <p style="margin:0 0 20px;font-size:12px;color:#6B7280;">Due by ${fmtDate(d.dueAt)}. Late payment results in account restrictions.</p>
      <a href="${d.billingUrl}" style="display:inline-block;background:${accent};color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
        View billing details &amp; pay
      </a>
    </td></tr>`;
  return base(accent, content);
}

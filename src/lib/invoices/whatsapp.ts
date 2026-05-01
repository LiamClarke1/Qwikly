import { fmt, fmtDate } from "@/lib/money";

/**
 * WhatsApp message builders.
 *
 * These send as free-form messages via Twilio Sandbox during development.
 * Before going live on a production WABA you must get the following templates
 * pre-approved in Meta Business Manager (apply under Business > WhatsApp > Message Templates):
 *
 *  invoice_issued             — customer receives invoice link
 *  invoice_qwikly_ping        — Qwikly's fraud-prevention ping to customer
 *  invoice_reminder_pre_due   — 3 days before due
 *  invoice_due_today          — due today
 *  invoice_overdue_3          — 3 days overdue
 *  invoice_overdue_7          — 7 days overdue
 *  invoice_overdue_14         — 14 days overdue
 *  invoice_paid_receipt       — payment receipt to customer
 *  client_payment_received    — notify client when customer pays
 *  client_eft_pending         — client must confirm EFT
 *  client_billing_ready       — monthly Qwikly subscription invoice
 *  client_billing_overdue     — Qwikly subscription invoice overdue
 *  customer_audit_ping        — sample audit ping for cash/manual payments
 */

export function invoiceIssuedWa(d: {
  customerName: string;
  businessName: string;
  totalZar: number;
  dueAt: string;
  publicUrl: string;
}): string {
  return `Hi ${d.customerName}, ${d.businessName} has sent you an invoice for *${fmt(d.totalZar)}*, due ${fmtDate(d.dueAt)}.\n\nTap to view and pay:\n${d.publicUrl}\n\nReply HELP if you have questions.`;
}

export function invoiceQwiklyPingWa(d: {
  customerName: string;
  businessName: string;
  totalZar: number;
  publicUrl: string;
}): string {
  return `Hi ${d.customerName}, this is Qwikly — the platform ${d.businessName} uses to send invoices. You should have received an invoice for *${fmt(d.totalZar)}*.\n\nTap to view: ${d.publicUrl}\n\nReply HELP if you didn't expect this invoice.`;
}

export function invoiceReminderWa(d: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  totalZar: number;
  dueAt: string;
  publicUrl: string;
  daysOverdue?: number;
}): string {
  const isOverdue = (d.daysOverdue ?? 0) > 0;
  if (isOverdue) {
    return `Hi ${d.customerName}, your invoice *${d.invoiceNumber}* from ${d.businessName} for *${fmt(d.totalZar)}* is now ${d.daysOverdue} day${d.daysOverdue === 1 ? "" : "s"} overdue.\n\nPlease settle as soon as possible:\n${d.publicUrl}`;
  }
  return `Hi ${d.customerName}, just a reminder that your invoice *${d.invoiceNumber}* from ${d.businessName} for *${fmt(d.totalZar)}* is due ${fmtDate(d.dueAt)}.\n\nPay now: ${d.publicUrl}`;
}

export function invoiceReceiptWa(d: {
  customerName: string;
  businessName: string;
  amountPaidZar: number;
  receiptNumber: string;
  publicUrl: string;
}): string {
  return `Hi ${d.customerName}, we've confirmed receipt of *${fmt(d.amountPaidZar)}* to ${d.businessName}. Your receipt is ${d.receiptNumber}.\n\nDownload: ${d.publicUrl}`;
}

export function clientPaymentReceivedWa(d: {
  businessName: string;
  customerName: string;
  amountPaidZar: number;
  invoiceNumber: string;
  method: string;
  invoiceUrl: string;
}): string {
  return `Payment received! *${fmt(d.amountPaidZar)}* from ${d.customerName} for invoice ${d.invoiceNumber} via ${d.method}.\n\nView: ${d.invoiceUrl}`;
}

export function clientEftPendingWa(d: {
  businessName: string;
  customerName: string;
  amountZar: number;
  invoiceNumber: string;
  proofUrl: string | null;
  confirmUrl: string;
}): string {
  return `${d.customerName} says they paid *${fmt(d.amountZar)}* by EFT for invoice ${d.invoiceNumber}.${d.proofUrl ? `\n\nProof: ${d.proofUrl}` : ""}\n\nOnce the money lands, tap to confirm:\n${d.confirmUrl}`;
}

export function clientBillingReadyWa(d: {
  businessName: string;
  subscriptionZar: number;
  plan: string;
  periodLabel: string;
  dueAt: string;
  billingUrl: string;
}): string {
  const planLabel = d.plan.charAt(0).toUpperCase() + d.plan.slice(1);
  return `Hi ${d.businessName}, your Qwikly ${planLabel} plan subscription for ${d.periodLabel} is *${fmt(d.subscriptionZar)}*, due by ${fmtDate(d.dueAt)}.\n\nView and pay: ${d.billingUrl}`;
}

export function clientBillingOverdueWa(d: {
  businessName: string;
  subscriptionZar: number;
  daysOverdue: number;
  billingUrl: string;
}): string {
  return `URGENT — ${d.businessName}, your Qwikly subscription of *${fmt(d.subscriptionZar)}* is ${d.daysOverdue} day${d.daysOverdue === 1 ? "" : "s"} overdue. Unpaid invoices may restrict your account.\n\nPay now: ${d.billingUrl}`;
}

export function customerAuditPingWa(d: {
  customerName: string;
  businessName: string;
  amountZar: number;
  paidAt: string;
  serviceDescription?: string;
}): string {
  return `Hi ${d.customerName}, just confirming you paid *${d.businessName}* ${fmt(d.amountZar)} on ${fmtDate(d.paidAt)}${d.serviceDescription ? ` for ${d.serviceDescription}` : ""}.\n\nAll good? Reply *Y* to confirm or *N* if there's an issue.`;
}

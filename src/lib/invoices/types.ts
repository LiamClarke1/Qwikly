export type InvoiceStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "viewed"
  | "partial_paid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "disputed"
  | "written_off"
  | "refunded";

export interface LineItem {
  id?: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit_price_zar: number;
  line_total_zar: number;
  tax_rate: number;
  discount_amount_zar: number;
  discount_pct: number;
  booking_id?: number | null;
}

export interface Customer {
  id: string;
  client_id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  vat_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string | null;
  version: number;
  status: InvoiceStatus;
  customer_id: string | null;
  customer_name: string;
  customer_mobile: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_vat_number: string | null;
  issued_at: string | null;
  due_at: string | null;
  scheduled_send_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  subtotal_zar: number;
  discount_total_zar: number;
  vat_zar: number;
  total_zar: number;
  amount_paid_zar: number;
  currency: string;
  notes: string | null;
  internal_notes: string | null;
  payment_terms: string | null;
  bank_details_snapshot: Record<string, string> | null;
  delivery_channels: string[];
  delivery_scheduled: boolean;
  delivery_sent_log: Array<{ channel: string; ts: string; status: string }>;
  branding_snapshot: { logo_url?: string; accent_color?: string; footer_text?: string } | null;
  recurring_template_id: string | null;
  parent_invoice_id: string | null;
  qwikly_commission_zar: number | null;
  qwikly_commission_locked: boolean;
  qwikly_billing_invoice_id: string | null;
  customer_view_token: string;
  customer_viewed_count: number;
  customer_view_log: Array<{ ts: string; ip?: string; ua?: string }>;
  qwikly_ping_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  invoice_line_items?: LineItem[];
}

export interface Payment {
  id: string;
  invoice_id: string;
  client_id: string;
  amount_zar: number;
  paid_at: string;
  method: string;
  external_ref: string | null;
  payer_name: string | null;
  proof_url: string | null;
  source: string;
  verified: boolean;
  verified_at: string | null;
  qwikly_commission_zar: number | null;
  notes: string | null;
  created_at: string;
}

export interface BillingPeriod {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  total_invoiced_zar: number;
  total_paid_zar: number;
  total_paid_ex_vat_zar: number;
  commission_rate: number;
  commission_zar: number;
  vat_zar: number;
  status: "open" | "locked" | "invoiced" | "paid" | "overdue" | "suspended";
  locked_at: string | null;
  qwikly_billing_invoice_id: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  qwikly_billing_invoices?: QwiklyBillingInvoice;
}

export interface QwiklyBillingInvoice {
  id: string;
  client_id: string;
  period_id: string;
  invoice_number: string | null;
  total_zar: number;
  vat_zar: number;
  status: string;
  due_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  line_items_jsonb: unknown[];
  disputed_amount: number;
  created_at: string;
}

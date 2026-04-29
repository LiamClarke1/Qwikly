"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Trash2, Search, User, X,
  Send, Save, Clock, Loader2, AlertCircle, CheckCircle, Copy
} from "lucide-react";
import { useClient } from "@/lib/use-client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { fmt, add, multiply, toZar } from "@/lib/money";
import type { Customer } from "@/lib/invoices/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

function toLocalDT(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface LineItemForm {
  id: string;
  description: string;
  quantity: string;
  unit_price_zar: string;
  tax_rate: number;
  discount_pct: string;
  booking_id: string | null;
}

function newLineItem(): LineItemForm {
  return { id: crypto.randomUUID(), description: "", quantity: "1", unit_price_zar: "", tax_rate: 0, discount_pct: "0", booking_id: null };
}

function computeLineTotals(li: LineItemForm) {
  const qty = parseFloat(li.quantity) || 0;
  const unit = parseFloat(li.unit_price_zar) || 0;
  const gross = multiply(qty, unit);
  const discAmt = toZar(gross * ((parseFloat(li.discount_pct) || 0) / 100));
  const lineNet = toZar(gross - discAmt);
  const tax = toZar(lineNet * li.tax_rate);
  return { gross, discAmt, lineNet, tax, lineTotal: lineNet };
}

function CustomerSearch({ onSelect, vatEnabled }: { onSelect: (c: Customer | null) => void; vatEnabled: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    }, 250);
  }, [q]);

  function select(c: Customer) {
    setSelected(c);
    setQ(c.name);
    setOpen(false);
    onSelect(c);
  }

  function clear() {
    setSelected(null);
    setQ("");
    onSelect(null);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-faint pointer-events-none" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); if (!e.target.value) clear(); }}
          onFocus={() => setOpen(true)}
          placeholder="Search customers or type a name…"
          className="w-full bg-[#111827] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-body text-fg placeholder:text-fg-faint outline-none focus:border-brand/50"
        />
        {selected && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (q.length >= 2 || results.length > 0) && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#1a1f2e] border border-line rounded-xl shadow-pop overflow-hidden">
          {results.map(c => (
            <button key={c.id} onClick={() => select(c)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] text-left cursor-pointer transition-colors">
              <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-brand" />
              </div>
              <div>
                <p className="text-small font-medium text-fg">{c.name}</p>
                <p className="text-tiny text-fg-muted">{c.mobile ?? c.email ?? "No contact"}</p>
              </div>
            </button>
          ))}
          {q.length >= 2 && (
            <button
              onClick={async () => {
                const res = await fetch("/api/customers", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: q }),
                });
                if (res.ok) { const c = await res.json(); select(c); }
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-small text-brand hover:bg-white/[0.03] cursor-pointer border-t border-line"
            >
              <Plus className="w-3.5 h-3.5" /> Add &ldquo;{q}&rdquo; as new customer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InvoicePreview({ data }: {
  data: {
    businessName: string;
    customerName: string;
    invoiceItems: LineItemForm[];
    subtotal: number;
    vatTotal: number;
    total: number;
    dueAt: string;
    notes: string;
    accent: string;
    bankName: string;
    bankAccount: string;
    vatEnabled: boolean;
  }
}) {
  const { businessName, customerName, invoiceItems, subtotal, vatTotal, total, dueAt, notes, accent, bankName, bankAccount } = data;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-pop text-[#0F172A] min-h-[400px]">
      <div className="px-7 py-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: accent }}>{businessName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Invoice</p>
          </div>
          <div className="text-right">
            {dueAt && <p className="text-xs text-gray-400">Due: {new Date(dueAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</p>}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bill to</p>
          <p className="text-sm font-medium text-gray-800">{customerName || "Customer name"}</p>
        </div>
      </div>

      <div className="px-7 py-5">
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-2 text-xs text-gray-400 font-medium">Item</th>
              <th className="text-right pb-2 text-xs text-gray-400 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.filter(li => li.description || li.unit_price_zar).map((li, i) => {
              const { lineTotal } = computeLineTotals(li);
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 text-xs text-gray-700 pr-3">
                    {li.description || "—"}
                    {parseFloat(li.quantity) !== 1 && parseFloat(li.quantity) > 0 && (
                      <span className="text-gray-400 ml-1">× {li.quantity}</span>
                    )}
                  </td>
                  <td className="py-2 text-xs text-gray-800 text-right font-mono">{fmt(lineTotal)}</td>
                </tr>
              );
            })}
            {invoiceItems.filter(li => li.description || li.unit_price_zar).length === 0 && (
              <tr><td colSpan={2} className="py-4 text-xs text-gray-300 text-center">Add line items</td></tr>
            )}
          </tbody>
        </table>

        <div className="space-y-1 max-w-[160px] ml-auto text-right">
          {data.vatEnabled && vatTotal > 0 && (
            <>
              <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-xs text-gray-500"><span>VAT 15%</span><span>{fmt(vatTotal)}</span></div>
            </>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-100 pt-1.5">
            <span>Total</span>
            <span style={{ color: accent }}>{fmt(total)}</span>
          </div>
        </div>

        {bankName && bankAccount && (
          <div className="mt-5 bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-medium mb-1.5">EFT payment details</p>
            <p className="text-xs text-gray-600">Bank: {bankName}</p>
            <p className="text-xs text-gray-600">Account: {bankAccount}</p>
          </div>
        )}

        {notes && <p className="mt-4 text-xs text-gray-400 leading-relaxed">{notes}</p>}
      </div>

      <div className="px-7 py-3 border-t border-gray-50 text-center">
        <p className="text-xs text-gray-300">Powered by Qwikly</p>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  const { client, loading: clientLoading } = useClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdFromUrl = searchParams.get("booking");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([newLineItem()]);
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 7");
  const [channels, setChannels] = useState<string[]>(["whatsapp", "email"]);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentResult, setSentResult] = useState<{ id: string; url: string; scheduled: boolean; scheduledAt?: string } | null>(null);

  useEffect(() => {
    if (client) {
      setVatEnabled(!!client.vat_number);
    }
  }, [client]);

  // Pre-fill from booking if URL param
  useEffect(() => {
    if (!bookingIdFromUrl || !client) return;
    fetch(`/api/bookings/${bookingIdFromUrl}`)
      .then(r => r.ok ? r.json() : null)
      .then(b => {
        if (!b) return;
        setCustomerName(b.customer_name ?? "");
        setCustomerMobile(b.customer_phone ?? "");
        setLineItems([{
          id: crypto.randomUUID(),
          description: `${b.job_type ?? "Service"} — ${b.area ?? ""}`.trim(),
          quantity: "1",
          unit_price_zar: b.quoted_price_zar ? String(b.quoted_price_zar) : "",
          tax_rate: 0,
          discount_pct: "0",
          booking_id: b.id,
        }]);
      }).catch(() => {});
  }, [bookingIdFromUrl, client]);

  const computedTotals = lineItems.reduce((acc, li) => {
    const { lineTotal, tax } = computeLineTotals(li);
    return {
      subtotal: add(acc.subtotal, lineTotal),
      vatTotal: add(acc.vatTotal, tax),
      total: add(acc.total, lineTotal, tax),
    };
  }, { subtotal: 0, vatTotal: 0, total: 0 });

  function addLineItem() {
    setLineItems(prev => [...prev, { ...newLineItem(), tax_rate: vatEnabled ? 0.15 : 0 }]);
  }

  function removeLineItem(id: string) {
    setLineItems(prev => prev.filter(li => li.id !== id));
  }

  function updateLineItem(id: string, field: keyof LineItemForm, value: string | number | null) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  }

  function toggleChannel(ch: string) {
    if (ch === "link") {
      // "Link only" is exclusive
      setChannels(prev => prev.includes("link") ? [] : ["link"]);
    } else {
      setChannels(prev => {
        const without = prev.filter(c => c !== "link");
        return without.includes(ch) ? without.filter(c => c !== ch) : [...without, ch];
      });
    }
  }

  function buildPayload(draft = false) {
    const name = customer?.name ?? customerName;
    if (!name.trim()) { setError("Customer name is required"); return null; }
    if (lineItems.every(li => !li.description)) { setError("Add at least one line item"); return null; }
    setError("");
    return {
      customer_id: customer?.id ?? null,
      customer_name: name,
      customer_mobile: (customer?.mobile ?? customerMobile) || null,
      customer_email: (customer?.email ?? customerEmail) || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      notes: notes || null,
      internal_notes: internalNotes || null,
      payment_terms: paymentTerms,
      delivery_channels: channels,
      scheduled_send_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      line_items: lineItems
        .filter(li => li.description || li.unit_price_zar)
        .map((li, i) => ({
          sort_order: i,
          description: li.description,
          quantity: parseFloat(li.quantity) || 1,
          unit_price_zar: parseFloat(li.unit_price_zar) || 0,
          tax_rate: vatEnabled ? li.tax_rate : 0,
          discount_amount_zar: 0,
          discount_pct: parseFloat(li.discount_pct) / 100 || 0,
          booking_id: li.booking_id ? parseInt(li.booking_id) : null,
        })),
    };
  }

  async function saveAsDraft() {
    const payload = buildPayload(true);
    if (!payload) return;
    setSaving(true);
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/dashboard/invoices/${id}`);
    } else {
      const { error: e } = await res.json();
      setError(e);
    }
    setSaving(false);
  }

  async function sendNow() {
    const payload = buildPayload();
    if (!payload) return;
    const isScheduled = !!scheduledAt;
    if (!isScheduled) {
      if (!payload.customer_mobile && channels.includes("whatsapp")) {
        setError("WhatsApp selected but no mobile number. Add one or deselect WhatsApp.");
        return;
      }
      if (!payload.customer_email && channels.includes("email")) {
        setError("Email selected but no email address. Add one or deselect Email.");
        return;
      }
    }
    setSending(true);
    const createRes = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!createRes.ok) {
      const { error: e } = await createRes.json().catch(() => ({}));
      setError(e ?? "Failed to create invoice");
      setSending(false);
      return;
    }
    const created = await createRes.json();
    const { id, customer_view_token } = created;
    const url = `${BASE_URL}/i/${customer_view_token}`;
    if (!isScheduled) {
      await fetch(`/api/invoices/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      }).catch(() => {});
    }
    setSending(false);
    setSentResult({ id, url, scheduled: isScheduled, scheduledAt: scheduledAt || undefined });
  }

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  if (sentResult) {
    const sentChannels = channels.filter(c => c !== "link");
    return (
      <div className="animate-fade-in max-w-lg mx-auto mt-8 space-y-5 text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-success" />
        </div>
        <div>
          <h2 className="text-h1 text-fg">{sentResult.scheduled ? "Invoice scheduled!" : "Invoice sent!"}</h2>
          <p className="text-small text-fg-muted mt-1">
            {sentResult.scheduled
              ? `Scheduled for ${new Date(sentResult.scheduledAt!).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}`
              : sentChannels.length > 0
                ? `Delivered via ${sentChannels.join(" & ")}`
                : "Invoice created — share the link below"}
          </p>
        </div>
        <div className="bg-surface-card border border-line rounded-2xl p-5 text-left space-y-3">
          <p className="text-small font-semibold text-fg">Customer link</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={sentResult.url}
              onClick={e => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-[#111827] border border-line rounded-xl px-3 py-2.5 text-small text-fg-muted font-mono truncate outline-none cursor-text"
            />
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(sentResult.url)} icon={<Copy className="w-3.5 h-3.5" />}>
              Copy
            </Button>
          </div>
          <p className="text-tiny text-fg-subtle">Share this with your customer so they can view and pay the invoice.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => {
            setSentResult(null);
            setCustomer(null); setCustomerName(""); setCustomerEmail(""); setCustomerMobile("");
            setLineItems([newLineItem()]); setNotes(""); setScheduledAt(""); setError("");
          }}>
            New invoice
          </Button>
          <Button onClick={() => router.push(`/dashboard/invoices/${sentResult.id}`)}>
            View invoice
          </Button>
        </div>
      </div>
    );
  }

  const previewData = {
    businessName: client?.business_name ?? "Your Business",
    customerName: customer?.name ?? customerName,
    invoiceItems: lineItems,
    subtotal: computedTotals.subtotal,
    vatTotal: computedTotals.vatTotal,
    total: computedTotals.total,
    dueAt,
    notes,
    accent: client?.invoice_accent_color ?? "#E85A2C",
    bankName: client?.bank_name ?? "",
    bankAccount: client?.bank_account_number ?? "",
    vatEnabled,
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-small text-brand font-medium mb-1">Invoicing</p>
          <h1 className="text-h1 text-fg">New invoice</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={saveAsDraft} loading={saving} icon={<Save className="w-3.5 h-3.5" />}>
            Save draft
          </Button>
          <Button size="sm" onClick={sendNow} loading={sending} icon={scheduledAt ? <Clock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}>
            {scheduledAt ? "Schedule" : "Send now"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 mb-5 text-small text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="bg-surface-card border border-line rounded-2xl p-5">
            <p className="text-small font-semibold text-fg mb-4">Customer</p>
            <div className="space-y-3">
              <Field label="Search or create customer">
                <CustomerSearch onSelect={c => {
                  setCustomer(c);
                  if (c) {
                    setCustomerMobile(c.mobile ?? "");
                    setCustomerEmail(c.email ?? "");
                  }
                }} vatEnabled={vatEnabled} />
              </Field>
              {!customer && (
                <>
                  <Field label="Full name">
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. John Smith" />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Mobile">
                      <Input value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} placeholder="+27…" />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="john@…" />
                    </Field>
                  </div>
                </>
              )}
              {customer && (
                <div className="bg-brand/5 border border-brand/15 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium text-fg">{customer.name}</p>
                    <p className="text-tiny text-fg-muted">{customer.mobile ?? customer.email ?? "No contact"}</p>
                  </div>
                  <button onClick={() => setCustomer(null)} className="text-fg-faint hover:text-fg cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="bg-surface-card border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-small font-semibold text-fg">Line items</p>
              {client?.vat_number && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => {
                      setVatEnabled(v => !v);
                      setLineItems(prev => prev.map(li => ({ ...li, tax_rate: !vatEnabled ? 0.15 : 0 })));
                    }}
                    className={cn(
                      "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                      vatEnabled ? "bg-brand" : "bg-white/10"
                    )}
                  >
                    <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform", vatEnabled ? "translate-x-4" : "translate-x-0.5")} />
                  </div>
                  <span className="text-tiny text-fg-muted">VAT (15%)</span>
                </label>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {lineItems.map((li) => {
                const { lineTotal } = computeLineTotals(li);
                return (
                  <div key={li.id} className="grid grid-cols-[1fr_70px_80px_32px] gap-2 items-start">
                    <input
                      value={li.description}
                      onChange={e => updateLineItem(li.id, "description", e.target.value)}
                      placeholder="Description"
                      className="bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/40 w-full"
                    />
                    <input
                      value={li.unit_price_zar}
                      onChange={e => updateLineItem(li.id, "unit_price_zar", e.target.value)}
                      placeholder="Price"
                      type="number"
                      step="1"
                      className="bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/40 w-full"
                    />
                    <div className="flex items-center justify-end pt-2">
                      <span className="text-small text-fg-muted font-display">{fmt(lineTotal)}</span>
                    </div>
                    <button onClick={() => removeLineItem(li.id)} className="w-8 h-8 flex items-center justify-center text-fg-faint hover:text-danger transition-colors cursor-pointer mt-0.5 rounded-lg hover:bg-danger/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button onClick={addLineItem} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/10 text-small text-fg-muted hover:text-fg hover:border-white/20 transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              Add item
            </button>

            {computedTotals.total > 0 && (
              <div className="mt-4 pt-4 border-t border-line space-y-1.5 text-right">
                {vatEnabled && computedTotals.vatTotal > 0 && (
                  <>
                    <div className="flex justify-between text-small text-fg-muted">
                      <span>Subtotal</span>
                      <span>{fmt(computedTotals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-small text-fg-muted">
                      <span>VAT (15%)</span>
                      <span>{fmt(computedTotals.vatTotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-body font-semibold text-fg">
                  <span>Total</span>
                  <span className="font-display text-brand">{fmt(computedTotals.total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Invoice details */}
          <div className="bg-surface-card border border-line rounded-2xl p-5 space-y-4">
            <p className="text-small font-semibold text-fg">Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Due date">
                <Input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
              </Field>
              <Field label="Payment terms">
                <Select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                  <option value="Due on receipt">Due on receipt</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Net 30">Net 30</option>
                  <option value="50% deposit, balance on completion">50% deposit</option>
                </Select>
              </Field>
            </div>
            <Field label="Notes (shown to customer)">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Thank you for your business!" rows={2} />
            </Field>
            <Field label="Internal notes (only you see this)">
              <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Job reference, internal memo…" rows={2} />
            </Field>
          </div>

          {/* Send options */}
          <div className="bg-surface-card border border-line rounded-2xl p-5 space-y-4">
            <p className="text-small font-semibold text-fg">Send via</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { key: "whatsapp", label: "WhatsApp" },
                { key: "email", label: "Email" },
                { key: "link", label: "Link only" },
              ].map(ch => (
                <button
                  key={ch.key}
                  onClick={() => toggleChannel(ch.key)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-small font-medium border transition-all cursor-pointer",
                    channels.includes(ch.key)
                      ? "bg-brand/10 text-brand border-brand/30"
                      : "bg-white/[0.03] text-fg-muted border-line hover:border-white/20"
                  )}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            <div>
              <p className="text-small font-medium text-fg mb-2">
                Schedule send <span className="font-normal text-fg-faint">· leave blank to send now</span>
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: "Send now", fn: () => "" },
                  { label: "In 1 hour", fn: () => toLocalDT(new Date(Date.now() + 60 * 60 * 1000)) },
                  { label: "Tonight 6pm", fn: () => { const d = new Date(); d.setHours(18, 0, 0, 0); if (+d <= Date.now()) d.setDate(d.getDate() + 1); return toLocalDT(d); } },
                  { label: "Tomorrow 9am", fn: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return toLocalDT(d); } },
                ].map(({ label, fn }) => (
                  <button key={label} type="button"
                    onClick={() => setScheduledAt(fn())}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-small font-medium border transition-all cursor-pointer",
                      (label === "Send now" ? !scheduledAt : false)
                        ? "bg-brand/10 text-brand border-brand/30"
                        : "bg-white/[0.03] text-fg-muted border-line hover:border-white/20"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {scheduledAt && (
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              )}
              {!scheduledAt && (
                <p className="text-tiny text-fg-muted">Invoice will be sent immediately.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="hidden xl:block">
          <div className="sticky top-6">
            <p className="text-small text-fg-muted mb-3">Customer preview</p>
            <InvoicePreview data={previewData} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-line">
        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <div className="ml-auto flex gap-3">
          <Button variant="secondary" onClick={saveAsDraft} loading={saving} icon={<Save className="w-4 h-4" />}>
            Save as draft
          </Button>
          <Button onClick={sendNow} loading={sending} icon={scheduledAt ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}>
            {scheduledAt ? "Schedule invoice" : "Send invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}

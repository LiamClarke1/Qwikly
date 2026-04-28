"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Plus, Trash2, Search, User, X,
  Send, Save, Loader2, AlertCircle, ArrowLeft
} from "lucide-react";
import { useClient } from "@/lib/use-client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, add, multiply, toZar } from "@/lib/money";
import { isEditable } from "@/lib/invoices/stateMachine";
import type { Customer, Invoice, InvoiceStatus } from "@/lib/invoices/types";

interface LineItemForm {
  id: string;
  description: string;
  quantity: string;
  unit_price_zar: string;
  tax_rate: number;
  discount_pct: string;
  booking_id: string | null;
}

function newLineItem(vatEnabled = false): LineItemForm {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unit_price_zar: "",
    tax_rate: vatEnabled ? 0.15 : 0,
    discount_pct: "0",
    booking_id: null,
  };
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

function CustomerSearch({ onSelect, initial }: { onSelect: (c: Customer | null) => void; initial?: string }) {
  const [q, setQ] = useState(initial ?? "");
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
          placeholder="Search customers…"
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
        </div>
      )}
    </div>
  );
}

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const { client, loading: clientLoading } = useClient();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([]);
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 7");
  const [channels, setChannels] = useState<string[]>(["whatsapp", "email"]);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/invoices/${params.id}`);
    if (!res.ok) { setLoading(false); return; }
    const data: Invoice = await res.json();
    if (!isEditable(data.status as InvoiceStatus)) {
      setNotAllowed(true);
      setLoading(false);
      return;
    }
    setInvoice(data);
    setCustomerName(data.customer_name);
    setCustomerMobile(data.customer_mobile ?? "");
    setCustomerEmail(data.customer_email ?? "");
    setNotes(data.notes ?? "");
    setInternalNotes(data.internal_notes ?? "");
    setPaymentTerms(data.payment_terms ?? "Net 7");
    setChannels(data.delivery_channels ?? ["whatsapp", "email"]);
    setDueAt(data.due_at ? data.due_at.slice(0, 10) : "");
    setScheduledAt(data.scheduled_send_at ? data.scheduled_send_at.slice(0, 16) : "");
    const hasVat = (data.invoice_line_items ?? []).some(li => li.tax_rate > 0);
    setVatEnabled(hasVat);
    setLineItems(
      (data.invoice_line_items ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(li => ({
          id: crypto.randomUUID(),
          description: li.description,
          quantity: String(li.quantity),
          unit_price_zar: String(li.unit_price_zar),
          tax_rate: li.tax_rate,
          discount_pct: String((li.discount_pct ?? 0) * 100),
          booking_id: li.booking_id ? String(li.booking_id) : null,
        }))
    );
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const computedTotals = lineItems.reduce((acc, li) => {
    const { lineTotal, tax } = computeLineTotals(li);
    return {
      subtotal: add(acc.subtotal, lineTotal),
      vatTotal: add(acc.vatTotal, tax),
      total: add(acc.total, lineTotal, tax),
    };
  }, { subtotal: 0, vatTotal: 0, total: 0 });

  function addLineItem() {
    setLineItems(prev => [...prev, newLineItem(vatEnabled)]);
  }

  function removeLineItem(id: string) {
    setLineItems(prev => prev.filter(li => li.id !== id));
  }

  function updateLineItem(id: string, field: keyof LineItemForm, value: string | number | null) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  }

  function toggleChannel(ch: string) {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  }

  function buildPayload() {
    const name = customer?.name ?? customerName;
    if (!name.trim()) { setError("Customer name is required"); return null; }
    if (lineItems.every(li => !li.description)) { setError("Add at least one line item"); return null; }
    setError("");
    return {
      customer_id: customer?.id ?? invoice?.customer_id ?? null,
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

  async function saveChanges(andSend = false) {
    const payload = buildPayload();
    if (!payload) return;
    if (andSend) {
      if (!payload.customer_mobile && channels.includes("whatsapp")) {
        setError("WhatsApp selected but no mobile number.");
        return;
      }
      if (!payload.customer_email && channels.includes("email")) {
        setError("Email selected but no email address.");
        return;
      }
      setSending(true);
    } else {
      setSaving(true);
    }

    const patchRes = await fetch(`/api/invoices/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!patchRes.ok) {
      const { error: e } = await patchRes.json().catch(() => ({ error: "Update failed" }));
      setError(e);
      setSaving(false);
      setSending(false);
      return;
    }

    if (andSend) {
      await fetch(`/api/invoices/${params.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
    }

    setSaving(false);
    setSending(false);
    router.push(`/dashboard/invoices/${params.id}`);
  }

  if (loading || clientLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notAllowed || !invoice) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-small text-fg-muted hover:text-fg mb-6 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-fg-muted">This invoice cannot be edited in its current state.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-small text-fg-muted hover:text-fg mb-2 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <p className="text-small text-brand font-medium mb-1">Invoicing</p>
          <h1 className="text-h1 text-fg">Edit invoice</h1>
          <p className="text-small text-fg-muted mt-0.5">{invoice.invoice_number ?? "Draft"} · {invoice.customer_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => saveChanges(false)} loading={saving} icon={<Save className="w-3.5 h-3.5" />}>
            Save
          </Button>
          <Button size="sm" onClick={() => saveChanges(true)} loading={sending} icon={<Send className="w-3.5 h-3.5" />}>
            Save & send
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 mb-5 text-small text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-5 max-w-2xl">
        {/* Customer */}
        <div className="bg-bg-card border border-line rounded-2xl p-5">
          <p className="text-small font-semibold text-fg mb-4">Customer</p>
          <div className="space-y-3">
            <Field label="Search or change customer">
              <CustomerSearch
                initial={invoice.customer_name}
                onSelect={c => {
                  setCustomer(c);
                  if (c) {
                    setCustomerMobile(c.mobile ?? "");
                    setCustomerEmail(c.email ?? "");
                  }
                }}
              />
            </Field>
            {!customer && (
              <>
                <Field label="Full name">
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mobile">
                    <Input value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} placeholder="+27…" />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
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
        <div className="bg-bg-card border border-line rounded-2xl p-5">
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
                    step="0.01"
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

        {/* Details */}
        <div className="bg-bg-card border border-line rounded-2xl p-5 space-y-4">
          <p className="text-small font-semibold text-fg">Details</p>
          <div className="grid grid-cols-2 gap-4">
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
          <Field label="Internal notes">
            <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Job reference, internal memo…" rows={2} />
          </Field>
        </div>

        {/* Send options */}
        <div className="bg-bg-card border border-line rounded-2xl p-5 space-y-4">
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
          {invoice.status === "draft" && (
            <Field label="Schedule send (optional)">
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            </Field>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2 pb-8">
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <div className="ml-auto flex gap-3">
            <Button variant="secondary" onClick={() => saveChanges(false)} loading={saving} icon={<Save className="w-4 h-4" />}>
              Save changes
            </Button>
            <Button onClick={() => saveChanges(true)} loading={sending} icon={<Send className="w-4 h-4" />}>
              Save & send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

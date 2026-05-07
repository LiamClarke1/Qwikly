"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, X, Check, MessageSquare, CalendarCheck,
  Users, TrendingUp, UserCheck, Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { formatPhone, timeAgo } from "@/lib/format";
import { useClient } from "@/lib/use-client";
import { cn } from "@/lib/cn";

type Lifecycle = "lead" | "prospect" | "customer" | "champion" | "dormant";

interface Contact {
  id: string;
  client_id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  lifecycle_stage: Lifecycle;
  total_bookings: number;
  last_booking_at: string | null;
  last_contact_at: string | null;
  source: string | null;
}

const LIFECYCLE_TONES: Record<Lifecycle, "neutral" | "brand" | "sky" | "success" | "warning"> = {
  lead:      "sky",
  prospect:  "brand",
  customer:  "success",
  champion:  "brand",
  dormant:   "warning",
};

const LIFECYCLE_OPTIONS: { value: Lifecycle | "all"; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "lead",      label: "Leads" },
  { value: "prospect",  label: "Prospects" },
  { value: "customer",  label: "Customers" },
  { value: "champion",  label: "Champions" },
  { value: "dormant",   label: "Dormant" },
];

export default function ContactsPage() {
  const { client } = useClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Lifecycle | "all">("all");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("client_id", client.id)
        .order("last_contact_at", { ascending: false, nullsFirst: false })
        .limit(500);
      setContacts((data as Contact[]) ?? []);
      setLoading(false);
    })();
  }, [client]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (stageFilter !== "all" && c.lifecycle_stage !== stageFilter) return false;
      if (!q) return true;
      return (
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, query, stageFilter]);

  const stats = useMemo(() => ({
    total:     contacts.length,
    customers: contacts.filter((c) => c.lifecycle_stage === "customer" || c.lifecycle_stage === "champion").length,
    active:    contacts.filter((c) => c.last_contact_at && Date.now() - new Date(c.last_contact_at).getTime() < 30 * 86400_000).length,
    booked:    contacts.filter((c) => (c.total_bookings ?? 0) > 0).length,
  }), [contacts]);

  const updateContact = async (id: string, patch: Partial<Contact>) => {
    await supabase.from("contacts").update(patch).eq("id", id);
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (selected?.id === id) setSelected((s) => s ? { ...s, ...patch } : s);
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Everyone your digital assistant has ever talked to."
        actions={
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            Add contact
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total contacts",   value: stats.total,     icon: Users },
          { label: "Customers",        value: stats.customers, icon: UserCheck },
          { label: "Active (30 days)", value: stats.active,    icon: Clock },
          { label: "With bookings",    value: stats.booked,    icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="!p-5">
            <div className="w-9 h-9 rounded-xl bg-surface-input border border-[var(--border)] flex items-center justify-center text-fg-muted mb-3">
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-fg tabular-nums leading-none">{value}</p>
            <p className="text-small text-fg-muted mt-1.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
          <Input
            placeholder="Search name, phone, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {LIFECYCLE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStageFilter(value)}
              className={cn(
                "px-3 h-8 rounded-lg text-[12px] font-semibold border transition-colors cursor-pointer",
                stageFilter === value
                  ? "bg-ember text-paper border-ember"
                  : "bg-surface-input text-fg-muted border-[var(--border)] hover:border-[var(--border-strong)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={contacts.length === 0 ? "No contacts yet" : "No matches"}
            description={
              contacts.length === 0
                ? "Contacts are created automatically when customers message you. You can also add them manually."
                : "Try clearing the search or changing the stage filter."
            }
            action={contacts.length === 0 && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
                Add your first contact
              </Button>
            )}
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-[var(--border)] text-tiny text-fg-subtle uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Stage</th>
                  <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">Phone</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Bookings</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Last contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="hover:bg-surface-hover transition-colors duration-100 cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name ?? c.phone} size={32} />
                        <div className="min-w-0">
                          <p className="text-fg font-medium truncate">{c.name ?? "Unnamed"}</p>
                          {c.email && <p className="text-tiny text-fg-muted truncate">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={LIFECYCLE_TONES[c.lifecycle_stage]} dot>{c.lifecycle_stage}</Badge>
                    </td>
                    <td className="px-5 py-3 text-fg-muted hidden sm:table-cell">{formatPhone(c.phone)}</td>
                    <td className="px-5 py-3 text-fg tabular-nums hidden md:table-cell">{c.total_bookings}</td>
                    <td className="px-5 py-3 text-fg-muted hidden md:table-cell">
                      {c.last_contact_at ? timeAgo(c.last_contact_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <ContactDrawer
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => updateContact(selected.id, patch)}
        />
      )}

      {creating && client && (
        <CreateContactModal
          clientId={client.id as unknown as number}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setContacts((cs) => [c, ...cs]);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function ContactDrawer({
  contact,
  onClose,
  onUpdate,
}: {
  contact: Contact;
  onClose: () => void;
  onUpdate: (patch: Partial<Contact>) => void;
}) {
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [activity, setActivity] = useState<{ type: string; at: string; title: string; sub?: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [convos, bookings] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, status, updated_at")
          .eq("customer_phone", contact.phone ?? "")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("bookings")
          .select("id, job_type, booking_datetime, status")
          .eq("customer_phone", contact.phone ?? "")
          .order("booking_datetime", { ascending: false })
          .limit(5),
      ]);
      const evts: { type: string; at: string; title: string; sub?: string }[] = [];
      (convos.data ?? []).forEach((c: { updated_at: string; status: string }) =>
        evts.push({ type: "chat", at: c.updated_at, title: "Conversation", sub: c.status })
      );
      (bookings.data ?? []).forEach((b: { booking_datetime?: string | null; job_type?: string | null; status: string }) =>
        evts.push({ type: "booking", at: b.booking_datetime ?? "", title: `Booking — ${b.job_type ?? "service"}`, sub: b.status })
      );
      evts.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setActivity(evts.slice(0, 10));
    })();
  }, [contact.phone]);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm animate-fade-in" />
      <aside className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[440px] bg-white border-l border-[var(--border)] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={contact.name ?? contact.phone} size={42} />
            <div className="min-w-0">
              <p className="text-h2 text-fg truncate">{contact.name ?? "Unnamed"}</p>
              <p className="text-small text-fg-muted">{formatPhone(contact.phone)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-fg-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Booking count */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-input border border-[var(--border)] p-3">
              <p className="text-tiny text-fg-subtle uppercase tracking-wider">Bookings</p>
              <p className="text-2xl font-bold text-fg tabular-nums mt-1">{contact.total_bookings}</p>
            </div>
            <div className="rounded-xl bg-surface-input border border-[var(--border)] p-3">
              <p className="text-tiny text-fg-subtle uppercase tracking-wider">Stage</p>
              <div className="mt-2">
                <Badge tone={LIFECYCLE_TONES[contact.lifecycle_stage]} dot>
                  {contact.lifecycle_stage}
                </Badge>
              </div>
            </div>
          </div>

          <Field label="Lifecycle stage">
            <Select
              defaultValue={contact.lifecycle_stage}
              onChange={(e) => onUpdate({ lifecycle_stage: e.target.value as Lifecycle })}
            >
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
              <option value="champion">Champion</option>
              <option value="dormant">Dormant</option>
            </Select>
          </Field>

          <Field label="Email">
            <Input
              defaultValue={contact.email ?? ""}
              placeholder="customer@example.com"
              onBlur={(e) => onUpdate({ email: e.target.value || null })}
            />
          </Field>

          <Field label="Notes" hint="Only visible to you">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onUpdate({ notes })}
              placeholder="What should you remember about this customer?"
              rows={3}
            />
          </Field>

          {/* Activity */}
          <div>
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold mb-3">Activity</p>
            {activity.length === 0 ? (
              <p className="text-small text-fg-muted">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {activity.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-input border border-[var(--border)]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-card border border-[var(--border)] flex items-center justify-center shrink-0">
                      {e.type === "chat"
                        ? <MessageSquare className="w-4 h-4 text-fg-muted" />
                        : <CalendarCheck className="w-4 h-4 text-fg-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small text-fg font-medium">{e.title}</p>
                      <p className="text-tiny text-fg-muted">
                        {e.sub}{e.sub && e.at && " · "}{e.at && timeAgo(e.at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <Link href={`/dashboard/conversations?phone=${contact.phone}`}>
            <Button
              variant="primary"
              size="md"
              icon={<MessageSquare className="w-4 h-4" />}
              className="w-full"
            >
              Open conversation
            </Button>
          </Link>
        </div>
      </aside>
    </>
  );
}

function CreateContactModal({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: number;
  onClose: () => void;
  onCreated: (c: Contact) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!phone.trim()) return setErr("Phone number is required.");
    setSaving(true);
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        client_id:       clientId,
        name:            name.trim() || null,
        phone:           phone.trim(),
        email:           email.trim() || null,
        source:          "manual",
      })
      .select()
      .single();
    setSaving(false);
    if (error) return setErr(error.message);
    onCreated(data as Contact);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-md pointer-events-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">Add contact</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-fg-muted" />
            </button>
          </div>
          <div className="space-y-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Phone" hint="Include country code — e.g. +27821234567">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27821234567" />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
            </Field>
            {err && <p className="text-small text-danger">{err}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={saving} icon={<Check className="w-4 h-4" />} onClick={submit}>
              Add contact
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, X, Check, MessageSquare, CalendarCheck } from "lucide-react";
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

const LIFECYCLE_TONES: Record<Lifecycle, "neutral" | "brand" | "success" | "warning"> = {
  lead: "neutral",
  prospect: "brand",
  customer: "success",
  champion: "brand",
  dormant: "warning",
};

export default function ContactsPage() {
  const { client } = useClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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
    if (!q) return contacts;
    return contacts.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const updateContact = async (id: string, patch: Partial<Contact>) => {
    await supabase.from("contacts").update(patch).eq("id", id);
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (selected?.id === id) setSelected({ ...selected, ...patch });
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

      <div className="max-w-4xl">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
          <Input placeholder="Search name, phone, email…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="!p-8 text-center">
            <p className="text-body font-semibold text-fg">{contacts.length === 0 ? "No contacts yet" : "No matches"}</p>
            <p className="text-small text-fg-muted mt-1 max-w-sm mx-auto">
              {contacts.length === 0
                ? "Contacts are added automatically when customers message you. You can also add them manually."
                : "Try a different search."}
            </p>
          </Card>
        ) : (
          <div className="divide-y divide-line rounded-2xl border border-white/[0.06] bg-[#0D111A] overflow-hidden">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <Avatar name={c.name ?? c.phone} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-medium text-fg truncate">{c.name ?? "Unnamed"}</p>
                    <Badge tone={LIFECYCLE_TONES[c.lifecycle_stage]}>{c.lifecycle_stage}</Badge>
                  </div>
                  <p className="text-tiny text-fg-muted truncate">{formatPhone(c.phone)}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-small text-fg num">{c.total_bookings} {c.total_bookings === 1 ? "booking" : "bookings"}</p>
                  {c.last_contact_at && <p className="text-tiny text-fg-muted">{timeAgo(c.last_contact_at)}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
  contact, onClose, onUpdate,
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
        supabase.from("conversations").select("id, status, updated_at").eq("customer_phone", contact.phone ?? "").limit(5),
        supabase.from("bookings").select("id, job_type, booking_datetime, status").eq("customer_phone", contact.phone ?? "").limit(5),
      ]);
      const evts: { type: string; at: string; title: string; sub?: string }[] = [];
      (convos.data ?? []).forEach((c) => evts.push({ type: "chat", at: c.updated_at, title: "Conversation", sub: c.status }));
      (bookings.data ?? []).forEach((b) => evts.push({ type: "booking", at: b.booking_datetime ?? "", title: `Booking, ${b.job_type ?? "service"}`, sub: b.status }));
      evts.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setActivity(evts.slice(0, 10));
    })();
  }, [contact.phone]);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <aside className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[440px] bg-[#0D111A] border-l border-white/[0.06] flex flex-col animate-slide-up overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={contact.name ?? contact.phone} size={42} />
            <div className="min-w-0">
              <p className="text-h2 text-fg truncate">{contact.name ?? "Unnamed"}</p>
              <p className="text-small text-fg-muted">{formatPhone(contact.phone)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer">
            <X className="w-4 h-4 text-fg-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Field label="Stage">
            <Select defaultValue={contact.lifecycle_stage} onChange={(e) => onUpdate({ lifecycle_stage: e.target.value as Lifecycle })}>
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

          <Field label="Notes" hint="Only visible to you and your team">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onUpdate({ notes })}
              placeholder="Anything worth remembering about this customer"
              rows={4}
            />
          </Field>

          <div>
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold mb-2">Recent activity</p>
            {activity.length === 0 ? (
              <p className="text-small text-fg-muted">Nothing yet.</p>
            ) : (
              <div className="space-y-2">
                {activity.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 text-fg-muted">
                      {e.type === "chat" ? <MessageSquare className="w-4 h-4" /> : <CalendarCheck className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small text-fg font-medium">{e.title}</p>
                      <p className="text-tiny text-fg-muted">{e.sub ?? ""} {e.at && `• ${timeAgo(e.at)}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <Link href={`/dashboard/conversations?phone=${contact.phone}`}>
            <Button variant="primary" size="md" icon={<MessageSquare className="w-4 h-4" />} className="w-full">
              Open conversation
            </Button>
          </Link>
        </div>
      </aside>
    </>
  );
}

function CreateContactModal({
  clientId, onClose, onCreated,
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
    if (!phone.trim()) return setErr("Phone is required.");
    setSaving(true);
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        client_id: clientId,
        name: name.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        source: "manual",
      })
      .select()
      .single();
    setSaving(false);
    if (error) return setErr(error.message);
    onCreated(data as Contact);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-md pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">Add contact</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"><X className="w-4 h-4 text-fg-muted" /></button>
          </div>
          <div className="space-y-4">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></Field>
            <Field label="Phone" hint="With country code, e.g. +27821234567"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27821234567" /></Field>
            <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" /></Field>
            {err && <p className="text-small text-danger">{err}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={saving} icon={<Check className="w-4 h-4" />} onClick={submit}>Add contact</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

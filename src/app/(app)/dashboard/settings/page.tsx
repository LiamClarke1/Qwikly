"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2, Bot, Clock, Plug, Bell,
  Save, Check, AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "profile", label: "Business", icon: Building2 },
  { id: "ai", label: "AI knowledge", icon: Bot },
  { id: "hours", label: "Hours", icon: Clock },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TRADES = [
  "electrician", "plumber", "roofer", "solar installer", "pest control",
  "aircon installer", "pool cleaning", "landscaper", "garage door installer", "security company",
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

interface Hours { [day: string]: [string, string] | null }
interface Client {
  id: string;
  business_name: string | null;
  trade: string | null;
  owner_name: string | null;
  whatsapp_number: string | null;
  google_calendar_id: string | null;
  system_prompt: string | null;
  hours: Hours | null;
  service_areas: string[] | null;
  faq: { q: string; a: string }[] | null;
  tone: string | null;
  notification_email: string | null;
  notification_phone: string | null;
  meta_business_id: string | null;
  meta_phone_number_id: string | null;
}

export default function SettingsPage() {
  const sp = useSearchParams();
  const initial = (sp.get("tab") as TabId) || "profile";
  const [tab, setTab] = useState<TabId>(initial);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "danger" } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients").select("*").limit(1).maybeSingle();
      setClient(data as Client);
      setLoading(false);
    })();
  }, []);

  const showToast = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  const save = async (patch: Partial<Client>) => {
    if (!client) return;
    setSaving(true);
    const { error } = await supabase.from("clients").update(patch).eq("id", client.id);
    setSaving(false);
    if (error) {
      showToast(error.message, "danger");
    } else {
      setClient({ ...client, ...patch });
      showToast("Saved");
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Tweak how Qwikly represents your business and notifies you."
      />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success" ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <AlertCircle className="w-4 h-4 text-danger" />
          )}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1 lg:sticky lg:top-20 self-start">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-small font-medium cursor-pointer transition-colors duration-150",
                  tab === t.id
                    ? "bg-white/[0.06] text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                    : "text-fg-muted hover:text-fg hover:bg-white/[0.03]"
                )}
              >
                <Icon className={cn("w-4 h-4", tab === t.id ? "text-brand" : "text-fg-subtle")} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {loading ? (
            <Card><p className="text-fg-muted text-small">Loading workspace…</p></Card>
          ) : !client ? (
            <Card><p className="text-fg-muted text-small">No client found for your account.</p></Card>
          ) : (
            <>
              {tab === "profile" && <ProfileTab client={client} save={save} saving={saving} />}
              {tab === "ai" && <AITab client={client} save={save} saving={saving} />}
              {tab === "hours" && <HoursTab client={client} save={save} saving={saving} />}
              {tab === "integrations" && <IntegrationsTab client={client} save={save} saving={saving} />}
              {tab === "notifications" && <NotificationsTab client={client} save={save} saving={saving} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ProfileTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    business_name: client.business_name ?? "",
    trade: client.trade ?? "",
    owner_name: client.owner_name ?? "",
    whatsapp_number: client.whatsapp_number ?? "",
    google_calendar_id: client.google_calendar_id ?? "",
  });
  return (
    <Card>
      <CardHeader title="Business profile" description="Basic info your AI uses when chatting with customers." />
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); save(form); }}>
        <Field label="Business name"><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></Field>
        <Field label="Trade">
          <Select value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })}>
            <option value="">Select a trade</option>
            {TRADES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </Select>
        </Field>
        <Field label="Owner name"><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></Field>
        <Field label="WhatsApp number"><Input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+27 82 123 4567" /></Field>
        <div className="md:col-span-2">
          <Field label="Google Calendar email" hint="Bookings sync to this calendar."><Input value={form.google_calendar_id} onChange={(e) => setForm({ ...form, google_calendar_id: e.target.value })} placeholder="bookings@yourbusiness.co.za" /></Field>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save changes</Button>
        </div>
      </form>
    </Card>
  );
}

function AITab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [tone, setTone] = useState(client.tone ?? "");
  const [areas, setAreas] = useState((client.service_areas ?? []).join(", "));
  const [prompt, setPrompt] = useState(client.system_prompt ?? "");
  const [faq, setFaq] = useState<{ q: string; a: string }[]>(client.faq ?? []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Personality & tone" description="How should your AI sound to customers?" />
        <Select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="">Pick a tone</option>
          <option value="friendly">Friendly & casual</option>
          <option value="professional">Polite & professional</option>
          <option value="brief">Brief & to the point</option>
          <option value="warm">Warm & helpful</option>
        </Select>
      </Card>

      <Card>
        <CardHeader title="Service areas" description="Comma-separated suburbs or cities you cover." />
        <Input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Sandton, Rosebank, Bryanston" />
      </Card>

      <Card>
        <CardHeader title="FAQ" description="Common questions and the exact answers your AI should give." action={
          <Button variant="secondary" size="sm" onClick={() => setFaq([...faq, { q: "", a: "" }])}>Add FAQ</Button>
        } />
        <div className="space-y-3">
          {faq.length === 0 && <p className="text-small text-fg-muted">No FAQs yet. Add one to teach the AI a stock answer.</p>}
          {faq.map((f, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-start">
              <Input placeholder="Question" value={f.q} onChange={(e) => {
                const next = [...faq]; next[i] = { ...f, q: e.target.value }; setFaq(next);
              }} />
              <Textarea placeholder="Answer" value={f.a} onChange={(e) => {
                const next = [...faq]; next[i] = { ...f, a: e.target.value }; setFaq(next);
              }} rows={2} className="!min-h-[44px]" />
              <Button variant="ghost" size="icon" onClick={() => setFaq(faq.filter((_, j) => j !== i))} title="Remove">✕</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Your setup answers"
          description="Everything you filled in during setup — services, pricing, availability, AI personality, and more. Edit anything that has changed."
        />
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={20} placeholder="Your business setup answers will appear here after completing the get-started form." />
      </Card>

      <div className="flex justify-end">
        <Button
          loading={saving}
          icon={<Save className="w-4 h-4" />}
          onClick={() => save({
            tone,
            system_prompt: prompt,
            service_areas: areas.split(",").map((s) => s.trim()).filter(Boolean),
            faq,
          })}
        >
          Update AI knowledge
        </Button>
      </div>
    </div>
  );
}

function HoursTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [hours, setHours] = useState<Hours>(() => {
    const base: Hours = {};
    DAYS.forEach((d) => { base[d] = client.hours?.[d] ?? ["08:00", "17:00"]; });
    return base;
  });
  const toggle = (d: string) => setHours({ ...hours, [d]: hours[d] ? null : ["08:00", "17:00"] });
  return (
    <Card>
      <CardHeader title="Working hours" description="When can the AI book customers in?" />
      <div className="space-y-2">
        {DAYS.map((d) => {
          const open = !!hours[d];
          return (
            <div key={d} className="grid grid-cols-[80px_80px_1fr_1fr] gap-3 items-center py-2 border-b border-line last:border-0">
              <p className="text-body text-fg capitalize font-medium">{d}</p>
              <button
                onClick={() => toggle(d)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-tiny font-semibold cursor-pointer",
                  open ? "bg-brand-soft text-brand border border-brand/30" : "bg-white/[0.04] text-fg-muted border border-line"
                )}
              >
                {open ? "Open" : "Closed"}
              </button>
              {open && hours[d] ? (
                <>
                  <Input type="time" value={hours[d]![0]} onChange={(e) => setHours({ ...hours, [d]: [e.target.value, hours[d]![1]] })} className="!h-9 !py-1.5" />
                  <Input type="time" value={hours[d]![1]} onChange={(e) => setHours({ ...hours, [d]: [hours[d]![0], e.target.value] })} className="!h-9 !py-1.5" />
                </>
              ) : (
                <div className="col-span-2 text-tiny text-fg-subtle">No appointments</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-5">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save({ hours })}>Save hours</Button>
      </div>
    </Card>
  );
}

function IntegrationsTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [meta, setMeta] = useState({
    meta_business_id: client.meta_business_id ?? "",
    meta_phone_number_id: client.meta_phone_number_id ?? "",
  });
  const [calendar, setCalendar] = useState(client.google_calendar_id ?? "");
  const metaConnected = !!client.meta_phone_number_id;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="WhatsApp via Meta"
          description="Connect your Meta Business account to send manual replies and broadcasts."
          action={metaConnected ? <Badge tone="success" dot>Connected</Badge> : <Badge tone="warning" dot>Not connected</Badge>}
        />
        <div className="space-y-4">
          <Field label="Meta Business ID"><Input value={meta.meta_business_id} onChange={(e) => setMeta({ ...meta, meta_business_id: e.target.value })} /></Field>
          <Field label="Phone number ID" hint="Find this in Meta Business Manager → WhatsApp → API Setup."><Input value={meta.meta_phone_number_id} onChange={(e) => setMeta({ ...meta, meta_phone_number_id: e.target.value })} /></Field>
          <p className="text-tiny text-fg-muted leading-relaxed">
            Your access token is stored securely server-side. Once connected, the inbox sends through Meta automatically.
          </p>
          <div className="flex justify-end">
            <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save(meta)}>Save</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Google Calendar"
          description="Bookings get added to this calendar."
          action={calendar ? <Badge tone="success" dot>Connected</Badge> : <Badge tone="warning" dot>Not set</Badge>}
        />
        <Field label="Calendar email"><Input value={calendar} onChange={(e) => setCalendar(e.target.value)} /></Field>
        <div className="flex justify-end mt-4">
          <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save({ google_calendar_id: calendar })}>Save</Button>
        </div>
      </Card>
    </div>
  );
}

function NotificationsTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    notification_email: client.notification_email ?? "",
    notification_phone: client.notification_phone ?? "",
  });
  return (
    <Card>
      <CardHeader title="Notifications" description="Where do you want to be alerted when something needs you?" />
      <div className="space-y-4">
        <Field label="Email" hint="For escalations, no-shows, daily summaries."><Input type="email" value={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.value })} placeholder="you@business.co.za" /></Field>
        <Field label="WhatsApp number" hint="Urgent escalations only."><Input value={form.notification_phone} onChange={(e) => setForm({ ...form, notification_phone: e.target.value })} placeholder="+27 82 123 4567" /></Field>
      </div>
      <div className="flex justify-end mt-5">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save(form)}>Save</Button>
      </div>
    </Card>
  );
}


"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  Save, Check, AlertCircle, Plus, Trash2, X as XIcon, Link2, Link2Off,
  ExternalLink, Calendar, Globe, Zap, Play, Copy, CheckCheck, Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

type Toast = { msg: string; tone: "success" | "danger" };
type Client = NonNullable<ReturnType<typeof useClient>["client"]>;

const WEBHOOK_EVENTS = [
  { id: "conversation.created",  label: "Conversation created" },
  { id: "conversation.closed",   label: "Conversation closed" },
  { id: "booking.created",       label: "Booking created" },
  { id: "lead.qualified",        label: "Lead qualified" },
  { id: "escalation.triggered",  label: "Escalation triggered" },
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_fired_at: string | null;
  last_status: number | null;
  secret?: string;
}

export default function IntegrationsPage() {
  const { client, setClient, loading } = useClient();
  const [toast, setToast] = useState<Toast | null>(null);

  const show = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <>
      <PageHeader title="Integrations" description="Connect Qwikly to external tools and services." />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success" ? <Check className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-danger" />}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-8">
        {client && <NativeIntegrationsCard client={client} setClient={setClient} show={show} />}
        <EmbedPixelsCard client={client} setClient={setClient} loading={loading} show={show} />
        <WebhooksSection show={show} />
        <ZapierCard />
      </div>
    </>
  );
}

// ─── Native integrations (Meta + Google Calendar) ─────────────────────────────

function NativeIntegrationsCard({
  client, setClient, show,
}: {
  client: Client;
  setClient: (c: Client) => void;
  show: (msg: string, tone?: "success" | "danger") => void;
}) {
  const [meta, setMeta] = useState({
    meta_business_id:     client.meta_business_id     ?? "",
    meta_phone_number_id: client.meta_phone_number_id ?? "",
  });
  const [savingMeta, setSavingMeta] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const metaConnected = !!client.meta_phone_number_id;
  const calConnected  = !!client.google_access_token;

  const saveMeta = async () => {
    setSavingMeta(true);
    const { error } = await supabase.from("clients").update(meta).eq("id", client.id);
    setSavingMeta(false);
    if (error) show(error.message, "danger");
    else { setClient({ ...client, ...meta }); show("WhatsApp details saved"); }
  };

  const connectCalendar = () => {
    window.location.href = `/api/calendar/connect?clientId=${client.id}`;
  };

  const disconnectCalendar = async () => {
    setDisconnecting(true);
    await fetch("/api/calendar/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    setClient({ ...client, google_access_token: null, google_refresh_token: null, google_token_expiry: null });
    setDisconnecting(false);
    show("Calendar disconnected");
  };

  return (
    <div className="space-y-6">
      {/* Meta WhatsApp */}
      <Card>
        <CardHeader
          title="WhatsApp via Meta"
          description="Send manual replies and broadcasts via your Meta Business account."
          action={metaConnected ? <Badge tone="success" dot>Connected</Badge> : <Badge tone="warning" dot>Not connected</Badge>}
        />
        <div className="space-y-4">
          <Field label="Meta Business ID">
            <Input value={meta.meta_business_id} onChange={(e) => setMeta({ ...meta, meta_business_id: e.target.value })} />
          </Field>
          <Field label="Phone number ID" hint="Meta Business Manager → WhatsApp → API Setup.">
            <Input value={meta.meta_phone_number_id} onChange={(e) => setMeta({ ...meta, meta_phone_number_id: e.target.value })} />
          </Field>
          <p className="text-tiny text-fg-muted leading-relaxed">
            Your access token is stored securely server-side. Once connected, the inbox sends through Meta automatically.
          </p>
          <div className="flex justify-end">
            <Button loading={savingMeta} icon={<Save className="w-4 h-4" />} onClick={saveMeta}>Save</Button>
          </div>
        </div>
      </Card>

      {/* Google Calendar */}
      <Card>
        <CardHeader
          title="Google Calendar"
          description="Every booking Qwikly creates gets added to your calendar automatically."
          action={calConnected ? <Badge tone="success" dot>Connected</Badge> : <Badge tone="warning" dot>Not connected</Badge>}
        />
        {calConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ember/[0.06] border border-ember/20">
              <Calendar className="w-4 h-4 text-ember shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium text-fg">Calendar connected</p>
                <p className="text-tiny text-fg-muted truncate">{client.google_calendar_id ?? "Google Calendar"}</p>
              </div>
              <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-tiny text-ember hover:underline flex items-center gap-1 cursor-pointer">
                Open <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-end">
              <Button variant="danger" size="sm" loading={disconnecting} icon={<Link2Off className="w-3.5 h-3.5" />} onClick={disconnectCalendar}>
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-small text-fg-muted">Connect Google Calendar to sync bookings automatically.</p>
            <Button variant="primary" icon={<Link2 className="w-4 h-4" />} onClick={connectCalendar}>
              Connect Google Calendar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Embed pixels (GA + Meta Pixel) ──────────────────────────────────────────

function EmbedPixelsCard({
  client, setClient, loading, show,
}: {
  client: Client | null;
  setClient: (c: Client) => void;
  loading: boolean;
  show: (msg: string, tone?: "success" | "danger") => void;
}) {
  const [form, setForm] = useState({ ga_measurement_id: "", meta_pixel_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    setForm({
      ga_measurement_id: client.ga_measurement_id ?? "",
      meta_pixel_id:     client.meta_pixel_id     ?? "",
    });
  }, [client]);

  if (!client) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("clients").update(form).eq("id", client.id);
    setSaving(false);
    if (error) show(error.message, "danger");
    else { setClient({ ...client, ...form }); show("Pixel IDs saved"); }
  };

  return (
    <Card>
      <CardHeader title="Analytics & Pixels" description="Fire events to your analytics tools when customers interact with the embed widget." />
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={save}>
        <Field label="Google Analytics 4" hint="Measurement ID, e.g. G-XXXXXXXXXX">
          <Input
            value={form.ga_measurement_id}
            onChange={(e) => setForm({ ...form, ga_measurement_id: e.target.value })}
            placeholder="G-XXXXXXXXXX"
          />
        </Field>
        <Field label="Meta Pixel ID" hint="15-digit pixel ID from Events Manager">
          <Input
            value={form.meta_pixel_id}
            onChange={(e) => setForm({ ...form, meta_pixel_id: e.target.value })}
            placeholder="1234567890123456"
          />
        </Field>
        <div>
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save pixel IDs</Button>
        </div>
      </form>
      <p className="text-tiny text-fg-muted mt-4">
        When a visitor opens the widget or sends a message, Qwikly fires <code className="px-1 py-0.5 bg-surface-input rounded text-fg-muted">qwikly_widget_open</code> and <code className="px-1 py-0.5 bg-surface-input rounded text-fg-muted">qwikly_lead_captured</code> events.
      </p>
    </Card>
  );
}

// ─── Webhooks section ─────────────────────────────────────────────────────────

function WebhooksSection({ show }: { show: (msg: string, tone?: "success" | "danger") => void }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingW, setLoadingW] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = async () => {
    setLoadingW(true);
    const res = await fetch("/api/settings/webhooks");
    if (res.ok) setWebhooks(await res.json());
    setLoadingW(false);
  };

  useEffect(() => { load(); }, []);

  const deleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    const res = await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) { setWebhooks((prev) => prev.filter((w) => w.id !== id)); show("Webhook deleted"); }
    else show("Failed to delete", "danger");
  };

  const toggleActive = async (w: Webhook) => {
    const res = await fetch(`/api/settings/webhooks/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !w.is_active }),
    });
    if (res.ok) setWebhooks((prev) => prev.map((x) => x.id === w.id ? { ...x, is_active: !w.is_active } : x));
  };

  const testWebhook = async (id: string) => {
    setTesting(id);
    const res = await fetch(`/api/settings/webhooks/${id}/test`, { method: "POST" });
    const data = await res.json().catch(() => ({ ok: false, status: 0 }));
    setTesting(null);
    setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, last_fired_at: new Date().toISOString(), last_status: data.status } : w));
    if (data.ok) show(`Test fired — endpoint returned ${data.status}`);
    else show(`Test failed — endpoint returned ${data.status || "no response"}`, "danger");
  };

  const copySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader
        title="Webhooks"
        description="Receive real-time POST requests when events happen in Qwikly."
        action={
          <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            Add webhook
          </Button>
        }
      />

      {loadingW ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-surface-input animate-pulse" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="py-6 text-center">
          <Zap className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
          <p className="text-small text-fg-muted">No webhooks yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {webhooks.map((w) => (
            <div key={w.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-small font-mono text-fg truncate max-w-[300px]">{w.url}</code>
                    <Badge tone={w.is_active ? "success" : "neutral"}>{w.is_active ? "Active" : "Paused"}</Badge>
                    {w.last_status !== null && (
                      <Badge tone={w.last_status >= 200 && w.last_status < 300 ? "success" : "danger"}>
                        {w.last_status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {w.events.map((ev) => (
                      <span key={ev} className="text-tiny px-2 py-0.5 bg-surface-input border border-[var(--border)] rounded-md text-fg-muted">{ev}</span>
                    ))}
                  </div>
                  {w.last_fired_at && (
                    <p className="text-tiny text-fg-subtle mt-1">Last fired {new Date(w.last_fired_at).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon" title="Test fire"
                    loading={testing === w.id}
                    onClick={() => testWebhook(w.id)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={w.is_active ? "Pause" : "Activate"} onClick={() => toggleActive(w)}>
                    <span className="text-tiny font-semibold">{w.is_active ? "Off" : "On"}</span>
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteWebhook(w.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateWebhookModal
          onClose={() => setCreateOpen(false)}
          onCreated={(w, secret) => {
            setWebhooks((prev) => [w, ...prev]);
            setCreateOpen(false);
            setNewSecret({ id: w.id, secret });
          }}
          onError={(msg) => show(msg, "danger")}
        />
      )}

      {newSecret && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <Card className="w-full max-w-lg pointer-events-auto animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-ember" />
                <h2 className="text-h2 text-fg">Webhook signing secret</h2>
              </div>
              <div className="p-4 rounded-xl bg-surface-input border border-[var(--border)] mb-4">
                <code className="font-mono text-small text-fg break-all">{newSecret.secret}</code>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-tiny text-amber-700 dark:text-amber-400">
                  Copy this secret now. Use it to verify the <code>X-Qwikly-Signature-256</code> header on incoming requests.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" icon={copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />} onClick={() => copySecret(newSecret.secret)}>
                  {copied ? "Copied!" : "Copy secret"}
                </Button>
                <Button variant="primary" onClick={() => setNewSecret(null)}>Done</Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </Card>
  );
}

function CreateWebhookModal({ onClose, onCreated, onError }: {
  onClose: () => void;
  onCreated: (w: Webhook, secret: string) => void;
  onError: (msg: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["conversation.created"]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (ev: string) =>
    setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!url.trim()) return setErr("URL is required.");
    if (events.length === 0) return setErr("Select at least one event.");
    setSaving(true);
    const res = await fetch("/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), events }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return setErr(j.error ?? "Failed to create webhook.");
    }
    const data = await res.json();
    const { secret, ...webhook } = data;
    onCreated(webhook as Webhook, secret as string);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-md pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">Add webhook</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover cursor-pointer">
              <XIcon className="w-4 h-4 text-fg-muted" />
            </button>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Endpoint URL" hint="Must be publicly reachable (HTTPS recommended)">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.com/hooks/qwikly" autoFocus />
            </Field>
            <div>
              <p className="text-small font-medium text-fg mb-2">Events to subscribe to</p>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.includes(ev.id)}
                      onChange={() => toggle(ev.id)}
                      className="w-4 h-4 rounded border-[var(--border)] accent-ember cursor-pointer"
                    />
                    <span className="text-small text-fg">{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {err && <p className="text-small text-danger">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving} icon={<Plus className="w-4 h-4" />}>Create webhook</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

// ─── Zapier / Make card ───────────────────────────────────────────────────────

function ZapierCard() {
  return (
    <Card>
      <CardHeader title="Zapier & Make" description="Use your API keys to connect Qwikly to any automation platform." />
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            name: "Zapier",
            desc: "Trigger zaps from Qwikly events via webhook.",
            hint: "Use a 'Catch Hook' trigger and point it to your Qwikly webhook endpoint.",
          },
          {
            name: "Make (Integromat)",
            desc: "Build scenarios with Qwikly as the source.",
            hint: "Use the Custom Webhook module to receive Qwikly events.",
          },
        ].map((p) => (
          <div key={p.name} className="p-4 rounded-xl bg-surface-input border border-[var(--border)] space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-ember" />
              <p className="text-small font-semibold text-fg">{p.name}</p>
            </div>
            <p className="text-tiny text-fg-muted">{p.desc}</p>
            <p className="text-tiny text-fg-subtle bg-surface-card border border-[var(--border)] rounded-lg px-3 py-2">{p.hint}</p>
          </div>
        ))}
      </div>
      <p className="text-tiny text-fg-muted mt-4">
        Create an API key under <strong>API Keys</strong> to authenticate requests, or add a webhook to push events automatically.
      </p>
    </Card>
  );
}

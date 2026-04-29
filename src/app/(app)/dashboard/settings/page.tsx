"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2, Bot, Clock, Plug, Bell,
  Save, Check, AlertCircle, Calendar, Link2, Link2Off, ExternalLink,
  Wrench, DollarSign, Star, User, BookOpen, Plus, Search, Trash2, X as XIcon, Globe,
} from "lucide-react";
import { WebsiteAssistantTab } from "./_components/WebsiteAssistantTab";
import { ClientRow } from "@/lib/use-client";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "account",       label: "Account",        icon: User       },
  { id: "profile",       label: "Business",       icon: Building2  },
  { id: "services",      label: "Services",       icon: Wrench     },
  { id: "pricing",       label: "Pricing",        icon: DollarSign },
  { id: "edge",          label: "Your edge",      icon: Star       },
  { id: "ai",            label: "AI knowledge",   icon: Bot        },
  { id: "knowledge",     label: "Q&A",            icon: BookOpen   },
  { id: "hours",         label: "Hours",          icon: Clock      },
  { id: "integrations",  label: "Integrations",   icon: Plug       },
  { id: "notifications", label: "Notifications",  icon: Bell       },
  { id: "website",       label: "Website",        icon: Globe      },
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
  address: string | null;
  faq: { q: string; a: string }[] | null;
  tone: string | null;
  notification_email: string | null;
  notification_phone: string | null;
  meta_business_id: string | null;
  meta_phone_number_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: number | null;
  // profile extras
  years_in_business: string | null;
  certifications: string | null;
  brands_used: string | null;
  team_size: string | null;
  // services
  services_offered: string | null;
  services_excluded: string | null;
  after_hours: string | null;
  emergency_response: string | null;
  working_hours_text: string | null;
  booking_lead_time: string | null;
  booking_preference: string | null;
  response_time: string | null;
  // pricing
  charge_type: string | null;
  callout_fee: string | null;
  example_prices: string | null;
  minimum_job: string | null;
  free_quotes: string | null;
  payment_methods: string | null;
  payment_terms: string | null;
  // edge
  unique_selling_point: string | null;
  guarantees: string | null;
  common_questions: string | null;
  common_objections: string | null;
  // ai personality
  ai_tone: string | null;
  ai_language: string | null;
  ai_response_style: string | null;
  ai_greeting: string | null;
  ai_escalation_triggers: string | null;
  ai_escalation_custom: string | null;
  ai_unhappy_customer: string | null;
  ai_always_do: string | null;
  ai_never_say: string | null;
  ai_sign_off: string | null;
}

export default function SettingsPage() {
  const sp = useSearchParams();
  const router = useRouter();
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

  useEffect(() => {
    const cal = sp.get("cal");
    if (cal === "connected") {
      showToast("Google Calendar connected");
      router.replace("/dashboard/settings?tab=integrations");
    } else if (cal === "error") {
      showToast("Failed to connect Google Calendar", "danger");
      router.replace("/dashboard/settings?tab=integrations");
    }
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {tab === "account" ? (
            <AccountTab showToast={showToast} />
          ) : loading ? (
            <Card><p className="text-fg-muted text-small">Loading workspace…</p></Card>
          ) : !client ? (
            <Card><p className="text-fg-muted text-small">No client found for your account.</p></Card>
          ) : (
            <>
              {tab === "profile"       && <ProfileTab       client={client} save={save} saving={saving} />}
              {tab === "services"      && <ServicesTab      client={client} save={save} saving={saving} />}
              {tab === "pricing"       && <PricingTab       client={client} save={save} saving={saving} />}
              {tab === "edge"          && <EdgeTab          client={client} save={save} saving={saving} />}
              {tab === "ai"            && <AITab            client={client} save={save} saving={saving} />}
              {tab === "knowledge"     && <KnowledgeTab     clientId={client.id} />}
              {tab === "hours"         && <HoursTab         client={client} save={save} saving={saving} />}
              {tab === "integrations"  && <IntegrationsTab  client={client} save={save} saving={saving} />}
              {tab === "notifications" && <NotificationsTab client={client} save={save} saving={saving} />}
              {tab === "website" && (
                <WebsiteAssistantTab
                  client={client as unknown as ClientRow}
                  onSave={async () => {
                    const { data } = await supabase.from("clients").select("*").limit(1).maybeSingle();
                    setClient(data as Client);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Account ────────────────────────────────────────────────────────────────

function AccountTab({ showToast }: { showToast: (msg: string, tone?: "success" | "danger") => void }) {
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setFullName(u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? "");
    });
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSaving(false);
    if (error) {
      showToast(error.message, "danger");
    } else {
      showToast("Name updated");
    }
  };

  return (
    <Card>
      <CardHeader title="Your account" description="Controls your name as it appears across the dashboard." />
      <form className="space-y-4" onSubmit={save}>
        <Field label="Email">
          <Input value={user?.email ?? ""} disabled className="opacity-60 cursor-not-allowed" />
        </Field>
        <Field label="Display name" hint="Shown in your dashboard greeting.">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Liam Clarke" />
        </Field>
        <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save name</Button>
      </form>
    </Card>
  );
}

// ─── Profile ────────────────────────────────────────────────────────────────

function ProfileTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    business_name:    client.business_name    ?? "",
    trade:            client.trade            ?? "",
    owner_name:       client.owner_name       ?? "",
    whatsapp_number:  client.whatsapp_number  ?? "",
    google_calendar_id: client.google_calendar_id ?? "",
    years_in_business: client.years_in_business ?? "",
    certifications:   client.certifications   ?? "",
    brands_used:      client.brands_used      ?? "",
    team_size:        client.team_size        ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Card>
      <CardHeader title="Business profile" description="Basic info your AI uses when chatting with customers." />
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); save(form); }}>
        <Field label="Business name"><Input value={form.business_name} onChange={set("business_name")} /></Field>
        <Field label="Trade">
          <Select value={form.trade} onChange={set("trade")}>
            <option value="">Select a trade</option>
            {TRADES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </Select>
        </Field>
        <Field label="Owner name"><Input value={form.owner_name} onChange={set("owner_name")} /></Field>
        <Field label="WhatsApp number"><Input value={form.whatsapp_number} onChange={set("whatsapp_number")} placeholder="+27 82 123 4567" /></Field>
        <Field label="Years in business"><Input value={form.years_in_business} onChange={set("years_in_business")} placeholder="e.g. 8 years" /></Field>
        <Field label="Team size"><Input value={form.team_size} onChange={set("team_size")} placeholder="e.g. Solo operator, 3 technicians" /></Field>
        <div className="md:col-span-2">
          <Field label="Certifications / licences" hint="Any relevant trade licences, registrations, or certifications.">
            <Input value={form.certifications} onChange={set("certifications")} placeholder="e.g. ECSA registered, COC certified" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Brands / products used" hint="Brands you work with so the AI can mention them confidently.">
            <Input value={form.brands_used} onChange={set("brands_used")} placeholder="e.g. Schneider Electric, Crabtree, ABB" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Google Calendar email" hint="Bookings sync to this calendar.">
            <Input value={form.google_calendar_id} onChange={set("google_calendar_id")} placeholder="bookings@yourbusiness.co.za" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save changes</Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Services ───────────────────────────────────────────────────────────────

function ServicesTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    services_offered:  client.services_offered  ?? "",
    services_excluded: client.services_excluded ?? "",
    after_hours:       client.after_hours       ?? "",
    emergency_response: client.emergency_response ?? "",
    working_hours_text: client.working_hours_text ?? "",
    booking_lead_time: client.booking_lead_time ?? "",
    booking_preference: client.booking_preference ?? "",
    response_time:     client.response_time     ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="What you do" description="The AI uses this to qualify leads and answer service questions." />
        <div className="space-y-4">
          <Field label="Services offered" hint="List everything you do, one per line or comma-separated.">
            <Textarea value={form.services_offered} onChange={set("services_offered")} rows={4} placeholder="e.g. DB upgrades, fault finding, COC certificates, geyser installations" />
          </Field>
          <Field label="Services you don't do" hint="The AI will politely decline these and redirect the customer.">
            <Textarea value={form.services_excluded} onChange={set("services_excluded")} rows={3} placeholder="e.g. Solar installations, industrial work, Eskom connections" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Availability" description="When you're reachable and how far in advance to book." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Working hours (plain text)" hint="e.g. Mon–Fri 8am–5pm, Sat 8am–1pm">
            <Input value={form.working_hours_text} onChange={set("working_hours_text")} placeholder="Mon–Fri 8am–5pm" />
          </Field>
          <Field label="Booking lead time" hint="How much notice do you need?">
            <Input value={form.booking_lead_time} onChange={set("booking_lead_time")} placeholder="e.g. 24 hours notice preferred" />
          </Field>
          <Field label="Booking preference">
            <Select value={form.booking_preference} onChange={set("booking_preference")}>
              <option value="">Select preference</option>
              <option value="whatsapp">WhatsApp first</option>
              <option value="call">Phone call</option>
              <option value="ai">AI books directly</option>
            </Select>
          </Field>
          <Field label="Expected response time" hint="What customers can expect after messaging.">
            <Input value={form.response_time} onChange={set("response_time")} placeholder="e.g. Within 1 hour during business hours" />
          </Field>
          <Field label="After-hours availability">
            <Select value={form.after_hours} onChange={set("after_hours")}>
              <option value="">Select option</option>
              <option value="yes">Yes, available after hours</option>
              <option value="no">No, business hours only</option>
              <option value="emergency">Emergency callouts only</option>
            </Select>
          </Field>
          <Field label="Emergency response">
            <Select value={form.emergency_response} onChange={set("emergency_response")}>
              <option value="">Select option</option>
              <option value="yes">Yes, we handle emergencies</option>
              <option value="no">No emergency callouts</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save(form)}>Save services</Button>
      </div>
    </div>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────

function PricingTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    charge_type:     client.charge_type     ?? "",
    callout_fee:     client.callout_fee     ?? "",
    example_prices:  client.example_prices  ?? "",
    minimum_job:     client.minimum_job     ?? "",
    free_quotes:     client.free_quotes     ?? "",
    payment_methods: client.payment_methods ?? "",
    payment_terms:   client.payment_terms   ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="How you charge" description="The AI uses this to answer pricing questions without committing to specific quotes." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Charge type">
            <Select value={form.charge_type} onChange={set("charge_type")}>
              <option value="">Select charge type</option>
              <option value="hourly">Hourly rate</option>
              <option value="fixed">Fixed price per job</option>
              <option value="quote">Quote-based</option>
              <option value="mixed">Mixed (hourly + materials)</option>
            </Select>
          </Field>
          <Field label="Callout fee" hint="Leave blank if none.">
            <Input value={form.callout_fee} onChange={set("callout_fee")} placeholder="e.g. R350 callout fee" />
          </Field>
          <Field label="Minimum job value">
            <Input value={form.minimum_job} onChange={set("minimum_job")} placeholder="e.g. R500 minimum" />
          </Field>
          <Field label="Free quotes">
            <Select value={form.free_quotes} onChange={set("free_quotes")}>
              <option value="">Select option</option>
              <option value="yes">Yes, free quotes</option>
              <option value="no">No, quotes are charged</option>
              <option value="onsite">Free on-site assessment</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Example prices" description="Give the AI ballpark figures to share with customers, not exact quotes." />
        <Textarea
          value={form.example_prices}
          onChange={set("example_prices")}
          rows={5}
          placeholder={"e.g.\nDB board upgrade: R3500–R6000\nGeyser installation: R2500–R4000\nFault finding: R350 + labour"}
        />
      </Card>

      <Card>
        <CardHeader title="Payment" description="How and when customers pay." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Payment methods accepted">
            <Input value={form.payment_methods} onChange={set("payment_methods")} placeholder="e.g. EFT, cash, card on request" />
          </Field>
          <Field label="Payment terms">
            <Input value={form.payment_terms} onChange={set("payment_terms")} placeholder="e.g. 50% deposit, balance on completion" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save(form)}>Save pricing</Button>
      </div>
    </div>
  );
}

// ─── Edge ───────────────────────────────────────────────────────────────────

function EdgeTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    unique_selling_point: client.unique_selling_point ?? "",
    guarantees:           client.guarantees           ?? "",
    common_questions:     client.common_questions     ?? "",
    common_objections:    client.common_objections    ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="What makes you different" description="The AI leads with these when convincing a customer to book." />
        <div className="space-y-4">
          <Field label="Unique selling point" hint="What do you do better than competitors?">
            <Textarea value={form.unique_selling_point} onChange={set("unique_selling_point")} rows={3} placeholder="e.g. Same-day callouts in Sandton, 10-year warranty on all work, ECSA registered" />
          </Field>
          <Field label="Guarantees or warranties">
            <Textarea value={form.guarantees} onChange={set("guarantees")} rows={3} placeholder="e.g. 12-month workmanship guarantee, 5-year product warranty" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Handle objections" description="Teach the AI how to respond when customers push back." />
        <div className="space-y-4">
          <Field label="Questions customers often ask" hint="List the top 3–5 questions you keep getting.">
            <Textarea value={form.common_questions} onChange={set("common_questions")} rows={4} placeholder={"e.g.\nDo you work on weekends?\nHow long does a DB upgrade take?\nDo you give free quotes?"} />
          </Field>
          <Field label="Objections customers raise" hint="How should the AI respond when they say 'too expensive' or 'I'll think about it'?">
            <Textarea value={form.common_objections} onChange={set("common_objections")} rows={4} placeholder={"e.g.\n'Too expensive' → mention quality and warranty\n'I'll think about it' → offer to hold a time slot"} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save(form)}>Save edge</Button>
      </div>
    </div>
  );
}

// ─── AI knowledge ───────────────────────────────────────────────────────────

function AITab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [tone, setTone] = useState(client.tone ?? "");
  const [areas, setAreas] = useState(client.address ?? "");
  const [prompt, setPrompt] = useState(client.system_prompt ?? "");
  const [faq, setFaq] = useState<{ q: string; a: string }[]>(client.faq ?? []);
  const [personality, setPersonality] = useState({
    ai_tone:                 client.ai_tone                 ?? "",
    ai_language:             client.ai_language             ?? "",
    ai_response_style:       client.ai_response_style       ?? "",
    ai_greeting:             client.ai_greeting             ?? "",
    ai_escalation_triggers:  client.ai_escalation_triggers  ?? "",
    ai_escalation_custom:    client.ai_escalation_custom    ?? "",
    ai_unhappy_customer:     client.ai_unhappy_customer     ?? "",
    ai_always_do:            client.ai_always_do            ?? "",
    ai_never_say:            client.ai_never_say            ?? "",
    ai_sign_off:             client.ai_sign_off             ?? "",
  });
  const setp = (k: keyof typeof personality) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setPersonality({ ...personality, [k]: e.target.value });

  const handleSave = () => save({
    tone,
    system_prompt: prompt,
    address: areas.trim() || null,
    faq,
    ...personality,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Personality" description="How should your AI come across to customers?" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Overall tone">
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="">Pick a tone</option>
              <option value="friendly">Friendly &amp; casual</option>
              <option value="professional">Polite &amp; professional</option>
              <option value="brief">Brief &amp; to the point</option>
              <option value="warm">Warm &amp; helpful</option>
            </Select>
          </Field>
          <Field label="AI tone (detailed)">
            <Input value={personality.ai_tone} onChange={setp("ai_tone")} placeholder="e.g. Confident but approachable" />
          </Field>
          <Field label="Language / dialect">
            <Input value={personality.ai_language} onChange={setp("ai_language")} placeholder="e.g. South African English, casual SA slang ok" />
          </Field>
          <Field label="Response style">
            <Select value={personality.ai_response_style} onChange={setp("ai_response_style")}>
              <option value="">Select style</option>
              <option value="short">Short, punchy replies</option>
              <option value="detailed">Detailed and thorough</option>
              <option value="conversational">Conversational flow</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Opening greeting" hint="First message the AI sends when a new customer messages in.">
              <Input value={personality.ai_greeting} onChange={setp("ai_greeting")} placeholder="e.g. Hi! 👋 Thanks for reaching out to Volt-Tech. How can we help you today?" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Sign-off message">
              <Input value={personality.ai_sign_off} onChange={setp("ai_sign_off")} placeholder="e.g. Thanks again, we look forward to helping you!" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Escalation rules" description="When should the AI hand off to you?" />
        <div className="space-y-4">
          <Field label="Auto-escalation triggers">
            <Select value={personality.ai_escalation_triggers} onChange={setp("ai_escalation_triggers")}>
              <option value="">Select triggers</option>
              <option value="angry">Angry or frustrated customer</option>
              <option value="complex">Complex technical question</option>
              <option value="price">Pricing negotiation</option>
              <option value="all">All of the above</option>
              <option value="custom">Custom (specify below)</option>
            </Select>
          </Field>
          <Field label="Custom escalation rules" hint="Anything specific that should always be passed to you.">
            <Textarea value={personality.ai_escalation_custom} onChange={setp("ai_escalation_custom")} rows={3} placeholder="e.g. Always escalate if customer mentions insurance claims or legal disputes" />
          </Field>
          <Field label="How to handle an unhappy customer">
            <Textarea value={personality.ai_unhappy_customer} onChange={setp("ai_unhappy_customer")} rows={3} placeholder="e.g. Acknowledge the issue, apologise sincerely, offer to have the owner call them within 30 minutes" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Hard rules" description="Non-negotiable behaviour instructions." />
        <div className="space-y-4">
          <Field label="Always do" hint="Things the AI must always include or do.">
            <Textarea value={personality.ai_always_do} onChange={setp("ai_always_do")} rows={3} placeholder="e.g. Always confirm the customer's area before booking, always mention the callout fee upfront" />
          </Field>
          <Field label="Never say" hint="Topics, phrases, or commitments to avoid.">
            <Textarea value={personality.ai_never_say} onChange={setp("ai_never_say")} rows={3} placeholder="e.g. Never give a fixed price before seeing the job, never mention competitor names" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Service areas" description="Comma-separated suburbs or cities you cover." />
        <Input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Sandton, Rosebank, Bryanston" />
      </Card>

      <Card>
        <CardHeader
          title="FAQ"
          description="Common questions and the exact answers your AI should give."
          action={<Button variant="secondary" size="sm" onClick={() => setFaq([...faq, { q: "", a: "" }])}>Add FAQ</Button>}
        />
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
          title="Full system prompt"
          description="Advanced: the raw instructions your AI runs on. Edited automatically when you save other tabs."
        />
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={16} placeholder="Your business setup answers will appear here after completing setup." />
      </Card>

      <div className="flex justify-end">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={handleSave}>Update AI knowledge</Button>
      </div>
    </div>
  );
}

// ─── Hours ──────────────────────────────────────────────────────────────────

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

// ─── Integrations ───────────────────────────────────────────────────────────

function IntegrationsTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [meta, setMeta] = useState({
    meta_business_id:     client.meta_business_id     ?? "",
    meta_phone_number_id: client.meta_phone_number_id ?? "",
  });
  const [disconnecting, setDisconnecting] = useState(false);
  const metaConnected = !!client.meta_phone_number_id;
  const calConnected  = !!client.google_access_token;

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
    save({ google_access_token: null, google_refresh_token: null, google_token_expiry: null });
    setDisconnecting(false);
  };

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
          description="Every booking Qwikly creates gets added to your calendar automatically."
          action={calConnected ? <Badge tone="success" dot>Connected</Badge> : <Badge tone="warning" dot>Not connected</Badge>}
        />
        {calConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand/[0.06] border border-brand/20">
              <Calendar className="w-4 h-4 text-brand shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium text-fg">Calendar connected</p>
                <p className="text-tiny text-fg-muted truncate">{client.google_calendar_id ?? "Google Calendar"}</p>
              </div>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-tiny text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-tiny text-fg-muted leading-relaxed">
              New bookings are added as 1-hour events. Existing calendar events are read-only in Qwikly and won&apos;t be modified.
            </p>
            <div className="flex justify-end">
              <Button
                variant="danger"
                size="sm"
                loading={disconnecting}
                icon={<Link2Off className="w-3.5 h-3.5" />}
                onClick={disconnectCalendar}
              >
                Disconnect calendar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-small text-fg-muted leading-relaxed">
              Connect your Google Calendar so every booking is synced automatically.
            </p>
            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-line space-y-1.5">
              <p className="text-tiny font-semibold text-fg">What gets connected</p>
              {[
                "New bookings are added to your calendar as events",
                "Your calendar shows inside the Qwikly booking view",
                "No events are deleted or modified. Read and write only.",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                  <p className="text-tiny text-fg-muted">{t}</p>
                </div>
              ))}
            </div>
            <Button variant="primary" icon={<Link2 className="w-4 h-4" />} onClick={connectCalendar}>
              Connect Google Calendar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Knowledge / Q&A ────────────────────────────────────────────────────────

interface KbArticle {
  id: string;
  client_id: number;
  title: string;
  body: string;
  is_active: boolean;
  updated_at: string;
}

function KnowledgeTab({ clientId }: { clientId: string }) {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loadingK, setLoadingK] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<KbArticle | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingK(true);
      const { data } = await supabase
        .from("kb_articles")
        .select("id, client_id, title, body, is_active, updated_at")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false });
      setArticles((data as KbArticle[]) ?? []);
      setLoadingK(false);
    })();
  }, [clientId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  }, [articles, query]);

  const remove = async (a: KbArticle) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await supabase.from("kb_articles").delete().eq("id", a.id);
    setArticles((list) => list.filter((x) => x.id !== a.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-h2 text-fg">Q&amp;A</p>
          <p className="text-small text-fg-muted mt-0.5">Answers your digital assistant uses when customers ask common questions.</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
          Add answer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
        <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
      </div>

      {loadingK ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="!p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-5 h-5 text-fg-muted" />
          </div>
          <p className="text-body font-semibold text-fg">{articles.length === 0 ? "No answers yet" : "No matches"}</p>
          <p className="text-small text-fg-muted mt-1 max-w-sm mx-auto">
            {articles.length === 0
              ? "Add a few common questions. Opening hours, pricing, and how to book are good starting points."
              : "Try a different search."}
          </p>
          {articles.length === 0 && (
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)} className="mt-5">
              Add first answer
            </Button>
          )}
        </Card>
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-white/[0.06] bg-[#0D111A] overflow-hidden">
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => setEditing(a)}
              className="p-5 hover:bg-white/[0.02] cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-fg">{a.title}</p>
                  <p className="text-small text-fg-muted line-clamp-2 mt-1">{a.body}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(a); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <KbEditor
          clientId={clientId as unknown as number}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(a) => {
            setArticles((list) => {
              const exists = list.some((x) => x.id === a.id);
              return exists ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list];
            });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function KbEditor({
  clientId, initial, onClose, onSaved,
}: {
  clientId: number;
  initial: KbArticle | null;
  onClose: () => void;
  onSaved: (a: KbArticle) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [savingK, setSavingK] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!title.trim() || !body.trim()) return setErr("Question and answer are required.");
    setSavingK(true);
    const payload = {
      client_id: clientId,
      title: title.trim(),
      body,
      is_active: true,
      is_public: true,
      updated_at: new Date().toISOString(),
    };
    const q = initial
      ? supabase.from("kb_articles").update(payload).eq("id", initial.id).select().single()
      : supabase.from("kb_articles").insert(payload).select().single();
    const { data, error } = await q;
    setSavingK(false);
    if (error) return setErr(error.message);
    onSaved(data as KbArticle);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <Card className="w-full max-w-xl my-8 pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">{initial ? "Edit answer" : "Add answer"}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer">
              <XIcon className="w-4 h-4 text-fg-muted" />
            </button>
          </div>
          <div className="space-y-4">
            <Field label="Question">
              <Input placeholder="What are your operating hours?" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Answer" hint="Write how you'd explain it in person.">
              <Textarea rows={6} placeholder="We're open Mon to Fri, 08:00 to 17:00…" value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            {err && <p className="text-small text-danger">{err}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={savingK} icon={<Check className="w-4 h-4" />} onClick={save}>Save</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ─── Notifications ──────────────────────────────────────────────────────────

function NotificationsTab({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    notification_email: client.notification_email ?? "",
    notification_phone: client.notification_phone ?? "",
  });
  return (
    <Card>
      <CardHeader title="Notifications" description="Where do you want to be alerted when something needs you?" />
      <div className="space-y-4">
        <Field label="Email" hint="For escalations, no-shows, daily summaries.">
          <Input type="email" value={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.value })} placeholder="you@business.co.za" />
        </Field>
        <Field label="WhatsApp number" hint="Urgent escalations only.">
          <Input value={form.notification_phone} onChange={(e) => setForm({ ...form, notification_phone: e.target.value })} placeholder="+27 82 123 4567" />
        </Field>
      </div>
      <div className="flex justify-end mt-5">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save(form)}>Save</Button>
      </div>
    </Card>
  );
}

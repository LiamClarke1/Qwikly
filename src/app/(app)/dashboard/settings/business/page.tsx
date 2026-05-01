"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent, ChangeEvent } from "react";
import { Save, Check, AlertCircle, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";

const TRADES = [
  "electrician", "plumber", "roofer", "solar installer", "pest control",
  "aircon / hvac", "pool cleaning", "landscaper", "garage doors", "security", "other",
];

const INDUSTRIES = [
  "Home Services", "Construction & Building", "Automotive", "Healthcare",
  "Beauty & Wellness", "Food & Hospitality", "IT & Technology",
  "Financial Services", "Retail", "Education", "Logistics", "Other",
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Toast = { msg: string; tone: "success" | "danger" };

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

type Client = NonNullable<ReturnType<typeof useClient>["client"]>;

export default function BusinessPage() {
  const { toast, show } = useToast();
  const { client, setClient, loading } = useClient();

  if (loading) {
    return (
      <>
        <PageHeader title="Business" description="Your brand and service configuration." />
        <Card><p className="text-small text-fg-muted">Loading…</p></Card>
      </>
    );
  }
  if (!client) {
    return (
      <>
        <PageHeader title="Business" description="Your brand and service configuration." />
        <Card><p className="text-small text-fg-muted">No client found.</p></Card>
      </>
    );
  }

  const save = async (patch: Partial<Client>) => {
    const { error } = await supabase.from("clients").update(patch).eq("id", client.id);
    if (error) { show(error.message, "danger"); return; }
    setClient({ ...client, ...patch });
    show("Saved");
  };

  return (
    <>
      <PageHeader title="Business" description="Brand, services, pricing, and what makes you stand out." />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success"
            ? <Check className="w-4 h-4 text-success" />
            : <AlertCircle className="w-4 h-4 text-danger" />}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-8">
        <BrandCard client={client} save={save} />
        <ProfileCard client={client} save={save} />
        <ServicesCard client={client} save={save} />
        <PricingCard client={client} save={save} />
        <EdgeCard client={client} save={save} />
      </div>
    </>
  );
}

// ─── Brand card ───────────────────────────────────────────────────────────────

function BrandCard({ client, save }: { client: Client; save: (p: Partial<Client>) => void }) {
  const [form, setForm] = useState({
    business_name: client.business_name ?? "",
    website:       client.website       ?? "",
    support_email: client.support_email ?? "",
    industry:      client.industry      ?? "",
    address:       client.address       ?? "",
    brand_color:   client.brand_color   ?? "#E85A2C",
  });
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(client.invoice_logo_url ?? null);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const uploadLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    setLogoUploading(true);
    const path = `logos/${client.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (upErr) { setLogoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.from("clients").update({ invoice_logo_url: publicUrl }).eq("id", client.id);
    setLogoUrl(publicUrl);
    setLogoUploading(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await save(form as Partial<Client>);
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader title="Brand" description="Identity shown on invoices, the embed widget, and customer-facing content." />

      {/* Logo */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-surface-input border border-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            : <span className="text-tiny text-fg-muted text-center leading-tight px-1">No logo</span>}
        </div>
        <div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 h-8 px-3 text-small font-medium rounded-lg bg-surface-input border border-[var(--border-strong)] text-fg hover:bg-surface-active transition-colors cursor-pointer">
              {logoUploading
                ? <div className="w-3.5 h-3.5 border-2 border-fg-muted/30 border-t-fg-muted rounded-full animate-spin" />
                : <Upload className="w-3.5 h-3.5" />}
              Upload logo
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={uploadLogo} />
          </label>
          <p className="text-tiny text-fg-muted mt-1">PNG or SVG, max 2 MB</p>
        </div>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submit}>
        <Field label="Business name">
          <Input value={form.business_name} onChange={set("business_name")} />
        </Field>
        <Field label="Industry">
          <Select value={form.industry} onChange={set("industry")}>
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </Field>
        <Field label="Website">
          <Input value={form.website} onChange={set("website")} placeholder="https://yourbusiness.co.za" type="url" />
        </Field>
        <Field label="Support email" hint="Shown to customers on invoices.">
          <Input value={form.support_email} onChange={set("support_email")} placeholder="support@business.co.za" type="email" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Business address" hint="Appears on invoices.">
            <Input value={form.address} onChange={set("address")} placeholder="123 Main Rd, Sandton, 2196" />
          </Field>
        </div>
        <div className="space-y-1.5">
          <label className="block text-small font-medium text-fg">Brand colour</label>
          <p className="text-small text-fg-muted -mt-1">Updates the embed widget in real time.</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brand_color}
              onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
              className="h-10 w-16 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent p-1"
            />
            <Input
              value={form.brand_color}
              onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
              placeholder="#E85A2C"
              className="font-mono"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save brand</Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ client, save }: { client: Client; save: (p: Partial<Client>) => void }) {
  // Determine if the stored trade value is a known trade or custom "other" text
  const storedTrade = client.trade ?? "";
  const isOtherTrade = storedTrade !== "" && !TRADES.includes(storedTrade) && storedTrade !== "other";
  const [form, setForm] = useState({
    trade:             isOtherTrade ? "other" : storedTrade,
    owner_name:        client.owner_name       ?? "",
    whatsapp_number:   client.whatsapp_number  ?? "",
    years_in_business: client.years_in_business ?? "",
    team_size:         client.team_size         ?? "",
    certifications:    client.certifications    ?? "",
    brands_used:       client.brands_used       ?? "",
    google_calendar_id: client.google_calendar_id ?? "",
  });
  const [otherTrade, setOtherTrade] = useState(isOtherTrade ? storedTrade : "");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const patch = {
      ...form,
      trade: form.trade === "other" ? otherTrade || "other" : form.trade,
    };
    await save(patch as Partial<Client>);
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader title="Business profile" description="Basic info your assistant uses when chatting with customers." />
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={handleSave}
      >
        <Field label="Trade">
          <Select value={form.trade} onChange={(e) => { set("trade")(e); if (e.target.value !== "other") setOtherTrade(""); }}>
            <option value="">Select a trade</option>
            {TRADES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </Select>
          {form.trade === "other" && (
            <input
              type="text"
              value={otherTrade}
              placeholder="Please describe your trade…"
              className="mt-2 w-full bg-surface-input border border-[var(--border)] rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-[var(--brand)] focus:border-[var(--brand)] transition-colors duration-200"
              onChange={(e) => setOtherTrade(e.target.value)}
            />
          )}
        </Field>
        <Field label="Owner name"><Input value={form.owner_name} onChange={set("owner_name")} /></Field>
        <Field label="WhatsApp number"><Input value={form.whatsapp_number} onChange={set("whatsapp_number")} placeholder="+27 82 123 4567" /></Field>
        <Field label="Years in business"><Input value={form.years_in_business} onChange={set("years_in_business")} placeholder="e.g. 8 years" /></Field>
        <Field label="Team size"><Input value={form.team_size} onChange={set("team_size")} placeholder="e.g. Solo, 3 technicians" /></Field>
        <div className="md:col-span-2">
          <Field label="Certifications / licences" hint="Any relevant trade licences, registrations, or certifications.">
            <Input value={form.certifications} onChange={set("certifications")} placeholder="e.g. ECSA registered, COC certified" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Brands / products used" hint="Brands you work with so your assistant can mention them confidently.">
            <Input value={form.brands_used} onChange={set("brands_used")} placeholder="e.g. Schneider Electric, Crabtree, ABB" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save profile</Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Services card ────────────────────────────────────────────────────────────

function ServicesCard({ client, save }: { client: Client; save: (p: Partial<Client>) => void }) {
  const [form, setForm] = useState({
    services_offered:   client.services_offered   ?? "",
    services_excluded:  client.services_excluded  ?? "",
    after_hours:        client.after_hours        ?? "",
    emergency_response: client.emergency_response ?? "",
    working_hours_text: client.working_hours_text ?? "",
    booking_lead_time:  client.booking_lead_time  ?? "",
    booking_preference: client.booking_preference ?? "",
    response_time:      client.response_time      ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="What you do" description="Your assistant uses this to qualify leads and answer service questions." />
        <div className="space-y-4">
          <Field label="Services offered" hint="List everything you do, one per line or comma-separated.">
            <Textarea value={form.services_offered} onChange={set("services_offered")} rows={4} placeholder="e.g. DB upgrades, fault finding, COC certificates" />
          </Field>
          <Field label="Services you don't do" hint="Your assistant will politely decline these.">
            <Textarea value={form.services_excluded} onChange={set("services_excluded")} rows={3} placeholder="e.g. Solar installations, industrial work" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Availability" description="When you're reachable and how far in advance to book." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Working hours (text)" hint="e.g. Mon–Fri 8am–5pm, Sat 8am–1pm">
            <Input value={form.working_hours_text} onChange={set("working_hours_text")} placeholder="Mon–Fri 8am–5pm" />
          </Field>
          <Field label="Booking lead time">
            <Input value={form.booking_lead_time} onChange={set("booking_lead_time")} placeholder="e.g. 24 hours notice" />
          </Field>
          <Field label="Booking preference">
            <Select value={form.booking_preference} onChange={set("booking_preference")}>
              <option value="">Select preference</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Call">Phone call</option>
              <option value="Either works">Either works</option>
            </Select>
          </Field>
          <Field label="Expected response time">
            <Input value={form.response_time} onChange={set("response_time")} placeholder="e.g. Within 1 hour during business hours" />
          </Field>
          <Field label="After-hours availability">
            <Select value={form.after_hours} onChange={set("after_hours")}>
              <option value="">Select option</option>
              <option value="Yes">Yes, available</option>
              <option value="No">Business hours only</option>
              <option value="Depends on the job">Depends on the job</option>
            </Select>
          </Field>
          <Field label="Emergency response">
            <Input value={form.emergency_response} onChange={set("emergency_response")} placeholder="e.g. Yes, same day" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          loading={saving}
          icon={<Save className="w-4 h-4" />}
          onClick={async () => { setSaving(true); await save(form as Partial<Client>); setSaving(false); }}
        >
          Save services
        </Button>
      </div>
    </div>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────

function PricingCard({ client, save }: { client: Client; save: (p: Partial<Client>) => void }) {
  const [form, setForm] = useState({
    charge_type:     client.charge_type     ?? "",
    callout_fee:     client.callout_fee     ?? "",
    example_prices:  client.example_prices  ?? "",
    minimum_job:     client.minimum_job     ?? "",
    free_quotes:     client.free_quotes     ?? "",
    payment_methods: client.payment_methods ?? "",
    payment_terms:   client.payment_terms   ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="How you charge" description="Your assistant uses this to answer pricing questions without committing to quotes." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Charge type">
            <Select value={form.charge_type} onChange={set("charge_type")}>
              <option value="">Select charge type</option>
              <option value="Call-out fee + labour">Call-out fee + labour</option>
              <option value="Per job quote">Per job quote</option>
              <option value="Hourly rate">Hourly rate</option>
              <option value="Mix of the above">Mix of the above</option>
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
              <option value="Yes">Yes, free quotes</option>
              <option value="No">No, charged for quotes</option>
              <option value="Only for big jobs">Only for big jobs</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Example prices" description="Ballpark figures to share with customers, not exact quotes." />
        <Textarea
          value={form.example_prices}
          onChange={set("example_prices")}
          rows={5}
          placeholder={"e.g.\nDB board upgrade: R3500–R6000\nGeyser installation: R2500–R4000"}
        />
      </Card>

      <Card>
        <CardHeader title="Payment" description="How and when customers pay." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Payment methods accepted">
            <Input value={form.payment_methods} onChange={set("payment_methods")} placeholder="e.g. EFT, cash, card" />
          </Field>
          <Field label="Payment terms">
            <Input value={form.payment_terms} onChange={set("payment_terms")} placeholder="e.g. 50% deposit, balance on completion" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          loading={saving}
          icon={<Save className="w-4 h-4" />}
          onClick={async () => { setSaving(true); await save(form as Partial<Client>); setSaving(false); }}
        >
          Save pricing
        </Button>
      </div>
    </div>
  );
}

// ─── Edge card ────────────────────────────────────────────────────────────────

function EdgeCard({ client, save }: { client: Client; save: (p: Partial<Client>) => void }) {
  const [form, setForm] = useState({
    unique_selling_point: client.unique_selling_point ?? "",
    guarantees:           client.guarantees           ?? "",
    common_questions:     client.common_questions     ?? "",
    common_objections:    client.common_objections    ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="What makes you different" description="Your assistant leads with these when convincing a customer to book." />
        <div className="space-y-4">
          <Field label="Unique selling point" hint="What do you do better than competitors?">
            <Textarea value={form.unique_selling_point} onChange={set("unique_selling_point")} rows={3} placeholder="e.g. Same-day callouts, 10-year warranty, ECSA registered" />
          </Field>
          <Field label="Guarantees or warranties">
            <Textarea value={form.guarantees} onChange={set("guarantees")} rows={3} placeholder="e.g. 12-month workmanship guarantee" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Handle objections" description="Teach your assistant how to respond when customers push back." />
        <div className="space-y-4">
          <Field label="Questions customers often ask">
            <Textarea value={form.common_questions} onChange={set("common_questions")} rows={4} placeholder={"e.g.\nDo you work weekends?\nHow long does a DB upgrade take?"} />
          </Field>
          <Field label="Objections customers raise">
            <Textarea value={form.common_objections} onChange={set("common_objections")} rows={4} placeholder={"e.g.\n'Too expensive' → mention quality and warranty"} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          loading={saving}
          icon={<Save className="w-4 h-4" />}
          onClick={async () => { setSaving(true); await save(form as Partial<Client>); setSaving(false); }}
        >
          Save edge
        </Button>
      </div>
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles,
  Building2,
  Wrench,
  DollarSign,
  Clock,
  Star,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRADES = [
  "Electrician", "Plumber", "Roofer", "Solar Installer", "Pest Control",
  "Aircon / HVAC", "Pool Cleaning", "Landscaper", "Garage Doors", "Security", "Other",
];

const AFTER_HOURS_OPTS = ["Yes", "No", "Depends on the job"];
const CHARGE_OPTS = ["Call-out fee + labour", "Per job quote", "Hourly rate", "Mix of the above"];
const FREE_QUOTE_OPTS = ["Yes", "No", "Only for big jobs"];
const PAYMENT_METHOD_OPTS = ["Cash", "EFT / Bank transfer", "Card machine", "All of the above"];
const PAYMENT_TERM_OPTS = [
  "Full payment upfront",
  "50% deposit, 50% on completion",
  "Full payment on completion",
  "30-day invoice (commercial clients only)",
];
const BOOKING_PREF_OPTS = ["WhatsApp", "Call", "Either works"];

const TONE_OPTS = [
  {
    value: "friendly_casual",
    label: "Friendly & Casual",
    description: "Warm, approachable, everyday language. Great for residential clients.",
    example: '"Hey! Sure thing, we can sort that for you. Let me check availability..."',
  },
  {
    value: "professional_formal",
    label: "Professional & Formal",
    description: "Precise, respectful, no small talk. Ideal for commercial work.",
    example: '"Good day. Thank you for your enquiry. I would be happy to assist."',
  },
  {
    value: "warm_empathetic",
    label: "Warm & Empathetic",
    description: "Caring and reassuring. Perfect for emergencies or big expenses.",
    example: '"I completely understand — let\'s get this sorted for you right away."',
  },
  {
    value: "direct_efficient",
    label: "Direct & Efficient",
    description: "No fluff. Quick answers, straight to the booking.",
    example: '"Call-out: R450. Available tomorrow 8am. Book now?"',
  },
];

const LANGUAGE_OPTS = [
  "English only", "English & Afrikaans", "English & Zulu",
  "English & Sotho", "Match the customer's language",
];

const RESPONSE_STYLE_OPTS = [
  { value: "brief", label: "Brief & punchy", description: "Short answers, 1–3 sentences max." },
  { value: "balanced", label: "Balanced", description: "Helpful detail without overwhelming." },
  { value: "detailed", label: "Detailed & thorough", description: "Full explanations, covers edge cases." },
];

const ESCALATION_OPTS = [
  "Customer asks to speak to a human",
  "Customer is unhappy or complaining",
  "Job is over R10,000",
  "Customer mentions legal or insurance",
  "Any of the above",
];

const STEPS = [
  { title: "Your Business", subtitle: "Who you are and where you operate", icon: Building2 },
  { title: "Your Services", subtitle: "What you do and what you don't", icon: Wrench },
  { title: "Pricing & Payment", subtitle: "Help the AI quote accurately", icon: DollarSign },
  { title: "Availability", subtitle: "When and how you work", icon: Clock },
  { title: "Your Edge", subtitle: "Why customers should choose you", icon: Star },
  { title: "AI Personality", subtitle: "How your assistant speaks to customers", icon: Bot },
];

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface FormData {
  business_name: string; owner_name: string; trade: string; areas: string;
  years_in_business: string; certifications: string; brands_used: string; team_size: string;
  services_offered: string; services_excluded: string; after_hours: string; emergency_response: string;
  charge_type: string; callout_fee: string; example_prices: string; minimum_job: string;
  free_quotes: string; payment_methods: string; payment_terms: string;
  working_hours: string; booking_lead_time: string; booking_preference: string;
  response_time: string; whatsapp_number: string; google_calendar_email: string;
  unique_selling_point: string; guarantees: string; common_questions: string; common_objections: string;
  ai_tone: string; ai_language: string; ai_response_style: string; ai_greeting: string;
  ai_escalation_triggers: string; ai_escalation_custom: string;
  ai_unhappy_customer: string; ai_always_do: string; ai_never_say: string; ai_sign_off: string;
}

const empty: FormData = {
  business_name: "", owner_name: "", trade: "", areas: "",
  years_in_business: "", certifications: "", brands_used: "", team_size: "",
  services_offered: "", services_excluded: "", after_hours: "", emergency_response: "",
  charge_type: "", callout_fee: "", example_prices: "", minimum_job: "",
  free_quotes: "", payment_methods: "", payment_terms: "",
  working_hours: "", booking_lead_time: "", booking_preference: "",
  response_time: "", whatsapp_number: "", google_calendar_email: "",
  unique_selling_point: "", guarantees: "", common_questions: "", common_objections: "",
  ai_tone: "", ai_language: "", ai_response_style: "", ai_greeting: "",
  ai_escalation_triggers: "", ai_escalation_custom: "",
  ai_unhappy_customer: "", ai_always_do: "", ai_never_say: "", ai_sign_off: "",
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-small font-semibold text-fg mb-1.5">
      {children}
      {optional && <span className="text-tiny font-normal text-fg-muted">(optional)</span>}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-tiny text-fg-muted mt-1.5 leading-relaxed">{children}</p>;
}

function Field({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200 resize-y"
    />
  );
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200 cursor-pointer"
    >
      {placeholder && <option value="" className="bg-ink-900">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o} className="bg-ink-900">{o}</option>)}
    </select>
  );
}

function Pills({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o} type="button" onClick={() => onChange(o)}
          className={cn(
            "px-4 py-2.5 rounded-xl text-small font-medium border transition-all duration-200 cursor-pointer",
            value === o
              ? "bg-brand-soft border-brand/40 text-brand"
              : "bg-white/[0.03] border-line text-fg-muted hover:text-fg hover:border-line-strong"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function MultiPills({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]; separator?: string;
}) {
  const selected = value ? value.split("|").filter(Boolean) : [];
  const toggle = (o: string) => {
    const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o];
    onChange(next.join("|"));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o} type="button" onClick={() => toggle(o)}
          className={cn(
            "px-4 py-2.5 rounded-xl text-small font-medium border transition-all duration-200 cursor-pointer",
            selected.includes(o)
              ? "bg-brand-soft border-brand/40 text-brand"
              : "bg-white/[0.03] border-line text-fg-muted hover:text-fg hover:border-line-strong"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ToneCard({ opt, selected, onSelect }: { opt: typeof TONE_OPTS[0]; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button" onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
        selected ? "border-brand bg-brand-soft" : "border-line bg-white/[0.02] hover:border-line-strong"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-fg text-small">{opt.label}</span>
        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", selected ? "border-brand bg-brand" : "border-line")}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <p className="text-tiny text-fg-muted mb-2 leading-relaxed">{opt.description}</p>
      <p className="text-tiny text-brand bg-brand-soft rounded-lg px-3 py-2 italic leading-relaxed">{opt.example}</p>
    </button>
  );
}

function StyleCard({ opt, selected, onSelect }: { opt: typeof RESPONSE_STYLE_OPTS[0]; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button" onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
        selected ? "border-brand bg-brand-soft" : "border-line bg-white/[0.02] hover:border-line-strong"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-fg text-small">{opt.label}</span>
        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", selected ? "border-brand bg-brand" : "border-line")}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <p className="text-tiny text-fg-muted leading-relaxed">{opt.description}</p>
    </button>
  );
}

// ─── Build system prompt from form data ──────────────────────────────────────

function buildSystemPrompt(f: FormData): string {
  return `
BUSINESS PROFILE
================
Business: ${f.business_name}
Owner: ${f.owner_name}
Trade: ${f.trade}
Years in business: ${f.years_in_business}
Team size: ${f.team_size}

CREDENTIALS
-----------
${f.certifications || "Not specified"}
Brands used: ${f.brands_used || "Not specified"}

SERVICE AREAS
-------------
${f.areas}

SERVICES OFFERED
----------------
${f.services_offered}

SERVICES NOT OFFERED
--------------------
${f.services_excluded || "Not specified"}

EMERGENCY / AFTER-HOURS
-----------------------
After-hours callouts: ${f.after_hours}
Emergency response time: ${f.emergency_response || "Not specified"}

PRICING
-------
Charge type: ${f.charge_type}
Call-out fee: ${f.callout_fee || "None"}
Minimum job: ${f.minimum_job || "Not specified"}
Free quotes: ${f.free_quotes}
Payment methods: ${f.payment_methods}
Payment terms: ${f.payment_terms}

PRICE EXAMPLES
--------------
${f.example_prices}

AVAILABILITY
------------
Working hours: ${f.working_hours}
Booking lead time: ${f.booking_lead_time}
Booking preference: ${f.booking_preference}
Response time commitment: ${f.response_time}

TRUST & CREDIBILITY
-------------------
Guarantees: ${f.guarantees || "Not specified"}
What makes us different: ${f.unique_selling_point}

COMMON CUSTOMER QUESTIONS & ANSWERS
-------------------------------------
${f.common_questions}

COMMON OBJECTIONS & HOW TO HANDLE
-----------------------------------
${f.common_objections}

AI PERSONALITY SETTINGS
=======================
Tone: ${f.ai_tone}
Language: ${f.ai_language}
Response style: ${f.ai_response_style}
Custom greeting: ${f.ai_greeting || "Not set"}
Sign-off name: ${f.ai_sign_off || "Not set"}

ESCALATION RULES
----------------
${f.ai_escalation_triggers}
${f.ai_escalation_custom}

HANDLING UNHAPPY CUSTOMERS
---------------------------
${f.ai_unhappy_customer || "Be empathetic, acknowledge the issue, offer a solution or escalate."}

ALWAYS DO
---------
${f.ai_always_do || "Not specified"}

NEVER SAY
---------
${f.ai_never_say || "Not specified"}
`.trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const { client } = useClient();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    ...empty,
    business_name: client?.business_name ?? "",
    owner_name: client?.owner_name ?? "",
    trade: client?.trade ?? "",
    whatsapp_number: client?.whatsapp_number ?? "",
    google_calendar_email: client?.google_calendar_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormData) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const next = () => {
    setStep((s) => (s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setStep((s) => (s - 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.business_name.trim()) { setError("Business name is required."); return; }
    if (!form.whatsapp_number.trim()) { setError("WhatsApp number is required."); return; }

    setSaving(true);
    setError(null);

    const payload = {
      business_name: form.business_name,
      owner_name: form.owner_name,
      trade: form.trade.toLowerCase(),
      whatsapp_number: form.whatsapp_number,
      google_calendar_id: form.google_calendar_email,
      service_areas: form.areas.split(",").map((s) => s.trim()).filter(Boolean),
      system_prompt: buildSystemPrompt(form),
      // individual fields
      years_in_business: form.years_in_business,
      certifications: form.certifications,
      brands_used: form.brands_used,
      team_size: form.team_size,
      services_offered: form.services_offered,
      services_excluded: form.services_excluded,
      after_hours: form.after_hours,
      emergency_response: form.emergency_response,
      charge_type: form.charge_type,
      callout_fee: form.callout_fee,
      example_prices: form.example_prices,
      minimum_job: form.minimum_job,
      free_quotes: form.free_quotes,
      payment_methods: form.payment_methods,
      payment_terms: form.payment_terms,
      working_hours_text: form.working_hours,
      booking_lead_time: form.booking_lead_time,
      booking_preference: form.booking_preference,
      response_time: form.response_time,
      unique_selling_point: form.unique_selling_point,
      guarantees: form.guarantees,
      common_questions: form.common_questions,
      common_objections: form.common_objections,
      ai_tone: form.ai_tone,
      ai_language: form.ai_language,
      ai_response_style: form.ai_response_style,
      ai_greeting: form.ai_greeting,
      ai_escalation_triggers: form.ai_escalation_triggers,
      ai_escalation_custom: form.ai_escalation_custom,
      ai_unhappy_customer: form.ai_unhappy_customer,
      ai_always_do: form.ai_always_do,
      ai_never_say: form.ai_never_say,
      ai_sign_off: form.ai_sign_off,
      onboarding_complete: true,
    };

    let dbError;
    if (client?.id) {
      const res = await supabase.from("clients").update(payload).eq("id", client.id);
      dbError = res.error;
    } else {
      const res = await supabase.from("clients").insert([{ ...payload, status: "active" }]);
      dbError = res.error;
    }

    setSaving(false);
    if (dbError) {
      setError("Failed to save. Please try again.");
      return;
    }
    router.push("/dashboard");
  };

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-grad-brand flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-h1 text-fg">Connect your digital assistant</h1>
            <p className="text-small text-fg-muted mt-0.5">The more detail you give, the smarter your AI responds. Takes about 5 minutes.</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const active = step === n;
            const Icon = s.icon;
            return (
              <div
                key={n}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-tiny font-medium transition-all duration-200 shrink-0",
                  done ? "bg-brand-soft text-brand" : active ? "bg-white/[0.08] text-fg border border-line" : "text-fg-subtle"
                )}
              >
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <form onSubmit={step === 6 ? handleSubmit : (e) => e.preventDefault()}>
        <div className="panel !p-6 md:!p-8 space-y-6">

          <div className="mb-2">
            <h2 className="text-h2 text-fg">
              Step {step} of {STEPS.length}: {STEPS[step - 1].title}
            </h2>
            <p className="text-small text-fg-muted mt-0.5">{STEPS[step - 1].subtitle}</p>
          </div>

          {/* ── STEP 1: Business ── */}
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Business name" hint="The AI uses this name when greeting customers.">
                <Input value={form.business_name} onChange={set("business_name")} placeholder="e.g. Pete's Plumbing" />
              </Field>
              <Field label="Your name" optional hint="So we know who to contact.">
                <Input value={form.owner_name} onChange={set("owner_name")} placeholder="e.g. Pete Jacobs" />
              </Field>
              <Field label="Type of work">
                <SelectField value={form.trade} onChange={set("trade")} options={TRADES} placeholder="Select your trade" />
              </Field>
              <Field label="Cities and suburbs you cover" hint="The AI declines jobs outside these areas automatically.">
                <Input value={form.areas} onChange={set("areas")} placeholder="e.g. Sandton, Midrand, Fourways, Randburg" />
              </Field>
              <Field label="Years in business" optional>
                <Input value={form.years_in_business} onChange={set("years_in_business")} placeholder="e.g. 8 years" />
              </Field>
              <Field label="Licences & certifications" optional hint="The AI mentions these proactively to build trust.">
                <Textarea value={form.certifications} onChange={set("certifications")} placeholder={"One per line:\n- Wireman's licence\n- NHBRC registered"} rows={3} />
              </Field>
              <Field label="Brands or products you use" optional>
                <Input value={form.brands_used} onChange={set("brands_used")} placeholder="e.g. Defy, Bosch, Crabtree" />
              </Field>
              <Field label="Team size" optional>
                <Input value={form.team_size} onChange={set("team_size")} placeholder="e.g. Just me, or a team of 4" />
              </Field>
            </div>
          )}

          {/* ── STEP 2: Services ── */}
          {step === 2 && (
            <div className="space-y-5">
              <Field label="Every service you offer" hint="One per line — this is your AI's full menu.">
                <Textarea value={form.services_offered} onChange={set("services_offered")} placeholder={"- Geyser replacement\n- DB board upgrade\n- Certificate of Compliance\n- Solar installation"} rows={8} />
              </Field>
              <Field label="Jobs you don't take on" optional hint="Prevents the AI from promising work you won't do.">
                <Textarea value={form.services_excluded} onChange={set("services_excluded")} placeholder={"- No aircon work\n- No 3-phase industrial\n- No jobs outside Gauteng"} rows={4} />
              </Field>
              <Field label="Emergency or after-hours callouts?">
                <Pills value={form.after_hours} onChange={set("after_hours")} options={AFTER_HOURS_OPTS} />
              </Field>
              {(form.after_hours === "Yes" || form.after_hours === "Depends on the job") && (
                <Field label="Emergency response time" optional>
                  <Input value={form.emergency_response} onChange={set("emergency_response")} placeholder="e.g. Within 1–2 hours, R250 surcharge" />
                </Field>
              )}
            </div>
          )}

          {/* ── STEP 3: Pricing ── */}
          {step === 3 && (
            <div className="space-y-5">
              <Field label="How do you charge?">
                <Pills value={form.charge_type} onChange={set("charge_type")} options={CHARGE_OPTS} />
              </Field>
              <Field label="Call-out fee" optional>
                <Input value={form.callout_fee} onChange={set("callout_fee")} placeholder="e.g. R450, waived if you proceed" />
              </Field>
              <Field label="Example jobs with prices" hint="Give 5–10 real examples so the AI can quote accurately.">
                <Textarea value={form.example_prices} onChange={set("example_prices")} placeholder={"- Tap washer: R350\n- Geyser replacement 150L: from R3,500\n- DB board upgrade: from R5,500"} rows={7} />
              </Field>
              <Field label="Minimum job value" optional>
                <Input value={form.minimum_job} onChange={set("minimum_job")} placeholder="e.g. Minimum R500" />
              </Field>
              <Field label="Free quotes?">
                <Pills value={form.free_quotes} onChange={set("free_quotes")} options={FREE_QUOTE_OPTS} />
              </Field>
              <Field label="Payment methods" optional>
                <Pills value={form.payment_methods} onChange={set("payment_methods")} options={PAYMENT_METHOD_OPTS} />
              </Field>
              <Field label="Payment terms" optional>
                <MultiPills value={form.payment_terms} onChange={set("payment_terms")} options={PAYMENT_TERM_OPTS} />
              </Field>
            </div>
          )}

          {/* ── STEP 4: Availability ── */}
          {step === 4 && (
            <div className="space-y-5">
              <Field label="Working hours" hint="The AI only offers booking slots within these hours.">
                <Input value={form.working_hours} onChange={set("working_hours")} placeholder="e.g. Mon–Fri 7am–5pm, Sat 8am–1pm" />
              </Field>
              <Field label="How far in advance can customers book?" optional>
                <Input value={form.booking_lead_time} onChange={set("booking_lead_time")} placeholder="e.g. Same or next day for most jobs" />
              </Field>
              <Field label="How quickly do you follow up after a booking?" optional>
                <Input value={form.response_time} onChange={set("response_time")} placeholder="e.g. I call back within 30 minutes" />
              </Field>
              <Field label="How do customers prefer to confirm?">
                <Pills value={form.booking_preference} onChange={set("booking_preference")} options={BOOKING_PREF_OPTS} />
              </Field>
              <Field label="WhatsApp number" hint="Customers message this. Must be active on WhatsApp.">
                <Input value={form.whatsapp_number} onChange={set("whatsapp_number")} placeholder="+27 83 123 4567" type="tel" />
              </Field>
              <Field label="Google Calendar email" optional hint="Bookings go straight into this calendar.">
                <Input value={form.google_calendar_email} onChange={set("google_calendar_email")} placeholder="e.g. pete@gmail.com" type="email" />
              </Field>
            </div>
          )}

          {/* ── STEP 5: Edge ── */}
          {step === 5 && (
            <div className="space-y-5">
              <Field label="Why should a customer choose you?" hint="The AI uses this when customers say 'let me think about it'.">
                <Textarea value={form.unique_selling_point} onChange={set("unique_selling_point")} placeholder={"- 12 years certified\n- No hidden fees\n- 1-year workmanship guarantee\n- We arrive on time or call ahead"} rows={5} />
              </Field>
              <Field label="Guarantees or warranties" optional>
                <Textarea value={form.guarantees} onChange={set("guarantees")} placeholder={"- 1-year workmanship guarantee\n- Free callback within 30 days for same fault"} rows={3} />
              </Field>
              <Field label="Questions customers always ask" optional hint="The AI answers these instantly.">
                <Textarea value={form.common_questions} onChange={set("common_questions")} placeholder={"- Do you issue COC certificates?\n- Do you work weekends?\n- Are you fully certified?"} rows={5} />
              </Field>
              <Field label="Common objections and how to handle them" optional>
                <Textarea value={form.common_objections} onChange={set("common_objections")} placeholder={"- 'You're too expensive' → Our price includes a 1-year guarantee\n- 'Let me get another quote' → Availability fills fast, want me to pencil you in?"} rows={5} />
              </Field>
            </div>
          )}

          {/* ── STEP 6: AI Personality ── */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <FieldLabel>Tone of voice</FieldLabel>
                <div className="space-y-3 mt-1">
                  {TONE_OPTS.map((opt) => (
                    <ToneCard key={opt.value} opt={opt} selected={form.ai_tone === opt.value} onSelect={() => set("ai_tone")(opt.value)} />
                  ))}
                </div>
              </div>

              <Field label="Language">
                <div className="flex flex-wrap gap-2 mt-1">
                  {LANGUAGE_OPTS.map((o) => (
                    <button key={o} type="button" onClick={() => set("ai_language")(o)}
                      className={cn("px-4 py-2.5 rounded-xl text-small font-medium border transition-all duration-200 cursor-pointer",
                        form.ai_language === o ? "bg-brand-soft border-brand/40 text-brand" : "bg-white/[0.03] border-line text-fg-muted hover:text-fg"
                      )}
                    >{o}</button>
                  ))}
                </div>
              </Field>

              <div>
                <FieldLabel>Response style</FieldLabel>
                <div className="space-y-2 mt-1">
                  {RESPONSE_STYLE_OPTS.map((opt) => (
                    <StyleCard key={opt.value} opt={opt} selected={form.ai_response_style === opt.value} onSelect={() => set("ai_response_style")(opt.value)} />
                  ))}
                </div>
              </div>

              <Field label="Opening message for new customers" optional hint="The first thing your AI says. Keep it warm and human.">
                <Textarea value={form.ai_greeting} onChange={set("ai_greeting")} placeholder="e.g. Hi there! Thanks for reaching out to Pete's Plumbing. How can I help you today?" rows={2} />
              </Field>

              <Field label="AI sign-off name" optional>
                <Input value={form.ai_sign_off} onChange={set("ai_sign_off")} placeholder="e.g. Team at Pete's Plumbing" />
              </Field>

              <div>
                <FieldLabel optional>When should the AI hand off to you?</FieldLabel>
                <p className="text-tiny text-fg-muted mb-2">Select all that apply.</p>
                <div className="space-y-2">
                  {ESCALATION_OPTS.map((o) => {
                    const selected = form.ai_escalation_triggers.includes(o);
                    return (
                      <button key={o} type="button"
                        onClick={() => {
                          const current = form.ai_escalation_triggers ? form.ai_escalation_triggers.split("\n").filter(Boolean) : [];
                          const next = selected ? current.filter((x) => x !== o) : [...current, o];
                          set("ai_escalation_triggers")(next.join("\n"));
                        }}
                        className={cn("w-full text-left px-4 py-3 rounded-xl border text-small transition-all duration-200 cursor-pointer",
                          selected ? "border-brand bg-brand-soft text-fg font-medium" : "border-line bg-white/[0.02] text-fg-muted hover:text-fg hover:border-line-strong"
                        )}
                      >{o}</button>
                    );
                  })}
                </div>
              </div>

              <Field label="Handle unhappy customers" optional>
                <Textarea value={form.ai_unhappy_customer} onChange={set("ai_unhappy_customer")} placeholder="e.g. Acknowledge frustration, apologise, offer to have owner call back within 1 hour." rows={3} />
              </Field>
              <Field label="Rules the AI must always follow" optional>
                <Textarea value={form.ai_always_do} onChange={set("ai_always_do")} placeholder={"- Always mention our 1-year guarantee\n- Always ask which area before quoting"} rows={3} />
              </Field>
              <Field label="Things the AI must never say" optional>
                <Textarea value={form.ai_never_say} onChange={set("ai_never_say")} placeholder={"- Never mention competitor names\n- Never confirm same-day availability without checking"} rows={3} />
              </Field>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
                  <p className="text-danger text-small">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-5">
          {step > 1 ? (
            <button
              type="button" onClick={back}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-line text-fg-muted text-small font-medium hover:text-fg hover:border-line-strong transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : <div />}

          {step < 6 ? (
            <button
              type="button" onClick={next}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-brand text-white text-small font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-brand text-white text-small font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Finish setup"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, FormEvent, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  CheckCircle,
  Globe,
  Upload,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

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
    description: "Talks like a helpful mate. Warm, approachable, uses everyday language. Great for residential clients.",
    example: '"Hey! Sure thing, we can sort that for you 👍 Let me check availability..."',
  },
  {
    value: "professional_formal",
    label: "Professional & Formal",
    description: "Corporate tone. Precise, respectful, no small talk. Ideal for commercial and insurance work.",
    example: '"Good day. Thank you for your enquiry. I would be happy to assist you with that."',
  },
  {
    value: "warm_empathetic",
    label: "Warm & Empathetic",
    description: "Caring and reassuring. Perfect when customers are stressed about emergencies or big expenses.",
    example: '"I completely understand, a burst pipe is stressful. Let\'s get this sorted for you right away."',
  },
  {
    value: "direct_efficient",
    label: "Direct & Efficient",
    description: "No fluff. Quick answers, straight to the booking. Best for customers who just want a price and a time.",
    example: '"Call-out: R450. Geyser replacement: from R3,500. Available tomorrow 8am. Book now?"',
  },
];

const LANGUAGE_OPTS = [
  "English only",
  "English & Afrikaans",
  "English & Zulu",
  "English & Sotho",
  "Match the customer's language",
];

const RESPONSE_STYLE_OPTS = [
  {
    value: "brief",
    label: "Brief & punchy",
    description: "Short answers, gets to the point fast. 1–3 sentences max.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Enough detail to be helpful, not overwhelming. Most businesses use this.",
  },
  {
    value: "detailed",
    label: "Detailed & thorough",
    description: "Full explanations, covers edge cases. Good for high-value or complex services.",
  },
];

const ESCALATION_OPTS = [
  "Customer asks to speak to a human",
  "Customer is unhappy or complaining",
  "Job is over R10,000",
  "Customer mentions legal or insurance",
  "Any of the above",
  "Custom (I'll describe below)",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  business_name: string;
  owner_name: string;
  trade: string;
  areas: string;
  years_in_business: string;
  certifications: string;
  brands_used: string;
  services_offered: string;
  services_excluded: string;
  after_hours: string;
  emergency_response: string;
  charge_type: string;
  callout_fee: string;
  example_prices: string;
  minimum_job: string;
  free_quotes: string;
  payment_methods: string;
  payment_terms: string;
  working_hours: string;
  booking_lead_time: string;
  booking_preference: string;
  response_time: string;
  whatsapp_number: string;
  google_calendar_email: string;
  team_size: string;
  guarantees: string;
  unique_selling_point: string;
  common_questions: string;
  common_objections: string;
  // AI personality
  ai_tone: string;
  ai_language: string;
  ai_response_style: string;
  ai_greeting: string;
  ai_escalation_triggers: string;
  ai_escalation_custom: string;
  ai_unhappy_customer: string;
  ai_always_do: string;
  ai_never_say: string;
  ai_sign_off: string;
}

const empty: FormData = {
  business_name: "", owner_name: "", trade: "", areas: "", years_in_business: "",
  certifications: "", brands_used: "", services_offered: "", services_excluded: "",
  after_hours: "", emergency_response: "", charge_type: "", callout_fee: "",
  example_prices: "", minimum_job: "", free_quotes: "", payment_methods: "",
  payment_terms: "", working_hours: "", booking_lead_time: "", booking_preference: "",
  response_time: "", whatsapp_number: "", google_calendar_email: "", team_size: "",
  guarantees: "", unique_selling_point: "", common_questions: "", common_objections: "",
  ai_tone: "", ai_language: "", ai_response_style: "", ai_greeting: "",
  ai_escalation_triggers: "", ai_escalation_custom: "", ai_unhappy_customer: "",
  ai_always_do: "", ai_never_say: "", ai_sign_off: "",
};

const STEPS = [
  { title: "Your Business", subtitle: "Who you are and where you operate" },
  { title: "Your Services", subtitle: "What you do and what you don't" },
  { title: "Pricing & Payment", subtitle: "Help the AI quote accurately" },
  { title: "Availability & Booking", subtitle: "When and how you work" },
  { title: "Your Edge", subtitle: "Why customers should choose you" },
  { title: "AI Personality", subtitle: "How your assistant speaks to customers" },
];

type Step = 1 | 2 | 3 | 4 | 5 | 6;

// ─── Primitives ───────────────────────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-text-dark mb-1.5">
      {children}
      {optional && <span className="text-xs font-normal text-text-muted-dark">(optional)</span>}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-text-muted-dark mt-1.5 leading-relaxed">{children}</p>;
}

function Field({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label optional={optional}>{label}</Label>
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
      className="w-full border border-border-light rounded-xl px-4 py-3 text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200 placeholder:text-gray-400 text-sm"
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
      className="w-full border border-border-light rounded-xl px-4 py-3 text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200 placeholder:text-gray-400 resize-y text-sm"
    />
  );
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full border border-border-light rounded-xl px-4 py-3 text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200 cursor-pointer text-sm"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function RadioPills({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o} type="button" onClick={() => onChange(o)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer ${
            value === o
              ? "bg-accent text-white border-accent shadow-sm"
              : "bg-white text-text-dark border-border-light hover:border-accent/50 hover:bg-bg-subtle"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ToneCard({ opt, selected, onSelect }: {
  opt: typeof TONE_OPTS[0]; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button" onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        selected
          ? "border-accent bg-accent/5"
          : "border-border-light bg-white hover:border-accent/40 hover:bg-bg-subtle"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-text-dark text-sm">{opt.label}</span>
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? "border-accent bg-accent" : "border-border-light"
        }`}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <p className="text-xs text-text-muted-dark mb-2 leading-relaxed">{opt.description}</p>
      <p className="text-xs text-accent bg-accent/5 rounded-lg px-3 py-2 italic leading-relaxed">{opt.example}</p>
    </button>
  );
}

function StyleCard({ opt, selected, onSelect }: {
  opt: typeof RESPONSE_STYLE_OPTS[0]; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button" onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        selected
          ? "border-accent bg-accent/5"
          : "border-border-light bg-white hover:border-accent/40 hover:bg-bg-subtle"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-text-dark text-sm">{opt.label}</span>
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? "border-accent bg-accent" : "border-border-light"
        }`}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <p className="text-xs text-text-muted-dark leading-relaxed">{opt.description}</p>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GetStartedPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [autoFillDone, setAutoFillDone] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof FormData) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const applyExtracted = (data: Record<string, string>) => {
    setForm((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(data) as (keyof FormData)[]) {
        if (key in next && typeof data[key] === "string" && data[key].trim() !== "") {
          next[key] = data[key];
        }
      }
      return next;
    });
  };

  const runAutoFill = async (body: object) => {
    setAutoFilling(true);
    setAutoFillError(null);
    setAutoFillDone(false);
    try {
      const res = await fetch("/api/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Auto-fill failed.");
      applyExtracted(json.data);
      setAutoFillDone(true);
    } catch (e: unknown) {
      setAutoFillError(e instanceof Error ? e.message : "Could not auto-fill. Please fill in manually.");
    } finally {
      setAutoFilling(false);
    }
  };

  const handleAutoFillUrl = () => {
    if (!websiteUrl.trim()) return;
    runAutoFill({ url: websiteUrl.trim() });
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    if (!text.trim()) {
      setAutoFillError("Could not read this file. Try a .txt or .md file, or paste your content below.");
      return;
    }
    runAutoFill({ fileText: text });
  };

  const handlePasteAnalyse = () => {
    if (!pastedText.trim()) return;
    runAutoFill({ fileText: pastedText });
  };

  const buildSystemPrompt = () => {
    const f = form;
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

ESCALATION RULES (hand off to human when)
------------------------------------------
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
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.business_name.trim()) { setSubmitError("Business name is required."); return; }
    if (!form.whatsapp_number.trim()) { setSubmitError("WhatsApp number is required."); return; }
    if (!form.google_calendar_email.trim()) { setSubmitError("Google Calendar email is required."); return; }

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from("clients").insert([{
      business_name: form.business_name,
      owner_name: form.owner_name,
      trade: form.trade.toLowerCase(),
      whatsapp_number: form.whatsapp_number,
      google_calendar_id: form.google_calendar_email,
      system_prompt: buildSystemPrompt(),
      status: "pending_setup",
    }]);

    setSubmitting(false);

    if (error) {
      setSubmitError("Failed to save your details. Please try again.");
      return;
    }

    setSubmitted(true);
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-text-dark mb-4">You&apos;re in.</h1>
          <p className="text-text-muted-dark text-lg leading-relaxed mb-6">
            Your AI assistant will be live within 24–48 hours. We&apos;ll confirm on WhatsApp once it&apos;s ready.
          </p>
          <p className="text-sm text-text-muted-dark">
            Make sure your WhatsApp number ({form.whatsapp_number}) is active and receiving messages.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-subtle py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-block bg-accent/10 text-accent text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Free 7-Day Trial. No card required.
          </span>
          <h1 className="text-3xl font-bold text-text-dark mb-2">Set up your AI assistant</h1>
          <p className="text-text-muted-dark text-sm">
            The more detail you give, the smarter your AI responds. Takes about 5 minutes.
          </p>
        </div>

        {/* Auto-fill card */}
        <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="font-bold text-text-dark text-sm">Auto-fill from your website</p>
              <p className="text-xs text-text-muted-dark">AI reads your site and fills the form for you instantly</p>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark pointer-events-none" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAutoFillUrl()}
                placeholder="https://yourbusiness.co.za"
                className="w-full border border-border-light rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200 placeholder:text-gray-400"
              />
            </div>
            <button
              type="button"
              onClick={handleAutoFillUrl}
              disabled={autoFilling || !websiteUrl.trim()}
              className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
            >
              {autoFilling
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing...</>
                : <><ChevronRight className="w-4 h-4" /> Analyse</>
              }
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <div
              onClick={() => !autoFilling && fileRef.current?.click()}
              className={`flex-1 border-2 border-dashed border-border-light rounded-xl p-3 text-center transition-all duration-200 group ${autoFilling ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-accent/40 hover:bg-bg-subtle"}`}
            >
              <input
                ref={fileRef} type="file" accept=".txt,.md" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
              />
              <Upload className="w-4 h-4 text-text-muted-dark mx-auto mb-1 group-hover:text-accent transition-colors duration-200" />
              <p className="text-xs text-text-muted-dark font-medium">Upload a file</p>
              <p className="text-xs text-gray-400">.txt or .md</p>
            </div>
            <button
              type="button"
              onClick={() => setPasteMode(!pasteMode)}
              className={`flex-1 border-2 border-dashed rounded-xl p-3 text-center transition-all duration-200 cursor-pointer ${pasteMode ? "border-accent bg-accent/5" : "border-border-light hover:border-accent/40 hover:bg-bg-subtle"}`}
            >
              <div className="w-4 h-4 mx-auto mb-1 text-text-muted-dark font-mono text-base leading-none">📋</div>
              <p className="text-xs text-text-muted-dark font-medium">Paste your info</p>
              <p className="text-xs text-gray-400">Word doc, notes, etc</p>
            </button>
          </div>

          {pasteMode && (
            <div className="mb-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste anything here: your price list, services from your website, a Word document, old brochure text. The AI will extract and fill the form for you."
                rows={5}
                className="w-full border border-border-light rounded-xl px-4 py-3 text-sm text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200 placeholder:text-gray-400 resize-none mb-2"
              />
              <button
                type="button"
                onClick={handlePasteAnalyse}
                disabled={autoFilling || !pastedText.trim()}
                className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {autoFilling ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing...</> : <><Sparkles className="w-4 h-4" /> Analyse & Fill Form</>}
              </button>
            </div>
          )}

          {autoFillError && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-danger/5 rounded-xl border border-danger/20">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger leading-relaxed">{autoFillError}</p>
            </div>
          )}

          {autoFillDone && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-success/5 rounded-xl border border-success/20">
              <CheckCircle className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs text-success font-medium">
                Form pre-filled from your website. Review everything below and edit anything that&apos;s wrong.
              </p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 ${
                  done ? "bg-success text-white" : active ? "bg-accent text-white ring-4 ring-accent/20" : "bg-white border-2 border-border-light text-text-muted-dark"
                }`}>
                  {done ? "✓" : n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded transition-all duration-500 ${done ? "bg-success" : "bg-border-light"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-5">
          <h2 className="text-lg font-bold text-text-dark">
            Step {step} of {STEPS.length}: {STEPS[step - 1].title}
          </h2>
          <p className="text-text-muted-dark text-sm">{STEPS[step - 1].subtitle}</p>
        </div>

        <form onSubmit={step === 6 ? handleSubmit : (e) => e.preventDefault()}>
          <div className="bg-white rounded-2xl shadow-sm border border-border-light p-8 space-y-6">

            {/* ── STEP 1: Business ── */}
            {step === 1 && <>
              <Field label="Business name" hint="The AI will use this name when greeting customers and signing off messages.">
                <Input value={form.business_name} onChange={set("business_name")} placeholder="e.g. Pete's Plumbing" />
              </Field>

              <Field label="Your name" optional hint="So we know who to contact when setting up your assistant.">
                <Input value={form.owner_name} onChange={set("owner_name")} placeholder="e.g. Pete Jacobs" />
              </Field>

              <Field label="What type of work do you do?">
                <SelectField value={form.trade} onChange={set("trade")} options={TRADES} placeholder="Select your trade" />
              </Field>

              <Field
                label="Which cities and suburbs do you cover?"
                hint="List every area you're willing to travel to. The AI will automatically decline enquiries from outside these areas. No more wasted time quoting jobs you won't take."
              >
                <Input value={form.areas} onChange={set("areas")} placeholder="e.g. Sandton, Midrand, Fourways, Randburg, Centurion, Roodepoort" />
              </Field>

              <Field label="Years in business" optional hint="Builds credibility when customers ask how established you are.">
                <Input value={form.years_in_business} onChange={set("years_in_business")} placeholder="e.g. 8 years" />
              </Field>

              <Field
                label="Licences, certifications, or registrations you hold"
                optional
                hint="Customers frequently ask 'are you certified?' before booking. The AI will mention these proactively to build trust and close the deal faster."
              >
                <Textarea
                  value={form.certifications}
                  onChange={set("certifications")}
                  placeholder={"One per line:\n- Wireman's licence\n- Certificate of Compliance (COC) issuer\n- NHBRC registered\n- PIRB registered\n- SAPCA member"}
                  rows={4}
                />
              </Field>

              <Field
                label="Brands or products you install or recommend"
                optional
                hint="When customers ask 'what brand do you use?' or 'do you use quality parts?', the AI will answer with this."
              >
                <Input value={form.brands_used} onChange={set("brands_used")} placeholder="e.g. Defy, Bosch, Crabtree, Legrand, Franke, Geberit" />
              </Field>

              <Field label="How many people in your team?" optional hint="Helps the AI explain your capacity when customers ask how quickly you can come out.">
                <Input value={form.team_size} onChange={set("team_size")} placeholder="e.g. Just me, or a team of 4 qualified technicians" />
              </Field>
            </>}

            {/* ── STEP 2: Services ── */}
            {step === 2 && <>
              <Field
                label="List every service you offer"
                hint="This is your AI's full menu. It can only offer what's listed here. Add everything, even the small stuff. One service per line."
              >
                <Textarea
                  value={form.services_offered}
                  onChange={set("services_offered")}
                  placeholder={"One service per line:\n- Geyser replacement\n- DB board upgrade\n- Fault finding and diagnostics\n- Certificate of Compliance (COC)\n- Solar panel installation\n- Plug and light installation\n- Borehole pump installation\n- Prepaid meter installation"}
                  rows={8}
                />
              </Field>

              <Field
                label="What jobs do you NOT take on?"
                optional
                hint="Very important. This stops the AI from accidentally quoting or promising work you don't do. No wasted time quoting, no disappointed clients."
              >
                <Textarea
                  value={form.services_excluded}
                  onChange={set("services_excluded")}
                  placeholder={"e.g.\n- No aircon or HVAC work\n- No insurance claim repairs\n- No plumbing\n- No work outside Gauteng\n- No 3-phase industrial work\n- No appliance repairs"}
                  rows={4}
                />
              </Field>

              <Field label="Do you do emergency or after-hours callouts?" hint="The AI will offer this option to customers when they have urgent situations.">
                <RadioPills value={form.after_hours} onChange={set("after_hours")} options={AFTER_HOURS_OPTS} />
              </Field>

              {(form.after_hours === "Yes" || form.after_hours === "Depends on the job") && (
                <Field label="How quickly can you respond to an emergency?" optional hint="Give a realistic time so you don't over-promise.">
                  <Input
                    value={form.emergency_response}
                    onChange={set("emergency_response")}
                    placeholder="e.g. Within 1–2 hours in Johannesburg. After-hours surcharge of R250 applies."
                  />
                </Field>
              )}
            </>}

            {/* ── STEP 3: Pricing ── */}
            {step === 3 && <>
              <Field label="How do you charge?">
                <RadioPills value={form.charge_type} onChange={set("charge_type")} options={CHARGE_OPTS} />
              </Field>

              <Field label="Call-out fee" optional>
                <Input
                  value={form.callout_fee}
                  onChange={set("callout_fee")}
                  placeholder="e.g. R450 call-out fee, waived if you proceed with the repair"
                />
              </Field>

              <Field
                label="Example jobs with approximate prices"
                hint={`The AI uses these to give realistic ranges. It always says "from R..." so you're covered on variation. Give 5–10 examples.`}
              >
                <Textarea
                  value={form.example_prices}
                  onChange={set("example_prices")}
                  placeholder={"Give real examples:\n- Tap washer replacement: R350\n- Toilet cistern repair: R550–R800\n- Burst pipe (minor): from R900\n- Geyser replacement 150L: from R3,500 installed\n- DB board upgrade: from R5,500\n- Certificate of Compliance: from R1,200\n- Solar 5kW system: from R65,000"}
                  rows={8}
                />
              </Field>

              <Field label="Minimum job value" optional>
                <Input
                  value={form.minimum_job}
                  onChange={set("minimum_job")}
                  placeholder="e.g. Minimum R500. We don't do callouts under this amount."
                />
              </Field>

              <Field label="Free quotes?">
                <RadioPills value={form.free_quotes} onChange={set("free_quotes")} options={FREE_QUOTE_OPTS} />
              </Field>

              <Field label="Payment methods you accept" optional>
                <RadioPills value={form.payment_methods} onChange={set("payment_methods")} options={PAYMENT_METHOD_OPTS} />
              </Field>

              <Field label="Payment terms" optional hint="Select all that apply.">
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_TERM_OPTS.map((o) => {
                    const selected = form.payment_terms.includes(o);
                    return (
                      <button
                        key={o} type="button"
                        onClick={() => {
                          const current = form.payment_terms ? form.payment_terms.split("|").filter(Boolean) : [];
                          const next = selected ? current.filter((x) => x !== o) : [...current, o];
                          set("payment_terms")(next.join("|"));
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer ${
                          selected
                            ? "bg-accent text-white border-accent shadow-sm"
                            : "bg-white text-text-dark border-border-light hover:border-accent/50 hover:bg-bg-subtle"
                        }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>}

            {/* ── STEP 4: Availability ── */}
            {step === 4 && <>
              <Field label="Your working hours" hint="The AI will only offer booking slots within these hours.">
                <Input
                  value={form.working_hours}
                  onChange={set("working_hours")}
                  placeholder="e.g. Mon–Fri 7am–5pm, Sat 8am–1pm, closed Sundays and public holidays"
                />
              </Field>

              <Field
                label="How far in advance can customers book?"
                optional
                hint="Helps the AI set realistic expectations. If you're often booked up, say so."
              >
                <Input
                  value={form.booking_lead_time}
                  onChange={set("booking_lead_time")}
                  placeholder="e.g. Same day or next day for most jobs. Large installs need 3–5 days notice."
                />
              </Field>

              <Field
                label="After a booking is confirmed, how quickly do you personally follow up?"
                optional
                hint="The AI confirms the booking instantly. This is how fast you call or message the customer yourself."
              >
                <Input
                  value={form.response_time}
                  onChange={set("response_time")}
                  placeholder="e.g. I call back within 30 minutes to confirm the exact time"
                />
              </Field>

              <Field label="How do customers prefer to confirm their booking?">
                <RadioPills value={form.booking_preference} onChange={set("booking_preference")} options={BOOKING_PREF_OPTS} />
              </Field>

              <Field
                label="Your WhatsApp number"
                hint="Customers will message this number. Bookings and confirmations are sent here. Must be active on WhatsApp."
              >
                <Input value={form.whatsapp_number} onChange={set("whatsapp_number")} placeholder="e.g. 083 123 4567" type="tel" />
              </Field>

              <Field
                label="Your Google Calendar email address"
                hint="Every booking the AI makes will automatically appear in this calendar. Must be the Gmail address linked to Google Calendar."
              >
                <Input value={form.google_calendar_email} onChange={set("google_calendar_email")} placeholder="e.g. pete@gmail.com" type="email" />
              </Field>
            </>}

            {/* ── STEP 5: Edge ── */}
            {step === 5 && <>
              <Field
                label="Why should a customer choose you over the next guy?"
                hint="Be honest and specific. Generic answers like 'great service' don't work. The AI uses this when customers say 'let me think about it' or are comparing multiple businesses."
              >
                <Textarea
                  value={form.unique_selling_point}
                  onChange={set("unique_selling_point")}
                  placeholder={"e.g.\n- 12 years in business, all certified with Wireman's licences\n- We send a photo of the completed job with every invoice\n- No hidden fees. The price we quote is the price you pay\n- 1-year workmanship guarantee on everything we do\n- We arrive on time or we call ahead, always"}
                  rows={5}
                />
              </Field>

              <Field
                label="Do you offer any guarantees or warranties?"
                optional
                hint="Customers worried about quality love guarantees. The AI will bring these up when customers seem hesitant."
              >
                <Textarea
                  value={form.guarantees}
                  onChange={set("guarantees")}
                  placeholder={"e.g.\n- 1-year workmanship guarantee on all repairs\n- 5-year manufacturer warranty on new geysers\n- Free callback if the same fault occurs within 30 days"}
                  rows={3}
                />
              </Field>

              <Field
                label="What questions do customers almost always ask you?"
                optional
                hint="The AI will answer these instantly so they never slow down a booking. Think about the last 10 enquiries you got."
              >
                <Textarea
                  value={form.common_questions}
                  onChange={set("common_questions")}
                  placeholder={"One per line:\n- Do you issue certificates of compliance?\n- Do you service [specific area]?\n- How long does a geyser replacement take?\n- Do you work on weekends or public holidays?\n- Are you fully certified and registered?\n- Do you do insurance work or write reports?"}
                  rows={6}
                />
              </Field>

              <Field
                label="What do customers say when they don't book, and how do you handle it?"
                optional
                hint="This trains the AI to handle objections without losing the sale. Think about the excuses you hear most."
              >
                <Textarea
                  value={form.common_objections}
                  onChange={set("common_objections")}
                  placeholder={"Format: Objection → How to respond\n\n- 'You're too expensive' → Our price includes a 1-year guarantee. Cheap fixes often cost more in the long run.\n- 'Let me get another quote first' → Totally fine. Just note that our availability fills up quickly. Want me to pencil in a slot while you decide?\n- 'Can you do it cheaper?' → We don't cut corners on safety, but we can talk through options when we assess the job."}
                  rows={6}
                />
              </Field>
            </>}

            {/* ── STEP 6: AI Personality ── */}
            {step === 6 && <>
              <div>
                <Label>Tone of voice</Label>
                <p className="text-xs text-text-muted-dark mb-3">How should your AI assistant sound when talking to customers?</p>
                <div className="space-y-3">
                  {TONE_OPTS.map((opt) => (
                    <ToneCard
                      key={opt.value}
                      opt={opt}
                      selected={form.ai_tone === opt.value}
                      onSelect={() => set("ai_tone")(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>Language your AI replies in</Label>
                <Hint>Most SA businesses choose English only or match the customer&apos;s language.</Hint>
                <div className="flex flex-wrap gap-2 mt-2">
                  {LANGUAGE_OPTS.map((o) => (
                    <button
                      key={o} type="button" onClick={() => set("ai_language")(o)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer ${
                        form.ai_language === o
                          ? "bg-accent text-white border-accent shadow-sm"
                          : "bg-white text-text-dark border-border-light hover:border-accent/50 hover:bg-bg-subtle"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Response style</Label>
                <div className="space-y-2 mt-1">
                  {RESPONSE_STYLE_OPTS.map((opt) => (
                    <StyleCard
                      key={opt.value}
                      opt={opt}
                      selected={form.ai_response_style === opt.value}
                      onSelect={() => set("ai_response_style")(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <Field
                label="Opening message for new customers"
                optional
                hint="The first thing your AI says when someone messages for the first time. Keep it warm and human. This is their first impression."
              >
                <Textarea
                  value={form.ai_greeting}
                  onChange={set("ai_greeting")}
                  placeholder="e.g. Hi there! Thanks for reaching out to Pete's Plumbing. How can I help you today?"
                  rows={2}
                />
              </Field>

              <Field
                label="What name should the AI sign off with?"
                optional
                hint={`e.g. "Team at Pete's Plumbing" or "Pete's Plumbing AI" or just "Pete's Plumbing"`}
              >
                <Input value={form.ai_sign_off} onChange={set("ai_sign_off")} placeholder="e.g. Team at Pete's Plumbing" />
              </Field>

              <div>
                <Label optional>When should the AI hand off to you (the human)?</Label>
                <Hint>Select all that apply. The AI will say: &quot;Let me get someone from the team to give you a call.&quot;</Hint>
                <div className="flex flex-col gap-2 mt-2">
                  {ESCALATION_OPTS.map((o) => {
                    const selected = form.ai_escalation_triggers.includes(o);
                    return (
                      <button
                        key={o} type="button"
                        onClick={() => {
                          const current = form.ai_escalation_triggers
                            ? form.ai_escalation_triggers.split("\n").filter(Boolean)
                            : [];
                          const next = selected
                            ? current.filter((x) => x !== o)
                            : [...current, o];
                          set("ai_escalation_triggers")(next.join("\n"));
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                          selected
                            ? "border-accent bg-accent/5 text-text-dark font-medium"
                            : "border-border-light bg-white text-text-dark hover:border-accent/40"
                        }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.ai_escalation_triggers.includes("Custom") && (
                <Field label="Describe your custom escalation rule">
                  <Textarea
                    value={form.ai_escalation_custom}
                    onChange={set("ai_escalation_custom")}
                    placeholder="e.g. Always escalate if the customer mentions a body corporate or strata management"
                    rows={2}
                  />
                </Field>
              )}

              <Field
                label="How should the AI handle unhappy or angry customers?"
                optional
              >
                <Textarea
                  value={form.ai_unhappy_customer}
                  onChange={set("ai_unhappy_customer")}
                  placeholder="e.g. Acknowledge the frustration first, apologise, offer to have the owner call them back within 1 hour. Never argue or make excuses."
                  rows={3}
                />
              </Field>

              <Field label="Rules the AI must always follow" optional hint="Specific behaviours you want the AI to do every single time.">
                <Textarea
                  value={form.ai_always_do}
                  onChange={set("ai_always_do")}
                  placeholder={"One rule per line:\n- Always mention our 1-year guarantee before the customer asks\n- Always ask which area the customer is in before quoting\n- Always end every reply with a question to keep the conversation moving\n- Always confirm the job type before discussing price"}
                  rows={4}
                />
              </Field>

              <Field label="Things the AI must never say or promise" optional hint="Hard limits. The AI will avoid these in every conversation.">
                <Textarea
                  value={form.ai_never_say}
                  onChange={set("ai_never_say")}
                  placeholder={"One rule per line:\n- Never mention competitor names\n- Never quote a fixed price for solar. Always say 'we need to assess first'\n- Never confirm same-day availability without checking with me first\n- Never say 'I don't know'. Always say 'let me find out for you'"}
                  rows={4}
                />
              </Field>

              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-danger/5 rounded-xl border border-danger/20">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{submitError}</p>
                </div>
              )}
            </>}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-5">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => { setStep((s) => (s - 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="px-6 py-3 rounded-xl border border-border-light text-text-dark text-sm font-medium hover:border-accent/50 hover:bg-bg-subtle transition-all duration-200 cursor-pointer"
              >
                Back
              </button>
            ) : <div />}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => { setStep((s) => (s + 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="px-8 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors duration-200 cursor-pointer flex items-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Start My Free Trial
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-xs text-text-muted-dark mt-6">
          Your details are stored securely and used only to configure your AI assistant.
        </p>
      </div>
    </div>
  );
}

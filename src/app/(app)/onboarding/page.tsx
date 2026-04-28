"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import {
  Building2, Wrench, Bot, MessageSquare, Calendar, CreditCard, Zap,
  Check, ChevronRight, ChevronLeft, Loader2, Phone, PlusCircle,
  AlertCircle, CheckCircle2, Lock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId = "business" | "services" | "personality" | "whatsapp" | "calendar" | "billing" | "launch";
type StepStatus = "not_started" | "in_progress" | "complete" | "skipped";

interface StepDef {
  id: StepId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  required: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClientData = Record<string, any>;

interface FormState {
  business_name: string;
  owner_name: string;
  trade: string;
  areas: string;
  services_offered: string;
  services_excluded: string;
  callout_fee: string;
  example_prices: string;
  charge_type: string;
  ai_tone: string;
  ai_language: string;
  ai_greeting: string;
  ai_sign_off: string;
  whatsapp_number: string;
  plan: string;
  billing_email: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  { id: "business",    title: "Your business",      subtitle: "Name, trade and service areas",    icon: Building2,    required: true  },
  { id: "services",    title: "Services & pricing",  subtitle: "What you do and what you charge",  icon: Wrench,       required: true  },
  { id: "personality", title: "AI personality",      subtitle: "Tone, language and greetings",     icon: Bot,          required: false },
  { id: "whatsapp",    title: "WhatsApp",            subtitle: "Connect your business number",     icon: MessageSquare,required: true  },
  { id: "calendar",    title: "Calendar",            subtitle: "Sync bookings automatically",      icon: Calendar,     required: false },
  { id: "billing",     title: "Billing",             subtitle: "Choose your plan",                 icon: CreditCard,   required: false },
  { id: "launch",      title: "Go live",             subtitle: "Activate your assistant",          icon: Zap,          required: false },
];

const REQUIRED_STEPS: StepId[] = ["business", "services", "whatsapp"];

const TRADES = [
  "Electrician", "Plumber", "Roofer", "Solar Installer", "Pest Control",
  "Aircon / HVAC", "Pool Cleaning", "Landscaper", "Garage Doors", "Security", "Other",
];

const CHARGE_OPTS = ["Call-out fee + labour", "Per job quote", "Hourly rate", "Mix of the above"];

const TONE_OPTS = [
  { value: "friendly_casual",     label: "Friendly & Casual",     description: "Warm, approachable, everyday language.",         example: '"Hey! Sure thing, we can sort that for you. Let me check availability…"' },
  { value: "professional_formal", label: "Professional & Formal",  description: "Precise, respectful. Ideal for commercial work.", example: '"Good day. Thank you for your enquiry. I would be happy to assist."' },
  { value: "warm_empathetic",     label: "Warm & Empathetic",     description: "Caring and reassuring. Perfect for emergencies.", example: '"I completely understand, let\'s get this sorted for you right away."' },
  { value: "direct_efficient",    label: "Direct & Efficient",    description: "No fluff. Quick answers, straight to the booking.", example: '"Call-out: R450. Available tomorrow 8am. Book now?"' },
];

const LANGUAGE_OPTS = [
  "English only", "English & Afrikaans", "English & Zulu",
  "English & Sotho", "Match the customer's language",
];

const PLAN_OPTS = [
  {
    id: "pay_per_booking",
    name: "Pay per booking",
    price: "8% per booking",
    description: "Only pay when your assistant books a job. No monthly fee. Min R150, max R5,000 per booking.",
    badge: "Most popular",
    disabled: false,
  },
  {
    id: "flat_monthly",
    name: "Flat monthly",
    price: "R999 / month",
    description: "Unlimited bookings. Great for businesses with high volume.",
    badge: "Coming soon",
    disabled: true,
  },
];

const EMPTY: FormState = {
  business_name: "", owner_name: "", trade: "", areas: "",
  services_offered: "", services_excluded: "", callout_fee: "",
  example_prices: "", charge_type: "",
  ai_tone: "", ai_language: "", ai_greeting: "", ai_sign_off: "",
  whatsapp_number: "", plan: "", billing_email: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStepStatus(id: StepId, client: ClientData | null): StepStatus {
  if (!client) return id === "business" ? "in_progress" : "not_started";
  switch (id) {
    case "business":    return client.business_name && client.trade ? "complete" : "in_progress";
    case "services":    return client.services_offered ? "complete" : "not_started";
    case "personality": return client.ai_tone ? "complete" : "not_started";
    case "whatsapp":    return client.whatsapp_number && client.whatsapp_number !== "new_number_requested" ? "complete" : "not_started";
    case "calendar":    return client.google_access_token ? "complete" : "skipped";
    case "billing":     return client.plan && client.plan !== "pay_per_booking" ? "complete" : "skipped";
    case "launch":      return client.go_live ? "complete" : "not_started";
  }
}

function buildSystemPrompt(f: FormState): string {
  return [
    `BUSINESS: ${f.business_name}`,
    f.owner_name ? `OWNER: ${f.owner_name}` : null,
    `TRADE: ${f.trade}`,
    f.areas ? `SERVICE AREAS: ${f.areas}` : null,
    f.services_offered ? `\nSERVICES OFFERED:\n${f.services_offered}` : null,
    f.services_excluded ? `\nSERVICES NOT OFFERED:\n${f.services_excluded}` : null,
    f.callout_fee ? `\nCALL-OUT FEE: ${f.callout_fee}` : null,
    f.example_prices ? `\nPRICE EXAMPLES:\n${f.example_prices}` : null,
    f.charge_type ? `CHARGE TYPE: ${f.charge_type}` : null,
    f.ai_tone ? `\nTONE: ${f.ai_tone}` : null,
    f.ai_language ? `LANGUAGE: ${f.ai_language}` : null,
    f.ai_greeting ? `\nGREETING: ${f.ai_greeting}` : null,
    f.ai_sign_off ? `SIGN-OFF: ${f.ai_sign_off}` : null,
  ].filter(Boolean).join("\n");
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Field({ label, hint, optional, children }: {
  label: string; hint?: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-fg mb-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-fg-muted">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-fg-muted mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function WInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-sm placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200"
    />
  );
}

function WTextarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-sm placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200 resize-y"
    />
  );
}

function WSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200 cursor-pointer"
    >
      {placeholder && <option value="" className="bg-[#0F0E0D]">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o} className="bg-[#0F0E0D]">{o}</option>)}
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
            "px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer",
            value === o
              ? "bg-brand-soft border-brand/40 text-brand"
              : "bg-white/[0.03] border-line text-fg-muted hover:text-fg hover:border-line-strong"
          )}
        >{o}</button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  // WhatsApp verify state
  const [waChoice, setWaChoice] = useState<"existing" | "new" | "">("");
  const [waCodeSent, setWaCodeSent] = useState(false);
  const [waCode, setWaCode] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waVerifying, setWaVerifying] = useState(false);
  const [waVerified, setWaVerified] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Load existing client data
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients").select("*").limit(1).maybeSingle();
      if (data) {
        if (data.go_live || data.onboarding_complete) {
          router.push("/dashboard");
          return;
        }
        setClient(data);
        setForm({
          business_name: data.business_name ?? "",
          owner_name: data.owner_name ?? "",
          trade: data.trade ?? "",
          areas: Array.isArray(data.service_areas) ? data.service_areas.join(", ") : "",
          services_offered: data.services_offered ?? "",
          services_excluded: data.services_excluded ?? "",
          callout_fee: data.callout_fee ?? "",
          example_prices: data.example_prices ?? "",
          charge_type: data.charge_type ?? "",
          ai_tone: data.ai_tone ?? "",
          ai_language: data.ai_language ?? "",
          ai_greeting: data.ai_greeting ?? "",
          ai_sign_off: data.ai_sign_off ?? "",
          whatsapp_number: data.whatsapp_number ?? "",
          plan: data.plan ?? "",
          billing_email: data.billing_email ?? "",
        });

        if (data.whatsapp_number && data.whatsapp_number !== "new_number_requested") {
          setWaChoice("existing");
          setWaVerified(true);
        } else if (data.whatsapp_number === "new_number_requested") {
          setWaChoice("new");
        }

        // Jump to first incomplete required step
        const firstBlocked = STEPS.findIndex((s) => {
          const status = getStepStatus(s.id, data);
          return s.required && status !== "complete";
        });
        if (firstBlocked >= 0) setStepIdx(firstBlocked);
      }
      setLoading(false);
    })();
  }, [router]);

  // Refresh client after Google Calendar OAuth return
  useEffect(() => {
    if (searchParams.get("calendarConnected") === "1") {
      supabase.from("clients").select("*").limit(1).maybeSingle().then(({ data }) => {
        if (data) setClient(data);
      });
    }
  }, [searchParams]);

  // Compute step statuses — merge persisted client with current unsaved form
  const mergedClient: ClientData = {
    ...client,
    business_name: form.business_name || client?.business_name,
    trade: form.trade || client?.trade,
    services_offered: form.services_offered || client?.services_offered,
    ai_tone: form.ai_tone || client?.ai_tone,
    whatsapp_number: form.whatsapp_number || client?.whatsapp_number,
  };

  const statuses = STEPS.reduce<Record<StepId, StepStatus>>((acc, s) => {
    if (s.id === "whatsapp") {
      const isComplete =
        waVerified ||
        (!!client?.whatsapp_number && client.whatsapp_number !== "new_number_requested") ||
        waChoice === "new";
      acc[s.id] = isComplete ? "complete" : waChoice ? "in_progress" : "not_started";
    } else {
      acc[s.id] = getStepStatus(s.id, mergedClient);
    }
    return acc;
  }, {} as Record<StepId, StepStatus>);

  const canGoLive = REQUIRED_STEPS.every((id) => statuses[id] === "complete");

  const upsertClient = async (payload: Record<string, unknown>) => {
    if (client?.id) {
      const { data, error: err } = await supabase
        .from("clients").update(payload).eq("id", client.id).select().single();
      if (err) throw err;
      if (data) setClient((prev) => ({ ...prev, ...data }));
    } else {
      const { data, error: err } = await supabase
        .from("clients").insert([{ ...payload, status: "trial" }]).select().single();
      if (err) throw err;
      if (data) setClient(data);
    }
  };

  const handleNext = async () => {
    setError(null);
    setSaving(true);
    try {
      const step = STEPS[stepIdx];
      let payload: Record<string, unknown> = {};

      if (step.id === "business") {
        if (!form.business_name.trim()) { setError("Business name is required."); setSaving(false); return; }
        if (!form.trade) { setError("Please select your trade."); setSaving(false); return; }
        payload = {
          business_name: form.business_name.trim(),
          owner_name: form.owner_name.trim() || null,
          trade: form.trade.toLowerCase(),
          service_areas: form.areas.split(",").map((s) => s.trim()).filter(Boolean),
        };
      } else if (step.id === "services") {
        if (!form.services_offered.trim()) { setError("Please list at least one service."); setSaving(false); return; }
        payload = {
          services_offered: form.services_offered.trim(),
          services_excluded: form.services_excluded.trim() || null,
          callout_fee: form.callout_fee.trim() || null,
          example_prices: form.example_prices.trim() || null,
          charge_type: form.charge_type || null,
        };
      } else if (step.id === "personality") {
        payload = {
          ai_tone: form.ai_tone || null,
          ai_language: form.ai_language || null,
          ai_greeting: form.ai_greeting.trim() || null,
          ai_sign_off: form.ai_sign_off.trim() || null,
        };
      } else if (step.id === "whatsapp") {
        if (!waVerified && waChoice !== "new") {
          setError("Please verify your WhatsApp number to continue.");
          setSaving(false);
          return;
        }
        payload = { whatsapp_number: waChoice === "new" ? "new_number_requested" : form.whatsapp_number };
      } else if (step.id === "billing" && form.plan) {
        payload = {
          plan: form.plan,
          billing_email: form.billing_email.trim() || null,
          billing_active: false,
        };
      }

      if (Object.keys(payload).length > 0) {
        await upsertClient(payload);
      }

      if (stepIdx < STEPS.length - 1) {
        setStepIdx(stepIdx + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoLive = async () => {
    if (!canGoLive) return;
    setError(null);
    setSaving(true);
    try {
      await upsertClient({
        go_live: true,
        onboarding_complete: true,
        system_prompt: buildSystemPrompt(form),
      });
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to activate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const sendWaCode = async () => {
    setWaError(null);
    setWaSending(true);
    const res = await fetch("/api/whatsapp/verify-send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.whatsapp_number }),
    });
    const j = await res.json();
    setWaSending(false);
    if (!res.ok) return setWaError(j.error ?? "Failed to send code");
    setWaCodeSent(true);
  };

  const checkWaCode = async () => {
    setWaError(null);
    setWaVerifying(true);
    const res = await fetch("/api/whatsapp/verify-check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.whatsapp_number, code: waCode, client_id: client?.id }),
    });
    const j = await res.json();
    setWaVerifying(false);
    if (!res.ok) return setWaError(j.error ?? "Incorrect code");
    setWaVerified(true);
  };

  const skipStep = () => {
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0F0E0D]">
        <div className="w-6 h-6 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
      </div>
    );
  }

  const currentStep = STEPS[stepIdx];
  const progress = (stepIdx / (STEPS.length - 1)) * 100;
  const isSkippable = !currentStep.required || currentStep.id === "calendar" || currentStep.id === "billing";

  return (
    <div className="min-h-dvh flex bg-[#0F0E0D]">

      {/* ── Left rail (desktop) ── */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-[#0A0A08] border-r border-line py-8 px-5">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-lg bg-brand/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-brand" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-fg tracking-tight">
            Qwikly<span className="text-brand">.</span>
          </span>
        </div>

        {/* Steps list */}
        <div className="flex-1 space-y-0.5">
          {STEPS.map((step, i) => {
            const status = statuses[step.id];
            const isActive = i === stepIdx;
            const canJump = status === "complete" || i <= stepIdx;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                disabled={!canJump}
                onClick={() => canJump && setStepIdx(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left",
                  isActive
                    ? "bg-white/[0.08] border border-line cursor-pointer"
                    : canJump
                    ? "hover:bg-white/[0.04] cursor-pointer"
                    : "opacity-40 cursor-default"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  status === "complete" ? "bg-success/20" : isActive ? "bg-brand/20" : "bg-white/[0.04]"
                )}>
                  {status === "complete"
                    ? <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
                    : <Icon className={cn("w-3.5 h-3.5", isActive ? "text-brand" : "text-fg-subtle")} />
                  }
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium leading-tight truncate",
                    isActive ? "text-fg" : status === "complete" ? "text-fg-muted" : "text-fg-subtle"
                  )}>
                    {step.title}
                  </p>
                  {isActive && (
                    <p className="text-xs text-fg-faint mt-0.5 leading-tight truncate">{step.subtitle}</p>
                  )}
                </div>

                {/* Required dot */}
                {step.required && status !== "complete" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand/60 shrink-0" />
                )}
                {!step.required && status === "not_started" && (
                  <span className="text-[10px] text-fg-faint shrink-0">opt</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 px-3 py-3 rounded-xl bg-white/[0.03] border border-line">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand/60 mt-1.5 shrink-0" />
            <p className="text-xs text-fg-muted leading-relaxed">
              Steps marked with a dot are required before going live.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-5 py-4 border-b border-line shrink-0">
          <span className="text-sm font-bold text-fg">
            Qwikly<span className="text-brand">.</span>
          </span>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-fg-muted shrink-0">{stepIdx + 1}/{STEPS.length}</span>
        </div>

        {/* Step content */}
        <div className="flex-1">
          <div className="max-w-xl mx-auto px-5 py-8 md:py-12">

            {/* Step header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-brand font-semibold uppercase tracking-widest">
                  Step {stepIdx + 1} of {STEPS.length}
                </span>
                {!currentStep.required && (
                  <span className="text-xs text-fg-subtle bg-white/[0.04] border border-line px-2 py-0.5 rounded-full">
                    optional
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-fg leading-tight">{currentStep.title}</h1>
              <p className="text-sm text-fg-muted mt-1">{currentStep.subtitle}</p>
            </div>

            {/* ─────────────── STEP CONTENT ─────────────── */}
            <div className="space-y-5">

              {/* STEP 1: Your business */}
              {currentStep.id === "business" && (
                <>
                  <Field label="Business name" hint="Your assistant greets customers using this name.">
                    <WInput value={form.business_name} onChange={set("business_name")} placeholder="e.g. Pete's Plumbing" />
                  </Field>
                  <Field label="Your name" optional>
                    <WInput value={form.owner_name} onChange={set("owner_name")} placeholder="e.g. Pete Jacobs" />
                  </Field>
                  <Field label="Type of work" hint="Your assistant only handles enquiries relevant to your trade.">
                    <WSelect value={form.trade} onChange={set("trade")} options={TRADES} placeholder="Select your trade" />
                  </Field>
                  <Field label="Cities and suburbs you cover" hint="Your assistant automatically declines jobs outside these areas.">
                    <WInput value={form.areas} onChange={set("areas")} placeholder="e.g. Sandton, Midrand, Fourways, Randburg" />
                  </Field>
                </>
              )}

              {/* STEP 2: Services & pricing */}
              {currentStep.id === "services" && (
                <>
                  <Field label="Every service you offer" hint="One per line. This becomes your assistant's service menu.">
                    <WTextarea
                      value={form.services_offered} onChange={set("services_offered")} rows={7}
                      placeholder={"- Geyser replacement\n- DB board upgrade\n- Certificate of Compliance\n- Fault finding"}
                    />
                  </Field>
                  <Field label="Jobs you don't take on" optional hint="Prevents your assistant from promising work you won't do.">
                    <WTextarea
                      value={form.services_excluded} onChange={set("services_excluded")} rows={3}
                      placeholder={"- No aircon work\n- No 3-phase industrial\n- No jobs outside Gauteng"}
                    />
                  </Field>
                  <Field label="How do you charge?" optional>
                    <Pills value={form.charge_type} onChange={set("charge_type")} options={CHARGE_OPTS} />
                  </Field>
                  <Field label="Call-out fee" optional>
                    <WInput value={form.callout_fee} onChange={set("callout_fee")} placeholder="e.g. R450, waived if you proceed" />
                  </Field>
                  <Field label="Example jobs with prices" optional hint="5–10 examples let your assistant quote accurately.">
                    <WTextarea
                      value={form.example_prices} onChange={set("example_prices")} rows={6}
                      placeholder={"- Tap washer: R350\n- Geyser 150L replacement: from R3,500\n- DB board upgrade: from R5,500"}
                    />
                  </Field>
                </>
              )}

              {/* STEP 3: AI personality */}
              {currentStep.id === "personality" && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-fg mb-3 block">Tone of voice</label>
                    <div className="space-y-3">
                      {TONE_OPTS.map((opt) => (
                        <button
                          key={opt.value} type="button" onClick={() => set("ai_tone")(opt.value)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                            form.ai_tone === opt.value
                              ? "border-brand bg-brand-soft"
                              : "border-line bg-white/[0.02] hover:border-line-strong"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-fg text-sm">{opt.label}</span>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                              form.ai_tone === opt.value ? "border-brand bg-brand" : "border-line"
                            )}>
                              {form.ai_tone === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className="text-xs text-fg-muted mb-2">{opt.description}</p>
                          <p className="text-xs text-brand bg-brand-soft rounded-lg px-3 py-1.5 italic leading-relaxed">
                            {opt.example}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Language" optional>
                    <Pills value={form.ai_language} onChange={set("ai_language")} options={LANGUAGE_OPTS} />
                  </Field>
                  <Field label="Opening message" optional hint="The first thing your assistant says to a new customer.">
                    <WTextarea
                      value={form.ai_greeting} onChange={set("ai_greeting")} rows={2}
                      placeholder="e.g. Hi! Thanks for reaching out to Pete's Plumbing. How can I help today?"
                    />
                  </Field>
                  <Field label="Sign-off name" optional>
                    <WInput value={form.ai_sign_off} onChange={set("ai_sign_off")} placeholder="e.g. Team at Pete's Plumbing" />
                  </Field>
                </>
              )}

              {/* STEP 4: WhatsApp */}
              {currentStep.id === "whatsapp" && (
                <div className="space-y-4">
                  {waVerified ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-fg">Number verified</p>
                        <p className="text-xs text-fg-muted mt-0.5">{form.whatsapp_number} is connected and ready.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-fg-muted leading-relaxed">
                        Customers message this number. Your digital assistant handles replies automatically from the Qwikly dashboard.
                      </p>

                      {/* Option A: use existing number */}
                      <button
                        type="button"
                        onClick={() => {
                          setWaChoice("existing");
                          if (form.whatsapp_number === "new_number_requested") set("whatsapp_number")("");
                        }}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                          waChoice === "existing" ? "border-brand bg-brand-soft" : "border-line bg-white/[0.02] hover:border-line-strong"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-fg-muted mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold text-fg text-sm">Use my current number</p>
                            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                              Your existing WhatsApp number moves to Qwikly. Same number, automated replies.
                            </p>
                            <p className="text-xs text-warning mt-1.5 leading-relaxed">
                              Note: WhatsApp on your phone will no longer receive messages for this number. You manage all replies from the dashboard.
                            </p>
                          </div>
                          <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5", waChoice === "existing" ? "border-brand bg-brand" : "border-line")}>
                            {waChoice === "existing" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>

                      {waChoice === "existing" && (
                        <div className="space-y-3">
                          <WInput value={form.whatsapp_number} onChange={set("whatsapp_number")} placeholder="+27 83 123 4567" type="tel" />
                          {!waCodeSent ? (
                            <button
                              type="button" disabled={!form.whatsapp_number || waSending} onClick={sendWaCode}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer disabled:opacity-40"
                            >
                              {waSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                              {waSending ? "Sending…" : "Send verification code"}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs text-fg-muted">Code sent to {form.whatsapp_number}. Enter it below:</p>
                              <WInput value={waCode} onChange={setWaCode} placeholder="6-digit code" />
                              <button
                                type="button" disabled={waCode.length < 4 || waVerifying} onClick={checkWaCode}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer disabled:opacity-40"
                              >
                                {waVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {waVerifying ? "Verifying…" : "Confirm code"}
                              </button>
                              <button type="button" onClick={sendWaCode} className="text-xs text-brand hover:underline cursor-pointer w-full text-center">
                                Resend code
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Option B: new number */}
                      <button
                        type="button"
                        onClick={() => { setWaChoice("new"); set("whatsapp_number")("new_number_requested"); }}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                          waChoice === "new" ? "border-brand bg-brand-soft" : "border-line bg-white/[0.02] hover:border-line-strong"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <PlusCircle className="w-4 h-4 text-fg-muted mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold text-fg text-sm">Get a new business number</p>
                            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                              Keep your personal WhatsApp. We&apos;ll set up a dedicated number for all business enquiries.
                            </p>
                            <p className="text-xs text-success mt-1.5">Personal and business kept separate.</p>
                          </div>
                          <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5", waChoice === "new" ? "border-brand bg-brand" : "border-line")}>
                            {waChoice === "new" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>

                      {waChoice === "new" && (
                        <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-line">
                          <p className="text-xs text-fg-muted leading-relaxed">
                            We&apos;ll contact you within 1 business day to arrange your new number. You can continue setting up in the meantime.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {waError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger/[0.08] border border-danger/25">
                      <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                      <p className="text-xs text-danger">{waError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Calendar */}
              {currentStep.id === "calendar" && (
                <div className="space-y-4">
                  {client?.google_access_token ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-fg">Google Calendar connected</p>
                        <p className="text-xs text-fg-muted mt-0.5">New bookings will sync automatically.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-white/[0.03] border border-line space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-fg-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-fg">Google Calendar</p>
                          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                            When a customer books, it appears in your calendar automatically. No double-booking.
                          </p>
                        </div>
                      </div>
                      <a
                        href={client?.id ? `/api/calendar/connect?clientId=${client.id}` : "#"}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl text-sm font-semibold transition-colors duration-200",
                          client?.id
                            ? "bg-brand text-white hover:bg-brand/90 cursor-pointer"
                            : "bg-white/[0.05] text-fg-muted pointer-events-none opacity-50"
                        )}
                      >
                        <Calendar className="w-4 h-4" />
                        Connect Google Calendar
                      </a>
                      {!client?.id && (
                        <p className="text-xs text-fg-muted text-center">Complete the earlier steps first.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: Billing */}
              {currentStep.id === "billing" && (
                <div className="space-y-4">
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Your first 14 days are free. No payment required to start.
                  </p>
                  <div className="space-y-3">
                    {PLAN_OPTS.map((plan) => (
                      <button
                        key={plan.id} type="button" disabled={plan.disabled}
                        onClick={() => !plan.disabled && set("plan")(plan.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                          plan.disabled
                            ? "border-line opacity-50 cursor-not-allowed"
                            : form.plan === plan.id
                            ? "border-brand bg-brand-soft cursor-pointer"
                            : "border-line bg-white/[0.02] hover:border-line-strong cursor-pointer"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-fg text-sm">{plan.name}</span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                plan.disabled ? "bg-white/[0.06] text-fg-subtle" : "bg-brand/20 text-brand"
                              )}>
                                {plan.badge}
                              </span>
                            </div>
                            <p className="text-xs text-brand font-semibold mb-1">{plan.price}</p>
                            <p className="text-xs text-fg-muted leading-relaxed">{plan.description}</p>
                          </div>
                          {!plan.disabled && (
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                              form.plan === plan.id ? "border-brand bg-brand" : "border-line"
                            )}>
                              {form.plan === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {form.plan && (
                    <Field label="Billing email" optional hint="Where we send your weekly invoice.">
                      <WInput value={form.billing_email} onChange={set("billing_email")} placeholder="billing@yourbusiness.co.za" type="email" />
                    </Field>
                  )}
                </div>
              )}

              {/* STEP 7: Launch */}
              {currentStep.id === "launch" && (
                <div className="space-y-5">
                  {/* Summary checklist */}
                  <div className="p-5 rounded-xl bg-white/[0.03] border border-line space-y-3">
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Setup summary</p>
                    {STEPS.filter((s) => s.id !== "launch").map((step) => {
                      const status = statuses[step.id];
                      const Icon = step.icon;
                      return (
                        <div key={step.id} className="flex items-center gap-3">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            status === "complete" ? "bg-success/20" : "bg-white/[0.04]"
                          )}>
                            {status === "complete"
                              ? <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
                              : <Icon className="w-3.5 h-3.5 text-fg-subtle" />
                            }
                          </div>
                          <span className={cn("text-sm flex-1", status === "complete" ? "text-fg" : "text-fg-subtle")}>
                            {step.title}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            status === "complete"
                              ? "bg-success/10 text-success"
                              : step.required
                              ? "bg-danger/10 text-danger"
                              : "bg-white/[0.04] text-fg-subtle"
                          )}>
                            {status === "complete" ? "Done" : step.required ? "Required" : "Skipped"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {canGoLive ? (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-fg">Ready to go live</p>
                          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                            All required steps are complete. Activate your digital assistant below.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-fg">Complete required steps first</p>
                          <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                            {REQUIRED_STEPS
                              .filter((id) => statuses[id] !== "complete")
                              .map((id) => STEPS.find((s) => s.id === id)?.title)
                              .join(", ")}{" "}
                            {REQUIRED_STEPS.filter((id) => statuses[id] !== "complete").length === 1
                              ? "still needs"
                              : "still need"} to be completed.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const idx = STEPS.findIndex((s) =>
                                s.required && statuses[s.id] !== "complete"
                              );
                              if (idx >= 0) setStepIdx(idx);
                            }}
                            className="mt-2 text-xs text-brand hover:underline cursor-pointer"
                          >
                            Go to first incomplete step
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-danger/[0.08] border border-danger/25">
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-line gap-4">
              {/* Back */}
              {stepIdx > 0 ? (
                <button
                  type="button"
                  onClick={() => { setStepIdx(stepIdx - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-line text-fg-muted text-sm font-medium hover:text-fg hover:border-line-strong transition-all duration-200 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {/* Skip (optional steps only) */}
                {isSkippable && currentStep.id !== "launch" && currentStep.id !== "personality" && (
                  <button
                    type="button" onClick={skipStep}
                    className="text-sm text-fg-subtle hover:text-fg-muted transition-colors duration-150 cursor-pointer px-2"
                  >
                    Skip
                  </button>
                )}

                {/* Primary CTA */}
                {currentStep.id === "launch" ? (
                  <button
                    type="button" disabled={!canGoLive || saving} onClick={handleGoLive}
                    className="flex items-center gap-2.5 px-8 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {saving ? "Activating…" : "Go live"}
                  </button>
                ) : (
                  <button
                    type="button" disabled={saving} onClick={handleNext}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer disabled:opacity-60"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving…" : "Continue"}
                    {!saving && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

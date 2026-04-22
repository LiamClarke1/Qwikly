"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, Check, Loader2, Sparkles,
  Building2, Wrench, DollarSign, Clock, Star, Bot,
  Globe, Upload, FileText, X, Zap, AlertCircle, ArrowRight, Clock3,
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
  "Full payment upfront", "50% deposit, 50% on completion",
  "Full payment on completion", "30-day invoice (commercial clients only)",
];
const BOOKING_PREF_OPTS = ["WhatsApp", "Call", "Either works"];
const TONE_OPTS = [
  { value: "friendly_casual", label: "Friendly & Casual", description: "Warm, approachable, everyday language. Great for residential clients.", example: '"Hey! Sure thing, we can sort that for you. Let me check availability..."' },
  { value: "professional_formal", label: "Professional & Formal", description: "Precise, respectful, no small talk. Ideal for commercial work.", example: '"Good day. Thank you for your enquiry. I would be happy to assist."' },
  { value: "warm_empathetic", label: "Warm & Empathetic", description: "Caring and reassuring. Perfect for emergencies or big expenses.", example: '"I completely understand, let\'s get this sorted for you right away."' },
  { value: "direct_efficient", label: "Direct & Efficient", description: "No fluff. Quick answers, straight to the booking.", example: '"Call-out: R450. Available tomorrow 8am. Book now?"' },
];
const LANGUAGE_OPTS = ["English only", "English & Afrikaans", "English & Zulu", "English & Sotho", "Match the customer's language"];
const RESPONSE_STYLE_OPTS = [
  { value: "brief", label: "Brief & punchy", description: "Short answers, 1–3 sentences max." },
  { value: "balanced", label: "Balanced", description: "Helpful detail without overwhelming." },
  { value: "detailed", label: "Detailed & thorough", description: "Full explanations, covers edge cases." },
];
const ESCALATION_OPTS = [
  "Customer asks to speak to a human", "Customer is unhappy or complaining",
  "Job is over R10,000", "Customer mentions legal or insurance", "Any of the above",
];
const STEPS = [
  { title: "Your Business", subtitle: "Who you are and where you operate", icon: Building2 },
  { title: "Your Services", subtitle: "What you do and what you don't", icon: Wrench },
  { title: "Pricing & Payment", subtitle: "Help the AI quote accurately", icon: DollarSign },
  { title: "Availability", subtitle: "When and how you work", icon: Clock },
  { title: "Your Edge", subtitle: "Why customers should choose you", icon: Star },
  { title: "AI Personality", subtitle: "How your assistant speaks to customers", icon: Bot },
];

const LOADING_STAGES = [
  { msg: "Scanning your website pages...", pct: 12 },
  { msg: "Reading your services and pricing...", pct: 30 },
  { msg: "Extracting certifications and USPs...", pct: 52 },
  { msg: "Analysing availability and booking rules...", pct: 70 },
  { msg: "Building your AI profile...", pct: 88 },
  { msg: "Almost done...", pct: 96 },
];

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB per file
const ALLOWED_TYPES = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const ALLOWED_EXT = [".pdf", ".txt", ".doc", ".docx"];

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "intro" | "loading" | "done" | "wizard";
type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface UploadedFile { name: string; base64: string; mediaType: string; size: number; }
interface AutoFillResult { data: Record<string, string>; filledCount: number; highlights: string[]; }

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyAutoFill(data: Record<string, string>, base: FormData): { form: FormData; count: number } {
  const map: Record<string, keyof FormData> = {
    business_name: "business_name", owner_name: "owner_name", trade: "trade",
    areas: "areas", years_in_business: "years_in_business", certifications: "certifications",
    brands_used: "brands_used", team_size: "team_size", services_offered: "services_offered",
    services_excluded: "services_excluded", after_hours: "after_hours",
    emergency_response: "emergency_response", charge_type: "charge_type",
    callout_fee: "callout_fee", example_prices: "example_prices", minimum_job: "minimum_job",
    free_quotes: "free_quotes", payment_methods: "payment_methods", payment_terms: "payment_terms",
    working_hours: "working_hours", booking_lead_time: "booking_lead_time",
    response_time: "response_time", team_size2: "team_size",
    unique_selling_point: "unique_selling_point", guarantees: "guarantees",
    common_questions: "common_questions",
  };

  const next = { ...base };
  let count = 0;
  for (const [k, fk] of Object.entries(map)) {
    const v = data[k];
    if (v && v.trim()) { next[fk] = v.trim(); count++; }
  }
  return { form: next, count };
}

function buildHighlights(data: Record<string, string>): string[] {
  const out: string[] = [];
  if (data.business_name) out.push(`Business: ${data.business_name}`);
  if (data.trade) out.push(`Trade: ${data.trade}`);
  if (data.services_offered) {
    const lines = data.services_offered.split("\n").filter((l) => l.trim()).length;
    if (lines > 0) out.push(`${lines} service${lines > 1 ? "s" : ""} found`);
  }
  if (data.example_prices) {
    const lines = data.example_prices.split("\n").filter((l) => l.trim()).length;
    if (lines > 0) out.push(`${lines} price example${lines > 1 ? "s" : ""} found`);
  }
  if (data.areas) out.push(`Service areas: ${data.areas.split(",").slice(0, 3).join(", ")}${data.areas.split(",").length > 3 ? "…" : ""}`);
  if (data.certifications) out.push("Certifications detected");
  if (data.guarantees) out.push("Guarantees detected");
  if (data.unique_selling_point) out.push("Selling points found");
  return out.slice(0, 6);
}

function buildSystemPrompt(f: FormData): string {
  return `BUSINESS PROFILE\n================\nBusiness: ${f.business_name}\nOwner: ${f.owner_name}\nTrade: ${f.trade}\nYears in business: ${f.years_in_business}\nTeam size: ${f.team_size}\n\nCREDENTIALS\n-----------\n${f.certifications || "Not specified"}\nBrands used: ${f.brands_used || "Not specified"}\n\nSERVICE AREAS\n-------------\n${f.areas}\n\nSERVICES OFFERED\n----------------\n${f.services_offered}\n\nSERVICES NOT OFFERED\n--------------------\n${f.services_excluded || "Not specified"}\n\nEMERGENCY / AFTER-HOURS\n-----------------------\nAfter-hours callouts: ${f.after_hours}\nEmergency response time: ${f.emergency_response || "Not specified"}\n\nPRICING\n-------\nCharge type: ${f.charge_type}\nCall-out fee: ${f.callout_fee || "None"}\nMinimum job: ${f.minimum_job || "Not specified"}\nFree quotes: ${f.free_quotes}\nPayment methods: ${f.payment_methods}\nPayment terms: ${f.payment_terms}\n\nPRICE EXAMPLES\n--------------\n${f.example_prices}\n\nAVAILABILITY\n------------\nWorking hours: ${f.working_hours}\nBooking lead time: ${f.booking_lead_time}\nBooking preference: ${f.booking_preference}\nResponse time commitment: ${f.response_time}\n\nTRUST & CREDIBILITY\n-------------------\nGuarantees: ${f.guarantees || "Not specified"}\nWhat makes us different: ${f.unique_selling_point}\n\nCOMMON CUSTOMER QUESTIONS & ANSWERS\n-------------------------------------\n${f.common_questions}\n\nCOMMON OBJECTIONS & HOW TO HANDLE\n-----------------------------------\n${f.common_objections}\n\nAI PERSONALITY SETTINGS\n=======================\nTone: ${f.ai_tone}\nLanguage: ${f.ai_language}\nResponse style: ${f.ai_response_style}\nCustom greeting: ${f.ai_greeting || "Not set"}\nSign-off name: ${f.ai_sign_off || "Not set"}\n\nESCALATION RULES\n----------------\n${f.ai_escalation_triggers}\n${f.ai_escalation_custom}\n\nHANDLING UNHAPPY CUSTOMERS\n---------------------------\n${f.ai_unhappy_customer || "Be empathetic, acknowledge the issue, offer a solution or escalate."}\n\nALWAYS DO\n---------\n${f.ai_always_do || "Not specified"}\n\nNEVER SAY\n---------\n${f.ai_never_say || "Not specified"}`.trim();
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Field({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-small font-semibold text-fg mb-1.5">
        {label}
        {optional && <span className="text-tiny font-normal text-fg-muted">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-tiny text-fg-muted mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function WInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200"
    />
  );
}

function WTextarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200 resize-y"
    />
  );
}

function WSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200 cursor-pointer"
    >
      {placeholder && <option value="" className="bg-ink-900">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o} className="bg-ink-900">{o}</option>)}
    </select>
  );
}

function Pills({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn("px-4 py-2.5 rounded-xl text-small font-medium border transition-all duration-200 cursor-pointer",
            value === o ? "bg-brand-soft border-brand/40 text-brand" : "bg-white/[0.03] border-line text-fg-muted hover:text-fg hover:border-line-strong"
          )}
        >{o}</button>
      ))}
    </div>
  );
}

function MultiPills({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const selected = value ? value.split("|").filter(Boolean) : [];
  const toggle = (o: string) => {
    const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o];
    onChange(next.join("|"));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={cn("px-4 py-2.5 rounded-xl text-small font-medium border transition-all duration-200 cursor-pointer",
            selected.includes(o) ? "bg-brand-soft border-brand/40 text-brand" : "bg-white/[0.03] border-line text-fg-muted hover:text-fg hover:border-line-strong"
          )}
        >{o}</button>
      ))}
    </div>
  );
}

function ToneCard({ opt, selected, onSelect }: { opt: typeof TONE_OPTS[0]; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect}
      className={cn("w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
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
    <button type="button" onClick={onSelect}
      className={cn("w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
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

// ─── Intro View ───────────────────────────────────────────────────────────────

function IntroView({
  onAnalyse, onGoToWizard, form, set,
}: {
  onAnalyse: (url: string, files: UploadedFile[], pasteText: string) => void;
  onGoToWizard: (step?: Step) => void;
  form: FormData;
  set: (field: keyof FormData) => (value: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);

  const addFiles = useCallback(async (raw: FileList | File[]) => {
    setFileError(null);
    const next: UploadedFile[] = [...files];
    for (const file of Array.from(raw)) {
      if (next.length >= 4) { setFileError("Maximum 4 files allowed."); break; }
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
        setFileError(`${file.name}: unsupported format. Use PDF, TXT, DOC, or DOCX.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`${file.name}: file too large. Max 3 MB per file.`);
        continue;
      }
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      if (!next.find((f) => f.name === file.name)) {
        next.push({ name: file.name, base64, mediaType: file.type || "application/pdf", size: file.size });
      }
    }
    setFiles(next);
  }, [files]);

  const removeFile = (name: string) => setFiles(files.filter((f) => f.name !== name));

  const canAnalyse = url.trim() || files.length > 0 || pasteText.trim();

  const scrollToStep1 = () => {
    step1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="text-center pb-1">
        <div className="w-14 h-14 rounded-2xl bg-grad-brand flex items-center justify-center shadow-glow mx-auto mb-4">
          <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-h1 text-fg mb-2">Set up your digital assistant</h2>
        <p className="text-small text-fg-muted leading-relaxed max-w-md mx-auto">
          Auto-fill from your website in 30 seconds, or fill in the form below yourself.
        </p>
      </div>

      {/* BIG "Fill it in myself" — top, prominent */}
      <button
        type="button"
        onClick={scrollToStep1}
        className="w-full panel !p-5 flex items-center gap-4 hover:border-brand/30 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-line flex items-center justify-center shrink-0 group-hover:border-brand/30 transition-colors duration-200">
          <FileText className="w-5 h-5 text-fg-muted group-hover:text-brand transition-colors duration-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-fg">Fill it in myself</p>
          <p className="text-tiny text-fg-muted mt-0.5">No website? No problem. Scroll down and fill in your details manually.</p>
        </div>
        <ArrowRight className="w-4 h-4 text-fg-subtle group-hover:text-brand group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-line" />
        <span className="text-tiny text-fg-subtle px-1">or auto-fill from your website</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      {/* URL input */}
      <div className="panel !p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-brand" />
          <span className="text-small font-semibold text-fg">Your website</span>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.yourbusiness.co.za"
          className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200"
          onKeyDown={(e) => { if (e.key === "Enter" && canAnalyse) onAnalyse(url, files, pasteText); }}
        />
      </div>

      {/* File upload */}
      <div className="panel !p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-4 h-4 text-brand" />
          <span className="text-small font-semibold text-fg">Upload documents</span>
          <span className="text-tiny text-fg-muted">(optional)</span>
        </div>
        <p className="text-tiny text-fg-muted">Certificates, price lists, service menus, brochures. PDF, DOC, or TXT. Max 3 MB each.</p>

        {/* Drop zone */}
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
            dragging ? "border-brand bg-brand/[0.06]" : "border-line hover:border-line-strong hover:bg-white/[0.02]"
          )}
        >
          <Upload className="w-5 h-5 text-fg-subtle" />
          <span className="text-small text-fg-muted hidden sm:block">Drop files here or <span className="text-brand font-medium">browse</span></span>
          <span className="text-small text-brand font-medium sm:hidden">Tap to upload</span>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-line">
                <FileText className="w-4 h-4 text-brand shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-small text-fg truncate">{f.name}</p>
                  <p className="text-tiny text-fg-muted">{(f.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => removeFile(f.name)} aria-label="Remove file" className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-white/[0.05] transition-all duration-150 cursor-pointer shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {fileError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger/[0.08] border border-danger/25">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-tiny text-danger">{fileError}</p>
          </div>
        )}
      </div>

      {/* Paste option toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowPaste(!showPaste)}
          className="text-tiny text-brand hover:underline cursor-pointer transition-colors duration-150"
        >
          {showPaste ? "Hide text paste" : "Or paste text from your site / documents"}
        </button>

        {showPaste && (
          <div className="mt-3 panel !p-4">
            <p className="text-tiny text-fg-muted mb-2">Copy and paste text from your About or Services page, or from any document.</p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              placeholder="Paste text here..."
              className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-small placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200 resize-y"
            />
          </div>
        )}
      </div>

      {/* Analyse CTA */}
      <button
        type="button"
        disabled={!canAnalyse}
        onClick={() => onAnalyse(url, files, pasteText)}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-brand text-white text-small font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Zap className="w-4 h-4" />
        Analyse my business
      </button>

      {/* Step 1 inline — visible on the first page */}
      <div ref={step1Ref} className="pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-line" />
          <span className="text-tiny text-fg-subtle px-1">or fill in step 1 below</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        <div className="panel !p-6 space-y-5">
          <div>
            <p className="text-base font-semibold text-fg">Step 1 of 6: Your Business</p>
            <p className="text-tiny text-fg-muted mt-0.5">Start here if you don&apos;t have a website, or fill these in and use auto-fill to complete the rest.</p>
          </div>

          <Field label="Business name" hint="The AI uses this name when greeting customers.">
            <WInput value={form.business_name} onChange={set("business_name")} placeholder="e.g. Pete's Plumbing" />
          </Field>
          <Field label="Your name" optional hint="So we know who to contact.">
            <WInput value={form.owner_name} onChange={set("owner_name")} placeholder="e.g. Pete Jacobs" />
          </Field>
          <Field label="Type of work">
            <WSelect value={form.trade} onChange={set("trade")} options={TRADES} placeholder="Select your trade" />
          </Field>
          <Field label="Cities and suburbs you cover" hint="The AI declines jobs outside these areas automatically.">
            <WInput value={form.areas} onChange={set("areas")} placeholder="e.g. Sandton, Midrand, Fourways, Randburg" />
          </Field>
          <Field label="Years in business" optional>
            <WInput value={form.years_in_business} onChange={set("years_in_business")} placeholder="e.g. 8 years" />
          </Field>
          <Field label="Licences & certifications" optional hint="The AI mentions these proactively to build trust.">
            <WTextarea value={form.certifications} onChange={set("certifications")} placeholder={"One per line:\n- Wireman's licence\n- NHBRC registered"} rows={3} />
          </Field>
          <Field label="Brands or products you use" optional>
            <WInput value={form.brands_used} onChange={set("brands_used")} placeholder="e.g. Defy, Bosch, Crabtree" />
          </Field>
          <Field label="Team size" optional>
            <WInput value={form.team_size} onChange={set("team_size")} placeholder="e.g. Just me, or a team of 4" />
          </Field>

          <button
            type="button"
            onClick={() => onGoToWizard(2)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand text-white text-small font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer"
          >
            Continue to step 2
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Small "Fill it in myself" at bottom */}
      <div className="text-center pb-2">
        <button
          type="button"
          onClick={() => onGoToWizard(1)}
          className="inline-flex items-center gap-1.5 text-tiny text-fg-subtle hover:text-fg-muted transition-colors duration-150 cursor-pointer"
        >
          <ArrowRight className="w-3 h-3" />
          Skip to full setup wizard
        </button>
      </div>
    </div>
  );
}

// ─── Loading View ─────────────────────────────────────────────────────────────

function LoadingView({ stage, progress }: { stage: string; progress: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8 text-center">
      <div className="relative w-16 h-16">
        <div className="w-16 h-16 rounded-2xl bg-grad-brand flex items-center justify-center shadow-glow">
          <Sparkles className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <div className="absolute -inset-1 rounded-2xl border-2 border-brand/30 animate-ping opacity-50" />
      </div>

      <div>
        <h2 className="text-h2 text-fg mb-2">Analysing your business</h2>
        <p className="text-small text-fg-muted">{stage}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-tiny text-fg-subtle mt-2">{progress}% complete</p>
      </div>

      <p className="text-tiny text-fg-subtle max-w-xs leading-relaxed">
        We&apos;re scanning multiple pages of your site and extracting every detail we can find.
      </p>
    </div>
  );
}

// ─── Done View ────────────────────────────────────────────────────────────────

function DoneView({ result, onContinue }: { result: AutoFillResult; onContinue: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="w-14 h-14 rounded-2xl bg-success/20 border border-success/30 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-success" strokeWidth={2.5} />
        </div>
        <h2 className="text-h1 text-fg mb-1.5">
          {result.filledCount} detail{result.filledCount !== 1 ? "s" : ""} found
        </h2>
        <p className="text-small text-fg-muted">We&apos;ve pre-filled your profile. Review each step and make any changes.</p>
      </div>

      {result.highlights.length > 0 && (
        <div className="panel !p-4 text-left">
          <p className="text-tiny font-semibold text-fg-muted uppercase tracking-wide mb-3">What we found</p>
          <div className="space-y-2">
            {result.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="text-small text-fg">{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel !p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-soft flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <p className="text-small text-fg-muted leading-relaxed">
            Everything is editable. Go through each step below and confirm the details look right before finishing.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-brand text-white text-small font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer"
      >
        Review and finish setup
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Error View ───────────────────────────────────────────────────────────────

function ErrorView({ message, onRetry, onSkip }: { message: string; onRetry: () => void; onSkip: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="w-14 h-14 rounded-2xl bg-warning/20 border border-warning/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-warning" strokeWidth={2} />
        </div>
        <h2 className="text-h2 text-fg mb-1.5">Couldn&apos;t analyse your site</h2>
        <p className="text-small text-fg-muted leading-relaxed">{message}</p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button" onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-line text-fg text-small font-medium hover:border-line-strong transition-colors duration-200 cursor-pointer"
        >
          Try again
        </button>
        <button
          type="button" onClick={onSkip}
          className="text-small text-fg-muted hover:text-fg transition-colors duration-150 cursor-pointer"
        >
          Fill it in manually instead
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const { client } = useClient();

  const [view, setView] = useState<View>("intro");
  const [step, setStep] = useState<Step>(1);
  const [loadingStage, setLoadingStage] = useState(LOADING_STAGES[0].msg);
  const [loadingPct, setLoadingPct] = useState(0);
  const [autoFillResult, setAutoFillResult] = useState<AutoFillResult | null>(null);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [lastAnalyseArgs, setLastAnalyseArgs] = useState<{ url: string; files: UploadedFile[]; text: string } | null>(null);

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

  const next = () => { setStep((s) => (s + 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const back = () => { setStep((s) => (s - 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const runAnalyse = async (url: string, files: UploadedFile[], pasteText: string) => {
    setLastAnalyseArgs({ url, files, text: pasteText });
    setAutoFillError(null);
    setView("loading");
    setLoadingPct(0);
    setLoadingStage(LOADING_STAGES[0].msg);

    // Animate progress while waiting for API
    let stageIdx = 0;
    const interval = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, LOADING_STAGES.length - 1);
      setLoadingStage(LOADING_STAGES[stageIdx].msg);
      setLoadingPct(LOADING_STAGES[stageIdx].pct);
    }, 2000);

    try {
      const body: Record<string, unknown> = {};
      if (url.trim()) body.url = url.trim();
      if (files.length > 0) body.files = files.map(({ name, base64, mediaType }) => ({ name, base64, mediaType }));
      if (pasteText.trim() && !url.trim()) body.fileText = pasteText.trim();

      const res = await fetch("/api/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      clearInterval(interval);
      const json = await res.json();

      if (!res.ok || json.error) {
        setAutoFillError(json.error ?? "Something went wrong.");
        setView("error" as View);
        return;
      }

      const { form: filled, count } = applyAutoFill(json.data, form);
      const highlights = buildHighlights(json.data);

      setLoadingPct(100);
      setForm(filled);
      setAutoFillResult({ data: json.data, filledCount: count, highlights });

      // Brief pause at 100% before showing done
      setTimeout(() => setView("done"), 600);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setAutoFillError("Network error. Please check your connection and try again.");
      setView("error" as View);
    }
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
    if (dbError) { setError("Failed to save. Please try again."); return; }
    router.push("/dashboard");
  };

  const progressPct = view === "wizard" ? ((step - 1) / (STEPS.length - 1)) * 100 : 0;

  // ── Non-wizard views ──
  if (view === "intro") {
    return (
      <div className="max-w-lg mx-auto px-1 sm:px-0">
        {/* Skip banner */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-grad-brand flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-small font-semibold text-fg truncate">Connect your AI assistant</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 shrink-0 ml-3 px-3 py-1.5 rounded-lg border border-line text-tiny text-fg-muted hover:text-fg hover:border-line-strong transition-all duration-150 cursor-pointer"
          >
            <Clock3 className="w-3 h-3" />
            <span className="hidden xs:inline">Set up later</span>
            <span className="xs:hidden">Later</span>
          </Link>
        </div>
        <IntroView
          onAnalyse={runAnalyse}
          onGoToWizard={(s = 1) => { setStep(s as Step); setView("wizard"); }}
          form={form}
          set={set}
        />
      </div>
    );
  }

  if (view === "loading") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="panel !p-8">
          <LoadingView stage={loadingStage} progress={loadingPct} />
        </div>
      </div>
    );
  }

  if ((view as string) === "error") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="panel !p-8">
          <ErrorView
            message={autoFillError ?? "Something went wrong."}
            onRetry={() => { if (lastAnalyseArgs) runAnalyse(lastAnalyseArgs.url, lastAnalyseArgs.files, lastAnalyseArgs.text); else setView("intro"); }}
            onSkip={() => setView("wizard")}
          />
        </div>
      </div>
    );
  }

  if (view === "done" && autoFillResult) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="panel !p-8">
          <DoneView result={autoFillResult} onContinue={() => setView("wizard")} />
        </div>
      </div>
    );
  }

  // ── Wizard ──
  return (
    <div className="max-w-2xl mx-auto px-1 sm:px-0">
      <div className="mb-8">
        {/* Header row with set-up-later */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-grad-brand flex items-center justify-center shadow-glow shrink-0">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-h1 text-fg leading-tight">Connect your digital assistant</h1>
              <p className="text-small text-fg-muted mt-0.5">
                {autoFillResult ? "Review what we found. Edit anything." : "The more detail, the smarter your AI."}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg border border-line text-tiny text-fg-muted hover:text-fg hover:border-line-strong transition-all duration-150 cursor-pointer mt-1"
          >
            <Clock3 className="w-3 h-3" />
            <span className="hidden sm:inline">Set up later</span>
            <span className="sm:hidden">Later</span>
          </Link>
        </div>

        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const active = step === n;
            const Icon = s.icon;
            return (
              <div key={n} className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-tiny font-medium transition-all duration-200 shrink-0",
                done ? "bg-brand-soft text-brand" : active ? "bg-white/[0.08] text-fg border border-line" : "text-fg-subtle"
              )}>
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={step === 6 ? handleSubmit : (e) => e.preventDefault()}>
        <div className="panel !p-6 md:!p-8 space-y-6">
          <div className="mb-2">
            <h2 className="text-h2 text-fg">Step {step} of {STEPS.length}: {STEPS[step - 1].title}</h2>
            <p className="text-small text-fg-muted mt-0.5">{STEPS[step - 1].subtitle}</p>
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Business name" hint="The AI uses this name when greeting customers.">
                <WInput value={form.business_name} onChange={set("business_name")} placeholder="e.g. Pete's Plumbing" />
              </Field>
              <Field label="Your name" optional hint="So we know who to contact.">
                <WInput value={form.owner_name} onChange={set("owner_name")} placeholder="e.g. Pete Jacobs" />
              </Field>
              <Field label="Type of work">
                <WSelect value={form.trade} onChange={set("trade")} options={TRADES} placeholder="Select your trade" />
              </Field>
              <Field label="Cities and suburbs you cover" hint="The AI declines jobs outside these areas automatically.">
                <WInput value={form.areas} onChange={set("areas")} placeholder="e.g. Sandton, Midrand, Fourways, Randburg" />
              </Field>
              <Field label="Years in business" optional>
                <WInput value={form.years_in_business} onChange={set("years_in_business")} placeholder="e.g. 8 years" />
              </Field>
              <Field label="Licences & certifications" optional hint="The AI mentions these proactively to build trust.">
                <WTextarea value={form.certifications} onChange={set("certifications")} placeholder={"One per line:\n- Wireman's licence\n- NHBRC registered"} rows={3} />
              </Field>
              <Field label="Brands or products you use" optional>
                <WInput value={form.brands_used} onChange={set("brands_used")} placeholder="e.g. Defy, Bosch, Crabtree" />
              </Field>
              <Field label="Team size" optional>
                <WInput value={form.team_size} onChange={set("team_size")} placeholder="e.g. Just me, or a team of 4" />
              </Field>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <Field label="Every service you offer" hint="One per line. This is your AI's full menu.">
                <WTextarea value={form.services_offered} onChange={set("services_offered")} placeholder={"- Geyser replacement\n- DB board upgrade\n- Certificate of Compliance\n- Solar installation"} rows={8} />
              </Field>
              <Field label="Jobs you don't take on" optional hint="Prevents the AI from promising work you won't do.">
                <WTextarea value={form.services_excluded} onChange={set("services_excluded")} placeholder={"- No aircon work\n- No 3-phase industrial\n- No jobs outside Gauteng"} rows={4} />
              </Field>
              <Field label="Emergency or after-hours callouts?">
                <Pills value={form.after_hours} onChange={set("after_hours")} options={AFTER_HOURS_OPTS} />
              </Field>
              {(form.after_hours === "Yes" || form.after_hours === "Depends on the job") && (
                <Field label="Emergency response time" optional>
                  <WInput value={form.emergency_response} onChange={set("emergency_response")} placeholder="e.g. Within 1–2 hours, R250 surcharge" />
                </Field>
              )}
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <Field label="How do you charge?">
                <Pills value={form.charge_type} onChange={set("charge_type")} options={CHARGE_OPTS} />
              </Field>
              <Field label="Call-out fee" optional>
                <WInput value={form.callout_fee} onChange={set("callout_fee")} placeholder="e.g. R450, waived if you proceed" />
              </Field>
              <Field label="Example jobs with prices" hint="Give 5–10 real examples so the AI can quote accurately.">
                <WTextarea value={form.example_prices} onChange={set("example_prices")} placeholder={"- Tap washer: R350\n- Geyser replacement 150L: from R3,500\n- DB board upgrade: from R5,500"} rows={7} />
              </Field>
              <Field label="Minimum job value" optional>
                <WInput value={form.minimum_job} onChange={set("minimum_job")} placeholder="e.g. Minimum R500" />
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

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div className="space-y-5">
              <Field label="Working hours" hint="The AI only offers booking slots within these hours.">
                <WInput value={form.working_hours} onChange={set("working_hours")} placeholder="e.g. Mon–Fri 7am–5pm, Sat 8am–1pm" />
              </Field>
              <Field label="How far in advance can customers book?" optional>
                <WInput value={form.booking_lead_time} onChange={set("booking_lead_time")} placeholder="e.g. Same or next day for most jobs" />
              </Field>
              <Field label="How quickly do you follow up after a booking?" optional>
                <WInput value={form.response_time} onChange={set("response_time")} placeholder="e.g. I call back within 30 minutes" />
              </Field>
              <Field label="How do customers prefer to confirm?">
                <Pills value={form.booking_preference} onChange={set("booking_preference")} options={BOOKING_PREF_OPTS} />
              </Field>
              <Field label="WhatsApp number" hint="Customers message this. Must be active on WhatsApp.">
                <WInput value={form.whatsapp_number} onChange={set("whatsapp_number")} placeholder="+27 83 123 4567" type="tel" />
              </Field>
              <Field label="Google Calendar email" optional hint="Bookings go straight into this calendar.">
                <WInput value={form.google_calendar_email} onChange={set("google_calendar_email")} placeholder="e.g. pete@gmail.com" type="email" />
              </Field>
            </div>
          )}

          {/* ── STEP 5 ── */}
          {step === 5 && (
            <div className="space-y-5">
              <Field label="Why should a customer choose you?" hint="The AI uses this when customers say 'let me think about it'.">
                <WTextarea value={form.unique_selling_point} onChange={set("unique_selling_point")} placeholder={"- 12 years certified\n- No hidden fees\n- 1-year workmanship guarantee\n- We arrive on time or call ahead"} rows={5} />
              </Field>
              <Field label="Guarantees or warranties" optional>
                <WTextarea value={form.guarantees} onChange={set("guarantees")} placeholder={"- 1-year workmanship guarantee\n- Free callback within 30 days for same fault"} rows={3} />
              </Field>
              <Field label="Questions customers always ask" optional hint="The AI answers these instantly.">
                <WTextarea value={form.common_questions} onChange={set("common_questions")} placeholder={"- Do you issue COC certificates?\n- Do you work weekends?\n- Are you fully certified?"} rows={5} />
              </Field>
              <Field label="Common objections and how to handle them" optional>
                <WTextarea value={form.common_objections} onChange={set("common_objections")} placeholder={"- 'You're too expensive' → Our price includes a 1-year guarantee\n- 'Let me get another quote' → Availability fills fast, want me to pencil you in?"} rows={5} />
              </Field>
            </div>
          )}

          {/* ── STEP 6 ── */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-small font-semibold text-fg mb-1.5">Tone of voice</label>
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
                <label className="flex items-center gap-2 text-small font-semibold text-fg mb-1.5">Response style</label>
                <div className="space-y-2 mt-1">
                  {RESPONSE_STYLE_OPTS.map((opt) => (
                    <StyleCard key={opt.value} opt={opt} selected={form.ai_response_style === opt.value} onSelect={() => set("ai_response_style")(opt.value)} />
                  ))}
                </div>
              </div>
              <Field label="Opening message for new customers" optional hint="The first thing your AI says. Keep it warm and human.">
                <WTextarea value={form.ai_greeting} onChange={set("ai_greeting")} placeholder="e.g. Hi there! Thanks for reaching out to Pete's Plumbing. How can I help you today?" rows={2} />
              </Field>
              <Field label="AI sign-off name" optional>
                <WInput value={form.ai_sign_off} onChange={set("ai_sign_off")} placeholder="e.g. Team at Pete's Plumbing" />
              </Field>
              <div>
                <label className="flex items-center gap-2 text-small font-semibold text-fg mb-1.5">
                  When should the AI hand off to you?
                  <span className="text-tiny font-normal text-fg-muted">(optional)</span>
                </label>
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
                <WTextarea value={form.ai_unhappy_customer} onChange={set("ai_unhappy_customer")} placeholder="e.g. Acknowledge frustration, apologise, offer to have owner call back within 1 hour." rows={3} />
              </Field>
              <Field label="Rules the AI must always follow" optional>
                <WTextarea value={form.ai_always_do} onChange={set("ai_always_do")} placeholder={"- Always mention our 1-year guarantee\n- Always ask which area before quoting"} rows={3} />
              </Field>
              <Field label="Things the AI must never say" optional>
                <WTextarea value={form.ai_never_say} onChange={set("ai_never_say")} placeholder={"- Never mention competitor names\n- Never confirm same-day availability without checking"} rows={3} />
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
            <button type="button" onClick={back}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-line text-fg-muted text-small font-medium hover:text-fg hover:border-line-strong transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button type="button" onClick={() => setView("intro")}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-line text-fg-muted text-small font-medium hover:text-fg hover:border-line-strong transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back to start
            </button>
          )}

          {step < 6 ? (
            <button type="button" onClick={next}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-brand text-white text-small font-semibold hover:bg-brand/90 transition-colors duration-200 cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" disabled={saving}
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

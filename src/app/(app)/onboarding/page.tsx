"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import {
  Building2, Bot, BookOpen, Zap, Check, ChevronRight, ChevronLeft,
  Loader2, Upload, Link2, AlignLeft, HelpCircle, X, CheckCircle2,
  AlertCircle, Palette, Globe,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId = "brand" | "assistants" | "knowledge" | "launch";

interface KnowledgeSource {
  id: string;
  type: "paste" | "file" | "url" | "qa";
  label: string;
  status: "pending" | "processing" | "done" | "error";
  chunkCount?: number;
  error?: string;
}

interface FormState {
  business_name: string;
  logo_url: string;
  brand_primary: string;
  brand_secondary: string;
  website_url: string;
  industry: string;
  contact_email: string;
  timezone: string;
  currency: string;
  assistant_digital: boolean;
  assistant_platform: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: { id: StepId; title: string; subtitle: string; icon: React.ElementType }[] = [
  { id: "brand",      title: "Your business",   subtitle: "Name, brand and contact info",       icon: Building2 },
  { id: "assistants", title: "Your assistants",  subtitle: "Which ones do you want enabled",     icon: Bot },
  { id: "knowledge",  title: "Knowledge base",   subtitle: "What your assistants can draw from", icon: BookOpen },
  { id: "launch",     title: "Go live",          subtitle: "Activate your digital assistant",    icon: Zap },
];

const INDUSTRIES = [
  "Retail", "Food & Beverage", "Healthcare", "Legal", "Real Estate",
  "Finance", "Education", "Technology", "Home Services", "Hospitality",
  "Beauty & Wellness", "Automotive", "Other",
];

const TIMEZONES = [
  "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi", "Africa/Cairo",
  "Europe/London", "Europe/Amsterdam", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney",
];

const CURRENCIES = [
  "ZAR", "USD", "EUR", "GBP", "AED", "NGN", "KES", "GHS", "AUD", "CAD",
];

const EMPTY: FormState = {
  business_name: "", logo_url: "", brand_primary: "#D97706",
  brand_secondary: "#111827", website_url: "", industry: "",
  contact_email: "", timezone: "Africa/Johannesburg", currency: "ZAR",
  assistant_digital: true, assistant_platform: false,
};

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
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-sm placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors duration-200"
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

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string;
}) {
  return (
    <button
      type="button" onClick={() => onChange(!checked)}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
        checked ? "border-brand bg-brand-soft" : "border-line bg-white/[0.02] hover:border-line-strong"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
          checked ? "border-brand bg-brand" : "border-line"
        )}>
          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">{label}</p>
          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Source type selector ─────────────────────────────────────────────────────

type SourceMode = "none" | "paste" | "file" | "url" | "qa";

function SourceAdder({ onAdd }: { onAdd: (s: KnowledgeSource) => void }) {
  const [mode, setMode] = useState<SourceMode>("none");
  const [pasteText, setPasteText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [qaList, setQaList] = useState([{ question: "", answer: "" }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setMode("none"); setPasteText(""); setUrlInput(""); setQaList([{ question: "", answer: "" }]); setErr(null); };

  async function submitSource(
    type: "paste" | "file" | "url" | "qa",
    payload: Record<string, unknown>,
    label: string
  ) {
    setBusy(true); setErr(null);
    const placeholder: KnowledgeSource = { id: "pending-" + Date.now(), type, label, status: "processing" };
    onAdd(placeholder);

    const res = await fetch("/api/knowledge/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      onAdd({ ...placeholder, id: "error-" + Date.now(), status: "error", error: json.error ?? "Failed" });
      setErr(json.error ?? "Failed to process source.");
      return;
    }

    onAdd({ ...placeholder, id: json.sourceId, status: "done", chunkCount: json.chunkCount });
    reset();
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await submitSource("file", { fileBase64: base64, fileType: file.type, filename: file.name }, file.name);
    if (fileRef.current) fileRef.current.value = "";
  };

  const MODE_BTNS: { id: SourceMode; icon: React.ElementType; label: string }[] = [
    { id: "paste", icon: AlignLeft, label: "Paste text" },
    { id: "file",  icon: Upload,   label: "Upload file" },
    { id: "url",   icon: Link2,    label: "Website URL" },
    { id: "qa",    icon: HelpCircle, label: "Q&A pairs" },
  ];

  return (
    <div className="border border-line rounded-2xl p-4 bg-white/[0.02] space-y-4">
      <p className="text-xs text-fg-muted font-medium uppercase tracking-wide">Add a source</p>

      {/* Mode buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MODE_BTNS.map(({ id, icon: Icon, label }) => (
          <button
            key={id} type="button"
            onClick={() => setMode(mode === id ? "none" : id)}
            className={cn(
              "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer",
              mode === id
                ? "border-brand bg-brand-soft text-brand"
                : "border-line text-fg-muted hover:text-fg hover:border-line-strong"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Paste */}
      {mode === "paste" && (
        <div className="space-y-3">
          <textarea
            value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={6}
            placeholder="Paste your business information, FAQs, policies, or any text you want your assistant to know about…"
            className="w-full bg-white/[0.03] border border-line rounded-xl px-4 py-3 text-fg text-sm placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/60 transition-colors resize-y"
          />
          <button
            type="button" disabled={!pasteText.trim() || busy}
            onClick={() => submitSource("paste", { content: pasteText }, "Pasted text")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {busy ? "Processing…" : "Add text"}
          </button>
        </div>
      )}

      {/* File */}
      {mode === "file" && (
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFile} className="hidden" />
          <button
            type="button" disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-line text-fg-muted hover:border-brand/50 hover:text-fg transition-colors cursor-pointer"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span className="text-sm">{busy ? "Processing…" : "Click to upload PDF, DOCX, or TXT"}</span>
          </button>
          <p className="text-xs text-fg-faint text-center">Max 10 MB</p>
        </div>
      )}

      {/* URL */}
      {mode === "url" && (
        <div className="space-y-3">
          <WInput value={urlInput} onChange={setUrlInput} placeholder="https://yourbusiness.com" type="url" />
          <p className="text-xs text-fg-muted">We crawl your homepage and up to 5 key pages (services, pricing, about, FAQ, contact).</p>
          <button
            type="button" disabled={!urlInput.trim() || busy}
            onClick={() => submitSource("url", { url: urlInput }, urlInput)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {busy ? "Crawling…" : "Crawl website"}
          </button>
        </div>
      )}

      {/* Q&A */}
      {mode === "qa" && (
        <div className="space-y-3">
          {qaList.map((pair, i) => (
            <div key={i} className="space-y-2 p-3 rounded-xl bg-white/[0.03] border border-line">
              <input
                value={pair.question} onChange={(e) => setQaList((l) => l.map((p, j) => j === i ? { ...p, question: e.target.value } : p))}
                placeholder={`Question ${i + 1}`}
                className="w-full bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
              />
              <div className="h-px bg-line" />
              <textarea
                value={pair.answer} onChange={(e) => setQaList((l) => l.map((p, j) => j === i ? { ...p, answer: e.target.value } : p))}
                placeholder="Answer"
                rows={2}
                className="w-full bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none resize-none"
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button
              type="button" onClick={() => setQaList((l) => [...l, { question: "", answer: "" }])}
              className="text-xs text-brand hover:underline cursor-pointer"
            >+ Add another pair</button>
            <button
              type="button" disabled={qaList.every((p) => !p.question.trim() || !p.answer.trim()) || busy}
              onClick={() => submitSource("qa", { qa: qaList.filter((p) => p.question.trim() && p.answer.trim()) }, `${qaList.length} Q&A pairs`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {busy ? "Saving…" : "Add Q&A"}
            </button>
          </div>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger/[0.08] border border-danger/25">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{err}</p>
        </div>
      )}
    </div>
  );
}

// ─── Source list item ─────────────────────────────────────────────────────────

function SourceItem({ source, onRemove }: { source: KnowledgeSource; onRemove: () => void }) {
  const typeIcon: Record<string, React.ElementType> = {
    paste: AlignLeft, file: Upload, url: Link2, qa: HelpCircle,
  };
  const Icon = typeIcon[source.type] ?? AlignLeft;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-line">
      <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-fg-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-fg truncate">{source.label}</p>
        <p className="text-xs text-fg-faint mt-0.5">
          {source.status === "processing" && "Processing…"}
          {source.status === "done" && `${source.chunkCount ?? 0} chunks indexed`}
          {source.status === "error" && <span className="text-danger">{source.error}</span>}
        </p>
      </div>
      {source.status === "processing" && <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />}
      {source.status === "done" && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
      {(source.status === "done" || source.status === "error") && (
        <button
          type="button" onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-fg-faint hover:text-fg hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClientRow = Record<string, any>;

export default function OnboardingPage() {
  const router = useRouter();

  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(field: K) => (value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Load persisted state ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: clientData } = await supabase.from("clients").select("*").limit(1).maybeSingle();

      if (clientData) {
        if (clientData.onboarding_complete) { router.push("/dashboard"); return; }

        setClient(clientData);
        setForm({
          business_name: clientData.business_name ?? "",
          logo_url: clientData.logo_url ?? "",
          brand_primary: clientData.brand_primary ?? "#D97706",
          brand_secondary: clientData.brand_secondary ?? "#111827",
          website_url: clientData.website_url ?? "",
          industry: clientData.industry ?? "",
          contact_email: clientData.contact_email ?? "",
          timezone: clientData.timezone ?? "Africa/Johannesburg",
          currency: clientData.currency ?? "ZAR",
          assistant_digital: clientData.assistant_digital ?? true,
          assistant_platform: clientData.assistant_platform ?? false,
        });

        const savedStep = clientData.setup_step ?? 1;
        setStepIdx(Math.min(savedStep - 1, STEPS.length - 1));
      }

      // Load existing knowledge sources
      const sourcesRes = await fetch("/api/knowledge/process");
      if (sourcesRes.ok) {
        const { sources: existing } = await sourcesRes.json();
        setSources(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (existing ?? []).map((s: any) => ({
            id: s.id,
            type: s.type,
            label: s.original_filename ?? s.source_url ?? s.type,
            status: s.status,
            chunkCount: s.chunk_count,
          }))
        );
      }

      setLoading(false);
    })();
  }, [router]);

  const upsert = async (payload: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (client?.id) {
      const { data, error: err } = await supabase
        .from("clients").update(payload).eq("id", client.id).select().single();
      if (err) throw err;
      if (data) setClient((prev) => ({ ...prev, ...data }));
    } else {
      const { data, error: err } = await supabase
        .from("clients")
        .insert([{ ...payload, user_id: user.id, status: "trial" }])
        .select().single();
      if (err) throw err;
      if (data) setClient(data);
    }
  };

  // ── Logo upload ───────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("brand-assets").getPublicUrl(path);
      set("logo_url")(urlData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setLogoUploading(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNext = async () => {
    setError(null);
    setSaving(true);
    try {
      const step = STEPS[stepIdx];
      let payload: Record<string, unknown> = { setup_step: stepIdx + 2 };

      if (step.id === "brand") {
        if (!form.business_name.trim()) { setError("Business name is required."); setSaving(false); return; }
        payload = {
          ...payload,
          business_name: form.business_name.trim(),
          logo_url: form.logo_url || null,
          brand_primary: form.brand_primary,
          brand_secondary: form.brand_secondary,
          website_url: form.website_url.trim() || null,
          industry: form.industry || null,
          contact_email: form.contact_email.trim() || null,
          timezone: form.timezone,
          currency: form.currency,
        };
      } else if (step.id === "assistants") {
        if (!form.assistant_digital && !form.assistant_platform) {
          setError("Please enable at least one assistant."); setSaving(false); return;
        }
        payload = { ...payload, assistant_digital: form.assistant_digital, assistant_platform: form.assistant_platform };
      }

      await upsert(payload);
      setStepIdx(stepIdx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoLive = async () => {
    setSaving(true); setError(null);
    try {
      await upsert({ onboarding_complete: true, setup_step: STEPS.length });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addSource = (s: KnowledgeSource) => {
    setSources((prev) => {
      // Replace placeholder or pending entries with the real one
      const withoutPending = prev.filter((p) => !p.id.startsWith("pending-"));
      const idx = withoutPending.findIndex((p) => p.id === s.id);
      if (idx >= 0) {
        const next = [...withoutPending];
        next[idx] = s;
        return next;
      }
      return [...withoutPending, s];
    });
  };

  const removeSource = async (id: string) => {
    if (id.startsWith("error-")) { setSources((p) => p.filter((s) => s.id !== id)); return; }
    await fetch(`/api/knowledge/process?sourceId=${id}`, { method: "DELETE" });
    setSources((p) => p.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0F0E0D]">
        <div className="w-6 h-6 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
      </div>
    );
  }

  const currentStep = STEPS[stepIdx];
  const progress = ((stepIdx) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-dvh flex bg-[#0F0E0D]">

      {/* ── Left rail ── */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-[#0A0A08] border-r border-line py-8 px-5">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-lg bg-brand/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-brand" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-fg tracking-tight">Qwikly<span className="text-brand">.</span></span>
        </div>

        <div className="flex-1 space-y-0.5">
          {STEPS.map((step, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            const Icon = step.icon;
            return (
              <button
                key={step.id} type="button"
                disabled={i > stepIdx}
                onClick={() => i <= stepIdx && setStepIdx(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left",
                  active ? "bg-white/[0.08] border border-line" : done ? "hover:bg-white/[0.04] cursor-pointer" : "opacity-40 cursor-default"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  done ? "bg-success/20" : active ? "bg-brand/20" : "bg-white/[0.04]"
                )}>
                  {done
                    ? <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
                    : <Icon className={cn("w-3.5 h-3.5", active ? "text-brand" : "text-fg-subtle")} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium leading-tight truncate", active ? "text-fg" : done ? "text-fg-muted" : "text-fg-subtle")}>
                    {step.title}
                  </p>
                  {active && <p className="text-xs text-fg-faint mt-0.5 truncate">{step.subtitle}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-5 py-4 border-b border-line shrink-0">
          <span className="text-sm font-bold text-fg">Qwikly<span className="text-brand">.</span></span>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-fg-muted shrink-0">{stepIdx + 1}/{STEPS.length}</span>
        </div>

        {/* Step content */}
        <div className="max-w-xl mx-auto w-full px-5 py-8 md:py-12">

          {/* Header */}
          <div className="mb-8">
            <span className="text-xs text-brand font-semibold uppercase tracking-widest">Step {stepIdx + 1} of {STEPS.length}</span>
            <h1 className="text-2xl font-bold text-fg leading-tight mt-2">{currentStep.title}</h1>
            <p className="text-sm text-fg-muted mt-1">{currentStep.subtitle}</p>
          </div>

          {/* ─── Step: Brand ─────────────────────────────────────────────── */}
          {currentStep.id === "brand" && (
            <div className="space-y-5">
              <Field label="Business name">
                <WInput value={form.business_name} onChange={set("business_name")} placeholder="e.g. Acme Co." />
              </Field>

              <Field label="Logo" optional>
                <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <div className="flex items-center gap-3">
                  {form.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white/[0.05] border border-line" />
                  )}
                  <button
                    type="button" disabled={logoUploading}
                    onClick={() => logoRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line text-sm text-fg-muted hover:text-fg hover:border-line-strong transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {form.logo_url ? "Replace" : "Upload logo"}
                  </button>
                </div>
              </Field>

              <Field label="Brand colours" optional hint="These personalise your assistant's appearance.">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="color" value={form.brand_primary}
                      onChange={(e) => set("brand_primary")(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-line cursor-pointer bg-transparent"
                    />
                    <div>
                      <p className="text-xs font-medium text-fg">Primary</p>
                      <p className="text-xs text-fg-faint font-mono">{form.brand_primary}</p>
                    </div>
                  </div>
                  <Palette className="w-4 h-4 text-fg-faint" />
                  <div className="flex items-center gap-2">
                    <input
                      type="color" value={form.brand_secondary}
                      onChange={(e) => set("brand_secondary")(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-line cursor-pointer bg-transparent"
                    />
                    <div>
                      <p className="text-xs font-medium text-fg">Secondary</p>
                      <p className="text-xs text-fg-faint font-mono">{form.brand_secondary}</p>
                    </div>
                  </div>
                </div>
              </Field>

              <Field label="Website URL" optional hint="Used to auto-populate your knowledge base.">
                <WInput value={form.website_url} onChange={set("website_url")} placeholder="https://yourbusiness.com" type="url" />
              </Field>

              <Field label="Industry" optional>
                <WSelect value={form.industry} onChange={set("industry")} options={INDUSTRIES} placeholder="Select your industry" />
              </Field>

              <Field label="Contact email" optional hint="Where leads and escalations are forwarded.">
                <WInput value={form.contact_email} onChange={set("contact_email")} placeholder="hello@yourbusiness.com" type="email" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Time zone">
                  <WSelect value={form.timezone} onChange={set("timezone")} options={TIMEZONES} />
                </Field>
                <Field label="Currency">
                  <WSelect value={form.currency} onChange={set("currency")} options={CURRENCIES} />
                </Field>
              </div>
            </div>
          )}

          {/* ─── Step: Assistants ────────────────────────────────────────── */}
          {currentStep.id === "assistants" && (
            <div className="space-y-4">
              <p className="text-sm text-fg-muted leading-relaxed">
                Choose which assistants to enable. You can change this later from settings.
              </p>
              <Toggle
                checked={form.assistant_digital}
                onChange={set("assistant_digital")}
                label="Digital Assistant"
                description="Customer-facing. Handles enquiries, answers questions from your knowledge base, and captures leads when something falls outside its knowledge."
              />
              <Toggle
                checked={form.assistant_platform}
                onChange={set("assistant_platform")}
                label="Platform Assistant"
                description="Internal. Helps your team query your knowledge base, surface answers from your documents, and draft responses — without leaving the dashboard."
              />
            </div>
          )}

          {/* ─── Step: Knowledge ─────────────────────────────────────────── */}
          {currentStep.id === "knowledge" && (
            <div className="space-y-5">
              <p className="text-sm text-fg-muted leading-relaxed">
                Add the sources your assistants are allowed to draw from. They will only ever answer using this material.
              </p>

              {sources.length > 0 && (
                <div className="space-y-2">
                  {sources.map((s) => (
                    <SourceItem key={s.id} source={s} onRemove={() => removeSource(s.id)} />
                  ))}
                </div>
              )}

              <SourceAdder onAdd={addSource} />

              {sources.length === 0 && (
                <p className="text-xs text-fg-faint text-center pt-1">
                  You can skip this and add sources from the dashboard later.
                </p>
              )}
            </div>
          )}

          {/* ─── Step: Launch ────────────────────────────────────────────── */}
          {currentStep.id === "launch" && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-white/[0.03] border border-line space-y-3">
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Setup summary</p>

                {/* Brand */}
                <div className="flex items-start gap-3">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", form.business_name ? "bg-success/20" : "bg-white/[0.04]")}>
                    {form.business_name ? <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} /> : <Building2 className="w-3.5 h-3.5 text-fg-subtle" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-fg">{form.business_name || "Business name not set"}</p>
                    {form.industry && <p className="text-xs text-fg-muted">{form.industry} · {form.currency} · {form.timezone}</p>}
                  </div>
                </div>

                {/* Assistants */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-success" />
                  </div>
                  <p className="text-sm text-fg mt-1">
                    {[form.assistant_digital && "Digital", form.assistant_platform && "Platform"].filter(Boolean).join(" + ") || "No assistant"} assistant{form.assistant_digital && form.assistant_platform ? "s" : ""}
                  </p>
                </div>

                {/* Knowledge */}
                <div className="flex items-start gap-3">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", sources.length > 0 ? "bg-success/20" : "bg-white/[0.04]")}>
                    {sources.length > 0 ? <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} /> : <BookOpen className="w-3.5 h-3.5 text-fg-subtle" />}
                  </div>
                  <p className="text-sm text-fg mt-1">
                    {sources.filter((s) => s.status === "done").length} knowledge source{sources.filter((s) => s.status === "done").length !== 1 ? "s" : ""} indexed
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-fg">Ready to go live</p>
                    <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                      Your digital assistant will only answer from your knowledge base. You can refine it anytime from the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-danger/[0.08] border border-danger/25">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-line gap-4">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={() => { setStepIdx(stepIdx - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-line text-fg-muted text-sm font-medium hover:text-fg hover:border-line-strong transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              {currentStep.id === "knowledge" && (
                <button
                  type="button"
                  onClick={() => { setStepIdx(stepIdx + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-sm text-fg-subtle hover:text-fg-muted transition-colors cursor-pointer px-2"
                >
                  Skip for now
                </button>
              )}

              {currentStep.id === "launch" ? (
                <button
                  type="button" disabled={saving} onClick={handleGoLive}
                  className="flex items-center gap-2.5 px-8 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {saving ? "Activating…" : "Activate"}
                </button>
              ) : (
                <button
                  type="button" disabled={saving} onClick={handleNext}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors cursor-pointer disabled:opacity-60"
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
  );
}

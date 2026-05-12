"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, User, Mail, Phone, CreditCard,
  RefreshCw, CheckCircle2, Loader2, Eye, EyeOff, Lock,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Monthly and annual prices (annual = monthly × 12 × 0.85)
const PLAN_MONTHLY: Record<string, number> = {
  starter: 699,
  pro: 1799,
  business: 3999,
  enterprise: 7999,
};
const PLAN_ANNUAL_MONTHLY: Record<string, number> = {
  starter: Math.round(699 * 12 * 0.85 / 12),
  pro: Math.round(1799 * 12 * 0.85 / 12),
  business: Math.round(3999 * 12 * 0.85 / 12),
  enterprise: Math.round(7999 * 12 * 0.85 / 12),
};
const PLAN_ANNUAL_TOTAL: Record<string, number> = {
  starter: Math.round(699 * 12 * 0.85),
  pro: Math.round(1799 * 12 * 0.85),
  business: Math.round(3999 * 12 * 0.85),
  enterprise: Math.round(7999 * 12 * 0.85),
};

const PLANS = [
  { value: "starter",    label: "Starter",    sub: "20 leads/mo",  color: "text-blue-600" },
  { value: "pro",        label: "Pro",        sub: "50 leads/mo",  color: "text-violet-600" },
  { value: "business",   label: "Business",   sub: "200 leads/mo", color: "text-amber-600" },
  { value: "enterprise", label: "Enterprise", sub: "600+ leads/mo",color: "text-emerald-600" },
] as const;

type Plan = typeof PLANS[number]["value"];

interface Form {
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  plan: Plan;
  billing_cycle: "monthly" | "annual";
  password: string;
  note: string;
}

const EMPTY: Form = {
  business_name: "",
  owner_name: "",
  email: "",
  phone: "",
  plan: "starter",
  billing_cycle: "monthly",
  password: "",
  note: "",
};

function Field({
  label, icon: Icon, error, children,
}: {
  label: string;
  icon?: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
        {children}
      </div>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, icon, type = "text", disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20 focus:border-[#E85A2C]/40 transition-shadow",
        "disabled:opacity-60",
        icon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5",
      )}
    />
  );
}

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [newClientId, setNewClientId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function set<K extends keyof Form>(key: K, val: Form[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
    setServerError(null);
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.business_name.trim()) e.business_name = "Required";
    if (!form.owner_name.trim())    e.owner_name    = "Required";
    if (!form.email.trim())         e.email         = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.password.trim())      e.password      = "Required";
    else if (form.password.length < 8) e.password   = "Must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError(null);

    const res = await fetch("/api/admin/clients/provision", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        business_name: form.business_name.trim(),
        owner_name:    form.owner_name.trim(),
        email:         form.email.trim().toLowerCase(),
        phone:         form.phone.trim() || undefined,
        plan:          form.plan,
        billing_cycle: form.billing_cycle,
        password:      form.password,
        note:          form.note.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    setNewClientId(data.client_id);
    setDone(true);
  }

  const planCfg = PLANS.find(p => p.value === form.plan)!;
  const isAnnual = form.billing_cycle === "annual";
  const monthlyDisplay = isAnnual ? PLAN_ANNUAL_MONTHLY[form.plan] : PLAN_MONTHLY[form.plan];
  const priceLabel = form.plan === "enterprise"
    ? isAnnual ? `R${PLAN_ANNUAL_MONTHLY[form.plan].toLocaleString()}/mo (R${PLAN_ANNUAL_TOTAL[form.plan].toLocaleString()}/yr)` : "R7,999/mo"
    : isAnnual
      ? `R${monthlyDisplay.toLocaleString()}/mo · R${PLAN_ANNUAL_TOTAL[form.plan].toLocaleString()}/yr`
      : `R${PLAN_MONTHLY[form.plan].toLocaleString()}/mo`;

  if (done && newClientId) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-[22px] font-bold text-slate-900 mb-2">Client created</h2>
        <p className="text-[14px] text-slate-500 mb-2">
          <strong className="text-slate-800">{form.business_name}</strong> has been set up on the{" "}
          <strong className="text-slate-800">{planCfg.label}</strong> plan ({form.billing_cycle}).
        </p>
        <p className="text-[13px] text-slate-400 mb-8">
          A welcome email has been sent to <strong>{form.email}</strong>. The password you set is active, they can log in now and change it anytime from their settings.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/admin/clients/${newClientId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E85A2C] text-white text-[14px] font-semibold hover:bg-[#d04f25] transition-colors cursor-pointer"
          >
            View client profile
          </Link>
          <button
            onClick={() => { setForm(EMPTY); setDone(false); setNewClientId(null); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
        <h1 className="text-[26px] font-bold text-slate-900">Add new client</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Creates their account with a password you set. Sends them a welcome email. They can change their password from settings anytime.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Business details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <p className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" /> Business details
          </p>

          <Field label="Business name" icon={Building2} error={errors.business_name}>
            <TextInput
              value={form.business_name}
              onChange={v => set("business_name", v)}
              placeholder="e.g. Sunshine Plumbing"
              icon
              disabled={saving}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner / contact name" icon={User} error={errors.owner_name}>
              <TextInput
                value={form.owner_name}
                onChange={v => set("owner_name", v)}
                placeholder="First and last name"
                icon
                disabled={saving}
              />
            </Field>

            <Field label="Phone (optional)" icon={Phone}>
              <TextInput
                value={form.phone}
                onChange={v => set("phone", v)}
                placeholder="+27 82 000 0000"
                icon
                type="tel"
                disabled={saving}
              />
            </Field>
          </div>

          <Field label="Email address" icon={Mail} error={errors.email}>
            <TextInput
              value={form.email}
              onChange={v => set("email", v)}
              placeholder="owner@business.co.za"
              icon
              type="email"
              disabled={saving}
            />
          </Field>

          <Field label="Password" icon={Lock} error={errors.password}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="Set a password for them (min. 8 chars)"
                disabled={saving}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400",
                  "pl-10 pr-10 py-2.5",
                  "focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20 focus:border-[#E85A2C]/40 transition-shadow",
                  "disabled:opacity-60",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Client can change this from their Settings → Security after they log in.</p>
          </Field>
        </div>

        {/* Plan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <p className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" /> Plan &amp; billing
          </p>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-2">Plan</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLANS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("plan", p.value)}
                  className={cn(
                    "flex flex-col items-start px-3 py-3 rounded-xl border text-left transition-all cursor-pointer",
                    form.plan === p.value
                      ? "border-[#E85A2C] bg-[#E85A2C]/5 ring-2 ring-[#E85A2C]/20"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300",
                  )}
                >
                  <span className={cn("text-[13px] font-semibold", form.plan === p.value ? "text-[#E85A2C]" : p.color)}>
                    {p.label}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{p.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-2">Billing cycle</label>
            <div className="flex gap-2">
              {(["monthly", "annual"] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("billing_cycle", c)}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all cursor-pointer",
                    form.billing_cycle === c
                      ? "border-[#E85A2C] bg-[#E85A2C]/5 text-[#E85A2C] ring-2 ring-[#E85A2C]/20"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300",
                  )}
                >
                  {c === "monthly" ? "Monthly" : "Annual"}
                  {c === "annual" && (
                    <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                      15% off
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Summary line */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="text-[13px] text-slate-600">
              <span className="font-semibold text-slate-800">{planCfg.label}</span>{" · "}
              {form.billing_cycle}
              {isAnnual && <span className="ml-1 text-emerald-600 font-medium">(15% off)</span>}
            </div>
            <span className="text-[13px] font-semibold text-slate-700">{priceLabel}</span>
          </div>
        </div>

        {/* Admin note */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-[12px] font-semibold text-slate-600 mb-2">Internal note (optional)</label>
          <textarea
            value={form.note}
            onChange={e => set("note", e.target.value)}
            placeholder="e.g. Referred by John, agreed R1,799/mo via EFT, invoice due 1st of each month"
            rows={3}
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20 focus:border-[#E85A2C]/40 transition-shadow disabled:opacity-60"
          />
        </div>

        {serverError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
            {serverError}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pb-8">
          <Link
            href="/admin/clients"
            className="text-[13px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E85A2C] text-white text-[14px] font-semibold hover:bg-[#d04f25] disabled:opacity-60 transition-colors cursor-pointer shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create client & send welcome email"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

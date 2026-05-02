"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, CheckCircle, Zap, Check, X as XIcon, ArrowRight } from "lucide-react";
import { type PlanTier } from "@/lib/plan";

// ─── Google icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "Contains a number", valid: /\d/.test(password) },
    { label: "Contains a letter", valid: /[a-zA-Z]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-2">
          {c.valid ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <XIcon className="w-3.5 h-3.5 text-ink-400" />
          )}
          <span className={`text-tiny ${c.valid ? "text-success" : "text-ink-400"}`}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Plan selection ───────────────────────────────────────────────────────────

const PLANS: {
  id: PlanTier;
  name: string;
  price: string;
  sub: string;
  badge?: string;
  cta: string;
  features: string[];
  noCard: boolean;
}[] = [
  {
    id: "starter",
    name: "Starter",
    price: "R399",
    sub: "/month",
    cta: "Start with Starter",
    noCard: false,
    features: [
      "75 qualified leads/month",
      "Digital assistant",
      "Email lead delivery",
      '"Powered by Qwikly" branding',
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R999",
    sub: "/month",
    badge: "Most Popular",
    cta: "Choose Pro",
    noCard: false,
    features: [
      "250 qualified leads/month",
      "Custom branding (your logo)",
      "Custom greeting + qualifying questions",
      "Lead exports (CSV)",
      "Priority email support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "R2,499",
    sub: "/month",
    cta: "Choose Premium",
    noCard: false,
    features: [
      "Up to 1,000 qualified leads/month",
      "Everything in Pro, plus:",
      "Calendar integration (coming soon)",
      "API access",
      "Dedicated support",
    ],
  },
];

interface PlanSelectProps {
  initialPlan: PlanTier | null;
  onSelect: (plan: PlanTier) => void;
}

function PlanSelect({ initialPlan, onSelect }: PlanSelectProps) {
  const [selected, setSelected] = useState<PlanTier>(initialPlan ?? "pro");

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-8">
        <h2 className="text-h1 text-ink">Choose your plan</h2>
        <p className="text-ink-500 text-small mt-1.5">
          30-day money-back guarantee on Pro and Premium. Pay annually and get 2 months free.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className={`relative text-left rounded-2xl border p-5 transition-all duration-200 cursor-pointer flex flex-col gap-4 ${
                isSelected
                  ? "border-ember bg-ember/[0.06] ring-1 ring-brand/30"
                  : "border-line hover:border-ink/[0.20] bg-white/70"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-ember text-white text-[10px] font-bold tracking-wide whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              {isSelected && (
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-ember flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div>
                <p className="text-fg text-small font-semibold">{plan.name}</p>
                <p className="text-fg mt-1">
                  <span className="text-2xl font-bold num">{plan.price}</span>
                  <span className="text-ink-400 text-tiny ml-1">{plan.sub}</span>
                </p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-ember mt-0.5 shrink-0" />
                    <span className="text-tiny text-ink-500 leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect(selected)}
        className="w-full h-12 bg-grad-brand text-white text-small font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:brightness-95 transition-all duration-150 shadow-[0_8px_24px_-8px_rgba(232,90,44,0.4)]"
      >
        Continue with {PLANS.find((p) => p.id === selected)?.name}
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-center text-tiny text-ink-400 mt-4">
        No setup fee · No per-lead fees · Cancel anytime
      </p>
    </div>
  );
}

// ─── Account creation ─────────────────────────────────────────────────────────

interface AccountFormProps {
  plan: PlanTier;
  onBack: () => void;
}

function AccountForm({ plan, onBack }: AccountFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordValid = password.length >= 8;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?plan=${plan}`,
      },
    });
    if (oauthError) {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    let json: { error?: string; needsConfirmation?: boolean };
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, businessName }),
      });
      json = await res.json();
      if (!res.ok) {
        const msg = (json.error ?? "").toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
          setError("An account with this email already exists. Try signing in instead.");
        } else {
          setError("Something went wrong. Please try again or message us.");
        }
        setLoading(false);
        return;
      }
    } catch {
      setError("Something went wrong. Please try again or message us.");
      setLoading(false);
      return;
    }
    if (!json.needsConfirmation) {
      router.push(`/onboarding/website?plan=${plan}`);
      return;
    }
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 bg-success/10 border border-success/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div>
          <h2 className="text-h1 text-ink">Check your email</h2>
          <p className="text-ink-500 text-small mt-3 leading-relaxed">
            We sent a confirmation link to{" "}
            <span className="text-fg font-medium">{email}</span>.
            Click it to activate your account, then sign in.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-2 h-12 bg-grad-brand text-white text-small font-semibold rounded-xl cursor-pointer hover:brightness-110 transition-all duration-150 shadow-[0_8px_24px_-8px_rgba(232,90,44,0.4)]"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  const planLabel =
    plan === "trial" ? "Trial — Free (14 days)" :
    plan === "starter" ? "Starter — R399/mo" :
    plan === "pro" ? "Pro — R999/mo" :
    "Premium — R2,499/mo";

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-tiny text-ink-500 hover:text-fg transition-colors duration-150 cursor-pointer mb-6"
      >
        <XIcon className="w-3.5 h-3.5" /> Change plan
      </button>

      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20 text-tiny font-semibold text-ember mb-3">
          <Check className="w-3 h-3" /> {planLabel}
        </div>
        <h2 className="text-h1 text-ink">Create your account</h2>
        <p className="text-ink-500 text-small mt-1.5">
          {plan === "starter" ? "No card needed. Live in 5 minutes." : "30-day money-back guarantee."}
        </p>
      </div>

      {/* Google — recommended primary path */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 h-12 bg-white border border-ink/[0.14] rounded-xl text-ink text-small font-medium hover:bg-ink/[0.04] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200"
      >
        {googleLoading ? (
          <div className="w-4 h-4 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? "Redirecting…" : "Continue with Google"}
        {!googleLoading && (
          <span className="ml-auto text-tiny text-ember font-semibold">Recommended</span>
        )}
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-ink/[0.10]" />
        <span className="text-tiny text-ink-400">or sign up with email</span>
        <div className="flex-1 h-px bg-ink/[0.10]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="business_name" className="block text-tiny text-ink font-medium mb-2">
            Business name
          </label>
          <input
            id="business_name"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoComplete="organization"
            placeholder="Acme Plumbing"
            className="w-full h-11 bg-white border border-ink/[0.14]rounded-xl px-4 text-small text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ember/25 focus:border-ember/40 transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-tiny text-ink font-medium mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full h-11 bg-white border border-ink/[0.14]rounded-xl px-4 text-small text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ember/25 focus:border-ember/40 transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-tiny text-ink font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full h-11 bg-white border border-ink/[0.14]rounded-xl px-4 pr-12 text-small text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ember/25 focus:border-ember/40 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-fg cursor-pointer transition-colors duration-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !passwordValid || !businessName}
          className="w-full h-12 bg-grad-brand text-white text-small font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:brightness-110 active:brightness-95 transition-all duration-150 shadow-[0_8px_24px_-8px_rgba(232,90,44,0.4)]"
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            "Create your account"
          )}
        </button>
      </form>

      <p className="text-center text-small text-ink-500 mt-8">
        Already have an account?{" "}
        <Link href="/login" className="text-ember hover:text-ember-deep font-medium transition-colors duration-200">
          Sign in
        </Link>
      </p>

      <p className="text-center text-tiny text-ink-400 mt-4">
        POPIA compliant · No setup fee · Cancel anytime
      </p>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

function SignupContent() {
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const validPlans: PlanTier[] = ["starter", "pro", "premium"];
  const initialPlan: PlanTier | null = validPlans.includes(rawPlan as PlanTier)
    ? (rawPlan as PlanTier)
    : null;

  const [step, setStep] = useState<"plan" | "account">(initialPlan ? "account" : "plan");
  const [chosenPlan, setChosenPlan] = useState<PlanTier>(initialPlan ?? "pro");

  const handlePlanSelect = (plan: PlanTier) => {
    setChosenPlan(plan);
    setStep("account");
  };

  return (
    <main className="min-h-screen [min-height:100dvh] flex bg-paper">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[40%] shrink-0 flex-col justify-between p-12 bg-paper-deep border-r border-ink/[0.08] relative overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-ember/[0.06] blur-3xl pointer-events-none" />

        <div>
          <a href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-grad-brand flex items-center justify-center ">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-base text-ink font-semibold tracking-tight">Qwikly</span>
          </a>
        </div>

        <div className="space-y-8 relative">
          <div>
            <p className="eyebrow text-ink-500 mb-4">The digital assistant for your website</p>
            <h1 className="font-display text-[2.6rem] text-ink leading-[1.05] tracking-[-0.03em]">
              Captures every lead.
              <br />
              Qualifies them.
              <br />
              <em className="text-ember italic font-light">Books them in.</em>
            </h1>
            <p className="text-ink-500 mt-4 text-sm leading-relaxed max-w-sm">
              Even when you&rsquo;re asleep. Paste one script tag — live in 5 minutes. No per-job fees. Ever.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "No per-lead fees — flat monthly plan",
              "Qualifies visitors and captures contact details",
              "Books them in with a preferred time",
              "Leads delivered to your email instantly",
              "30-day money-back on Pro and Premium",
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-ember/10 border border-ember/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-ember" />
                </div>
                <span className="text-ink-500 text-small">{point}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-white/70 border border-ink/[0.10]">
            <p className="text-small text-ink italic leading-relaxed">
              &ldquo;We picked up 4 leads in our first week that came in after hours. None of them would have called back.&rdquo;
            </p>
            <p className="text-tiny text-ink-400 mt-2">Thabo M. · Electrician · Johannesburg</p>
          </div>
        </div>

        <p className="eyebrow text-ink-400 relative">POPIA compliant · Data stays in South Africa</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full flex justify-center">
          {/* Mobile logo */}
          <div className="lg:hidden absolute top-6 left-6">
            <a href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-grad-brand flex items-center justify-center ">
                <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-heading text-base text-ink font-semibold tracking-tight">Qwikly</span>
            </a>
          </div>

          {step === "plan" ? (
            <PlanSelect initialPlan={initialPlan} onSelect={handlePlanSelect} />
          ) : (
            <AccountForm plan={chosenPlan} onBack={() => setStep("plan")} />
          )}
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

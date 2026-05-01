"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, CheckCircle, Zap, Check, X as XIcon } from "lucide-react";

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
            <XIcon className="w-3.5 h-3.5 text-fg-subtle" />
          )}
          <span className={`text-tiny ${c.valid ? "text-success" : "text-fg-subtle"}`}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "https://www.qwikly.co.za/auth/callback" },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (msg.includes("email") && (msg.includes("send") || msg.includes("confirm"))) {
        setError("We couldn't send a confirmation email right now. Try again in a few minutes.");
      } else {
        setError("Something went wrong. Please try again or message us.");
      }
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard/setup");
      return;
    }

    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <main className="min-h-screen [min-height:100dvh] flex items-center justify-center px-6 bg-[#07080B]">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-success/10 border border-success/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <div>
            <h2 className="text-h1 text-fg">Check your email</h2>
            <p className="text-fg-muted text-small mt-3 leading-relaxed">
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
      </main>
    );
  }

  return (
    <main className="min-h-screen [min-height:100dvh] flex bg-[#07080B]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] shrink-0 flex-col justify-between p-12 bg-[#0D111A] border-r border-white/[0.06] relative overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand/[0.08] blur-3xl pointer-events-none" />

        <div>
          <a href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-grad-brand flex items-center justify-center shadow-glow">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-h3 text-fg font-semibold">Qwikly</span>
          </a>
        </div>

        <div className="space-y-8 relative">
          <div>
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold mb-4">
              30-day money-back guarantee
            </p>
            <h1 className="font-display text-3xl text-fg leading-tight">
              Your phone rings while you&rsquo;re on the job.
              <br />
              <span className="text-brand italic font-light">We answer it.</span>
            </h1>
            <p className="text-fg-muted mt-4 text-sm leading-relaxed max-w-sm">
              Set up in 10 minutes. Qwikly learns your trade, your prices, and your area — then handles every enquiry automatically.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Flat monthly plans from R399/month — no per-job fees, ever",
              "Handles WhatsApp, email, and website enquiries 24/7",
              "Books into your Google Calendar automatically",
              "Cancel anytime — no lock-in, 30-day money-back guarantee",
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-brand/15 border border-brand/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-brand" />
                </div>
                <span className="text-fg-muted text-small">{point}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-line">
            <p className="text-small text-fg italic leading-relaxed">
              &ldquo;Picked up 4 extra jobs in the first month. About R28,000 in work from leads that came in after 6pm.&rdquo;
            </p>
            <p className="text-tiny text-fg-subtle mt-2">Thabo M. · Electrician · Johannesburg</p>
          </div>
        </div>

        <p className="text-fg-subtle text-tiny relative">
          POPIA compliant · Your data stays in South Africa
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <a href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-grad-brand flex items-center justify-center shadow-glow">
                <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-h3 text-fg font-semibold">Qwikly</span>
            </a>
          </div>

          <div className="mb-8">
            <h2 className="text-h1 text-fg">Create your account</h2>
            <p className="text-fg-muted text-small mt-1.5">30-day money-back guarantee on all plans</p>
          </div>

          {/* Google — recommended primary path */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 h-12 bg-white/[0.06] border border-line-strong rounded-xl text-fg text-small font-medium hover:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200"
          >
            {googleLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-fg-subtle border-t-fg animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? "Redirecting…" : "Continue with Google"}
            {!googleLoading && (
              <span className="ml-auto text-tiny text-brand font-semibold">Recommended</span>
            )}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-tiny text-fg-subtle">or sign up with email</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-tiny text-fg font-medium mb-2">
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
                className="w-full h-11 bg-white/[0.04] border border-line rounded-xl px-4 text-small text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-tiny text-fg font-medium mb-2">
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
                  className="w-full h-11 bg-white/[0.04] border border-line rounded-xl px-4 pr-12 text-small text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg cursor-pointer transition-colors duration-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {error && (
              <div className="bg-danger/[0.08] border border-danger/25 rounded-xl px-4 py-3">
                <p className="text-danger text-small">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !passwordValid}
              className="w-full h-12 bg-grad-brand text-white text-small font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:brightness-110 active:brightness-95 transition-all duration-150 shadow-[0_8px_24px_-8px_rgba(232,90,44,0.4)]"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                "Create your account"
              )}
            </button>
          </form>

          <p className="text-center text-small text-fg-muted mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-brand hover:text-brand-hover font-medium transition-colors duration-200">
              Sign in
            </Link>
          </p>

          <p className="text-center text-tiny text-fg-subtle mt-4">
            No setup fee · No per-job fees · 30-day money-back guarantee
          </p>
        </div>
      </div>
    </main>
  );
}

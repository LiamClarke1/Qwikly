"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Calendar, MessageSquare, Zap, ArrowRight } from "lucide-react";

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

const proofPoints = [
  { icon: MessageSquare, text: "Replies to every WhatsApp in under 30 seconds — even at 2am" },
  { icon: Calendar, text: "Books appointments directly into your Google Calendar" },
  { icon: Zap, text: "7-day free trial, no credit card, no setup fee" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      if (authError.message.includes("Email not confirmed")) {
        setError("Please check your email and click the confirmation link first.");
      } else if (authError.message.includes("Invalid login credentials")) {
        setError("Hmm, that didn't work. Check your email and password and try again.");
      } else {
        setError("Something went wrong. Please try again or message us.");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen [min-height:100dvh] flex bg-[#07080B]">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[45%] shrink-0 flex-col justify-between p-12 bg-[#0D111A] border-r border-white/[0.06] relative overflow-hidden">
        {/* Subtle ember glow */}
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
              Your digital front desk
            </p>
            <h1 className="font-display text-3xl text-fg leading-tight">
              Your phone rings while you&rsquo;re up a ladder.
              <br />
              <span className="text-brand italic font-light">We answer it.</span>
            </h1>
            <p className="text-fg-muted mt-4 text-sm leading-relaxed max-w-sm">
              While you&rsquo;re on the job, Qwikly handles every enquiry, qualifies the lead, and fills your calendar automatically.
            </p>
          </div>

          <div className="space-y-4">
            {proofPoints.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-brand/[0.12] border border-brand/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-brand" />
                  </div>
                  <span className="text-fg text-sm">{p.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-fg-subtle text-tiny relative">
          Trusted by South African service businesses
        </p>
      </div>

      {/* Right panel — form */}
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
            <h2 className="text-h1 text-fg">Welcome back</h2>
            <p className="text-fg-muted text-small mt-1.5">Sign in to your dashboard</p>
          </div>

          {/* Google — primary path */}
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
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-tiny text-fg-subtle">or sign in with email</span>
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
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-tiny text-fg font-medium">
                  Password
                </label>
                <Link href="/forgot-password" className="text-tiny text-brand hover:text-brand-hover transition-colors duration-200">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
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
            </div>

            {error && (
              <div className="bg-danger/[0.08] border border-danger/25 rounded-xl px-4 py-3">
                <p className="text-danger text-small">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-12 bg-grad-brand text-white text-small font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:brightness-110 active:brightness-95 transition-all duration-150 shadow-[0_8px_24px_-8px_rgba(232,90,44,0.4)]"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-small text-fg-muted mt-8">
            Don&rsquo;t have an account?{" "}
            <Link href="/signup" className="text-brand hover:text-brand-hover font-medium transition-colors duration-200">
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

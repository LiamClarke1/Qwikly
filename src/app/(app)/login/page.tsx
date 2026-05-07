"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Calendar, MessageSquare, Zap, ArrowRight } from "lucide-react";

const proofPoints = [
  { icon: MessageSquare, text: "Captures and qualifies every website visitor — even at 2am" },
  { icon: Calendar, text: "Leads delivered to your email the moment they're captured" },
  { icon: Zap, text: "Free plan available — Pro from R999/month, no per-lead fees" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="min-h-screen [min-height:100dvh] flex bg-paper">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[45%] shrink-0 flex-col justify-between p-12 bg-paper-deep border-r border-ink/[0.08] relative overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-ember/[0.06] blur-3xl pointer-events-none" />

        <div>
          <a href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-grad-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-base text-ink font-semibold tracking-tight">Qwikly</span>
          </a>
        </div>

        <div className="space-y-8 relative">
          <div>
            <p className="eyebrow text-ink-500 mb-4">Digital assistant for your website</p>
            <h1 className="font-display text-[2.6rem] text-ink leading-[1.05] tracking-[-0.03em]">
              A visitor lands on your site while you&rsquo;re up a ladder.
              <br />
              <em className="text-ember italic font-light">We capture the lead.</em>
            </h1>
            <p className="text-ink-500 mt-4 text-sm leading-relaxed max-w-sm">
              While you&rsquo;re on the job, Qwikly&rsquo;s digital assistant handles every website visitor, qualifies their need, and delivers the lead straight to your inbox.
            </p>
          </div>

          <div className="space-y-4">
            {proofPoints.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-ember/[0.10] border border-ember/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-ember" />
                  </div>
                  <span className="text-ink-700 text-sm">{p.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="eyebrow text-ink-400 relative">Trusted by South African service businesses</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <a href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-grad-brand flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-heading text-base text-ink font-semibold">Qwikly</span>
            </a>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-[2rem] text-ink font-bold tracking-[-0.03em] leading-tight">Welcome back.</h2>
            <p className="text-ink-500 text-sm mt-1.5">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-ink font-medium mb-2">
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
                className="w-full h-11 bg-white border border-ink/[0.14] rounded-xl px-4 text-sm text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ember/25 focus:border-ember/40 transition-all duration-200"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs text-ink font-medium">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-ember hover:text-ember-deep transition-colors duration-200">
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
                  className="w-full h-11 bg-white border border-ink/[0.14] rounded-xl px-4 pr-12 text-sm text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ember/25 focus:border-ember/40 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink cursor-pointer transition-colors duration-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-12 bg-ink text-paper text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-ink-900 active:scale-[0.99] transition-all duration-150"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-paper/30 border-t-paper animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-8">
            Don&rsquo;t have an account?{" "}
            <Link href="/signup" className="text-ember hover:text-ember-deep font-medium transition-colors duration-200">
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

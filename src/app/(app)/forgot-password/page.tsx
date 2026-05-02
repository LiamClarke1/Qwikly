"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CheckCircle, Zap, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError("Something went wrong. Please try again or contact hello@qwikly.co.za.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-paper">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-ember/10 border border-ember/20 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-ember" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-ink tracking-[-0.03em]">Check your email</h2>
            <p className="text-ink-500 text-sm mt-3 leading-relaxed">
              We sent a password reset link to{" "}
              <span className="text-ink font-medium">{email}</span>. Click it to set a new password.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full bg-ink text-paper font-semibold py-3.5 rounded-xl cursor-pointer transition-colors duration-200 text-sm hover:bg-ink-900"
          >
            Back to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <a href="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-grad-brand flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-base text-ink font-semibold">Qwikly</span>
          </a>
        </div>

        <div className="mb-8">
          <h2 className="font-display text-[2rem] text-ink font-bold tracking-[-0.03em] leading-tight">Reset your password.</h2>
          <p className="text-ink-500 text-sm mt-1.5">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="you@example.com"
              className="w-full h-11 bg-white border border-ink/[0.14] rounded-xl px-4 text-sm text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ember/25 focus:border-ember/40 transition-all duration-200"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-ink text-paper text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-ink-900 active:scale-[0.99] transition-all duration-150"
          >
            {loading ? "Sending…" : (
              <>
                Send Reset Link
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-8">
          Remembered it?{" "}
          <Link href="/login" className="text-ember hover:text-ember-deep font-medium transition-colors duration-200">
            Back to Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

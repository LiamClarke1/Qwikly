"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CheckCircle } from "lucide-react";

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
      <main className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">Check your email</h2>
            <p className="text-muted mt-3 leading-relaxed">
              We sent a password reset link to{" "}
              <span className="text-foreground font-medium">{email}</span>. Click it to set a new password.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-xl cursor-pointer transition-colors duration-200 text-base"
          >
            Back to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <a href="/" className="font-heading text-2xl font-bold text-white hover:text-blue-400 transition-colors duration-200 cursor-pointer">
            Qwikly
          </a>
        </div>

        <div className="mb-8">
          <h2 className="font-heading text-3xl font-bold text-white">Reset your password</h2>
          <p className="text-muted mt-2">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200 text-base"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-8">
          Remembered it?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200">
            Back to Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

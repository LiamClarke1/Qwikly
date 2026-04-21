"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, MessageSquare, Zap, Calendar, CheckCircle } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://www.qwikly.co.za/auth/callback",
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">Check your email</h2>
            <p className="text-muted mt-3 leading-relaxed">
              We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>. Click it to activate your account, then sign in.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-xl cursor-pointer transition-colors duration-200 text-base"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-card flex-col justify-between p-12">
        <div>
          <a href="/" className="font-heading text-2xl font-bold text-white hover:text-blue-400 transition-colors duration-200 cursor-pointer">Qwikly</a>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="font-heading text-4xl font-bold text-white leading-tight">
              Your AI handles WhatsApp and email.<br />You handle the work.
            </h1>
            <p className="text-muted mt-4 text-lg leading-relaxed">
              While you&apos;re on the job, Qwikly handles every enquiry, follows up automatically, and fills your calendar.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: <MessageSquare className="w-5 h-5" />, text: "AI replies to customers 24/7 on WhatsApp and email" },
              { icon: <Calendar className="w-5 h-5" />, text: "Books appointments directly into your calendar" },
              { icon: <Zap className="w-5 h-5" />, text: "7-day free trial, no credit card required" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-foreground text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted text-sm">Trusted by South African service businesses</p>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <a href="/" className="font-heading text-2xl font-bold text-white hover:text-blue-400 transition-colors duration-200 cursor-pointer">Qwikly</a>
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-3xl font-bold text-white">Create your account</h2>
            <p className="text-muted mt-2">Free for 7 days, no credit card needed</p>
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer transition-colors duration-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-2">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat your password"
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
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

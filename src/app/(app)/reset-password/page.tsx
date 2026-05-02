"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, CheckCircle, Zap, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
  }, []);

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

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Failed to update password. The reset link may have expired. Please request a new one.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-ember/10 border border-ember/20 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-ember" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-ink tracking-[-0.03em]">Password updated</h2>
            <p className="text-ink-500 text-sm mt-3 leading-relaxed">
              Your password has been changed. You can now sign in with your new password.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center gap-2 w-full bg-ink text-paper font-semibold py-3.5 rounded-xl cursor-pointer transition-colors duration-200 text-sm hover:bg-ink-900"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
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
          <h2 className="font-display text-[2rem] text-ink font-bold tracking-[-0.03em] leading-tight">Set a new password.</h2>
          <p className="text-ink-500 text-sm mt-1.5">Choose a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-xs text-ink font-medium mb-2">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
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

          <div>
            <label htmlFor="confirm" className="block text-xs text-ink font-medium mb-2">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat your new password"
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
            disabled={loading || !sessionReady}
            className="w-full h-12 bg-ink text-paper text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-ink-900 active:scale-[0.99] transition-all duration-150"
          >
            {loading ? "Updating…" : (
              <>
                Update Password
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-8">
          Link expired?{" "}
          <Link href="/forgot-password" className="text-ember hover:text-ember-deep font-medium transition-colors duration-200">
            Request a new one
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

export default function DeleteMyDataPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/privacy/delete-my-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">
            <Link href="/privacy" className="hover:text-ember transition-colors cursor-pointer">
              Privacy
            </Link>{" "}
            / Delete my data
          </p>

          <h1 className="font-display font-medium text-[clamp(2rem,4.5vw,3rem)] leading-tight tracking-tight text-ink mb-4">
            Request data deletion
          </h1>
          <p className="text-ink-700 leading-relaxed mb-10">
            Enter the email address you used when you chatted with a Qwikly digital assistant. We will
            send a confirmation link to that address. Once you click it, we soft-delete your conversations
            immediately and remove them entirely on the next daily retention run, in line with the
            Protection of Personal Information Act (POPIA, 2013).
          </p>

          {submitted ? (
            <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6">
              <p className="font-display font-medium text-lg text-ink mb-2">Check your inbox</p>
              <p className="text-sm text-ink-700 leading-relaxed">
                If we hold data linked to <strong>{email}</strong>, we have just sent a confirmation link
                to that address. The link expires in 24 hours. If nothing arrives in 10 minutes, check
                your spam folder, then write to{" "}
                <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                  hello@qwikly.co.za
                </a>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-ink mb-2"
                >
                  Your email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-ink/[0.12] bg-white text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ember/30 focus:border-ember transition-colors"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full px-5 py-3 rounded-xl bg-ink text-paper font-semibold hover:bg-ink/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending confirmation link…" : "Send confirmation link"}
              </button>

              <p className="text-xs text-ink-500 leading-relaxed">
                We send a confirmation email so we can verify you own this address before deleting
                anything. We never delete data based on an unverified request.
              </p>
            </form>
          )}

          <div className="mt-12 pt-8 border-t border-ink/[0.07]">
            <p className="text-sm text-ink-700 leading-relaxed">
              Need a different right? You also have the right to access, correct, object to processing,
              or complain to the Information Regulator. For any of those, email{" "}
              <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                hello@qwikly.co.za
              </a>
              . See the full{" "}
              <Link href="/privacy" className="text-ember underline transition-colors">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

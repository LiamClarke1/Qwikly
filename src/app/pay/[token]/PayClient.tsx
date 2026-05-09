"use client";

import { useState } from "react";

interface Props {
  token: string;
  invoiceNumber: string;
  businessName: string;
  amountFormatted: string;
  dueDateFormatted: string | null;
  isOverdue: boolean;
}

export default function PayClient({
  token,
  invoiceNumber,
  businessName,
  amountFormatted,
  dueDateFormatted,
  isOverdue,
}: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/pay/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const reason = typeof body?.error === "string" ? body.error : "Something went wrong, please try again.";
        if (reason === "already_paid" || reason === "already_awaiting_verification") {
          setSubmitted(true);
          setShowConfirm(false);
          return;
        }
        setErrorMsg("We couldn’t record that. Please try again, or reply to your invoice email.");
        return;
      }
      setSubmitted(true);
      setShowConfirm(false);
    } catch {
      setErrorMsg("We couldn’t reach Qwikly. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="px-6 pt-10">
        <div className="max-w-xl mx-auto">
          <p className="text-sm font-semibold tracking-tight">
            Qwikly<span className="text-ember">.</span>
          </p>
        </div>
      </header>

      <main className="px-6 pt-12 pb-24">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-500 mb-5">
            Invoice {invoiceNumber}
          </p>

          {!submitted ? (
            <>
              <h1 className="font-display font-medium text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight mb-6">
                Hi {businessName},
                <br />
                <em className="italic font-light">have you paid?</em>
              </h1>

              <div className="rounded-2xl border border-ink-200 bg-paper-deep/40 p-6 mb-8">
                <dl className="space-y-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-ink-500">Amount</dt>
                    <dd className="font-display text-2xl font-medium text-ink">{amountFormatted}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-ink-500">Invoice</dt>
                    <dd className="text-sm font-mono text-ink">{invoiceNumber}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-ink-500">Due</dt>
                    <dd className={`text-sm ${isOverdue ? "text-ember" : "text-ink"}`}>
                      {dueDateFormatted ?? "On receipt"}
                      {isOverdue ? " (overdue)" : ""}
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="text-ink-700 leading-relaxed mb-8">
                If you&rsquo;ve already made the EFT, tap the button below. We&rsquo;ll match it against our account and send a confirmation by email, usually within a working day.
              </p>

              <button
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-3.5 rounded-full bg-ember text-paper text-base font-semibold tracking-tight transition-opacity hover:opacity-90 active:opacity-80 cursor-pointer"
              >
                I&rsquo;ve paid
              </button>

              {errorMsg && (
                <p className="mt-4 text-sm text-ember" role="alert">
                  {errorMsg}
                </p>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-ink-200 bg-paper-deep/40 p-8">
              <h2 className="font-display font-medium text-3xl tracking-tight mb-3">Thanks.</h2>
              <p className="text-ink-700 text-lg leading-relaxed">
                We&rsquo;ll confirm your payment shortly. You&rsquo;ll get an email from Qwikly once it&rsquo;s matched against our account, usually within a working day.
              </p>
            </div>
          )}

          <p className="mt-12 text-xs text-ink-400">
            Questions? Reply to your invoice email and we&rsquo;ll come straight back to you.
          </p>
        </div>
      </main>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-paper text-ink w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 sm:p-7 shadow-ink">
            <h3 className="font-display font-medium text-xl tracking-tight mb-2">
              Mark this invoice as paid?
            </h3>
            <p className="text-sm text-ink-700 leading-relaxed mb-6">
              Qwikly will verify your payment and confirm by email, usually within a working day.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => { if (!submitting) setShowConfirm(false); }}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full border border-ink-200 text-ink text-sm font-medium hover:bg-paper-deep transition-colors disabled:opacity-50 cursor-pointer"
              >
                Not yet
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full bg-ember text-paper text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Sending..." : "Yes, I’ve paid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

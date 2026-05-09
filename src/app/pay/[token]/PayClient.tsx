"use client";

import { useRef, useState } from "react";

interface Props {
  token: string;
  invoiceNumber: string;
  businessName: string;
  amountFormatted: string;
  dueDateFormatted: string | null;
  isOverdue: boolean;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPT_ATTR = "image/*,application/pdf";

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
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      setFileError("Please upload a JPG, PNG, WebP, or PDF file.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File is too large. Maximum size is 10 MB.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  }

  function removeFile() {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirm() {
    if (!selectedFile) {
      setFileError("Please attach your proof of payment before submitting.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("note", note);

      const res = await fetch(`/pay/${token}/confirm`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const reason = typeof body?.error === "string" ? body.error : "unknown";
        if (reason === "already_paid" || reason === "already_awaiting_verification") {
          setSubmitted(true);
          setShowConfirm(false);
          return;
        }
        if (reason === "proof_required") {
          setFileError("Please attach your proof of payment before submitting.");
          return;
        }
        if (reason === "file_too_large") {
          setFileError("File is too large. Maximum size is 10 MB.");
          return;
        }
        if (reason === "invalid_file_type") {
          setFileError("Please upload a JPG, PNG, WebP, or PDF file.");
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
              Confirm payment
            </h3>
            <p className="text-sm text-ink-700 leading-relaxed mb-5">
              Qwikly will verify your payment and confirm by email, usually within a working day.
            </p>

            {/* Proof of payment upload */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-ink-700 mb-2">
                Upload your proof of payment (bank confirmation or screenshot).
              </p>

              {!selectedFile ? (
                <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-ink-200 rounded-xl py-5 px-4 cursor-pointer hover:border-ember/50 transition-colors">
                  <span className="text-sm text-ink-500 mb-1">Tap to choose a file</span>
                  <span className="text-xs text-ink-400">JPG, PNG, WebP or PDF, max 10 MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_ATTR}
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 border border-ink-200 rounded-xl px-4 py-3">
                  <span className="flex-1 text-sm text-ink truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={submitting}
                    className="text-xs text-ink-400 hover:text-ember transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}

              {fileError && (
                <p className="mt-2 text-xs text-ember" role="alert">
                  {fileError}
                </p>
              )}
            </div>

            {/* Optional note */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (e.g. payment reference)"
              rows={2}
              disabled={submitting}
              className="w-full text-sm border border-ink-200 rounded-xl px-3 py-2 mb-5 resize-none bg-paper placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-ember/30 disabled:opacity-50"
            />

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => { if (!submitting) { setShowConfirm(false); setFileError(null); } }}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full border border-ink-200 text-ink text-sm font-medium hover:bg-paper-deep transition-colors disabled:opacity-50 cursor-pointer"
              >
                Not yet
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting || !selectedFile}
                className="px-5 py-2.5 rounded-full bg-ember text-paper text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Uploading..." : "Confirm payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

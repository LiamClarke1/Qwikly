"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check, Mail, X, Loader2, Send } from "lucide-react";

interface EmbedActionsProps {
  publicKey: string;
  tenantName: string;
}

export function EmbedActions({ publicKey, tenantName }: EmbedActionsProps) {
  const snippet = `<script\n  src="https://cdn.qwikly.co.za/embed.js"\n  data-qwikly-id="${publicKey}"\n  async\n></script>`;

  // ── Copy state ────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for browsers that block clipboard without HTTPS
      const el = document.createElement("textarea");
      el.value = snippet;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // ── Email modal state ─────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [modalStatus, setModalStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setEmail("");
      setSending(false);
      setModalStatus("idle");
      setErrorMsg("");
    }
  }, [modalOpen]);

  // Close on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen]);

  const handleSend = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setModalStatus("idle");
    setErrorMsg("");
    try {
      const res = await fetch("/api/embed/send-snippet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: publicKey, recipientEmail: email.trim() }),
      });
      if (res.ok) {
        setModalStatus("success");
      } else {
        const j = await res.json().catch(() => ({}));
        const msg =
          j.error === "invalid_email"
            ? "That email address doesn't look right."
            : j.error === "not_found"
            ? "Tenant not found. Please try again."
            : "Something went wrong. Please try again.";
        setErrorMsg(msg);
        setModalStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setModalStatus("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        {/* Copy snippet */}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-ember text-white text-sm font-semibold hover:bg-ember/90 transition-colors duration-150 cursor-pointer select-none"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy snippet
            </>
          )}
        </button>

        {/* Email to developer */}
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-xl border border-ink/[0.12] text-ink-500 text-sm font-medium hover:text-ink hover:bg-ink/[0.04] transition-colors duration-150 cursor-pointer select-none"
        >
          <Mail className="w-4 h-4" />
          Email to developer
        </button>
      </div>

      {/* Platform tags */}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {["WordPress", "HTML", "React / Next.js", "Wix / Squarespace"].map((p) => (
          <span
            key={p}
            className="px-2.5 py-1 rounded-full bg-slate-50 border border-ink/[0.08] text-ink-500 text-xs"
          >
            {p}
          </span>
        ))}
      </div>

      {/* ── Email modal ── */}
      {modalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-modal-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white border border-ink/[0.10] rounded-2xl shadow-2xl p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p id="email-modal-title" className="text-sm font-semibold text-ink">
                  Email snippet to developer
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  We&apos;ll send the embed code straight to your developer&apos;s inbox.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink hover:bg-ink/[0.06] cursor-pointer transition-colors ml-2 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalStatus === "success" ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-ink">Email sent</p>
                <p className="text-xs text-ink-500 mt-1">
                  The snippet has been sent to <span className="font-medium text-ink">{email}</span>.
                </p>
                <button
                  onClick={() => setModalOpen(false)}
                  className="mt-4 w-full h-9 rounded-xl bg-ember text-white text-sm font-semibold hover:bg-ember/90 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="dev-email"
                      className="block text-xs font-medium text-ink-500 mb-1.5"
                    >
                      Developer&apos;s email address
                    </label>
                    <input
                      ref={inputRef}
                      id="dev-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="dev@example.com"
                      className="w-full h-9 px-3 rounded-xl border border-ink/[0.12] bg-white text-sm text-ink placeholder:text-ink-400 outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/10 transition-colors"
                    />
                  </div>

                  {modalStatus === "error" && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {errorMsg}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 h-9 rounded-xl border border-ink/[0.12] text-ink-500 text-sm font-medium hover:text-ink hover:bg-ink/[0.04] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!email.trim() || sending}
                    className="flex-1 h-9 rounded-xl bg-ember text-white text-sm font-semibold hover:bg-ember/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useClient } from "@/lib/use-client";
import { Mail, Check, X, Loader2 } from "lucide-react";

export function VerifyEmailBanner() {
  const { client, refresh } = useClient();
  const params = useSearchParams();
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyToast, setVerifyToast] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Show a toast if the user has just returned from /auth/verify
  useEffect(() => {
    const v = params.get("verify");
    if (!v) return;
    if (v === "verified") {
      setVerifyToast("Email verified");
      refresh();
    } else if (v === "expired") {
      setVerifyToast("That link expired. Send a new one below.");
    } else if (v === "already") {
      setVerifyToast("Email already verified");
    } else if (v === "invalid") {
      setVerifyToast("That verification link is invalid.");
    }
    const t = setTimeout(() => setVerifyToast(null), 4500);
    return () => clearTimeout(t);
  }, [params, refresh]);

  // Hide entirely once verified or dismissed
  if (!client || client.email_verified_at || dismissed) {
    return verifyToast ? (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-success/10 border border-success/30 text-success text-small font-medium shadow-lg flex items-center gap-2">
        <Check className="w-4 h-4" /> {verifyToast}
      </div>
    ) : null;
  }

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/send-verify-email", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error ?? "Could not send. Try again.");
        setSending(false);
        return;
      }
      setSentTo((json as { sentTo?: string }).sentTo ?? null);
    } catch {
      setError("Could not send. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {verifyToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-success/10 border border-success/30 text-success text-small font-medium shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> {verifyToast}
        </div>
      )}
      <div className="bg-ember/[0.06] border-b border-ember/20 px-4 md:px-7 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-ember/10 flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5 text-ember" />
            </div>
            <p className="text-small text-ink leading-snug min-w-0">
              {sentTo ? (
                <>
                  Verification email sent to <span className="font-semibold">{sentTo}</span>. Check your inbox.
                </>
              ) : (
                <>
                  <span className="font-semibold">Verify your email</span> so we can send password resets and lead alerts to the right place.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!sentTo && (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember text-white text-tiny font-semibold hover:bg-ember-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {sending && <Loader2 className="w-3 h-3 animate-spin" />}
                {sending ? "Sending…" : "Send verification link"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-500 hover:text-ink hover:bg-ink/[0.04] transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {error && (
            <p className="w-full text-tiny text-danger">{error}</p>
          )}
        </div>
      </div>
    </>
  );
}

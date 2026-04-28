"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Consent = "accepted" | "rejected" | null;
const COOKIE_KEY = "qwikly_cookieconsent";

function readConsent(): Consent {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  return (match?.[1] as Consent) ?? null;
}

function writeConsent(value: "accepted" | "rejected") {
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE_KEY}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

export default function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setMounted(true);
  }, []);

  function accept() {
    writeConsent("accepted");
    setConsent("accepted");
  }

  function reject() {
    writeConsent("rejected");
    setConsent("rejected");
  }

  if (!mounted || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 bg-ink text-paper rounded-2xl shadow-pop p-5 border border-paper/10 animate-slide-up"
    >
      <p className="text-sm text-paper/90 leading-relaxed mb-4">
        We use cookies to keep you signed in and improve the platform. We don&rsquo;t use advertising
        cookies.{" "}
        <Link href="/legal/privacy" className="text-ember hover:underline transition-colors">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex gap-3">
        <button
          onClick={accept}
          className="flex-1 py-2 bg-ember text-paper rounded-lg text-sm font-medium hover:bg-ember/90 transition-colors cursor-pointer"
        >
          Accept
        </button>
        <button
          onClick={reject}
          className="flex-1 py-2 bg-paper/10 text-paper rounded-lg text-sm font-medium hover:bg-paper/20 transition-colors cursor-pointer"
        >
          Reject non-essential
        </button>
      </div>
    </div>
  );
}

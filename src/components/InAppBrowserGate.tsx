"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android";

interface InAppInfo {
  app: string;
  platform: Platform;
}

const DISMISS_KEY = "qwikly_iab_dismissed";

function detectInApp(): InAppInfo | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (!isIOS && !isAndroid) return null;
  const platform: Platform = isIOS ? "ios" : "android";
  if (/Instagram/.test(ua)) return { app: "Instagram", platform };
  if (/FBAN|FBAV/.test(ua)) return { app: "Facebook", platform };
  if (/BytedanceWebview|musical_ly|TikTok/.test(ua)) return { app: "TikTok", platform };
  if (/LinkedInApp/.test(ua)) return { app: "LinkedIn", platform };
  if (/Twitter/.test(ua)) return { app: "X", platform };
  if (/Snapchat/.test(ua)) return { app: "Snapchat", platform };
  if (/Pinterest/.test(ua)) return { app: "Pinterest", platform };
  if (/MicroMessenger/.test(ua)) return { app: "WeChat", platform };
  return null;
}

function getIOSSteps(app: string): string[] {
  switch (app) {
    case "Facebook":
      return ['Tap the ⋯ button (bottom right)', 'Tap "Open in browser"'];
    case "TikTok":
      return ['Tap the ··· button (top right)', 'Tap "Open in browser"'];
    case "X":
      return ['Tap the ··· button (top right)', 'Tap "Open in external browser"'];
    case "WeChat":
      return ['Tap ··· in the top right corner', 'Tap "Open in browser"'];
    default:
      // Instagram, LinkedIn, Snapchat, Pinterest, generic
      return ['Tap the ··· button (top right)', 'Tap "Open in external browser"'];
  }
}

export default function InAppBrowserGate() {
  const [info, setInfo] = useState<InAppInfo | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch (_) { /* storage blocked — still show the gate */ }

    const detected = detectInApp();
    if (!detected) return;
    setInfo(detected);
    // Small delay so it doesn't flash on page load before content renders
    const t = setTimeout(() => setShow(true), 550);
    return () => clearTimeout(t);
  }, []);

  if (!info) return null;

  const isIOS = info.platform === "ios";
  const steps = isIOS ? getIOSSteps(info.app) : null;

  // Android: deep-link directly into Chrome, fallback to the page URL
  const chromeUrl =
    !isIOS && typeof window !== "undefined"
      ? `intent://${window.location.hostname}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`
      : null;

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch (_) { /* ignore */ }
    setShow(false);
  }

  const targetBrowser = isIOS ? "Safari" : "Chrome";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99998,
          background: "rgba(14,14,12,0.55)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          opacity: show ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: show ? "auto" : "none",
        }}
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Open in ${targetBrowser}`}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: "#FFFFFF",
          borderRadius: "24px 24px 0 0",
          padding: "0 24px max(40px, env(safe-area-inset-bottom, 24px))",
          boxShadow: "0 -8px 48px rgba(14,14,12,0.18)",
          transform: show ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
          pointerEvents: show ? "auto" : "none",
        }}
      >
        {/* Drag handle */}
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 4,
            background: "rgba(14,14,12,0.13)",
            borderRadius: 2,
            margin: "14px auto 28px",
          }}
        />

        {/* Browser icon */}
        <div
          aria-hidden="true"
          style={{
            width: 60,
            height: 60,
            background: "#F4EEE4",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E85A2C"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>

        {/* Heading */}
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            color: "#0E0E0C",
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}
        >
          Open in {targetBrowser} for the best experience
        </h2>

        {/* Body */}
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 14,
            lineHeight: 1.55,
            color: "#6A6A63",
          }}
        >
          {info.app}&apos;s built-in browser doesn&apos;t support all features. A few taps
          and everything works perfectly.
        </p>

        {/* iOS: numbered steps */}
        {isIOS && steps && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  background: "#F4EEE4",
                  borderRadius: 14,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    background: "#E85A2C",
                    color: "#fff",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0E0E0C", lineHeight: 1.4 }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Android: direct Chrome button */}
        {!isIOS && chromeUrl && (
          <a
            href={chromeUrl}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              padding: "17px 24px",
              background: "#E85A2C",
              color: "#fff",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              marginBottom: 12,
              boxSizing: "border-box",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Chrome-ish icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="#fff" />
              <path d="M12 8h8.94a10 10 0 1 0-1.33 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            Open in Chrome
          </a>
        )}

        {/* Dismiss */}
        <button
          onClick={dismiss}
          style={{
            display: "block",
            width: "100%",
            padding: "14px",
            background: "transparent",
            border: "none",
            color: "#6A6A63",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            textAlign: "center",
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
        >
          Continue in {info.app}&apos;s browser
        </button>
      </div>
    </>
  );
}

"use client";

import { useEffect } from "react";

export default function WidgetLoader({ publicKey }: { publicKey: string }) {
  useEffect(() => {
    if (!publicKey) return;

    // Preload hint so the browser can start fetching embed.js as early as
    // possible — before React hydration finishes and this effect fires.
    if (!document.querySelector('link[href="/embed.js"]')) {
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.href = "/embed.js";
      preload.as = "script";
      document.head.appendChild(preload);
    }

    const el = document.createElement("script");
    el.src = "/embed.js";
    el.setAttribute("data-qwikly-id", publicKey);
    el.setAttribute("data-api", window.location.origin);
    // Compact mode site-wide on qwikly.co.za so the demo widget doesn't
    // dominate any page. Customer deployments don't pass this flag, so their
    // widgets keep the default 375x540 size.
    el.setAttribute("data-compact", "true");
    if (window.location.pathname === "/") {
      el.setAttribute("data-peek", "true");
    }
    el.async = true;
    document.body.appendChild(el);

    return () => {
      try { document.body.removeChild(el); } catch {}
    };
  }, [publicKey]);

  return null;
}

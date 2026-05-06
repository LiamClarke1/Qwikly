"use client";

import { useEffect } from "react";

export default function WidgetLoader({ publicKey }: { publicKey: string }) {
  useEffect(() => {
    if (!publicKey) return;

    const el = document.createElement("script");
    el.src = "https://cdn.qwikly.co.za/embed.js";
    el.setAttribute("data-qwikly-id", publicKey);
    el.async = true;
    document.body.appendChild(el);

    return () => {
      try { document.body.removeChild(el); } catch {}
    };
  }, [publicKey]);

  return null;
}

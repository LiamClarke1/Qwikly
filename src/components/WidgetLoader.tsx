"use client";

import { useEffect } from "react";

export default function WidgetLoader() {
  useEffect(() => {
    const el = document.createElement("script");
    el.src = "https://cdn.qwikly.co.za/embed.js";
    el.setAttribute("data-qwikly-id", "qw_pk_deab090596b4");
    el.async = true;
    document.body.appendChild(el);

    return () => {
      try { document.body.removeChild(el); } catch {}
    };
  }, []);

  return null;
}

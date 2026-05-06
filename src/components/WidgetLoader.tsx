"use client";

import { useEffect } from "react";

const PUBLIC_KEY = "qw_pk_deab090596b4";

export default function WidgetLoader() {
  useEffect(() => {
    let el: HTMLScriptElement | null = null;

    fetch(`/api/widget-resolve?key=${PUBLIC_KEY}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.client_id) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__QW_CLIENT = data.client_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__QW_API = "/api";
        el = document.createElement("script");
        el.src = "/widget/widget.js";
        el.async = true;
        document.body.appendChild(el);
      })
      .catch(() => {});

    return () => {
      if (el) try { document.body.removeChild(el); } catch {}
    };
  }, []);

  return null;
}

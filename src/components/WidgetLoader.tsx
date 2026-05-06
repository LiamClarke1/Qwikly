"use client";

import { useEffect } from "react";

export default function WidgetLoader({ clientId }: { clientId: string }) {
  useEffect(() => {
    if (!clientId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__QW_CLIENT = clientId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__QW_API = "/api";

    const el = document.createElement("script");
    el.src = "/widget/widget.js";
    el.async = true;
    document.body.appendChild(el);

    return () => {
      try { document.body.removeChild(el); } catch {}
    };
  }, [clientId]);

  return null;
}

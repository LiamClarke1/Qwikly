"use client";

import { useEffect } from "react";

// Qwikly's own tenant id. Terminal 3 (T3.9) is moving the magic "1" sentinel
// behind QWIKLY_OWNER_CLIENT_ID — once that ships, this NEXT_PUBLIC_* mirror
// will be wired in their PR. Until then "1" matches what embed.js currently
// uses for Qwikly's own account.
const TENANT_ID = process.env.NEXT_PUBLIC_QWIKLY_OWNER_CLIENT_ID || "1";

// TODO (supervisor): set this contact-page greeting copy on the Qwikly tenant's
// branding row so the widget opens with: "Got a question about Qwikly? Ask away."
// embed.js reads the greeting from the tenant's branding API, not from a data-
// attribute, so it has to be configured server-side.
export default function ContactDemoWidget() {
  useEffect(() => {
    if (document.querySelector('script[data-qwikly-loader="contact"]')) return;

    const s = document.createElement("script");
    s.src = "/embed.js";
    s.async = true;
    s.setAttribute("data-qwikly-id", TENANT_ID);
    // Point the widget at the same origin the page is served from, so
    // embed.js doesn't hard-code https://qwikly.co.za and break in dev/preview.
    s.setAttribute("data-api", window.location.origin);
    // Compact mode shrinks the panel from 375x540 to 320x440 so it doesn't
    // dominate the contact page. Customer deployments don't pass this flag,
    // so their default size is unchanged.
    s.setAttribute("data-compact", "true");
    s.setAttribute("data-qwikly-loader", "contact");

    document.body.appendChild(s);
  }, []);

  return null;
}

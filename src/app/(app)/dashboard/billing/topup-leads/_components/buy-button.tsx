"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type PackSize = "small" | "medium" | "large";

/**
 * Triggers a lead-pack purchase via the PayFast adhoc endpoint and
 * redirects the browser to the returned hosted-checkout URL. The page
 * itself stays a server component — this button is only here because we
 * need browser-side fetch + navigation to finish the redirect.
 */
export function BuyLeadPackButton({ size, label }: { size: PackSize; label: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="primary"
      className="w-full justify-center"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/payfast/topup-leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ size }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `Purchase failed (${res.status})`);
          }
          const data = (await res.json().catch(() => ({}))) as { url?: string };
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        } catch (err) {
          setLoading(false);
          alert(err instanceof Error ? err.message : "Could not start checkout");
        }
      }}
    >
      {label}
    </Button>
  );
}

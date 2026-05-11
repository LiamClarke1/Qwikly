"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type PackName = "small" | "medium" | "large";

/**
 * Triggers an AI credit top-up via the PayFast adhoc endpoint and
 * redirects the browser to the returned hosted-checkout URL.
 */
export function BuyAiPackButton({ pack, label }: { pack: PackName; label: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="primary"
      className="w-full justify-center"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/payfast/topup-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pack }),
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

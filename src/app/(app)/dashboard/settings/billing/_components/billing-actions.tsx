"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fmtDateLong } from "@/lib/money";
import { X, AlertTriangle } from "lucide-react";

/**
 * Tiny client-side action buttons for the billing settings page. Each one
 * POSTs to a PayFast API route that returns a `{ url }` payload for hosted
 * checkout, then redirects the browser. The page itself stays a server
 * component so the entitlement snapshot renders without a client round-trip.
 *
 * The undo-pending button is the one exception — it has no checkout step,
 * so it just refreshes the page after the POST returns ok.
 */

async function postAndRedirect(path: string, body?: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  if (data.url) {
    window.location.href = data.url;
  }
  return data;
}

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="primary"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await postAndRedirect("/api/payfast/upgrade");
        } catch (err) {
          setLoading(false);
          alert(err instanceof Error ? err.message : "Upgrade failed");
        }
      }}
    >
      Upgrade plan
    </Button>
  );
}

export function DowngradeButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="outline"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await postAndRedirect("/api/payfast/downgrade");
          // No URL returned for scheduled downgrades — refresh to show the
          // pending banner.
          window.location.reload();
        } catch (err) {
          setLoading(false);
          alert(err instanceof Error ? err.message : "Downgrade failed");
        }
      }}
    >
      Downgrade plan
    </Button>
  );
}

export function UpdateCardButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="outline"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await postAndRedirect("/api/payfast/update-card");
        } catch (err) {
          setLoading(false);
          alert(err instanceof Error ? err.message : "Could not start card update");
        }
      }}
    >
      Update payment method
    </Button>
  );
}

export function CancelButton({ periodEnd }: { periodEnd: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Button
        variant="danger"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        Cancel subscription
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-card border border-[var(--border)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-h2 text-fg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Cancel subscription?
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-fg-muted hover:text-fg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-small text-fg-muted mb-5 leading-relaxed">
              Your plan stays active until{" "}
              <span className="text-fg font-medium">
                {periodEnd ? fmtDateLong(periodEnd) : "the end of your current period"}
              </span>
              . After that the assistant pauses and you won&apos;t be charged again.
              Subscription fees are non-refundable.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={loading}
              >
                Keep subscription
              </Button>
              <Button
                variant="danger"
                loading={loading}
                className="flex-1"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await postAndRedirect("/api/payfast/cancel");
                    window.location.reload();
                  } catch (err) {
                    setLoading(false);
                    alert(err instanceof Error ? err.message : "Cancel failed");
                  }
                }}
              >
                Yes, cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function UndoPendingButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/payfast/undo-pending", { method: "POST" });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `Undo failed (${res.status})`);
          }
          router.refresh();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Undo failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      Undo
    </Button>
  );
}

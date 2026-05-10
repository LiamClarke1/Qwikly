"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ResultModalState =
  | { kind: "success"; count: number }
  | { kind: "schema_pending" }
  | { kind: "error"; message: string };

export function ResultModal({
  state,
  onClose,
  onAnother,
}: {
  state: ResultModalState | null;
  onClose: () => void;
  onAnother: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-[14px] bg-surface-card border border-[var(--border)] shadow-[var(--shadow-sm)] p-6 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-fg-muted hover:text-fg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {state.kind === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-ember/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-ember" />
            </div>
            <h2 className="text-h2 text-fg">
              Generated {state.count} prospects.
            </h2>
            <p className="text-body text-fg-muted mt-2">
              They are now in your prospect pool.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/pipeline/prospects" className="flex-1">
                <Button variant="primary" className="w-full">
                  View prospects
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onAnother}
              >
                Generate another batch
              </Button>
            </div>
          </>
        )}

        {state.kind === "schema_pending" && (
          <>
            <h2 className="text-h2 text-fg">Schema not yet migrated</h2>
            <p className="text-body text-fg-muted mt-2">
              The pipeline_prospects table has not been created in this
              environment yet. Once the migration ships, this generator will
              persist prospects automatically.
            </p>
            <div className="mt-6">
              <Button variant="primary" onClick={onClose}>
                Got it
              </Button>
            </div>
          </>
        )}

        {state.kind === "error" && (
          <>
            <h2 className="text-h2 text-fg">Could not generate</h2>
            <p className="text-body text-fg-muted mt-2">{state.message}</p>
            <div className="mt-6">
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

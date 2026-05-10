"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fmt } from "@/lib/money";

export interface PerJobToggleProps {
  enabled: boolean;
  rateZar: number;
  onToggle: (next: boolean) => Promise<void> | void;
}

export function PerJobToggle({ enabled, rateZar, onToggle }: PerJobToggleProps) {
  const [confirmingOff, setConfirmingOff] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleOn = () => {
    startTransition(async () => {
      await onToggle(true);
    });
  };

  const requestToggleOff = () => {
    setConfirmingOff(true);
  };

  const confirmOff = () => {
    startTransition(async () => {
      await onToggle(false);
      setConfirmingOff(false);
    });
  };

  return (
    <div className="bg-surface-card border border-line rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-small font-semibold text-fg">
              Pay-per-job add-on
            </p>
            <span
              className={cn(
                "inline-flex items-center text-tiny font-medium px-2 py-0.5 rounded-full",
                enabled
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-white/5 text-fg-muted border border-line",
              )}
            >
              {enabled ? "ON" : "OFF"}
            </span>
          </div>
          <p className="text-tiny text-fg-muted mt-1.5 leading-relaxed max-w-md">
            When this is on, every booking that is marked completed or paid logs a {fmt(rateZar)} success fee here for your review. Toggle off any time, lines already pending will still be invoiced.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {enabled ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={requestToggleOff}
              loading={isPending && confirmingOff}
              disabled={isPending}
            >
              Toggle off
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={toggleOn}
              loading={isPending}
              disabled={isPending}
            >
              Toggle on
            </Button>
          )}
        </div>
      </div>

      {confirmingOff && (
        <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-4">
          <p className="text-small font-medium text-fg">Are you sure?</p>
          <p className="text-tiny text-fg-muted mt-1 leading-relaxed">
            Pending lines will still be invoiced. New bookings will not generate lines once you turn this off.
          </p>
          <div className="flex gap-2 justify-end mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingOff(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmOff}
              loading={isPending}
            >
              Yes, turn off
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

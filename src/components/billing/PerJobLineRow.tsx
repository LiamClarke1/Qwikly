"use client";

import { useState, useTransition } from "react";
import { fmt, fmtDate } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { AlertCircle, X } from "lucide-react";

export type PerJobLineStatus =
  | "pending"
  | "approved"
  | "disputed"
  | "invoiced"
  | "waived"
  | "paid";

export interface PerJobLineRowProps {
  id: string;
  customerName: string | null;
  bookingStatus: string | null;
  bookingDate: string | null;
  amountZar: number;
  lineStatus: PerJobLineStatus;
  onDispute?: (lineId: string, note: string) => Promise<void> | void;
  disabled?: boolean;
}

const STATUS_PILL: Record<PerJobLineStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending review",
    className: "bg-white/5 text-fg border border-line",
  },
  approved: {
    label: "Approved",
    className:
      "bg-success/10 text-success border border-success/20",
  },
  disputed: {
    label: "Disputed",
    className: "bg-danger/10 text-danger border border-danger/20",
  },
  invoiced: {
    label: "Invoiced",
    className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  waived: {
    label: "Waived",
    className: "bg-white/5 text-fg-muted border border-line",
  },
  paid: {
    label: "Paid",
    className: "bg-success/10 text-success border border-success/20",
  },
};

export function PerJobLineRow({
  id,
  customerName,
  bookingStatus,
  bookingDate,
  amountZar,
  lineStatus,
  onDispute,
  disabled,
}: PerJobLineRowProps) {
  const [showDispute, setShowDispute] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const pill = STATUS_PILL[lineStatus];
  const canDispute = lineStatus === "pending" || lineStatus === "approved";

  const submitDispute = () => {
    if (!note.trim() || !onDispute) return;
    startTransition(async () => {
      await onDispute(id, note.trim());
      setShowDispute(false);
      setNote("");
    });
  };

  return (
    <>
      <tr className="border-b border-line/50">
        <td className="px-4 py-3 text-small text-fg-muted whitespace-nowrap">
          {bookingDate ? fmtDate(bookingDate) : "Pending"}
        </td>
        <td className="px-4 py-3 text-small text-fg">
          {customerName ?? "Unnamed lead"}
        </td>
        <td className="px-4 py-3 text-small text-fg-muted capitalize">
          {bookingStatus ?? "booked"}
        </td>
        <td className="px-4 py-3 text-small text-fg font-medium whitespace-nowrap">
          {fmt(amountZar)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={cn(
              "inline-flex items-center text-tiny font-medium px-2.5 py-1 rounded-full",
              pill.className,
            )}
          >
            {pill.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          {canDispute ? (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              disabled={disabled || isPending}
              className="text-small text-brand hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Dispute
            </button>
          ) : (
            <span className="text-tiny text-fg-faint">,</span>
          )}
        </td>
      </tr>

      {showDispute && (
        <tr>
          <td colSpan={6} className="bg-surface-card/60 px-4 py-4 border-b border-line/50">
            <div className="max-w-xl space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                <div>
                  <p className="text-small font-medium text-fg">
                    Dispute this line
                  </p>
                  <p className="text-tiny text-fg-muted mt-0.5">
                    Add a short note explaining why this booking should not be billed. We review every dispute within 2 business days.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDispute(false);
                    setNote("");
                  }}
                  className="ml-auto text-fg-muted hover:text-fg"
                  aria-label="Close dispute"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Lead never showed up, the booking was cancelled."
                className="w-full bg-white/5 border border-line rounded-xl px-3 py-2 text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/40 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDispute(false);
                    setNote("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={submitDispute}
                  loading={isPending}
                  disabled={!note.trim() || isPending}
                >
                  Submit dispute
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

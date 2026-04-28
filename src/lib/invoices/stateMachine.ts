import type { InvoiceStatus } from "./types";

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft:        ["scheduled", "sent", "cancelled"],
  scheduled:    ["sent", "cancelled", "draft"],
  sent:         ["viewed", "paid", "partial_paid", "overdue", "cancelled", "disputed"],
  viewed:       ["paid", "partial_paid", "overdue", "cancelled", "disputed"],
  partial_paid: ["paid", "overdue", "disputed"],
  overdue:      ["paid", "partial_paid", "written_off", "disputed"],
  paid:         ["refunded", "disputed"],
  cancelled:    [],
  disputed:     ["paid", "cancelled", "written_off"],
  written_off:  [],
  refunded:     [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid invoice status transition: ${from} → ${to}`);
  }
}

export function isEditable(status: InvoiceStatus): boolean {
  return status === "draft" || status === "scheduled";
}

export function isTerminal(status: InvoiceStatus): boolean {
  return status === "cancelled" || status === "written_off" || status === "refunded";
}

export function requiresVersionSnapshot(status: InvoiceStatus): boolean {
  return !isEditable(status);
}

export function isCommissionable(status: InvoiceStatus): boolean {
  return status === "paid" || status === "partial_paid";
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:        "Draft",
  scheduled:    "Scheduled",
  sent:         "Sent",
  viewed:       "Viewed",
  partial_paid: "Partially paid",
  paid:         "Paid",
  overdue:      "Overdue",
  cancelled:    "Cancelled",
  disputed:     "Disputed",
  written_off:  "Written off",
  refunded:     "Refunded",
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft:        "bg-white/5 text-fg-muted border border-white/10",
  scheduled:    "bg-brand/10 text-brand border border-brand/20",
  sent:         "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  viewed:       "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  partial_paid: "bg-warning/10 text-warning border border-warning/20",
  paid:         "bg-success/10 text-success border border-success/20",
  overdue:      "bg-danger/10 text-danger border border-danger/20",
  cancelled:    "bg-white/5 text-fg-subtle border border-white/10",
  disputed:     "bg-warning/10 text-warning border border-warning/20",
  written_off:  "bg-danger/10 text-fg-muted border border-danger/10",
  refunded:     "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};

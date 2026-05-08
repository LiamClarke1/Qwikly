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
  draft:        "bg-slate-100 text-slate-600 border border-slate-200",
  scheduled:    "bg-[#E85A2C]/10 text-[#E85A2C] border border-[#E85A2C]/30",
  sent:         "bg-blue-50 text-blue-700 border border-blue-200",
  viewed:       "bg-violet-50 text-violet-700 border border-violet-200",
  partial_paid: "bg-amber-50 text-amber-700 border border-amber-200",
  paid:         "bg-emerald-50 text-emerald-700 border border-emerald-200",
  overdue:      "bg-red-50 text-red-600 border border-red-200",
  cancelled:    "bg-slate-100 text-slate-500 border border-slate-200",
  disputed:     "bg-amber-50 text-amber-700 border border-amber-200",
  written_off:  "bg-red-50 text-red-500 border border-red-100",
  refunded:     "bg-violet-50 text-violet-700 border border-violet-200",
};

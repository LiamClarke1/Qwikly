"use client";

import { useState } from "react";
import { PerJobToggle } from "@/components/billing/PerJobToggle";
import {
  PerJobLineRow,
  type PerJobLineStatus,
} from "@/components/billing/PerJobLineRow";
import { setLineStatus, setAddonEnabled } from "./actions";

export interface PerJobRow {
  id: string;
  customerName: string | null;
  bookingStatus: string | null;
  bookingDate: string | null;
  amountZar: number;
  lineStatus: PerJobLineStatus;
}

export interface PerJobClientViewProps {
  enabled: boolean;
  rateZar: number;
  rows: PerJobRow[];
}

// Wraps the toggle and the line table on the dashboard page. Owns the
// toggle/dispute callbacks so the server page can stay pure async data.

export function PerJobClientView({
  enabled,
  rateZar,
  rows,
}: PerJobClientViewProps) {
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (next: boolean) => {
    setError(null);
    const res = await setAddonEnabled(next);
    if (!res.ok) setError(res.error);
  };

  const handleDispute = async (lineId: string, note: string) => {
    setError(null);
    const res = await setLineStatus(lineId, "disputed", true, note);
    if (!res.ok) setError(res.error);
  };

  return (
    <>
      <PerJobToggle
        enabled={enabled}
        rateZar={rateZar}
        onToggle={handleToggle}
      />

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-2.5 text-small text-danger">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-surface-card border border-line rounded-2xl p-10 text-center">
          <p className="text-body text-fg">No pay-per-job lines yet.</p>
          <p className="text-small text-fg-muted mt-1.5">
            They appear here automatically once a booking is marked completed.
          </p>
        </div>
      ) : (
        <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-tiny font-semibold text-fg-muted uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-tiny font-semibold text-fg-muted uppercase tracking-wide">
                    Lead
                  </th>
                  <th className="px-4 py-3 text-left text-tiny font-semibold text-fg-muted uppercase tracking-wide">
                    Booking
                  </th>
                  <th className="px-4 py-3 text-left text-tiny font-semibold text-fg-muted uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-tiny font-semibold text-fg-muted uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-tiny font-semibold text-fg-muted uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <PerJobLineRow
                    key={row.id}
                    id={row.id}
                    customerName={row.customerName}
                    bookingStatus={row.bookingStatus}
                    bookingDate={row.bookingDate}
                    amountZar={row.amountZar}
                    lineStatus={row.lineStatus}
                    onDispute={handleDispute}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

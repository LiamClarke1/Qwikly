"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { RoiBookingRow } from "@/lib/reports/roi";

const STATUS_TONE: Record<string, "brand" | "success" | "danger" | "warning" | "neutral"> = {
  booked: "brand",
  completed: "success",
  cancelled: "danger",
  no_show: "warning",
  "no-show": "warning",
  tentative: "warning",
  disputed: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  "no-show": "No-show",
  tentative: "Tentative",
  disputed: "Disputed",
};

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  direct: "Direct",
};

export function RecentBookingsTable({ rows }: { rows: RoiBookingRow[] }) {
  return (
    <Card padded={false}>
      <div className="p-5 pb-3">
        <CardHeader
          title="Recent bookings"
          description="The last 10 jobs Qwikly put on your calendar."
          className="!mb-0"
        />
      </div>

      {rows.length === 0 ? (
        <div className="px-5 pb-6">
          <p className="text-small text-fg-muted">
            No bookings yet. As soon as Qwikly books a job, it shows up here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="text-fg-subtle border-y border-[var(--border)]">
                <th className="text-left font-medium px-5 py-2.5">Date</th>
                <th className="text-left font-medium px-5 py-2.5">Customer</th>
                <th className="text-left font-medium px-5 py-2.5">Channel</th>
                <th className="text-left font-medium px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = STATUS_TONE[row.status] ?? "neutral";
                const label = STATUS_LABEL[row.status] ?? row.status;
                return (
                  <tr key={row.id} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-5 py-3 font-mono num text-fg-muted whitespace-nowrap">
                      {formatDateTime(row.date)}
                    </td>
                    <td className="px-5 py-3 text-fg">{row.customerName}</td>
                    <td className="px-5 py-3 text-fg-muted">
                      {CHANNEL_LABEL[row.channel] ?? row.channel}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={tone}>{label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

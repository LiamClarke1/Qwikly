import { fmt } from "@/lib/money";

export interface PerJobSummaryCardProps {
  monthLabel: string;
  totalLines: number;
  pendingLines: number;
  totalAmountZar: number;
}

// Pure presentational summary card. Surfaces the headline numbers above the
// table on the dashboard page: how many lines this month, how many still
// pending review, and the total amount on those lines.

export function PerJobSummaryCard({
  monthLabel,
  totalLines,
  pendingLines,
  totalAmountZar,
}: PerJobSummaryCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <SummaryTile
        label={`Lines logged in ${monthLabel}`}
        value={totalLines.toString()}
      />
      <SummaryTile
        label="Pending review"
        value={pendingLines.toString()}
        accent={pendingLines > 0}
      />
      <SummaryTile label="Total this month" value={fmt(totalAmountZar)} />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-card border border-line rounded-2xl p-5">
      <p className="text-tiny text-fg-muted">{label}</p>
      <p
        className={
          "text-h2 mt-1 " + (accent ? "text-brand" : "text-fg")
        }
      >
        {value}
      </p>
    </div>
  );
}

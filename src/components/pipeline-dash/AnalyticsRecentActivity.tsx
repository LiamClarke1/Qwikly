"use client";

export interface ActivityRow {
  id: string;
  business: string;
  description: string;
  at: string;
}

function formatHHMM(iso: string): string {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "--:--";
  }
}

export function AnalyticsRecentActivity({
  activity,
}: {
  activity: ActivityRow[];
}) {
  return (
    <div className="ed-card flex flex-col gap-3">
      <div className="font-display text-[18px] tracking-tight text-ink">
        Recent activity
      </div>
      {activity.length === 0 ? (
        <p className="text-[13.5px] text-ink-500">No activity yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/[0.06]">
          {activity.slice(0, 5).map((a) => (
            <li
              key={a.id}
              className="flex items-baseline gap-3 py-2.5 text-[13.5px] text-ink"
            >
              <span className="font-mono text-[12px] text-ink-500 shrink-0">
                {formatHHMM(a.at)}
              </span>
              <span className="text-ink-500">·</span>
              <span className="font-medium truncate">{a.business}</span>
              <span className="text-ink-500">·</span>
              <span className="text-ink-500 truncate">{a.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

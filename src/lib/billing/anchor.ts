/**
 * Billing anchor date math.
 * All functions operate in Africa/Johannesburg timezone.
 */

const TZ = "Africa/Johannesburg";

/** Get today's date in SAST as a Date at midnight local. */
export function todaySast(): Date {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find(p => p.type === "year")!.value);
  const m = Number(parts.find(p => p.type === "month")!.value);
  const d = Number(parts.find(p => p.type === "day")!.value);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Last day of the month for a given UTC date. */
export function daysInMonth(year: number, monthZeroIdx: number): number {
  return new Date(Date.UTC(year, monthZeroIdx + 1, 0)).getUTCDate();
}

/**
 * Compute the next billing anchor date for a client.
 * - If anchor_day exists in this month and we're before/on it: return this month's anchor.
 * - If we're past this month's anchor: return next month's (clamped to month length).
 * - Month-end overflow: if anchor_day > days in month, billing falls on last day.
 */
export function nextAnchorDate(anchorDay: number, from?: Date): Date {
  if (anchorDay < 1 || anchorDay > 31) {
    throw new Error(`Invalid anchorDay: ${anchorDay}`);
  }
  const today = from ?? todaySast();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();

  const thisMonthCap = daysInMonth(y, m);
  const thisMonthAnchor = Math.min(anchorDay, thisMonthCap);

  if (d <= thisMonthAnchor) {
    return new Date(Date.UTC(y, m, thisMonthAnchor));
  }

  const nextY = m === 11 ? y + 1 : y;
  const nextM = m === 11 ? 0 : m + 1;
  const nextCap = daysInMonth(nextY, nextM);
  const nextAnchor = Math.min(anchorDay, nextCap);
  return new Date(Date.UTC(nextY, nextM, nextAnchor));
}

/** Days from `from` to next anchor, inclusive of today. */
export function daysUntilNextAnchor(anchorDay: number, from?: Date): number {
  const today = from ?? todaySast();
  const next = nextAnchorDate(anchorDay, today);
  const diffMs = next.getTime() - today.getTime();
  return Math.round(diffMs / 86_400_000);
}

/**
 * Whether today is a billing day for this anchor.
 * Includes month-end overflow: anchor=31 in February → bills on Feb 28/29.
 */
export function isAnchorDayToday(anchorDay: number, from?: Date): boolean {
  const today = from ?? todaySast();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  const lastDay = daysInMonth(y, m);

  if (d === anchorDay) return true;
  if (d === lastDay && anchorDay > lastDay) return true;
  return false;
}

/**
 * Compute the billing window for an upcoming invoice.
 * Window is [previousAnchor, nextAnchor) so usage in the upcoming
 * invoice's window is what gets billed today.
 */
export function billingWindowEndingAt(anchorEnd: Date): { start: Date; end: Date } {
  const y = anchorEnd.getUTCFullYear();
  const m = anchorEnd.getUTCMonth();
  const d = anchorEnd.getUTCDate();

  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  const prevCap = daysInMonth(prevY, prevM);
  const start = new Date(Date.UTC(prevY, prevM, Math.min(d, prevCap)));

  return { start, end: anchorEnd };
}

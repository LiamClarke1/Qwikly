// Shortened from 14 → 7 days (2026-05-10): a week is enough for an owner
// to see leads land in their inbox without burning through their lead cap
// or our API budget over a fortnight of free traffic.
export const TRIAL_DAYS = 7;

export function trialEndsFromNow(start: Date = new Date()): Date {
  return new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

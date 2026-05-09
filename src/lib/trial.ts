export const TRIAL_DAYS = 14;

export function trialEndsFromNow(start: Date = new Date()): Date {
  return new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

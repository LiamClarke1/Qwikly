import { supabaseAdmin } from "./supabase-server";

export type RateWindow = "minute" | "hour";

function windowStartFor(window: RateWindow): Date {
  const d = new Date();
  d.setMilliseconds(0);
  d.setSeconds(0);
  if (window === "hour") d.setMinutes(0);
  return d;
}

function windowSizeMs(window: RateWindow): number {
  return window === "hour" ? 3_600_000 : 60_000;
}

/**
 * Returns true if within rate limit, false if exceeded.
 * Uses atomic DB increment via increment_rate_window RPC — serverless-safe.
 * The per-(apiKey, windowStart) tuple gives independent counters for minute vs hour windows.
 */
export async function checkRateLimit(
  apiKey: string,
  maxPerWindow: number,
  window: RateWindow = "minute"
): Promise<boolean> {
  const db = supabaseAdmin();
  const start = windowStartFor(window);

  const { data: count, error } = await db.rpc("increment_rate_window", {
    p_api_key: apiKey,
    p_window_start: start.toISOString(),
  });

  if (error) {
    console.error("[rate-limit] rpc error:", error.message);
    return true; // fail open — don't block legitimate traffic on DB errors
  }

  return (count as number) <= maxPerWindow;
}

/** Seconds until the current rate window rolls over. Min 1. */
export function retryAfterSeconds(window: RateWindow = "minute"): number {
  const start = windowStartFor(window);
  const remaining = windowSizeMs(window) - (Date.now() - start.getTime());
  return Math.max(1, Math.ceil(remaining / 1000));
}

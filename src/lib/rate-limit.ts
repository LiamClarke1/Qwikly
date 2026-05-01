import { supabaseAdmin } from "./supabase-server";

/**
 * Returns true if within rate limit, false if exceeded.
 * Uses atomic DB increment via increment_rate_window RPC — serverless-safe.
 */
export async function checkRateLimit(
  apiKey: string,
  maxPerMinute: number
): Promise<boolean> {
  const db = supabaseAdmin();
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);

  const { data: count, error } = await db.rpc("increment_rate_window", {
    p_api_key: apiKey,
    p_window_start: windowStart.toISOString(),
  });

  if (error) {
    console.error("[rate-limit] rpc error:", error.message);
    return true; // fail open — don't block legitimate traffic on DB errors
  }

  return (count as number) <= maxPerMinute;
}

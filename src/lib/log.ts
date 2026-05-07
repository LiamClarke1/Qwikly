// T3.11 — structured logging helper.
// Emits one JSON object per line so Vercel Logs (and any pipe-into-Loki/Logtail
// downstream) can parse, filter, and alert on real fields rather than free-form
// strings. Use instead of bare console.* in API route handlers. Keep payloads
// small; do NOT include full request bodies or PII.

type Level = "info" | "warn" | "error";

export function log(
  level: Level,
  msg: string,
  data?: Record<string, unknown>
): void {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(data ?? {}),
  };
  // Map level to the matching console method so log routers (Vercel, Datadog,
  // etc.) keep their built-in severity tagging.
  // eslint-disable-next-line no-console
  console[level](JSON.stringify(payload));
}

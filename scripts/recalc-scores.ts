/**
 * One-shot recompute of risk and health scores for every CRM client.
 *
 * Equivalent to clicking "Recalculate scores" on /admin/risk, but without
 * needing the dev server, an admin session, or an HTTP round-trip. Same
 * function the daily cron and the admin UI both call.
 *
 * Run:
 *   npx tsx scripts/recalc-scores.ts
 *
 * Required env (loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { recomputeAllClientScores } from "../src/lib/analytics/risk-health";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("=== RECALC RISK + HEALTH SCORES ===");
  console.log("Calling recomputeAllClientScores against:", url);

  const startedAt = Date.now();
  const result = await recomputeAllClientScores(sb);
  const elapsedMs = Date.now() - startedAt;
  const seconds = Math.round(elapsedMs / 100) / 10;

  console.log("\n=== RESULT ===");
  console.log(`  updated:  ${result.updated}`);
  console.log(`  skipped:  ${result.skipped}`);
  console.log(`  errors:   ${result.errors}`);
  console.log(`  elapsed:  ${seconds}s (${elapsedMs}ms)`);

  if (result.errors > 0) {
    console.error(`\nCompleted with ${result.errors} error(s). See [risk-health] log lines above for per-client details.`);
    process.exit(1);
  }

  console.log(`\nDone. Rescored ${result.updated} client(s) in ${seconds}s.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\nScript crashed:", err);
  process.exit(1);
});

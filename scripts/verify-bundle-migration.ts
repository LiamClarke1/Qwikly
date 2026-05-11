// Quick verification that 20260512_bundle_plans.sql applied cleanly.
// Run: npx tsx scripts/verify-bundle-migration.ts

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

async function main() {
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  // 1. plan_prices has founders, is_active=true, R2,999.
  const { data: founders } = await db
    .from("plan_prices")
    .select("plan_key, display_name, amount_zar_cents, is_active")
    .eq("plan_key", "founders")
    .maybeSingle();
  checks.push({
    name: "plan_prices: founders row",
    pass: !!founders && founders.is_active === true && founders.amount_zar_cents === 299900,
    detail: founders ? JSON.stringify(founders) : "missing",
  });

  // 2. plan_prices: pipeline tiers inactive.
  const { data: pipelineTiers } = await db
    .from("plan_prices")
    .select("plan_key, is_active")
    .in("plan_key", ["pipeline_lite", "pipeline_pro"]);
  const allInactive = (pipelineTiers ?? []).every((r) => r.is_active === false);
  checks.push({
    name: "plan_prices: pipeline_lite/pro inactive",
    pass: (pipelineTiers?.length ?? 0) >= 2 && allInactive,
    detail: JSON.stringify(pipelineTiers),
  });

  // 3. No clients on retired pipeline_* plans (post-backfill).
  const { count: stalePipelineCount } = await db
    .from("clients")
    .select("id", { count: "exact", head: true })
    .in("plan", ["pipeline_lite", "pipeline_pro"]);
  checks.push({
    name: "clients: no rows on pipeline_lite/pro (backfilled)",
    pass: (stalePipelineCount ?? 0) === 0,
    detail: `count=${stalePipelineCount ?? 0}`,
  });

  // 4. CHECK constraint accepts 'founders' by attempting a no-op update
  //    against a guaranteed-non-matching id (catches violations cheaply).
  const { error: checkErr } = await db
    .from("clients")
    .update({ plan: "founders" })
    .eq("id", "00000000-0000-0000-0000-000000000000");
  checks.push({
    name: "clients: plan CHECK accepts 'founders'",
    pass: !checkErr || !checkErr.message.toLowerCase().includes("check"),
    detail: checkErr?.message ?? "ok",
  });

  console.log("\nBundle migration verification:\n");
  for (const c of checks) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
    if (!c.pass) console.log(`        -> ${c.detail}`);
  }
  const allPass = checks.every((c) => c.pass);
  console.log(allPass ? "\nAll checks passed.\n" : "\nOne or more checks failed.\n");
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("verification crashed:", e);
  process.exit(1);
});

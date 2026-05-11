// Quick verification that 20260512_bundle_quota_bumps.sql applied cleanly.
// Run: npx tsx scripts/verify-quota-bumps.ts
//
// Confirms every client on a known bundle plan has the new daily quota:
//   founders   -> 10
//   business   -> 15
//   enterprise -> 25

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

const EXPECTED: Record<string, number> = {
  founders: 10,
  business: 15,
  enterprise: 25,
};

async function main() {
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  for (const [plan, expected] of Object.entries(EXPECTED)) {
    const { data, error } = await db
      .from("clients")
      .select("id, pipeline_daily_quota")
      .eq("plan", plan);

    if (error) {
      checks.push({
        name: `clients: ${plan} quota query`,
        pass: false,
        detail: error.message,
      });
      continue;
    }

    const rows = data ?? [];
    const offenders = rows.filter((r) => r.pipeline_daily_quota !== expected);

    checks.push({
      name: `clients: every '${plan}' row has pipeline_daily_quota=${expected}`,
      pass: offenders.length === 0,
      detail:
        offenders.length === 0
          ? `${rows.length} row(s) checked, all correct`
          : `${offenders.length}/${rows.length} row(s) wrong: ${JSON.stringify(
              offenders.slice(0, 5),
            )}${offenders.length > 5 ? " ..." : ""}`,
    });
  }

  console.log("\nQuota bumps verification:\n");
  for (const c of checks) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
    console.log(`        -> ${c.detail}`);
  }
  const allPass = checks.every((c) => c.pass);
  console.log(allPass ? "\nAll checks passed.\n" : "\nOne or more checks failed.\n");
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("verification crashed:", e);
  process.exit(1);
});

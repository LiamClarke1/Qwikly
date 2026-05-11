// scripts/verify-pipeline-tenant.ts
//
// Verification harness for an Outbound Pipeline tenant.
// Run before flipping a new client from setup_complete=false to true.
//
// Usage: npx tsx scripts/verify-pipeline-tenant.ts <client_id>
//
// Exits 0 on all green, 1 on any failure.

import "dotenv/config";
import { supabaseAdmin } from "../src/lib/supabase-server";
import { getSetupState } from "../src/lib/pipeline/setup-state";
import { runGeneratorAndInsert } from "../src/lib/pipeline/generator/run";
import { notifyLeadCaptured } from "../src/lib/notify-lead";

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

async function main() {
  const clientIdArg = process.argv[2];
  if (!clientIdArg) {
    console.error("Usage: npx tsx scripts/verify-pipeline-tenant.ts <client_id>");
    process.exit(2);
  }

  const clientId = Number(clientIdArg);
  if (!Number.isFinite(clientId)) {
    console.error(`Invalid client_id: ${clientIdArg}`);
    process.exit(2);
  }

  const checks: Check[] = [];
  const db = supabaseAdmin();

  const { data: client } = await db
    .from("clients")
    .select("id, auth_user_id, plan, products, notification_email")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) {
    console.error(`No client row for id=${clientId}`);
    process.exit(1);
  }
  const c = client as {
    id: number;
    auth_user_id: string;
    plan: string;
    products: string[] | null;
    notification_email: string | null;
  };

  // Check 1: outbound product flag
  const hasOutbound = Array.isArray(c.products) && c.products.includes("outbound");
  checks.push({
    name: "client has outbound product",
    pass: hasOutbound,
    detail: `products=${JSON.stringify(c.products)}`,
  });

  // Check 2: ICP saved
  // getSetupState takes the tenant id (clients.id BIGINT or businesses.id UUID).
  // For the v1 clients flow we pass clients.id; the helper resolves via the
  // bridge internally and returns the persisted ICP.
  const state = await getSetupState(c.id);
  checks.push({
    name: "ICP saved",
    pass: state.status === "generated",
    detail: `status=${state.status} last_generated_at=${state.last_generated_at ?? "null"}`,
  });

  // Check 3: business profile exists for this auth user
  const { data: business } = await db
    .from("businesses")
    .select("id, name")
    .eq("user_id", c.auth_user_id)
    .maybeSingle();
  const businessRow = business as { id: string; name: string } | null;
  const businessId = businessRow?.id ?? null;
  checks.push({
    name: "business profile exists",
    pass: !!businessId,
    detail: businessId
      ? `business_id=${businessId} name=${businessRow?.name ?? ""}`
      : "no businesses row for this user",
  });

  // Check 4: generator produces >= 3 high-fit verified prospects
  if (businessId) {
    try {
      const r = await runGeneratorAndInsert({
        clientId: c.id,
        businessId,
        plan: c.plan,
        count: 3,
        batchKind: "daily_trickle",
      });
      checks.push({
        name: "generator produces >=3 high-fit verified prospects",
        pass: r.created >= 3 && !r.capReached,
        detail: `created=${r.created} capReached=${r.capReached}`,
      });
    } catch (err) {
      checks.push({
        name: "generator produces >=3 high-fit verified prospects",
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    checks.push({
      name: "generator produces >=3 high-fit verified prospects",
      pass: false,
      detail: "skipped (no business row)",
    });
  }

  // Check 5: lead notification end-to-end
  // Real signature (from src/lib/notify-lead.ts):
  //   notifyLeadCaptured({ clientId?, businessId?, conversationId?, lead })
  //   lead requires { name, contact, need, preferredTime, visitorEmail }.
  // We pass clientId so the helper bridges to the businesses row and resolves
  // the recipient via env override -> notification_email -> contact_email ->
  // auth user email. Omitting conversationId skips the messages/documents
  // fetch. The function returns a result object rather than throwing on
  // recoverable failures (disabled, no_recipient, no_resend_key, send_failed),
  // so we treat ok=true as pass and everything else as fail with reason.
  try {
    const result = await notifyLeadCaptured({
      clientId: c.id,
      lead: {
        name: "Verification Harness",
        contact: "verify@qwikly.co.za",
        need: "Pipeline verification test, please ignore",
        preferredTime: null,
        visitorEmail: "verify@qwikly.co.za",
      },
    });
    if (result.ok) {
      checks.push({
        name: "lead notification delivered",
        pass: true,
        detail: `recipient=${result.recipient} messageId=${result.messageId ?? "null"}`,
      });
    } else {
      checks.push({
        name: "lead notification delivered",
        pass: false,
        detail: `reason=${result.reason}${"message" in result && result.message ? ` message=${result.message}` : ""}`,
      });
    }
  } catch (err) {
    checks.push({
      name: "lead notification delivered",
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Render report
  let allPass = true;
  console.log(`\n=== Pipeline tenant verification: client_id=${clientId} ===\n`);
  for (const ch of checks) {
    const icon = ch.pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${ch.name}`);
    console.log(`       ${ch.detail}`);
    if (!ch.pass) allPass = false;
  }
  console.log();
  console.log(allPass ? "All green. Tenant is ready." : "Some checks failed. Do NOT enable this tenant.");
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

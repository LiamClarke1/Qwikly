import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.RESEND_FROM ?? "(unset)";

console.log("=== RESEND CONFIG ===");
console.log("RESEND_API_KEY:", apiKey ? `${apiKey.slice(0, 8)}…${apiKey.slice(-4)} (${apiKey.length} chars)` : "(unset)");
console.log("RESEND_FROM:   ", from);
console.log();

const resend = new Resend(apiKey);

async function main() {
  console.log("=== VERIFIED DOMAINS ===");
  const { data: domains, error: domainsErr } = await resend.domains.list();
  if (domainsErr) {
    console.log("❌ domains.list error:", domainsErr);
  } else {
    const list = ((domains as unknown) as { data?: Array<Record<string, unknown>> } | undefined)?.data
      ?? ((domains as unknown) as Array<Record<string, unknown>>);
    if (!list || (Array.isArray(list) && list.length === 0)) {
      console.log("⚠ No domains visible on this API key.");
    } else {
      (list as Array<Record<string, unknown>>).forEach((d) => {
        console.log(`  · ${d.name}  region=${d.region ?? "?"}  status=${d.status ?? "?"}  created=${d.created_at ?? "?"}`);
      });
    }
  }
  console.log();

  console.log("=== DIRECT SEND TEST ===");
  console.log("Sending from", from, "to clarkeagency1@outlook.com…");
  const { data, error } = await resend.emails.send({
    from,
    to: "clarkeagency1@outlook.com",
    subject: "Qwikly Resend probe — please ignore",
    html: "<p>This is a Qwikly Resend domain test. Safe to delete.</p>",
  });
  if (error) {
    console.log("❌ Send rejected:");
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log("✓ Send accepted:", data);
  }
}

main().catch((e) => {
  console.error("Crashed:", e);
  process.exit(1);
});

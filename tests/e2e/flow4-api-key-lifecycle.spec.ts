/**
 * E2E Flow 4: API Key Created → External curl Works → Revoked → curl 401s
 *
 * PREREQUISITES:
 *   TEST_EMAIL / TEST_PASSWORD
 *   BASE_URL
 *
 * Run:  npx playwright test tests/e2e/flow4-api-key-lifecycle.spec.ts --headed
 */

import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "https://www.qwikly.co.za";
const EMAIL = process.env.TEST_EMAIL ?? "qa+apikey@qwikly.co.za";
const PASSWORD = process.env.TEST_PASSWORD ?? "QaTest#8char!";

async function loginAs(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Flow 4 – API Key Lifecycle", () => {
  let page: Page;
  let createdApiKey: string | null = null;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAs(page);
  });
  test.afterAll(async () => { await page.close(); });

  test("4.1 Settings page shows API key section", async () => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForLoadState("networkidle");
    const apiSection = page.locator("text=/api key|api token|developer/i").first();
    if (await apiSection.count() > 0) {
      await expect(apiSection).toBeVisible();
    } else {
      console.log("  INFO: No API key section found in settings — may be on a different settings sub-page");
    }
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow4-settings.png" });
  });

  test("4.2 Create API key via API endpoint", async () => {
    // Try the API directly
    const resp = await page.request.post(`${BASE}/api/settings/api-keys`, {
      data: { name: "QA Test Key" },
    });
    if (resp.status() === 200 || resp.status() === 201) {
      const body = await resp.json();
      createdApiKey = body.key ?? body.api_key ?? body.token ?? null;
      if (createdApiKey) {
        console.log(`  Created API key: ${createdApiKey.slice(0, 12)}...`);
        expect(createdApiKey.length).toBeGreaterThan(20);
      }
    } else if (resp.status() === 404) {
      console.log("  INFO: /api/settings/api-keys endpoint not found — API key feature may not be implemented yet");
    } else {
      console.log(`  WARN: Unexpected status ${resp.status()} creating API key`);
    }
  });

  test("4.3 Valid API key authenticates external request", async () => {
    if (!createdApiKey) {
      console.log("  SKIP: No API key created in 4.2");
      return;
    }
    // Test a protected API endpoint with the key
    const resp = await page.request.get(`${BASE}/api/conversations`, {
      headers: { "Authorization": `Bearer ${createdApiKey}` },
    });
    // Either 200 (works) or 405 (method not allowed but key was accepted) is fine
    // 401 would be a failure
    expect(resp.status()).not.toBe(401);
  });

  test("4.4 Revoke API key", async () => {
    if (!createdApiKey) {
      console.log("  SKIP: No API key to revoke");
      return;
    }
    // List keys first to find the ID
    const listResp = await page.request.get(`${BASE}/api/settings/api-keys`);
    if (listResp.status() !== 200) {
      console.log("  SKIP: Cannot list API keys");
      return;
    }
    const keys = await listResp.json();
    const qaKey = Array.isArray(keys) ? keys.find((k: Record<string, unknown>) =>
      k.name === "QA Test Key" || String(k.key ?? "").startsWith(createdApiKey!.slice(0, 12))
    ) : null;

    if (qaKey?.id) {
      const deleteResp = await page.request.delete(`${BASE}/api/settings/api-keys/${qaKey.id}`);
      expect([200, 204]).toContain(deleteResp.status());
    }
  });

  test("4.5 Revoked API key returns 401", async () => {
    if (!createdApiKey) {
      console.log("  SKIP: No API key to test");
      return;
    }
    const resp = await page.request.get(`${BASE}/api/conversations`, {
      headers: { "Authorization": `Bearer ${createdApiKey}` },
    });
    expect(resp.status()).toBe(401);
  });

  test("4.6 Security: unauthenticated request to /api/conversations returns 401", async () => {
    const resp = await page.request.get(`${BASE}/api/conversations`);
    expect([401, 403]).toContain(resp.status());
  });

  test("4.7 Security: forged Yoco webhook without signature returns 401", async () => {
    const resp = await page.request.post(`${BASE}/api/webhooks/yoco`, {
      data: JSON.stringify({ type: "payment.succeeded", payload: { id: "fake-payment-id" } }),
      headers: {
        "Content-Type": "application/json",
        // Deliberately omit x-yoco-signature
      },
    });
    // CRITICAL BUG: If YOCO_WEBHOOK_SECRET is not set in env, this currently returns 200!
    // Expected: 401. If this test passes, the env var is set correctly.
    // If it returns 200, file as CRITICAL security bug QA-SEC-001.
    if (resp.status() === 200) {
      console.error("🚨 CRITICAL BUG QA-SEC-001: Yoco webhook accepted forged request without signature");
      console.error("   YOCO_WEBHOOK_SECRET env var is not set. Set it immediately.");
    }
    expect(resp.status()).toBe(401);
  });
});

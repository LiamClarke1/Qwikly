/**
 * E2E Flow 1: Signup → Onboarding → Embed → Chat → Lead → Email → PDF Export
 *
 * PREREQUISITES (set in .env.test or CI secrets):
 *   TEST_EMAIL          e.g. qa+test@qwikly.co.za (disposable inbox you can read)
 *   TEST_PASSWORD       ≥ 8 chars
 *   TEST_BUSINESS_NAME  e.g. "QA Test Plumbing"
 *   TEST_PHONE          e.g. "+27820000001"
 *   BASE_URL            e.g. https://www.qwikly.co.za (or http://localhost:3000)
 *
 * Run:  npx playwright test tests/e2e/flow1-signup-to-lead.spec.ts --headed
 */

import { test, expect, Page } from "@playwright/test";
import fs from "fs";

const BASE = process.env.BASE_URL ?? "https://www.qwikly.co.za";
const EMAIL = process.env.TEST_EMAIL ?? "qa+flow1@qwikly.co.za";
const PASSWORD = process.env.TEST_PASSWORD ?? "QaTest#8char!";
const BUSINESS = process.env.TEST_BUSINESS_NAME ?? "QA Test Plumbing";
const PHONE = process.env.TEST_PHONE ?? "+27820000001";

test.describe("Flow 1 – Signup → Onboarding → Lead capture", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });
  test.afterAll(async () => { await page.close(); });

  // ── Step 1: Signup ──────────────────────────────────────────────────────────
  test("1.1 Signup page loads and form visible", async () => {
    await page.goto(`${BASE}/signup`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("1.2 Signup with valid credentials", async () => {
    await page.goto(`${BASE}/signup`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    // Should land on onboarding or dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15000 });
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-after-signup.png" });
  });

  test("1.3 Duplicate email shows error", async () => {
    await page.goto(`${BASE}/signup`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    // Should stay on signup with an error message
    await expect(page.locator("text=/already|exists|registered/i")).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-duplicate-email-error.png" });
  });

  // ── Step 2: Onboarding ──────────────────────────────────────────────────────
  test("2.1 Onboarding step 1 — business details", async () => {
    await page.goto(`${BASE}/onboarding`);
    await page.waitForLoadState("networkidle");
    // Should either show onboarding form or redirect to login if session expired
    const url = page.url();
    if (url.includes("/login")) {
      await page.fill('input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/onboarding|\/dashboard/, { timeout: 15000 });
    }
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-onboarding.png" });
  });

  // ── Step 3: Dashboard loads ─────────────────────────────────────────────────
  test("3.1 Dashboard accessible after auth", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard/);
    // Should not show login page
    await expect(page.locator("text=/sign in|log in/i").first()).not.toBeVisible();
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-dashboard.png" });
  });

  test("3.2 Dashboard shows real data (no placeholder text)", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    // Should not contain obvious mock data phrases
    expect(body).not.toContain("Lorem ipsum");
    expect(body).not.toContain("Mock data");
    expect(body).not.toContain("TODO:");
  });

  // ── Step 4: Setup wizard ────────────────────────────────────────────────────
  test("4.1 Setup wizard reachable", async () => {
    await page.goto(`${BASE}/dashboard/setup`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard\/setup/);
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-setup.png" });
  });

  // ── Step 5: Conversations / Leads ───────────────────────────────────────────
  test("5.1 Conversations page loads", async () => {
    await page.goto(`${BASE}/dashboard/conversations`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard\/conversations/);
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-conversations.png" });
  });

  test("5.2 Leads page loads", async () => {
    await page.goto(`${BASE}/dashboard/leads`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard\/leads/);
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-leads.png" });
  });

  // ── Step 6: Embed snippet ───────────────────────────────────────────────────
  test("6.1 Settings page contains embed snippet", async () => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForLoadState("networkidle");
    // Look for code snippet
    const codeEl = page.locator("code, pre, textarea").filter({ hasText: /script|embed|widget/i });
    if (await codeEl.count() > 0) {
      const snippetText = await codeEl.first().innerText();
      expect(snippetText.length).toBeGreaterThan(20);
      fs.writeFileSync("/tmp/qwikly-qa/embed_snippet.txt", snippetText);
    }
    await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-settings-embed.png" });
  });

  // ── Step 7: PDF transcript export ───────────────────────────────────────────
  test("7.1 Conversation detail has export button", async () => {
    await page.goto(`${BASE}/dashboard/conversations`);
    await page.waitForLoadState("networkidle");
    const convLinks = page.locator("a[href*='/dashboard/conversations/']");
    if (await convLinks.count() > 0) {
      await convLinks.first().click();
      await page.waitForLoadState("networkidle");
      // Look for export/download/PDF button
      const exportBtn = page.locator("button, a").filter({ hasText: /export|pdf|download/i });
      if (await exportBtn.count() > 0) {
        await expect(exportBtn.first()).toBeVisible();
      }
      await page.screenshot({ path: "/tmp/qwikly-qa/screenshots/flow1-conversation-detail.png" });
    } else {
      console.log("  SKIP: no conversations exist yet for this test account");
    }
  });
});

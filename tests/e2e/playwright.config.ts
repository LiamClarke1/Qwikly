import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  timeout: 60_000,
  retries: 1,
  workers: 1, // Run flows sequentially to avoid auth conflicts
  reporter: [
    ["list"],
    ["json", { outputFile: "/tmp/qwikly-qa/e2e-results.json" }],
    ["html", { outputFolder: "/tmp/qwikly-qa/e2e-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "https://www.qwikly.co.za",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "safari",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
});

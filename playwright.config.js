import { defineConfig, devices } from "@playwright/test";

/**
 * PayWaka Meal Coupon MVP - Playwright Configuration
 * 
 * Configured specifically for visual E2E inspection:
 * - Chromium with headless: false
 * - slowMo: 600ms for visible interaction pacing
 * - Viewport: 1280x800
 * - BaseURL: http://localhost:8080 (Vite Dev Server)
 * - HTML Reporter in playwright-report/
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 180000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 1, // Single worker to preserve serial test stages and avoid state conflicts
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
    headless: process.env.HEADLESS === "true" ? true : false,
    launchOptions: {
      slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : 600,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

import { test, expect } from "@playwright/test";

test.describe("Stage 1: Playwright & Emulator Smoke Readiness Check", () => {
  test("1. Verify Vite dev server and Auth page rendering", async ({ page }) => {
    // Navigate to Login page on Vite dev server
    await page.goto("/auth/login");

    // Verify card title & description
    await expect(page.locator("text=Welcome Back")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Sign in to your account to continue")).toBeVisible();

    // Verify presence and accessibility of email & password inputs
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Ensure inputs can accept values cleanly
    await emailInput.fill("customer.e2e@paywaka.demo");
    await expect(emailInput).toHaveValue("customer.e2e@paywaka.demo");

    await passwordInput.fill("DemoPass123!");
    await expect(passwordInput).toHaveValue("DemoPass123!");

    console.log("✔ Login UI renders correctly with active form controls.");
  });

  test("2. Verify Customer Authentication with Auth Emulator", async ({ page }) => {
    page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

    await page.goto("/auth/login");

    // Fill seeded E2E customer credentials
    await page.locator("#email").fill("customer.e2e@paywaka.demo");
    await page.locator("#password").fill("DemoPass123!");

    // Submit login form
    await page.locator('button[type="submit"]').click();

    // Verify navigation away from login and onto customer dashboard
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 45000 });

    // Verify authenticated dashboard view with customer data
    await expect(page.locator("text=Welcome back, E2E Test Customer!")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=1500 pts").first()).toBeVisible({ timeout: 10000 });

    console.log("✔ Authenticated customer reached dashboard successfully with seeded points (1500 pts).");
  });
});

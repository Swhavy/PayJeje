const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 600 });
  const page = await browser.newPage();
  
  page.on("console", (msg) => console.log(`[${msg.type().toUpperCase()}]:`, msg.text()));
  page.on("pageerror", (err) => console.error("[PAGEERROR]:", err.message));
  page.on("requestfailed", (req) => console.log("FAILED REQ:", req.url(), req.failure()?.errorText));

  console.log("Navigating to login...");
  await page.goto("http://localhost:8080/auth/login");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
  
  console.log("Filling email...");
  await page.locator("#email").click();
  await page.locator("#email").fill("customer.e2e@paywaka.demo");
  await page.waitForTimeout(500);

  console.log("Filling password...");
  await page.locator("#password").click();
  await page.locator("#password").fill("DemoPass123!");
  await page.waitForTimeout(500);
  
  console.log("Clicking submit...");
  await page.locator('button[type="submit"]').click();
  
  try {
    await page.waitForURL("**/dashboard", { timeout: 35000 });
    console.log("✔ Succeeded! Reached dashboard:", page.url());
  } catch (err) {
    console.error("❌ Failed to reach dashboard:", err.message);
    console.log("Current URL:", page.url());
    const toasts = await page.locator('[data-sonner-toast], .toast, [role="status"]').allInnerTexts();
    console.log("Visible Toasts:", toasts);
  }

  await browser.close();
})();

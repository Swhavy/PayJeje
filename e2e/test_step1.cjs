const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 600 });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("PAGE LOG:", m.text()));
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

  await page.route("https://unpkg.com/**", route => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", route => route.fulfill({ status: 200, body: "" }));

  console.log("Navigating to login...");
  await page.goto("http://localhost:8080/auth/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  console.log("Filling inputs in UI...");
  await page.locator("#email").click();
  await page.locator("#email").fill("customer.e2e@paywaka.demo");
  await page.waitForTimeout(300);
  await page.locator("#password").click();
  await page.locator("#password").fill("DemoPass123!");
  await page.waitForTimeout(300);

  console.log("Signing in in page context...");
  await page.evaluate(async ({ email, password }) => {
    const { signInWithEmailAndPassword } = await import("/node_modules/.vite/deps/firebase_auth.js?v=d2daa0a3");
    const { auth } = await import("/client/firebaseConfig.js");
    await signInWithEmailAndPassword(auth, email, password);
  }, { email: "customer.e2e@paywaka.demo", password: "DemoPass123!" });

  console.log("Navigating to dashboard...");
  await page.goto("http://localhost:8080/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("Reached:", page.url());

  console.log("Navigating to meals marketplace...");
  await page.goto("http://localhost:8080/services/meals", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("Reached:", page.url());

  await browser.close();
  console.log("Test completed successfully!");
})();

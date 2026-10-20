const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("PAGE LOG:", m.text()));
  await page.goto("http://localhost:8080/auth/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const res = await page.evaluate(async () => {
    const { doc, getDoc } = await import("/node_modules/.vite/deps/firebase_firestore.js?v=d2daa0a3");
    const { db } = await import("/client/firebaseConfig.js");
    const t0 = Date.now();
    try {
      const d = await getDoc(doc(db, "users", "usr_e2e_customer_test"));
      return { success: true, exists: d.exists(), ms: Date.now() - t0, data: d.data()?.userName };
    } catch (e) {
      return { success: false, error: e.message, ms: Date.now() - t0 };
    }
  });

  console.log("Evaluation Result:", res);
  await browser.close();
})();

const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));

  await page.goto("http://localhost:8080/auth/login");
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    try {
      const { auth } = await import("/client/firebaseConfig.js");
      const { setPersistence, browserLocalPersistence, signInWithEmailAndPassword } = await import("firebase/auth");
      console.log("Testing setPersistence...");
      const t0 = Date.now();
      await setPersistence(auth, browserLocalPersistence);
      console.log("setPersistence done in", Date.now() - t0, "ms");
      
      console.log("Testing signInWithEmailAndPassword...");
      const t1 = Date.now();
      const res = await signInWithEmailAndPassword(auth, "customer.e2e@paywaka.demo", "DemoPass123!");
      console.log("signInWithEmailAndPassword done in", Date.now() - t1, "ms. UID:", res.user.uid);
      return { success: true, uid: res.user.uid };
    } catch (err) {
      console.error("EVAL ERROR:", err.message, err.code, err.stack);
      return { success: false, error: err.message, code: err.code };
    }
  });

  console.log("Result:", result);
  await browser.close();
})();

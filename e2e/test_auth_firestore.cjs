const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("PAGE LOG:", m.text()));
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
  page.on("request", (r) => {
    if (!r.url().includes("/node_modules/")) console.log("REQ:", r.url());
  });
  page.on("requestfailed", (r) => console.log("FAIL:", r.url(), r.failure()?.errorText));
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("RESP ERR:", r.url(), r.status());
  });

  await page.route("https://unpkg.com/**", route => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", route => route.fulfill({ status: 200, body: "" }));

  const tNav = Date.now();
  console.log("Navigating to /auth/login...");
  await page.goto("http://localhost:8080/auth/login", { waitUntil: "domcontentloaded" });
  console.log("Page reached domcontentloaded in", Date.now() - tNav, "ms!");
  await page.waitForTimeout(2000);

  const res = await page.evaluate(async () => {
    try {
      const { signInWithEmailAndPassword, getAuth } = await import("/node_modules/.vite/deps/firebase_auth.js?v=d2daa0a3");
      const { doc, getDoc, getFirestore } = await import("/node_modules/.vite/deps/firebase_firestore.js?v=d2daa0a3");
      const { app, auth, db } = await import("/client/firebaseConfig.js");

      console.log("Step A: Signing in...");
      const cred = await signInWithEmailAndPassword(auth, "customer.e2e@paywaka.demo", "DemoPass123!");
      console.log("Step A done: UID =", cred.user.uid);

      console.log("Step B: Getting user doc...");
      const t0 = Date.now();
      const userSnap = await getDoc(doc(db, "users", cred.user.uid));
      console.log("Step B done in", Date.now() - t0, "ms! Exists =", userSnap.exists());

      console.log("Step C: Getting achievements doc...");
      const tC = Date.now();
      const achSnap = await getDoc(doc(db, "users", cred.user.uid, "achievements", "stats"));
      console.log("Step C done in", Date.now() - tC, "ms! Exists =", achSnap.exists(), "Data:", achSnap.data());

      return {
        success: true,
        uid: cred.user.uid,
        points: userSnap.data()?.points,
        userName: userSnap.data()?.userName,
      };
    } catch (err) {
      console.error("Eval Catch:", err);
      return { success: false, error: err.message, stack: err.stack };
    }
  });

  console.log("Final Evaluation Result:", res);
  await browser.close();
})();

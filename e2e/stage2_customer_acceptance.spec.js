import { test, expect } from "@playwright/test";
process.env.NO_GCE_CHECK = "true";
import admin from "firebase-admin";
import { seedE2EFixtures } from "./seed_e2e_fixtures.js";

const EXPECTED_PROJECT_ID = "vtu-site-43118";
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || EXPECTED_PROJECT_ID;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.PIN_PEPPER_SECRET_V1 = process.env.PIN_PEPPER_SECRET_V1 || "8fff5a3bcbbd455ba704e66c0794a3917081b651812e0be8aab794c94b960400";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: EXPECTED_PROJECT_ID });
}
const db = admin.firestore();

const CUSTOMER_EMAIL = "customer.e2e@paywaka.demo";
const CUSTOMER_PASSWORD = "DemoPass123!";
const CUSTOMER_UID = "usr_e2e_customer_test";
const VALID_PIN = "8361";
const INVALID_PIN = "9999";
const OFFER_ID = "coupon-demo-jollof";

test.describe("Stage 2: Customer Points and Voucher Issuance Acceptance Journey", () => {
  test("Full Customer Journey: Login -> Marketplace -> Offer Specs -> Invalid PIN -> Valid Claim -> Ticket -> Persistence -> Idempotency", async ({ page }) => {
    test.setTimeout(300000);
    page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
    // Intercept external CDN resources to ensure reliable offline-first execution
    await page.route("https://unpkg.com/**", route => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await page.route("https://fonts.gstatic.com/**", route => route.fulfill({ status: 200, body: "" }));

    // =========================================================================
    // STEP 0: Verify Firestore Baseline Fixture State
    // =========================================================================
    console.log("\n--- STEP 0: Verifying Baseline Fixture State in Emulator ---");
    await seedE2EFixtures();
    const initialUserDoc = await db.collection("users").doc(CUSTOMER_UID).get();
    expect(initialUserDoc.exists).toBe(true);
    expect(initialUserDoc.data().points).toBe(1500);
    console.log("✔ Customer baseline points verified:", initialUserDoc.data().points, "pts");

    const campDoc = await db.collection("meal_campaigns").doc("camp-demo-jollof").get();
    expect(campDoc.exists).toBe(true);
    expect(campDoc.data().pointsCost).toBe(100);
    expect(campDoc.data().discountNaira).toBe(500);
    expect(campDoc.data().minSpendNaira).toBe(2500);
    console.log("✔ Campaign baseline verified: ₦500 discount, ₦2,500 min spend, 100 pts cost.");

    // Pre-warm Cloud Functions emulator worker to eliminate Windows cold-start latency
    try {
      const warmRes = await fetch("http://127.0.0.1:5001/vtu-site-43118/us-central1/redeemMealCoupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { testUid: "prewarm_ping", couponId: OFFER_ID, pin: "0000" } }),
      });
      await warmRes.text();
      console.log("✔ Cloud Functions emulator worker is warm and responsive (Status:", warmRes.status, ").");
    } catch (_) {}

    // =========================================================================
    // STEP 1: Sign In as Seeded Demo Customer
    // =========================================================================
    console.log("\n--- STEP 1: Signing In as Seeded Demo Customer ---");
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.locator("#email").click();
    await page.locator("#email").fill(CUSTOMER_EMAIL);
    await page.waitForTimeout(300);
    await page.locator("#password").click();
    await page.locator("#password").fill(CUSTOMER_PASSWORD);
    await page.waitForTimeout(300);

    // Perform sign-in via client SDK in page context to establish authenticated session
    await page.evaluate(async ({ email, password }) => {
      const { signInWithEmailAndPassword } = await import("/node_modules/.vite/deps/firebase_auth.js?v=d2daa0a3");
      const { auth } = await import("/client/firebaseConfig.js");
      await signInWithEmailAndPassword(auth, email, password);
    }, { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    console.log("✔ Customer successfully signed in. Reached:", page.url());

    // =========================================================================
    // STEP 2: Open Meal Marketplace and Verify Displayed Points Balance
    // =========================================================================
    console.log("\n--- STEP 2: Opening Meal Marketplace ---");
    await page.goto("/services/meals", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Verify Marketplace hero renders
    await expect(page.locator("text=Turn your points into")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=PayWaka Points Balance")).toBeVisible();
    const floatCard = page.locator(".float-card");
    await expect(floatCard).toBeVisible();

    // Assertion 1: Marketplace displays actual Firestore points balance (1,500 pts), never the old fabricated fallback (2,450 pts)
    await expect(floatCard).toContainText("1,500");
    await expect(floatCard).not.toContainText("2,450");
    const marketplacePointsText = (await floatCard.textContent()).replace(/\s+/g, " ").trim();
    console.log("✔ Marketplace verified with authoritative Firestore points (1,500 pts, not 2,450 pts):", marketplacePointsText);

    // =========================================================================
    // STEP 2b: Verify Genuine Empty Vault State (No Sample Vouchers)
    // =========================================================================
    console.log("\n--- STEP 2b: Verifying Genuine Empty Vault State Before Claiming ---");
    const vouchersLink = page.getByRole("link", { name: "My Vouchers" }).first();
    if (await vouchersLink.isVisible().catch(() => false)) {
      await vouchersLink.click();
    } else {
      await page.goto("/services/meals/vouchers", { waitUntil: "domcontentloaded" });
    }
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=My Vouchers").first()).toBeVisible({ timeout: 15000 });

    // Assertion 5: An empty voucher collection displays a genuine empty state (not sample vouchers)
    await expect(page.locator("text=Your Meal Vault is Empty")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Explore Meal Offers" })).toBeVisible();
    await expect(page.locator("text=PWK-JOL-8821")).not.toBeVisible();
    await expect(page.locator("text=PWK-SUYA-4412")).not.toBeVisible();
    console.log("✔ Genuine empty vault verified: 'Your Meal Vault is Empty' rendered; sample fixture vouchers absent.");

    // =========================================================================
    // STEP 3: Open Seeded Jollof Offer and Verify Specifications
    // =========================================================================
    console.log("\n--- STEP 3: Opening Offer Details (coupon-demo-jollof) ---");
    await page.goto(`/services/meals/coupon/${OFFER_ID}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Verify discount display (₦500 OFF)
    await expect(page.locator("text=₦500 OFF").first()).toBeVisible({ timeout: 15000 });

    // Verify minimum spend (₦2,500)
    await expect(page.locator("text=2,500").first()).toBeVisible();

    // Verify points cost (100 pts)
    await expect(page.locator("text=100 pts").first()).toBeVisible();

    // Verify validity window (48 Hours)
    await expect(page.locator("text=48 Hours").first()).toBeVisible();
    console.log("✔ Offer specs verified: ₦500 discount, ₦2,500 min spend, 100 pts cost, 48 Hours validity.");

    // =========================================================================
    // STEP 4: Attempt Claim with Invalid PIN (9999) - Must be Rejected
    // =========================================================================
    console.log("\n--- STEP 4: Testing Invalid PIN Rejection ---");
    const redeemBtn = page.getByRole("button", { name: /Confirm & Redeem/i });
    await expect(redeemBtn).toBeVisible({ timeout: 15000 });
    await redeemBtn.click();

    // Verify PIN modal appears
    await expect(page.locator("text=Authorize Voucher Claim")).toBeVisible({ timeout: 10000 });

    // Enter invalid 4-digit PIN: 9999 (filling 4th digit auto-submits)
    const pinInputs = page.locator('input[inputmode="numeric"]');
    await expect(pinInputs).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill(INVALID_PIN[i]);
    }

    // Verify rejection error message is displayed
    const errorMsg = page.getByText(/incorrect|invalid|check your pin/i).first();
    await expect(errorMsg).toBeVisible({ timeout: 45000 });
    console.log("✔ Invalid PIN rejected with message:", (await errorMsg.textContent()).trim());

    // Verify points in Firestore remain exactly 1,500
    const userDocAfterInvalid = await db.collection("users").doc(CUSTOMER_UID).get();
    expect(userDocAfterInvalid.data().points).toBe(1500);

    // Verify zero vouchers created in Firestore
    const vouchersSnapAfterInvalid = await db.collection("meal_vouchers").where("userId", "==", CUSTOMER_UID).get();
    expect(vouchersSnapAfterInvalid.size).toBe(0);
    console.log("✔ Invariant verified: no points deducted (1,500 pts) and zero vouchers created.");

    // Cancel / dismiss the error modal
    const cancelModalBtn = page.getByRole("button", { name: "Cancel", exact: true });
    await cancelModalBtn.click();
    await expect(page.locator("text=Authorize Voucher Claim")).not.toBeVisible({ timeout: 5000 });

    // =========================================================================
    // STEP 5: Claim Offer with Valid PIN (8361) - Must Succeed
    // =========================================================================
    console.log("\n--- STEP 5: Claiming Offer with Valid PIN (8361) ---");
    await expect(redeemBtn).toBeVisible({ timeout: 15000 });
    await redeemBtn.click();

    await expect(page.locator("text=Authorize Voucher Claim")).toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill(VALID_PIN[i]);
    }

    const authRedeemBtn = page.getByRole("button", { name: /Authorize & Redeem/i });
    if (await authRedeemBtn.isVisible().catch(() => false)) {
      await authRedeemBtn.click().catch(() => {});
    }

    // Wait for redirect to ticket URL (/services/meals/voucher/:voucherId)
    await expect(page).toHaveURL(/\/services\/meals\/voucher\/vch_/, { timeout: 60000 });
    console.log("✔ Voucher claim authorized! Reached ticket page:", page.url());

    const urlParts = page.url().split("/");
    const createdVoucherId = urlParts[urlParts.length - 1];
    expect(createdVoucherId).toMatch(/^vch_/);
    console.log("✔ Issued Voucher ID:", createdVoucherId);

    // =========================================================================
    // STEP 6: Verify Points Decreased to Exactly 1,400 pts (-100 pts)
    // =========================================================================
    console.log("\n--- STEP 6: Verifying Points Balance Deduction ---");
    const userDocAfterClaim = await db.collection("users").doc(CUSTOMER_UID).get();
    expect(userDocAfterClaim.data().points).toBe(1400);
    console.log("✔ Authoritative Firestore balance decremented from 1,500 pts to 1,400 pts.");

    // Verify negative points ledger record exists
    const ledgerDocs = await db.collection("users").doc(CUSTOMER_UID).collection("points")
      .where("voucherId", "==", createdVoucherId)
      .get();
    expect(ledgerDocs.size).toBe(1);
    expect(ledgerDocs.docs[0].data().points).toBe(-100);
    expect(ledgerDocs.docs[0].data().direction).toBe("debit");
    console.log("✔ Points debit ledger entry verified in users/{uid}/points.");

    // =========================================================================
    // STEP 7: Verify Voucher Ticket Content and Expiry Countdown
    // =========================================================================
    console.log("\n--- STEP 7: Inspecting Voucher Ticket Content ---");
    await expect(page.locator("text=₦500 OFF").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=PayWaka Demo Foods").first()).toBeVisible();
    await expect(page.locator("text=/Ready|Active/i").first()).toBeVisible();
    await expect(page.locator("text=2,500").first()).toBeVisible();

    const codeElement = page.locator("text=/PWK-[A-Z0-9]+-\\d+/i").first();
    await expect(codeElement).toBeVisible();
    const createdVoucherCode = (await codeElement.textContent()).trim();
    console.log("✔ Ticket details verified. Voucher Code:", createdVoucherCode);

    // =========================================================================
    // STEP 8: Refresh Page and Verify Ticket Persistence
    // =========================================================================
    console.log("\n--- STEP 8: Refreshing Page and Verifying Ticket Persistence ---");
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=₦500 OFF").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=PayWaka Demo Foods").first()).toBeVisible();
    await expect(page.locator(`text=${createdVoucherCode}`).first()).toBeVisible();
    console.log("✔ Ticket successfully persisted after full page refresh.");

    // =========================================================================
    // STEP 8b: Re-visit Marketplace & Verify Live Decrement to 1,400 pts
    // =========================================================================
    console.log("\n--- STEP 8b: Verifying Marketplace Points Update After Claim ---");
    await page.goto("/services/meals", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    const updatedFloatCard = page.locator(".float-card");
    await expect(updatedFloatCard).toBeVisible();

    // Assertion 2: The balance updates correctly after claiming a voucher (1,500 ➔ 1,400)
    await expect(updatedFloatCard).toContainText("1,400");
    await expect(updatedFloatCard).not.toContainText("1,500");
    await expect(updatedFloatCard).not.toContainText("2,450");
    console.log("✔ Marketplace float card balance verified updated: 1,400 pts (not 1,500, not 2,450).");

    // =========================================================================
    // STEP 9: Inspect My Meal Vouchers UI & Assert Newly Issued Voucher Appears
    // =========================================================================
    console.log("\n--- STEP 9: Inspecting My Meal Vouchers UI ---");
    const myVouchersLink = page.getByRole("link", { name: "My Vouchers" }).first();
    if (await myVouchersLink.isVisible().catch(() => false)) {
      await myVouchersLink.click();
    } else {
      await page.goto("/services/meals/vouchers", { waitUntil: "domcontentloaded" });
    }
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=My Vouchers").first()).toBeVisible({ timeout: 15000 });

    // Assertion 3: Newly issued voucher appears in customer's My Meal Vouchers list
    await expect(page.locator(`text=${createdVoucherCode}`).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Your Meal Vault is Empty")).not.toBeVisible();
    console.log(`✔ Newly issued voucher (${createdVoucherCode}) is confirmed visible in My Meal Vouchers.`);

    // =========================================================================
    // STEP 9b: Refresh Page and Verify Voucher Persistence in My Vouchers
    // =========================================================================
    console.log("\n--- STEP 9b: Refreshing Page and Verifying Voucher Persistence in My Vouchers ---");
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=My Vouchers").first()).toBeVisible({ timeout: 15000 });

    // Assertion 4: Voucher remains visible after refreshing page
    await expect(page.locator(`text=${createdVoucherCode}`).first()).toBeVisible({ timeout: 15000 });
    console.log(`✔ Voucher (${createdVoucherCode}) successfully persisted after full page refresh.`);

    // =========================================================================
    // STEP 10: Verify Idempotency, Active Restriction, and Lifetime Claim Limits
    // =========================================================================
    console.log("\n--- STEP 10: Verifying Idempotency and Claim Limits ---");
    const { redeemMealCouponCore } = await import("../functions/index.js");

    const claimDoc = await db.collection("users").doc(CUSTOMER_UID).collection("mealClaims").doc(OFFER_ID).get();
    const claimData = claimDoc.data();
    const originalKey = Object.keys(claimData.claimHistory)[0];
    expect(originalKey).toBeTruthy();

    // 10a. Idempotent Retry: Same Key -> Returns Original Voucher without Deducting Points
    const ptsBeforeRetry = (await db.collection("users").doc(CUSTOMER_UID).get()).data().points;
    const retryRes = await redeemMealCouponCore({
      uid: CUSTOMER_UID,
      couponId: OFFER_ID,
      pin: VALID_PIN,
      idempotencyKey: originalKey,
    });
    expect(retryRes.idempotent).toBe(true);
    expect(retryRes.voucher.id).toBe(createdVoucherId);

    const ptsAfterRetry = (await db.collection("users").doc(CUSTOMER_UID).get()).data().points;
    expect(ptsAfterRetry).toBe(ptsBeforeRetry);
    console.log("✔ Idempotency confirmed: retrying same key returned existing voucher with zero mutations.");

    // 10b. Active Voucher Restriction: Reject second active voucher for same offer
    let activeRejectError = null;
    try {
      await redeemMealCouponCore({
        uid: CUSTOMER_UID,
        couponId: OFFER_ID,
        pin: VALID_PIN,
        idempotencyKey: `claim_second_${Date.now()}`,
      });
    } catch (err) {
      activeRejectError = err;
    }
    expect(activeRejectError).toBeTruthy();
    expect(activeRejectError.code).toBe("already-exists");
    console.log("✔ Active voucher restriction confirmed: rejected with 'already-exists'.");

    // 10c. Lifetime Claim Limit (max 2 successful claims):
    // Simulate first voucher redeemed to clear active voucher restriction
    await db.collection("meal_vouchers").doc(createdVoucherId).update({ status: "redeemed" });
    await db.collection("users").doc(CUSTOMER_UID).collection("mealClaims").doc(OFFER_ID).update({
      activeVoucherId: null,
    });

    // Claim 2: Must succeed
    const claim2Res = await redeemMealCouponCore({
      uid: CUSTOMER_UID,
      couponId: OFFER_ID,
      pin: VALID_PIN,
      idempotencyKey: `claim_second_legit_${Date.now()}`,
    });
    expect(claim2Res.success).toBe(true);
    expect(claim2Res.lifetimeClaimCount).toBe(2);
    console.log("✔ Second legitimate claim issued; lifetime claim count is 2.");

    // Simulate second voucher redeemed
    await db.collection("meal_vouchers").doc(claim2Res.voucher.id).update({ status: "redeemed" });
    await db.collection("users").doc(CUSTOMER_UID).collection("mealClaims").doc(OFFER_ID).update({
      activeVoucherId: null,
    });

    // Claim 3: Must be rejected with resource-exhausted
    let claim3Error = null;
    try {
      await redeemMealCouponCore({
        uid: CUSTOMER_UID,
        couponId: OFFER_ID,
        pin: VALID_PIN,
        idempotencyKey: `claim_third_${Date.now()}`,
      });
    } catch (err) {
      claim3Error = err;
    }
    expect(claim3Error).toBeTruthy();
    expect(claim3Error.code).toBe("resource-exhausted");
    console.log("✔ Lifetime claim limit confirmed: 3rd claim rejected with 'resource-exhausted'.");

    // =========================================================================
    // STEP 11: Security Rules Isolation Test (Unauthorized Access Prevention)
    // =========================================================================
    console.log("\n--- STEP 11: Security Rules Isolation Test ---");
    const foreignVoucherId = `vch_foreign_isolation_${Date.now()}`;
    await db.collection("meal_vouchers").doc(foreignVoucherId).set({
      voucherCode: "PWK-FOREIGN-7777",
      voucherPin: "9999",
      userId: "usr_foreign_victim_999",
      vendorId: "paywaka-demo-foods",
      offerId: OFFER_ID,
      discountNaira: 500,
      minSpendNaira: 2500,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    });

    // Assertion 6a: Direct read of foreign voucher rejected by security rules
    const directReadResult = await page.evaluate(async (targetId) => {
      try {
        const { db, doc, getDoc } = await import("/client/firebaseConfig.js");
        const snap = await getDoc(doc(db, "meal_vouchers", targetId));
        return { allowed: true, exists: snap.exists() };
      } catch (err) {
        return { allowed: false, code: err.code, message: err.message };
      }
    }, foreignVoucherId);

    console.log("Direct foreign voucher getDoc result:", directReadResult);
    expect(directReadResult.allowed).toBe(false);
    expect(directReadResult.code).toBe("permission-denied");
    console.log("✔ Security rules verified: Direct read of foreign voucher rejected with 'permission-denied'.");

    // Assertion 6b: Cross-user query rejected by security rules
    const foreignQueryResult = await page.evaluate(async () => {
      try {
        const { db, collection, query, where, getDocs } = await import("/client/firebaseConfig.js");
        const q = query(
          collection(db, "meal_vouchers"),
          where("userId", "==", "usr_foreign_victim_999")
        );
        const snap = await getDocs(q);
        return { allowed: true, size: snap.size };
      } catch (err) {
        return { allowed: false, code: err.code, message: err.message };
      }
    });

    console.log("Foreign user voucher query result:", foreignQueryResult);
    expect(foreignQueryResult.allowed).toBe(false);
    expect(foreignQueryResult.code).toBe("permission-denied");
    console.log("✔ Security rules verified: Foreign user voucher query rejected with 'permission-denied'.");

    // Clean up foreign test document
    await db.collection("meal_vouchers").doc(foreignVoucherId).delete();
  });
});

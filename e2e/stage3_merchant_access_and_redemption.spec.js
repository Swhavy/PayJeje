import { test, expect } from "@playwright/test";
process.env.NO_GCE_CHECK = "true";
import admin from "firebase-admin";
import { seedE2EFixtures, E2E_CONFIG } from "./seed_e2e_fixtures.js";

const EXPECTED_PROJECT_ID = "vtu-site-43118";
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || EXPECTED_PROJECT_ID;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.PIN_PEPPER_SECRET_V1 =
  process.env.PIN_PEPPER_SECRET_V1 ||
  "8fff5a3bcbbd455ba704e66c0794a3917081b651812e0be8aab794c94b960400";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: EXPECTED_PROJECT_ID });
}
const db = admin.firestore();
const authAdmin = admin.auth();

const CUSTOMER_EMAIL = E2E_CONFIG.customer.email; // "customer.e2e@paywaka.demo"
const CUSTOMER_PASSWORD = E2E_CONFIG.customer.password; // "DemoPass123!"
const CUSTOMER_UID = E2E_CONFIG.customer.uid;
const CUSTOMER_PIN = E2E_CONFIG.customer.pin; // "8361"

const CASHIER_EMAIL = E2E_CONFIG.cashier.email; // "cashier.e2e@paywaka.demo"
const CASHIER_PASSWORD = E2E_CONFIG.cashier.password; // "DemoPass123!"
const CASHIER_UID = E2E_CONFIG.cashier.uid;

const OTHER_CASHIER_EMAIL = "cashier.pizza@paywaka.demo";
const OTHER_CASHIER_UID = "usr_e2e_cashier_pizza_other";

/**
 * Reliable authentication helper for Playwright E2E tests.
 * Performs client SDK signInWithEmailAndPassword inside browser context to establish IndexedDB session,
 * avoiding form submission listener deadlocks in local emulator.
 */
async function signInUser(page, email, password) {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email, password }) => {
    const { auth, signInWithEmailAndPassword } = await import("/client/firebaseConfig.js");
    await signInWithEmailAndPassword(auth, email, password);
  }, { email, password });
  await page.waitForTimeout(300);
}

/**
 * Sign out helper for switching sessions in Playwright.
 */
async function signOutUser(page) {
  await page.evaluate(async () => {
    const { auth, signOut } = await import("/client/firebaseConfig.js");
    await signOut(auth);
  });
  await page.waitForTimeout(300);
}

test.describe("Stage 3: Merchant Access Control & End-to-End Redemption Acceptance", () => {
  test.setTimeout(600000);

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

    // Intercept external CDNs to guarantee fast local execution
    await page.route("https://unpkg.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
    );
    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/css", body: "" })
    );
    await page.route("https://fonts.gstatic.com/**", (route) =>
      route.fulfill({ status: 200, body: "" })
    );
  });

  test("Comprehensive Stage 3 Acceptance Trajectory: Customer Access Control -> Cashier Authorization -> Live Claim -> Terminal Validation -> Atomic Redemption -> Idempotency -> Vault Verification", async ({
    page,
  }) => {
    // =========================================================================
    // STEP 0: Seed Emulator Fixtures (Customer, Cashiers, Vendor, Campaign)
    // =========================================================================
    console.log("\n--- STEP 0: Seeding Baseline Fixtures in Firebase Emulator ---");
    await seedE2EFixtures();

    // Ensure second cashier assigned to a different vendor (Pizza)
    try {
      await authAdmin.getUser(OTHER_CASHIER_UID);
    } catch {
      await authAdmin.createUser({
        uid: OTHER_CASHIER_UID,
        email: OTHER_CASHIER_EMAIL,
        password: CASHIER_PASSWORD,
        emailVerified: true,
      });
    }
    await authAdmin.setCustomUserClaims(OTHER_CASHIER_UID, {
      role: "vendor",
      vendorId: "demo-woodfire-pizza",
    });
    await db.collection("users").doc(OTHER_CASHIER_UID).set({
      uid: OTHER_CASHIER_UID,
      email: OTHER_CASHIER_EMAIL,
      userName: "Pizza Cashier",
      fullName: "Pizza Cashier",
      role: "vendor",
      vendorId: "demo-woodfire-pizza",
      vendorBranch: "Lekki Phase 1",
      isVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Pre-warm Cloud Functions emulator worker sequentially to avoid concurrent CPU thrashing
    try {
      await fetch("http://127.0.0.1:5001/vtu-site-43118/us-central1/redeemMealCoupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: {} }),
      });
      await fetch("http://127.0.0.1:5001/vtu-site-43118/us-central1/validateMealVoucherForMerchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: {} }),
      });
      await fetch("http://127.0.0.1:5001/vtu-site-43118/us-central1/redeemMealVoucherMerchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: {} }),
      });
      console.log("✔ Cloud Functions emulator workers pre-warmed.");
    } catch (_) {}

    console.log("✔ Fixtures ready: Customer (1,500 pts), Primary Cashier (paywaka-demo-foods), Other Cashier (demo-woodfire-pizza).");

    // =========================================================================
    // SCENARIO A: Customer Access Control
    // =========================================================================
    console.log("\n--- SCENARIO A: Testing Customer Access Control ---");

    // 1. Sign in as Customer
    await signInUser(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    console.log("✔ Customer successfully logged in.");

    // 2. Open Meal Marketplace
    await page.goto("/services/meals", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=Turn your points into")).toBeVisible({ timeout: 15000 });
    console.log("✔ Customer reached Meal Marketplace.");

    // 3. Confirm Terminal Tab is ABSENT from customer navigation
    const terminalTab = page.locator('[data-testid="merchant-terminal-tab"]');
    await expect(terminalTab).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Terminal" })).not.toBeVisible();
    console.log("✔ CONFIRMED: Terminal tab is completely ABSENT from customer navigation.");

    // 4. Directly visit /services/meals/terminal
    console.log("   Visiting /services/meals/terminal directly as customer...");
    await page.goto("/services/meals/terminal", { waitUntil: "domcontentloaded" });
    const accessDenied = page.locator('[data-testid="merchant-access-denied"]');
    await expect(accessDenied).toBeVisible({ timeout: 15000 });
    await expect(accessDenied).toContainText("Merchant Access Restricted");
    await expect(page.locator("text=Enable Cashier")).not.toBeVisible();
    await expect(page.locator('input[placeholder*="voucher" i]')).not.toBeVisible();
    await expect(page.locator('input[placeholder*="bill" i]')).not.toBeVisible();
    console.log("✔ CONFIRMED: Direct access to /services/meals/terminal is DENIED. Zero merchant controls exposed.");

    // 5. Directly visit /merchant/meals
    console.log("   Visiting /merchant/meals directly as customer...");
    await page.goto("/merchant/meals", { waitUntil: "domcontentloaded" });
    await expect(accessDenied).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Enable Cashier")).not.toBeVisible();
    console.log("✔ CONFIRMED: Direct access to /merchant/meals is DENIED.");

    // 6. Confirm customer can still use Marketplace and Vouchers
    await page.goto("/services/meals/vouchers", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=My Vouchers").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Your Meal Vault is Empty")).toBeVisible();
    console.log("✔ CONFIRMED: Customer voucher vault accessible and displays honest empty state.");

    // =========================================================================
    // SCENARIO C (Part 1): Issue a Real Voucher Through Actual Customer UI
    // =========================================================================
    console.log("\n--- SCENARIO C (Part 1): Customer Claims Voucher in UI ---");
    await page.goto(`/services/meals/coupon/${E2E_CONFIG.campaign.offerId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=500 OFF").first()).toBeVisible({ timeout: 30000 });

    // Open PIN modal
    const claimBtn = page.getByRole("button", { name: /Confirm & Redeem/i });
    await claimBtn.click();
    await expect(page.locator("text=Authorize Voucher Claim")).toBeVisible({ timeout: 10000 });

    // Enter PIN: 8361
    const pinInputs = page.locator('input[inputmode="numeric"]');
    await expect(pinInputs).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill(CUSTOMER_PIN[i]);
      await page.waitForTimeout(150);
    }

    const authRedeemBtn = page.getByRole("button", { name: /Authorize & Redeem/i });
    if (await authRedeemBtn.isVisible().catch(() => false) && await authRedeemBtn.isEnabled().catch(() => false)) {
      await authRedeemBtn.click().catch(() => {});
    }

    // Wait for redemption and redirection to ticket page
    await expect(page).toHaveURL(/\/services\/meals\/voucher\/vch_/, { timeout: 120000 });
    const ticketUrl = page.url();
    const issuedVoucherId = ticketUrl.split("/voucher/")[1];
    console.log("✔ Customer successfully claimed voucher! ID:", issuedVoucherId);

    // Retrieve voucher code from Firestore
    const postClaimDoc = await db.collection("meal_vouchers").doc(issuedVoucherId).get();
    expect(postClaimDoc.exists).toBe(true);
    const issuedVoucherCode = postClaimDoc.data().voucherCode;
    console.log("✔ Authoritative Voucher Code from Firestore:", issuedVoucherCode);

    // Verify ticket UI displays voucher code
    await expect(page.locator(`text=${issuedVoucherCode}`).first()).toBeVisible({ timeout: 15000 });
    console.log("✔ Ticket UI confirmed rendering voucher code:", issuedVoucherCode);

    // =========================================================================
    // SCENARIO B: Merchant Authorization & Validation
    // =========================================================================
    console.log("\n--- SCENARIO B: Merchant Authorization ---");

    // Clear session by signing out customer
    await signOutUser(page);

    // 1. Sign in as Assigned Cashier (paywaka-demo-foods)
    await signInUser(page, CASHIER_EMAIL, CASHIER_PASSWORD);
    console.log("✔ Cashier successfully signed in.");

    // 2. Open Meal Marketplace and confirm Terminal Tab IS VISIBLE for cashier
    await page.goto("/services/meals", { waitUntil: "domcontentloaded" });
    const cashierTerminalTab = page.locator('[data-testid="merchant-terminal-tab"]');
    await expect(cashierTerminalTab).toBeVisible({ timeout: 15000 });
    console.log("✔ CONFIRMED: Terminal tab is VISIBLE for authenticated cashier in navigation.");

    // 3. Open Terminal
    await cashierTerminalTab.click();
    await expect(page).toHaveURL(/\/services\/meals\/terminal/, { timeout: 15000 });
    await expect(page.locator("text=Merchant Terminal").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Cashier Authorized")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=PayWaka Demo Foods").first()).toBeVisible();
    console.log("✔ Merchant Terminal opened. Cashier authorized for PayWaka Demo Foods.");

    // 4. Test Cross-Vendor Rejection (Backend enforcement)
    console.log("   Verifying backend rejection when unauthorized cashier validates...");
    const indexModule = await import("../functions/index.js");
    const validateCore = indexModule.validateMealVoucherForMerchantCore;

    let otherCashierError = null;
    try {
      await validateCore({
        cashierUid: OTHER_CASHIER_UID,
        voucherCodeOrId: issuedVoucherCode,
        vendorId: "demo-woodfire-pizza", // Wrong vendor
      });
    } catch (err) {
      otherCashierError = err.message;
    }
    expect(otherCashierError).toBeTruthy();
    console.log("✔ CONFIRMED: Cross-vendor cashier rejected:", otherCashierError);

    // =========================================================================
    // SCENARIO C (Part 2): Terminal Validation & Atomic Redemption
    // =========================================================================
    console.log("\n--- SCENARIO C (Part 2): Terminal Validation & Redemption ---");

    // Enter voucher code into terminal input
    const voucherInput = page.locator('input[placeholder*="PWK" i], input[placeholder*="Voucher" i]').first();
    await expect(voucherInput).toBeVisible();
    await voucherInput.fill(issuedVoucherCode);

    // Click Verify Voucher
    const verifyBtn = page.getByRole("button", { name: /Verify Voucher/i });
    await verifyBtn.click();

    // Confirm validation result card appears
    await expect(page.locator("text=ELIGIBLE FOR REDEMPTION")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=500 OFF").first()).toBeVisible();
    await expect(page.locator("text=₦2,500").first()).toBeVisible();
    console.log("✔ Terminal voucher pre-validation passed. ₦500 discount confirmed.");

    // Baseline checks before redemption (bound directly to voucher's authoritative campaignId)
    const targetCampId = postClaimDoc.data().campaignId || "camp-demo-jollof";
    const preCampSnap = await db.collection("meal_campaigns").doc(targetCampId).get();
    const preSpent = preCampSnap.data().campaignSpentNaira || 0;
    const preCount = preCampSnap.data().redemptionCount || 0;

    // Fill valid bill amount (₦3,500)
    const billInput = page.locator('input[type="number"]').first();
    await billInput.fill("3500");

    // Verify calculation display
    await expect(page.locator("text=Final Amount Payable by Customer")).toBeVisible();
    await expect(page.locator("text=₦3,000")).toBeVisible(); // 3500 - 500 = 3000

    // Click Confirm Voucher Redemption
    const redeemSubmitBtn = page.getByRole("button", { name: /Confirm Voucher Redemption/i });
    await redeemSubmitBtn.click();

    // Confirm Modal dialog
    const modalConfirmBtn = page.getByRole("button", { name: /Confirm Redemption/i });
    await expect(modalConfirmBtn).toBeVisible({ timeout: 5000 });
    await modalConfirmBtn.click();

    // Confirm Success Banner
    await expect(page.locator("text=Voucher Redeemed Successfully!")).toBeVisible({ timeout: 90000 });
    await expect(page.locator("text=-₦500")).toBeVisible();
    await expect(page.locator("text=₦3,000")).toBeVisible();
    console.log("✔ VOUCHER REDEEMED SUCCESSFULLY in Merchant Terminal UI!");

    // Invariant Check 1: Voucher is marked redeemed in Firestore
    const postVchSnap = await db.collection("meal_vouchers").doc(issuedVoucherId).get();
    expect(postVchSnap.exists).toBe(true);
    expect(postVchSnap.data().status).toBe("redeemed");
    expect(postVchSnap.data().billAmountNaira).toBe(3500);
    expect(postVchSnap.data().actualDiscountNaira).toBe(500);
    expect(postVchSnap.data().finalPayableNaira).toBe(3000);
    expect(postVchSnap.data().redeemedByVendorStaffUid).toBe(CASHIER_UID);
    console.log("✔ Firestore Invariant 1 Verified: meal_vouchers record has status: 'redeemed' with exact financial totals.");

    // Invariant Check 2: Campaign budget and redemption counter updated exactly once
    const postCampSnap = await db.collection("meal_campaigns").doc(targetCampId).get();
    expect(postCampSnap.data().campaignSpentNaira).toBe(preSpent + 500);
    expect(postCampSnap.data().redemptionCount).toBe(preCount + 1);
    console.log("✔ Firestore Invariant 2 Verified: Campaign spent incremented exactly +₦500; count +1.");

    // =========================================================================
    // SCENARIO C (Part 3): Idempotency Deduplication & Double-Redemption Rejection
    // =========================================================================
    console.log("\n--- SCENARIO C (Part 3): Testing Idempotency & Re-Redemption ---");
    const redeemCore = indexModule.redeemMealVoucherMerchantCore;

    // Retrieve idempotency key used by UI redemption
    const redAuditSnap = await db
      .collection("meal_redemptions")
      .where("voucherId", "==", issuedVoucherId)
      .limit(1)
      .get();
    expect(redAuditSnap.empty).toBe(false);
    const usedIdempotencyKey = redAuditSnap.docs[0].data().idempotencyKey;
    console.log("   Replaying with original idempotency key:", usedIdempotencyKey);

    // Retry with SAME idempotency key (must deduplicate without double charge)
    const idempotentReplay = await redeemCore({
      cashierUid: CASHIER_UID,
      voucherCodeOrId: issuedVoucherId,
      vendorId: "paywaka-demo-foods",
      billAmountNaira: 3500,
      idempotencyKey: usedIdempotencyKey,
    });
    expect(idempotentReplay.success).toBe(true);
    expect(idempotentReplay.idempotent).toBe(true);

    const checkCampSnap = await db.collection("meal_campaigns").doc(targetCampId).get();
    expect(checkCampSnap.data().campaignSpentNaira).toBe(preSpent + 500); // Unchanged!
    expect(checkCampSnap.data().redemptionCount).toBe(preCount + 1); // Unchanged!
    console.log("✔ Idempotency Verified: Duplicate call returned existing record with zero extra budget deduction.");

    // Retry with DIFFERENT idempotency key on already redeemed voucher (must be rejected)
    let duplicateRejected = false;
    try {
      await redeemCore({
        cashierUid: CASHIER_UID,
        voucherCodeOrId: issuedVoucherId,
        vendorId: "paywaka-demo-foods",
        billAmountNaira: 3500,
        idempotencyKey: `new_key_on_used_voucher_${Date.now()}`,
      });
    } catch (err) {
      duplicateRejected = true;
    }
    expect(duplicateRejected).toBe(true);
    console.log("✔ Double-Redemption Protection Verified: New redemption request on used voucher strictly rejected.");

    // =========================================================================
    // SCENARIO C (Part 4): Customer Vault Updated Status Verification
    // =========================================================================
    console.log("\n--- SCENARIO C (Part 4): Verifying Customer Vault Updates ---");

    // Sign out cashier
    await signOutUser(page);

    // Sign back in as Customer
    await signInUser(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

    // Open My Meal Vouchers
    await page.goto("/services/meals/vouchers", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=My Vouchers").first()).toBeVisible({ timeout: 15000 });

    // Active tab should now be empty (since voucher was redeemed)
    await expect(page.locator("text=No active vouchers found")).toBeVisible({ timeout: 10000 });
    console.log("✔ Customer active vault is clean: redeemed voucher moved out of Active tab.");

    // Switch to "Redeemed" tab
    const redeemedTabBtn = page.getByRole("button", { name: /Redeemed/i });
    await redeemedTabBtn.click();

    // Confirm redeemed voucher appears in Redeemed tab
    await expect(page.locator(`text=${issuedVoucherCode}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Redeemed").first()).toBeVisible();
    console.log("✔ Customer Redeemed tab reflects updated voucher status: 'Redeemed'.");

    // Test persistence across hard page refresh
    console.log("   Refreshing customer vouchers page to test persistence...");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=My Vouchers").first()).toBeVisible({ timeout: 15000 });
    const redeemedTabAfterReload = page.getByRole("button", { name: /Redeemed/i });
    await redeemedTabAfterReload.click();
    await expect(page.locator(`text=${issuedVoucherCode}`)).toBeVisible({ timeout: 10000 });
    console.log("✔ Customer vault status persisted accurately across full page refresh.");

    // =========================================================================
    // SCENARIO D: Security Invariants & Protected Collections Write Blocking
    // =========================================================================
    console.log("\n--- SCENARIO D: Security Invariants & Write Restrictions ---");

    // 1. Customer cannot invoke cashier provisioning
    const setDemoCashierCore = indexModule.setDemoCashierRoleCore;
    let custProvError = null;
    try {
      await setDemoCashierCore({
        callerUid: CUSTOMER_UID,
        uid: CUSTOMER_UID,
        vendorId: "paywaka-demo-foods",
        isCallerAdmin: false,
      });
    } catch (e) {
      custProvError = e.message;
    }
    expect(custProvError).toContain("Regular customers cannot self-provision merchant cashier privileges");
    console.log("✔ Security Guard 1: Regular customer self-provisioning blocked:", custProvError);

    // 2. Customer cannot invoke merchant validation
    let custValError = null;
    try {
      await validateCore({
        cashierUid: CUSTOMER_UID,
        voucherCodeOrId: issuedVoucherCode,
        vendorId: "paywaka-demo-foods",
      });
    } catch (e) {
      custValError = e.message;
    }
    expect(custValError).toContain("User must hold the 'vendor' role for this vendor");
    console.log("✔ Security Guard 2: Regular customer voucher validation blocked:", custValError);

    // 3. Customer cannot invoke merchant redemption
    let custRedError = null;
    try {
      await redeemCore({
        cashierUid: CUSTOMER_UID,
        voucherCodeOrId: issuedVoucherId,
        vendorId: "paywaka-demo-foods",
        billAmountNaira: 3500,
        idempotencyKey: `unauth_cust_${Date.now()}`,
      });
    } catch (e) {
      custRedError = e.message;
    }
    expect(custRedError).toContain("User must hold the 'vendor' role for this vendor");
    console.log("✔ Security Guard 3: Regular customer voucher redemption blocked:", custRedError);

    // 4. Verify client SDK write restrictions on protected collections
    const clientAppModule = await import("firebase/app");
    const clientAuthModule = await import("firebase/auth");
    const clientFsModule = await import("firebase/firestore");

    const appName = "sec_client_test_" + Date.now();
    const clientApp = clientAppModule.initializeApp({ apiKey: "fake", projectId: EXPECTED_PROJECT_ID }, appName);
    const clientAuth = clientAuthModule.getAuth(clientApp);
    clientAuthModule.connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
    const clientDb = clientFsModule.getFirestore(clientApp);
    clientFsModule.connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

    await clientAuthModule.signInWithEmailAndPassword(clientAuth, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

    // Direct write to meal_vouchers blocked
    let writeVchBlocked = false;
    try {
      await clientFsModule.setDoc(clientFsModule.doc(clientDb, "meal_vouchers", "forged_vch"), { status: "active" });
    } catch (e) {
      writeVchBlocked = e.message.includes("PERMISSION_DENIED") || e.code === "permission-denied";
    }
    expect(writeVchBlocked).toBe(true);

    // Direct write to meal_campaigns blocked
    let writeCampBlocked = false;
    try {
      await clientFsModule.updateDoc(clientFsModule.doc(clientDb, "meal_campaigns", "camp-demo-jollof"), { campaignSpentNaira: 0 });
    } catch (e) {
      writeCampBlocked = e.message.includes("PERMISSION_DENIED") || e.code === "permission-denied";
    }
    expect(writeCampBlocked).toBe(true);

    console.log("✔ Security Guard 4: Client SDK direct writes to meal_vouchers and meal_campaigns strictly blocked by security rules.");

    console.log("\n========================================================");
    console.log("🎉 ALL STAGE 3 PLAYWRIGHT ACCEPTANCE SCENARIOS PASSED!");
    console.log("========================================================\n");
  });
});

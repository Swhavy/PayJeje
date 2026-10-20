process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "vtu-site-43118";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.PIN_PEPPER_SECRET_V1 = "dev_pepper_secret_v1_mock_value_for_testing_123456";

import dotenv from "dotenv";
dotenv.config({ path: "./functions/.env" });

import admin from "firebase-admin";
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "vtu-site-43118" });
}
const db = admin.firestore();

// Client SDK for testing Security Rules enforcement
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  signInWithCustomToken,
} from "firebase/auth";

const clientApp = initializeApp(
  {
    apiKey: "fake-api-key-for-emulator",
    projectId: "vtu-site-43118",
  },
  "client-phase5-security-app"
);

const clientDb = getFirestore(clientApp);
connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });

let setDemoCashierRoleCore;
let validateMealVoucherForMerchantCore;
let redeemMealVoucherMerchantCore;

const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(testName, fn) {
  console.log(`\n▶ [TEST] ${testName}`);
  try {
    await fn();
    console.log(`✔ [PASS] ${testName}`);
    results.push({ name: testName, status: "PASSED" });
  } catch (err) {
    console.error(`✖ [FAIL] ${testName}:`, err.message);
    results.push({ name: testName, status: "FAILED", error: err.message });
  }
}

async function cleanTestUser(uid) {
  try {
    await db.collection("users").doc(uid).delete();
    const pts = await db.collection("users").doc(uid).collection("points").get();
    for (const d of pts.docs) await d.ref.delete();
    const claims = await db.collection("users").doc(uid).collection("mealClaims").get();
    for (const d of claims.docs) await d.ref.delete();
    const sec = await db.collection("users").doc(uid).collection("private_security").get();
    for (const d of sec.docs) await d.ref.delete();
    const vchs = await db.collection("meal_vouchers").where("userId", "==", uid).get();
    for (const d of vchs.docs) await d.ref.delete();
  } catch (e) {}
}

async function createTestVoucher({
  userId,
  vendorId,
  campaignId,
  offerId,
  discountNaira = 500,
  minSpendNaira = 2500,
  status = "active",
  expiresInHours = 48,
  voucherPin = "4821",
}) {
  const voucherId = `vch_p5_${userId.slice(-4)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const voucherCode = `PWK-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 3600 * 1000);

  const voucherData = {
    id: voucherId,
    voucherCode,
    userId,
    vendorId,
    vendorName: "PayWaka Phase 5 Partner Delicacies",
    campaignId,
    offerId,
    discountNaira,
    minSpendNaira,
    voucherPin,
    status,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: admin.firestore.Timestamp.fromDate(now),
    redeemedAt: status === "redeemed" ? admin.firestore.Timestamp.fromDate(now) : null,
    redemptionId: status === "redeemed" ? `red_dummy_${Date.now()}` : null,
  };

  await db.collection("meal_vouchers").doc(voucherId).set(voucherData);
  return { id: voucherId, voucherCode, ...voucherData };
}

async function main() {
  console.log("==================================================================");
  console.log("PHASE 5 TEST SUITE: MERCHANT TERMINAL & VOUCHER REDEMPTION ENGINE");
  console.log("==================================================================");

  const indexModule = await import("./index.js");
  setDemoCashierRoleCore = indexModule.setDemoCashierRoleCore;
  validateMealVoucherForMerchantCore = indexModule.validateMealVoucherForMerchantCore;
  redeemMealVoucherMerchantCore = indexModule.redeemMealVoucherMerchantCore;

  const testVendorId = "paywaka-demo-foods";
  const testOtherVendorId = "demo-woodfire-pizza";
  const testCampaignId = `camp_p5_${Date.now()}`;
  const testOfferId = "offer-phase5-delicacy";

  // 1. Seed demo vendors
  await db.collection("meal_vendors").doc(testVendorId).set({
    id: testVendorId,
    name: "PayWaka Phase 5 Partner Delicacies",
    category: "Local Delicacies",
    branch: "Victoria Island • Lagos",
    address: "Plot 10 Adeola Odeku St, VI",
    logoEmoji: "🍗",
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("meal_vendors").doc(testOtherVendorId).set({
    id: testOtherVendorId,
    name: "Phase 5 Demo Woodfire",
    category: "Pizza & Pasta",
    branch: "Lekki Phase 1 • Lagos",
    address: "Admiralty Way, Lekki",
    logoEmoji: "🍕",
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 2. Seed test campaign using CANONICAL budget schema
  await db.collection("meal_campaigns").doc(testCampaignId).set({
    id: testCampaignId,
    offerId: testOfferId,
    vendorId: testVendorId,
    vendorName: "PayWaka Phase 5 Partner Delicacies",
    title: "₦500 Promotional Meal Discount",
    pointsCost: 100,
    discountNaira: 500,
    minSpendNaira: 2500,
    status: "active",
    campaignBudgetNaira: 100000,
    campaignSpentNaira: 0,
    redemptionCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // -------------------------------------------------------------------------
  // TEST 1: Rejection of unauthenticated caller and unauthorized cashier
  // -------------------------------------------------------------------------
  await runTest("1. Cashier Authorization: reject unauthenticated or non-cashier callers", async () => {
    const customerUid = `usr_p5_regular_cust_${Date.now()}`;
    await cleanTestUser(customerUid);
    await db.collection("users").doc(customerUid).set({
      uid: customerUid,
      role: "customer",
    });

    // 1a. Unauthenticated caller
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: null,
        voucherCodeOrId: "PWK-DUMMY",
        vendorId: testVendorId,
        billAmountNaira: 3000,
      });
      assert(false, "Expected unauthenticated error");
    } catch (err) {
      assert(err.code === "unauthenticated", `Expected unauthenticated, got ${err.code}`);
    }

    // 1b. Regular customer attempting to act as cashier
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: customerUid,
        voucherCodeOrId: "PWK-DUMMY",
        vendorId: testVendorId,
        billAmountNaira: 3000,
      });
      assert(false, "Expected permission-denied error for regular customer");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("not authorized"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 2: Targeted Security - Ordinary customer self-provisioning rejection
  // -------------------------------------------------------------------------
  await runTest("2. Demo Cashier Security: Ordinary customer cannot self-provision cashier privileges", async () => {
    const ordinaryCustUid = `usr_p5_cust_selfprov_${Date.now()}`;
    await cleanTestUser(ordinaryCustUid);
    await db.collection("users").doc(ordinaryCustUid).set({
      uid: ordinaryCustUid,
      role: "user",
    });

    try {
      await setDemoCashierRoleCore({
        callerUid: ordinaryCustUid,
        uid: ordinaryCustUid,
        vendorId: testVendorId,
        isCallerAdmin: false,
      });
      assert(false, "Ordinary customer must not be able to self-provision cashier role");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("cannot self-provision"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 3: Targeted Security - Caller cannot assign vendor role to another UID
  // -------------------------------------------------------------------------
  await runTest("3. Demo Cashier Security: Caller cannot assign vendor role to another UID", async () => {
    const callerCustUid = `usr_p5_cust_attacker_${Date.now()}`;
    const victimUid = `usr_p5_cust_victim_${Date.now()}`;
    await cleanTestUser(callerCustUid);
    await cleanTestUser(victimUid);

    await db.collection("users").doc(callerCustUid).set({ uid: callerCustUid, role: "user" });
    await db.collection("users").doc(victimUid).set({ uid: victimUid, role: "user" });

    try {
      await setDemoCashierRoleCore({
        callerUid: callerCustUid,
        uid: victimUid,
        vendorId: testVendorId,
        isCallerAdmin: false,
      });
      assert(false, "Ordinary caller must not be able to assign role to another UID");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("cannot assign or modify roles for another user"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 4: Targeted Security - Non-admin cannot assign 'paywaka-demo-all'
  // -------------------------------------------------------------------------
  await runTest("4. Demo Cashier Security: Non-admin cannot exploit paywaka-demo-all", async () => {
    const regularCashierUid = `usr_p5_cashier_regular_${Date.now()}`;
    await cleanTestUser(regularCashierUid);
    await db.collection("users").doc(regularCashierUid).set({ uid: regularCashierUid, role: "user" });

    try {
      await setDemoCashierRoleCore({
        callerUid: regularCashierUid,
        uid: regularCashierUid,
        vendorId: "paywaka-demo-all",
        isCallerAdmin: false,
      });
      assert(false, "Non-admin must not be able to obtain paywaka-demo-all");
    } catch (err) {
      assert(
        err.code === "permission-denied",
        `Expected permission-denied for paywaka-demo-all, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 5: Targeted Security - Demo provisioning strictly rejected outside emulator
  // -------------------------------------------------------------------------
  await runTest("5. Demo Cashier Security: Provisioning disabled when FUNCTIONS_EMULATOR is false", async () => {
    const anyUid = `usr_p5_prod_attempt_${Date.now()}`;
    const originalEmulatorFlag = process.env.FUNCTIONS_EMULATOR;
    try {
      process.env.FUNCTIONS_EMULATOR = "false";
      await setDemoCashierRoleCore({
        uid: anyUid,
        vendorId: testVendorId,
        isCallerAdmin: true,
      });
      assert(false, "Demo provisioning must be blocked outside emulator");
    } catch (err) {
      assert(
        err.code === "failed-precondition" || err.message.includes("disabled outside the local emulator"),
        `Expected failed-precondition, got: ${err.message}`
      );
    } finally {
      process.env.FUNCTIONS_EMULATOR = originalEmulatorFlag;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 6: Unknown Voucher Rejection
  // -------------------------------------------------------------------------
  await runTest("6. Unknown Voucher: reject non-existent voucher with not-found", async () => {
    const cashierUid = `usr_p5_cashier_01_${Date.now()}`;
    await cleanTestUser(cashierUid);
    await setDemoCashierRoleCore({
      uid: cashierUid,
      vendorId: testVendorId,
      branch: "Victoria Island",
      cashierName: "Amina",
      isCallerAdmin: true,
    });

    try {
      await validateMealVoucherForMerchantCore({
        cashierUid,
        voucherCodeOrId: "PWK-NONEXISTENT-9999",
        vendorId: testVendorId,
      });
      assert(false, "Expected not-found error");
    } catch (err) {
      assert(
        err.code === "not-found" || err.message.includes("not found"),
        `Expected not-found, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 7: Read-only Pre-validation without mutation
  // -------------------------------------------------------------------------
  await runTest("7. Pre-Validation: read-only eligibility check without record mutation", async () => {
    const customerUid = `usr_p5_cust_02_${Date.now()}`;
    const cashierUid = `usr_p5_cashier_02_${Date.now()}`;
    await cleanTestUser(customerUid);
    await cleanTestUser(cashierUid);
    await setDemoCashierRoleCore({ uid: cashierUid, vendorId: testVendorId, isCallerAdmin: true });

    const voucher = await createTestVoucher({
      userId: customerUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      discountNaira: 500,
      minSpendNaira: 2500,
    });

    const res = await validateMealVoucherForMerchantCore({
      cashierUid,
      voucherCodeOrId: voucher.voucherCode,
      vendorId: testVendorId,
    });

    assert(res.success === true, "Validation must succeed");
    assert(res.eligible === true, "Eligible must be true");
    assert(res.voucher.voucherCode === voucher.voucherCode, "Voucher code must match");
    assert(res.voucher.discountNaira === 500, "Discount must be 500");
    assert(res.voucher.minSpendNaira === 2500, "minSpend must be 2500");
    assert(res.campaign.remainingBudgetNaira === 100000, "Remaining budget must be 100,000");

    // Verify ZERO mutations occurred on voucher and campaign
    const vDoc = await db.collection("meal_vouchers").doc(voucher.id).get();
    assert(vDoc.data().status === "active", "Voucher status must remain active");
    assert(vDoc.data().redeemedAt === null, "redeemedAt must remain null");

    const campDoc = await db.collection("meal_campaigns").doc(testCampaignId).get();
    assert(campDoc.data().campaignSpentNaira === 0, "campaignSpentNaira must remain 0");
  });

  // -------------------------------------------------------------------------
  // TEST 8: Successful eligible voucher redemption (Happy Path)
  // -------------------------------------------------------------------------
  let happyVoucher = null;
  const happyCustomerUid = `usr_p5_cust_happy_${Date.now()}`;
  const happyCashierUid = `usr_p5_cashier_happy_${Date.now()}`;

  await runTest("8. Happy Path: successful redemption, atomic status update, campaign spent increment", async () => {
    await cleanTestUser(happyCustomerUid);
    await cleanTestUser(happyCashierUid);
    await setDemoCashierRoleCore({
      uid: happyCashierUid,
      vendorId: testVendorId,
      branch: "Victoria Island • Lagos",
      cashierName: "Toluwani",
      isCallerAdmin: true,
    });

    happyVoucher = await createTestVoucher({
      userId: happyCustomerUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      discountNaira: 500,
      minSpendNaira: 2500,
      voucherPin: "1234",
    });

    const idempotencyKey = `idem_happy_${Date.now()}`;
    const redemptionRes = await redeemMealVoucherMerchantCore({
      cashierUid: happyCashierUid,
      voucherCodeOrId: happyVoucher.voucherCode,
      vendorId: testVendorId,
      vendorBranch: "Victoria Island • Lagos",
      billAmountNaira: 3500,
      voucherPin: "1234",
      idempotencyKey,
    });

    assert(redemptionRes.success === true, "Redemption must succeed");
    assert(redemptionRes.redemptionId, "Must return redemptionId");
    assert(redemptionRes.redemptionReference.startsWith("PWK-RED-"), "Must have redemption reference");
    assert(redemptionRes.billAmountNaira === 3500, "Bill amount must be 3500");
    assert(redemptionRes.discountNaira === 500, "Discount must be 500");
    assert(redemptionRes.finalPayableNaira === 3000, "Final payable must be 3000 (3500 - 500)");

    // 1. Verify meal_vouchers document updated atomically
    const vDoc = await db.collection("meal_vouchers").doc(happyVoucher.id).get();
    const vData = vDoc.data();
    assert(vData.status === "redeemed", "Voucher status must be 'redeemed'");
    assert(vData.redemptionId === redemptionRes.redemptionId, "Redemption ID must match");
    assert(vData.redeemedByVendorStaffUid === happyCashierUid, "Staff UID must match cashier");
    assert(vData.actualDiscountNaira === 500, "Actual discount recorded on voucher");
    assert(vData.finalPayableNaira === 3000, "Final payable recorded on voucher");

    // 2. Verify meal_campaigns document counters incremented
    const campDoc = await db.collection("meal_campaigns").doc(testCampaignId).get();
    const campData = campDoc.data();
    assert(campData.campaignSpentNaira === 500, `campaignSpentNaira must be 500 (was ${campData.campaignSpentNaira})`);
    assert(campData.redemptionCount === 1, `redemptionCount must be 1 (was ${campData.redemptionCount})`);

    // 3. Verify meal_redemptions audit record created
    const redDoc = await db.collection("meal_redemptions").doc(redemptionRes.redemptionId).get();
    assert(redDoc.exists, "Redemption record must exist in meal_redemptions");
    const rData = redDoc.data();
    assert(rData.voucherId === happyVoucher.id, "Voucher ID must match");
    assert(rData.cashierUid === happyCashierUid, "Cashier UID must match");
    assert(rData.billAmountNaira === 3500, "Bill amount must match");
    assert(rData.discountNaira === 500, "Discount must match");
    assert(rData.finalPayableNaira === 3000, "Final payable must match");
    assert(rData.idempotencyKey === idempotencyKey, "Idempotency key must match");

    // 4. Verify admin_audit_logs created
    const auditDocs = await db.collection("admin_audit_logs").where("redemptionId", "==", redemptionRes.redemptionId).get();
    assert(auditDocs.size === 1, "Must have exactly 1 audit log entry");
    assert(auditDocs.docs[0].data().action === "MEAL_VOUCHER_REDEMPTION", "Action must be MEAL_VOUCHER_REDEMPTION");
  });

  // -------------------------------------------------------------------------
  // TEST 9: Targeted Verification - Invalid, Negative & Out-of-range Bill Totals
  // -------------------------------------------------------------------------
  await runTest("9. Bill Total Validation: reject negative, zero, non-finite, or excessive bill amounts", async () => {
    const vch = await createTestVoucher({
      userId: `usr_bill_val_${Date.now()}`,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
    });

    const invalidBills = [0, -500, NaN, Infinity, -Infinity, 999999999];
    for (const badBill of invalidBills) {
      try {
        await redeemMealVoucherMerchantCore({
          cashierUid: happyCashierUid,
          voucherCodeOrId: vch.id,
          vendorId: testVendorId,
          billAmountNaira: badBill,
        });
        assert(false, `Expected invalid-argument for bill ${badBill}`);
      } catch (err) {
        assert(
          err.code === "invalid-argument",
          `Expected invalid-argument for ${badBill}, got: ${err.message}`
        );
      }
    }
  });

  // -------------------------------------------------------------------------
  // TEST 10: Minimum spend threshold enforcement
  // -------------------------------------------------------------------------
  await runTest("10. Minimum Spend: reject bill total below campaign threshold without mutation", async () => {
    const custUid = `usr_p5_cust_minspend_${Date.now()}`;
    const vch = await createTestVoucher({
      userId: custUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      minSpendNaira: 3000,
      discountNaira: 500,
    });

    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: vch.id,
        vendorId: testVendorId,
        billAmountNaira: 2000, // Below 3,000 threshold
      });
      assert(false, "Expected failed-precondition for bill below minimum spend");
    } catch (err) {
      assert(
        err.code === "failed-precondition" || err.message.includes("Minimum spend requirement not met"),
        `Expected minimum spend error, got: ${err.message}`
      );
    }

    const vDoc = await db.collection("meal_vouchers").doc(vch.id).get();
    assert(vDoc.data().status === "active", "Voucher must remain active");
  });

  // -------------------------------------------------------------------------
  // TEST 11: Server-Time Expiry Rejection
  // -------------------------------------------------------------------------
  await runTest("11. Server-Time Expiry: reject expired voucher even if client sends stale request", async () => {
    const custUid = `usr_p5_cust_expired_${Date.now()}`;
    const expiredVch = await createTestVoucher({
      userId: custUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      expiresInHours: -2, // expired 2 hours ago
    });

    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: expiredVch.id,
        vendorId: testVendorId,
        billAmountNaira: 3500,
      });
      assert(false, "Expected failed-precondition for expired voucher");
    } catch (err) {
      assert(
        err.code === "failed-precondition" || err.message.includes("expired"),
        `Expected expired error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 12: Double Redemption Rejection
  // -------------------------------------------------------------------------
  await runTest("12. Double Redemption: reject already-redeemed voucher with new idempotency key", async () => {
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: happyVoucher.id,
        vendorId: testVendorId,
        billAmountNaira: 3500,
        idempotencyKey: `new_distinct_key_attempt_${Date.now()}`,
      });
      assert(false, "Expected failed-precondition for already-redeemed voucher");
    } catch (err) {
      assert(
        err.code === "failed-precondition" || err.message.includes("already been redeemed"),
        `Expected already-redeemed error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 13: Idempotency deduplication on retries with same key
  // -------------------------------------------------------------------------
  await runTest("13. Idempotency: re-calling with same key returns existing record without double-charging", async () => {
    const custUid = `usr_p5_cust_idem_${Date.now()}`;
    const vch = await createTestVoucher({
      userId: custUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
    });

    const idempotencyKey = `idempotent_retry_key_${Date.now()}`;

    // First call
    const res1 = await redeemMealVoucherMerchantCore({
      cashierUid: happyCashierUid,
      voucherCodeOrId: vch.id,
      vendorId: testVendorId,
      billAmountNaira: 3000,
      idempotencyKey,
    });
    assert(res1.success === true, "First redemption must succeed");

    const spentAfterCall1 = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;

    // Second call with same idempotency key (network retry)
    const res2 = await redeemMealVoucherMerchantCore({
      cashierUid: happyCashierUid,
      voucherCodeOrId: vch.id,
      vendorId: testVendorId,
      billAmountNaira: 3000,
      idempotencyKey,
    });

    assert(res2.success === true, "Second call must succeed idempotently");
    assert(res2.idempotent === true, "Expected idempotent: true");
    assert(res2.redemptionId === res1.redemptionId, "Must return identical redemptionId");

    const spentAfterCall2 = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;
    assert(spentAfterCall1 === spentAfterCall2, "Campaign budget must NOT be incremented twice");
  });

  // -------------------------------------------------------------------------
  // TEST 14: Targeted Security - Idempotency Key Reuse Across Different Vouchers (Sequential)
  // -------------------------------------------------------------------------
  await runTest("14. Idempotency Security: reject reuse of same idempotency key for different voucher", async () => {
    const cust1 = `usr_p5_cross_vch_1_${Date.now()}`;
    const cust2 = `usr_p5_cross_vch_2_${Date.now()}`;

    const vch1 = await createTestVoucher({ userId: cust1, vendorId: testVendorId, campaignId: testCampaignId, offerId: testOfferId });
    const vch2 = await createTestVoucher({ userId: cust2, vendorId: testVendorId, campaignId: testCampaignId, offerId: testOfferId });

    const sharedKey = `shared_collision_key_${Date.now()}`;

    // Redeem Voucher 1 with key
    const res1 = await redeemMealVoucherMerchantCore({
      cashierUid: happyCashierUid,
      voucherCodeOrId: vch1.id,
      vendorId: testVendorId,
      billAmountNaira: 3000,
      idempotencyKey: sharedKey,
    });
    assert(res1.success === true, "Voucher 1 must redeem successfully");

    // Attempt to redeem Voucher 2 with that same key
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: vch2.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
        idempotencyKey: sharedKey,
      });
      assert(false, "Reusing key for different voucher must fail");
    } catch (err) {
      assert(
        err.code === "already-exists" || err.message.includes("collision"),
        `Expected already-exists collision error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 15: Targeted Security - Role Revocation Takes Immediate Effect
  // -------------------------------------------------------------------------
  await runTest("15. Role Revocation: demoted cashier is immediately blocked from redeeming", async () => {
    const demoteUid = `usr_p5_demote_cashier_${Date.now()}`;
    await cleanTestUser(demoteUid);

    // 1. Provision as vendor
    await setDemoCashierRoleCore({
      uid: demoteUid,
      vendorId: testVendorId,
      isCallerAdmin: true,
    });

    const vch = await createTestVoucher({
      userId: `usr_demote_test_${Date.now()}`,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
    });

    // 2. Revoke role (switch to customer_only) in Firestore
    await setDemoCashierRoleCore({
      uid: demoteUid,
      vendorId: "customer_only",
      isCallerAdmin: true,
    });

    // 2b. Simulate stale token claims: explicitly write vendor claims to Auth record to prove
    // server-side authorization relies authoritatively on live Firestore profile, NOT stale token claims!
    try {
      await admin.auth().setCustomUserClaims(demoteUid, {
        role: "vendor",
        vendorId: testVendorId,
      });
    } catch (e) {}

    // 3. Immediately attempt redemption - must still be rejected via live Firestore profile
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: demoteUid,
        voucherCodeOrId: vch.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
      });
      assert(false, "Demoted cashier must be rejected even if Auth claims are stale");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("not authorized"),
        `Expected permission-denied for revoked cashier, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 16: Wrong Vendor Rejection
  // -------------------------------------------------------------------------
  await runTest("16. Wrong Vendor: reject redemption when voucher was issued for a different vendor", async () => {
    const custUid = `usr_p5_cust_wrongvendor_${Date.now()}`;
    const woodfireVch = await createTestVoucher({
      userId: custUid,
      vendorId: testOtherVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
    });

    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: woodfireVch.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
      });
      assert(false, "Expected permission-denied for wrong vendor");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("different vendor"),
        `Expected vendor mismatch error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 17: Campaign budget ceiling protection invariant & exhaustion
  // -------------------------------------------------------------------------
  await runTest("17. Budget Exhaustion: strictly reject redemption when budget ceiling is exceeded", async () => {
    const tightCampaignId = `camp_p5_tight_budget_${Date.now()}`;
    await db.collection("meal_campaigns").doc(tightCampaignId).set({
      id: tightCampaignId,
      offerId: "offer-tight",
      vendorId: testVendorId,
      title: "Tight Budget Campaign",
      discountNaira: 500,
      minSpendNaira: 2500,
      status: "active",
      campaignBudgetNaira: 1000,
      campaignSpentNaira: 800,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const custUid = `usr_p5_cust_tight_${Date.now()}`;
    const vch = await createTestVoucher({
      userId: custUid,
      vendorId: testVendorId,
      campaignId: tightCampaignId,
      offerId: "offer-tight",
      discountNaira: 500,
    });

    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: vch.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
      });
      assert(false, "Expected resource-exhausted for budget overflow");
    } catch (err) {
      assert(
        err.code === "resource-exhausted" || err.message.includes("budget exhausted"),
        `Expected budget exhausted error, got: ${err.message}`
      );
    }

    const campDoc = await db.collection("meal_campaigns").doc(tightCampaignId).get();
    assert(campDoc.data().campaignSpentNaira === 800, "Campaign spent must not exceed ceiling");
    const vDoc = await db.collection("meal_vouchers").doc(vch.id).get();
    assert(vDoc.data().status === "active", "Voucher must remain active on budget overflow");
  });

  // -------------------------------------------------------------------------
  // TEST 18: Concurrent attempts to redeem the SAME voucher
  // -------------------------------------------------------------------------
  await runTest("18. Concurrency: simultaneous redemption attempts on SAME voucher issue exactly 1 redemption", async () => {
    const custUid = `usr_p5_cust_race_same_${Date.now()}`;
    const raceVch = await createTestVoucher({
      userId: custUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      discountNaira: 500,
      minSpendNaira: 2500,
    });

    const spentBefore = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;

    const promises = [1, 2, 3, 4, 5].map((i) =>
      redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: raceVch.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
        idempotencyKey: `req_race_same_${i}_${Date.now()}`,
      }).then(
        (val) => ({ success: true, val }),
        (err) => ({ success: false, err: err.message, code: err.code })
      )
    );

    const outcomes = await Promise.all(promises);
    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    assert(successes.length === 1, `Expected exactly 1 success, got ${successes.length}`);
    assert(failures.length === 4, `Expected exactly 4 failures, got ${failures.length}`);

    const vDoc = await db.collection("meal_vouchers").doc(raceVch.id).get();
    assert(vDoc.data().status === "redeemed", "Voucher status must be redeemed");
    assert(vDoc.data().redemptionId === successes[0].val.redemptionId, "Redemption ID must match successful call");

    const spentAfter = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;
    assert(spentAfter === spentBefore + 500, `Budget must be incremented by 500 (was ${spentBefore}, now ${spentAfter})`);

    const redDocs = await db.collection("meal_redemptions").where("voucherId", "==", raceVch.id).get();
    assert(redDocs.size === 1, `Expected exactly 1 redemption record, got ${redDocs.size}`);
  });

  // -------------------------------------------------------------------------
  // TEST 19: Concurrent redemptions competing for limited budget
  // -------------------------------------------------------------------------
  await runTest("19. Concurrency: simultaneous vouchers competing for limited budget never exceed ceiling", async () => {
    const limitedCampId = `camp_p5_competing_${Date.now()}`;
    await db.collection("meal_campaigns").doc(limitedCampId).set({
      id: limitedCampId,
      offerId: "offer-competing",
      vendorId: testVendorId,
      title: "Competing Vouchers Campaign",
      discountNaira: 500,
      minSpendNaira: 2500,
      status: "active",
      campaignBudgetNaira: 2000,
      campaignSpentNaira: 1000,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vchList = [];
    for (let i = 1; i <= 4; i++) {
      const v = await createTestVoucher({
        userId: `usr_compete_${i}_${Date.now()}`,
        vendorId: testVendorId,
        campaignId: limitedCampId,
        offerId: "offer-competing",
        discountNaira: 500,
      });
      vchList.push(v);
    }

    const promises = vchList.map((v, i) =>
      redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: v.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
        idempotencyKey: `req_budget_compete_${i}_${Date.now()}`,
      }).then(
        (val) => ({ success: true, val }),
        (err) => ({ success: false, err: err.message, code: err.code })
      )
    );

    const outcomes = await Promise.all(promises);
    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    assert(successes.length === 2, `Expected exactly 2 redemptions to succeed, got ${successes.length}`);
    assert(failures.length === 2, `Expected exactly 2 redemptions to fail, got ${failures.length}`);

    for (const f of failures) {
      assert(
        f.code === "resource-exhausted" || f.err.includes("budget exhausted"),
        `Expected budget exhausted, got: ${f.err}`
      );
    }

    const campDoc = await db.collection("meal_campaigns").doc(limitedCampId).get();
    assert(campDoc.data().campaignSpentNaira === 2000, `Budget must cap at 2000, got ${campDoc.data().campaignSpentNaira}`);
  });

  // -------------------------------------------------------------------------
  // TEST 20: Firestore Security Rules preventing client direct writes
  // -------------------------------------------------------------------------
  await runTest("20. Security Rules: Client SDK cannot directly update vouchers, redemptions, or campaign budget", async () => {
    const maliciousUid = `malicious_client_${Date.now()}`;
    await cleanTestUser(maliciousUid);
    await db.collection("users").doc(maliciousUid).set({
      email: `${maliciousUid}@paywaka.test`,
      role: "customer",
    });

    const customToken = await admin.auth().createCustomToken(maliciousUid);
    await signInWithCustomToken(clientAuth, customToken);

    // 20a. Attempt direct client write to meal_vouchers
    try {
      await updateDoc(doc(clientDb, "meal_vouchers", happyVoucher.id), {
        status: "fraudulent_edit",
      });
      assert(false, "Client direct update to meal_vouchers must be rejected by rules");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission"),
        `Expected permission-denied on meal_vouchers, got: ${err.message}`
      );
    }

    // 20b. Attempt direct client creation of meal_redemptions
    try {
      await setDoc(doc(clientDb, "meal_redemptions", `fake_red_${Date.now()}`), {
        id: "fake_red",
        discountNaira: 999999,
        status: "completed",
      });
      assert(false, "Client direct create on meal_redemptions must be rejected by rules");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission"),
        `Expected permission-denied on meal_redemptions, got: ${err.message}`
      );
    }

    // 20c. Attempt direct client update to meal_campaigns
    try {
      await updateDoc(doc(clientDb, "meal_campaigns", testCampaignId), {
        campaignSpentNaira: 0,
        campaignBudgetNaira: 9999999,
      });
      assert(false, "Client direct update to meal_campaigns must be rejected by rules");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission"),
        `Expected permission-denied on meal_campaigns, got: ${err.message}`
      );
    }

    // 20d. Attempt direct client write to meal_idempotency_records
    try {
      await setDoc(doc(clientDb, "meal_idempotency_records", `fake_idem_${Date.now()}`), {
        fake: true,
      });
      assert(false, "Client direct write to meal_idempotency_records must be rejected by rules");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission"),
        `Expected permission-denied on meal_idempotency_records, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 21: CONCURRENT CROSS-VOUCHER IDEMPOTENCY RACE
  // -------------------------------------------------------------------------
  await runTest("21. Concurrency: simultaneous redemption requests with SAME key for TWO DIFFERENT vouchers", async () => {
    const custA = `usr_p5_race_vch_A_${Date.now()}`;
    const custB = `usr_p5_race_vch_B_${Date.now()}`;

    const vchA = await createTestVoucher({
      userId: custA,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      discountNaira: 500,
    });

    const vchB = await createTestVoucher({
      userId: custB,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      discountNaira: 500,
    });

    const sharedRaceKey = `race_shared_key_${Date.now()}_crossvch`;
    const spentBefore = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;

    // Concurrently submit the exact same key for Voucher A and Voucher B
    const [resA, resB] = await Promise.all([
      redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: vchA.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
        idempotencyKey: sharedRaceKey,
      }).then(
        (val) => ({ success: true, val }),
        (err) => ({ success: false, err: err.message, code: err.code })
      ),
      redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: vchB.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
        idempotencyKey: sharedRaceKey,
      }).then(
        (val) => ({ success: true, val }),
        (err) => ({ success: false, err: err.message, code: err.code })
      ),
    ]);

    // Exactly one must succeed, and the other must fail with already-exists collision
    const outcomes = [resA, resB];
    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    assert(successes.length === 1, `Expected exactly 1 success, got ${successes.length}`);
    assert(failures.length === 1, `Expected exactly 1 failure, got ${failures.length}`);
    assert(
      failures[0].code === "already-exists" ||
        failures[0].err.includes("collision") ||
        failures[0].err.includes("Transaction is invalid or closed") ||
        failures[0].err.includes("ABORTED"),
      `Expected already-exists error on losing request, got: ${failures[0].err}`
    );

    // Verify exactly one voucher was mutated to 'redeemed' and the other remains 'active'
    const docA = (await db.collection("meal_vouchers").doc(vchA.id).get()).data();
    const docB = (await db.collection("meal_vouchers").doc(vchB.id).get()).data();

    const redeemedCount = (docA.status === "redeemed" ? 1 : 0) + (docB.status === "redeemed" ? 1 : 0);
    const activeCount = (docA.status === "active" ? 1 : 0) + (docB.status === "active" ? 1 : 0);

    assert(redeemedCount === 1, `Exactly 1 voucher must be redeemed (got ${redeemedCount})`);
    assert(activeCount === 1, `Exactly 1 voucher must remain active (got ${activeCount})`);

    // Campaign budget incremented by exactly ONE voucher discount (500)
    const spentAfter = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;
    assert(spentAfter === spentBefore + 500, `Budget must increase by exactly 500 (was ${spentBefore}, now ${spentAfter})`);

    // Verify meal_idempotency_records has exactly one record bound to the winner
    const idemDoc = await db.collection("meal_idempotency_records").doc(sharedRaceKey).get();
    assert(idemDoc.exists, "Deterministic idempotency lock record must exist");
    const winningVoucherId = successes[0].val.voucherId;
    assert(idemDoc.data().voucherId === winningVoucherId, "Idempotency record must be bound to winning voucher");
  });

  // -------------------------------------------------------------------------
  // TEST 22: CUSTOM CLAIMS PRESERVATION
  // -------------------------------------------------------------------------
  await runTest("22. Custom Claims Preservation: Unrelated claims are preserved across cashier provisioning & revocation", async () => {
    const claimsUserUid = `usr_p5_claims_preserv_${Date.now()}`;
    await cleanTestUser(claimsUserUid);

    // 1. Create user in Auth with initial custom claims and seed in Firestore as real admin
    try {
      await admin.auth().createUser({
        uid: claimsUserUid,
        email: `${claimsUserUid}@test.demo`,
      });
    } catch (e) {}

    await db.collection("users").doc(claimsUserUid).set({
      uid: claimsUserUid,
      role: "admin",
      isAdmin: true,
      email: `${claimsUserUid}@test.demo`,
    }, { merge: true });

    await admin.auth().setCustomUserClaims(claimsUserUid, {
      admin: true,
      membershipTier: "platinum",
    });

    // 2. Provision as demo cashier
    await setDemoCashierRoleCore({
      uid: claimsUserUid,
      vendorId: testVendorId,
      branch: "Victoria Island",
      isCallerAdmin: true,
    });

    // Verify vendor claims added while initial verified admin claims preserved
    let userAuth = await admin.auth().getUser(claimsUserUid);
    assert(userAuth.customClaims.role === "vendor", "role claim must be 'vendor'");
    assert(userAuth.customClaims.vendorId === testVendorId, "vendorId claim must match");
    assert(userAuth.customClaims.admin === true, "Verified admin claim must be preserved");
    assert(userAuth.customClaims.membershipTier === "platinum", "Unrelated 'membershipTier' claim must be preserved");

    // 3. Revoke cashier role
    await setDemoCashierRoleCore({
      uid: claimsUserUid,
      vendorId: "customer_only",
      isCallerAdmin: true,
    });

    // Verify vendor privileges stripped while verified admin claims remain preserved
    userAuth = await admin.auth().getUser(claimsUserUid);
    assert(userAuth.customClaims.role === "user", "role claim must be 'user'");
    assert(userAuth.customClaims.vendorId === undefined, "vendorId claim must be cleared");
    assert(userAuth.customClaims.admin === true, "Verified admin claim must remain preserved after revocation");
    assert(userAuth.customClaims.membershipTier === "platinum", "Unrelated 'membershipTier' claim must remain preserved");
  });

  // -------------------------------------------------------------------------
  // TEST 23: CUSTOM CLAIMS ADMINISTRATIVE PRIVILEGE PROTECTION
  // -------------------------------------------------------------------------
  await runTest("23. Custom Claims Security: Unverified admin claims on non-admin are stripped upon cashier revocation/provisioning", async () => {
    const nonAdminUid = `usr_p5_nonadmin_cashier_${Date.now()}`;
    await cleanTestUser(nonAdminUid);

    // 1. Create ordinary user in Auth with an unverified admin claim and legitimate membership tier
    try {
      await admin.auth().createUser({
        uid: nonAdminUid,
        email: `${nonAdminUid}@test.demo`,
      });
    } catch (e) {}

    // In Firestore, user is strictly an ordinary user (NOT an admin)
    await db.collection("users").doc(nonAdminUid).set({
      uid: nonAdminUid,
      role: "user",
      isAdmin: false,
    }, { merge: true });

    // Manually assign custom claims simulating stale or forged token claims
    await admin.auth().setCustomUserClaims(nonAdminUid, {
      admin: true,
      membershipTier: "gold",
    });

    // 2. Provision as cashier
    await setDemoCashierRoleCore({
      uid: nonAdminUid,
      vendorId: testVendorId,
      branch: "Lekki Phase 1",
      isCallerAdmin: true,
    });

    let authRecord = await admin.auth().getUser(nonAdminUid);
    assert(authRecord.customClaims.role === "vendor", "role claim must be 'vendor'");
    assert(authRecord.customClaims.admin === undefined, "Unverified admin claim must be stripped upon provisioning");
    assert(authRecord.customClaims.membershipTier === "gold", "Legitimate unrelated claim must be preserved");

    // 3. Revoke cashier role
    await setDemoCashierRoleCore({
      uid: nonAdminUid,
      vendorId: "customer_only",
      isCallerAdmin: true,
    });

    authRecord = await admin.auth().getUser(nonAdminUid);
    assert(authRecord.customClaims.role === "user", "role claim must be 'user'");
    assert(authRecord.customClaims.vendorId === undefined, "vendorId claim must be removed");
    assert(authRecord.customClaims.admin === undefined, "Revoked cashier must NOT retain admin claim");
    assert(authRecord.customClaims.membershipTier === "gold", "membershipTier remains preserved");
  });

  // -------------------------------------------------------------------------
  // TEST 24: IDEMPOTENCY CONSISTENCY - CONFLICTING BILL AMOUNT REJECTION
  // -------------------------------------------------------------------------
  await runTest("24. Idempotency Consistency: Conflicting billAmountNaira on retry is rejected without mutation", async () => {
    const custUid = `usr_p5_bill_conflict_${Date.now()}`;
    const vch = await createTestVoucher({
      userId: custUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      discountNaira: 500,
    });

    const conflictKey = `bill_conflict_key_${Date.now()}`;

    // 1. Initial successful redemption with billAmount: 3000
    const res1 = await redeemMealVoucherMerchantCore({
      cashierUid: happyCashierUid,
      voucherCodeOrId: vch.id,
      vendorId: testVendorId,
      billAmountNaira: 3000,
      idempotencyKey: conflictKey,
    });
    assert(res1.success === true, "Initial redemption must succeed");
    assert(res1.billAmountNaira === 3000, "Initial bill must be 3000");

    const spentBefore = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;

    // 2. Retry with SAME key and SAME voucher, but conflicting billAmountNaira: 5000
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: happyCashierUid,
        voucherCodeOrId: vch.id,
        vendorId: testVendorId,
        billAmountNaira: 5000, // Conflict!
        idempotencyKey: conflictKey,
      });
      assert(false, "Conflicting billAmountNaira on retry must be rejected");
    } catch (err) {
      assert(
        err.code === "invalid-argument" || err.message.includes("Idempotency conflict"),
        `Expected invalid-argument for conflicting bill amount, got: ${err.message}`
      );
    }

    // 3. Assert zero mutations occurred from the rejected attempt
    const spentAfter = (await db.collection("meal_campaigns").doc(testCampaignId).get()).data().campaignSpentNaira;
    assert(spentBefore === spentAfter, "Campaign budget must not change on rejected retry");

    // 4. Legitimate retry with identical billAmount: 3000 succeeds and returns original result
    const resRetry = await redeemMealVoucherMerchantCore({
      cashierUid: happyCashierUid,
      voucherCodeOrId: vch.id,
      vendorId: testVendorId,
      billAmountNaira: 3000,
      idempotencyKey: conflictKey,
    });
    assert(resRetry.success === true, "Legitimate retry must succeed");
    assert(resRetry.idempotent === true, "Legitimate retry must return idempotent: true");
    assert(resRetry.billAmountNaira === 3000, "Original bill amount preserved");
    assert(resRetry.redemptionId === res1.redemptionId, "Must return original redemption ID");
  });

  // -------------------------------------------------------------------------
  // TEST 25: IDEMPOTENCY PROTECTION - UNAUTHORIZED CROSS-CASHIER RETRY
  // -------------------------------------------------------------------------
  await runTest("25. Idempotency Protection: Another cashier using the same key is rejected without leaking data", async () => {
    // Provision Cashier A
    const cashierA = `usr_p5_cashier_A_${Date.now()}`;
    await setDemoCashierRoleCore({
      uid: cashierA,
      vendorId: testVendorId,
      branch: "Branch A",
      isCallerAdmin: true,
    });

    // Provision Cashier B (different cashier for same merchant)
    const cashierB = `usr_p5_cashier_B_${Date.now()}`;
    await setDemoCashierRoleCore({
      uid: cashierB,
      vendorId: testVendorId,
      branch: "Branch B",
      isCallerAdmin: true,
    });

    const custUid = `usr_p5_cross_cashier_${Date.now()}`;
    const vch = await createTestVoucher({
      userId: custUid,
      vendorId: testVendorId,
      campaignId: testCampaignId,
      offerId: testOfferId,
      discountNaira: 500,
    });

    const crossCashierKey = `cross_cashier_key_${Date.now()}`;

    // 1. Cashier A initiates and completes redemption
    const resA = await redeemMealVoucherMerchantCore({
      cashierUid: cashierA,
      voucherCodeOrId: vch.id,
      vendorId: testVendorId,
      billAmountNaira: 3000,
      idempotencyKey: crossCashierKey,
    });
    assert(resA.success === true, "Cashier A redemption must succeed");

    // 2. Cashier B attempts to submit the same idempotency key for this voucher
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: cashierB,
        voucherCodeOrId: vch.id,
        vendorId: testVendorId,
        billAmountNaira: 3000,
        idempotencyKey: crossCashierKey,
      });
      assert(false, "Cashier B attempting to reuse Cashier A's idempotency key must be rejected");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("another cashier"),
        `Expected permission-denied for cross-cashier retry, got: ${err.message}`
      );
    }

    // 3. Cashier A performing legitimate retry succeeds
    const retryA = await redeemMealVoucherMerchantCore({
      cashierUid: cashierA,
      voucherCodeOrId: vch.id,
      vendorId: testVendorId,
      billAmountNaira: 3000,
      idempotencyKey: crossCashierKey,
    });
    assert(retryA.success === true, "Cashier A retry must succeed");
    assert(retryA.idempotent === true, "Cashier A retry must return idempotent: true");
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("PHASE 5 TEST SUMMARY");
  console.log("==================================================================");
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    console.error("\nSome Phase 5 tests failed:");
    results.filter((r) => r.status === "FAILED").forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log(`\nALL ${results.length} PHASE 5 MERCHANT REDEMPTION & SECURITY TESTS PASSED! 🎉`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Phase 5 test suite:", err);
  process.exit(1);
});

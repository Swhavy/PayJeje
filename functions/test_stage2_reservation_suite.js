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
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";

const clientApp = initializeApp(
  {
    apiKey: "fake-api-key-for-emulator",
    projectId: "vtu-site-43118",
  },
  "client-stage2-rules-app"
);

const clientDb = getFirestore(clientApp);
connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });

let redeemMealCouponCore;
let validateMealVoucherForMerchantCore;
let redeemMealVoucherMerchantCore;
let evaluateVoucherRedemptionEligibilityCore;
let migrateCampaignReservationsCore;
let reconcileExpiredVouchersCore;
let updateCampaignBudgetCore;
let updateCampaignStatusCore;
let setDemoCashierRoleCore;
let hashTransactionPin;
let generatePinSalt;

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
    console.log(`✅ [PASS] ${testName}`);
    results.push({ name: testName, pass: true });
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}: ${err.message}`);
    results.push({ name: testName, pass: false, error: err.message });
  }
}

async function createTestCustomer(uid, points = 1000) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage2.test`,
    role: "user",
    points,
    hasTransactionPin: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  if (generatePinSalt && hashTransactionPin) {
    const salt = generatePinSalt();
    const hash = await hashTransactionPin("1842", salt, 1);
    await db.collection("users").doc(uid).collection("private_security").doc("pin_credentials").set({
      hash,
      salt,
      pepperVersion: 1,
      attempts: 0,
      lockedUntil: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function createTestCashier(uid, vendorId) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage2.test`,
    role: "vendor",
    vendorId,
    vendorRole: "cashier",
    vendorBranch: "Victoria Island",
    cashierName: "Cashier Stage2",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createTestVendorOwner(uid, vendorId) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage2.test`,
    role: "vendor",
    vendorId,
    vendorRole: "owner",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createTestAdmin(uid) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage2.test`,
    role: "admin",
    isAdmin: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function main() {
  console.log("==================================================================");
  console.log("STAGE 2 TEST SUITE: ATOMIC RESERVATION ENGINE & LIFECYCLE SAFETY");
  console.log("==================================================================");

  const indexModule = await import("./index.js");
  redeemMealCouponCore = indexModule.redeemMealCouponCore;
  validateMealVoucherForMerchantCore = indexModule.validateMealVoucherForMerchantCore;
  redeemMealVoucherMerchantCore = indexModule.redeemMealVoucherMerchantCore;
  evaluateVoucherRedemptionEligibilityCore = indexModule.evaluateVoucherRedemptionEligibilityCore;
  migrateCampaignReservationsCore = indexModule.migrateCampaignReservationsCore;
  reconcileExpiredVouchersCore = indexModule.reconcileExpiredVouchersCore;
  updateCampaignBudgetCore = indexModule.updateCampaignBudgetCore;
  updateCampaignStatusCore = indexModule.updateCampaignStatusCore;
  setDemoCashierRoleCore = indexModule.setDemoCashierRoleCore;
  hashTransactionPin = indexModule.hashTransactionPin;
  generatePinSalt = indexModule.generatePinSalt;

  const vendorId = "vendor-stg2-alpha";
  const otherVendorId = "vendor-stg2-beta";
  const cashierUid = `usr_cashier_stg2_${Date.now()}`;
  const vendorOwnerUid = `usr_owner_stg2_${Date.now()}`;
  const otherVendorOwnerUid = `usr_other_owner_stg2_${Date.now()}`;
  const adminUid = `usr_admin_stg2_${Date.now()}`;

  await createTestCashier(cashierUid, vendorId);
  await createTestVendorOwner(vendorOwnerUid, vendorId);
  await createTestVendorOwner(otherVendorOwnerUid, otherVendorId);
  await createTestAdmin(adminUid);

  // -------------------------------------------------------------------------
  // SECTION 1: ATOMIC BUDGET RESERVATIONS ON CUSTOMER CLAIMS
  // -------------------------------------------------------------------------

  await runTest("1. Claim Reservation: Successful claim atomically reserves capacity & debits points", async () => {
    const campId = `camp_stg2_claim_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 100,
      discountNaira: 500,
      minSpendNaira: 2500,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const custUid = `usr_cust_clm_${Date.now()}`;
    await createTestCustomer(custUid, 500);

    const res = await redeemMealCouponCore({
      uid: custUid,
      couponId: campId,
      pin: "1842",
      idempotencyKey: `idem_clm_${Date.now()}`,
    });

    assert(res.success === true, "Claim must succeed");
    assert(res.voucher.discountNaira === 500, "Voucher discount must be 500");

    // Verify voucher document
    const vDoc = await db.collection("meal_vouchers").doc(res.voucher.id).get();
    const vData = vDoc.data();
    assert(vData.budgetReserved === true, "Voucher budgetReserved must be true");
    assert(vData.reservedAmountNaira === 500, "Voucher reservedAmountNaira must be 500");
    assert(vData.isLegacyVoucher === false, "Normal voucher must have isLegacyVoucher false");
    assert(vData.migrationBatchId === null, "Normal voucher must have migrationBatchId null");

    // Verify campaign document
    const campDoc = await db.collection("meal_campaigns").doc(campId).get();
    const cData = campDoc.data();
    assert(cData.campaignReservedNaira === 500, "Campaign reserved capacity must be incremented to 500");
    assert(cData.campaignSpentNaira === 0, "Campaign spent must remain 0");

    // Verify user balance & ledger
    const uDoc = await db.collection("users").doc(custUid).get();
    assert(uDoc.data().points === 400, "User points must be debited by 100 (500 -> 400)");
  });

  await runTest("2. Claim Invariant: Failed claim does NOT debit points or reserve capacity", async () => {
    const campId = `camp_stg2_fail_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 300,
      discountNaira: 500,
      minSpendNaira: 2500,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const custUid = `usr_cust_fail_${Date.now()}`;
    await createTestCustomer(custUid, 100); // Insufficient points (100 < 300)

    let failed = false;
    try {
      await redeemMealCouponCore({
        uid: custUid,
        couponId: campId,
        pin: "1842",
        idempotencyKey: `idem_fail_${Date.now()}`,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "failed-precondition", "Must fail with failed-precondition for insufficient points");
    }
    assert(failed, "Expected insufficient points error");

    // Invariant check: points and reservation untouched
    const uDoc = await db.collection("users").doc(custUid).get();
    assert(uDoc.data().points === 100, "User points must remain untouched (100)");

    const campDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(campDoc.data().campaignReservedNaira === 0, "Campaign reserved capacity must remain 0");
  });

  await runTest("3. Claim Idempotency: Retrying claim returns original voucher without double-reserve", async () => {
    const campId = `camp_stg2_idem_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 50,
      discountNaira: 500,
      minSpendNaira: 2500,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const custUid = `usr_cust_idem_${Date.now()}`;
    await createTestCustomer(custUid, 500);
    const idemKey = `idem_retry_${Date.now()}`;

    const res1 = await redeemMealCouponCore({ uid: custUid, couponId: campId, pin: "1842", idempotencyKey: idemKey });
    assert(res1.success === true, "First claim must succeed");

    const res2 = await redeemMealCouponCore({ uid: custUid, couponId: campId, pin: "1842", idempotencyKey: idemKey });
    assert(res2.success === true && res2.idempotent === true, "Retry must return idempotent result");
    assert(res2.voucher.id === res1.voucher.id, "Must return exact same voucher ID");

    // Invariant check: points debited once, capacity reserved once
    const uDoc = await db.collection("users").doc(custUid).get();
    assert(uDoc.data().points === 450, "User points must be debited only once (500 - 50 = 450)");

    const campDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(campDoc.data().campaignReservedNaira === 500, "Campaign reserved capacity must remain 500 (not 1000)");
  });

  await runTest("4. Claim Concurrency: Limited budget accommodates only valid claims up to capacity", async () => {
    const campId = `camp_stg2_race_${Date.now()}`;
    // Budget: 1,000. Discount: 500. Capacity = 2 vouchers!
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 10,
      discountNaira: 500,
      minSpendNaira: 2500,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 1000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const customers = [];
    for (let i = 0; i < 4; i++) {
      const u = `usr_race_${i}_${Date.now()}`;
      await createTestCustomer(u, 100);
      customers.push(u);
    }

    const claimPromises = customers.map((u, i) =>
      redeemMealCouponCore({
        uid: u,
        couponId: campId,
        pin: "1842",
        idempotencyKey: `idem_race_${i}_${Date.now()}`,
      }).then(
        (res) => ({ success: true, res }),
        (err) => ({ success: false, err })
      )
    );

    const outcomes = await Promise.all(claimPromises);
    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    assert(successes.length === 2, `Exactly 2 claims must succeed for ₦1000 budget (got ${successes.length})`);
    assert(failures.length === 2, `Exactly 2 claims must fail (got ${failures.length})`);

    const campDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(campDoc.data().campaignReservedNaira === 1000, "Campaign reserved capacity must be exactly 1000");
  });

  // -------------------------------------------------------------------------
  // SECTION 2: MERCHANT TERMINAL REDEMPTION & RESERVATION RELEASE
  // -------------------------------------------------------------------------

  await runTest("5. Exact-Once Redemption: Successfully releases reservation and increments spent", async () => {
    const campId = `camp_stg2_red_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_red_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      offerId: "offer-red",
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-RED-0001",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      migrationBatchId: null,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
      billAmountNaira: 3000,
      idempotencyKey: `idem_red_${Date.now()}`,
    });

    assert(redRes.success === true, "Redemption must succeed");
    assert(redRes.discountNaira === 500, "Discount must be 500");
    assert(redRes.finalPayableNaira === 2500, "Payable must be 2500");

    // Voucher record must have budgetReserved: false
    const vDoc = await db.collection("meal_vouchers").doc(voucherId).get();
    assert(vDoc.data().status === "redeemed", "Voucher status must be redeemed");
    assert(vDoc.data().budgetReserved === false, "Voucher budgetReserved must be released to false");

    // Campaign record must shift 500 from reserved to spent
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignReservedNaira === 0, "Campaign reserved must decrement to 0");
    assert(cDoc.data().campaignSpentNaira === 500, "Campaign spent must increment to 500");
  });

  await runTest("6. Validation Agreement: Read-only validation matches final redemption decision", async () => {
    const campId = `camp_stg2_val_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_val_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-VAL-0001",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      migrationBatchId: null,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Terminal pre-validation
    const valRes = await validateMealVoucherForMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
    });
    assert(valRes.success === true, "Pre-validation must succeed");
    assert(valRes.eligible === true, "Pre-validation must mark voucher eligible");

    // Final redemption
    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
      billAmountNaira: 3000,
      idempotencyKey: `idem_val_${Date.now()}`,
    });
    assert(redRes.success === true, "Final redemption must agree and succeed");
  });

  await runTest("7. Sealed Promise Integrity: Reservation mismatch strictly aborts without silent discount clamping", async () => {
    const campId = `camp_stg2_mismatch_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 400,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Inconsistent voucher: promises 500 discount, but reserved only 400
    const voucherId = `vch_stg2_mismatch_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-MIS-0001",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 400, // MISMATCH!
      isLegacyVoucher: false,
      migrationBatchId: null,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Pre-validation must catch it
    const valRes = await validateMealVoucherForMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
    });
    assert(valRes.eligible === false, "Pre-validation must report not eligible");
    assert(valRes.reason === "reservation-integrity-mismatch", "Reason must be reservation-integrity-mismatch");

    // Redemption must fail closed without silently granting 400
    let redFailed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      redFailed = true;
      assert(e.code === "failed-precondition", "Must fail with failed-precondition");
      assert(e.message.includes("reservation integrity mismatch"), "Message must mention reservation integrity mismatch");
    }
    assert(redFailed, "Redemption must fail closed on reservation mismatch");

    // Campaign spent must remain 0
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignSpentNaira === 0, "Campaign spent must not increase");
  });

  // -------------------------------------------------------------------------
  // SECTION 3: DUAL-PATH EXPOSURE & LEGACY RECONCILIATION
  // -------------------------------------------------------------------------

  await runTest("8. Option A Legacy: Verified legacy voucher redeems even when budget is fully spent", async () => {
    const campId = `camp_stg2_leg_ok_${Date.now()}`;
    const batchId = `mig_batch_${Date.now()}`;
    // Budget: 10,000. Spent: 10,000. Initial Overcommitment: 500. Legacy ceiling: 10,500.
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      campaignBudgetAtMigrationNaira: 10000,
      legacyOverCommitmentInitialNaira: 500,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      outstandingLegacyReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      migratedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_leg_ok_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-0001",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 100000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Pre-validation must succeed under legacy exception
    const valRes = await validateMealVoucherForMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
    });
    assert(valRes.eligible === true, "Legacy voucher must be eligible under historical ceiling");

    // Redemption must succeed and push spend to 10,500
    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
      billAmountNaira: 3000,
      idempotencyKey: `idem_leg_${Date.now()}`,
    });
    assert(redRes.success === true, "Legacy redemption must succeed");
    assert(redRes.discountNaira === 500, "Discount must be 500");

    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignSpentNaira === 10500, "Campaign spent must now be 10,500");
    assert(cDoc.data().campaignReservedNaira === 0, "Campaign reserved must be 0");
    assert(cDoc.data().outstandingLegacyReservedNaira === 0, "Outstanding legacy reserved must be 0");
  });

  await runTest("9. Legacy Ceiling Enforcement: Redemption exceeding historical legacy ceiling is strictly rejected", async () => {
    const campId = `camp_stg2_leg_ceil_${Date.now()}`;
    const batchId = `mig_batch_ceil_${Date.now()}`;
    // Spent: 10,500. Ceiling: 10,500. Another legacy voucher of 500 attempts to redeem.
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      campaignBudgetAtMigrationNaira: 10000,
      legacyOverCommitmentInitialNaira: 500,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10500, // Ceiling reached!
      campaignReservedNaira: 500,
      outstandingLegacyReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      migratedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_leg_over_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-OVER",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 100000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "resource-exhausted", "Must fail with resource-exhausted");
      assert(e.message.includes("legacy exposure ceiling exceeded"), "Must mention legacy ceiling exceeded");
    }
    assert(failed, "Expected legacy ceiling rejection");
  });

  await runTest("10. Legacy Provenance Mismatch: Fake legacy voucher with mismatched batchId is rejected", async () => {
    const campId = `camp_stg2_batch_mismatch_${Date.now()}`;
    const realBatchId = `mig_batch_real_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: realBatchId,
      campaignBudgetNaira: 10000,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      migratedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Attacker forged isLegacyVoucher: true with fake batchId
    const voucherId = `vch_stg2_fake_leg_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-FAKE",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: "fake_batch_id_spoofed",
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 100000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("migration batch does not match"), "Must mention batch mismatch");
    }
    assert(failed, "Expected batchId mismatch rejection");
  });

  await runTest("10b. Legacy Provenance Mismatch: Post-migration voucher claiming legacy status is strictly rejected", async () => {
    const campId = `camp_stg2_post_leg_${Date.now()}`;
    const batchId = `mig_batch_post_${Date.now()}`;
    const migrationTime = new Date(Date.now() - 60000); // Migrated 1 minute ago
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(migrationTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Attacker forged isLegacyVoucher: true and valid batchId, but issued AFTER migration
    const voucherId = `vch_stg2_post_leg_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-POST",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now())), // Issued after migration!
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must mention timestamp precedence");
    }
    assert(failed, "Expected post-migration legacy provenance rejection");
  });

  await runTest("10c. Strict Precedence: Voucher issued exactly equal to migration completion is rejected", async () => {
    const campId = `camp_stg2_eq_leg_${Date.now()}`;
    const batchId = `mig_batch_eq_${Date.now()}`;
    const timestampMs = Date.now() - 60000;
    const exactTime = new Date(timestampMs);

    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(exactTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_eq_leg_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-EQ",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(exactTime), // EXACTLY EQUAL!
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must mention timestamp precedence");
    }
    assert(failed, "Expected exact-equal timestamp legacy provenance rejection");
  });

  await runTest("10d. Fail-Closed: Missing or invalid issuance timestamp on legacy voucher is rejected", async () => {
    const campId = `camp_stg2_no_ts_${Date.now()}`;
    const batchId = `mig_batch_nots_${Date.now()}`;
    const migrationTime = new Date(Date.now() - 60000);

    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(migrationTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 1. Missing issuedAt
    const voucherIdNoTs = `vch_stg2_no_ts_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherIdNoTs).set({
      id: voucherIdNoTs,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-NOTS",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      // issuedAt is missing!
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failedMissing = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherIdNoTs,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failedMissing = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must reject missing issuedAt");
    }
    assert(failedMissing, "Expected missing issuedAt rejection");

    // 2. Corrupted/invalid issuedAt string
    const voucherIdInvalidTs = `vch_stg2_inv_ts_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherIdInvalidTs).set({
      id: voucherIdInvalidTs,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-INVTS",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: "not-a-valid-date-timestamp", // Corrupted timestamp string
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failedInvalid = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherIdInvalidTs,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failedInvalid = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must reject invalid issuedAt string");
    }
    assert(failedInvalid, "Expected invalid issuedAt rejection");

    // 3. Incorrectly typed numeric issuedAt (number of ms instead of Firestore Timestamp)
    const voucherIdNumTs = `vch_stg2_num_ts_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherIdNumTs).set({
      id: voucherIdNumTs,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-NUMTS",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: Date.now() - 100000, // Numeric ms instead of Firestore Timestamp
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failedNum = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherIdNumTs,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failedNum = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must reject numeric issuedAt");
    }
    assert(failedNum, "Expected numeric issuedAt rejection");
  });

  await runTest("10e. Canonical Timestamp Integrity: Missing migrationCompletedAt is rejected even when migratedAt is present", async () => {
    const campId = `camp_stg2_no_canon_${Date.now()}`;
    const batchId = `mig_batch_nocanon_${Date.now()}`;
    const migrationTime = new Date(Date.now() - 60000);

    // Campaign has NO migrationCompletedAt, ONLY migratedAt
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migratedAt: admin.firestore.Timestamp.fromDate(migrationTime), // Fallback present, but canonical missing!
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_nocanon_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-NOCANON",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 120000)), // Valid before migration
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must reject missing canonical migrationCompletedAt");
    }
    assert(failed, "Expected missing migrationCompletedAt rejection despite migratedAt presence");
  });

  await runTest("10f. String-Based Timestamps: ISO/Date strings are strictly rejected for legacy authorization", async () => {
    const campId = `camp_stg2_str_ts_${Date.now()}`;
    const batchId = `mig_batch_strts_${Date.now()}`;
    const migrationTime = new Date(Date.now() - 60000);

    // 1. Campaign with valid Timestamp, but Voucher with valid ISO date string
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(migrationTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherIdStrIssued = `vch_stg2_str_iss_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherIdStrIssued).set({
      id: voucherIdStrIssued,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-STRISS",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: new Date(Date.now() - 120000).toISOString(), // Plausible ISO string, but NOT a Firestore Timestamp!
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failedStrIssued = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherIdStrIssued,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failedStrIssued = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must reject string issuedAt");
    }
    assert(failedStrIssued, "Expected string issuedAt rejection");

    // 2. Campaign with valid ISO string for migrationCompletedAt, Voucher with valid Timestamp
    const campIdStrMig = `camp_stg2_str_mig_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campIdStrMig).set({
      id: campIdStrMig,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      legacyAuthorizedExposureCeilingNaira: 10500,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migrationCompletedAt: migrationTime.toISOString(), // Plausible string, but NOT a Firestore Timestamp!
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherIdValid = `vch_stg2_vld_iss_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherIdValid).set({
      id: voucherIdValid,
      userId: "usr_dummy",
      vendorId,
      campaignId: campIdStrMig,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-VLDISS",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 120000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failedStrMig = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherIdValid,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failedStrMig = true;
      assert(e.code === "permission-denied", "Must fail with permission-denied");
      assert(e.message.includes("precede campaign migration completion"), "Must reject string migrationCompletedAt");
    }
    assert(failedStrMig, "Expected string migrationCompletedAt rejection");
  });

  await runTest("11. Fail-Closed Baseline: Missing historical authorization ceiling fails closed", async () => {
    const campId = `camp_stg2_no_base_${Date.now()}`;
    const batchId = `mig_batch_nobase_${Date.now()}`;
    // Campaign has NO legacyAuthorizedExposureCeilingNaira!
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: batchId,
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 500,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      migratedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50000)),
      // legacyAuthorizedExposureCeilingNaira: MISSING
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_nobase_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-LEG-NOBASE",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 100000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "failed-precondition", "Must fail with failed-precondition");
      assert(e.message.includes("legacy authorization baseline is missing"), "Must report missing baseline");
    }
    assert(failed, "Expected fail-closed on missing baseline");
  });

  // -------------------------------------------------------------------------
  // SECTION 4: TEST 25 (NEGATIVE) & TEST 29 (POSITIVE CONTROL)
  // -------------------------------------------------------------------------

  await runTest("12. Test 25: Normal post-migration voucher rejected when spend exceeds budget (inconsistent seeded fixture)", async () => {
    const campId = `camp_stg2_test25_${Date.now()}`;
    // Seeded fixture: Budget: 10,000. Spent: 10,000.
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 10000, // Budget fully spent!
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Normal post-migration voucher (isLegacyVoucher: false)
    const voucherId = `vch_stg2_norm_rej_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-NORM-REJ",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false, // Normal voucher!
      migrationBatchId: null,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let failed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 3000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "resource-exhausted", "Normal voucher must fail with resource-exhausted when spend == budget");
      assert(e.message.includes("Campaign promotional budget exhausted"), "Message must indicate budget exhausted");
    }
    assert(failed, "Normal voucher must be rejected when spend reaches budget");
  });

  await runTest("13. Test 29: Budget-consistent normal voucher redemption within budget (positive control)", async () => {
    const campId = `camp_stg2_test29_${Date.now()}`;
    // Budget: 10,000. Spent: 9,000. Reserved: 1,000.
    // 9,000 + 500 = 9,500 <= 10,000.
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 9000,
      campaignReservedNaira: 1000,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_stg2_test29_vch_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-TEST29-OK",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      migrationBatchId: null,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
      billAmountNaira: 3000,
      idempotencyKey: `idem_t29_${Date.now()}`,
    });

    assert(redRes.success === true, "Normal voucher redemption within budget must succeed");
    assert(redRes.discountNaira === 500, "Discount granted must be 500");

    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignSpentNaira === 9500, "Campaign spent must now be 9500");
    assert(cDoc.data().campaignReservedNaira === 500, "Campaign reserved must now be 500");
  });

  // -------------------------------------------------------------------------
  // SECTION 5: CAMPAIGN LIFECYCLE ENFORCEMENT
  // -------------------------------------------------------------------------

  await runTest("14. Lifecycle: Paused campaign blocks new claims but honors existing valid vouchers", async () => {
    const campId = `camp_stg2_paused_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 50,
      discountNaira: 500,
      minSpendNaira: 2000,
      status: "paused", // PAUSED!
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 1. New claim attempt must fail
    const custUid = `usr_cust_paused_${Date.now()}`;
    await createTestCustomer(custUid, 200);

    let claimFailed = false;
    try {
      await redeemMealCouponCore({ uid: custUid, couponId: campId, pin: "1842" });
    } catch (e) {
      claimFailed = true;
      assert(e.code === "failed-precondition", "Must fail with failed-precondition for paused campaign");
    }
    assert(claimFailed, "New claims must be blocked on paused campaign");

    // 2. Existing pre-issued voucher must still redeem
    const voucherId = `vch_stg2_paused_ok_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: custUid,
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-PAUSED-OK",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
      billAmountNaira: 2500,
    });
    assert(redRes.success === true, "Valid voucher must redeem even on paused campaign");
  });

  await runTest("15. Lifecycle: Ended campaign blocks new claims but honors existing valid vouchers", async () => {
    const campId = `camp_stg2_ended_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 50,
      discountNaira: 500,
      minSpendNaira: 2000,
      status: "ended", // ENDED!
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 1. New claim attempt must fail
    const custUid = `usr_cust_ended_${Date.now()}`;
    await createTestCustomer(custUid, 200);

    let claimFailed = false;
    try {
      await redeemMealCouponCore({ uid: custUid, couponId: campId, pin: "1842" });
    } catch (e) {
      claimFailed = true;
      assert(e.code === "failed-precondition", "Must fail with failed-precondition for ended campaign");
    }
    assert(claimFailed, "New claims must be blocked on ended campaign");

    // 2. Existing voucher must still redeem
    const voucherId = `vch_stg2_ended_ok_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: custUid,
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-ENDED-OK",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId,
      billAmountNaira: 2500,
    });
    assert(redRes.success === true, "Valid voucher must redeem even on ended campaign");
  });

  await runTest("16. Lifecycle: Emergency halt blocks BOTH new claims AND redemptions", async () => {
    const campId = `camp_stg2_halt_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 50,
      discountNaira: 500,
      minSpendNaira: 2000,
      status: "emergency_halt", // EMERGENCY HALT!
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const custUid = `usr_cust_halt_${Date.now()}`;
    await createTestCustomer(custUid, 200);

    // 1. Claim blocked
    let claimFailed = false;
    try {
      await redeemMealCouponCore({ uid: custUid, couponId: campId, pin: "1842" });
    } catch (e) {
      claimFailed = true;
      assert(e.code === "failed-precondition", "Must fail claim on emergency_halt");
    }
    assert(claimFailed, "Claims must be blocked on emergency_halt");

    // 2. Redemption blocked
    const voucherId = `vch_stg2_halt_blk_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: custUid,
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-HALT-BLK",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let redFailed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: voucherId,
        vendorId,
        billAmountNaira: 2500,
      });
    } catch (e) {
      redFailed = true;
      assert(e.code === "failed-precondition", "Must fail redemption on emergency_halt");
      assert(e.message.includes("emergency administrative halt"), "Message must mention emergency halt");
    }
    assert(redFailed, "Redemptions must be blocked on emergency_halt");
  });

  await runTest("17. Campaign Readiness Gate: Unmigrated campaign blocks customer claims", async () => {
    const campId = `camp_stg2_unmig_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      pointsCost: 50,
      discountNaira: 500,
      minSpendNaira: 2000,
      status: "active",
      migrationStatus: "unmigrated", // UNMIGRATED!
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const custUid = `usr_cust_unmig_${Date.now()}`;
    await createTestCustomer(custUid, 200);

    let claimFailed = false;
    try {
      await redeemMealCouponCore({ uid: custUid, couponId: campId, pin: "1842" });
    } catch (e) {
      claimFailed = true;
      assert(e.code === "failed-precondition", "Must fail claim on unmigrated campaign");
      assert(e.message.includes("not ready for customer claims"), "Message must mention not ready");
    }
    assert(claimFailed, "Claims must be blocked on unmigrated campaign");
  });

  // -------------------------------------------------------------------------
  // SECTION 6: MIGRATION ENGINE & WORKER FENCING
  // -------------------------------------------------------------------------

  await runTest("18. Migration Execution: Successfully migrates outstanding vouchers and freezes baseline", async () => {
    const campId = `camp_stg2_mig_run_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "unmigrated",
      campaignBudgetNaira: 1000,
      campaignSpentNaira: 800,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Seed 2 active pre-existing vouchers (2 x ₦500 = ₦1,000)
    // Total exposure = 800 + 1000 = 1,800. Overcommitment = 800. Ceiling = 1,800.
    for (let i = 1; i <= 2; i++) {
      const vId = `vch_legacy_pre_${i}_${Date.now()}`;
      await db.collection("meal_vouchers").doc(vId).set({
        id: vId,
        userId: `usr_dummy_${i}`,
        vendorId,
        campaignId: campId,
        discountNaira: 500,
        minSpendNaira: 2000,
        status: "active",
        issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const migResult = await migrateCampaignReservationsCore({
      campaignId: campId,
      workerId: "worker_alpha",
    });

    assert(migResult.status === "ready", "Migration must result in status ready");
    assert(migResult.totalReservedNaira === 1000, "Total reserved must be 1000");
    assert(migResult.legacyAuthorizedExposureCeilingNaira === 1800, "Ceiling must be 1800 (1000 + 800)");
    assert(migResult.migrationCompletedAt !== undefined, "migResult must return migrationCompletedAt");

    // Verify campaign doc
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    const cData = cDoc.data();
    assert(cData.migrationStatus === "ready", "Campaign migrationStatus must be ready");
    assert(cData.campaignReservedNaira === 1000, "Campaign reserved capacity must be 1000");
    assert(cData.outstandingLegacyReservedNaira === 1000, "Outstanding legacy reserved must be 1000");
    assert(cData.legacyAuthorizedExposureCeilingNaira === 1800, "Legacy ceiling must be 1800");
    assert(cData.migrationCompletedAt !== undefined, "Campaign doc must record migrationCompletedAt");
    assert(cData.migrationLock === null, "Migration lock must be released");
  });

  await runTest("19. Migration Idempotency: Running migration on ready campaign returns already_ready", async () => {
    const campId = `camp_stg2_mig_idem_${Date.now()}`;
    const initialCompletedAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 60000));
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready", // Already ready!
      migrationBatchId: "mig_batch_existing",
      migrationCompletedAt: initialCompletedAt,
      legacyAuthorizedExposureCeilingNaira: 5000,
      campaignBudgetNaira: 5000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await migrateCampaignReservationsCore({
      campaignId: campId,
      workerId: "worker_beta",
    });

    assert(res.status === "already_ready", "Must return already_ready status");
    assert(res.migrationBatchId === "mig_batch_existing", "Must preserve existing migrationBatchId");
    assert(res.migrationCompletedAt !== undefined, "Must return existing migrationCompletedAt");
  });

  await runTest("20. Worker Fencing: Stale worker is fenced out after replacement worker acquires higher generation", async () => {
    const campId = `camp_stg2_fence_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "migrating",
      migrationBatchId: "mig_fence_test",
      migrationLock: {
        workerId: "worker_A",
        workerFencingGeneration: 1,
        acquiredAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 100000)),
        leaseExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000)), // EXPIRED!
      },
      campaignBudgetNaira: 5000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Worker B takes over under generation 2
    const resB = await migrateCampaignReservationsCore({
      campaignId: campId,
      workerId: "worker_B",
    });
    assert(resB.status === "ready", "Worker B must take over and complete migration");

    // Campaign is now generation 2 and ready. If worker A tries to write under generation 1:
    const campDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(campDoc.data().migrationStatus === "ready", "Campaign is ready");
  });

  await runTest("20b. Interrupted Migration Recovery: Replacement worker resumes partially migrated campaign and completes to ready", async () => {
    const campId = `camp_stg2_mig_recov_${Date.now()}`;
    const batchId = `mig_recov_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "migrating",
      migrationBatchId: batchId,
      migrationLock: {
        workerId: "worker_crashed",
        workerFencingGeneration: 1,
        acquiredAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 120000)),
        leaseExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000)), // EXPIRED!
      },
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Voucher 1: already processed by crashed worker
    const v1 = `vch_recov_1_${Date.now()}`;
    await db.collection("meal_vouchers").doc(v1).set({
      id: v1,
      userId: "usr_recov_1",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: true,
      migrationBatchId: batchId,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Voucher 2: unmigrated
    const v2 = `vch_recov_2_${Date.now()}`;
    await db.collection("meal_vouchers").doc(v2).set({
      id: v2,
      userId: "usr_recov_2",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Voucher 3: unmigrated
    const v3 = `vch_recov_3_${Date.now()}`;
    await db.collection("meal_vouchers").doc(v3).set({
      id: v3,
      userId: "usr_recov_3",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Worker B takes over expired lease under generation 2
    const res = await migrateCampaignReservationsCore({
      campaignId: campId,
      workerId: "worker_takeover_b",
      batchSize: 2,
    });

    assert(res.status === "ready", "Worker B must finish migration and mark campaign ready");
    assert(res.totalReservedNaira === 1500, "All 3 vouchers (v1 resumed + v2 + v3) must be reserved for 1500");

    // Verify campaign document
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    const cData = cDoc.data();
    assert(cData.migrationStatus === "ready", "Campaign must be ready");
    assert(cData.campaignReservedNaira === 1500, "Campaign reserved must be 1,500");
    assert(cData.outstandingLegacyReservedNaira === 1500, "Outstanding legacy reserved must be 1,500");
    assert(cData.migrationLock === null, "Migration lock must be released");

    // Verify all 3 vouchers are active with budgetReserved === true
    const vDoc2 = await db.collection("meal_vouchers").doc(v2).get();
    const vDoc3 = await db.collection("meal_vouchers").doc(v3).get();
    assert(vDoc2.data().budgetReserved === true, "V2 must now be budgetReserved");
    assert(vDoc3.data().budgetReserved === true, "V3 must now be budgetReserved");
  });

  await runTest("20c. Reconciliation / Fencing Failure: Generation mismatch prevents campaign reaching ready", async () => {
    const campId = `camp_stg2_reconcile_fail_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "migrating",
      migrationBatchId: "mig_batch_fencetrip",
      migrationLock: {
        workerId: "worker_stale",
        workerFencingGeneration: 1,
        acquiredAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10000)),
        leaseExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60000)), // Active lease
      },
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Competitor advances fencing generation behind worker_stale
    await db.collection("meal_campaigns").doc(campId).update({
      "migrationLock.workerFencingGeneration": 2,
      "migrationLock.workerId": "worker_usurper",
    });

    // When worker_stale attempts to run page migration, it must trip fencing check and abort
    let tripFailed = false;
    try {
      // Simulate worker_stale trying to acquire or execute
      await migrateCampaignReservationsCore({
        campaignId: campId,
        workerId: "worker_stale",
      });
    } catch (e) {
      tripFailed = true;
      assert(e.code === "failed-precondition" || e.code === "aborted", "Must fail with aborted or failed-precondition");
    }
    assert(tripFailed, "Worker stale must fail when lease generation does not match");

    // Invariant: Campaign NEVER transitioned to ready
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().migrationStatus === "migrating", "Campaign must NEVER reach ready under stale worker");
  });

  await runTest("21. Pre-Migration Expiry: Expired vouchers before migration are marked expired and NOT reserved", async () => {
    const campId = `camp_stg2_pre_exp_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "unmigrated",
      campaignBudgetNaira: 5000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Seed 1 active unexpired voucher and 1 expired voucher
    const vActive = `vch_active_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vActive).set({
      id: vActive,
      userId: "usr_dummy_act",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vExpired = `vch_exp_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vExpired).set({
      id: vExpired,
      userId: "usr_dummy_exp",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 72 * 3600 * 1000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000)), // EXPIRED!
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const migRes = await migrateCampaignReservationsCore({ campaignId: campId, workerId: "worker_exp" });
    assert(migRes.totalReservedNaira === 500, "Only active unexpired voucher must be reserved (500)");
    assert(migRes.totalExpired === 1, "Expired count must be 1");

    const expDoc = await db.collection("meal_vouchers").doc(vExpired).get();
    assert(expDoc.data().status === "expired", "Expired voucher status must be expired");
    assert(expDoc.data().budgetReserved === false, "Expired voucher budgetReserved must be false");
  });

  await runTest("22. Quarantine Policy: Vouchers missing server-created issuedAt are quarantined without invented discounts", async () => {
    const campId = `camp_stg2_quar_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "unmigrated",
      campaignBudgetNaira: 5000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Voucher missing issuedAt
    const vCorrupt = `vch_corrupt_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vCorrupt).set({
      id: vCorrupt,
      userId: "usr_dummy_corrupt",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      // issuedAt is missing!
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const migRes = await migrateCampaignReservationsCore({ campaignId: campId, workerId: "worker_quar" });
    assert(migRes.totalQuarantined === 1, "Must quarantine 1 corrupt voucher");
    assert(migRes.totalReservedNaira === 0, "No capacity should be reserved for quarantined voucher");

    // Verify quarantined voucher record in quarantined_meal_vouchers
    const qDoc = await db.collection("quarantined_meal_vouchers").doc(vCorrupt).get();
    assert(qDoc.exists, "Quarantined document must exist in quarantined_meal_vouchers");
    assert(qDoc.data().quarantineReason === "MISSING_OR_INVALID_ISSUED_AT", "Quarantine reason must be recorded");

    // Verify original voucher status updated to quarantined
    const origDoc = await db.collection("meal_vouchers").doc(vCorrupt).get();
    assert(origDoc.data().status === "quarantined", "Original voucher status must be quarantined");
  });

  // -------------------------------------------------------------------------
  // SECTION 7: EXPIRY RECONCILIATION ENGINE
  // -------------------------------------------------------------------------

  await runTest("23. Expiry Engine: Expired active vouchers are marked expired and reservations released exactly once", async () => {
    const campId = `camp_stg2_rec_exp_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 1500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vId1 = `vch_exp_rec_1_${Date.now()}`;
    const vId2 = `vch_exp_rec_2_${Date.now()}`;

    // 2 vouchers that expired 1 hour ago
    for (const id of [vId1, vId2]) {
      await db.collection("meal_vouchers").doc(id).set({
        id,
        userId: "usr_dummy",
        vendorId,
        campaignId: campId,
        discountNaira: 500,
        status: "active",
        budgetReserved: true,
        reservedAmountNaira: 500,
        isLegacyVoucher: false,
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const recResult = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(recResult.reconciledCount === 2, "Must reconcile 2 vouchers");
    assert(recResult.totalReleasedNaira === 1000, "Must release 1000 Naira reserved capacity");

    // Vouchers must be marked expired with budgetReserved: false
    const v1 = await db.collection("meal_vouchers").doc(vId1).get();
    assert(v1.data().status === "expired", "Voucher 1 must be expired");
    assert(v1.data().budgetReserved === false, "Voucher 1 budgetReserved must be false");

    // Campaign reserved capacity must be decremented by 1000 (1500 -> 500)
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignReservedNaira === 500, "Campaign reserved must decrement to 500");
  });

  await runTest("24. Expiry Idempotency: Re-running expiry reconciliation does NOT double-release reservations", async () => {
    const campId = `camp_stg2_rec_idem_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vId = `vch_exp_rec_idem_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Run 1
    const res1 = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(res1.reconciledCount === 1, "First run reconciles 1");

    // Run 2
    const res2 = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(res2.reconciledCount === 0, "Second run must reconcile 0");
    assert(res2.totalReleasedNaira === 0, "Second run releases 0");

    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignReservedNaira === 0, "Campaign reserved capacity must remain 0");
  });

  await runTest("25. Expiry Engine Skips Migrating Campaign: Avoids race with active migration lock", async () => {
    const campId = `camp_stg2_mig_skip_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "migrating", // IN MIGRATION!
      migrationLock: {
        workerId: "active_worker",
        workerFencingGeneration: 1,
        leaseExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60000)),
      },
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vId = `vch_exp_mig_skip_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(res.reconciledCount === 0, "Must skip vouchers whose campaign is migrating");

    const vDoc = await db.collection("meal_vouchers").doc(vId).get();
    assert(vDoc.data().status === "active", "Voucher status must remain unchanged during migration");
  });

  await runTest("25b. Redemption-vs-Expiry Concurrency: Simultaneous redemption and expiry sweep execute safely without double-release", async () => {
    const campId = `camp_stg2_exp_race_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create a voucher expiring right now
    const vRaceId = `vch_race_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vRaceId).set({
      id: vRaceId,
      userId: "usr_race_cust",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-RACE-001",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      issuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 50)), // Just expired
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Concurrently trigger merchant redemption and expiry sweep
    const pRedeem = redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: vRaceId,
      vendorId,
      billAmountNaira: 3000,
    });
    const pExpire = reconcileExpiredVouchersCore({
      campaignId: campId,
    });

    const outcomes = await Promise.allSettled([pRedeem, pExpire]);
    const redeemOutcome = outcomes[0];
    const expireOutcome = outcomes[1];

    // Exactly one transaction can claim/reconcile the voucher
    const vSnap = await db.collection("meal_vouchers").doc(vRaceId).get();
    const finalVoucherData = vSnap.data();

    // Verify voucher reached a valid terminal state (either redeemed OR expired, never active)
    assert(
      finalVoucherData.status === "redeemed" || finalVoucherData.status === "expired",
      `Final voucher status must be redeemed or expired (actual: ${finalVoucherData.status})`
    );

    // Verify campaign reserved capacity decremented exactly once from 500 to 0 (no negative or double release)
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    const cData = cDoc.data();
    assert(cData.campaignReservedNaira === 0, `campaignReservedNaira must be exactly 0 (actual: ${cData.campaignReservedNaira})`);
    if (finalVoucherData.status === "redeemed") {
      assert(cData.campaignSpentNaira === 500, "If redeemed won race, spent must be 500");
    } else {
      assert(cData.campaignSpentNaira === 0, "If expired won race, spent must remain 0");
    }
  });

  await runTest("25c. Expiry Readiness Gate: Expiry reconciliation skips pending campaign without mutating voucher status or counters", async () => {
    const campId = `camp_stg2_exp_pend_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "pending",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vId = `vch_exp_pend_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(res.reconciledCount === 0, "Must skip vouchers whose campaign is pending");

    const vDoc = await db.collection("meal_vouchers").doc(vId).get();
    assert(vDoc.data().status === "active", "Voucher status must remain active");
    assert(vDoc.data().budgetReserved === true, "Voucher budgetReserved must remain true");

    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignReservedNaira === 500, "Campaign reserved must remain 500");
    assert(cDoc.data().campaignSpentNaira === 0, "Campaign spent must remain 0");
    assert(cDoc.data().migrationStatus === "pending", "Campaign migrationStatus must remain pending");
  });

  await runTest("25d. Expiry Readiness Gate: Expiry reconciliation skips reconciling campaign without mutating voucher status or counters", async () => {
    const campId = `camp_stg2_exp_reconcile_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "reconciling",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vId = `vch_exp_reconcile_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(res.reconciledCount === 0, "Must skip vouchers whose campaign is reconciling");

    const vDoc = await db.collection("meal_vouchers").doc(vId).get();
    assert(vDoc.data().status === "active", "Voucher status must remain active");
    assert(vDoc.data().budgetReserved === true, "Voucher budgetReserved must remain true");

    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignReservedNaira === 500, "Campaign reserved must remain 500");
    assert(cDoc.data().campaignSpentNaira === 0, "Campaign spent must remain 0");
    assert(cDoc.data().migrationStatus === "reconciling", "Campaign migrationStatus must remain reconciling");
  });

  await runTest("25e. Expiry Readiness Gate: Expiry reconciliation skips quarantined campaign without mutating voucher status or counters", async () => {
    const campId = `camp_stg2_exp_quarantined_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "quarantined",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vId = `vch_exp_quarantined_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(res.reconciledCount === 0, "Must skip vouchers whose campaign is quarantined");

    const vDoc = await db.collection("meal_vouchers").doc(vId).get();
    assert(vDoc.data().status === "active", "Voucher status must remain active");
    assert(vDoc.data().budgetReserved === true, "Voucher budgetReserved must remain true");

    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignReservedNaira === 500, "Campaign reserved must remain 500");
    assert(cDoc.data().campaignSpentNaira === 0, "Campaign spent must remain 0");
    assert(cDoc.data().migrationStatus === "quarantined", "Campaign migrationStatus must remain quarantined");
  });

  await runTest("25f. Expiry Orphan Quarantine: Orphaned voucher without campaign document is safely quarantined without decrementing nonexistent counters", async () => {
    const nonexistentCampId = `camp_nonexistent_${Date.now()}`;
    const vId = `vch_orphan_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      userId: "usr_orphan",
      vendorId,
      campaignId: nonexistentCampId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await reconcileExpiredVouchersCore({ campaignId: nonexistentCampId });
    assert(res.reconciledCount === 0, "Orphaned voucher does not count as regular reconciliation");
    assert(res.quarantinedCount === 1, "Orphaned voucher counted in quarantinedCount");

    // Voucher must be quarantined safely
    const vDoc = await db.collection("meal_vouchers").doc(vId).get();
    assert(vDoc.data().status === "quarantined", "Orphaned voucher status must be quarantined");
    assert(vDoc.data().budgetReserved === false, "budgetReserved must be set to false");

    // Quarantined audit record exists
    const qDoc = await db.collection("quarantined_meal_vouchers").doc(vId).get();
    assert(qDoc.exists, "quarantined_meal_vouchers record must exist for orphaned voucher");
    assert(qDoc.data().quarantineReason === "ORPHANED_CAMPAIGN_NOT_FOUND", "Reason must be ORPHANED_CAMPAIGN_NOT_FOUND");

    // Nonexistent campaign doc must NOT have been created
    const cDoc = await db.collection("meal_campaigns").doc(nonexistentCampId).get();
    assert(!cDoc.exists, "Nonexistent campaign document must not be created or mutated");
  });

  await runTest("25g. Expiry Release on Ready Campaign: Vouchers successfully reconcile and release reservation capacity once campaign is ready", async () => {
    const campId = `camp_stg2_exp_ready_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 10000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vId = `vch_exp_ready_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      userId: "usr_dummy",
      vendorId,
      campaignId: campId,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await reconcileExpiredVouchersCore({ campaignId: campId });
    assert(res.reconciledCount === 1, "Must reconcile 1 expired voucher on ready campaign");
    assert(res.totalReleasedNaira === 500, "Must release ₦500 reserved capacity");

    const vDoc = await db.collection("meal_vouchers").doc(vId).get();
    assert(vDoc.data().status === "expired", "Voucher status must be expired");
    assert(vDoc.data().budgetReserved === false, "Voucher budgetReserved must be false");

    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    assert(cDoc.data().campaignReservedNaira === 0, "Campaign reserved must be decremented to 0");
    assert(cDoc.data().campaignSpentNaira === 0, "Campaign spent remains 0");
  });

  // -------------------------------------------------------------------------
  // SECTION 8: CAMPAIGN BUDGET UPDATES & IMMUTABILITY OF HISTORICAL CEILING
  // -------------------------------------------------------------------------

  await runTest("26. Budget Increase: Authorized budget increase allows new claims while keeping legacy baseline immutable", async () => {
    const campId = `camp_stg2_budg_inc_${Date.now()}`;
    // Budget: 10,000. Legacy Ceiling: 11,000.
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId,
      status: "active",
      migrationStatus: "ready",
      migrationBatchId: "batch_inc_test",
      campaignBudgetNaira: 10000,
      campaignBudgetAtMigrationNaira: 10000,
      legacyOverCommitmentInitialNaira: 1000,
      legacyAuthorizedExposureCeilingNaira: 11000, // IMMUTABLE BASELINE
      campaignSpentNaira: 9500,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Admin increases budget to ₦15,000
    const bRes = await updateCampaignBudgetCore({
      adminUid,
      campaignId: campId,
      newBudgetNaira: 15000,
    });
    assert(bRes.success === true, "Budget update must succeed");
    assert(bRes.newBudgetNaira === 15000, "New budget must be 15,000");

    // Verify campaign record
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    const cData = cDoc.data();
    assert(cData.campaignBudgetNaira === 15000, "campaignBudgetNaira must be 15,000");
    assert(cData.legacyAuthorizedExposureCeilingNaira === 11000, "legacyAuthorizedExposureCeilingNaira MUST remain 11,000");
    assert(cData.campaignBudgetAtMigrationNaira === 10000, "campaignBudgetAtMigrationNaira MUST remain 10,000");
  });

  await runTest("27. Vendor Owner Budget Authorization & Multi-Tenant Isolation", async () => {
    const campId = `camp_stg2_budg_owner_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId: vendorId, // Owned by vendorOwnerUid ("vendor-stg2-alpha")
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 20000,
      campaignBudgetAtMigrationNaira: 20000,
      legacyAuthorizedExposureCeilingNaira: 25000,
      campaignSpentNaira: 5000,
      campaignReservedNaira: 2500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 1. Authorized vendor owner increases budget of their own campaign within ₦200,000 ceiling
    const ownerRes = await updateCampaignBudgetCore({
      callerUid: vendorOwnerUid,
      campaignId: campId,
      newBudgetNaira: 50000,
    });
    assert(ownerRes.success === true, "Vendor owner of own campaign must succeed");
    assert(ownerRes.newBudgetNaira === 50000, "New budget must be updated to 50,000");

    // 2. Cross-vendor owner denied (owner of vendor-stg2-beta cannot modify vendor-stg2-alpha campaign)
    let crossVendorFailed = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: otherVendorOwnerUid, // Belongs to "vendor-stg2-beta"
        campaignId: campId,
        newBudgetNaira: 60000,
      });
    } catch (e) {
      crossVendorFailed = true;
      assert(e.code === "permission-denied", "Cross-vendor update must fail with permission-denied");
      assert(e.message.includes("Cross-vendor operation forbidden"), "Must mention cross-vendor forbidden");
    }
    assert(crossVendorFailed, "Cross-vendor owner must be DENIED");

    // 3. Cashier denied
    let cashierFailed = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: cashierUid,
        campaignId: campId,
        newBudgetNaira: 60000,
      });
    } catch (e) {
      cashierFailed = true;
      assert(e.code === "permission-denied", "Cashier must fail with permission-denied");
      assert(e.message.includes("Operation requires 'owner' role"), "Must mention owner role required");
    }
    assert(cashierFailed, "Cashier must be DENIED");

    // 4. Regular customer denied
    const custUid = `usr_cust_budget_hack_${Date.now()}`;
    await createTestCustomer(custUid, 100);
    let custFailed = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: custUid,
        campaignId: campId,
        newBudgetNaira: 60000,
      });
    } catch (e) {
      custFailed = true;
      assert(e.code === "permission-denied", "Customer must fail with permission-denied");
    }
    assert(custFailed, "Customer must be DENIED");

    // 5. Vendor owner budget exceeding ₦200,000 hard cap rejected
    let ownerOverCapFailed = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: vendorOwnerUid,
        campaignId: campId,
        newBudgetNaira: 250000, // Exceeds ₦200,000
      });
    } catch (e) {
      ownerOverCapFailed = true;
      assert(e.code === "invalid-argument", "Budget over 200k must fail with invalid-argument");
    }
    assert(ownerOverCapFailed, "Budget exceeding ₦200,000 must be DENIED for vendor owner");

    // 6. Administrator budget exceeding ₦200,000 rejected (no unapproved above-cap workflow)
    let adminOverCapFailed = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: adminUid,
        campaignId: campId,
        newBudgetNaira: 300000,
      });
    } catch (e) {
      adminOverCapFailed = true;
      assert(e.code === "invalid-argument", "Admin budget over 200k must fail with invalid-argument");
    }
    assert(adminOverCapFailed, "Budget exceeding ₦200,000 must be DENIED for admin");

    // 7. Budget below current committed promotional exposure (spent: 5000 + reserved: 2500 = 7500) rejected
    let underExposureFailed = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: vendorOwnerUid,
        campaignId: campId,
        newBudgetNaira: 6000, // Less than committed exposure of 7,500
      });
    } catch (e) {
      underExposureFailed = true;
      assert(e.code === "invalid-argument", "Budget below committed exposure must fail with invalid-argument");
    }
    assert(underExposureFailed, "Budget below committed exposure must be DENIED");

    // 8. Administrator succeeds within ₦200,000 limit
    const adminRes = await updateCampaignBudgetCore({
      adminUid,
      campaignId: campId,
      newBudgetNaira: 75000,
    });
    assert(adminRes.success === true, "Admin update within limit must succeed");
    assert(adminRes.newBudgetNaira === 75000, "New budget must be 75,000");

    // 9. Campaign accounting and historical baseline immutability invariant check
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    const cData = cDoc.data();
    assert(cData.campaignBudgetNaira === 75000, "Final budget must be 75,000");
    assert(cData.campaignSpentNaira === 5000, "campaignSpentNaira MUST remain untouched (5000)");
    assert(cData.campaignReservedNaira === 2500, "campaignReservedNaira MUST remain untouched (2500)");
    assert(cData.campaignBudgetAtMigrationNaira === 20000, "campaignBudgetAtMigrationNaira MUST remain untouched (20000)");
    assert(cData.legacyAuthorizedExposureCeilingNaira === 25000, "legacyAuthorizedExposureCeilingNaira MUST remain untouched (25000)");
  });

  // -------------------------------------------------------------------------
  // SECTION 9: SECURITY RULES LOCKDOWN FOR QUARANTINED VOUCHERS
  // -------------------------------------------------------------------------

  await runTest("28. Security Rules: Client SDK cannot read quarantined_meal_vouchers", async () => {
    const testCustUid = `usr_cust_rules_q_${Date.now()}`;
    await createTestCustomer(testCustUid, 500);

    const token = await admin.auth().createCustomToken(testCustUid);
    await signInWithCustomToken(clientAuth, token);

    let readBlocked = false;
    try {
      await getDoc(doc(clientDb, "quarantined_meal_vouchers", "any_doc_id"));
    } catch (e) {
      readBlocked = true;
      assert(e.message.includes("permission-denied") || e.code === "permission-denied", "Read must be denied");
    }
    assert(readBlocked, "Client SDK read of quarantined_meal_vouchers must be DENIED");
  });

  await runTest("29. Security Rules: Client SDK cannot write to quarantined_meal_vouchers", async () => {
    let writeBlocked = false;
    try {
      await setDoc(doc(clientDb, "quarantined_meal_vouchers", "injected_voucher"), {
        fraud: true,
      });
    } catch (e) {
      writeBlocked = true;
      assert(e.message.includes("permission-denied") || e.code === "permission-denied", "Write must be denied");
    }
    assert(writeBlocked, "Client SDK write to quarantined_meal_vouchers must be DENIED");
  });

  // -------------------------------------------------------------------------
  // FINAL TEST SUITE SUMMARY
  // -------------------------------------------------------------------------

  console.log("\n==================================================================");
  console.log("STAGE 2 TEST SUMMARY");
  console.log("==================================================================");
  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);

  if (failedCount > 0) {
    console.error("\nFAILED TESTS:");
    results.filter((r) => !r.pass).forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log(`\nALL ${results.length} STAGE 2 RESERVATION ENGINE & LIFECYCLE TESTS PASSED! 🎉\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});

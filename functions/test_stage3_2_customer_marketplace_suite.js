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

// Client SDK for testing Security Rules & Customer-facing queries
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
  "client-stage3-2-marketplace-app"
);

const clientDb = getFirestore(clientApp);
connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });

let createVendorCampaignCore;
let redeemMealCouponCore;
let reconcileExpiredVouchersCore;
let validateMealVoucherForMerchantCore;
let redeemMealVoucherMerchantCore;
let updateCampaignStatusCore;
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

async function authenticateClient(uid, customClaims = {}) {
  await signOut(clientAuth).catch(() => {});
  const token = await admin.auth().createCustomToken(uid, customClaims);
  await signInWithCustomToken(clientAuth, token);
}

async function createTestCustomer(uid, points = 1000) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage32.test`,
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
    email: `${uid}@stage32.test`,
    role: "vendor",
    vendorId,
    vendorRole: "cashier",
    vendorBranch: "Victoria Island",
    cashierName: "Cashier Stage32",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createTestVendorOwner(uid, vendorId) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage32.test`,
    role: "vendor",
    vendorId,
    vendorRole: "owner",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createTestAdmin(uid) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage32.test`,
    role: "admin",
    isAdmin: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function main() {
  console.log("==================================================================");
  console.log("STAGE 3.2 TEST SUITE: CUSTOMER MARKETPLACE & REAL-TIME CONSUMPTION");
  console.log("==================================================================");

  const indexModule = await import("./index.js");
  createVendorCampaignCore = indexModule.createVendorCampaignCore;
  redeemMealCouponCore = indexModule.redeemMealCouponCore;
  reconcileExpiredVouchersCore = indexModule.reconcileExpiredVouchersCore;
  validateMealVoucherForMerchantCore = indexModule.validateMealVoucherForMerchantCore;
  redeemMealVoucherMerchantCore = indexModule.redeemMealVoucherMerchantCore;
  updateCampaignStatusCore = indexModule.updateCampaignStatusCore;
  hashTransactionPin = indexModule.hashTransactionPin;
  generatePinSalt = indexModule.generatePinSalt;

  const vendorIdAlpha = "vendor-stg32-alpha";
  const vendorOwnerUid = `usr_owner_stg32_${Date.now()}`;
  const cashierUid = `usr_cashier_stg32_${Date.now()}`;
  const customerUid1 = `usr_cust1_stg32_${Date.now()}`;
  const customerUid2 = `usr_cust2_stg32_${Date.now()}`;
  const customerUid3 = `usr_cust3_stg32_${Date.now()}`;
  const adminUid = `usr_admin_stg32_${Date.now()}`;

  await createTestVendorOwner(vendorOwnerUid, vendorIdAlpha);
  await createTestCashier(cashierUid, vendorIdAlpha);
  await createTestCustomer(customerUid1, 10000);
  await createTestCustomer(customerUid2, 10000);
  await createTestCustomer(customerUid3, 10000);
  await createTestAdmin(adminUid);

  // -------------------------------------------------------------------------
  // TEST 1: NEW CAMPAIGN PROJECTION VERIFICATION
  // -------------------------------------------------------------------------
  let campaign1Id;
  await runTest("1. New campaign projection: created via createVendorCampaignCore, public projection matches invariants", async () => {
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUid,
      targetVendorId: vendorIdAlpha,
      title: "Delicious Suya & Rice Combo",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 100,
      campaignBudgetNaira: 50000,
      vendorName: "Alpha Delicacies",
    });

    assert(res.success === true, "Campaign creation must succeed");
    campaign1Id = res.campaignId;

    // Read via Admin SDK directly after callable returns (no polling helper)
    const pDoc = await db.collection("public_meal_offers").doc(campaign1Id).get();
    assert(pDoc.exists, "public_meal_offers document must exist");

    const pData = pDoc.data();
    assert(pData.isAvailable === true, "Projection isAvailable must be true");
    assert(pData.status === "active", "Projection status must be active");
    assert(pData.campaignId === campaign1Id, "campaignId must equal document ID");
    assert(pData.discountNaira === 500, "discountNaira must match 500");
    assert(pData.minSpendNaira === 2500, "minSpendNaira must match 2500");
    assert(pData.pointsCost === 100, "pointsCost must match 100");
    assert(pData.vendorName === "Alpha Delicacies", "vendorName must match");

    // Financial isolation verification: no internal budget/spent/reserved numbers leaked
    assert(pData.campaignBudgetNaira === undefined, "campaignBudgetNaira must NOT leak to projection");
    assert(pData.campaignSpentNaira === undefined, "campaignSpentNaira must NOT leak to projection");
    assert(pData.campaignReservedNaira === undefined, "campaignReservedNaira must NOT leak to projection");
  });

  // -------------------------------------------------------------------------
  // TEST 2: SOLD-OUT TRANSITION (CAPACITY EXHAUSTION)
  // -------------------------------------------------------------------------
  let soldOutCampId;
  let voucher1Id;
  let voucher2Id;
  await runTest("2. Sold-out transition: 1000 budget, 500 discount consumed by 2 claims transitions isAvailable to false", async () => {
    // Campaign with 1000 budget and 500 discount: exactly 2 claims capacity
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUid,
      targetVendorId: vendorIdAlpha,
      title: "Limited Budget Feast",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 100,
      campaignBudgetNaira: 1000,
      vendorName: "Alpha Delicacies",
    });
    soldOutCampId = res.campaignId;

    // Initial check: isAvailable is true
    let pDoc = await db.collection("public_meal_offers").doc(soldOutCampId).get();
    assert(pDoc.data().isAvailable === true, "Must start as available");

    // First claim by customer 1
    const claim1 = await redeemMealCouponCore({
      uid: customerUid1,
      couponId: soldOutCampId,
      pin: "1842",
      idempotencyKey: `idem_so1_${Date.now()}`,
    });
    assert(claim1.success === true, "Claim 1 must succeed");
    voucher1Id = claim1.voucher.id;

    // Available capacity remaining: 1000 - 500 = 500 >= 500, isAvailable still true
    pDoc = await db.collection("public_meal_offers").doc(soldOutCampId).get();
    assert(pDoc.data().isAvailable === true, "Must remain available after 1st claim (500 capacity left)");

    // Second claim by customer 2
    const claim2 = await redeemMealCouponCore({
      uid: customerUid2,
      couponId: soldOutCampId,
      pin: "1842",
      idempotencyKey: `idem_so2_${Date.now()}`,
    });
    assert(claim2.success === true, "Claim 2 must succeed");
    voucher2Id = claim2.voucher.id;

    // Available capacity remaining: 1000 - 1000 = 0 < 500, isAvailable transitions to false!
    pDoc = await db.collection("public_meal_offers").doc(soldOutCampId).get();
    assert(pDoc.data().isAvailable === false, "Must atomically transition isAvailable to FALSE when capacity exhausted");

    // 3rd customer claim attempt must be rejected with resource-exhausted
    let claim3Rejected = false;
    try {
      await redeemMealCouponCore({
        uid: customerUid3,
        couponId: soldOutCampId,
        pin: "1842",
        idempotencyKey: `idem_so3_${Date.now()}`,
      });
    } catch (err) {
      claim3Rejected = true;
      assert(err.code === "resource-exhausted", `Error code must be resource-exhausted, got ${err.code}`);
      assert(err.message.includes("budget capacity exhausted"), "Error message must indicate budget exhaustion");
    }
    assert(claim3Rejected, "3rd claim must be rejected when sold out");
  });

  // -------------------------------------------------------------------------
  // TEST 3: EXPIRY RELEASE RESTORES AVAILABILITY
  // -------------------------------------------------------------------------
  await runTest("3. Expiry release: Reconciling expired voucher releases reservation capacity and restores isAvailable to true", async () => {
    // Confirm soldOutCampId is currently unavailable
    let pDoc = await db.collection("public_meal_offers").doc(soldOutCampId).get();
    assert(pDoc.data().isAvailable === false, "Precondition: must be unavailable");

    // Artificially expire voucher 1
    await db.collection("meal_vouchers").doc(voucher1Id).update({
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
    });

    // Reconcile expired vouchers
    const recResult = await reconcileExpiredVouchersCore({ campaignId: soldOutCampId });
    assert(recResult.reconciledCount === 1, "Must reconcile 1 expired voucher");

    // Projection isAvailable must transition back to true!
    pDoc = await db.collection("public_meal_offers").doc(soldOutCampId).get();
    assert(pDoc.data().isAvailable === true, "Projection isAvailable must restore to TRUE after expiry release");
  });

  // -------------------------------------------------------------------------
  // TEST 4: 2-LIFETIME-CLAIM LIMIT ENFORCEMENT
  // -------------------------------------------------------------------------
  await runTest("4. 2-lifetime-claim limit: User claims twice successfully, 3rd claim rejected with resource-exhausted", async () => {
    // Dedicated campaign with large budget
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUid,
      targetVendorId: vendorIdAlpha,
      title: "Lifetime Limit Test Offer",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 50,
      campaignBudgetNaira: 50000,
      vendorName: "Alpha Delicacies",
    });
    const testCampId = res.campaignId;

    const testCustUid = `usr_cust_life_${Date.now()}`;
    await createTestCustomer(testCustUid, 5000);

    // Claim 1
    const claim1 = await redeemMealCouponCore({
      uid: testCustUid,
      couponId: testCampId,
      pin: "1842",
      idempotencyKey: `idem_life1_${Date.now()}`,
    });
    assert(claim1.success === true, "Claim 1 must succeed");
    assert(claim1.lifetimeClaimCount === 1, "lifetimeClaimCount must be 1");

    // Redeem voucher 1 at POS so user holds no active voucher
    const red1 = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: claim1.voucher.id,
      vendorId: vendorIdAlpha,
      billAmountNaira: 3000,
      idempotencyKey: `idem_pos_life1_${Date.now()}`,
    });
    assert(red1.success === true, "Redemption 1 must succeed");

    // Claim 2
    const claim2 = await redeemMealCouponCore({
      uid: testCustUid,
      couponId: testCampId,
      pin: "1842",
      idempotencyKey: `idem_life2_${Date.now()}`,
    });
    assert(claim2.success === true, "Claim 2 must succeed");
    assert(claim2.lifetimeClaimCount === 2, "lifetimeClaimCount must be 2");

    // Redeem voucher 2 at POS
    const red2 = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: claim2.voucher.id,
      vendorId: vendorIdAlpha,
      billAmountNaira: 3000,
      idempotencyKey: `idem_pos_life2_${Date.now()}`,
    });
    assert(red2.success === true, "Redemption 2 must succeed");

    // Claim 3: Must be rejected because lifetime limit (2) is reached
    let claim3Rejected = false;
    try {
      await redeemMealCouponCore({
        uid: testCustUid,
        couponId: testCampId,
        pin: "1842",
        idempotencyKey: `idem_life3_${Date.now()}`,
      });
    } catch (err) {
      claim3Rejected = true;
      assert(err.code === "resource-exhausted", `Error code must be resource-exhausted, got: ${err.code}`);
      assert(err.message.includes("Lifetime claim limit reached"), "Message must specify lifetime claim limit");
    }
    assert(claim3Rejected, "3rd claim must fail closed with resource-exhausted");

    // Verify claim tracking doc in users/{uid}/mealClaims/{offerId}
    const claimDoc = await db.collection("users").doc(testCustUid).collection("mealClaims").doc(testCampId).get();
    assert(claimDoc.exists, "Claim record must exist");
    assert(claimDoc.data().lifetimeClaimCount === 2, "Stored lifetimeClaimCount must remain 2");
  });

  // -------------------------------------------------------------------------
  // TEST 5: 1-ACTIVE-VOUCHER RESTRICTION
  // -------------------------------------------------------------------------
  await runTest("5. 1-active-voucher limit: User holding active voucher attempts 2nd claim; rejected with already-exists", async () => {
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUid,
      targetVendorId: vendorIdAlpha,
      title: "Active Voucher Limit Offer",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 50,
      campaignBudgetNaira: 50000,
      vendorName: "Alpha Delicacies",
    });
    const testCampId = res.campaignId;

    const testCustUid = `usr_cust_act_${Date.now()}`;
    await createTestCustomer(testCustUid, 5000);

    // Claim 1: succeeds and establishes active voucher
    const claim1 = await redeemMealCouponCore({
      uid: testCustUid,
      couponId: testCampId,
      pin: "1842",
      idempotencyKey: `idem_act1_${Date.now()}`,
    });
    assert(claim1.success === true, "Claim 1 must succeed");

    // Get user points balance after first claim (5000 - 50 = 4950)
    const userDocAfter1 = await db.collection("users").doc(testCustUid).get();
    const pointsAfter1 = userDocAfter1.data().points;
    assert(pointsAfter1 === 4950, "50 points deducted for claim 1");

    // Immediate 2nd claim attempt with different idempotency key
    let claim2Rejected = false;
    try {
      await redeemMealCouponCore({
        uid: testCustUid,
        couponId: testCampId,
        pin: "1842",
        idempotencyKey: `idem_act2_${Date.now()}`,
      });
    } catch (err) {
      claim2Rejected = true;
      assert(err.code === "already-exists", `Error code must be already-exists, got: ${err.code}`);
      assert(err.message.includes("already hold an active unredeemed voucher"), "Message must explain active voucher restriction");
    }
    assert(claim2Rejected, "2nd claim while holding active voucher must be rejected");

    // Points must NOT be deducted for rejected attempt
    const userDocAfterRejected = await db.collection("users").doc(testCustUid).get();
    assert(userDocAfterRejected.data().points === pointsAfter1, "Points must not be deducted on rejected claim");
  });

  // -------------------------------------------------------------------------
  // TEST 6: EMERGENCY HALT BLOCKS POS REDEMPTION WHILE VOUCHER REMAINS READABLE
  // -------------------------------------------------------------------------
  await runTest("6. Emergency halt: Blocks cashier validation & redemption while customer retains access to view ticket", async () => {
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUid,
      targetVendorId: vendorIdAlpha,
      title: "Emergency Halt Lifecycle Offer",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 50,
      campaignBudgetNaira: 50000,
      vendorName: "Alpha Delicacies",
    });
    const haltCampId = res.campaignId;

    const haltCustUid = `usr_cust_halt_${Date.now()}`;
    await createTestCustomer(haltCustUid, 5000);

    // Customer claims voucher while active
    const claimRes = await redeemMealCouponCore({
      uid: haltCustUid,
      couponId: haltCampId,
      pin: "1842",
      idempotencyKey: `idem_halt_${Date.now()}`,
    });
    assert(claimRes.success === true, "Initial claim must succeed");
    const haltVoucherId = claimRes.voucher.id;

    // Admin sets campaign to emergency_halt
    const statusUpdate = await updateCampaignStatusCore({
      adminUid,
      campaignId: haltCampId,
      newStatus: "emergency_halt",
      notes: "Precautionary halt during investigation",
    });
    assert(statusUpdate.success === true, "Status update to emergency_halt must succeed");

    // Verify public projection also transitioned to emergency_halt
    const pDoc = await db.collection("public_meal_offers").doc(haltCampId).get();
    assert(pDoc.data().status === "emergency_halt", "Public projection status must be emergency_halt");
    assert(pDoc.data().isAvailable === false, "Public projection isAvailable must be false under halt");

    // Cashier POS validation must reject redemption
    const valRes = await validateMealVoucherForMerchantCore({
      cashierUid,
      voucherCodeOrId: haltVoucherId,
      vendorId: vendorIdAlpha,
    });
    assert(valRes.success === true, "Validation callable returns execution status");
    assert(valRes.eligible === false, "Voucher must NOT be eligible under emergency_halt");
    assert(valRes.reason === "campaign-halted", "Reason must be campaign-halted");
    assert(valRes.validationMessage.includes("emergency administrative halt"), "Message must mention emergency halt");

    // Cashier POS redemption must throw failed-precondition
    let redFailed = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: haltVoucherId,
        vendorId: vendorIdAlpha,
        billAmountNaira: 3500,
        idempotencyKey: `idem_pos_halt_${Date.now()}`,
      });
    } catch (err) {
      redFailed = true;
      assert(err.code === "failed-precondition", `Error code must be failed-precondition, got: ${err.code}`);
      assert(err.message.includes("emergency administrative halt"), "Message must mention emergency halt");
    }
    assert(redFailed, "Redemption attempt must be blocked under emergency_halt");

    // Customer reads their voucher via Client SDK: MUST SUCCEED (Customer preserves ticket access)
    await authenticateClient(haltCustUid, { role: "user" });
    const clientVoucherSnap = await getDoc(doc(clientDb, "meal_vouchers", haltVoucherId));
    assert(clientVoucherSnap.exists(), "Customer MUST be able to read their own voucher document via Client SDK");
    const clientVoucherData = clientVoucherSnap.data();
    assert(clientVoucherData.id === haltVoucherId, "Voucher ID must match");
    assert(clientVoucherData.status === "active", "Voucher status remains active (not invalidated, only blocked)");

    // Customer reads public offer projection via Client SDK: MUST SUCCEED with emergency_halt status
    const clientOfferSnap = await getDoc(doc(clientDb, "public_meal_offers", haltCampId));
    assert(clientOfferSnap.exists(), "Customer can read public projection via Client SDK");
    assert(clientOfferSnap.data().status === "emergency_halt", "Customer UI reads emergency_halt to render warning banner");
  });

  // -------------------------------------------------------------------------
  // TEST 7: CLIENT SDK SECURITY RULES ISOLATION
  // -------------------------------------------------------------------------
  await runTest("7. Security Rules Isolation: Customer cannot modify public offers or access other users' claims/vouchers", async () => {
    await authenticateClient(customerUid1, { role: "user" });

    // 1. Customer cannot write to public_meal_offers
    let publicWriteBlocked = false;
    try {
      await updateDoc(doc(clientDb, "public_meal_offers", campaign1Id), {
        discountNaira: 99999,
      });
    } catch (err) {
      publicWriteBlocked = true;
    }
    assert(publicWriteBlocked, "Customer must be blocked from modifying public_meal_offers");

    // 2. Customer cannot write to their own mealClaims subcollection directly
    let claimWriteBlocked = false;
    try {
      await setDoc(doc(clientDb, "users", customerUid1, "mealClaims", campaign1Id), {
        lifetimeClaimCount: 0,
      });
    } catch (err) {
      claimWriteBlocked = true;
    }
    assert(claimWriteBlocked, "Customer must be blocked from writing to mealClaims");

    // 3. Customer cannot read other customer's mealClaims
    let otherClaimReadBlocked = false;
    try {
      await getDoc(doc(clientDb, "users", customerUid2, "mealClaims", campaign1Id));
    } catch (err) {
      otherClaimReadBlocked = true;
    }
    assert(otherClaimReadBlocked, "Customer must be blocked from reading other user's mealClaims");

    // 4. Customer cannot read other customer's meal_vouchers
    let otherVoucherReadBlocked = false;
    try {
      await getDoc(doc(clientDb, "meal_vouchers", voucher2Id));
    } catch (err) {
      otherVoucherReadBlocked = true;
    }
    assert(otherVoucherReadBlocked, "Customer must be blocked from reading other user's meal_vouchers");
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("STAGE 3.2 TEST SUMMARY");
  console.log("==================================================================");
  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);

  if (failedCount === 0) {
    console.log("\nALL STAGE 3.2 CUSTOMER MARKETPLACE ACCEPTANCE TESTS PASSED! 🎉\n");
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedCount} TESTS FAILED IN STAGE 3.2 SUITE.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN STAGE 3.2 TEST RUNNER:", err);
  process.exit(1);
});

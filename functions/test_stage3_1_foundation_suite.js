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
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
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
  "client-stage3-1-rules-app"
);

const clientDb = getFirestore(clientApp);
connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });

let createVendorCampaignCore;
let backfillPublicMealOffersCore;
let startPublicOffersVerificationRunCore;
let stepPublicOffersVerificationRunCore;
let finalizePublicOffersVerificationRunCore;
let redeemMealCouponCore;
let reconcileExpiredVouchersCore;
let updateCampaignBudgetCore;
let updateCampaignStatusCore;
let validateMealVoucherForMerchantCore;
let redeemMealVoucherMerchantCore;
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
    email: `${uid}@stage3.test`,
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
    email: `${uid}@stage3.test`,
    role: "vendor",
    vendorId,
    vendorRole: "cashier",
    vendorBranch: "Victoria Island",
    cashierName: "Cashier Stage3",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createTestVendorOwner(uid, vendorId) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage3.test`,
    role: "vendor",
    vendorId,
    vendorRole: "owner",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createTestAdmin(uid) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage3.test`,
    role: "admin",
    isAdmin: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function main() {
  console.log("==================================================================");
  console.log("STAGE 3.1 TEST SUITE: FOUNDATIONAL PROJECTION, CREATION & CUTOVER");
  console.log("==================================================================");

  const indexModule = await import("./index.js");
  createVendorCampaignCore = indexModule.createVendorCampaignCore;
  backfillPublicMealOffersCore = indexModule.backfillPublicMealOffersCore;
  startPublicOffersVerificationRunCore = indexModule.startPublicOffersVerificationRunCore;
  stepPublicOffersVerificationRunCore = indexModule.stepPublicOffersVerificationRunCore;
  finalizePublicOffersVerificationRunCore = indexModule.finalizePublicOffersVerificationRunCore;
  redeemMealCouponCore = indexModule.redeemMealCouponCore;
  reconcileExpiredVouchersCore = indexModule.reconcileExpiredVouchersCore;
  updateCampaignBudgetCore = indexModule.updateCampaignBudgetCore;
  updateCampaignStatusCore = indexModule.updateCampaignStatusCore;
  validateMealVoucherForMerchantCore = indexModule.validateMealVoucherForMerchantCore;
  redeemMealVoucherMerchantCore = indexModule.redeemMealVoucherMerchantCore;
  hashTransactionPin = indexModule.hashTransactionPin;
  generatePinSalt = indexModule.generatePinSalt;

  const vendorIdAlpha = "vendor-stg3-alpha";
  const vendorIdBeta = "vendor-stg3-beta";
  const vendorOwnerUidAlpha = `usr_owner_alpha_${Date.now()}`;
  const vendorOwnerUidBeta = `usr_owner_beta_${Date.now()}`;
  const cashierUid = `usr_cashier_stg3_${Date.now()}`;
  const customerUid = `usr_customer_stg3_${Date.now()}`;
  const customerUidBeta = `usr_customer_beta_${Date.now()}`;
  const adminUid = `usr_admin_stg3_${Date.now()}`;

  await createTestVendorOwner(vendorOwnerUidAlpha, vendorIdAlpha);
  await createTestVendorOwner(vendorOwnerUidBeta, vendorIdBeta);
  await createTestCashier(cashierUid, vendorIdAlpha);
  await createTestCustomer(customerUid, 5000);
  await createTestCustomer(customerUidBeta, 5000);
  await createTestAdmin(adminUid);

  // -------------------------------------------------------------------------
  // SECTION 1: FIRESTORE SECURITY RULES LOCKDOWN (STAGE 3.1 COLLECTIONS)
  // -------------------------------------------------------------------------

  await runTest("1. Rules: Client SDK cannot read or query meal_campaigns", async () => {
    const testCampId = `camp_rules_read_${Date.now()}`;
    await db.collection("meal_campaigns").doc(testCampId).set({
      id: testCampId,
      vendorId: vendorIdAlpha,
      status: "active",
      campaignBudgetNaira: 10000,
    });

    await authenticateClient(customerUid, { role: "user" });

    let readBlocked = false;
    try {
      await getDoc(doc(clientDb, "meal_campaigns", testCampId));
    } catch (e) {
      readBlocked = true;
      assert(e.code === "permission-denied", "Client single read must fail with permission-denied");
    }
    assert(readBlocked, "Client SDK single doc read of meal_campaigns must be DENIED");

    let queryBlocked = false;
    try {
      await getDocs(query(collection(clientDb, "meal_campaigns")));
    } catch (e) {
      queryBlocked = true;
      assert(e.code === "permission-denied", "Client query must fail with permission-denied");
    }
    assert(queryBlocked, "Client SDK collection query on meal_campaigns must be DENIED");
  });

  await runTest("2. Rules: Client SDK cannot write (create/update/delete) meal_campaigns", async () => {
    const testCampId = `camp_rules_write_${Date.now()}`;
    await authenticateClient(vendorOwnerUidAlpha, { role: "vendor", vendorId: vendorIdAlpha });

    let createBlocked = false;
    try {
      await setDoc(doc(clientDb, "meal_campaigns", testCampId), {
        title: "Malicious Direct Campaign",
        campaignBudgetNaira: 50000,
      });
    } catch (e) {
      createBlocked = true;
      assert(e.code === "permission-denied", "Client create must fail with permission-denied");
    }
    assert(createBlocked, "Client SDK create on meal_campaigns must be DENIED");

    // Seed via Admin SDK
    await db.collection("meal_campaigns").doc(testCampId).set({
      id: testCampId,
      vendorId: vendorIdAlpha,
      campaignBudgetNaira: 50000,
    });

    let updateBlocked = false;
    try {
      await updateDoc(doc(clientDb, "meal_campaigns", testCampId), {
        campaignBudgetNaira: 100000,
      });
    } catch (e) {
      updateBlocked = true;
      assert(e.code === "permission-denied", "Client update must fail with permission-denied");
    }
    assert(updateBlocked, "Client SDK update on meal_campaigns must be DENIED");

    let deleteBlocked = false;
    try {
      await deleteDoc(doc(clientDb, "meal_campaigns", testCampId));
    } catch (e) {
      deleteBlocked = true;
      assert(e.code === "permission-denied", "Client delete must fail with permission-denied");
    }
    assert(deleteBlocked, "Client SDK delete on meal_campaigns must be DENIED");
  });

  await runTest("3. Rules: Client SDK cannot read or write quarantined_meal_campaigns", async () => {
    const testQId = `camp_quar_rules_${Date.now()}`;
    await db.collection("quarantined_meal_campaigns").doc(testQId).set({
      campaignId: testQId,
      quarantineReason: "TEST_REASON",
    });

    await authenticateClient(customerUid, { role: "user" });

    let readBlocked = false;
    try {
      await getDoc(doc(clientDb, "quarantined_meal_campaigns", testQId));
    } catch (e) {
      readBlocked = true;
      assert(e.code === "permission-denied", "Read must fail with permission-denied");
    }
    assert(readBlocked, "Client SDK read of quarantined_meal_campaigns must be DENIED");

    let writeBlocked = false;
    try {
      await setDoc(doc(clientDb, "quarantined_meal_campaigns", testQId), { fake: true });
    } catch (e) {
      writeBlocked = true;
      assert(e.code === "permission-denied", "Write must fail with permission-denied");
    }
    assert(writeBlocked, "Client SDK write of quarantined_meal_campaigns must be DENIED");
  });

  await runTest("4. Rules: Client SDK cannot read or write verification_runs", async () => {
    const testVRunId = `vrun_rules_${Date.now()}`;
    await db.collection("verification_runs").doc(testVRunId).set({
      runId: testVRunId,
      phase: "FORWARD_AUDIT",
    });

    await authenticateClient(adminUid, { role: "admin", isAdmin: true });

    let readBlocked = false;
    try {
      await getDoc(doc(clientDb, "verification_runs", testVRunId));
    } catch (e) {
      readBlocked = true;
      assert(e.code === "permission-denied", "Read must fail with permission-denied");
    }
    assert(readBlocked, "Client SDK read of verification_runs must be DENIED");

    let writeBlocked = false;
    try {
      await setDoc(doc(clientDb, "verification_runs", testVRunId), { fake: true });
    } catch (e) {
      writeBlocked = true;
      assert(e.code === "permission-denied", "Write must fail with permission-denied");
    }
    assert(writeBlocked, "Client SDK write of verification_runs must be DENIED");
  });

  await runTest("5. Rules: Unauthenticated client cannot read public_meal_offers", async () => {
    const testOfferId = `offer_unauth_${Date.now()}`;
    await db.collection("public_meal_offers").doc(testOfferId).set({
      id: testOfferId,
      title: "Public Meal Offer",
      isAvailable: true,
    });

    await signOut(clientAuth).catch(() => {});

    let readBlocked = false;
    try {
      await getDoc(doc(clientDb, "public_meal_offers", testOfferId));
    } catch (e) {
      readBlocked = true;
      assert(e.code === "permission-denied", "Unauthenticated read must fail with permission-denied");
    }
    assert(readBlocked, "Unauthenticated client read of public_meal_offers must be DENIED");
  });

  await runTest("6. Rules: Authenticated customer can read public_meal_offers", async () => {
    const testOfferId = `offer_auth_${Date.now()}`;
    await db.collection("public_meal_offers").doc(testOfferId).set({
      id: testOfferId,
      title: "Authenticated Public Offer",
      isAvailable: true,
      discountNaira: 500,
    });

    await authenticateClient(customerUid, { role: "user" });

    const snap = await getDoc(doc(clientDb, "public_meal_offers", testOfferId));
    assert(snap.exists(), "Authenticated customer must successfully read public offer");
    assert(snap.data().title === "Authenticated Public Offer", "Offer title must match");
  });

  await runTest("7. Rules: Client SDK cannot write (create/update/delete) public_meal_offers", async () => {
    const testOfferId = `offer_client_write_${Date.now()}`;
    await authenticateClient(customerUid, { role: "user" });

    let writeBlocked = false;
    try {
      await setDoc(doc(clientDb, "public_meal_offers", testOfferId), {
        title: "Malicious Client Injected Offer",
        isAvailable: true,
      });
    } catch (e) {
      writeBlocked = true;
      assert(e.code === "permission-denied", "Client write must fail with permission-denied");
    }
    assert(writeBlocked, "Client SDK write on public_meal_offers must be DENIED");
  });

  await runTest("7b. Rules: Direct client SDK reads of meal_vouchers are restricted strictly to owning customer (cross-customer, cross-vendor, and vendor direct reads DENIED)", async () => {
    const voucherAlphaId = `vch_rules_alpha_${Date.now()}`;
    const voucherBetaId = `vch_rules_beta_${Date.now()}`;

    // Voucher Alpha belongs to Customer Alpha and Vendor Alpha
    await db.collection("meal_vouchers").doc(voucherAlphaId).set({
      id: voucherAlphaId,
      userId: customerUid,
      vendorId: vendorIdAlpha,
      vendorName: "Alpha Delicacies",
      discountNaira: 500,
      minSpendNaira: 2000,
      status: "active",
      voucherCode: "PWK-RULE-ALPHA",
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Voucher Beta belongs to Customer Beta and Vendor Beta
    await db.collection("meal_vouchers").doc(voucherBetaId).set({
      id: voucherBetaId,
      userId: customerUidBeta,
      vendorId: vendorIdBeta,
      vendorName: "Beta Foods",
      discountNaira: 600,
      minSpendNaira: 2500,
      status: "active",
      voucherCode: "PWK-RULE-BETA",
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 1. Owning Customer Alpha CAN read Voucher Alpha
    await authenticateClient(customerUid, { role: "user" });
    const snapOwner = await getDoc(doc(clientDb, "meal_vouchers", voucherAlphaId));
    assert(snapOwner.exists(), "Customer Alpha must successfully read their own voucher");
    assert(snapOwner.data().voucherCode === "PWK-RULE-ALPHA", "Voucher data must match");

    // 2. Cross-customer read: Customer Beta CANNOT read Voucher Alpha
    await authenticateClient(customerUidBeta, { role: "user" });
    let crossCustBlocked = false;
    try {
      await getDoc(doc(clientDb, "meal_vouchers", voucherAlphaId));
    } catch (e) {
      crossCustBlocked = true;
      assert(e.code === "permission-denied", "Cross-customer read must fail with permission-denied");
    }
    assert(crossCustBlocked, "Customer Beta reading Customer Alpha's voucher must be DENIED");

    // 3. Vendor Alpha client SDK CANNOT directly read Voucher Alpha (even for their own vendor)
    await authenticateClient(vendorOwnerUidAlpha, { role: "vendor", vendorId: vendorIdAlpha, vendorRole: "owner" });
    let vendorDirectReadBlocked = false;
    try {
      await getDoc(doc(clientDb, "meal_vouchers", voucherAlphaId));
    } catch (e) {
      vendorDirectReadBlocked = true;
      assert(e.code === "permission-denied", "Vendor direct client read must fail with permission-denied");
    }
    assert(vendorDirectReadBlocked, "Vendor Alpha direct client SDK read must be DENIED");

    // 4. Cross-vendor direct read: Vendor A reading Vendor B's voucher is DENIED
    let crossVendorDirectBlocked = false;
    try {
      await getDoc(doc(clientDb, "meal_vouchers", voucherBetaId));
    } catch (e) {
      crossVendorDirectBlocked = true;
      assert(e.code === "permission-denied", "Cross-vendor direct read must fail with permission-denied");
    }
    assert(crossVendorDirectBlocked, "Vendor Alpha reading Vendor Beta's voucher must be DENIED");

    // 5. Stale or forged role claims CANNOT bypass rules (arbitrary token claims denied)
    const forgedUid = `usr_forged_claims_${Date.now()}`;
    await authenticateClient(forgedUid, { role: "admin", isAdmin: true, vendorRole: "owner" });
    let forgedClaimBlocked = false;
    try {
      await getDoc(doc(clientDb, "meal_vouchers", voucherAlphaId));
    } catch (e) {
      forgedClaimBlocked = true;
      assert(e.code === "permission-denied", "Forged claim read must fail with permission-denied");
    }
    assert(forgedClaimBlocked, "Forged/stale role claims cannot bypass voucher isolation rules");

    // 6. Direct client SDK write on meal_vouchers is DENIED
    await authenticateClient(customerUid, { role: "user" });
    let writeBlocked = false;
    try {
      await updateDoc(doc(clientDb, "meal_vouchers", voucherAlphaId), { discountNaira: 9999 });
    } catch (e) {
      writeBlocked = true;
      assert(e.code === "permission-denied", "Client write must fail with permission-denied");
    }
    assert(writeBlocked, "Direct client SDK update of meal_vouchers must be DENIED");
  });

  await runTest("7c. Non-Regression: Merchant POS validation & redemption continue to work seamlessly via backend callables", async () => {
    const posCampId = `camp_pos_reg_${Date.now()}`;
    await db.collection("meal_campaigns").doc(posCampId).set({
      id: posCampId,
      vendorId: vendorIdAlpha,
      vendorName: "Alpha Delicacies",
      title: "POS Test Meal",
      discountNaira: 500,
      minSpendNaira: 2000,
      status: "active",
      migrationStatus: "ready",
      campaignBudgetNaira: 50000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 500,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const posVoucherId = `vch_pos_reg_${Date.now()}`;
    await db.collection("meal_vouchers").doc(posVoucherId).set({
      id: posVoucherId,
      userId: customerUid,
      campaignId: posCampId,
      vendorId: vendorIdAlpha,
      vendorName: "Alpha Delicacies",
      discountNaira: 500,
      minSpendNaira: 2000,
      voucherCode: "PWK-POS-VALID",
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      isLegacyVoucher: false,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // POS validation via protected backend callable
    const valRes = await validateMealVoucherForMerchantCore({
      cashierUid,
      voucherCodeOrId: posVoucherId,
      vendorId: vendorIdAlpha,
    });
    assert(valRes.success === true, "POS validation must succeed via backend Admin SDK");
    assert(valRes.eligible === true, "Voucher must be marked eligible");

    // POS redemption via protected backend callable
    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: posVoucherId,
      vendorId: vendorIdAlpha,
      billAmountNaira: 3500,
      idempotencyKey: `idem_pos_${Date.now()}`,
    });
    assert(redRes.success === true, "POS redemption must succeed via backend callable");
    assert(redRes.discountNaira === 500, "Discount must be 500");
    assert(redRes.finalPayableNaira === 3000, "Final payable must be 3000");

    // Verify voucher marked redeemed
    const vDoc = await db.collection("meal_vouchers").doc(posVoucherId).get();
    assert(vDoc.data().status === "redeemed", "Voucher must be marked redeemed");
  });

  // -------------------------------------------------------------------------
  // SECTION 2: AUTHORITATIVE VENDOR CAMPAIGN CREATION
  // -------------------------------------------------------------------------

  await runTest("8. Campaign Creation: Verified vendor owner creates campaign for own vendor (atomic dual-write with accurate availability)", async () => {
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUidAlpha,
      targetVendorId: vendorIdAlpha,
      title: "Delicious Suya Combo",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 100,
      campaignBudgetNaira: 50000,
      vendorName: "Alpha Delicacies",
    });

    assert(res.success === true, "Campaign creation must succeed");
    assert(res.isAvailable === true, "isAvailable must be true when budget >= discount");
    assert(res.campaignBudgetNaira === 50000, "Budget must be 50,000");

    // Check authoritative campaign
    const cDoc = await db.collection("meal_campaigns").doc(res.campaignId).get();
    assert(cDoc.exists, "meal_campaigns document must exist");
    const cData = cDoc.data();
    assert(cData.vendorId === vendorIdAlpha, "vendorId must match");
    assert(cData.campaignBudgetNaira === 50000, "campaignBudgetNaira must match");
    assert(cData.campaignSpentNaira === 0, "Initial spent must be 0");
    assert(cData.campaignReservedNaira === 0, "Initial reserved must be 0");
    assert(cData.status === "active", "Status must be active");
    assert(cData.migrationStatus === "ready", "migrationStatus must be ready");

    // Check sanitized public projection
    const pDoc = await db.collection("public_meal_offers").doc(res.campaignId).get();
    assert(pDoc.exists, "public_meal_offers document must exist");
    const pData = pDoc.data();
    assert(pData.title === "Delicious Suya Combo", "Title must match");
    assert(pData.discountNaira === 500, "discountNaira must match");
    assert(pData.minSpendNaira === 2500, "minSpendNaira must match");
    assert(pData.isAvailable === true, "Projection isAvailable must be true");
    // Ensure no internal financial numbers leak to public projection
    assert(pData.campaignBudgetNaira === undefined, "campaignBudgetNaira must NOT leak to projection");
    assert(pData.campaignSpentNaira === undefined, "campaignSpentNaira must NOT leak to projection");
    assert(pData.campaignReservedNaira === undefined, "campaignReservedNaira must NOT leak to projection");
  });

  await runTest("9. Campaign Creation: System admin can create campaign for explicitly selected targetVendorId", async () => {
    const res = await createVendorCampaignCore({
      callerUid: adminUid,
      targetVendorId: vendorIdBeta,
      title: "Admin-Created Beta Feast",
      discountNaira: 600,
      minSpendNaira: 3000,
      pointsCost: 120,
      campaignBudgetNaira: 75000,
    });

    assert(res.success === true, "Admin campaign creation must succeed");
    assert(res.vendorId === vendorIdBeta, "Target vendorId must match Beta");

    const cDoc = await db.collection("meal_campaigns").doc(res.campaignId).get();
    assert(cDoc.exists && cDoc.data().vendorId === vendorIdBeta, "meal_campaigns must record Beta vendor");
  });

  await runTest("10. Campaign Creation: Unauthorized callers (cashier, customer, cross-vendor owner) rejected with permission-denied", async () => {
    // 1. Cashier rejected
    let cashierBlocked = false;
    try {
      await createVendorCampaignCore({
        callerUid: cashierUid,
        targetVendorId: vendorIdAlpha,
        title: "Cashier Rogue Campaign",
        discountNaira: 500,
        minSpendNaira: 2000,
        campaignBudgetNaira: 10000,
      });
    } catch (e) {
      cashierBlocked = true;
      assert(e.code === "permission-denied", "Cashier must fail with permission-denied");
    }
    assert(cashierBlocked, "Cashier campaign creation must be DENIED");

    // 2. Regular customer rejected
    let customerBlocked = false;
    try {
      await createVendorCampaignCore({
        callerUid: customerUid,
        targetVendorId: vendorIdAlpha,
        title: "Customer Rogue Campaign",
        discountNaira: 500,
        minSpendNaira: 2000,
        campaignBudgetNaira: 10000,
      });
    } catch (e) {
      customerBlocked = true;
      assert(e.code === "permission-denied", "Customer must fail with permission-denied");
    }
    assert(customerBlocked, "Customer campaign creation must be DENIED");

    // 3. Cross-vendor owner rejected (Beta owner cannot create for Alpha)
    let crossVendorBlocked = false;
    try {
      await createVendorCampaignCore({
        callerUid: vendorOwnerUidBeta,
        targetVendorId: vendorIdAlpha,
        title: "Cross-Vendor Spoof",
        discountNaira: 500,
        minSpendNaira: 2000,
        campaignBudgetNaira: 10000,
      });
    } catch (e) {
      crossVendorBlocked = true;
      assert(e.code === "permission-denied", "Cross-vendor must fail with permission-denied");
    }
    assert(crossVendorBlocked, "Cross-vendor campaign creation must be DENIED");
  });

  await runTest("11. Campaign Creation: Commercial terms validation rejects minSpendNaira < discountNaira", async () => {
    let failed = false;
    try {
      await createVendorCampaignCore({
        callerUid: vendorOwnerUidAlpha,
        targetVendorId: vendorIdAlpha,
        title: "Discount Exceeds Bill",
        discountNaira: 1000,
        minSpendNaira: 500, // VIOLATION: minSpend < discount
        campaignBudgetNaira: 20000,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "invalid-argument", "minSpend < discount must fail with invalid-argument");
      assert(e.message.includes("Commercial terms violation"), "Error message must state commercial terms violation");
    }
    assert(failed, "Discount exceeding min spend must be rejected");
  });

  await runTest("12. Campaign Creation: Budget bounds enforcement (rejects budget <= 0 and budget > 200,000)", async () => {
    // 1. Negative or zero budget
    let zeroBudgetFailed = false;
    try {
      await createVendorCampaignCore({
        callerUid: vendorOwnerUidAlpha,
        targetVendorId: vendorIdAlpha,
        title: "Zero Budget Campaign",
        discountNaira: 500,
        minSpendNaira: 2000,
        campaignBudgetNaira: 0,
      });
    } catch (e) {
      zeroBudgetFailed = true;
      assert(e.code === "invalid-argument", "Zero budget must fail with invalid-argument");
    }
    assert(zeroBudgetFailed, "Zero budget must be rejected");

    // 2. Budget exceeding ₦200,000 cap
    let overCapFailed = false;
    try {
      await createVendorCampaignCore({
        callerUid: vendorOwnerUidAlpha,
        targetVendorId: vendorIdAlpha,
        title: "Over-Cap Budget Campaign",
        discountNaira: 500,
        minSpendNaira: 2000,
        campaignBudgetNaira: 250000,
      });
    } catch (e) {
      overCapFailed = true;
      assert(e.code === "invalid-argument", "Over-cap budget must fail with invalid-argument");
    }
    assert(overCapFailed, "Budget > 200k must be rejected");
  });

  await runTest("13. Campaign Creation: Identity enforcement guarantees server-generated campaignId and offerId === campaignId, rejecting custom offerId", async () => {
    // 1. Supplying a custom offerId must be rejected with invalid-argument
    let customOfferIdBlocked = false;
    try {
      await createVendorCampaignCore({
        callerUid: vendorOwnerUidAlpha,
        targetVendorId: vendorIdAlpha,
        title: "Malicious Custom OfferId Campaign",
        discountNaira: 400,
        minSpendNaira: 2000,
        campaignBudgetNaira: 20000,
        offerId: `arbitrary_offer_${Date.now()}`,
      });
    } catch (e) {
      customOfferIdBlocked = true;
      assert(e.code === "invalid-argument", "Custom offerId must fail with invalid-argument");
      assert(e.message.includes("New campaigns cannot specify a custom offerId"), "Error must explain server-generated identity");
    }
    assert(customOfferIdBlocked, "Caller-supplied custom offerId must be DENIED");

    // 2. Authoritative creation without offerId: server generates campaignId and guarantees offerId === campaignId
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUidAlpha,
      targetVendorId: vendorIdAlpha,
      title: "Immutable Identity Promo",
      discountNaira: 400,
      minSpendNaira: 2000,
      campaignBudgetNaira: 20000,
    });

    assert(res.success === true, "Creation must succeed");
    assert(typeof res.campaignId === "string" && res.campaignId.length >= 15, "campaignId must be a valid Firestore auto-ID string");
    assert(res.offerId === res.campaignId, "Returned offerId must match server-generated campaignId");

    // Verify meal_campaigns document uses the same server-generated ID and offerId
    const cDoc = await db.collection("meal_campaigns").doc(res.campaignId).get();
    assert(cDoc.exists, "meal_campaigns document must exist");
    assert(cDoc.id === res.campaignId, "meal_campaigns document ID must match server-generated ID");
    assert(cDoc.data().id === res.campaignId, "meal_campaigns.id must match server-generated ID");
    assert(cDoc.data().campaignId === res.campaignId, "meal_campaigns.campaignId must match server-generated ID");
    assert(cDoc.data().offerId === res.campaignId, "meal_campaigns.offerId must match server-generated campaignId");

    // Verify public_meal_offers projection uses the same server-generated ID and offerId
    const pDoc = await db.collection("public_meal_offers").doc(res.campaignId).get();
    assert(pDoc.exists, "public_meal_offers document must exist");
    assert(pDoc.id === res.campaignId, "public_meal_offers document ID must match server-generated ID");
    assert(pDoc.data().id === res.campaignId, "public_meal_offers.id must match server-generated ID");
    assert(pDoc.data().campaignId === res.campaignId, "public_meal_offers.campaignId must match server-generated ID");
    assert(pDoc.data().offerId === res.campaignId, "public_meal_offers.offerId must match server-generated campaignId");
  });

  await runTest("14. Campaign Creation: Offers with budget < discount are created with isAvailable = false", async () => {
    // Budget 300, Discount 500 -> Cannot fund even 1 voucher
    const res = await createVendorCampaignCore({
      callerUid: vendorOwnerUidAlpha,
      targetVendorId: vendorIdAlpha,
      title: "Underfunded Campaign",
      discountNaira: 500,
      minSpendNaira: 2000,
      campaignBudgetNaira: 300,
    });

    assert(res.isAvailable === false, "isAvailable must be false when budget < discount");

    const pDoc = await db.collection("public_meal_offers").doc(res.campaignId).get();
    assert(pDoc.data().isAvailable === false, "Public offer isAvailable must be false");
  });

  // -------------------------------------------------------------------------
  // SECTION 3: BOUNDED, RESUMABLE PUBLIC PROJECTION BACKFILL
  // -------------------------------------------------------------------------

  async function executeFullBackfill(adminUid, pageSize = 100) {
    let bMore = true;
    let bCursor = null;
    while (bMore) {
      const bRes = await backfillPublicMealOffersCore({ adminUid, pageSize, startAfterCampaignId: bCursor });
      bMore = bRes.hasMore;
      bCursor = bRes.nextCursor;
    }
  }

  await runTest("15. Backfill: Non-admin callers rejected with permission-denied", async () => {
    let failed = false;
    try {
      await backfillPublicMealOffersCore({
        adminUid: customerUid,
        pageSize: 10,
      });
    } catch (e) {
      failed = true;
      assert(e.code === "permission-denied", "Customer backfill must fail with permission-denied");
    }
    assert(failed, "Customer cannot execute backfill");
  });

  await runTest("16. Backfill: Bounded pagination and continuation cursor works across pages", async () => {
    const pagePrefix = `camp_page_${Date.now()}`;
    const campId1 = `${pagePrefix}_a`;
    const campId2 = `${pagePrefix}_b`;
    const campId3 = `${pagePrefix}_c`;

    for (const cid of [campId1, campId2, campId3]) {
      await db.collection("meal_campaigns").doc(cid).set({
        id: cid,
        offerId: cid,
        vendorId: vendorIdAlpha,
        status: "active",
        migrationStatus: "ready",
        discountNaira: 500,
        minSpendNaira: 2000,
        campaignBudgetNaira: 10000,
        campaignSpentNaira: 0,
        campaignReservedNaira: 0,
      });
    }

    // Run backfill with page size 2
    const page1 = await backfillPublicMealOffersCore({
      adminUid,
      pageSize: 2,
      startAfterCampaignId: `${pagePrefix}_0`, // Start right before our test items
    });

    assert(page1.success === true, "Page 1 must succeed");
    assert(page1.processedCount === 2, "Page 1 must process 2 items");
    assert(page1.hasMore === true, "Page 1 must indicate hasMore");
    assert(page1.nextCursor !== null, "Page 1 must return nextCursor");

    // Run page 2 using cursor
    const page2 = await backfillPublicMealOffersCore({
      adminUid,
      pageSize: 2,
      startAfterCampaignId: page1.nextCursor,
    });

    assert(page2.success === true, "Page 2 must succeed");
    assert(page2.processedCount >= 1, "Page 2 must process at least 1 item");
  });

  await runTest("17. Backfill: Safe repeatability (idempotent re-entry leaves meal_campaigns unmutated and counters unchanged)", async () => {
    const campId = `camp_idem_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      offerId: campId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 400,
      minSpendNaira: 2000,
      campaignBudgetNaira: 15000,
      campaignSpentNaira: 2000,
      campaignReservedNaira: 1200,
      migrationBatchId: "batch_idem_safe",
    });

    // Run 1
    const run1 = await backfillPublicMealOffersCore({
      adminUid,
      pageSize: 10,
      startAfterCampaignId: `camp_idem_${Date.now() - 1000}`,
    });
    assert(run1.success === true, "Run 1 must succeed");

    // Verify projection exists
    const p1 = await db.collection("public_meal_offers").doc(campId).get();
    assert(p1.exists, "Public offer projection must exist after run 1");
    assert(p1.data().isAvailable === true, "isAvailable must be true");

    // Re-run backfill (Run 2)
    const run2 = await backfillPublicMealOffersCore({
      adminUid,
      pageSize: 10,
      startAfterCampaignId: `camp_idem_${Date.now() - 1000}`,
    });
    assert(run2.success === true, "Run 2 must succeed");

    // Verify campaign record has NOT been mutated or counters reset
    const cDoc = await db.collection("meal_campaigns").doc(campId).get();
    const cData = cDoc.data();
    assert(cData.campaignSpentNaira === 2000, "campaignSpentNaira must NOT be reset or modified");
    assert(cData.campaignReservedNaira === 1200, "campaignReservedNaira must NOT be reset or modified");
    assert(cData.migrationBatchId === "batch_idem_safe", "migrationBatchId must remain untouched");
  });

  await runTest("18. Backfill: Bilateral quarantine on whole-collection offerId collision across vendors (both quarantined, projections deleted, meal_campaigns unchanged)", async () => {
    const sharedOfferId = `collision_offer_${Date.now()}`;
    const campA = `camp_coll_a_${Date.now()}`;
    const campB = `camp_coll_b_${Date.now()}`;

    // Campaign A belongs to Alpha
    await db.collection("meal_campaigns").doc(campA).set({
      id: campA,
      offerId: sharedOfferId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2500,
      campaignBudgetNaira: 20000,
      campaignSpentNaira: 1000,
      campaignReservedNaira: 500,
    });

    // Campaign B belongs to Beta with exact same offerId
    await db.collection("meal_campaigns").doc(campB).set({
      id: campB,
      offerId: sharedOfferId,
      vendorId: vendorIdBeta,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 600,
      minSpendNaira: 3000,
      campaignBudgetNaira: 25000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
    });

    // Seed temporary projection for A to verify it gets atomically removed
    await db.collection("public_meal_offers").doc(campA).set({
      id: campA,
      isAvailable: true,
    });

    // Execute backfill
    await executeFullBackfill(adminUid);

    // Both must be recorded in quarantined_meal_campaigns
    const qDocA = await db.collection("quarantined_meal_campaigns").doc(campA).get();
    const qDocB = await db.collection("quarantined_meal_campaigns").doc(campB).get();
    assert(qDocA.exists, "Campaign A must be quarantined");
    assert(qDocB.exists, "Campaign B must be quarantined");
    assert(qDocA.data().quarantineReason === "IDENTITY_COLLISION_ACROSS_CAMPAIGNS", "Reason must be IDENTITY_COLLISION_ACROSS_CAMPAIGNS");
    assert(qDocB.data().quarantineReason === "IDENTITY_COLLISION_ACROSS_CAMPAIGNS", "Reason must be IDENTITY_COLLISION_ACROSS_CAMPAIGNS");

    // Both public projections must be deleted/non-existent
    const pDocA = await db.collection("public_meal_offers").doc(campA).get();
    const pDocB = await db.collection("public_meal_offers").doc(campB).get();
    assert(!pDocA.exists, "Public projection for colliding Campaign A must be deleted");
    assert(!pDocB.exists, "Public projection for colliding Campaign B must not exist");

    // Authoritative meal_campaigns documents must remain UNMUTATED
    const cDocA = await db.collection("meal_campaigns").doc(campA).get();
    const cDocB = await db.collection("meal_campaigns").doc(campB).get();
    assert(cDocA.data().campaignSpentNaira === 1000, "Campaign A spent remains unmutated");
    assert(cDocA.data().campaignReservedNaira === 500, "Campaign A reserved remains unmutated");
    assert(cDocB.data().campaignBudgetNaira === 25000, "Campaign B budget remains unmutated");
  });

  await runTest("19. Backfill: Bilateral quarantine on docId vs offerId collision across campaigns", async () => {
    const collisionTargetDocId = `camp_docid_coll_${Date.now()}`;
    const collisionSourceDocId = `camp_source_coll_${Date.now()}`;

    // Campaign 1: document ID is collisionTargetDocId
    await db.collection("meal_campaigns").doc(collisionTargetDocId).set({
      id: collisionTargetDocId,
      offerId: collisionTargetDocId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2000,
      campaignBudgetNaira: 10000,
    });

    // Campaign 2: offerId equals collisionTargetDocId!
    await db.collection("meal_campaigns").doc(collisionSourceDocId).set({
      id: collisionSourceDocId,
      offerId: collisionTargetDocId,
      vendorId: vendorIdBeta,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2000,
      campaignBudgetNaira: 10000,
    });

    await executeFullBackfill(adminUid);

    const qDoc1 = await db.collection("quarantined_meal_campaigns").doc(collisionTargetDocId).get();
    const qDoc2 = await db.collection("quarantined_meal_campaigns").doc(collisionSourceDocId).get();
    assert(qDoc1.exists, "Target campaign must be quarantined due to docId collision");
    assert(qDoc2.exists, "Source campaign must be quarantined due to docId collision");
  });

  await runTest("20. Backfill: Fail-closed validation quarantines invalid commercial terms without mutating meal_campaigns", async () => {
    const invalidCampId = `camp_invalid_terms_${Date.now()}`;
    await db.collection("meal_campaigns").doc(invalidCampId).set({
      id: invalidCampId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 1200,
      minSpendNaira: 800, // INVALID: minSpend < discount
      campaignBudgetNaira: 20000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
    });

    await executeFullBackfill(adminUid);

    const qDoc = await db.collection("quarantined_meal_campaigns").doc(invalidCampId).get();
    assert(qDoc.exists, "Invalid campaign must be quarantined");
    assert(qDoc.data().quarantineReason === "MIN_SPEND_LESS_THAN_DISCOUNT", "Reason must be MIN_SPEND_LESS_THAN_DISCOUNT");

    const pDoc = await db.collection("public_meal_offers").doc(invalidCampId).get();
    assert(!pDoc.exists, "No public projection must exist for invalid terms");

    const cDoc = await db.collection("meal_campaigns").doc(invalidCampId).get();
    assert(cDoc.data().discountNaira === 1200, "meal_campaigns discount remains unchanged");
    assert(cDoc.data().minSpendNaira === 800, "meal_campaigns minSpend remains unchanged");
  });

  // -------------------------------------------------------------------------
  // SECTION 4: AUTHORITATIVE CLAIM ENFORCEMENT & AVAILABILITY SYNCHRONIZATION
  // -------------------------------------------------------------------------

  await runTest("21. Claim Enforcement: Direct claim against campaign in quarantined_meal_campaigns is rejected with failed-precondition", async () => {
    const quarCampId = `camp_quar_claim_${Date.now()}`;
    await db.collection("meal_campaigns").doc(quarCampId).set({
      id: quarCampId,
      offerId: quarCampId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2500,
      campaignBudgetNaira: 20000,
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
    });

    await db.collection("quarantined_meal_campaigns").doc(quarCampId).set({
      campaignId: quarCampId,
      quarantineReason: "SECURITY_AUDIT_HOLD",
      quarantinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let claimBlocked = false;
    try {
      await redeemMealCouponCore({
        uid: customerUid,
        couponId: quarCampId,
        pin: "1842",
      });
    } catch (e) {
      claimBlocked = true;
      assert(e.code === "failed-precondition", "Claim on quarantined offer must fail with failed-precondition");
      assert(e.message.includes("quarantined and unavailable"), "Must state offer is quarantined");
    }
    assert(claimBlocked, "Direct claim against quarantined campaign must be BLOCKED");
  });

  await runTest("22. Claim Self-Healing Guard: Claim transaction never creates public projection for quarantined or unmigrated campaign", async () => {
    const unmigratedCampId = `camp_unmig_claim_${Date.now()}`;
    await db.collection("meal_campaigns").doc(unmigratedCampId).set({
      id: unmigratedCampId,
      offerId: unmigratedCampId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "unmigrated", // NOT ready
      discountNaira: 500,
      minSpendNaira: 2500,
      campaignBudgetNaira: 20000,
    });

    let claimBlocked = false;
    try {
      await redeemMealCouponCore({
        uid: customerUid,
        couponId: unmigratedCampId,
        pin: "1842",
      });
    } catch (e) {
      claimBlocked = true;
    }
    assert(claimBlocked, "Claim on unmigrated offer must fail");

    const pDoc = await db.collection("public_meal_offers").doc(unmigratedCampId).get();
    assert(!pDoc.exists, "Public projection must NOT be created for unmigrated campaign");
  });

  await runTest("23. Claim Availability Sync: Capacity-exhausting claim atomically updates public_meal_offers.isAvailable to false", async () => {
    const capCampId = `camp_cap_exhaust_${Date.now()}`;
    // Budget: 1,000. Discount: 500. Spent: 500, Reserved: 0. Remaining: 500.
    // Claiming 500 reserves the last 500 -> remaining capacity becomes 0 -> isAvailable must become false!
    await db.collection("meal_campaigns").doc(capCampId).set({
      id: capCampId,
      offerId: capCampId,
      vendorId: vendorIdAlpha,
      vendorName: "Alpha Foods",
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2500,
      campaignBudgetNaira: 1000,
      campaignSpentNaira: 500,
      campaignReservedNaira: 0,
      pointsCost: 50,
    });

    await db.collection("public_meal_offers").doc(capCampId).set({
      id: capCampId,
      isAvailable: true,
      status: "active",
      discountNaira: 500,
    });

    const claimRes = await redeemMealCouponCore({
      uid: customerUid,
      couponId: capCampId,
      pin: "1842",
    });

    assert(claimRes.success === true, "Claim must succeed");

    // Public projection must have flipped to isAvailable = false!
    const pDoc = await db.collection("public_meal_offers").doc(capCampId).get();
    assert(pDoc.data().isAvailable === false, "Public projection isAvailable must now be FALSE");
  });

  await runTest("24. Expiry Availability Sync: Expired voucher release reconciles available capacity without republishing quarantined campaign", async () => {
    // 1. Ready campaign: releasing expired voucher restores isAvailable = true
    const readyCampId = `camp_exp_sync_${Date.now()}`;
    await db.collection("meal_campaigns").doc(readyCampId).set({
      id: readyCampId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2000,
      campaignBudgetNaira: 1000,
      campaignSpentNaira: 500,
      campaignReservedNaira: 500, // 0 available capacity
    });

    await db.collection("public_meal_offers").doc(readyCampId).set({
      id: readyCampId,
      isAvailable: false, // Currently exhausted
      discountNaira: 500,
    });

    const vId = `vch_exp_sync_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId).set({
      id: vId,
      campaignId: readyCampId,
      vendorId: vendorIdAlpha,
      userId: customerUid,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)), // expired
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const expRes = await reconcileExpiredVouchersCore({ campaignId: readyCampId });
    assert(expRes.reconciledCount === 1, "Must reconcile 1 expired voucher");

    const pDoc = await db.collection("public_meal_offers").doc(readyCampId).get();
    assert(pDoc.data().isAvailable === true, "Public projection isAvailable must be restored to TRUE after reservation release");

    // 2. Quarantined campaign: expired voucher must NOT recreate or republish public offer
    const quarCampId = `camp_exp_quar_${Date.now()}`;
    await db.collection("meal_campaigns").doc(quarCampId).set({
      id: quarCampId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2000,
      campaignBudgetNaira: 5000,
      campaignReservedNaira: 500,
    });

    await db.collection("quarantined_meal_campaigns").doc(quarCampId).set({
      campaignId: quarCampId,
      quarantineReason: "QUARANTINED_PROMO",
    });

    // Any stale public offer must be purged
    await db.collection("public_meal_offers").doc(quarCampId).set({
      id: quarCampId,
      isAvailable: true,
    });

    const vId2 = `vch_exp_quar_${Date.now()}`;
    await db.collection("meal_vouchers").doc(vId2).set({
      id: vId2,
      campaignId: quarCampId,
      vendorId: vendorIdAlpha,
      userId: customerUid,
      discountNaira: 500,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: 500,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await reconcileExpiredVouchersCore({ campaignId: quarCampId });

    const pDocQuar = await db.collection("public_meal_offers").doc(quarCampId).get();
    assert(!pDocQuar.exists, "Public projection for quarantined campaign must be PURGED and never republished");
  });

  // -------------------------------------------------------------------------
  // SECTION 5: BUDGET & STATUS LIFECYCLE SYNCHRONIZATION
  // -------------------------------------------------------------------------

  await runTest("25. Budget & Status Sync: Budget increase and administrative pause/end atomically synchronize public_meal_offers.isAvailable", async () => {
    const syncCampId = `camp_sync_life_${Date.now()}`;
    await db.collection("meal_campaigns").doc(syncCampId).set({
      id: syncCampId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2000,
      campaignBudgetNaira: 500,
      campaignSpentNaira: 500,
      campaignReservedNaira: 0, // Exhausted
    });

    await db.collection("public_meal_offers").doc(syncCampId).set({
      id: syncCampId,
      isAvailable: false,
      status: "active",
      discountNaira: 500,
    });

    // 1. Budget increase restores isAvailable = true
    await updateCampaignBudgetCore({
      adminUid,
      campaignId: syncCampId,
      newBudgetNaira: 10000,
    });

    const p1 = await db.collection("public_meal_offers").doc(syncCampId).get();
    assert(p1.data().isAvailable === true, "Budget increase must restore public offer isAvailable to TRUE");

    // 2. Administrative pause sets isAvailable = false
    await updateCampaignStatusCore({
      adminUid,
      campaignId: syncCampId,
      newStatus: "paused",
    });

    const p2 = await db.collection("public_meal_offers").doc(syncCampId).get();
    assert(p2.data().isAvailable === false, "Paused campaign projection isAvailable must be FALSE");
    assert(p2.data().status === "paused", "Projection status must be updated to paused");

    // 3. Reactivation restores isAvailable = true
    await updateCampaignStatusCore({
      adminUid,
      campaignId: syncCampId,
      newStatus: "active",
    });

    const p3 = await db.collection("public_meal_offers").doc(syncCampId).get();
    assert(p3.data().isAvailable === true, "Reactivation must restore isAvailable to TRUE");
    assert(p3.data().status === "active", "Projection status must be active");
  });

  // -------------------------------------------------------------------------
  // SECTION 6: SERVER-MANAGED BIDIRECTIONAL CUTOVER VERIFICATION
  // -------------------------------------------------------------------------

  await runTest("26. Cutover Verification: Server-managed verification session in verification_runs enforces zero client-passed state and caller binding", async () => {
    // 1. Non-admin cannot start session
    let nonAdminBlocked = false;
    try {
      await startPublicOffersVerificationRunCore({ adminUid: customerUid });
    } catch (e) {
      nonAdminBlocked = true;
      assert(e.code === "permission-denied", "Non-admin must fail with permission-denied");
    }
    assert(nonAdminBlocked, "Non-admin cannot start verification run");

    // 2. Admin starts session
    const session = await startPublicOffersVerificationRunCore({ adminUid });
    assert(session.success === true, "Session creation must succeed");
    assert(session.phase === "FORWARD_AUDIT", "Initial phase must be FORWARD_AUDIT");
    assert(session.readyForCutover === false, "readyForCutover must initially be false");

    // Verify session stored in Firestore
    const runDoc = await db.collection("verification_runs").doc(session.runId).get();
    assert(runDoc.exists, "verification_runs record must exist");
    assert(runDoc.data().adminUid === adminUid, "adminUid must be bound to session");

    // 3. Another admin or caller cannot hijack session
    let hijackBlocked = false;
    try {
      await stepPublicOffersVerificationRunCore({
        adminUid: customerUid,
        runId: session.runId,
        expectedPhase: "FORWARD_AUDIT",
        expectedCursor: null,
      });
    } catch (e) {
      hijackBlocked = true;
    }
    assert(hijackBlocked, "Cross-caller cannot step verification run");
  });

  await runTest("27. Cutover Verification: Phase 1 forward audit and Phase 2 reverse audit detect discrepancies, clean orphans, and purge stale quarantined projections", async () => {
    const session = await startPublicOffersVerificationRunCore({ adminUid });

    // Seed an orphaned public projection (no campaign)
    const orphanId = `orphan_pmo_${Date.now()}`;
    await db.collection("public_meal_offers").doc(orphanId).set({
      id: orphanId,
      title: "Orphaned Projection",
      isAvailable: true,
    });

    // Seed a stale public projection for a quarantined campaign
    const staleId = `stale_pmo_${Date.now()}`;
    await db.collection("meal_campaigns").doc(staleId).set({
      id: staleId,
      vendorId: vendorIdAlpha,
      status: "active",
      migrationStatus: "ready",
      discountNaira: 500,
      minSpendNaira: 2000,
      campaignBudgetNaira: 10000,
    });
    await db.collection("quarantined_meal_campaigns").doc(staleId).set({
      campaignId: staleId,
      quarantineReason: "MALFORMED_PROMO",
    });
    await db.collection("public_meal_offers").doc(staleId).set({
      id: staleId,
      title: "Stale Quarantined Projection",
      isAvailable: true,
    });

    // Step Phase 1 (FORWARD_AUDIT) to completion with explicit phase and cursor
    let currentPhase = session.phase;
    let currentCursor = session.cursor;
    let stepCount = 0;
    while (currentPhase === "FORWARD_AUDIT" && stepCount < 20) {
      const stepRes = await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        pageSize: 100,
        expectedPhase: currentPhase,
        expectedCursor: currentCursor,
      });
      currentPhase = stepRes.phase;
      currentCursor = stepRes.cursor;
      stepCount++;
    }
    assert(currentPhase === "REVERSE_AUDIT", "Phase 1 must advance to REVERSE_AUDIT");

    // Step Phase 2 (REVERSE_AUDIT) to completion with explicit phase and cursor
    stepCount = 0;
    while (currentPhase === "REVERSE_AUDIT" && stepCount < 20) {
      const stepRes = await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        pageSize: 100,
        expectedPhase: currentPhase,
        expectedCursor: currentCursor,
      });
      currentPhase = stepRes.phase;
      currentCursor = stepRes.cursor;
      stepCount++;
    }
    assert(currentPhase === "FINAL_RECONCILIATION", "Phase 2 must advance to FINAL_RECONCILIATION");

    // Verify orphan was deleted from public_meal_offers
    const orphanDoc = await db.collection("public_meal_offers").doc(orphanId).get();
    assert(!orphanDoc.exists, "Orphaned public offer projection must be cleaned during reverse audit");

    // Verify stale projection for quarantined campaign was deleted
    const staleDoc = await db.collection("public_meal_offers").doc(staleId).get();
    assert(!staleDoc.exists, "Stale public offer projection for quarantined campaign must be cleaned");
  });

  await runTest("28. Cutover Verification Gate: readyForCutover remains false until full bilateral concordance is achieved across all audit phases", async () => {
    // 1. Clean run where all campaigns are backfilled and projected
    // Ensure all campaigns in database have projections across all pages
    await executeFullBackfill(adminUid);

    const session = await startPublicOffersVerificationRunCore({ adminUid });

    // Step through Phase 1, Phase 2, and Phase 3 tracking phase and cursor explicitly
    let currentPhase = session.phase;
    let currentCursor = session.cursor;
    let res = null;
    while (currentPhase !== "COMPLETED" && currentPhase !== "FAILED") {
      res = await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        pageSize: 100,
        expectedPhase: currentPhase,
        expectedCursor: currentCursor,
      });
      currentPhase = res.phase;
      currentCursor = res.cursor;
    }

    if (res.phase !== "COMPLETED") {
      console.error("VERIFICATION RUN FAILED DETAILS:", JSON.stringify(res, null, 2));
    }

    assert(res.phase === "COMPLETED", `Clean verification session must complete successfully (got ${res.phase})`);
    assert(res.readyForCutover === true, "readyForCutover must be TRUE upon 100% concordance");

    // Verify finalize call returns cutover readiness
    const finalRes = await finalizePublicOffersVerificationRunCore({ adminUid, runId: session.runId });
    assert(finalRes.readyForCutover === true, "Finalize must report readyForCutover = true");
  });

  await runTest("29. Cutover Verification: Missing expectedPhase, missing expectedCursor, explicit initial null, forged, stale, and cross-run cursors are rejected, and concurrent steps fail safely", async () => {
    const session = await startPublicOffersVerificationRunCore({ adminUid });

    // 1. Missing expectedPhase must be rejected with invalid-argument
    let missingPhaseBlocked = false;
    try {
      await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        expectedCursor: null,
      });
    } catch (e) {
      missingPhaseBlocked = true;
      assert(e.code === "invalid-argument", "Missing expectedPhase must fail with invalid-argument");
      assert(e.message.includes("expectedPhase"), "Error message must state expectedPhase is required");
    }
    assert(missingPhaseBlocked, "Missing expectedPhase must be rejected");

    // 2. Mismatched expectedPhase must be rejected with failed-precondition
    let mismatchedPhaseBlocked = false;
    try {
      await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        expectedPhase: "REVERSE_AUDIT", // Session is at FORWARD_AUDIT!
        expectedCursor: null,
      });
    } catch (e) {
      mismatchedPhaseBlocked = true;
      assert(e.code === "failed-precondition", "Phase mismatch must fail with failed-precondition");
      assert(e.message.includes("Phase mismatch"), "Error message must state phase mismatch");
    }
    assert(mismatchedPhaseBlocked, "Mismatched expectedPhase must be rejected");

    // 3. Missing expectedCursor must be rejected with invalid-argument
    let missingCursorBlocked = false;
    try {
      await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        expectedPhase: "FORWARD_AUDIT",
      });
    } catch (e) {
      missingCursorBlocked = true;
      assert(e.code === "invalid-argument", "Missing expectedCursor must fail with invalid-argument");
      assert(e.message.includes("expectedCursor"), "Error message must state expectedCursor is required");
    }
    assert(missingCursorBlocked, "Missing expectedCursor must be rejected");

    // 4. Initial state has cursor = null. Supplying a forged cursor must fail with failed-precondition.
    let forgedCursorBlocked = false;
    try {
      await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        expectedPhase: "FORWARD_AUDIT",
        expectedCursor: "forged_doc_id_9999",
      });
    } catch (e) {
      forgedCursorBlocked = true;
      assert(e.code === "failed-precondition", "Forged cursor must fail with failed-precondition");
      assert(e.message.includes("Cursor mismatch"), "Error message must state cursor mismatch");
    }
    assert(forgedCursorBlocked, "Forged cursor must be rejected");

    // 5. Advance step with valid explicit initial null cursor and small page size so it leaves a cursor
    const step1 = await stepPublicOffersVerificationRunCore({
      adminUid,
      runId: session.runId,
      pageSize: 2,
      expectedPhase: "FORWARD_AUDIT",
      expectedCursor: null,
    });
    assert(step1.success === true, "Step 1 with matching explicit null cursor must succeed");
    const activeCursor = step1.cursor;

    // 6. Stale cursor (trying to replay step with null cursor again after advancing)
    let staleCursorBlocked = false;
    try {
      await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        pageSize: 2,
        expectedPhase: "FORWARD_AUDIT",
        expectedCursor: null, // Stale! Current cursor is activeCursor
      });
    } catch (e) {
      staleCursorBlocked = true;
      assert(e.code === "failed-precondition", "Stale cursor must fail with failed-precondition");
    }
    assert(staleCursorBlocked, "Stale cursor must be rejected");

    // 7. Cross-run cursor: create a second session, and attempt to use its cursor on session 1
    const session2 = await startPublicOffersVerificationRunCore({ adminUid });
    const s2Step = await stepPublicOffersVerificationRunCore({
      adminUid,
      runId: session2.runId,
      pageSize: 1,
      expectedPhase: "FORWARD_AUDIT",
      expectedCursor: null,
    });

    let crossRunBlocked = false;
    try {
      await stepPublicOffersVerificationRunCore({
        adminUid,
        runId: session.runId,
        expectedPhase: "FORWARD_AUDIT",
        expectedCursor: s2Step.cursor, // Cursor from session2!
      });
    } catch (e) {
      crossRunBlocked = true;
      assert(e.code === "failed-precondition", "Cross-run cursor must fail with failed-precondition");
    }
    assert(crossRunBlocked, "Cross-run cursor must be rejected");

    // 8. Concurrency protection: Two racing calls with identical (expectedPhase, expectedCursor)
    const p1 = stepPublicOffersVerificationRunCore({
      adminUid,
      runId: session.runId,
      pageSize: 2,
      expectedPhase: "FORWARD_AUDIT",
      expectedCursor: activeCursor,
    });
    const p2 = stepPublicOffersVerificationRunCore({
      adminUid,
      runId: session.runId,
      pageSize: 2,
      expectedPhase: "FORWARD_AUDIT",
      expectedCursor: activeCursor,
    });

    const outcomes = await Promise.allSettled([p1, p2]);
    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");
    assert(fulfilled.length === 1, "Exactly one concurrent step must succeed");
    assert(rejected.length === 1, "The racing concurrent step must fail");
    assert(rejected[0].reason.code === "failed-precondition", "Racing step must fail with failed-precondition");
  });

  await runTest("30. Cutover Verification: Final reconciliation phase is bounded and resumable across multiple pages", async () => {
    // Seed 4 distinct public meal offers with matching campaigns to test bounded final reconciliation
    const reconPrefix = `camp_recon_bound_${Date.now()}`;
    for (let i = 1; i <= 4; i++) {
      const cid = `${reconPrefix}_${i}`;
      await db.collection("meal_campaigns").doc(cid).set({
        id: cid,
        vendorId: vendorIdAlpha,
        status: "active",
        migrationStatus: "ready",
        discountNaira: 500,
        minSpendNaira: 2000,
        campaignBudgetNaira: 10000,
        campaignSpentNaira: 0,
        campaignReservedNaira: 0,
      });
      await db.collection("public_meal_offers").doc(cid).set({
        id: cid,
        status: "active",
        isAvailable: true,
        discountNaira: 500,
        minSpendNaira: 2000,
      });
    }

    // Create session directly positioned in FINAL_RECONCILIATION
    const runId = `run_bound_recon_${Date.now()}`;
    await db.collection("verification_runs").doc(runId).set({
      runId,
      adminUid,
      phase: "FINAL_RECONCILIATION",
      cursor: null,
      readyForCutover: false,
      forwardStats: { discrepancies: 0, campaignsChecked: 4, matchedProjections: 4 },
      reverseStats: { orphansCleaned: 0, staleCleaned: 0, validMatched: 4, projectionsChecked: 4 },
      finalReconciliation: { checkedCount: 0, errorCount: 0, completed: false, passed: false },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Step 1: Small page size (2) -> Bounded execution returns a cursor
    const step1 = await stepPublicOffersVerificationRunCore({
      adminUid,
      runId,
      pageSize: 2,
      expectedPhase: "FINAL_RECONCILIATION",
      expectedCursor: null,
    });

    assert(step1.success === true, "Step 1 must succeed");
    assert(step1.phase === "FINAL_RECONCILIATION", "Must remain in FINAL_RECONCILIATION");
    assert(step1.cursor !== null, "Step 1 must return a non-null cursor for resumption");
    assert(step1.readyForCutover === false, "readyForCutover must remain false while pages remain");

    // Step 2: Resume with returned cursor
    const step2 = await stepPublicOffersVerificationRunCore({
      adminUid,
      runId,
      pageSize: 2,
      expectedPhase: "FINAL_RECONCILIATION",
      expectedCursor: step1.cursor,
    });

    assert(step2.success === true, "Step 2 resumption must succeed");
    assert(step2.finalReconciliation.checkedCount > step1.finalReconciliation.checkedCount, "checkedCount must accumulate");
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("STAGE 3.1 TEST SUMMARY");
  console.log("==================================================================");
  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);

  if (failedCount === 0) {
    console.log("\nALL STAGE 3.1 FOUNDATION ACCEPTANCE TESTS PASSED! 🎉\n");
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedCount} TESTS FAILED IN STAGE 3.1 SUITE.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN STAGE 3.1 TEST RUNNER:", err);
  process.exit(1);
});

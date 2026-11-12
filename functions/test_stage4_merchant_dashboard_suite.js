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

// Client SDK for testing Security Rules & Customer/Merchant role isolation
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
  "client-stage4-merchant-app"
);

const clientDb = getFirestore(clientApp);
connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });

let createVendorCampaignCore;
let getMerchantDashboardDataCore;
let updateMerchantCampaignStatusCore;
let updateCampaignBudgetCore;
let updateCampaignStatusCore;
let redeemMealCouponCore;
let redeemMealVoucherMerchantCore;
let hashTransactionPin;
let generatePinSalt;
let adminProvisionVendorUserCore;
let adminRegisterVendorStoreCore;
let updateVendorProfileCore;
let updateVendorCampaignImageCore;
let adminSetCampaignFeaturedCore;

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
  await signOut(clientAuth).catch(() => { });
  const token = await admin.auth().createCustomToken(uid, customClaims);
  await signInWithCustomToken(clientAuth, token);
}

async function createTestUser(uid, { role = "user", vendorId = null, vendorRole = null, vendorBranch = null, isAdmin = false } = {}) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage4.test`,
    role,
    vendorId,
    vendorRole,
    vendorBranch,
    isAdmin,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createTestCustomer(uid, points = 1000) {
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@stage4.test`,
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

async function main() {
  console.log("==================================================================");
  console.log("STAGE 4 TEST SUITE: MERCHANT-FUNDED MEAL DASHBOARD");
  console.log("==================================================================");

  const indexModule = await import("./index.js");
  createVendorCampaignCore = indexModule.createVendorCampaignCore;
  getMerchantDashboardDataCore = indexModule.getMerchantDashboardDataCore;
  updateMerchantCampaignStatusCore = indexModule.updateMerchantCampaignStatusCore;
  updateCampaignBudgetCore = indexModule.updateCampaignBudgetCore;
  updateCampaignStatusCore = indexModule.updateCampaignStatusCore;
  redeemMealCouponCore = indexModule.redeemMealCouponCore;
  redeemMealVoucherMerchantCore = indexModule.redeemMealVoucherMerchantCore;
  hashTransactionPin = indexModule.hashTransactionPin;
  generatePinSalt = indexModule.generatePinSalt;
  adminProvisionVendorUserCore = indexModule.adminProvisionVendorUserCore;
  adminRegisterVendorStoreCore = indexModule.adminRegisterVendorStoreCore;
  updateVendorProfileCore = indexModule.updateVendorProfileCore;
  updateVendorCampaignImageCore = indexModule.updateVendorCampaignImageCore;
  adminSetCampaignFeaturedCore = indexModule.adminSetCampaignFeaturedCore;

  const vendorAlpha = "vendor-stg4-alpha";
  const vendorBeta = "vendor-stg4-beta";

  const ownerAlphaUid = `usr_owner_alpha_${Date.now()}`;
  const managerAlphaUid = `usr_manager_alpha_${Date.now()}`;
  const cashierAlphaUid = `usr_cashier_alpha_${Date.now()}`;

  const ownerBetaUid = `usr_owner_beta_${Date.now()}`;
  const customerUid = `usr_cust_stg4_${Date.now()}`;
  const adminUid = `usr_admin_stg4_${Date.now()}`;

  // Seed vendors
  await db.collection("meal_vendors").doc(vendorAlpha).set({
    id: vendorAlpha,
    name: "Alpha Kitchen & Grill",
    category: "Local Delicacies",
    branch: "Victoria Island",
    address: "123 Adeola Odeku St",
    isOpen: true,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("meal_vendors").doc(vendorBeta).set({
    id: vendorBeta,
    name: "Beta Pizza Express",
    category: "Fast Food",
    branch: "Lekki Phase 1",
    address: "45 Admiralty Way",
    isOpen: true,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Seed staff users
  await createTestUser(ownerAlphaUid, { role: "vendor", vendorId: vendorAlpha, vendorRole: "owner", vendorBranch: "Victoria Island" });
  await createTestUser(managerAlphaUid, { role: "vendor", vendorId: vendorAlpha, vendorRole: "manager", vendorBranch: "Victoria Island" });
  await createTestUser(cashierAlphaUid, { role: "vendor", vendorId: vendorAlpha, vendorRole: "cashier", vendorBranch: "Victoria Island" });

  await createTestUser(ownerBetaUid, { role: "vendor", vendorId: vendorBeta, vendorRole: "owner", vendorBranch: "Lekki Phase 1" });
  await createTestUser(customerUid, { role: "user" });
  await createTestUser(adminUid, { role: "admin", isAdmin: true });

  // -------------------------------------------------------------------------
  // 1. TENANT ISOLATION
  // -------------------------------------------------------------------------
  await runTest("1. Tenant Isolation: Vendor Alpha owner cannot view or mutate Vendor Beta data", async () => {
    // 1a. View dashboard of another vendor rejected
    let viewBlocked = false;
    try {
      await getMerchantDashboardDataCore({
        callerUid: ownerAlphaUid,
        targetVendorId: vendorBeta,
      });
    } catch (err) {
      viewBlocked = true;
      assert(err.code === "permission-denied", "Cross-vendor dashboard read must fail with permission-denied");
      assert(err.message.includes("Cross-vendor"), "Message must mention cross-vendor");
    }
    assert(viewBlocked, "Owner Alpha viewing Beta must be blocked");

    // 1b. Create campaign for another vendor rejected
    let createBlocked = false;
    try {
      await createVendorCampaignCore({
        callerUid: ownerAlphaUid,
        targetVendorId: vendorBeta,
        title: "Malicious Cross-Vendor Deal",
        discountNaira: 500,
        minSpendNaira: 2500,
        campaignBudgetNaira: 10000,
      });
    } catch (err) {
      createBlocked = true;
      assert(err.code === "permission-denied", "Cross-vendor campaign creation must fail with permission-denied");
    }
    assert(createBlocked, "Owner Alpha creating campaign for Beta must be blocked");
  });

  // -------------------------------------------------------------------------
  // 2. ROLE HIERARCHY ACCESS CONTROL
  // -------------------------------------------------------------------------
  await runTest("2. Role Hierarchy: Cashier, Manager, and Owner permission gates", async () => {
    // Customer cannot view dashboard
    let custBlocked = false;
    try {
      await getMerchantDashboardDataCore({
        callerUid: customerUid,
        targetVendorId: vendorAlpha,
      });
    } catch (err) {
      custBlocked = true;
      assert(err.code === "permission-denied", "Customer viewing dashboard must fail with permission-denied");
    }
    assert(custBlocked, "Customer viewing merchant dashboard must be blocked");

    // Cashier CAN view dashboard of own vendor
    const cashierView = await getMerchantDashboardDataCore({
      callerUid: cashierAlphaUid,
      targetVendorId: vendorAlpha,
    });
    assert(cashierView.success === true, "Cashier of Vendor Alpha can view dashboard");
    assert(cashierView.callerRole === "cashier", "Caller role must be cashier");

    // Cashier CANNOT create campaign
    let cashierCreateBlocked = false;
    try {
      await createVendorCampaignCore({
        callerUid: cashierAlphaUid,
        targetVendorId: vendorAlpha,
        title: "Unauthorized Cashier Promo",
        discountNaira: 500,
        minSpendNaira: 2500,
        campaignBudgetNaira: 10000,
      });
    } catch (err) {
      cashierCreateBlocked = true;
      assert(err.code === "permission-denied", "Cashier campaign creation must fail with permission-denied");
      assert(err.message.includes("owner"), "Error message must require owner");
    }
    assert(cashierCreateBlocked, "Cashier creating campaign must be blocked");

    // Manager CANNOT create campaign (owner required)
    let managerCreateBlocked = false;
    try {
      await createVendorCampaignCore({
        callerUid: managerAlphaUid,
        targetVendorId: vendorAlpha,
        title: "Unauthorized Manager Promo",
        discountNaira: 500,
        minSpendNaira: 2500,
        campaignBudgetNaira: 10000,
      });
    } catch (err) {
      managerCreateBlocked = true;
      assert(err.code === "permission-denied", "Manager campaign creation must fail with permission-denied");
    }
    assert(managerCreateBlocked, "Manager creating campaign must be blocked");

    // Owner CAN create campaign
    const ownerCreate = await createVendorCampaignCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      title: "Alpha Special Suya Platter",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 50,
      campaignBudgetNaira: 50000,
    });
    assert(ownerCreate.success === true, "Owner creating campaign must succeed");
    const testCampId = ownerCreate.campaignId;

    // Cashier CANNOT pause campaign (manager or owner required)
    let cashierPauseBlocked = false;
    try {
      await updateMerchantCampaignStatusCore({
        callerUid: cashierAlphaUid,
        campaignId: testCampId,
        newStatus: "paused",
      });
    } catch (err) {
      cashierPauseBlocked = true;
      assert(err.code === "permission-denied", "Cashier pausing campaign must fail with permission-denied");
    }
    assert(cashierPauseBlocked, "Cashier pausing campaign must be blocked");

    // Manager CAN pause campaign
    const managerPause = await updateMerchantCampaignStatusCore({
      callerUid: managerAlphaUid,
      campaignId: testCampId,
      newStatus: "paused",
    });
    assert(managerPause.success === true, "Manager pausing campaign must succeed");
    assert(managerPause.status === "paused", "Status must be paused");

    // Manager CANNOT increase budget (owner required)
    let managerBudgetBlocked = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: managerAlphaUid,
        campaignId: testCampId,
        newBudgetNaira: 60000,
      });
    } catch (err) {
      managerBudgetBlocked = true;
      assert(err.code === "permission-denied", "Manager budget top-up must fail with permission-denied");
    }
    assert(managerBudgetBlocked, "Manager budget top-up must be blocked");

    // Owner CAN increase budget
    const ownerBudget = await updateCampaignBudgetCore({
      callerUid: ownerAlphaUid,
      campaignId: testCampId,
      newBudgetNaira: 60000,
    });
    assert(ownerBudget.success === true, "Owner budget top-up must succeed");
    assert(ownerBudget.newBudgetNaira === 60000, "New budget must be 60,000");

    // Platform Admin can view and perform all operations
    const adminView = await getMerchantDashboardDataCore({
      callerUid: adminUid,
      targetVendorId: vendorAlpha,
    });
    assert(adminView.success === true, "Platform admin can view vendor dashboard");
    assert(adminView.isAdmin === true, "isAdmin flag must be true");
  });

  // -------------------------------------------------------------------------
  // 3. DASHBOARD METRICS AGGREGATION & ZERO-FABRICATION
  // -------------------------------------------------------------------------
  await runTest("3. Metrics Aggregation: Authoritative calculation of budget, spent, reserved, and capacity", async () => {
    const vAggId = `vendor_agg_${Date.now()}`;
    const ownerAggUid = `usr_owner_agg_${Date.now()}`;
    await db.collection("meal_vendors").doc(vAggId).set({
      id: vAggId,
      name: "Aggregation Bistro",
      branch: "Main Branch",
      status: "active",
    });
    await createTestUser(ownerAggUid, { role: "vendor", vendorId: vAggId, vendorRole: "owner" });

    // Campaign 1: Budget 50,000, Spent 10,000, Reserved 5,000 -> Cap = 35,000 (active)
    const c1Id = `camp_agg_1_${Date.now()}`;
    await db.collection("meal_campaigns").doc(c1Id).set({
      id: c1Id,
      vendorId: vAggId,
      title: "Promo One",
      discountNaira: 500,
      minSpendNaira: 2500,
      campaignBudgetNaira: 50000,
      campaignSpentNaira: 10000,
      campaignReservedNaira: 5000,
      status: "active",
      migrationStatus: "ready",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Campaign 2: Budget 30,000, Spent 5,000, Reserved 0 -> Cap = 25,000 (paused)
    const c2Id = `camp_agg_2_${Date.now()}`;
    await db.collection("meal_campaigns").doc(c2Id).set({
      id: c2Id,
      vendorId: vAggId,
      title: "Promo Two",
      discountNaira: 1000,
      minSpendNaira: 5000,
      campaignBudgetNaira: 30000,
      campaignSpentNaira: 5000,
      campaignReservedNaira: 0,
      status: "paused",
      migrationStatus: "ready",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Seed 2 Redemptions
    const r1Id = `red_agg_1_${Date.now()}`;
    await db.collection("meal_redemptions").doc(r1Id).set({
      id: r1Id,
      redemptionReference: "REF-AGG-001",
      voucherCode: "PWK-AGG1-1111",
      vendorId: vAggId,
      campaignId: c1Id,
      cashierUid: ownerAggUid,
      cashierName: "Cashier Agg",
      vendorBranch: "Main Branch",
      billAmountNaira: 3500,
      discountNaira: 500,
      finalPayableNaira: 3000,
      status: "completed",
      redeemedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const r2Id = `red_agg_2_${Date.now()}`;
    await db.collection("meal_redemptions").doc(r2Id).set({
      id: r2Id,
      redemptionReference: "REF-AGG-002",
      voucherCode: "PWK-AGG2-2222",
      vendorId: vAggId,
      campaignId: c2Id,
      cashierUid: ownerAggUid,
      cashierName: "Cashier Agg",
      vendorBranch: "Main Branch",
      billAmountNaira: 6000,
      discountNaira: 1000,
      finalPayableNaira: 5000,
      status: "completed",
      redeemedAt: admin.firestore.Timestamp.fromDate(new Date()),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Call getMerchantDashboardDataCore
    const data = await getMerchantDashboardDataCore({
      callerUid: ownerAggUid,
      targetVendorId: vAggId,
    });

    assert(data.success === true, "Dashboard fetch must succeed");
    const summary = data.summary;

    assert(summary.totalCampaigns === 2, "Must report 2 campaigns");
    assert(summary.activeCampaigns === 1, "Must report 1 active campaign");
    assert(summary.pausedCampaigns === 1, "Must report 1 paused campaign");
    assert(summary.totalAllocatedBudgetNaira === 80000, "Allocated budget must be 80,000 (50k + 30k)");
    assert(summary.totalSpentBudgetNaira === 15000, "Spent budget must be 15,000 (10k + 5k)");
    assert(summary.totalReservedBudgetNaira === 5000, "Reserved budget must be 5,000");
    assert(summary.totalAvailableCapacityNaira === 60000, "Available capacity must be 60,000 (35k + 25k)");
    assert(summary.totalRedemptionsCount === 2, "Redemptions count must be 2");
    assert(summary.totalGrossBillAmountNaira === 9500, "Gross bills generated must be 9,500 (3500 + 6000)");
    assert(summary.totalMerchantRevenueNaira === 8000, "Merchant net revenue must be 8,000 (3000 + 5000)");

    // Redemptions sorting: newest first
    assert(data.recentRedemptions.length === 2, "Must return 2 redemptions");
    assert(data.recentRedemptions[0].id === r2Id, "Newest redemption must be first");
    assert(data.recentRedemptions[1].id === r1Id, "Older redemption must be second");
  });

  // -------------------------------------------------------------------------
  // 4. LIFECYCLE PAUSE & RESUME WITH PUBLIC OFFER AVAILABILITY SYNC
  // -------------------------------------------------------------------------
  await runTest("4. Lifecycle Synchronization: Pausing sets isAvailable=false, resuming restores isAvailable=true", async () => {
    const res = await createVendorCampaignCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      title: "Alpha Lunch Box",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 50,
      campaignBudgetNaira: 20000,
    });
    const cId = res.campaignId;

    // Initially active & available
    let pDoc = await db.collection("public_meal_offers").doc(cId).get();
    assert(pDoc.data().status === "active", "Public offer must be active");
    assert(pDoc.data().isAvailable === true, "Public offer must be available");

    // Manager pauses campaign
    const pauseRes = await updateMerchantCampaignStatusCore({
      callerUid: managerAlphaUid,
      campaignId: cId,
      newStatus: "paused",
    });
    assert(pauseRes.success === true, "Pause must succeed");

    // Public offer must be updated to status=paused, isAvailable=false
    pDoc = await db.collection("public_meal_offers").doc(cId).get();
    assert(pDoc.data().status === "paused", "Public offer status must be paused");
    assert(pDoc.data().isAvailable === false, "Public offer isAvailable must be false when paused");

    // Manager resumes campaign
    const resumeRes = await updateMerchantCampaignStatusCore({
      callerUid: managerAlphaUid,
      campaignId: cId,
      newStatus: "active",
    });
    assert(resumeRes.success === true, "Resume must succeed");

    // Public offer must restore to status=active, isAvailable=true
    pDoc = await db.collection("public_meal_offers").doc(cId).get();
    assert(pDoc.data().status === "active", "Public offer status must be restored to active");
    assert(pDoc.data().isAvailable === true, "Public offer isAvailable must be restored to true");

    // Manager ends campaign
    const endRes = await updateMerchantCampaignStatusCore({
      callerUid: managerAlphaUid,
      campaignId: cId,
      newStatus: "ended",
    });
    assert(endRes.success === true, "Ending campaign must succeed");

    pDoc = await db.collection("public_meal_offers").doc(cId).get();
    assert(pDoc.data().status === "ended", "Public offer status must be ended");
    assert(pDoc.data().isAvailable === false, "Public offer isAvailable must be false when ended");
  });

  // -------------------------------------------------------------------------
  // 5. EMERGENCY HALT INVIOLABILITY
  // -------------------------------------------------------------------------
  await runTest("5. Emergency Halt Inviolability: Merchant cannot assert or clear emergency_halt", async () => {
    const res = await createVendorCampaignCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      title: "Halt Inviolability Campaign",
      discountNaira: 500,
      minSpendNaira: 2500,
      campaignBudgetNaira: 20000,
    });
    const cId = res.campaignId;

    // 5a. Merchant attempting to set emergency_halt is rejected with invalid-argument
    let assertHaltBlocked = false;
    try {
      await updateMerchantCampaignStatusCore({
        callerUid: ownerAlphaUid,
        campaignId: cId,
        newStatus: "emergency_halt",
      });
    } catch (err) {
      assertHaltBlocked = true;
      assert(err.code === "invalid-argument", "Merchant asserting emergency_halt must fail with invalid-argument");
    }
    assert(assertHaltBlocked, "Merchant asserting emergency_halt must be blocked");

    // Platform admin asserts emergency_halt
    await updateCampaignStatusCore({
      adminUid,
      campaignId: cId,
      newStatus: "emergency_halt",
    });

    let pDoc = await db.collection("public_meal_offers").doc(cId).get();
    assert(pDoc.data().status === "emergency_halt", "Status must be emergency_halt");

    // 5b. Merchant attempting to resume or change status of halted campaign is rejected with failed-precondition
    let unHaltBlocked = false;
    try {
      await updateMerchantCampaignStatusCore({
        callerUid: ownerAlphaUid,
        campaignId: cId,
        newStatus: "active",
      });
    } catch (err) {
      unHaltBlocked = true;
      assert(err.code === "failed-precondition", "Merchant modifying halted campaign must fail with failed-precondition");
      assert(err.message.includes("emergency administrative halt"), "Message must mention administrative halt");
    }
    assert(unHaltBlocked, "Merchant clearing emergency_halt must be blocked");
  });

  // -------------------------------------------------------------------------
  // 6. BUDGET TOP-UP INVARIANTS & CAPACITY RECALCULATION
  // -------------------------------------------------------------------------
  await runTest("6. Budget Top-Up: Floor, ceiling, and capacity recalculation", async () => {
    // Create campaign with budget 1,000, discount 500
    const res = await createVendorCampaignCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      title: "Budget Capacity Test",
      discountNaira: 500,
      minSpendNaira: 2500,
      campaignBudgetNaira: 1000,
    });
    const cId = res.campaignId;

    // Simulate consumed spent 500 + reserved 500 = 1000 committed exposure (capacity = 0)
    await db.collection("meal_campaigns").doc(cId).update({
      campaignSpentNaira: 500,
      campaignReservedNaira: 500,
    });
    await db.collection("public_meal_offers").doc(cId).update({
      isAvailable: false,
    });

    // 6a. Attempt to set budget below committed exposure (e.g. 800) must throw invalid-argument
    let lowerBudgetBlocked = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: ownerAlphaUid,
        campaignId: cId,
        newBudgetNaira: 800,
      });
    } catch (err) {
      lowerBudgetBlocked = true;
      assert(err.code === "invalid-argument", "Budget below committed exposure must fail with invalid-argument");
    }
    assert(lowerBudgetBlocked, "Lowering budget below committed exposure must be blocked");

    // 6b. Attempt to set budget above 200,000 ceiling must throw invalid-argument
    let capExceededBlocked = false;
    try {
      await updateCampaignBudgetCore({
        callerUid: ownerAlphaUid,
        campaignId: cId,
        newBudgetNaira: 250000,
      });
    } catch (err) {
      capExceededBlocked = true;
      assert(err.code === "invalid-argument", "Budget above 200k must fail with invalid-argument");
    }
    assert(capExceededBlocked, "Exceeding 200k ceiling must be blocked");

    // 6c. Valid budget top-up (e.g. 5,000) succeeds and restores isAvailable=true
    const topUpRes = await updateCampaignBudgetCore({
      callerUid: ownerAlphaUid,
      campaignId: cId,
      newBudgetNaira: 5000,
    });
    assert(topUpRes.success === true, "Valid budget top-up must succeed");
    assert(topUpRes.newBudgetNaira === 5000, "New budget must be 5,000");

    const pDoc = await db.collection("public_meal_offers").doc(cId).get();
    assert(pDoc.data().isAvailable === true, "Public offer isAvailable must be restored after budget increase");
  });

  // -------------------------------------------------------------------------
  // 7. COMPLETE END-TO-END FLOW:
  //    Campaign Creation -> Public Projection -> Customer Claim ->
  //    Cashier Redemption -> Dashboard Reflection -> Pause/Resume -> Emergency Halt
  // -------------------------------------------------------------------------
  await runTest("7. Complete End-to-End Flow: Lifecycle, Claim, POS Redemption & Dashboard Reflection", async () => {
    const e2eVendor = `vendor-stg4-e2e-${Date.now()}`;
    const e2eOwnerUid = `usr_owner_e2e_${Date.now()}`;
    const e2eManagerUid = `usr_manager_e2e_${Date.now()}`;
    const e2eCashierUid = `usr_cashier_e2e_${Date.now()}`;
    const e2eCustomerUid = `usr_cust_e2e_${Date.now()}`;

    // 1. Setup vendor and staff
    await db.collection("meal_vendors").doc(e2eVendor).set({
      id: e2eVendor,
      name: "E2E Delicacies",
      category: "Local Cuisine",
      branch: "Mainland",
      isOpen: true,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await createTestUser(e2eOwnerUid, { role: "vendor", vendorId: e2eVendor, vendorRole: "owner" });
    await createTestUser(e2eManagerUid, { role: "vendor", vendorId: e2eVendor, vendorRole: "manager" });
    await createTestUser(e2eCashierUid, { role: "vendor", vendorId: e2eVendor, vendorRole: "cashier" });
    await createTestCustomer(e2eCustomerUid, 500);

    // Step 1: Merchant creates a campaign
    const campRes = await createVendorCampaignCore({
      callerUid: e2eOwnerUid,
      targetVendorId: e2eVendor,
      title: "E2E Lunch Feast ₦500 Off",
      discountNaira: 500,
      minSpendNaira: 2000,
      pointsCost: 50,
      campaignBudgetNaira: 1000,
    });
    assert(campRes.success === true, "E2E Campaign must be created");
    const e2eCampId = campRes.campaignId;

    // Step 2: Campaign becomes available to customers
    const pmoSnap = await db.collection("public_meal_offers").doc(e2eCampId).get();
    assert(pmoSnap.exists, "Public offer projection must exist");
    assert(pmoSnap.data().isAvailable === true, "Public offer must be available");
    assert(pmoSnap.data().discountNaira === 500, "Discount must match");

    // Step 3: Customer claims a voucher
    const claimRes = await redeemMealCouponCore({
      uid: e2eCustomerUid,
      couponId: e2eCampId,
      pin: "1842",
      idempotencyKey: `idem_e2e_clm_${Date.now()}`,
    });
    assert(claimRes.success === true, "Customer claim must succeed");
    const voucherId = claimRes.voucher?.id;
    const voucherCode = claimRes.voucher?.voucherCode;
    const voucherPin = claimRes.voucher?.voucherPin;
    assert(voucherId && voucherCode, "Voucher ID and code must be returned");

    // Step 4: Cashier redeems the voucher
    const redeemRes = await redeemMealVoucherMerchantCore({
      cashierUid: e2eCashierUid,
      voucherCodeOrId: voucherId,
      vendorId: e2eVendor,
      vendorBranch: "Mainland",
      billAmountNaira: 3500,
      voucherPin,
      idempotencyKey: `idem_e2e_red_${Date.now()}`,
    });
    assert(redeemRes.success === true, "Cashier redemption must succeed");
    assert(redeemRes.discountNaira === 500, "Absorbed discount must be 500");
    assert(redeemRes.finalPayableNaira === 3000, "Final payable must be 3000");

    // Step 5: Merchant dashboard reflects updated redemption and financial figures
    const dashRes = await getMerchantDashboardDataCore({
      callerUid: e2eOwnerUid,
      targetVendorId: e2eVendor,
    });
    assert(dashRes.success === true, "Dashboard query must succeed");
    assert(dashRes.summary.totalAllocatedBudgetNaira === 1000, "Total allocated must be 1000");
    assert(dashRes.summary.totalSpentBudgetNaira === 500, "Total spent must be 500");
    assert(dashRes.summary.totalReservedBudgetNaira === 0, "Total reserved must be 0 after redemption");
    assert(dashRes.summary.totalAvailableCapacityNaira === 500, "Available capacity must be 500");
    assert(dashRes.summary.totalGrossBillAmountNaira === 3500, "Gross bill volume must be 3500");
    assert(dashRes.summary.totalMerchantRevenueNaira === 3000, "Merchant revenue must be 3000");
    assert(dashRes.summary.totalRedemptionsCount === 1, "Redemption count must be 1");
    assert(dashRes.recentRedemptions.length === 1, "Recent redemptions list must have 1 record");
    assert(dashRes.recentRedemptions[0].voucherCode === voucherCode, "Redemption voucher code must match");

    // Step 6: Merchant pauses and resumes a campaign
    const pauseRes = await updateMerchantCampaignStatusCore({
      callerUid: e2eManagerUid,
      campaignId: e2eCampId,
      newStatus: "paused",
    });
    assert(pauseRes.success === true, "Manager pause must succeed");
    const pmoPaused = await db.collection("public_meal_offers").doc(e2eCampId).get();
    assert(pmoPaused.data().isAvailable === false, "Public offer must become unavailable when paused");

    const resumeRes = await updateMerchantCampaignStatusCore({
      callerUid: e2eManagerUid,
      campaignId: e2eCampId,
      newStatus: "active",
    });
    assert(resumeRes.success === true, "Manager resume must succeed");
    const pmoResumed = await db.collection("public_meal_offers").doc(e2eCampId).get();
    assert(pmoResumed.data().isAvailable === true, "Public offer must become available when resumed");

    // Step 7: Emergency halt prevents further claims
    const haltRes = await updateCampaignStatusCore({
      adminUid: adminUid,
      campaignId: e2eCampId,
      newStatus: "emergency_halt",
    });
    assert(haltRes.success === true, "Admin emergency halt must succeed");

    const e2eCust2Uid = `usr_cust_e2e2_${Date.now()}`;
    await createTestCustomer(e2eCust2Uid, 500);

    let claimHaltBlocked = false;
    try {
      await redeemMealCouponCore({
        uid: e2eCust2Uid,
        couponId: e2eCampId,
        pin: "1842",
      });
    } catch (err) {
      claimHaltBlocked = true;
      assert(err.code === "failed-precondition", "Claiming against emergency_halt must fail with failed-precondition");
    }
    assert(claimHaltBlocked, "Claim against halted campaign must be strictly blocked");
  });

  // -------------------------------------------------------------------------
  // TEST 8: ADMIN VENDOR & STAFF PROVISIONING (adminProvisionVendorUserCore)
  // -------------------------------------------------------------------------
  await runTest("Admin Vendor & Staff Provisioning and Handover Generation", async () => {
    const provVendorId = `prov-vendor-${Date.now()}`;
    const provStaffEmail = `cashier_${Date.now()}@paywaka.test`;
    const provStaffPassword = "TempPassword123!";
    const provStaffName = "Sunday Counter";

    // Non-admin cannot provision staff
    let nonAdminBlocked = false;
    try {
      await adminProvisionVendorUserCore({
        callerUid: customerUid,
        email: provStaffEmail,
        password: provStaffPassword,
        fullName: provStaffName,
        targetVendorId: provVendorId,
        vendorRole: "cashier",
        vendorBranch: "Ikeja Branch",
      });
    } catch (err) {
      nonAdminBlocked = true;
      assert(err.code === "permission-denied", "Non-admin provisioning must fail with permission-denied");
    }
    assert(nonAdminBlocked, "Non-admin provisioning must be strictly blocked");

    // Admin provisions staff successfully
    const provRes = await adminProvisionVendorUserCore({
      callerUid: adminUid,
      email: provStaffEmail,
      password: provStaffPassword,
      fullName: provStaffName,
      targetVendorId: provVendorId,
      vendorRole: "cashier",
      vendorBranch: "Ikeja Branch",
    });

    assert(provRes.success === true, "Provisioning must succeed");
    assert(provRes.email === provStaffEmail, "Email must match");
    assert(provRes.vendorRole === "cashier", "Vendor role must be cashier");
    assert(provRes.cashierName === provStaffName, "Cashier name must match");

    // Verify Firestore users/{uid} record
    const userDoc = await db.collection("users").doc(provRes.uid).get();
    assert(userDoc.exists, "Provisioned user record must exist in users collection");
    const uData = userDoc.data();
    assert(uData.role === "vendor", "User role must be 'vendor'");
    assert(uData.vendorId === provVendorId, "User vendorId must match");
    assert(uData.vendorRole === "cashier", "User vendorRole must be 'cashier'");
    assert(uData.vendorBranch === "Ikeja Branch", "Branch must match");
    assert(uData.cashierName === provStaffName, "Cashier name must match");
  });

  // -------------------------------------------------------------------------
  // TEST 9: STORE LOGO & BRANDING UPDATE (updateVendorProfileCore)
  // -------------------------------------------------------------------------
  await runTest("Store Logo & Branding Update Authorization", async () => {
    const brandVendorId = `brand-vendor-${Date.now()}`;
    await db.collection("meal_vendors").doc(brandVendorId).set({
      id: brandVendorId,
      name: "Branded Kitchen",
      branches: ["Main Branch"],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const brandOwnerUid = `usr_owner_brand_${Date.now()}`;
    const brandCashierUid = `usr_cashier_brand_${Date.now()}`;
    await createTestUser(brandOwnerUid, { role: "vendor", vendorId: brandVendorId, vendorRole: "owner" });
    await createTestUser(brandCashierUid, { role: "vendor", vendorId: brandVendorId, vendorRole: "cashier" });

    // Cashier cannot update store logo
    let cashierUpdateBlocked = false;
    try {
      await updateVendorProfileCore({
        callerUid: brandCashierUid,
        targetVendorId: brandVendorId,
        logoUrl: "https://cloudinary.com/fake-logo.png",
      });
    } catch (err) {
      cashierUpdateBlocked = true;
      assert(err.code === "permission-denied", "Cashier updating store profile must fail with permission-denied");
    }
    assert(cashierUpdateBlocked, "Cashier must be blocked from updating store profile");

    // Owner can update store logo
    const ownerRes = await updateVendorProfileCore({
      callerUid: brandOwnerUid,
      targetVendorId: brandVendorId,
      logoUrl: "https://cloudinary.com/real-logo.png",
      description: "Authentic Lagos cuisine",
    });

    assert(ownerRes.success === true, "Owner update must succeed");

    const vSnap = await db.collection("meal_vendors").doc(brandVendorId).get();
    assert(vSnap.data().logoUrl === "https://cloudinary.com/real-logo.png", "Logo URL must be saved in meal_vendors");
    assert(vSnap.data().description === "Authentic Lagos cuisine", "Description must be saved in meal_vendors");

    await db.collection("meal_vendors").doc(brandVendorId).delete();
    await db.collection("users").doc(brandOwnerUid).delete();
    await db.collection("users").doc(brandCashierUid).delete();
  });

  // -------------------------------------------------------------------------
  // TEST 10: ADMIN STORE ENTITY REGISTRATION & FIRESTORE RULES
  // -------------------------------------------------------------------------
  await runTest("Admin Store Entity Registration & Firestore Security Rules Enforcement", async () => {
    const storeSlug = `futo-cafe-test-${Date.now()}`;

    // 10a. Non-admin calling adminRegisterVendorStoreCore must fail with permission-denied
    let nonAdminCallBlocked = false;
    try {
      await adminRegisterVendorStoreCore({
        callerUid: customerUid,
        name: "FUTO CAFE",
        slug: storeSlug,
        branches: ["Main Branch"],
        logoEmoji: "🍗",
        contactEmail: "contact@futocafe.test",
      });
    } catch (err) {
      nonAdminCallBlocked = true;
      assert(err.code === "permission-denied", "Non-admin store registration must fail with permission-denied");
    }
    assert(nonAdminCallBlocked, "Non-admin must be blocked from registering store via callable");

    // 10b. Non-admin client SDK write to meal_vendors must be blocked by Firestore security rules
    const custToken = await admin.auth().createCustomToken(customerUid);
    await signInWithCustomToken(clientAuth, custToken);
    let nonAdminRuleBlocked = false;
    try {
      await setDoc(doc(clientDb, "meal_vendors", storeSlug), {
        id: storeSlug,
        name: "FUTO CAFE",
      });
    } catch (err) {
      nonAdminRuleBlocked = true;
      assert(
        err.code === "permission-denied" || String(err.message).includes("PERMISSION_DENIED"),
        "Non-admin client write to meal_vendors must be rejected by Firestore rules"
      );
    }
    assert(nonAdminRuleBlocked, "Firestore rules must block non-admin writes to meal_vendors");

    // 10c. Admin calling adminRegisterVendorStoreCore succeeds
    const regRes = await adminRegisterVendorStoreCore({
      callerUid: adminUid,
      name: "FUTO CAFE",
      slug: storeSlug,
      branches: "Main Branch, Owerri West",
      logoEmoji: "🍗",
      contactEmail: "divineanyanechi@gmail.com",
    });

    assert(regRes.success === true, "Admin store registration must succeed");
    assert(regRes.vendorId === storeSlug, "Returned vendorId must match sanitized slug");
    assert(Array.isArray(regRes.branches) && regRes.branches.length === 2, "Branches must be parsed into array");

    const storeSnap = await db.collection("meal_vendors").doc(storeSlug).get();
    assert(storeSnap.exists, "Registered store document must exist in meal_vendors");
    assert(storeSnap.data().name === "FUTO CAFE", "Store name must match");
    assert(storeSnap.data().contactEmail === "divineanyanechi@gmail.com", "Contact email must match");

    // 10d. Admin client SDK write to meal_vendors is permitted by isPlatformAdmin() rule
    const adminToken = await admin.auth().createCustomToken(adminUid);
    await signInWithCustomToken(clientAuth, adminToken);
    await setDoc(
      doc(clientDb, "meal_vendors", storeSlug),
      { updatedViaAdminClient: true },
      { merge: true }
    );
    const updatedSnap = await db.collection("meal_vendors").doc(storeSlug).get();
    assert(updatedSnap.data().updatedViaAdminClient === true, "Admin client write must succeed under isPlatformAdmin()");

    await signOut(clientAuth);
    await db.collection("meal_vendors").doc(storeSlug).delete();
  });

  // -------------------------------------------------------------------------
  // TEST 11: CAMPAIGN CATEGORY, IMAGE, ADMIN FEATURED PROMOTION & MANDATORY 4-DIGIT PIN
  // -------------------------------------------------------------------------
  await runTest("Campaign Category/Image Projection, Admin Featured Promotion & Mandatory 4-Digit POS Claim PIN", async () => {
    const campRes = await createVendorCampaignCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      title: "Small Chops Deluxe Pack",
      category: "Small Chops",
      image: "https://res.cloudinary.com/dfbcveamw/image/upload/v1/small-chops.png",
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 50,
      campaignBudgetNaira: 20000,
    });
    assert(campRes.success === true, "Campaign creation with category & image must succeed");
    const featCampId = campRes.campaignId;

    // Verify category, image, and default isFeatured: false in public_meal_offers
    const pubOfferSnap = await db.collection("public_meal_offers").doc(featCampId).get();
    assert(pubOfferSnap.exists, "Public offer projection must exist");
    const pubData = pubOfferSnap.data();
    assert(pubData.category === "Small Chops", "Public offer category must be Small Chops");
    assert(pubData.image === "https://res.cloudinary.com/dfbcveamw/image/upload/v1/small-chops.png", "Public offer image must match uploaded URL");
    assert(pubData.isFeatured === false, "Newly created campaign must default to isFeatured: false");

    // Non-admin (including store owner) cannot promote campaign to Featured Partner
    let ownerPromoteBlocked = false;
    try {
      await adminSetCampaignFeaturedCore({
        callerUid: ownerAlphaUid,
        campaignId: featCampId,
        isFeatured: true,
      });
    } catch (err) {
      ownerPromoteBlocked = true;
      assert(err.code === "permission-denied", "Non-admin promoting campaign must fail with permission-denied");
    }
    assert(ownerPromoteBlocked, "Store owner must not be able to promote Featured Partner without Platform Admin role");

    // Platform Admin promotes campaign to Featured Partner
    const promoteRes = await adminSetCampaignFeaturedCore({
      callerUid: adminUid,
      campaignId: featCampId,
      isFeatured: true,
    });
    assert(promoteRes.success === true && promoteRes.isFeatured === true, "Admin promotion to Featured Partner must succeed");

    const pubOfferAfterPromote = await db.collection("public_meal_offers").doc(featCampId).get();
    assert(pubOfferAfterPromote.data().isFeatured === true, "public_meal_offers.isFeatured must be true after admin promotion");

    // Customer claims voucher for this campaign
    const pinCustUid = `usr_cust_pin_${Date.now()}`;
    await createTestCustomer(pinCustUid, 500);
    const claimRes = await redeemMealCouponCore({
      uid: pinCustUid,
      couponId: featCampId,
      pin: "1842",
    });
    assert(claimRes.success === true, "Customer voucher claim must succeed");
    const voucherId = claimRes.voucher.id;
    const generated4DigitPin = claimRes.voucher.voucherPin;
    assert(/^\d{4}$/.test(generated4DigitPin), "Generated voucherPin must be a 4-digit code");

    // POS Redemption with requirePin: true MUST reject missing PIN
    let missingPinBlocked = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: cashierAlphaUid,
        voucherCodeOrId: voucherId,
        vendorId: vendorAlpha,
        vendorBranch: "Victoria Island",
        billAmountNaira: 2500,
        voucherPin: "",
        idempotencyKey: `idem_nopin_${Date.now()}`,
        requirePin: true,
      });
    } catch (err) {
      missingPinBlocked = true;
      assert(err.code === "permission-denied", "POS redemption without 4-digit PIN must fail with permission-denied");
    }
    assert(missingPinBlocked, "POS redemption without 4-digit PIN must be blocked when requirePin is true");

    // POS Redemption with requirePin: true MUST reject wrong 4-digit PIN
    const wrongPin = generated4DigitPin === "9999" ? "0000" : "9999";
    let wrongPinBlocked = false;
    try {
      await redeemMealVoucherMerchantCore({
        cashierUid: cashierAlphaUid,
        voucherCodeOrId: voucherId,
        vendorId: vendorAlpha,
        vendorBranch: "Victoria Island",
        billAmountNaira: 2500,
        voucherPin: wrongPin,
        idempotencyKey: `idem_wrongpin_${Date.now()}`,
        requirePin: true,
      });
    } catch (err) {
      wrongPinBlocked = true;
      assert(err.code === "permission-denied", "POS redemption with wrong 4-digit PIN must fail with permission-denied");
    }
    assert(wrongPinBlocked, "POS redemption with wrong 4-digit PIN must be blocked");

    // POS Redemption with matching 4-digit PIN succeeds and returns both discountNaira & discountAppliedNaira
    const posRes = await redeemMealVoucherMerchantCore({
      cashierUid: cashierAlphaUid,
      voucherCodeOrId: voucherId,
      vendorId: vendorAlpha,
      vendorBranch: "Victoria Island",
      billAmountNaira: 2500,
      voucherPin: generated4DigitPin,
      idempotencyKey: `idem_validpin_${Date.now()}`,
      requirePin: true,
    });
    assert(posRes.success === true, "POS redemption with valid 4-digit PIN must succeed");
    assert(posRes.discountNaira === 500, "discountNaira must be 500");
    assert(posRes.discountAppliedNaira === 500, "discountAppliedNaira must be 500");
    assert(posRes.finalPayableNaira === 2000, "finalPayableNaira must be 2000");

    // Clean up test campaign & public offer
    await db.collection("meal_campaigns").doc(featCampId).delete();
    await db.collection("public_meal_offers").doc(featCampId).delete();
  });

  // -------------------------------------------------------------------------
  // TEST 12: BACKGROUND IMAGE RECONCILIATION, VOUCHER IMAGE PROPAGATION & 2ND CLAIM UNBLOCK AFTER REDEMPTION
  // -------------------------------------------------------------------------
  await runTest("Background Image Upload Reconciliation, Voucher Custom Image & 2nd Claim Unblock After 1st Redemption", async () => {
    // 1. Owner creates campaign immediately while image uploads in background
    const bgCampRes = await createVendorCampaignCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      title: "Pastries Fiesta Combo",
      category: "Pastries",
      image: null,
      imageUploadStatus: "uploading",
      discountNaira: 500,
      minSpendNaira: 2000,
      pointsCost: 40,
      campaignBudgetNaira: 15000,
    });
    assert(bgCampRes.success === true, "Immediate campaign creation with background uploading state must succeed");
    const bgCampId = bgCampRes.campaignId;

    let campSnap = await db.collection("meal_campaigns").doc(bgCampId).get();
    assert(campSnap.data().imageUploadStatus === "uploading", "Initial imageUploadStatus must be 'uploading'");
    assert(campSnap.data().image === null, "Initial image must be null while background upload is in flight");

    // 2. Simulate background upload failure -> marks imageUploadStatus: "failed" so UI shows Retry button
    const failRes = await updateVendorCampaignImageCore({
      callerUid: ownerAlphaUid,
      campaignId: bgCampId,
      imageUrl: null,
      imageUploadStatus: "failed",
    });
    assert(failRes.success === true && failRes.imageUploadStatus === "failed", "Marking failed upload status must succeed");

    // 3. Simulate Retry succeeding -> reconciles Cloudinary URL to both meal_campaigns and public_meal_offers
    const finalImageUrl = "https://res.cloudinary.com/dfbcveamw/image/upload/v1/pastries-fiesta-10mb.jpg";
    const syncRes = await updateVendorCampaignImageCore({
      callerUid: ownerAlphaUid,
      campaignId: bgCampId,
      imageUrl: finalImageUrl,
      imageUploadStatus: "synced",
    });
    assert(syncRes.success === true && syncRes.image === finalImageUrl, "Reconciling campaign image must succeed");

    campSnap = await db.collection("meal_campaigns").doc(bgCampId).get();
    const pmoSnap = await db.collection("public_meal_offers").doc(bgCampId).get();
    assert(campSnap.data().image === finalImageUrl, "meal_campaigns.image must match reconciled URL");
    assert(campSnap.data().imageUploadStatus === "synced", "meal_campaigns.imageUploadStatus must be 'synced'");
    assert(pmoSnap.data().image === finalImageUrl, "public_meal_offers.image must match reconciled URL");

    // 4. Customer claims 1st voucher -> voucher record receives custom vendor image & title
    const repeatCustUid = `usr_cust_repeat_${Date.now()}`;
    await createTestCustomer(repeatCustUid, 500);

    const claim1 = await redeemMealCouponCore({
      uid: repeatCustUid,
      couponId: bgCampId,
      pin: "1842",
    });
    assert(claim1.success === true, "1st voucher claim must succeed");
    const vch1Id = claim1.voucher.id;
    const vch1Pin = claim1.voucher.voucherPin;

    const vch1Snap = await db.collection("meal_vouchers").doc(vch1Id).get();
    assert(vch1Snap.data().image === finalImageUrl, "Customer voucher must store vendor's custom campaign image");
    assert(vch1Snap.data().title === "Pastries Fiesta Combo", "Customer voucher must store campaign title");
    assert(vch1Snap.data().category === "Pastries", "Customer voucher must store campaign category");

    // Verify activeVoucherId is set on users/{uid}/mealClaims/{offerId} while 1st voucher is unredeemed
    let userClaimSnap = await db.collection("users").doc(repeatCustUid).collection("mealClaims").doc(bgCampId).get();
    assert(userClaimSnap.data().activeVoucherId === vch1Id, "activeVoucherId must point to 1st active voucher");
    assert(userClaimSnap.data().lifetimeClaimCount === 1, "lifetimeClaimCount must be 1");

    // 5. Cashier redeems 1st voucher at POS terminal
    const posRedeem1 = await redeemMealVoucherMerchantCore({
      cashierUid: cashierAlphaUid,
      voucherCodeOrId: vch1Id,
      vendorId: vendorAlpha,
      vendorBranch: "Victoria Island",
      billAmountNaira: 2500,
      voucherPin: vch1Pin,
      idempotencyKey: `idem_rep1_${Date.now()}`,
      requirePin: true,
    });
    assert(posRedeem1.success === true, "1st voucher POS redemption must succeed");

    // Verify users/{uid}/mealClaims/{offerId}.activeVoucherId is cleared to null upon POS redemption!
    userClaimSnap = await db.collection("users").doc(repeatCustUid).collection("mealClaims").doc(bgCampId).get();
    assert(userClaimSnap.data().activeVoucherId === null, "activeVoucherId must be cleared to null after POS redemption");
    assert(userClaimSnap.data().activeVoucherExpiresAt === null, "activeVoucherExpiresAt must be cleared to null after POS redemption");
    assert(userClaimSnap.data().lastRedeemedVoucherId === vch1Id, "lastRedeemedVoucherId must record the redeemed voucher");

    // 6. Customer claims 2nd voucher from the SAME campaign -> must succeed!
    const claim2 = await redeemMealCouponCore({
      uid: repeatCustUid,
      couponId: bgCampId,
      pin: "1842",
    });
    assert(claim2.success === true, "2nd voucher claim after 1st voucher redemption must succeed");
    assert(claim2.lifetimeClaimCount === 2, "lifetimeClaimCount must now be 2");

    // Clean up test records
    await db.collection("meal_campaigns").doc(bgCampId).delete();
    await db.collection("public_meal_offers").doc(bgCampId).delete();
  });

  // -------------------------------------------------------------------------
  // TEST 13: MERCHANT LOGO PROPAGATION TO CAMPAIGNS, PUBLIC OFFERS & VOUCHERS
  // -------------------------------------------------------------------------
  await runTest("Merchant Store Logo Propagation & Profile Update Cascade", async () => {
    const logoUrlV1 = "https://res.cloudinary.com/dfbcveamw/image/upload/v1/alpha-logo-v1.png";
    const logoUrlV2 = "https://res.cloudinary.com/dfbcveamw/image/upload/v2/alpha-logo-v2.png";

    // 1. Owner updates store logo on meal_vendors
    await updateVendorProfileCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      logoUrl: logoUrlV1,
    });

    // 2. Owner creates a new campaign -> must inherit vendorLogoUrl on meal_campaigns & public_meal_offers
    const campRes = await createVendorCampaignCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      title: "Logo Branded Offer",
      category: "Drinks",
      discountNaira: 500,
      minSpendNaira: 1500,
      pointsCost: 30,
      campaignBudgetNaira: 10000,
    });
    const logoCampId = campRes.campaignId;

    const cSnap = await db.collection("meal_campaigns").doc(logoCampId).get();
    const pSnap = await db.collection("public_meal_offers").doc(logoCampId).get();
    assert(cSnap.data().vendorLogoUrl === logoUrlV1, "meal_campaigns must store vendorLogoUrl");
    assert(pSnap.data().vendorLogoUrl === logoUrlV1, "public_meal_offers must store vendorLogoUrl");

    // 3. Customer claims voucher -> meal_vouchers must carry vendorLogoUrl
    const logoCustUid = `usr_cust_logo_${Date.now()}`;
    await createTestCustomer(logoCustUid, 500);
    const vRes = await redeemMealCouponCore({
      uid: logoCustUid,
      couponId: logoCampId,
      pin: "1842",
    });
    const vSnap = await db.collection("meal_vouchers").doc(vRes.voucher.id).get();
    assert(vSnap.data().vendorLogoUrl === logoUrlV1, "meal_vouchers must store vendorLogoUrl");

    // 4. Owner updates store logo to v2 -> must cascade to existing campaign and public offer
    await updateVendorProfileCore({
      callerUid: ownerAlphaUid,
      targetVendorId: vendorAlpha,
      logoUrl: logoUrlV2,
    });
    const cSnapV2 = await db.collection("meal_campaigns").doc(logoCampId).get();
    const pSnapV2 = await db.collection("public_meal_offers").doc(logoCampId).get();
    assert(cSnapV2.data().vendorLogoUrl === logoUrlV2, "meal_campaigns.vendorLogoUrl must cascade when logo updates");
    assert(pSnapV2.data().vendorLogoUrl === logoUrlV2, "public_meal_offers.vendorLogoUrl must cascade when logo updates");

    // Clean up test records
    await db.collection("meal_campaigns").doc(logoCampId).delete();
    await db.collection("public_meal_offers").doc(logoCampId).delete();
  });

  // Clean up test campaigns, offers, and vendors so the emulator only contains real user-created data
  const allCampSnap = await db.collection("meal_campaigns").get();
  for (const cDoc of allCampSnap.docs) {
    const vId = cDoc.data()?.vendorId || "";
    if (
      vId.startsWith("vendor-stg4-") ||
      vId.startsWith("vendor_agg_") ||
      vId.startsWith("prov-vendor-") ||
      vId.startsWith("brand-vendor-") ||
      cDoc.id.startsWith("camp_")
    ) {
      await cDoc.ref.delete();
      await db.collection("public_meal_offers").doc(cDoc.id).delete().catch(() => { });
    }
  }

  const allVendorsSnap = await db.collection("meal_vendors").get();
  for (const vDoc of allVendorsSnap.docs) {
    const vid = vDoc.id;
    if (
      vid.startsWith("vendor-stg4-") ||
      vid.startsWith("vendor_agg_") ||
      vid.startsWith("prov-vendor-") ||
      vid.startsWith("brand-vendor-") ||
      vid.startsWith("futo-cafe-test-") ||
      vid === "paywaka-demo-foods" ||
      vid === "camp-demo-jollof-p3"
    ) {
      await vDoc.ref.delete();
    }
  }

  const allVendorsStaffSnap = await db.collection("users").where("role", "==", "vendor").get();
  for (const uDoc of allVendorsStaffSnap.docs) {
    const vId = uDoc.data()?.vendorId || "";
    if (
      uDoc.id.startsWith("usr_") ||
      vId.startsWith("vendor-stg4-") ||
      vId.startsWith("prov-vendor-") ||
      vId.startsWith("brand-vendor-")
    ) {
      await uDoc.ref.delete();
    }
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("STAGE 4 TEST SUMMARY");
  console.log("==================================================================");
  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);

  if (failedCount === 0) {
    console.log("\nALL STAGE 4 MERCHANT DASHBOARD ACCEPTANCE TESTS PASSED! 🎉\n");
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedCount} TESTS FAILED IN STAGE 4 SUITE.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN STAGE 4 TEST RUNNER:", err);
  process.exit(1);
});


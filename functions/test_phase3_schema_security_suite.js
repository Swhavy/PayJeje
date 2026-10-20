process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "vtu-site-43118";
process.env.FUNCTIONS_EMULATOR = "true";

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
  getDoc,
  deleteDoc,
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
  "client-security-test-app"
);

const clientDb = getFirestore(clientApp);
connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });

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

/**
 * Clean up test fixtures in emulator Firestore
 */
async function cleanupTestUser(uid) {
  try {
    await db.collection("users").doc(uid).delete();
    const pts = await db.collection("users").doc(uid).collection("points").get();
    for (const d of pts.docs) await d.ref.delete();
    const claims = await db.collection("users").doc(uid).collection("mealClaims").get();
    for (const d of claims.docs) await d.ref.delete();
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Core Authoritative Server-Side Voucher Issuance Engine
 * Implements all Phase 3 constraints:
 * - Atomic transaction
 * - Principle 1: users/{uid}.points is sole spendable balance
 * - Principle 2 & 3: dedicated negative ledger entry users/{uid}/points/spend_pts_{requestId} referencing voucher
 * - Principle 5: 48h expiration from now
 * - Principle 8: Active voucher restriction + Lifetime claim limit (max 2 per offer)
 * - Principle 9: Budget is NOT consumed at issuance
 * - Idempotency by claimRequestId
 */
async function issueMealVoucherCore({ uid, offerId, campaignId, claimRequestId, overrideNow = null }) {
  const nowMs = overrideNow ? overrideNow.getTime() : Date.now();
  const nowDate = new Date(nowMs);
  const expiresAt = new Date(nowMs + 48 * 3600 * 1000); // exactly 48h from server issuance

  const userRef = db.collection("users").doc(uid);
  const claimRef = db.collection("users").doc(uid).collection("mealClaims").doc(offerId);
  const campaignRef = db.collection("meal_campaigns").doc(campaignId);

  return await db.runTransaction(async (t) => {
    // 1. Fetch Campaign
    const campaignDoc = await t.get(campaignRef);
    if (!campaignDoc.exists) {
      throw new Error("CAMPAIGN_NOT_FOUND");
    }
    const campaignData = campaignDoc.data();
    if (campaignData.status !== "active") {
      throw new Error("CAMPAIGN_INACTIVE");
    }
    const pointsCost = Number(campaignData.pointsCost || 100);
    const discountNaira = Number(campaignData.discountNaira || 500);
    const minSpendNaira = Number(campaignData.minSpendNaira || 2500);
    const vendorId = campaignData.vendorId;

    // 2. Fetch User
    const userDoc = await t.get(userRef);
    if (!userDoc.exists) {
      throw new Error("USER_NOT_FOUND");
    }
    const userData = userDoc.data();
    const currentPoints = Number(userData.points || 0);
    if (currentPoints < pointsCost) {
      throw new Error("INSUFFICIENT_POINTS");
    }

    // 3. Fetch Meal Claim record for this specific offer (Principle 8)
    const claimDoc = await t.get(claimRef);
    const claimData = claimDoc.exists ? claimDoc.data() : { lifetimeClaimCount: 0, activeVoucherId: null, activeVoucherExpiresAt: null };

    // Idempotency check: if duplicate claimRequestId was already processed, return existing voucher without double-charging
    if (claimData.claimHistory && claimData.claimHistory[claimRequestId]) {
      const existingVoucherId = claimData.claimHistory[claimRequestId].voucherId;
      const existingVoucherSnap = await t.get(db.collection("meal_vouchers").doc(existingVoucherId));
      return {
        voucher: existingVoucherSnap.data(),
        idempotent: true,
        lifetimeClaimCount: claimData.lifetimeClaimCount,
      };
    }

    // 3a. Lifetime Limit Check: max 2 lifetime claims
    if (claimData.lifetimeClaimCount >= 2) {
      throw new Error("LIFETIME_CLAIM_LIMIT_REACHED");
    }

    // 3b. Active Voucher Restriction:
    // If activeVoucherId exists, check if it's still unexpired and active
    if (claimData.activeVoucherId) {
      const activeExpiresAtMs = claimData.activeVoucherExpiresAt?.toMillis
        ? claimData.activeVoucherExpiresAt.toMillis()
        : claimData.activeVoucherExpiresAt
        ? new Date(claimData.activeVoucherExpiresAt).getTime()
        : 0;

      // Check if currentServerTime < expiresAt
      if (nowMs < activeExpiresAtMs) {
        // Double check voucher document status
        const activeVoucherDoc = await t.get(db.collection("meal_vouchers").doc(claimData.activeVoucherId));
        if (activeVoucherDoc.exists) {
          const vData = activeVoucherDoc.data();
          if (vData.status === "active") {
            throw new Error("ACTIVE_VOUCHER_EXISTS");
          }
        }
      }
      // If nowMs >= activeExpiresAtMs, voucher has expired! It is no longer active and does not block a new claim.
    }

    // 4. Generate Voucher ID & unique Codes
    const voucherId = `vch_${uid.slice(0, 5)}_${claimRequestId.slice(-6)}`;
    const voucherCode = `PWK-${offerId.slice(-4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const voucherPin = String(Math.floor(1000 + Math.random() * 9000)); // Distinct voucher PIN, not transaction PIN

    // 5. Deduct points from users/{uid}.points (Principle 1)
    t.update(userRef, {
      points: admin.firestore.FieldValue.increment(-pointsCost),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6. Create dedicated negative ledger entry (Principle 2 & 3)
    const ledgerDocRef = db.collection("users").doc(uid).collection("points").doc(`spend_pts_${claimRequestId}`);
    t.set(ledgerDocRef, {
      type: "meal_voucher_spend",
      points: -pointsCost,
      direction: "debit",
      source: "meal_coupon",
      referenceId: claimRequestId,
      voucherId: voucherId,
      offerId: offerId,
      campaignId: campaignId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 7. Create Voucher Document in meal_vouchers (Principle 5, 9, 11, 12, 13)
    const voucherDocRef = db.collection("meal_vouchers").doc(voucherId);
    const voucherRecord = {
      id: voucherId,
      userId: uid,
      campaignId: campaignId,
      offerId: offerId,
      vendorId: vendorId,
      discountNaira: discountNaira,
      minSpendNaira: minSpendNaira,
      pointsDeducted: pointsCost,
      voucherCode: voucherCode,
      voucherPin: voucherPin,
      status: "active",
      createdAt: admin.firestore.Timestamp.fromDate(nowDate),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      redeemedAt: null,
      redeemedByVendorStaffUid: null,
      redeemedVendorBranch: null,
      redemptionId: null,
    };
    t.set(voucherDocRef, voucherRecord);

    // 8. Update Meal Claim tracking doc (Principle 8)
    const newLifetimeCount = (claimData.lifetimeClaimCount || 0) + 1;
    const updatedHistory = claimData.claimHistory || {};
    updatedHistory[claimRequestId] = {
      voucherId: voucherId,
      claimedAt: admin.firestore.Timestamp.fromDate(nowDate),
    };

    t.set(
      claimRef,
      {
        offerId: offerId,
        campaignId: campaignId,
        userId: uid,
        lifetimeClaimCount: newLifetimeCount,
        activeVoucherId: voucherId,
        activeVoucherExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        lastClaimedAt: admin.firestore.Timestamp.fromDate(nowDate),
        claimHistory: updatedHistory,
      },
      { merge: true }
    );

    // Note: Per Principle 9, campaign budget is NOT consumed here. campaignSpentNaira remains unchanged!

    return {
      voucher: voucherRecord,
      idempotent: false,
      lifetimeClaimCount: newLifetimeCount,
    };
  });
}

async function main() {
  console.log("==================================================================");
  console.log("PHASE 3 TEST SUITE: FIRESTORE SCHEMA, RULES & CLAIM LIMITS");
  console.log("==================================================================");

  // Setup test campaign and vendor in emulator
  const testVendorId = "vendor-demo-foods-p3";
  const testCampaignId = "camp-demo-jollof-p3";
  const testOfferId = "coupon-demo-jollof-p3";

  await db.collection("meal_vendors").doc(testVendorId).set({
    id: testVendorId,
    name: "PayWaka Demo Foods",
    category: "Local Delicacies",
    branch: "Victoria Island • Lagos",
    address: "14 Adeola Odeku St, Lagos",
    logoEmoji: "🍗",
    isActive: true,
    isVerified: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("meal_campaigns").doc(testCampaignId).set({
    id: testCampaignId,
    offerId: testOfferId,
    vendorId: testVendorId,
    title: "₦500 Meal Discount Voucher",
    discountNaira: 500,
    pointsCost: 100,
    minSpendNaira: 2500,
    campaignBudgetNaira: 100000,
    campaignSpentNaira: 0, // starts at 0
    redemptionCount: 0,
    status: "active",
    validityHours: 48,
    maxLifetimeClaimsPerUser: 2,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Second distinct offer for cross-offer testing
  const testCampaignId2 = "camp-demo-pizza-p3";
  const testOfferId2 = "coupon-demo-pizza-p3";
  await db.collection("meal_campaigns").doc(testCampaignId2).set({
    id: testCampaignId2,
    offerId: testOfferId2,
    vendorId: testVendorId,
    title: "₦1,000 Woodfire Discount",
    discountNaira: 1000,
    pointsCost: 200,
    minSpendNaira: 5000,
    campaignBudgetNaira: 100000,
    campaignSpentNaira: 0,
    redemptionCount: 0,
    status: "active",
    validityHours: 48,
    maxLifetimeClaimsPerUser: 2,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // -------------------------------------------------------------------------
  // TEST 1: First claim succeeds -> lifetimeClaimCount = 1/2
  // -------------------------------------------------------------------------
  await runTest("1. First claim succeeds -> 1/2 lifetime count, points deducted, budget untouched", async () => {
    const uid = "p3_user_01";
    await cleanupTestUser(uid);
    await db.collection("users").doc(uid).set({
      email: "p3_01@paywaka.com",
      points: 1000, // 1,000 spendable points
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await issueMealVoucherCore({
      uid,
      offerId: testOfferId,
      campaignId: testCampaignId,
      claimRequestId: "req_claim_01_a",
    });

    assert(res.lifetimeClaimCount === 1, `Expected lifetime count 1, got ${res.lifetimeClaimCount}`);
    assert(res.voucher.status === "active", `Expected active voucher, got ${res.voucher.status}`);
    assert(res.voucher.pointsDeducted === 100, `Expected 100 pts deducted, got ${res.voucher.pointsDeducted}`);

    // Verify user aggregate points was decremented (Principle 1)
    const userDoc = await db.collection("users").doc(uid).get();
    assert(userDoc.data().points === 900, `Expected 900 points remaining, got ${userDoc.data().points}`);

    // Verify negative ledger entry exists (Principle 2 & 3)
    const ledgerDoc = await db.collection("users").doc(uid).collection("points").doc("spend_pts_req_claim_01_a").get();
    assert(ledgerDoc.exists, "Ledger spend document must exist");
    assert(ledgerDoc.data().points === -100, `Expected -100 points in ledger, got ${ledgerDoc.data().points}`);
    assert(ledgerDoc.data().voucherId === res.voucher.id, "Ledger must reference voucher ID");
    assert(ledgerDoc.data().type === "meal_voucher_spend", "Ledger type must be meal_voucher_spend");

    // Verify campaign budget is NOT consumed at issuance (Principle 9)
    const campDoc = await db.collection("meal_campaigns").doc(testCampaignId).get();
    assert(campDoc.data().campaignSpentNaira === 0, `Expected budget spent 0, got ${campDoc.data().campaignSpentNaira}`);
  });

  // -------------------------------------------------------------------------
  // TEST 2: Active voucher blocks another claim for the same offer
  // -------------------------------------------------------------------------
  await runTest("2. First voucher remaining active blocks another claim for same offer", async () => {
    const uid = "p3_user_01"; // reuse user from test 1 where voucher is still active
    let errorCaught = null;
    try {
      await issueMealVoucherCore({
        uid,
        offerId: testOfferId,
        campaignId: testCampaignId,
        claimRequestId: "req_claim_01_b",
      });
    } catch (e) {
      errorCaught = e.message;
    }

    assert(errorCaught === "ACTIVE_VOUCHER_EXISTS", `Expected ACTIVE_VOUCHER_EXISTS, got ${errorCaught}`);

    // Verify points balance was NOT deducted on rejected claim
    const userDoc = await db.collection("users").doc(uid).get();
    assert(userDoc.data().points === 900, "Points must remain untouched at 900");
  });

  // -------------------------------------------------------------------------
  // TEST 3: Voucher expiration does NOT reset the lifetime count
  // -------------------------------------------------------------------------
  await runTest("3. Voucher expiration unblocks claim but does NOT reset lifetime count (survives expiration)", async () => {
    const uid = "p3_user_01";
    // Simulate time moving forward 49 hours (past 48h expiration)
    const futureDate = new Date(Date.now() + 49 * 3600 * 1000);

    // Second claim at futureDate
    const res = await issueMealVoucherCore({
      uid,
      offerId: testOfferId,
      campaignId: testCampaignId,
      claimRequestId: "req_claim_01_c",
      overrideNow: futureDate,
    });

    assert(res.lifetimeClaimCount === 2, `Expected lifetime count 2/2, got ${res.lifetimeClaimCount}`);

    // Verify points decremented again
    const userDoc = await db.collection("users").doc(uid).get();
    assert(userDoc.data().points === 800, `Expected 800 points remaining, got ${userDoc.data().points}`);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Third claim attempt is rejected (lifetime limit = 2)
  // -------------------------------------------------------------------------
  await runTest("4. Third claim attempt is strictly rejected (lifetime limit 2/2 reached)", async () => {
    const uid = "p3_user_01";
    // Even if second voucher expires in future, lifetime count 2/2 prevents any 3rd claim
    const futureDateFar = new Date(Date.now() + 100 * 3600 * 1000);

    let errorCaught = null;
    try {
      await issueMealVoucherCore({
        uid,
        offerId: testOfferId,
        campaignId: testCampaignId,
        claimRequestId: "req_claim_01_d",
        overrideNow: futureDateFar,
      });
    } catch (e) {
      errorCaught = e.message;
    }

    assert(errorCaught === "LIFETIME_CLAIM_LIMIT_REACHED", `Expected LIFETIME_CLAIM_LIMIT_REACHED, got ${errorCaught}`);
  });

  // -------------------------------------------------------------------------
  // TEST 5: Voucher redemption does NOT reset the lifetime count
  // -------------------------------------------------------------------------
  await runTest("5. Voucher redemption does NOT reset lifetime count (survives redemption)", async () => {
    const uid = "p3_user_02";
    await cleanupTestUser(uid);
    await db.collection("users").doc(uid).set({
      email: "p3_02@paywaka.com",
      points: 1000,
    });

    // 1st claim
    const claim1 = await issueMealVoucherCore({
      uid,
      offerId: testOfferId,
      campaignId: testCampaignId,
      claimRequestId: "req_claim_02_a",
    });

    // Simulate redemption at cashier: mark voucher redeemed and clear activeVoucherId
    await db.collection("meal_vouchers").doc(claim1.voucher.id).update({
      status: "redeemed",
      redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("users").doc(uid).collection("mealClaims").doc(testOfferId).update({
      activeVoucherId: null,
    });

    // Verify lifetime count is still 1
    const claimDoc1 = await db.collection("users").doc(uid).collection("mealClaims").doc(testOfferId).get();
    assert(claimDoc1.data().lifetimeClaimCount === 1, "Lifetime count must remain 1 after redemption");

    // 2nd claim succeeds
    const claim2 = await issueMealVoucherCore({
      uid,
      offerId: testOfferId,
      campaignId: testCampaignId,
      claimRequestId: "req_claim_02_b",
    });
    assert(claim2.lifetimeClaimCount === 2, "Lifetime count must be 2 after second claim");

    // Redeem second voucher as well
    await db.collection("meal_vouchers").doc(claim2.voucher.id).update({
      status: "redeemed",
      redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("users").doc(uid).collection("mealClaims").doc(testOfferId).update({
      activeVoucherId: null,
    });

    // 3rd claim must still be rejected even though all vouchers are redeemed!
    let errorCaught = null;
    try {
      await issueMealVoucherCore({
        uid,
        offerId: testOfferId,
        campaignId: testCampaignId,
        claimRequestId: "req_claim_02_c",
      });
    } catch (e) {
      errorCaught = e.message;
    }
    assert(errorCaught === "LIFETIME_CLAIM_LIMIT_REACHED", `Expected LIFETIME_CLAIM_LIMIT_REACHED after redemptions, got ${errorCaught}`);
  });

  // -------------------------------------------------------------------------
  // TEST 6: Different coupon/offer has independent lifetime count
  // -------------------------------------------------------------------------
  await runTest("6. Different coupon/offer has its own independent lifetime count", async () => {
    const uid = "p3_user_02"; // user 2 has exhausted testOfferId (2/2)

    // Can claim testOfferId2 independently!
    const resOffer2 = await issueMealVoucherCore({
      uid,
      offerId: testOfferId2,
      campaignId: testCampaignId2,
      claimRequestId: "req_claim_02_pizza_a",
    });

    assert(resOffer2.lifetimeClaimCount === 1, `Expected pizza claim count 1, got ${resOffer2.lifetimeClaimCount}`);
    assert(resOffer2.voucher.offerId === testOfferId2, "Voucher must belong to pizza offer");

    // Check that testOfferId remains exhausted at 2/2
    const claimDoc1 = await db.collection("users").doc(uid).collection("mealClaims").doc(testOfferId).get();
    assert(claimDoc1.data().lifetimeClaimCount === 2, "Original offer count must still be 2");
  });

  // -------------------------------------------------------------------------
  // TEST 7: Idempotency safety on retried/duplicate network requests
  // -------------------------------------------------------------------------
  await runTest("7. Duplicate/retried requests return existing voucher and do NOT consume a second slot", async () => {
    const uid = "p3_user_03";
    await cleanupTestUser(uid);
    await db.collection("users").doc(uid).set({
      email: "p3_03@paywaka.com",
      points: 1000,
    });

    // First attempt
    const res1 = await issueMealVoucherCore({
      uid,
      offerId: testOfferId,
      campaignId: testCampaignId,
      claimRequestId: "req_idempotent_123",
    });
    assert(res1.idempotent === false, "First call should not be marked idempotent replay");
    assert(res1.lifetimeClaimCount === 1, "Lifetime count should be 1");

    // Exact network retry with same claimRequestId
    const res2 = await issueMealVoucherCore({
      uid,
      offerId: testOfferId,
      campaignId: testCampaignId,
      claimRequestId: "req_idempotent_123",
    });
    assert(res2.idempotent === true, "Retry must be recognized as idempotent");
    assert(res2.voucher.id === res1.voucher.id, "Must return the exact same voucher");
    assert(res2.lifetimeClaimCount === 1, "Lifetime count must NOT increment on retry");

    // Verify points was only deducted ONCE (1000 - 100 = 900)
    const userDoc = await db.collection("users").doc(uid).get();
    assert(userDoc.data().points === 900, `Expected points 900, got ${userDoc.data().points}`);
  });

  // -------------------------------------------------------------------------
  // TEST 8: Concurrent claim attempts cannot exceed 2 lifetime claims
  // -------------------------------------------------------------------------
  await runTest("8. Concurrent claim attempts cannot exceed 2 lifetime claims", async () => {
    const uid = "p3_user_04";
    await cleanupTestUser(uid);
    await db.collection("users").doc(uid).set({
      email: "p3_04@paywaka.com",
      points: 2000,
    });

    // Launch 5 concurrent claims for the same user and offer
    const concurrentPromises = [1, 2, 3, 4, 5].map((i) =>
      issueMealVoucherCore({
        uid,
        offerId: testOfferId,
        campaignId: testCampaignId,
        claimRequestId: `req_concurrent_${i}`,
      }).then(
        (val) => ({ success: true, val }),
        (err) => ({ success: false, err: err.message })
      )
    );

    const outcomes = await Promise.all(concurrentPromises);
    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    // Because active voucher restriction AND lifetime check run inside atomic transactions,
    // exactly 1 can succeed initially (since active voucher blocks the rest until expired/redeemed),
    // and under no circumstance can successes exceed 2!
    assert(successes.length <= 2, `Expected <= 2 successes, got ${successes.length}`);
    assert(failures.length >= 3, `Expected at least 3 failures due to active voucher / limit, got ${failures.length}`);

    const claimDoc = await db.collection("users").doc(uid).collection("mealClaims").doc(testOfferId).get();
    assert(claimDoc.data().lifetimeClaimCount <= 2, `Lifetime count must never exceed 2, got ${claimDoc.data().lifetimeClaimCount}`);
  });

  // -------------------------------------------------------------------------
  // SECURITY RULES TESTS: CLIENT PERMISSION ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("SECURITY RULES ENFORCEMENT TESTS (CLIENT PERMISSIONS)");
  console.log("==================================================================");

  // Mint client auth token for test user
  const clientUid = "client_test_user_77";
  await cleanupTestUser(clientUid);
  await db.collection("users").doc(clientUid).set({
    email: "client77@paywaka.com",
    points: 500,
    walletBalance: 2000,
    role: "customer",
  });

  const customToken = await admin.auth().createCustomToken(clientUid);
  await signInWithCustomToken(clientAuth, customToken);

  await runTest("9. Security Rules: Client cannot directly increase or decrease users/{uid}.points", async () => {
    const userDocRef = doc(clientDb, "users", clientUid);
    let errorCaught = null;
    try {
      await updateDoc(userDocRef, {
        points: 999999, // Attempted direct points injection
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("PERMISSION_DENIED")),
      `Expected permission-denied for points mutation, got ${errorCaught}`
    );
  });

  await runTest("10. Security Rules: Client cannot create arbitrary point-credit ledger entries", async () => {
    const forgeLedgerRef = doc(clientDb, "users", clientUid, "points", "forged_credit_ledger");
    let errorCaught = null;
    try {
      await setDoc(forgeLedgerRef, {
        points: 10000,
        direction: "credit",
        type: "free_points",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("PERMISSION_DENIED")),
      `Expected permission-denied for ledger write, got ${errorCaught}`
    );
  });

  await runTest("11. Security Rules: Client cannot modify mealClaims to reset lifetimeClaimCount", async () => {
    const claimDocRef = doc(clientDb, "users", clientUid, "mealClaims", testOfferId);
    let errorCaught = null;
    try {
      await setDoc(claimDocRef, {
        lifetimeClaimCount: 0,
        activeVoucherId: null,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("PERMISSION_DENIED")),
      `Expected permission-denied for mealClaims write, got ${errorCaught}`
    );
  });

  await runTest("12. Security Rules: Client cannot directly create or modify meal_vouchers", async () => {
    const fakeVoucherRef = doc(clientDb, "meal_vouchers", "fraudulent_vch_999");
    let errorCaught = null;
    try {
      await setDoc(fakeVoucherRef, {
        userId: clientUid,
        status: "active",
        discountNaira: 50000,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("PERMISSION_DENIED")),
      `Expected permission-denied for voucher creation, got ${errorCaught}`
    );
  });

  await runTest("13. Security Rules: Client cannot modify campaign budget or campaignSpentNaira", async () => {
    const campDocRef = doc(clientDb, "meal_campaigns", testCampaignId);
    let errorCaught = null;
    try {
      await updateDoc(campDocRef, {
        campaignBudgetNaira: 9999999,
        campaignSpentNaira: 0,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("PERMISSION_DENIED")),
      `Expected permission-denied for campaign update, got ${errorCaught}`
    );
  });

  await runTest("14. Security Rules: Client cannot create fraudulent redemption records", async () => {
    const rdmDocRef = doc(clientDb, "meal_redemptions", "fake_redemption_001");
    let errorCaught = null;
    try {
      await setDoc(rdmDocRef, {
        userId: clientUid,
        discountNaira: 5000,
        status: "successful",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("PERMISSION_DENIED")),
      `Expected permission-denied for redemption creation, got ${errorCaught}`
    );
  });

  await runTest("15. Security Rules: Legitimate read operations succeed for user", async () => {
    // Read own profile
    const userSnap = await getDoc(doc(clientDb, "users", clientUid));
    assert(userSnap.exists(), "User should be able to read own profile");
    assert(userSnap.data().email === "client77@paywaka.com", "Read correct email");

    // Read campaigns
    const campSnap = await getDoc(doc(clientDb, "meal_campaigns", testCampaignId));
    assert(campSnap.exists(), "User should be able to read active campaigns");
  });

  console.log("\n==================================================================");
  console.log("PHASE 3 TEST SUMMARY");
  console.log("==================================================================");
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} tests failed!`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All ${passed} Phase 3 tests passed successfully!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});

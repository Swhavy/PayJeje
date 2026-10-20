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

let redeemMealCouponCore;
let redeemMealCoupon;
let createTransactionPin;
let verifyUserPinCore;

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

async function cleanUser(uid) {
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

async function setupTestUserWithPin(uid, points = 1000, pin = "8361") {
  await cleanUser(uid);
  // Set up user profile with spendable points
  await db.collection("users").doc(uid).set({
    uid,
    email: `${uid}@paywaka.test`,
    userName: `Test User ${uid.slice(-4)}`,
    points: points,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create 4-digit Transaction PIN via existing callable
  await createTransactionPin.run({
    auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
    data: { pin },
  });
}

async function main() {
  console.log("==================================================================");
  console.log("PHASE 4 TEST SUITE: SECURE VOUCHER ISSUANCE & REDEMPTION ENGINE");
  console.log("==================================================================");

  const indexModule = await import("./index.js");
  redeemMealCouponCore = indexModule.redeemMealCouponCore;
  redeemMealCoupon = indexModule.redeemMealCoupon;
  createTransactionPin = indexModule.createTransactionPin;
  verifyUserPinCore = indexModule.verifyUserPinCore;

  const testVendorId = "vendor-phase4-demo";
  const testCampaignId = "camp-phase4-jollof";
  const testOfferId = "offer-phase4-jollof";

  // Seed test campaign
  await db.collection("meal_campaigns").doc(testCampaignId).set({
    id: testCampaignId,
    offerId: testOfferId,
    vendorId: testVendorId,
    vendorName: "PayWaka Phase 4 Delicacies",
    title: "₦500 Meal Discount Voucher",
    pointsCost: 100,
    discountNaira: 500,
    minSpendNaira: 2500,
    status: "active",
    campaignBudgetNaira: 50000,
    campaignSpentNaira: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // -------------------------------------------------------------------------
  // TEST 1: Rejection when caller is unauthenticated
  // -------------------------------------------------------------------------
  await runTest("1. Rejection when caller is unauthenticated", async () => {
    try {
      await redeemMealCouponCore({
        uid: null,
        couponId: testCampaignId,
        pin: "8361",
      });
      assert(false, "Expected unauthenticated error");
    } catch (err) {
      assert(
        err.code === "unauthenticated" || err.message.includes("Authentication required"),
        `Expected unauthenticated error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 2: Rejection when coupon/campaign does not exist
  // -------------------------------------------------------------------------
  await runTest("2. Rejection when coupon/campaign does not exist", async () => {
    const uid = `usr_p4_nonexistent_${Date.now()}`;
    await setupTestUserWithPin(uid, 500, "8361");

    try {
      await redeemMealCouponCore({
        uid,
        couponId: "campaign-that-does-not-exist-anywhere",
        pin: "8361",
      });
      assert(false, "Expected not-found error");
    } catch (err) {
      assert(
        err.code === "not-found" || err.message.includes("not found"),
        `Expected not-found error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 3: Rejection on incorrect 4-digit transaction PIN
  // -------------------------------------------------------------------------
  await runTest("3. Rejection on incorrect 4-digit transaction PIN", async () => {
    const uid = `usr_p4_wrongpin_${Date.now()}`;
    await setupTestUserWithPin(uid, 500, "8361");

    try {
      await redeemMealCouponCore({
        uid,
        couponId: testCampaignId,
        pin: "9999", // Wrong PIN
      });
      assert(false, "Expected permission-denied error on wrong PIN");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("Incorrect transaction PIN"),
        `Expected permission-denied error, got: ${err.message}`
      );
    }

    // Verify user's points were NOT deducted
    const userSnap = await db.collection("users").doc(uid).get();
    assert(userSnap.data().points === 500, "Points must not be deducted on wrong PIN");
  });

  // -------------------------------------------------------------------------
  // TEST 4: Rejection on insufficient spendable points
  // -------------------------------------------------------------------------
  await runTest("4. Rejection on insufficient spendable points", async () => {
    const uid = `usr_p4_lowpoints_${Date.now()}`;
    await setupTestUserWithPin(uid, 40, "8361"); // Only 40 points, cost is 100

    try {
      await redeemMealCouponCore({
        uid,
        couponId: testCampaignId,
        pin: "8361",
      });
      assert(false, "Expected failed-precondition for insufficient points");
    } catch (err) {
      assert(
        err.code === "failed-precondition" || err.message.includes("Insufficient PayWaka Points"),
        `Expected insufficient points error, got: ${err.message}`
      );
    }

    // Verify points untouched
    const userSnap = await db.collection("users").doc(uid).get();
    assert(userSnap.data().points === 40, "Points must remain 40");
  });

  // -------------------------------------------------------------------------
  // TEST 5: Successful points deduction, ledger entry, and voucher issuance
  // -------------------------------------------------------------------------
  let issuedVoucher1 = null;
  const userValid = `usr_p4_valid_${Date.now()}`;

  await runTest("5. Successful redemption: points deduction, negative ledger, active voucher", async () => {
    await setupTestUserWithPin(userValid, 1000, "8361");
    const claimRequestId = `claim_req_001_${Date.now()}`;

    const res = await redeemMealCouponCore({
      uid: userValid,
      couponId: testCampaignId,
      pin: "8361",
      idempotencyKey: claimRequestId,
    });

    assert(res.success === true, "Expected success: true");
    assert(res.voucher, "Expected voucher object in response");
    assert(res.voucher.status === "active", "Expected voucher status to be active");
    assert(res.voucher.voucherCode.startsWith("PWK-"), `Expected voucherCode PWK-*, got ${res.voucher.voucherCode}`);
    assert(typeof res.voucher.voucherPin === "string" && res.voucher.voucherPin.length === 4, "Expected 4-digit voucherPin");
    assert(res.lifetimeClaimCount === 1, `Expected lifetimeClaimCount === 1, got ${res.lifetimeClaimCount}`);
    assert(res.pointsRemaining === 900, `Expected 900 points remaining, got ${res.pointsRemaining}`);

    issuedVoucher1 = res.voucher;

    // Verify aggregate points in Firestore: users/{uid}.points === 900
    const userSnap = await db.collection("users").doc(userValid).get();
    assert(userSnap.data().points === 900, `Expected user points 900, got ${userSnap.data().points}`);

    // Verify negative ledger record: users/{uid}/points/spend_pts_{idempotencyKey}
    const ledgerSnap = await db.collection("users").doc(userValid).collection("points").doc(`spend_pts_${claimRequestId}`).get();
    assert(ledgerSnap.exists === true, "Ledger entry spend_pts_* must exist");
    const ledgerData = ledgerSnap.data();
    assert(ledgerData.type === "meal_voucher_spend", `Expected type meal_voucher_spend, got ${ledgerData.type}`);
    assert(ledgerData.points === -100, `Expected points -100, got ${ledgerData.points}`);
    assert(ledgerData.direction === "debit", `Expected direction debit, got ${ledgerData.direction}`);
    assert(ledgerData.voucherId === res.voucher.id, "Ledger must reference voucherId");

    // Verify voucher document in meal_vouchers/{voucherId}
    const voucherDoc = await db.collection("meal_vouchers").doc(res.voucher.id).get();
    assert(voucherDoc.exists === true, "Voucher document must exist in meal_vouchers");
    const vData = voucherDoc.data();
    assert(vData.status === "active", "Voucher document status must be active");
    assert(vData.discountNaira === 500, "Voucher discountNaira must be 500");
    assert(vData.minSpendNaira === 2500, "Voucher minSpendNaira must be 2500");
    assert(vData.pointsDeducted === 100, "Voucher pointsDeducted must be 100");

    // Verify 48-hour expiration calculation
    const issuedMs = vData.issuedAt.toMillis();
    const expiresMs = vData.expiresAt.toMillis();
    const durationHours = (expiresMs - issuedMs) / (3600 * 1000);
    assert(Math.round(durationHours) === 48, `Expected 48 hours validity, got ${durationHours}`);

    // Verify mealClaims record
    const claimDoc = await db.collection("users").doc(userValid).collection("mealClaims").doc(testOfferId).get();
    assert(claimDoc.exists === true, "mealClaims record must exist");
    assert(claimDoc.data().lifetimeClaimCount === 1, "lifetimeClaimCount must be 1");
    assert(claimDoc.data().activeVoucherId === res.voucher.id, "activeVoucherId must match issued voucher");

    // Verify campaign budget was NOT consumed
    const campaignDoc = await db.collection("meal_campaigns").doc(testCampaignId).get();
    assert(campaignDoc.data().campaignSpentNaira === 0, "Campaign campaignSpentNaira must NOT be incremented at issuance");
  });

  // -------------------------------------------------------------------------
  // TEST 6: Idempotency deduplication (re-calling with same idempotencyKey)
  // -------------------------------------------------------------------------
  await runTest("6. Idempotency deduplication: same key returns voucher without double-charging", async () => {
    const uidIdempotent = `usr_p4_idempotent_${Date.now()}`;
    await setupTestUserWithPin(uidIdempotent, 1000, "8361");
    const claimRequestId = `claim_req_idempotent_${Date.now()}`;

    // First call
    const res1 = await redeemMealCouponCore({
      uid: uidIdempotent,
      couponId: testCampaignId,
      pin: "8361",
      idempotencyKey: claimRequestId,
    });
    assert(res1.success === true, "First redemption must succeed");
    assert(res1.voucher, "First call must issue voucher");

    // Points before second call
    const pointsBefore = (await db.collection("users").doc(uidIdempotent).get()).data().points;
    assert(pointsBefore === 900, "Points must be 900 after first claim");

    // Second call with same idempotency key (simulating network retry)
    const res2 = await redeemMealCouponCore({
      uid: uidIdempotent,
      couponId: testCampaignId,
      pin: "8361",
      idempotencyKey: claimRequestId,
    });

    assert(res2.success === true, "Expected success on idempotent call");
    assert(res2.idempotent === true, "Expected idempotent: true");
    assert(res2.voucher.id === res1.voucher.id, "Expected same voucher to be returned");

    // Points should not have been deducted again
    const pointsAfter = (await db.collection("users").doc(uidIdempotent).get()).data().points;
    assert(pointsBefore === pointsAfter, `Points must not change on duplicate idempotency key (was ${pointsBefore}, now ${pointsAfter})`);
  });

  // -------------------------------------------------------------------------
  // TEST 7: Active voucher restriction (cannot claim while holding active voucher)
  // -------------------------------------------------------------------------
  await runTest("7. Active voucher restriction: cannot claim again while holding active unexpired voucher", async () => {
    // userValid currently holds issuedVoucher1 which is active and unexpired
    try {
      await redeemMealCouponCore({
        uid: userValid,
        couponId: testCampaignId,
        pin: "8361",
        idempotencyKey: `new_key_while_active_${Date.now()}`,
      });
      assert(false, "Expected already-exists error because active voucher is held");
    } catch (err) {
      assert(
        err.code === "already-exists" || err.message.includes("active unredeemed voucher"),
        `Expected already-exists error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 8: Expiration releases active voucher block for 2nd lifetime claim
  // -------------------------------------------------------------------------
  await runTest("8. Expiration releases active lock: user can claim 2nd voucher past 48h", async () => {
    // Simulate time passing: 49 hours later
    const futureTime = new Date(Date.now() + 49 * 3600 * 1000);
    const claimRequestId = `claim_second_after_49h_${Date.now()}`;

    const res = await redeemMealCouponCore({
      uid: userValid,
      couponId: testCampaignId,
      pin: "8361",
      idempotencyKey: claimRequestId,
      overrideNow: futureTime,
    });

    assert(res.success === true, "Expected successful 2nd claim after expiration");
    assert(res.lifetimeClaimCount === 2, `Expected lifetimeClaimCount === 2, got ${res.lifetimeClaimCount}`);
  });

  // -------------------------------------------------------------------------
  // TEST 9: Lifetime claim limit reached (maximum 2 claims per offer)
  // -------------------------------------------------------------------------
  await runTest("9. Lifetime claim limit: 3rd claim rejected with resource-exhausted", async () => {
    // Even in the distant future (e.g. 100 hours later), lifetime limit is 2
    const futureTime = new Date(Date.now() + 100 * 3600 * 1000);

    try {
      await redeemMealCouponCore({
        uid: userValid,
        couponId: testCampaignId,
        pin: "8361",
        idempotencyKey: `claim_attempt_3_${Date.now()}`,
        overrideNow: futureTime,
      });
      assert(false, "Expected resource-exhausted error on 3rd lifetime claim");
    } catch (err) {
      assert(
        err.code === "resource-exhausted" || err.message.includes("Lifetime claim limit reached"),
        `Expected resource-exhausted error, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 10: Standard catalog fallback support (e.g. coupon-demo-pizza)
  // -------------------------------------------------------------------------
  await runTest("10. Catalog fallback: seamlessly claims built-in demo catalog coupons", async () => {
    const uid = `usr_p4_catalog_${Date.now()}`;
    await setupTestUserWithPin(uid, 500, "8361");

    const res = await redeemMealCouponCore({
      uid,
      couponId: "coupon-demo-pizza", // Cost 200 pts, discount 1000
      pin: "8361",
      idempotencyKey: `claim_pizza_${Date.now()}`,
    });

    assert(res.success === true, "Expected success for coupon-demo-pizza");
    assert(res.voucher.discountNaira === 1000, `Expected 1000 discount, got ${res.voucher.discountNaira}`);
    assert(res.voucher.minSpendNaira === 5000, `Expected 5000 minSpend, got ${res.voucher.minSpendNaira}`);
    assert(res.pointsRemaining === 300, `Expected 300 points remaining, got ${res.pointsRemaining}`);

    // Verify points deducted
    const userSnap = await db.collection("users").doc(uid).get();
    assert(userSnap.data().points === 300, `Expected points 300, got ${userSnap.data().points}`);
  });

  // -------------------------------------------------------------------------
  // TEST 11: Callable wrapper redeemMealCoupon.run execution
  // -------------------------------------------------------------------------
  await runTest("11. Callable wrapper redeemMealCoupon.run execution with auth context", async () => {
    const uid = `usr_p4_callable_${Date.now()}`;
    await setupTestUserWithPin(uid, 400, "8361");

    const res = await redeemMealCoupon.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: {
        couponId: "coupon-demo-jollof", // 100 pts
        pin: "8361",
        idempotencyKey: `callable_test_${Date.now()}`,
      },
    });

    assert(res.success === true, "Callable execution must return success: true");
    assert(res.voucher.id.startsWith("vch_"), "Callable must return voucher with id starting with vch_");
    assert(res.pointsRemaining === 300, `Expected pointsRemaining 300, got ${res.pointsRemaining}`);
  });

  // -------------------------------------------------------------------------
  // TEST 12: Concurrent redemption with distinct keys (race condition safety)
  // -------------------------------------------------------------------------
  await runTest("12. Concurrency: multiple simultaneous claims with distinct keys issue exactly 1 voucher", async () => {
    const uidConcurrent = `usr_p4_concurrent_distinct_${Date.now()}`;
    await setupTestUserWithPin(uidConcurrent, 1000, "8361");

    // Launch 5 simultaneous requests with distinct idempotency keys
    const promises = [1, 2, 3, 4, 5].map((i) =>
      redeemMealCouponCore({
        uid: uidConcurrent,
        couponId: testCampaignId,
        pin: "8361",
        idempotencyKey: `req_distinct_${i}_${Date.now()}`,
      }).then(
        (val) => ({ success: true, val }),
        (err) => ({ success: false, err: err.message, code: err.code })
      )
    );

    const outcomes = await Promise.all(promises);
    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    // Invariant 1: Exactly 1 request must succeed; exactly 4 must fail
    assert(successes.length === 1, `Expected exactly 1 success, got ${successes.length}`);
    assert(failures.length === 4, `Expected exactly 4 failures, got ${failures.length}`);

    // Invariant 2: Competing requests failed because of active voucher lock
    for (const fail of failures) {
      assert(
        fail.code === "already-exists" || fail.err.includes("active unredeemed voucher"),
        `Expected active voucher rejection, got: ${fail.err}`
      );
    }

    // Invariant 3: Points deducted exactly once (1000 - 100 = 900)
    const userSnap = await db.collection("users").doc(uidConcurrent).get();
    assert(userSnap.data().points === 900, `Expected points 900, got ${userSnap.data().points}`);

    // Invariant 4: Exactly 1 debit ledger entry created
    const ledgerSnap = await db.collection("users").doc(uidConcurrent).collection("points").get();
    const debits = ledgerSnap.docs.filter((d) => d.data().type === "meal_voucher_spend");
    assert(debits.length === 1, `Expected exactly 1 debit ledger entry, got ${debits.length}`);
    assert(debits[0].data().points === -100, "Debit ledger entry must be -100 points");

    // Invariant 5: Exactly 1 active voucher document created
    const vouchersSnap = await db.collection("meal_vouchers").where("userId", "==", uidConcurrent).get();
    assert(vouchersSnap.size === 1, `Expected exactly 1 voucher doc, got ${vouchersSnap.size}`);
    const issuedVoucher = vouchersSnap.docs[0].data();
    assert(issuedVoucher.status === "active", "Issued voucher must be active");
    assert(issuedVoucher.id === successes[0].val.voucher.id, "Voucher ID must match success result");

    // Invariant 6: Lifetime claim count remains exactly 1, activeVoucherId matches
    const claimSnap = await db.collection("users").doc(uidConcurrent).collection("mealClaims").doc(testOfferId).get();
    assert(claimSnap.exists === true, "Meal claim document must exist");
    assert(claimSnap.data().lifetimeClaimCount === 1, `Expected lifetimeClaimCount 1, got ${claimSnap.data().lifetimeClaimCount}`);
    assert(claimSnap.data().activeVoucherId === issuedVoucher.id, "activeVoucherId must match issued voucher");

    // Invariant 7: Campaign campaignSpentNaira remained untouched
    const campSnap = await db.collection("meal_campaigns").doc(testCampaignId).get();
    assert(campSnap.data().campaignSpentNaira === 0, "campaignSpentNaira must be 0");
  });

  // -------------------------------------------------------------------------
  // TEST 13: Concurrent redemption with identical key (idempotency under concurrency)
  // -------------------------------------------------------------------------
  await runTest("13. Concurrency: multiple simultaneous claims with identical key never double-debit", async () => {
    const uidIdentical = `usr_p4_concurrent_identical_${Date.now()}`;
    await setupTestUserWithPin(uidIdentical, 1000, "8361");
    const sharedIdempotencyKey = `req_shared_race_${Date.now()}`;

    // Launch 5 simultaneous requests with the SAME idempotency key
    const promises = [1, 2, 3, 4, 5].map(() =>
      redeemMealCouponCore({
        uid: uidIdentical,
        couponId: testCampaignId,
        pin: "8361",
        idempotencyKey: sharedIdempotencyKey,
      }).then(
        (val) => ({ success: true, val }),
        (err) => ({ success: false, err: err.message, code: err.code })
      )
    );

    const outcomes = await Promise.all(promises);
    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    // All competing calls with identical key must succeed (either initial creation or idempotent return)
    assert(failures.length === 0, `Expected 0 failures on identical key, got ${failures.length}: ${failures.map(f => f.err).join("; ")}`);
    assert(successes.length === 5, `Expected all 5 calls to succeed idempotently, got ${successes.length}`);

    // All successful calls returned the exact same voucher ID
    const firstVoucherId = successes[0].val.voucher.id;
    for (const s of successes) {
      assert(s.val.voucher.id === firstVoucherId, `All responses must return voucher ${firstVoucherId}, got ${s.val.voucher.id}`);
    }

    // Invariant: Points deducted exactly once (1000 - 100 = 900)
    const userSnap = await db.collection("users").doc(uidIdentical).get();
    assert(userSnap.data().points === 900, `Expected points 900, got ${userSnap.data().points}`);

    // Invariant: Exactly 1 debit ledger entry exists
    const ledgerSnap = await db.collection("users").doc(uidIdentical).collection("points").get();
    const debits = ledgerSnap.docs.filter((d) => d.data().type === "meal_voucher_spend");
    assert(debits.length === 1, `Expected exactly 1 ledger debit entry, got ${debits.length}`);

    // Invariant: Exactly 1 voucher document exists
    const vouchersSnap = await db.collection("meal_vouchers").where("userId", "==", uidIdentical).get();
    assert(vouchersSnap.size === 1, `Expected exactly 1 voucher doc in meal_vouchers, got ${vouchersSnap.size}`);

    // Invariant: Lifetime claim count is exactly 1
    const claimSnap = await db.collection("users").doc(uidIdentical).collection("mealClaims").doc(testOfferId).get();
    assert(claimSnap.data().lifetimeClaimCount === 1, `Expected lifetimeClaimCount 1, got ${claimSnap.data().lifetimeClaimCount}`);
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("PHASE 4 TEST SUMMARY");
  console.log("==================================================================");
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    console.error("\nSome Phase 4 tests failed:");
    results.filter((r) => r.status === "FAILED").forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log("\nALL PHASE 4 REDEMPTION ENGINE TESTS PASSED! 🎉");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Phase 4 test suite:", err);
  process.exit(1);
});

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

let createWallet;
let createTransactionPin;
let redeemMealCouponCore;
let redeemMealVoucherMerchantCore;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name, fn) {
  process.stdout.write(`• Running: ${name}... `);
  try {
    await fn();
    console.log("PASSED");
    return true;
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function main() {
  console.log("==================================================================");
  console.log("FOCUSED SECURITY TEST: WALLET BYPASS GUARD & IDEMPOTENCY SAFETY");
  console.log("==================================================================\n");

  const indexModule = await import("./index.js");
  createWallet = indexModule.createWallet;
  createTransactionPin = indexModule.createTransactionPin;
  redeemMealCouponCore = indexModule.redeemMealCouponCore;
  redeemMealVoucherMerchantCore = indexModule.redeemMealVoucherMerchantCore;

  let allPassed = true;

  // ---------------------------------------------------------------------------
  // SUITE 1: EMULATOR WALLET BYPASS GUARD RIGOR
  // ---------------------------------------------------------------------------
  console.log("--- SUITE 1: WALLET BYPASS GUARDS ---");

  const testUid = `usr_guard_${Date.now()}`;

  // Test 1: Production guard - FUNCTIONS_EMULATOR unset means demo email cannot activate mock
  const p1 = await runTest(
    "1. Production guard: FUNCTIONS_EMULATOR unset rejects mock bypass for demo email",
    async () => {
      const originalEnv = process.env.FUNCTIONS_EMULATOR;
      try {
        delete process.env.FUNCTIONS_EMULATOR; // Simulating production environment
        let result = null;
        try {
          result = await createWallet(
            "hacker@paywaka.demo",
            "08012345678",
            "Demo",
            "User",
            "NG",
            testUid
          );
        } catch (e) {
          // Failure reaching external API is expected; mock bypass NOT returning is the key
        }
        assert(
          !result || result.isMock !== true,
          "Mock bypass MUST NOT trigger when FUNCTIONS_EMULATOR is unset!"
        );
      } finally {
        process.env.FUNCTIONS_EMULATOR = "true"; // Restore immediately
      }
    }
  );
  if (!p1) allPassed = false;

  // Test 2: In emulator, normal (non-demo) email cannot activate mock bypass
  const p2 = await runTest(
    "2. In emulator: non-demo email (@gmail.com) does NOT trigger mock bypass",
    async () => {
      process.env.FUNCTIONS_EMULATOR = "true";
      let result = null;
      try {
        result = await createWallet(
          "legitimate_user@gmail.com",
          "08012345678",
          "John",
          "Doe",
          "NG",
          testUid
        );
      } catch (e) {
        // network error when reaching real flw is expected, not mock
      }
      assert(
        !result || result.isMock !== true,
        "Mock bypass MUST NOT trigger for standard email domains even in emulator!"
      );
    }
  );
  if (!p2) allPassed = false;

  // Test 3: In emulator, demo email (@paywaka.demo) activates mock bypass
  const p3 = await runTest(
    "3. In emulator: demo email (@paywaka.demo) safely returns mock reference",
    async () => {
      process.env.FUNCTIONS_EMULATOR = "true";
      const result = await createWallet(
        "test_cashier@paywaka.demo",
        "08012345678",
        "Cashier",
        "Demo",
        "NG",
        testUid
      );
      assert(result && result.status === "success", "Expected success status");
      assert(result.isMock === true, "Expected isMock === true");
      assert(
        result.accountReference === `mock_ref_${testUid}`,
        `Expected mock_ref_${testUid}, got ${result.accountReference}`
      );
    }
  );
  if (!p3) allPassed = false;

  // Test 4: Verify createWallet does NOT mutate users/{uid}.walletBalance
  const p4 = await runTest(
    "4. createWallet bypass does NOT alter or grant walletBalance in Firestore",
    async () => {
      const userRef = db.collection("users").doc(testUid);
      await userRef.set({
        uid: testUid,
        email: "test_cashier@paywaka.demo",
        walletBalance: 0,
      });

      process.env.FUNCTIONS_EMULATOR = "true";
      await createWallet(
        "test_cashier@paywaka.demo",
        "08012345678",
        "Cashier",
        "Demo",
        "NG",
        testUid
      );

      const snap = await userRef.get();
      const balance = snap.data().walletBalance;
      assert(balance === 0, `walletBalance must remain 0, found ${balance}`);
      await userRef.delete();
    }
  );
  if (!p4) allPassed = false;

  // ---------------------------------------------------------------------------
  // SUITE 2: TIMEOUT & IDEMPOTENCY TRANSACTIONAL SAFETY
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 2: TRANSACTIONAL IDEMPOTENCY & TIMEOUT SAFETY ---");

  const customerUid = `cust_idem_${Date.now()}`;
  const cashierUid = `cashier_idem_${Date.now()}`;
  const otherCashierUid = `other_cashier_${Date.now()}`;
  const vendorId = "paywaka-demo-foods";
  const campaignId = `camp_idem_${Date.now()}`;

  // Setup fixtures
  await db.collection("users").doc(customerUid).set({
    uid: customerUid,
    email: "customer@paywaka.demo",
    role: "user",
    points: 1000,
    walletBalance: 0,
  });

  await createTransactionPin.run({
    auth: { uid: customerUid },
    data: { pin: "8361" },
  });

  await db.collection("users").doc(cashierUid).set({
    uid: cashierUid,
    email: "cashier@paywaka.demo",
    role: "vendor",
    vendorId,
    vendorBranch: "Ikeja",
  });

  await db.collection("users").doc(otherCashierUid).set({
    uid: otherCashierUid,
    email: "other_cashier@paywaka.demo",
    role: "vendor",
    vendorId,
    vendorBranch: "Victoria Island",
  });

  await db.collection("meal_campaigns").doc(campaignId).set({
    id: campaignId,
    offerId: campaignId,
    title: "Idempotency Safety Campaign",
    status: "active",
    pointsCost: 200,
    discountNaira: 500,
    minSpendNaira: 2000,
    vendorId,
    vendorName: "PayWaka Partner Foods",
    campaignBudgetNaira: 10000,
    campaignSpentNaira: 0,
    totalIssuedCount: 0,
    totalRedeemedCount: 0,
  });

  let issuedVoucher = null;
  const couponIdemKey = `idem_claim_${Date.now()}`;

  // Test 5: Customer claim idempotency replay (simulating network timeout retry)
  const p5 = await runTest(
    "5. Customer claim: retry with same idempotency key returns prior voucher without double-charging points",
    async () => {
      // First claim
      const res1 = await redeemMealCouponCore({
        uid: customerUid,
        couponId: campaignId,
        pin: "8361",
        idempotencyKey: couponIdemKey,
      });
      assert(res1 && res1.success, "First claim must succeed");
      issuedVoucher = res1.voucher;

      const userAfter1 = (await db.collection("users").doc(customerUid).get()).data();
      assert(userAfter1.points === 800, `Expected 800 points remaining, got ${userAfter1.points}`);

      // Replay identical claim (simulating client retry after timeout)
      const res2 = await redeemMealCouponCore({
        uid: customerUid,
        couponId: campaignId,
        pin: "8361",
        idempotencyKey: couponIdemKey,
      });
      assert(res2 && res2.success, "Replayed claim must succeed");
      assert(res2.idempotent === true, "Must have idempotent: true flag");
      assert(res2.voucher.id === issuedVoucher.id, "Must return exact same voucher ID");

      const userAfter2 = (await db.collection("users").doc(customerUid).get()).data();
      assert(userAfter2.points === 800, `Points must still be 800, got ${userAfter2.points}`);
    }
  );
  if (!p5) allPassed = false;

  // Test 6: Merchant redemption idempotency replay (simulating cashier network timeout retry)
  const redeemIdemKey = `idem_redeem_${Date.now()}`;
  let firstRedemptionResult = null;

  const p6 = await runTest(
    "6. Merchant redemption: retry with same idempotency key returns prior redemption without double-deducting budget",
    async () => {
      firstRedemptionResult = await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: issuedVoucher.id,
        vendorId,
        billAmountNaira: 3500,
        idempotencyKey: redeemIdemKey,
      });
      assert(firstRedemptionResult && firstRedemptionResult.success, "First redemption must succeed");

      const campAfter1 = (await db.collection("meal_campaigns").doc(campaignId).get()).data();
      assert(campAfter1.campaignSpentNaira === 500, `Expected 500 spent, got ${campAfter1.campaignSpentNaira}`);
      assert(campAfter1.redemptionCount === 1, `Expected redemptionCount=1, got ${campAfter1.redemptionCount}`);

      // Replay identical redemption request (simulating cashier POS retry)
      const res2 = await redeemMealVoucherMerchantCore({
        cashierUid,
        voucherCodeOrId: issuedVoucher.id,
        vendorId,
        billAmountNaira: 3500,
        idempotencyKey: redeemIdemKey,
      });
      assert(res2 && res2.success, "Replayed redemption must succeed");
      assert(res2.idempotent === true, "Must have idempotent: true flag");
      assert(res2.redemptionId === firstRedemptionResult.redemptionId, "Must return same redemptionId");

      const campAfter2 = (await db.collection("meal_campaigns").doc(campaignId).get()).data();
      assert(campAfter2.campaignSpentNaira === 500, `Budget spent must still be 500, got ${campAfter2.campaignSpentNaira}`);
      assert(campAfter2.redemptionCount === 1, `redemptionCount must still be 1, got ${campAfter2.redemptionCount}`);
    }
  );
  if (!p6) allPassed = false;

  // Test 7: Parameter conflict detection - Same key with conflicting bill amount is REJECTED
  const p7 = await runTest(
    "7. Idempotency conflict: same key with different bill amount is REJECTED with invalid-argument",
    async () => {
      let errorCaught = null;
      try {
        await redeemMealVoucherMerchantCore({
          cashierUid,
          voucherCodeOrId: issuedVoucher.id,
          vendorId,
          billAmountNaira: 5000, // Conflict! Was 3500 originally
          idempotencyKey: redeemIdemKey,
        });
      } catch (e) {
        errorCaught = e.code || e.message;
      }
      assert(
        errorCaught && (errorCaught.includes("invalid-argument") || errorCaught.includes("conflict")),
        `Expected invalid-argument conflict error, got: ${errorCaught}`
      );
    }
  );
  if (!p7) allPassed = false;

  // Test 8: Cross-cashier conflict detection - Same key from another cashier is REJECTED
  const p8 = await runTest(
    "8. Idempotency isolation: same key from another cashier is REJECTED with permission-denied",
    async () => {
      let errorCaught = null;
      try {
        await redeemMealVoucherMerchantCore({
          cashierUid: otherCashierUid, // Conflict! Original was cashierUid
          voucherCodeOrId: issuedVoucher.id,
          vendorId,
          billAmountNaira: 3500,
          idempotencyKey: redeemIdemKey,
        });
      } catch (e) {
        errorCaught = e.code || e.message;
      }
      assert(
        errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("conflict")),
        `Expected permission-denied conflict error, got: ${errorCaught}`
      );
    }
  );
  if (!p8) allPassed = false;

  // Test 9: Double redemption prevention - Fresh key on already redeemed voucher is REJECTED
  const p9 = await runTest(
    "9. Double redemption prevention: new key on redeemed voucher is REJECTED with failed-precondition",
    async () => {
      let errorCaught = null;
      try {
        await redeemMealVoucherMerchantCore({
          cashierUid,
          voucherCodeOrId: issuedVoucher.id,
          vendorId,
          billAmountNaira: 3500,
          idempotencyKey: `brand_new_key_${Date.now()}`,
        });
      } catch (e) {
        errorCaught = e.code || e.message;
      }
      assert(
        errorCaught && (errorCaught.includes("failed-precondition") || errorCaught.includes("already been redeemed")),
        `Expected already redeemed error, got: ${errorCaught}`
      );
    }
  );
  if (!p9) allPassed = false;

  // Cleanup
  await db.collection("users").doc(customerUid).delete();
  await db.collection("users").doc(cashierUid).delete();
  await db.collection("users").doc(otherCashierUid).delete();
  await db.collection("meal_campaigns").doc(campaignId).delete();
  if (issuedVoucher) {
    await db.collection("meal_vouchers").doc(issuedVoucher.id).delete();
  }
  await db.collection("meal_idempotency_records").doc(redeemIdemKey).delete();

  console.log("\n==================================================================");
  if (allPassed) {
    console.log("🎉 ALL WALLET BYPASS & IDEMPOTENCY SAFETY TESTS PASSED!");
    process.exit(0);
  } else {
    console.error("❌ ONE OR MORE TESTS FAILED!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});

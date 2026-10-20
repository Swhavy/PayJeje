process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
process.env.GCLOUD_PROJECT = "vtu-site-43118";
process.env.FUNCTIONS_EMULATOR = "true";

import dotenv from "dotenv";
dotenv.config({ path: "./functions/.env" });

import admin from "firebase-admin";
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "vtu-site-43118" });
}
const db = admin.firestore();

// Dynamically import functions from index.js
let awardTransactionPointsCore,
  clubkonnectBuyAirtime,
  clubkonnectBuyData,
  clubkonnectPayElectricity,
  clubkonnectPayCable,
  createTransactionPin,
  checkin;

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
    const pts = await db.collection("users").doc(uid).collection("points").get();
    for (const d of pts.docs) {
      await d.ref.delete();
    }
    const txs = await db.collection("users").doc(uid).collection("Transactions").get();
    for (const d of txs.docs) {
      await d.ref.delete();
    }
    const notifs = await db.collection("users").doc(uid).collection("notifications").get();
    for (const d of notifs.docs) {
      await d.ref.delete();
    }
    await db.collection("users").doc(uid).collection("private_security").doc("pin_credentials").delete();
    await db.collection("users").doc(uid).delete();
  } catch (e) {}
}

async function main() {
  console.log("==================================================================");
  console.log("PHASE 1 TEST SUITE: POINTS ARCHITECTURE & EARNING INFRASTRUCTURE");
  console.log("==================================================================");

  const funcs = await import("./index.js");
  awardTransactionPointsCore = funcs.awardTransactionPointsCore;
  clubkonnectBuyAirtime = funcs.clubkonnectBuyAirtime;
  clubkonnectBuyData = funcs.clubkonnectBuyData;
  clubkonnectPayElectricity = funcs.clubkonnectPayElectricity;
  clubkonnectPayCable = funcs.clubkonnectPayCable;
  createTransactionPin = funcs.createTransactionPin;
  checkin = funcs.checkin;

  // -------------------------------------------------------------------------
  // TEST 1: Formula verification & Floor Rounding (₦50 -> 1 point)
  // -------------------------------------------------------------------------
  await runTest("1. Formula: ₦50 spend = 1 point with floor rounding", async () => {
    const uid = "test_user_formula_" + Date.now();
    await cleanUser(uid);
    await db.collection("users").doc(uid).set({ points: 0, walletBalance: 100000 });

    // ₦50 -> 1 point
    const r50 = await awardTransactionPointsCore({ uid, requestId: "req_50", category: "Airtime", amount: 50 });
    assert(r50.pointsEarned === 1 && r50.awarded === true, `Expected 1 point for ₦50, got ${r50.pointsEarned}`);

    // ₦100 -> 2 points
    const r100 = await awardTransactionPointsCore({ uid, requestId: "req_100", category: "Data", amount: 100 });
    assert(r100.pointsEarned === 2 && r100.awarded === true, `Expected 2 points for ₦100, got ${r100.pointsEarned}`);

    // ₦250 -> 5 points
    const r250 = await awardTransactionPointsCore({ uid, requestId: "req_250", category: "Electricity", amount: 250 });
    assert(r250.pointsEarned === 5 && r250.awarded === true, `Expected 5 points for ₦250, got ${r250.pointsEarned}`);

    // ₦1,000 -> 20 points
    const r1000 = await awardTransactionPointsCore({ uid, requestId: "req_1000", category: "Cable", amount: 1000 });
    assert(r1000.pointsEarned === 20 && r1000.awarded === true, `Expected 20 points for ₦1,000, got ${r1000.pointsEarned}`);

    // ₦1,425 -> 28 points (Floor rounding: floor(1425 / 50) = 28)
    const r1425 = await awardTransactionPointsCore({ uid, requestId: "req_1425", category: "Airtime", amount: 1425 });
    assert(r1425.pointsEarned === 28 && r1425.awarded === true, `Expected 28 points for ₦1,425, got ${r1425.pointsEarned}`);

    // ₦49 -> 0 points (below threshold)
    const r49 = await awardTransactionPointsCore({ uid, requestId: "req_49", category: "Airtime", amount: 49 });
    assert(r49.pointsEarned === 0 && r49.awarded === false, `Expected 0 points for ₦49, got ${r49.pointsEarned}`);

    // Verify aggregate balance: 1 + 2 + 5 + 20 + 28 = 56 points
    const userDoc = await db.collection("users").doc(uid).get();
    assert(userDoc.data().points === 56, `Expected aggregate points to be 56, got ${userDoc.data().points}`);
  });

  // -------------------------------------------------------------------------
  // TEST 2: Append-only points ledger verification
  // -------------------------------------------------------------------------
  await runTest("2. Append-only ledger: entries created in users/{uid}/points/{ledgerId}", async () => {
    const uid = "test_user_ledger_" + Date.now();
    await cleanUser(uid);
    await db.collection("users").doc(uid).set({ points: 0 });

    const reqId = "tx_airtime_999";
    await awardTransactionPointsCore({ uid, requestId: reqId, category: "Airtime", amount: 1500 });

    const ledgerDoc = await db.collection("users").doc(uid).collection("points").doc(`earn_${reqId}`).get();
    assert(ledgerDoc.exists, "Expected ledger document users/{uid}/points/earn_tx_airtime_999 to exist");
    
    const data = ledgerDoc.data();
    assert(data.type === "transaction_earn", `Expected type 'transaction_earn', got ${data.type}`);
    assert(data.points === 30, `Expected points 30, got ${data.points}`);
    assert(data.direction === "credit", `Expected direction 'credit', got ${data.direction}`);
    assert(data.source === "airtime", `Expected source 'airtime', got ${data.source}`);
    assert(data.referenceId === reqId, `Expected referenceId '${reqId}', got ${data.referenceId}`);
    assert(data.amountNaira === 1500, `Expected amountNaira 1500, got ${data.amountNaira}`);
    assert(data.createdAt !== undefined, "Expected createdAt timestamp");
  });

  // -------------------------------------------------------------------------
  // TEST 3: Idempotency: Retried transactions must not award points twice
  // -------------------------------------------------------------------------
  await runTest("3. Idempotency: Repeated point awards for same transaction are blocked", async () => {
    const uid = "test_user_idem_" + Date.now();
    await cleanUser(uid);
    await db.collection("users").doc(uid).set({ points: 10 });

    const reqId = "tx_idempotent_001";
    // First attempt -> Awards 10 points
    const firstRes = await awardTransactionPointsCore({ uid, requestId: reqId, category: "Data", amount: 500 });
    assert(firstRes.awarded === true, "First attempt must award points");

    let uData = (await db.collection("users").doc(uid).get()).data();
    assert(uData.points === 20, `Expected balance 20, got ${uData.points}`);

    // Second attempt (identical requestId) -> Must skip
    const secondRes = await awardTransactionPointsCore({ uid, requestId: reqId, category: "Data", amount: 500 });
    assert(secondRes.awarded === false, "Second attempt must NOT award points");
    assert(secondRes.duplicate === true, "Second attempt must return duplicate: true");

    uData = (await db.collection("users").doc(uid).get()).data();
    assert(uData.points === 20, `Balance must remain 20, got ${uData.points}`);

    // Verify ledger has exactly 1 document
    const ledgerDocs = await db.collection("users").doc(uid).collection("points").get();
    assert(ledgerDocs.size === 1, `Expected exactly 1 ledger doc, got ${ledgerDocs.size}`);
  });

  // -------------------------------------------------------------------------
  // TEST 4: End-to-end Airtime transaction awards points
  // -------------------------------------------------------------------------
  await runTest("4. End-to-End: clubkonnectBuyAirtime awards points and returns pointsEarned", async () => {
    const uid = "test_user_airtime_" + Date.now();
    await cleanUser(uid);
    const userRef = db.collection("users").doc(uid);
    await userRef.set({ walletBalance: 20000, points: 5 });

    // Setup PIN
    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    // Mock provider fetch to simulate ClubKonnect success (matching test_part4_suite pattern)
    const originalFetch = globalThis.fetch;
    const mockFetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes("APIDatabundlePlansV2.asp")) {
        const plansObj = {
          MOBILE_NETWORK: {
            MTN: [{
              PRODUCT: [{ PRODUCT_CODE: "1000.01", PRODUCT_AMOUNT: "950" }]
            }]
          }
        };
        return {
          ok: true,
          status: 200,
          json: async () => plansObj,
          text: async () => JSON.stringify(plansObj),
        };
      }
      if (urlStr.includes("nellobytesystems.com")) {
        const respObj = {
          status: "ORDER_COMPLETED",
          orderid: `MOCK_CK_${Date.now()}`,
          statuscode: "100",
          msg: "Transaction Successful",
          token: "1234-5678-9012",
        };
        return {
          ok: true,
          status: 200,
          json: async () => respObj,
          text: async () => JSON.stringify(respObj),
        };
      }
      return originalFetch(url, options);
    };

    try {
      globalThis.fetch = mockFetch;

      // ₦2,000 Airtime -> 40 points
      const res = await clubkonnectBuyAirtime.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { network: "MTN", phone: "08012345678", amount: 2000, pin: "8361" },
      });

      assert(res.status === "success", "Expected airtime purchase to succeed");
      assert(res.pointsEarned === 40, `Expected 40 pointsEarned in response, got ${res.pointsEarned}`);

      const uData = (await userRef.get()).data();
      assert(uData.points === 45, `Expected total points 45 (5 + 40), got ${uData.points}`);
      assert(uData.walletBalance === 18000, `Expected balance debited to 18000, got ${uData.walletBalance}`);

      // Verify transaction doc marked with points_awarded
      const txDoc = await userRef.collection("Transactions").doc(res.tx_ref).get();
      assert(txDoc.exists && txDoc.data().points_awarded === true, "Expected Transactions doc to have points_awarded: true");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 5: End-to-end Data transaction awards points
  // -------------------------------------------------------------------------
  await runTest("5. End-to-End: clubkonnectBuyData awards points and returns pointsEarned", async () => {
    const uid = "test_user_data_" + Date.now();
    await cleanUser(uid);
    const userRef = db.collection("users").doc(uid);
    await userRef.set({ walletBalance: 50000, points: 0 });

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    const originalFetch = globalThis.fetch;
    const mockFetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes("APIDatabundlePlansV2.asp")) {
        const plansObj = {
          MOBILE_NETWORK: {
            MTN: [{
              PRODUCT: [{ PRODUCT_CODE: "1000.01", PRODUCT_AMOUNT: "950" }]
            }]
          }
        };
        return {
          ok: true,
          status: 200,
          json: async () => plansObj,
          text: async () => JSON.stringify(plansObj),
        };
      }
      if (urlStr.includes("nellobytesystems.com")) {
        const respObj = {
          status: "ORDER_COMPLETED",
          orderid: `MOCK_CK_${Date.now()}`,
          statuscode: "100",
          msg: "Transaction Successful",
        };
        return {
          ok: true,
          status: 200,
          json: async () => respObj,
          text: async () => JSON.stringify(respObj),
        };
      }
      return originalFetch(url, options);
    };

    try {
      globalThis.fetch = mockFetch;
      // Data plan: ₦1,000 -> 20 points
      const res = await clubkonnectBuyData.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { network: "MTN", plan: "1000.01", phone: "08012345678", pin: "8361" },
      });

      assert(res.status === "success", "Expected data purchase to succeed");
      assert(res.pointsEarned >= 20, `Expected at least 20 pointsEarned, got ${res.pointsEarned}`);

      const uData = (await userRef.get()).data();
      assert(uData.points === res.pointsEarned, `Expected points to match pointsEarned, got ${uData.points}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 6: End-to-end Electricity transaction awards points
  // -------------------------------------------------------------------------
  await runTest("6. End-to-End: clubkonnectPayElectricity awards points", async () => {
    const uid = "test_user_elec_" + Date.now();
    await cleanUser(uid);
    const userRef = db.collection("users").doc(uid);
    await userRef.set({ walletBalance: 50000, points: 0 });

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    const originalFetch = globalThis.fetch;
    const mockFetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes("nellobytesystems.com")) {
        const respObj = {
          status: "ORDER_COMPLETED",
          orderid: `MOCK_CK_${Date.now()}`,
          statuscode: "100",
          msg: "Transaction Successful",
          token: "1234-5678-9012",
        };
        return {
          ok: true,
          status: 200,
          json: async () => respObj,
          text: async () => JSON.stringify(respObj),
        };
      }
      return originalFetch(url, options);
    };

    try {
      globalThis.fetch = mockFetch;
      // ₦5,000 Electricity -> 100 points
      const res = await clubkonnectPayElectricity.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { company: "01", meterNo: "12345678901", amount: 5000, pin: "8361" },
      });

      assert(res.status === "success", "Expected electricity payment to succeed");
      assert(res.pointsEarned === 100, `Expected 100 pointsEarned, got ${res.pointsEarned}`);

      const uData = (await userRef.get()).data();
      assert(uData.points === 100, `Expected points 100, got ${uData.points}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 7: End-to-end Cable transaction awards points
  // -------------------------------------------------------------------------
  await runTest("7. End-to-End: clubkonnectPayCable awards points", async () => {
    const uid = "test_user_cable_" + Date.now();
    await cleanUser(uid);
    const userRef = db.collection("users").doc(uid);
    await userRef.set({ walletBalance: 50000, points: 10 });

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    const originalFetch = globalThis.fetch;
    const mockFetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes("nellobytesystems.com")) {
        const respObj = {
          status: "ORDER_COMPLETED",
          orderid: `MOCK_CK_${Date.now()}`,
          statuscode: "100",
          msg: "Transaction Successful",
        };
        return {
          ok: true,
          status: 200,
          json: async () => respObj,
          text: async () => JSON.stringify(respObj),
        };
      }
      return originalFetch(url, options);
    };

    try {
      globalThis.fetch = mockFetch;
      // ₦3,500 Cable -> 70 points
      const res = await clubkonnectPayCable.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { cableTV: "dstv", packageCode: "01", smartCardNo: "1234567890", amount: 3500, pin: "8361" },
      });

      assert(res.status === "success", "Expected cable payment to succeed");
      assert(res.pointsEarned === 70, `Expected 70 pointsEarned, got ${res.pointsEarned}`);

      const uData = (await userRef.get()).data();
      assert(uData.points === 80, `Expected points 80 (10 + 70), got ${uData.points}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 8: Failed transactions award ZERO points
  // -------------------------------------------------------------------------
  await runTest("8. Failed transactions award 0 points", async () => {
    const uid = "test_user_fail_" + Date.now();
    await cleanUser(uid);
    const userRef = db.collection("users").doc(uid);
    await userRef.set({ walletBalance: 10000, points: 50 });

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    // Wrong PIN -> Must fail
    let failed = false;
    try {
      await clubkonnectBuyAirtime.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { network: "MTN", phone: "08012345678", amount: 1000, pin: "9999" },
      });
    } catch (e) {
      failed = true;
    }
    assert(failed, "Expected airtime with wrong PIN to fail");

    const uData = (await userRef.get()).data();
    assert(uData.points === 50, `Points must remain 50, got ${uData.points}`);
    assert(uData.walletBalance === 10000, `Wallet balance must remain 10000, got ${uData.walletBalance}`);
  });

  // -------------------------------------------------------------------------
  // TEST 9: Existing daily streak checkin continues to work
  // -------------------------------------------------------------------------
  await runTest("9. Regression: Existing checkin daily streak points continue working", async () => {
    const uid = "test_user_streak_" + Date.now();
    await cleanUser(uid);
    const userRef = db.collection("users").doc(uid);
    await userRef.set({ points: 10, streak: 0 });

    const res = await checkin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { id: uid },
    });

    assert(res.status === "success", "Expected checkin to succeed");

    const uData = (await userRef.get()).data();
    assert(uData.points === 11, `Expected points to increment by 1 (10 + 1 = 11), got ${uData.points}`);
    assert(uData.streak >= 1, `Expected streak >= 1, got ${uData.streak}`);
  });

  // -------------------------------------------------------------------------
  // TEST 10: Concurrency test: 10 parallel transactions correctly increment points
  // -------------------------------------------------------------------------
  await runTest("10. Concurrency: 10 parallel awards correctly increment aggregate points", async () => {
    const uid = "test_user_conc_" + Date.now();
    await cleanUser(uid);
    await db.collection("users").doc(uid).set({ points: 0 });

    // 10 concurrent transactions of ₦100 each (2 points each -> Total 20 points)
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        awardTransactionPointsCore({
          uid,
          requestId: `concurrent_tx_${i}_${Date.now()}`,
          category: "Airtime",
          amount: 100,
        })
      );
    }

    const results = await Promise.all(promises);
    assert(results.every((r) => r.pointsEarned === 2 && r.awarded === true), "All 10 parallel awards must succeed");

    const uData = (await db.collection("users").doc(uid).get()).data();
    assert(uData.points === 20, `Expected aggregate points to be exactly 20, got ${uData.points}`);

    const ledgerDocs = await db.collection("users").doc(uid).collection("points").get();
    assert(ledgerDocs.size === 10, `Expected 10 ledger documents, got ${ledgerDocs.size}`);
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("PHASE 1 TEST EXECUTION SUMMARY");
  console.log("==================================================================");
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) {
    console.error("❌ Some tests failed!");
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE 1 TESTS PASSED PERFECTLY!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});

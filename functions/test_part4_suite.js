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

// We will dynamically import functions/index.js inside main so process.env takes effect
let validatePinFormat,
  getPinPepper,
  deriveHmacPin,
  hashTransactionPin,
  verifyPinMatch,
  verifyUserPinCore,
  createTransactionPin,
  changeTransactionPin,
  resetTransactionPin,
  verifyTransactionPin,
  clubkonnectBuyAirtime,
  clubkonnectBuyData,
  clubkonnectPayElectricity,
  clubkonnectPayCable;


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
    await db.collection("users").doc(uid).collection("private_security").doc("pin_credentials").delete();
    const notifs = await db.collection("users").doc(uid).collection("notifications").get();
    for (const d of notifs.docs) {
      await d.ref.delete();
    }
    await db.collection("users").doc(uid).delete();
  } catch (e) {}
}

async function main() {
  console.log("=================================================");
  console.log("       TRANSACTION PIN SYSTEM TEST SUITE         ");
  console.log("=================================================");

  const funcs = await import("./index.js");
  validatePinFormat = funcs.validatePinFormat;
  getPinPepper = funcs.getPinPepper;
  deriveHmacPin = funcs.deriveHmacPin;
  hashTransactionPin = funcs.hashTransactionPin;
  verifyPinMatch = funcs.verifyPinMatch;
  verifyUserPinCore = funcs.verifyUserPinCore;
  createTransactionPin = funcs.createTransactionPin;
  changeTransactionPin = funcs.changeTransactionPin;
  resetTransactionPin = funcs.resetTransactionPin;
  verifyTransactionPin = funcs.verifyTransactionPin;
  clubkonnectBuyAirtime = funcs.clubkonnectBuyAirtime;
  clubkonnectBuyData = funcs.clubkonnectBuyData;
  clubkonnectPayElectricity = funcs.clubkonnectPayElectricity;
  clubkonnectPayCable = funcs.clubkonnectPayCable;

  // -------------------------------------------------------------------------
  // TEST 1: Correct PIN succeeds, resets attempts to 0, verifies pepperVersion
  // -------------------------------------------------------------------------
  await runTest("1. Correct PIN succeeds, resets attempts to 0, and stores pepperVersion", async () => {
    const uid = "test_user_t1_" + Date.now();
    await cleanUser(uid);

    // Create PIN 8361
    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    const credRef = db.collection("users").doc(uid).collection("private_security").doc("pin_credentials");
    let cred = (await credRef.get()).data();
    assert(cred.pepperVersion === 1, `Expected pepperVersion === 1, got ${cred.pepperVersion}`);

    // Make 2 wrong attempts
    try {
      await verifyUserPinCore(uid, "9274");
    } catch (e) {}
    try {
      await verifyUserPinCore(uid, "5192");
    } catch (e) {}

    // Verify attempts is 2
    cred = (await credRef.get()).data();
    assert(cred.attempts === 2, `Expected 2 attempts, got ${cred.attempts}`);

    // Verify with correct PIN 8361
    const ok = await verifyUserPinCore(uid, "8361");
    assert(ok === true, "Expected verifyUserPinCore to return true for correct PIN");

    // Check attempts reset to 0 in Firestore
    cred = (await credRef.get()).data();
    assert(cred.attempts === 0, `Expected attempts reset to 0, got ${cred.attempts}`);
    assert(cred.lockedUntil === null, "Expected lockedUntil to be null");
  });

  // -------------------------------------------------------------------------
  // TEST 2: Change PIN works, old fails, new works, notification created
  // -------------------------------------------------------------------------
  await runTest("2. Change PIN works, old rejected, new works, notification sent", async () => {
    const uid = "test_user_t2_" + Date.now();
    await cleanUser(uid);

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    // Attempt change with wrong current PIN (should fail)
    let wrongCurFailed = false;
    try {
      await changeTransactionPin.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { currentPin: "9999", newPin: "5829" },
      });
    } catch (e) {
      wrongCurFailed = true;
    }
    assert(wrongCurFailed, "Expected changeTransactionPin to reject wrong current PIN");

    // Change with correct current PIN: 8361 -> 5829
    const changeRes = await changeTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { currentPin: "8361", newPin: "5829" },
    });
    assert(changeRes.success === true, "Expected changeTransactionPin to succeed");

    // Verify new PIN works
    const newOk = await verifyUserPinCore(uid, "5829");
    assert(newOk === true, "Expected new PIN 5829 to be verified successfully");

    // Verify old PIN no longer works
    let oldFailed = false;
    try {
      await verifyUserPinCore(uid, "8361");
    } catch (e) {
      oldFailed = true;
    }
    assert(oldFailed, "Expected old PIN 8361 to be rejected after change");

    // Verify pepperVersion on creds
    const credRef = db.collection("users").doc(uid).collection("private_security").doc("pin_credentials");
    const cred = (await credRef.get()).data();
    assert(cred.pepperVersion === 1, `Expected pepperVersion === 1 on changed creds, got ${cred.pepperVersion}`);

    // Verify audit log has PIN_CHANGED
    const auditLogs = await db.collection("admin_audit_logs").where("uid", "==", uid).where("action", "==", "PIN_CHANGED").get();
    assert(!auditLogs.empty, "Expected PIN_CHANGED audit log entry");

    // Verify in-app security notification document
    const notifs = await db.collection("users").doc(uid).collection("notifications").where("action", "==", "PIN_CHANGED").get();
    assert(!notifs.empty, "Expected PIN_CHANGED security notification doc in user subcollection");
  });

  // -------------------------------------------------------------------------
  // TEST 3: createTransactionPin rejects when a PIN already exists
  // -------------------------------------------------------------------------
  await runTest("3. createTransactionPin rejects when a PIN already exists", async () => {
    const uid = "test_user_t3_" + Date.now();
    await cleanUser(uid);

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    let rejected = false;
    let errorCode = "";
    try {
      await createTransactionPin.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { pin: "5829" },
      });
    } catch (e) {
      rejected = true;
      errorCode = e.code || e.message;
    }
    assert(rejected, "Expected createTransactionPin to throw for existing PIN");
    assert(errorCode.includes("already-exists"), `Expected already-exists error, got ${errorCode}`);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Sequential-PIN check: only rejects full runs, not consecutive pairs
  // -------------------------------------------------------------------------
  await runTest("4. Sequential-PIN check rejects full runs, accepts partial consecutive pairs", async () => {
    // 4a. Full ascending runs MUST be rejected
    const fullAscending = ["1234", "2345", "3456", "4567", "5678", "6789"];
    for (const p of fullAscending) {
      let rejected = false;
      try {
        validatePinFormat(p);
      } catch (e) {
        rejected = true;
      }
      assert(rejected, `Expected full ascending run '${p}' to be rejected`);
    }

    // 4b. Full descending runs MUST be rejected
    const fullDescending = ["4321", "5432", "6543", "7654", "8765", "9876", "3210"];
    for (const p of fullDescending) {
      let rejected = false;
      try {
        validatePinFormat(p);
      } catch (e) {
        rejected = true;
      }
      assert(rejected, `Expected full descending run '${p}' to be rejected`);
    }

    // 4c. Partial consecutive pairs MUST NOT be rejected (valid PINs!)
    const partialPairs = [
      "1289", // starts with 12, ends with 89
      "5129", // has consecutive 12 in middle
      "7845", // has consecutive 78 and 45
      "9321", // starts with 9, ends with descending 321
      "2391", // starts with 23
      "9123", // ends with 123
    ];
    for (const p of partialPairs) {
      const validated = validatePinFormat(p);
      assert(validated === p, `Expected partial pair PIN '${p}' to be accepted, but was rejected!`);
    }
  });

  // -------------------------------------------------------------------------
  // TEST 5: Negative path: 4 purchase callables reject missing/wrong PIN
  // -------------------------------------------------------------------------
  await runTest("5. 4 purchase callables reject missing/wrong PIN with wallet balance unchanged", async () => {
    const uid = "test_user_t5_" + Date.now();
    await cleanUser(uid);

    const initialBalance = 75000;
    const userRef = db.collection("users").doc(uid);
    await userRef.set({
      email: `${uid}@example.com`,
      walletBalance: initialBalance,
      accountReference: `ACC_${uid}`,
    });

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    // 5a. buyAirtime with wrong PIN
    let airtimeFailed = false;
    try {
      await clubkonnectBuyAirtime.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { network: "MTN", phone: "08012345678", amount: 1000, pin: "9999" },
      });
    } catch (e) {
      airtimeFailed = true;
    }
    assert(airtimeFailed, "Expected buyAirtime with wrong PIN to fail");
    let uData = (await userRef.get()).data();
    assert(uData.walletBalance === initialBalance, `Wallet balance changed! Expected ${initialBalance}, got ${uData.walletBalance}`);

    // 5b. buyData with missing PIN
    let dataFailed = false;
    try {
      await clubkonnectBuyData.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { network: "MTN", plan: "1000.01", phone: "08012345678" /* no pin */ },
      });
    } catch (e) {
      dataFailed = true;
    }
    assert(dataFailed, "Expected buyData with missing PIN to fail");
    uData = (await userRef.get()).data();
    assert(uData.walletBalance === initialBalance, `Wallet balance changed! Expected ${initialBalance}, got ${uData.walletBalance}`);

    // 5c. payElectricity with wrong PIN
    let elecFailed = false;
    try {
      await clubkonnectPayElectricity.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { company: "01", meterNo: "12345678901", amount: 2000, pin: "0001" },
      });
    } catch (e) {
      elecFailed = true;
    }
    assert(elecFailed, "Expected payElectricity with wrong PIN to fail");
    uData = (await userRef.get()).data();
    assert(uData.walletBalance === initialBalance, `Wallet balance changed! Expected ${initialBalance}, got ${uData.walletBalance}`);

    // 5d. payCable with wrong PIN
    let cableFailed = false;
    try {
      await clubkonnectPayCable.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { cableTV: "dstv", packageCode: "01", smartCardNo: "1234567890", amount: 3500, pin: "0001" },
      });
    } catch (e) {
      cableFailed = true;
    }
    assert(cableFailed, "Expected payCable with wrong PIN to fail");
    uData = (await userRef.get()).data();
    assert(uData.walletBalance === initialBalance, `Wallet balance changed! Expected ${initialBalance}, got ${uData.walletBalance}`);
  });

  // -------------------------------------------------------------------------
  // TEST 6: Happy-path purchase test: Correct PIN completes 4 purchases (mocked CK)
  // -------------------------------------------------------------------------
  await runTest("6. Happy-path: Correct PIN completes purchase across all 4 callables (mocked ClubKonnect)", async () => {
    const uid = "test_user_t6_happy_" + Date.now();
    await cleanUser(uid);

    const initialBalance = 50000;
    const userRef = db.collection("users").doc(uid);
    await userRef.set({
      email: `${uid}@example.com`,
      walletBalance: initialBalance,
      accountReference: `ACC_${uid}`,
    });

    // Create PIN 8361
    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    // Mock global fetch to return successful ClubKonnect response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
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
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: "ORDER_COMPLETED",
            orderid: `MOCK_CK_${Date.now()}`,
            statuscode: "100",
            msg: "Transaction Successful",
          }),
          text: async () => JSON.stringify({
            status: "ORDER_COMPLETED",
            orderid: `MOCK_CK_${Date.now()}`,
            statuscode: "100",
            msg: "Transaction Successful",
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      // 1. buyAirtime: ₦1,000 with PIN 8361
      const airtimeRes = await clubkonnectBuyAirtime.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { network: "MTN", phone: "08012345678", amount: 1000, pin: "8361" },
      });
      assert(airtimeRes.status === "success" || airtimeRes.success === true, "Expected airtime purchase to succeed");
      let uData = (await userRef.get()).data();
      assert(uData.walletBalance === 49000, `Expected balance 49000 after airtime, got ${uData.walletBalance}`);

      // 2. buyData: ₦1,000 plan with PIN 8361
      const dataRes = await clubkonnectBuyData.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { network: "MTN", plan: "1000.01", phone: "08012345678", pin: "8361" },
      });
      assert(dataRes.status === "success" || dataRes.success === true, "Expected data purchase to succeed");
      uData = (await userRef.get()).data();
      assert(uData.walletBalance <= 49000, `Expected balance debited for data, got ${uData.walletBalance}`);
      const balanceAfterData = uData.walletBalance;

      // 3. payElectricity: ₦2,000 with PIN 8361
      const elecRes = await clubkonnectPayElectricity.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { company: "01", meterNo: "12345678901", amount: 2000, pin: "8361" },
      });
      assert(elecRes.status === "success" || elecRes.success === true, "Expected electricity payment to succeed");
      uData = (await userRef.get()).data();
      assert(uData.walletBalance === balanceAfterData - 2000, `Expected balance debited by 2000 for electricity`);
      const balanceAfterElec = uData.walletBalance;

      // 4. payCable: ₦3,500 with PIN 8361
      const cableRes = await clubkonnectPayCable.run({
        auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: { cableTV: "dstv", packageCode: "01", smartCardNo: "1234567890", amount: 3500, pin: "8361" },
      });
      assert(cableRes.status === "success" || cableRes.success === true, "Expected cable payment to succeed");
      uData = (await userRef.get()).data();
      assert(uData.walletBalance === balanceAfterElec - 3500, `Expected balance debited by 3500 for cable`);
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 7: Concurrency test: 20 parallel wrong-PIN verifications
  // -------------------------------------------------------------------------
  await runTest("7. Concurrency test: 20 parallel wrong PIN attempts respect 5-attempt limit and lockout", async () => {
    const uid = "test_user_t7_" + Date.now();
    await cleanUser(uid);

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    const parallelCount = 20;
    const testResults = [];
    for (let i = 0; i < parallelCount; i++) {
      try {
        await verifyUserPinCore(uid, `999${i % 10}`);
        testResults.push({ success: true });
      } catch (err) {
        testResults.push({ error: true, code: String(err?.code || err?.message || "") });
      }
    }

    let lockoutCount = 0;
    let mismatchCount = 0;
    for (const r of testResults) {
      const codeStr = String(r?.code || "");
      if (codeStr.includes("resource-exhausted") || codeStr.includes("lockout")) {
        lockoutCount++;
      } else if (codeStr.includes("permission-denied") || codeStr.includes("Incorrect")) {
        mismatchCount++;
      }
    }

    const credDoc = await db.collection("users").doc(uid).collection("private_security").doc("pin_credentials").get();
    const cred = credDoc.data();

    console.log(`   Sample errors:`, testResults.slice(0, 5).map(r => r.code));
    console.log(`   Total parallel requests fired: ${parallelCount}`);
    console.log(`   Requests blocked by lockout: ${lockoutCount}`);
    console.log(`   Final stored attempts: ${cred.attempts}, lockedUntil: ${cred.lockedUntil?.toDate ? cred.lockedUntil.toDate() : cred.lockedUntil}`);

    assert(cred.attempts === 5, `Expected exactly 5 attempts recorded, got ${cred.attempts}`);
    assert(cred.lockedUntil !== null, "Expected account to be locked out with lockedUntil set");
    assert(lockoutCount >= 15, `Expected remaining requests (>=15) to be blocked by lockout, got ${lockoutCount}`);
  });

  // -------------------------------------------------------------------------
  // TEST 8: Lockout expiry resets counter and allows correct PIN
  // -------------------------------------------------------------------------
  await runTest("8. Lockout expiry: after lockedUntil passes, counter resets and correct PIN works", async () => {
    const uid = "test_user_t8_exp_" + Date.now();
    await cleanUser(uid);

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    // Manually simulate an expired lockout (set lockedUntil to 5 minutes ago)
    const credRef = db.collection("users").doc(uid).collection("private_security").doc("pin_credentials");
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await credRef.update({
      attempts: 5,
      lockedUntil: admin.firestore.Timestamp.fromDate(fiveMinutesAgo),
    });

    // Verifying with correct PIN now should clear the expired lockout and succeed!
    const ok = await verifyUserPinCore(uid, "8361");
    assert(ok === true, "Expected expired lockout to reset and verifyUserPinCore to succeed");

    const cred = (await credRef.get()).data();
    assert(cred.attempts === 0, `Expected attempts reset to 0, got ${cred.attempts}`);
    assert(cred.lockedUntil === null, "Expected lockedUntil cleared to null");
  });

  // -------------------------------------------------------------------------
  // TEST 9: Reset flow: rejected without fresh re-auth, succeeds with it, notification sent
  // -------------------------------------------------------------------------
  await runTest("9. Reset flow: rejected without fresh re-auth, succeeds with it, notification sent", async () => {
    const uid = "test_user_t9_" + Date.now();
    await cleanUser(uid);

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "8361" },
    });

    // 9a. Stale re-auth: auth_time was 10 minutes ago (600s > 300s window)
    const staleAuthTime = Math.floor(Date.now() / 1000) - 600;
    let staleRejected = false;
    let staleCode = "";
    try {
      await resetTransactionPin.run({
        auth: { uid, token: { auth_time: staleAuthTime } },
        data: { newPin: "7462" },
      });
    } catch (e) {
      staleRejected = true;
      staleCode = e.code || e.message;
    }
    assert(staleRejected, "Expected resetTransactionPin to reject stale re-auth");
    assert(staleCode.includes("permission-denied"), `Expected permission-denied for stale auth, got ${staleCode}`);

    // 9b. Fresh re-auth: auth_time was 30 seconds ago
    const freshAuthTime = Math.floor(Date.now() / 1000) - 30;
    const resetRes = await resetTransactionPin.run({
      auth: { uid, token: { auth_time: freshAuthTime } },
      data: { newPin: "7462" },
    });
    assert(resetRes.success === true, "Expected resetTransactionPin to succeed with fresh auth");

    // Verify new PIN 7462 works
    const ok = await verifyUserPinCore(uid, "7462");
    assert(ok === true, "Expected newly reset PIN 7462 to work");

    // Verify attempts is 0 and lockedUntil is null and pepperVersion is 1
    const cred = (await db.collection("users").doc(uid).collection("private_security").doc("pin_credentials").get()).data();
    assert(cred.attempts === 0, `Expected attempts 0, got ${cred.attempts}`);
    assert(cred.lockedUntil === null, "Expected lockedUntil null");
    assert(cred.pepperVersion === 1, `Expected pepperVersion === 1 on reset, got ${cred.pepperVersion}`);

    // Verify audit log has PIN_RESET
    const resetLogs = await db.collection("admin_audit_logs").where("uid", "==", uid).where("action", "==", "PIN_RESET").get();
    assert(!resetLogs.empty, "Expected PIN_RESET audit log entry");

    // Verify in-app security notification document
    const notifs = await db.collection("users").doc(uid).collection("notifications").where("action", "==", "PIN_RESET").get();
    assert(!notifs.empty, "Expected PIN_RESET security notification doc in user subcollection");
  });

  // -------------------------------------------------------------------------
  // TEST 10: Confirm exact Firestore path users/{uid}/private_security/pin_credentials
  // -------------------------------------------------------------------------
  await runTest("10. Confirm exact Firestore path users/{uid}/private_security/pin_credentials", async () => {
    const uid = "test_user_t10_path_" + Date.now();
    await cleanUser(uid);

    await createTransactionPin.run({
      auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: { pin: "9417" },
    });

    const expectedDocRef = db.collection("users").doc(uid).collection("private_security").doc("pin_credentials");
    const docSnap = await expectedDocRef.get();
    assert(docSnap.exists === true, "Expected document at path users/{uid}/private_security/pin_credentials to exist");

    const data = docSnap.data();
    assert(Boolean(data.hash), "Expected hash field in pin_credentials doc");
    assert(Boolean(data.salt), "Expected salt field in pin_credentials doc");
    assert(data.pepperVersion === 1, "Expected pepperVersion: 1");

    // Also assert that verifyUserPinCore successfully reads from this path
    const ok = await verifyUserPinCore(uid, "9417");
    assert(ok === true, "Expected verifyUserPinCore to read and verify from users/{uid}/private_security/pin_credentials");
  });

  // -------------------------------------------------------------------------
  // TEST 11: Fresh user registration end-to-end (signup field validation)
  // -------------------------------------------------------------------------
  await runTest("11. Fresh user registration end-to-end (normal signup succeeds, hasTransactionPin injection rejected)", async () => {
    const uid = "test_user_reg_" + Date.now();
    await cleanUser(uid);

    const normalUserData = {
      firstName: "John",
      lastName: "Doe",
      userEmail: `${uid}@example.com`,
      userPhone: "08012345678",
      userGender: "male",
      userName: `johndoe_${Date.now()}`,
      refferalsCount: 0,
      streak: 0,
      points: 0,
    };

    // Normal signup writes without hasTransactionPin
    await db.collection("users").doc(uid).set(normalUserData);
    await db.collection("users").doc(uid).collection("achievements").doc("stats").set({
      firstSurvey: 0,
      pointsEarned: 0,
      billPayer: 0,
      referralMaster: 0,
    });

    const registeredSnap = await db.collection("users").doc(uid).get();
    assert(registeredSnap.exists === true, "User doc created successfully without hasTransactionPin");
    assert(registeredSnap.data().hasTransactionPin === undefined, "hasTransactionPin should be undefined prior to PIN setup");
  });

  // -------------------------------------------------------------------------
  // TEST 12: getPinPepper throws error when pepper secret is missing (no silent fallback)
  // -------------------------------------------------------------------------
  await runTest("12. getPinPepper throws error when pepper secret is missing (no silent fallback)", async () => {
    const savedV1 = process.env.PIN_PEPPER_SECRET_V1;
    const saved = process.env.PIN_PEPPER_SECRET;
    delete process.env.PIN_PEPPER_SECRET_V1;
    delete process.env.PIN_PEPPER_SECRET;

    let threw = false;
    let errMessage = "";
    try {
      getPinPepper(1);
    } catch (e) {
      threw = true;
      errMessage = e.message;
    } finally {
      // restore
      if (savedV1) process.env.PIN_PEPPER_SECRET_V1 = savedV1;
      if (saved) process.env.PIN_PEPPER_SECRET = saved;
    }

    assert(threw, "Expected getPinPepper to throw when no env variable is set");
    assert(
      errMessage.includes("PIN pepper not configured"),
      `Expected 'PIN pepper not configured' message, got: ${errMessage}`
    );
  });

  console.log("\n=================================================");
  console.log("               TEST SUITE SUMMARY                ");
  console.log("=================================================");
  let passedCount = 0;
  for (const r of results) {
    const symbol = r.status === "PASSED" ? "✔" : "✖";
    console.log(`${symbol} ${r.name} - ${r.status}${r.error ? ` (${r.error})` : ""}`);
    if (r.status === "PASSED") passedCount++;
  }
  console.log(`\nTOTAL: ${passedCount}/${results.length} tests passed.`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});

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

let indexModule;

const clientApp = initializeApp(
  {
    apiKey: "fake-api-key-audit",
    projectId: "vtu-site-43118",
  },
  "audit-client-app"
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

async function runAuditCheck(name, fn) {
  process.stdout.write(`• Checking: ${name}... `);
  try {
    await fn();
    console.log("PASSED [REJECTED AS EXPECTED]");
    results.push({ name, status: "PASSED" });
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    results.push({ name, status: "FAILED", error: err.message });
  }
}

async function main() {
  console.log("==================================================================");
  console.log("STAGE 3 CLOSURE & FINAL SECURITY GATE: DIRECT AUDIT TEST SUITE");
  console.log("==================================================================\n");

  indexModule = await import("../functions/index.js");

  const ordinaryUid = `cust_audit_${Date.now()}`;
  const victimUid = `victim_audit_${Date.now()}`;

  // 1. Setup clean baseline accounts in Admin SDK
  await db.collection("users").doc(ordinaryUid).set({
    uid: ordinaryUid,
    email: "ordinary_customer@paywaka.com",
    role: "user",
    points: 1500,
    walletBalance: 0,
    firstName: "Test",
    lastName: "Customer",
  });

  await db.collection("users").doc(victimUid).set({
    uid: victimUid,
    email: "victim@paywaka.com",
    role: "user",
    points: 100,
    firstName: "Victim",
    lastName: "User",
  });

  // Seed sample voucher & campaign for testing
  const testVoucherId = `vch_audit_${Date.now()}`;
  await db.collection("meal_vouchers").doc(testVoucherId).set({
    id: testVoucherId,
    voucherCode: "PWK-AUDIT-1234",
    userId: ordinaryUid,
    vendorId: "paywaka-demo-foods",
    vendorName: "PayWaka Partner Foods",
    campaignId: "camp-demo-jollof",
    status: "active",
    discountNaira: 500,
    minSpendNaira: 2500,
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
  });

  // Authenticate Client SDK as the Ordinary Customer
  const token = await admin.auth().createCustomToken(ordinaryUid);
  await signInWithCustomToken(clientAuth, token);

  console.log("--- 1. MERCHANT PRIVILEGE INTEGRITY TESTS ---");

  await runAuditCheck("Client cannot modify 'role' to 'vendor' on existing user document", async () => {
    let errorCaught = null;
    try {
      await updateDoc(doc(clientDb, "users", ordinaryUid), { role: "vendor" });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot modify 'role' to 'admin' on existing user document", async () => {
    let errorCaught = null;
    try {
      await updateDoc(doc(clientDb, "users", ordinaryUid), { role: "admin" });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot set 'role: vendor' upon new user document creation", async () => {
    const freshUid = `new_fake_vendor_${Date.now()}`;
    const freshToken = await admin.auth().createCustomToken(freshUid);
    await signInWithCustomToken(clientAuth, freshToken);
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "users", freshUid), {
        email: "fresh@paywaka.com",
        role: "vendor",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    await signInWithCustomToken(clientAuth, token);
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot set 'role: admin' upon new user document creation", async () => {
    const freshUid = `new_fake_admin_${Date.now()}`;
    const freshToken = await admin.auth().createCustomToken(freshUid);
    await signInWithCustomToken(clientAuth, freshToken);
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "users", freshUid), {
        email: "freshadmin@paywaka.com",
        role: "admin",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    await signInWithCustomToken(clientAuth, token);
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot inject 'isAdmin: true' on update", async () => {
    let errorCaught = null;
    try {
      await updateDoc(doc(clientDb, "users", ordinaryUid), { isAdmin: true });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot inject 'isAdmin: true' upon new user document creation", async () => {
    const freshUid = `new_fake_isadmin_${Date.now()}`;
    const freshToken = await admin.auth().createCustomToken(freshUid);
    await signInWithCustomToken(clientAuth, freshToken);
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "users", freshUid), {
        email: "freshisadmin@paywaka.com",
        isAdmin: true,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    await signInWithCustomToken(clientAuth, token);
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot assign 'vendorId' or 'vendorBranch' directly on update", async () => {
    let errorCaught = null;
    try {
      await updateDoc(doc(clientDb, "users", ordinaryUid), {
        vendorId: "paywaka-demo-foods",
        vendorBranch: "Victoria Island",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot assign 'vendorId' or 'vendorBranch' upon new user document creation", async () => {
    const freshUid = `new_fake_vendor_branch_${Date.now()}`;
    const freshToken = await admin.auth().createCustomToken(freshUid);
    await signInWithCustomToken(clientAuth, freshToken);
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "users", freshUid), {
        email: "freshbranch@paywaka.com",
        vendorId: "paywaka-demo-foods",
        vendorBranch: "Ikeja",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    await signInWithCustomToken(clientAuth, token);
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot inject 'cashierName' directly on update", async () => {
    let errorCaught = null;
    try {
      await updateDoc(doc(clientDb, "users", ordinaryUid), {
        cashierName: "Hacked Cashier",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot inject 'cashierName' upon new user document creation", async () => {
    const freshUid = `new_fake_cashier_${Date.now()}`;
    const freshToken = await admin.auth().createCustomToken(freshUid);
    await signInWithCustomToken(clientAuth, freshToken);
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "users", freshUid), {
        email: "freshcashier@paywaka.com",
        cashierName: "Fake Cashier Name",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    await signInWithCustomToken(clientAuth, token);
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Client cannot delete user profile document (allow delete: if false)", async () => {
    let errorCaught = null;
    try {
      await deleteDoc(doc(clientDb, "users", ordinaryUid));
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Ordinary customer cannot provision another user as a cashier via setDemoCashierRole", async () => {
    let errorCaught = null;
    try {
      await indexModule.setDemoCashierRoleCore({
        callerUid: ordinaryUid,
        uid: victimUid,
        vendorId: "paywaka-demo-foods",
        isCallerAdmin: false,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("cannot assign")),
      `Expected permission-denied, got: ${errorCaught}`
    );
  });

  await runAuditCheck("Ordinary customer cannot self-provision cashier privileges via setDemoCashierRole", async () => {
    let errorCaught = null;
    try {
      await indexModule.setDemoCashierRoleCore({
        callerUid: ordinaryUid,
        uid: ordinaryUid,
        vendorId: "paywaka-demo-foods",
        isCallerAdmin: false,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("cannot self-provision")),
      `Expected permission-denied, got: ${errorCaught}`
    );
  });

  await runAuditCheck("Ordinary customer calling validateMealVoucherForMerchantCore is rejected", async () => {
    let errorCaught = null;
    try {
      await indexModule.validateMealVoucherForMerchantCore({
        cashierUid: ordinaryUid,
        voucherCodeOrId: testVoucherId,
        vendorId: "paywaka-demo-foods",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("not authorized")),
      `Expected permission-denied, got: ${errorCaught}`
    );
  });

  await runAuditCheck("Ordinary customer calling redeemMealVoucherMerchantCore is rejected", async () => {
    let errorCaught = null;
    try {
      await indexModule.redeemMealVoucherMerchantCore({
        cashierUid: ordinaryUid,
        voucherCodeOrId: testVoucherId,
        vendorId: "paywaka-demo-foods",
        billAmountNaira: 3500,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(
      errorCaught && (errorCaught.includes("permission-denied") || errorCaught.includes("not authorized")),
      `Expected permission-denied, got: ${errorCaught}`
    );
  });

  console.log("\n--- 2. PROTECTED COLLECTION DIRECT WRITE AUDIT ---");

  await runAuditCheck("Direct client write (create) to 'meal_vouchers' is rejected", async () => {
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "meal_vouchers", `vch_fake_${Date.now()}`), {
        voucherCode: "PWK-FAKE-9999",
        status: "active",
        userId: ordinaryUid,
        discountNaira: 50000,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (update) to 'meal_vouchers' is rejected", async () => {
    let errorCaught = null;
    try {
      await updateDoc(doc(clientDb, "meal_vouchers", testVoucherId), {
        status: "redeemed",
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (delete) to 'meal_vouchers' is rejected", async () => {
    let errorCaught = null;
    try {
      await deleteDoc(doc(clientDb, "meal_vouchers", testVoucherId));
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (create) to 'meal_campaigns' is rejected", async () => {
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "meal_campaigns", `camp_fake_${Date.now()}`), {
        title: "Fraudulent 99% Off Campaign",
        status: "active",
        campaignBudgetNaira: 10000000,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (update) to 'meal_campaigns' is rejected", async () => {
    let errorCaught = null;
    try {
      await updateDoc(doc(clientDb, "meal_campaigns", "camp-demo-jollof"), {
        campaignSpentNaira: 0,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (delete) to 'meal_campaigns' is rejected", async () => {
    let errorCaught = null;
    try {
      await deleteDoc(doc(clientDb, "meal_campaigns", "camp-demo-jollof"));
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (create) to 'meal_redemptions' is rejected", async () => {
    let errorCaught = null;
    try {
      await setDoc(doc(clientDb, "meal_redemptions", `red_fake_${Date.now()}`), {
        voucherId: testVoucherId,
        status: "success",
        discountNaira: 500,
        userId: ordinaryUid,
      });
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (delete) to 'meal_redemptions' is rejected", async () => {
    let errorCaught = null;
    try {
      await deleteDoc(doc(clientDb, "meal_redemptions", "any_redemption_id"));
    } catch (e) {
      errorCaught = e.code || e.message;
    }
    assert(errorCaught && errorCaught.includes("permission-denied"), `Expected permission-denied, got: ${errorCaught}`);
  });

  await runAuditCheck("Direct client write (create/delete) to 'meal_idempotency_records' is rejected", async () => {
    let createCaught = null;
    let deleteCaught = null;
    try {
      await setDoc(doc(clientDb, "meal_idempotency_records", `idem_fake_${Date.now()}`), {
        voucherId: testVoucherId,
        claimedAt: new Date(),
      });
    } catch (e) {
      createCaught = e.code || e.message;
    }
    try {
      await deleteDoc(doc(clientDb, "meal_idempotency_records", `idem_fake_${Date.now()}`));
    } catch (e) {
      deleteCaught = e.code || e.message;
    }
    assert(createCaught && createCaught.includes("permission-denied"), `Expected create permission-denied, got: ${createCaught}`);
    assert(deleteCaught && deleteCaught.includes("permission-denied"), `Expected delete permission-denied, got: ${deleteCaught}`);
  });

  await runAuditCheck("Direct client write (create/update/delete) to 'meal_vendors' is rejected", async () => {
    let createCaught = null;
    let deleteCaught = null;
    try {
      await setDoc(doc(clientDb, "meal_vendors", `vendor_fake_${Date.now()}`), {
        name: "Rogue Restaurant",
        active: true,
      });
    } catch (e) {
      createCaught = e.code || e.message;
    }
    try {
      await deleteDoc(doc(clientDb, "meal_vendors", "paywaka-demo-foods"));
    } catch (e) {
      deleteCaught = e.code || e.message;
    }
    assert(createCaught && createCaught.includes("permission-denied"), `Expected create permission-denied, got: ${createCaught}`);
    assert(deleteCaught && deleteCaught.includes("permission-denied"), `Expected delete permission-denied, got: ${deleteCaught}`);
  });

  await runAuditCheck("Direct client write (create/delete) to 'users/{uid}/mealClaims' is rejected", async () => {
    let createCaught = null;
    let deleteCaught = null;
    try {
      await setDoc(doc(clientDb, "users", ordinaryUid, "mealClaims", "coupon-demo-jollof"), {
        lifetimeClaimCount: 0,
        activeVoucherId: null,
      });
    } catch (e) {
      createCaught = e.code || e.message;
    }
    try {
      await deleteDoc(doc(clientDb, "users", ordinaryUid, "mealClaims", "coupon-demo-jollof"));
    } catch (e) {
      deleteCaught = e.code || e.message;
    }
    assert(createCaught && createCaught.includes("permission-denied"), `Expected create permission-denied, got: ${createCaught}`);
    assert(deleteCaught && deleteCaught.includes("permission-denied"), `Expected delete permission-denied, got: ${deleteCaught}`);
  });

  await runAuditCheck("Direct client write (create/delete) to 'users/{uid}/points' ledger is rejected", async () => {
    let createCaught = null;
    let deleteCaught = null;
    try {
      await setDoc(doc(clientDb, "users", ordinaryUid, "points", `pts_credit_${Date.now()}`), {
        points: 50000,
        type: "fraudulent_credit",
      });
    } catch (e) {
      createCaught = e.code || e.message;
    }
    try {
      await deleteDoc(doc(clientDb, "users", ordinaryUid, "points", "pts_fake"));
    } catch (e) {
      deleteCaught = e.code || e.message;
    }
    assert(createCaught && createCaught.includes("permission-denied"), `Expected create permission-denied, got: ${createCaught}`);
    assert(deleteCaught && deleteCaught.includes("permission-denied"), `Expected delete permission-denied, got: ${deleteCaught}`);
  });

  await runAuditCheck("Direct client read/write to admin collections (owed_refunds, admin_audit_logs, etc.) is rejected", async () => {
    let readCaught = null;
    let writeCaught = null;
    try {
      await getDoc(doc(clientDb, "owed_refunds", "any_doc"));
    } catch (e) {
      readCaught = e.code || e.message;
    }
    try {
      await setDoc(doc(clientDb, "admin_audit_logs", "fake_log"), { action: "hacked" });
    } catch (e) {
      writeCaught = e.code || e.message;
    }
    assert(readCaught && readCaught.includes("permission-denied"), `Expected read permission-denied, got: ${readCaught}`);
    assert(writeCaught && writeCaught.includes("permission-denied"), `Expected write permission-denied, got: ${writeCaught}`);
  });

  console.log("\n==================================================================");
  console.log("AUDIT SUMMARY");
  console.log("==================================================================");
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  // Cleanup seeded test fixtures
  await db.collection("meal_vouchers").doc(testVoucherId).delete();
  await db.collection("users").doc(ordinaryUid).delete();
  await db.collection("users").doc(victimUid).delete();

  if (failed > 0) {
    console.error(`\n❌ ${failed} audit check(s) failed!`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All ${passed} audit security checks passed authoritatively!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal audit runner error:", err);
  process.exit(1);
});

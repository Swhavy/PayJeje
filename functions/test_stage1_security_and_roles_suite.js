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
  collectionGroup,
  query,
  where,
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
  "client-stage1-rules-app"
);

const clientDb = getFirestore(clientApp);
connectFirestoreEmulator(clientDb, "127.0.0.1", 8085);

const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });

let setDemoCashierRoleCore;
let verifyVendorAuthorizationCore;
let validateMealVoucherForMerchantCore;
let redeemMealVoucherMerchantCore;
let redeemMealCouponCore;

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
  try {
    await admin.auth().deleteUser(uid);
  } catch (e) {}

  await admin.auth().createUser({
    uid,
    email: `${uid}@stage1.test`,
  });

  if (Object.keys(customClaims).length > 0) {
    await admin.auth().setCustomUserClaims(uid, customClaims);
  }

  const customToken = await admin.auth().createCustomToken(uid, customClaims);
  const userCredential = await signInWithCustomToken(clientAuth, customToken);
  return userCredential.user;
}

async function main() {
  console.log("==================================================================");
  console.log("STAGE 1 TEST SUITE: RULES LOCKDOWN & VENDOR ROLE MODEL HARDENING");
  console.log("==================================================================");

  const indexModule = await import("./index.js");
  setDemoCashierRoleCore = indexModule.setDemoCashierRoleCore;
  verifyVendorAuthorizationCore = indexModule.verifyVendorAuthorizationCore;
  validateMealVoucherForMerchantCore = indexModule.validateMealVoucherForMerchantCore;
  redeemMealVoucherMerchantCore = indexModule.redeemMealVoucherMerchantCore;
  redeemMealCouponCore = indexModule.redeemMealCouponCore;

  const testVendorA = "vendor-stage1-a";
  const testVendorB = "vendor-stage1-b";
  const testRedemptionId = `red_stage1_${Date.now()}`;

  // Pre-seed an authoritative redemption document using Admin SDK
  await db.collection("meal_redemptions").doc(testRedemptionId).set({
    id: testRedemptionId,
    redemptionReference: "PWK-RED-STAGE1",
    voucherId: "vch_stage1_001",
    voucherCode: "PWK-STG1-0001",
    userId: "usr_customer_stage1",
    vendorId: testVendorA,
    vendorName: "Stage 1 Delicacies",
    vendorBranch: "Victoria Island",
    cashierUid: "usr_cashier_stage1",
    cashierName: "Cashier Stage1",
    billAmountNaira: 3500,
    discountNaira: 500,
    finalPayableNaira: 3000,
    status: "completed",
    idempotencyKey: `idem_stg1_${Date.now()}`,
    redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // -------------------------------------------------------------------------
  // SECTION 1: FIRESTORE RULES LOCKDOWN FOR meal_redemptions
  // -------------------------------------------------------------------------

  await runTest("1. Rules Lockdown: Unauthenticated client read of meal_redemptions is DENIED", async () => {
    await signOut(clientAuth).catch(() => {});
    try {
      await getDoc(doc(clientDb, "meal_redemptions", testRedemptionId));
      assert(false, "Expected permission-denied for unauthenticated getDoc on meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("2. Rules Lockdown: Regular customer client read of meal_redemptions is DENIED", async () => {
    const custUid = `usr_cust_rules_${Date.now()}`;
    await authenticateClient(custUid, { role: "user" });
    try {
      await getDoc(doc(clientDb, "meal_redemptions", testRedemptionId));
      assert(false, "Expected permission-denied for customer client on meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("3. Rules Lockdown: Vendor client read of meal_redemptions is DENIED (no direct client reads)", async () => {
    const vendorUid = `usr_vnd_rules_${Date.now()}`;
    await authenticateClient(vendorUid, { role: "vendor", vendorId: testVendorA });
    try {
      await getDoc(doc(clientDb, "meal_redemptions", testRedemptionId));
      assert(false, "Expected permission-denied for vendor client on meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("4. Rules Lockdown: Admin client read of meal_redemptions is DENIED (server-only ledger)", async () => {
    const adminUid = `usr_adm_rules_${Date.now()}`;
    await authenticateClient(adminUid, { role: "admin", admin: true });
    try {
      await getDoc(doc(clientDb, "meal_redemptions", testRedemptionId));
      assert(false, "Expected permission-denied for admin client on meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("5. Rules Lockdown: Collection queries on meal_redemptions are DENIED", async () => {
    const vendorUid = `usr_vnd_query_${Date.now()}`;
    await authenticateClient(vendorUid, { role: "vendor", vendorId: testVendorA });
    try {
      await getDocs(collection(clientDb, "meal_redemptions"));
      assert(false, "Expected permission-denied for collection query on meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("6. Rules Lockdown: Collection-group queries on meal_redemptions are DENIED", async () => {
    const vendorUid = `usr_vnd_cg_${Date.now()}`;
    await authenticateClient(vendorUid, { role: "vendor", vendorId: testVendorA });
    try {
      await getDocs(query(collectionGroup(clientDb, "meal_redemptions")));
      assert(false, "Expected permission-denied for collectionGroup query on meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("7. Rules Lockdown: Direct client write (create/update/delete) on meal_redemptions is DENIED", async () => {
    const attackerUid = `usr_attacker_${Date.now()}`;
    await authenticateClient(attackerUid, { role: "vendor", vendorId: testVendorA });

    // Create attempt
    try {
      await setDoc(doc(clientDb, "meal_redemptions", `fake_red_${Date.now()}`), {
        discountNaira: 99999,
        status: "fraud",
      });
      assert(false, "Expected permission-denied on client create to meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }

    // Update attempt
    try {
      await updateDoc(doc(clientDb, "meal_redemptions", testRedemptionId), {
        discountNaira: 1000,
      });
      assert(false, "Expected permission-denied on client update to meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }

    // Delete attempt
    try {
      await deleteDoc(doc(clientDb, "meal_redemptions", testRedemptionId));
      assert(false, "Expected permission-denied on client delete to meal_redemptions");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("8. Admin SDK Isolation: Cloud Functions Admin SDK can read and write meal_redemptions", async () => {
    const adminDocId = `red_admin_test_${Date.now()}`;
    // Admin write
    await db.collection("meal_redemptions").doc(adminDocId).set({
      test: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Admin read
    const readSnap = await db.collection("meal_redemptions").doc(adminDocId).get();
    assert(readSnap.exists, "Admin SDK must read meal_redemptions without restriction");
    assert(readSnap.data().test === true, "Admin SDK data matches");
    await db.collection("meal_redemptions").doc(adminDocId).delete();
  });

  // -------------------------------------------------------------------------
  // SECTION 2: VENDOR ROLE MODEL IN USER PROFILES (CLIENT WRITE PROTECTION)
  // -------------------------------------------------------------------------

  await runTest("9. Profile Security: Client cannot create user document with vendorRole", async () => {
    const newUid = `usr_self_reg_${Date.now()}`;
    await authenticateClient(newUid, { role: "user" });
    try {
      await setDoc(doc(clientDb, "users", newUid), {
        email: `${newUid}@stage1.test`,
        vendorRole: "owner", // Attacker trying to set owner role
      });
      assert(false, "Expected permission-denied when client injects vendorRole during create");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("10. Profile Security: Client cannot update user document to inject vendorRole", async () => {
    const existingUid = `usr_existing_${Date.now()}`;
    await authenticateClient(existingUid, { role: "user" });
    // Seed legitimate user profile via Admin SDK
    await db.collection("users").doc(existingUid).set({
      uid: existingUid,
      email: `${existingUid}@stage1.test`,
      role: "user",
      points: 0,
    });

    try {
      await updateDoc(doc(clientDb, "users", existingUid), {
        vendorRole: "owner", // Attacker trying to escalate privilege
      });
      assert(false, "Expected permission-denied when client modifies vendorRole");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("permission-denied") || err.message.includes("PERMISSION_DENIED"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // SECTION 3: DEMO PROVISIONING & VENDOR ROLE SERVER CONTROLS
  // -------------------------------------------------------------------------

  await runTest("11. Role Provisioning: Ordinary customer cannot provision self as owner or manager", async () => {
    const custUid = `usr_cust_esc_${Date.now()}`;
    await db.collection("users").doc(custUid).set({ uid: custUid, role: "user" });

    // Customer trying to self-assign owner
    try {
      await setDemoCashierRoleCore({
        callerUid: custUid,
        uid: custUid,
        vendorId: testVendorA,
        vendorRole: "owner",
        isCallerAdmin: false,
      });
      assert(false, "Expected permission-denied for customer self-assigning owner");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("Unauthorized"),
        `Expected permission-denied, got: ${err.message}`
      );
    }

    // Customer trying to self-assign manager
    try {
      await setDemoCashierRoleCore({
        callerUid: custUid,
        uid: custUid,
        vendorId: testVendorA,
        vendorRole: "manager",
        isCallerAdmin: false,
      });
      assert(false, "Expected permission-denied for customer self-assigning manager");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("Unauthorized"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("12. Role Provisioning: Existing cashier cannot promote self or another to owner", async () => {
    const cashierUid = `usr_cashier_esc_${Date.now()}`;
    await db.collection("users").doc(cashierUid).set({
      uid: cashierUid,
      role: "vendor",
      vendorId: testVendorA,
      vendorRole: "cashier",
    });

    try {
      await setDemoCashierRoleCore({
        callerUid: cashierUid,
        uid: cashierUid,
        vendorId: testVendorA,
        vendorRole: "owner",
        isCallerAdmin: false,
      });
      assert(false, "Expected permission-denied for cashier promoting to owner");
    } catch (err) {
      assert(
        err.code === "permission-denied" || err.message.includes("Unauthorized"),
        `Expected permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("13. Role Provisioning: Admin can provision owner, manager, and cashier roles", async () => {
    const adminUid = `usr_admin_prov_${Date.now()}`;
    await db.collection("users").doc(adminUid).set({ uid: adminUid, role: "admin", isAdmin: true });

    const ownerTargetUid = `usr_owner_target_${Date.now()}`;
    const managerTargetUid = `usr_manager_target_${Date.now()}`;
    const cashierTargetUid = `usr_cashier_target_${Date.now()}`;

    // Provision Owner
    const resOwner = await setDemoCashierRoleCore({
      callerUid: adminUid,
      uid: ownerTargetUid,
      vendorId: testVendorA,
      vendorRole: "owner",
      isCallerAdmin: true,
    });
    assert(resOwner.success === true, "Owner provisioning should succeed");
    assert(resOwner.vendorRole === "owner", "Assigned vendorRole should be owner");
    const ownerDoc = await db.collection("users").doc(ownerTargetUid).get();
    assert(ownerDoc.data().vendorRole === "owner", "Firestore doc must store vendorRole: owner");

    // Provision Manager
    const resManager = await setDemoCashierRoleCore({
      callerUid: adminUid,
      uid: managerTargetUid,
      vendorId: testVendorA,
      vendorRole: "manager",
      isCallerAdmin: true,
    });
    assert(resManager.vendorRole === "manager", "Assigned vendorRole should be manager");

    // Provision Cashier (explicit)
    const resCashier = await setDemoCashierRoleCore({
      callerUid: adminUid,
      uid: cashierTargetUid,
      vendorId: testVendorA,
      vendorRole: "cashier",
      isCallerAdmin: true,
    });
    assert(resCashier.vendorRole === "cashier", "Assigned vendorRole should be cashier");

    // Provision Cashier (safe default when vendorRole is omitted)
    const defaultTargetUid = `usr_default_target_${Date.now()}`;
    const resDefault = await setDemoCashierRoleCore({
      callerUid: adminUid,
      uid: defaultTargetUid,
      vendorId: testVendorA,
      isCallerAdmin: true,
    });
    assert(resDefault.vendorRole === "cashier", "Omitted vendorRole must default safely to cashier");
    const defaultDoc = await db.collection("users").doc(defaultTargetUid).get();
    assert(defaultDoc.data().vendorRole === "cashier", "Firestore doc must default to cashier");
  });

  await runTest("14. Role Provisioning: Invalid vendorRole string is rejected with invalid-argument", async () => {
    const adminUid = `usr_admin_invalid_${Date.now()}`;
    await db.collection("users").doc(adminUid).set({ uid: adminUid, role: "admin", isAdmin: true });

    try {
      await setDemoCashierRoleCore({
        callerUid: adminUid,
        uid: `usr_invalid_${Date.now()}`,
        vendorId: testVendorA,
        vendorRole: "super_boss", // Invalid role
        isCallerAdmin: true,
      });
      assert(false, "Expected invalid-argument for invalid vendorRole");
    } catch (err) {
      assert(
        err.code === "invalid-argument" || err.message.includes("Invalid vendorRole"),
        `Expected invalid-argument, got: ${err.message}`
      );
    }
  });

  await runTest("15. Role Revocation: Revoking cashier role cleanly removes vendorRole", async () => {
    const adminUid = `usr_admin_rev_${Date.now()}`;
    await db.collection("users").doc(adminUid).set({ uid: adminUid, role: "admin", isAdmin: true });
    const targetUid = `usr_rev_target_${Date.now()}`;

    // Provision
    await setDemoCashierRoleCore({
      callerUid: adminUid,
      uid: targetUid,
      vendorId: testVendorA,
      vendorRole: "owner",
      isCallerAdmin: true,
    });

    // Revoke
    const resRevoke = await setDemoCashierRoleCore({
      callerUid: adminUid,
      uid: targetUid,
      vendorId: "customer_only",
      isCallerAdmin: true,
    });
    assert(resRevoke.role === "user", "Revoked user must have role user");
    assert(resRevoke.vendorRole === null, "Revoked user must have vendorRole null");

    const targetDoc = await db.collection("users").doc(targetUid).get();
    assert(targetDoc.data().role === "user", "Firestore role must be user");
    assert(targetDoc.data().vendorRole === undefined, "Firestore vendorRole must be deleted");
    assert(targetDoc.data().vendorId === undefined, "Firestore vendorId must be deleted");
  });

  // -------------------------------------------------------------------------
  // SECTION 4: SERVER-SIDE VENDOR AUTHORIZATION HELPER (verifyVendorAuthorizationCore)
  // -------------------------------------------------------------------------

  await runTest("16. Authorization Helper: Missing or unauthenticated caller is rejected", async () => {
    try {
      await verifyVendorAuthorizationCore({ callerUid: null, targetVendorId: testVendorA });
      assert(false, "Expected unauthenticated error");
    } catch (err) {
      assert(err.code === "unauthenticated", `Expected unauthenticated, got ${err.code}`);
    }
  });

  await runTest("17. Authorization Helper: Customer without vendor role is rejected", async () => {
    const custUid = `usr_cust_vauth_${Date.now()}`;
    await db.collection("users").doc(custUid).set({ uid: custUid, role: "user" });

    try {
      await verifyVendorAuthorizationCore({ callerUid: custUid, targetVendorId: testVendorA });
      assert(false, "Expected permission-denied for customer");
    } catch (err) {
      assert(err.code === "permission-denied", `Expected permission-denied, got ${err.code}`);
    }
  });

  await runTest("18. Authorization Helper: Cross-vendor operation is strictly rejected", async () => {
    const vendorAUid = `usr_owner_a_${Date.now()}`;
    await db.collection("users").doc(vendorAUid).set({
      uid: vendorAUid,
      role: "vendor",
      vendorId: testVendorA,
      vendorRole: "owner",
    });

    // Vendor A attempting operation on Vendor B
    try {
      await verifyVendorAuthorizationCore({
        callerUid: vendorAUid,
        targetVendorId: testVendorB, // Cross-vendor attempt
        requiredRole: "owner",
      });
      assert(false, "Expected permission-denied for cross-vendor access");
    } catch (err) {
      assert(
        err.code === "permission-denied" && err.message.includes("Cross-vendor"),
        `Expected cross-vendor permission-denied, got: ${err.message}`
      );
    }
  });

  await runTest("19. Authorization Helper: Cashier denied access to owner or manager operations", async () => {
    const cashierUid = `usr_cashier_hier_${Date.now()}`;
    await db.collection("users").doc(cashierUid).set({
      uid: cashierUid,
      role: "vendor",
      vendorId: testVendorA,
      vendorRole: "cashier",
    });

    // Cashier attempting requiredRole: 'owner'
    try {
      await verifyVendorAuthorizationCore({
        callerUid: cashierUid,
        targetVendorId: testVendorA,
        requiredRole: "owner",
      });
      assert(false, "Expected permission-denied for cashier accessing owner endpoint");
    } catch (err) {
      assert(err.code === "permission-denied", `Expected permission-denied, got: ${err.message}`);
    }

    // Cashier attempting requiredRole: 'manager'
    try {
      await verifyVendorAuthorizationCore({
        callerUid: cashierUid,
        targetVendorId: testVendorA,
        requiredRole: "manager",
      });
      assert(false, "Expected permission-denied for cashier accessing manager endpoint");
    } catch (err) {
      assert(err.code === "permission-denied", `Expected permission-denied, got: ${err.message}`);
    }

    // Cashier attempting requiredRole: 'cashier' (Authorized!)
    const cashierRes = await verifyVendorAuthorizationCore({
      callerUid: cashierUid,
      targetVendorId: testVendorA,
      requiredRole: "cashier",
    });
    assert(cashierRes.authorized === true, "Cashier should be authorized for cashier operations");
    assert(cashierRes.vendorRole === "cashier", "Returned vendorRole is cashier");
  });

  await runTest("20. Authorization Helper: Missing or ambiguous vendorRole resolves safely to cashier", async () => {
    const legacyVendorUid = `usr_legacy_v_${Date.now()}`;
    // Legacy user document with role: 'vendor', but NO vendorRole field
    await db.collection("users").doc(legacyVendorUid).set({
      uid: legacyVendorUid,
      role: "vendor",
      vendorId: testVendorA,
    });

    // Attempting owner operation must be REJECTED (safe default)
    try {
      await verifyVendorAuthorizationCore({
        callerUid: legacyVendorUid,
        targetVendorId: testVendorA,
        requiredRole: "owner",
      });
      assert(false, "Expected permission-denied for legacy account without owner role");
    } catch (err) {
      assert(err.code === "permission-denied", `Expected permission-denied, got: ${err.message}`);
    }

    // Attempting cashier operation must SUCCEED (safe default)
    const res = await verifyVendorAuthorizationCore({
      callerUid: legacyVendorUid,
      targetVendorId: testVendorA,
      requiredRole: "cashier",
    });
    assert(res.authorized === true, "Legacy account should safely resolve to cashier");
    assert(res.vendorRole === "cashier", "Effective role must be cashier");
  });

  await runTest("21. Authorization Helper: Owner is authorized for all vendor levels", async () => {
    const ownerUid = `usr_owner_full_${Date.now()}`;
    await db.collection("users").doc(ownerUid).set({
      uid: ownerUid,
      role: "vendor",
      vendorId: testVendorA,
      vendorRole: "owner",
    });

    const resOwner = await verifyVendorAuthorizationCore({
      callerUid: ownerUid,
      targetVendorId: testVendorA,
      requiredRole: "owner",
    });
    assert(resOwner.authorized === true, "Owner authorized for owner role");

    const resManager = await verifyVendorAuthorizationCore({
      callerUid: ownerUid,
      targetVendorId: testVendorA,
      requiredRole: "manager",
    });
    assert(resManager.authorized === true, "Owner authorized for manager role");

    const resCashier = await verifyVendorAuthorizationCore({
      callerUid: ownerUid,
      targetVendorId: testVendorA,
      requiredRole: "cashier",
    });
    assert(resCashier.authorized === true, "Owner authorized for cashier role");
  });

  await runTest("22. Authorization Helper: System Admin satisfies all vendor operations", async () => {
    const sysAdminUid = `usr_sysadmin_${Date.now()}`;
    await db.collection("users").doc(sysAdminUid).set({
      uid: sysAdminUid,
      role: "admin",
      isAdmin: true,
    });

    const res = await verifyVendorAuthorizationCore({
      callerUid: sysAdminUid,
      targetVendorId: testVendorB, // Can inspect any vendor
      requiredRole: "owner",
    });
    assert(res.authorized === true, "Admin should satisfy all vendor operations");
    assert(res.isAdmin === true, "Admin flag should be true");
  });

  // -------------------------------------------------------------------------
  // SECTION 5: NON-REGRESSION OF EXISTING FLOWS
  // -------------------------------------------------------------------------

  await runTest("23. Non-Regression: Customer can still read their own meal_vouchers", async () => {
    const custUid = `usr_cust_vch_read_${Date.now()}`;
    await authenticateClient(custUid, { role: "user" });

    const voucherId = `vch_cust_read_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: custUid,
      voucherCode: "PWK-READ-TEST",
      vendorId: testVendorA,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vSnap = await getDoc(doc(clientDb, "meal_vouchers", voucherId));
    assert(vSnap.exists(), "Customer must be able to read own voucher");
    assert(vSnap.data().voucherCode === "PWK-READ-TEST", "Voucher data matches");
  });

  await runTest("24. Non-Regression: Existing cashier validation and redemption still functional", async () => {
    const cashierUid = `usr_cashier_reg_${Date.now()}`;
    await db.collection("users").doc(cashierUid).set({
      uid: cashierUid,
      role: "vendor",
      vendorId: testVendorA,
      vendorBranch: "Victoria Island",
      vendorRole: "cashier",
    });

    const campId = `camp_reg_${Date.now()}`;
    await db.collection("meal_campaigns").doc(campId).set({
      id: campId,
      vendorId: testVendorA,
      vendorName: "Stage 1 Delicacies",
      title: "Stage 1 Discount",
      pointsCost: 50,
      discountNaira: 500,
      minSpendNaira: 2000,
      status: "active",
      campaignBudgetNaira: 50000,
      campaignSpentNaira: 0,
      redemptionCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const voucherId = `vch_reg_${Date.now()}`;
    await db.collection("meal_vouchers").doc(voucherId).set({
      id: voucherId,
      userId: "usr_dummy_cust",
      campaignId: campId,
      offerId: "offer-reg",
      vendorId: testVendorA,
      vendorName: "Stage 1 Delicacies",
      discountNaira: 500,
      minSpendNaira: 2000,
      pointsDeducted: 50,
      voucherCode: "PWK-REG-9999",
      status: "active",
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Pre-validation
    const valRes = await validateMealVoucherForMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId: testVendorA,
    });
    assert(valRes.success === true, "Pre-validation must succeed");
    assert(valRes.eligible === true, "Voucher must be eligible");

    // Redemption
    const redRes = await redeemMealVoucherMerchantCore({
      cashierUid,
      voucherCodeOrId: voucherId,
      vendorId: testVendorA,
      billAmountNaira: 3000,
      idempotencyKey: `idem_reg_${Date.now()}`,
    });
    assert(redRes.success === true, "Redemption must succeed");
    assert(redRes.finalPayableNaira === 2500, "Final payable matches bill - discount");
  });

  await runTest("25. Security Rules: Authenticated customer CANNOT read users/{uid}/private_security/pin_credentials, while allowed subcollections remain readable", async () => {
    const custUid = `usr_cust_sec_read_${Date.now()}`;
    // Seed credentials and a legitimate subcollection via Admin SDK
    await db.collection("users").doc(custUid).set({
      uid: custUid,
      email: `${custUid}@stage1.test`,
      role: "user",
    });
    await db.collection("users").doc(custUid).collection("private_security").doc("pin_credentials").set({
      hash: "secret_pin_hash_12345",
      salt: "secret_salt_67890",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("users").doc(custUid).collection("notifications").doc("settings").set({
      emailAlerts: true,
      pushAlerts: false,
    });

    await authenticateClient(custUid, { role: "user" });

    // 1. Attempt to read private_security/pin_credentials via Client SDK -> MUST BE DENIED
    let readDenied = false;
    try {
      await getDoc(doc(clientDb, "users", custUid, "private_security", "pin_credentials"));
    } catch (err) {
      if (err.code === "permission-denied" || (err.message && err.message.includes("PERMISSION_DENIED"))) {
        readDenied = true;
      } else {
        throw err;
      }
    }
    assert(readDenied === true, "Expected client read of private_security/pin_credentials to be denied by security rules");

    // 2. Legitimate access to permitted subcollection -> MUST SUCCEED
    const legitSnap = await getDoc(doc(clientDb, "users", custUid, "notifications", "settings"));
    assert(legitSnap.exists(), "Legitimate subcollection document must be readable");
    assert(legitSnap.data().emailAlerts === true, "Legitimate subcollection data matches");
  });

  await runTest("26. Security Rules: Client writes to users/{uid}/Transactions and users/{uid}/transactions are both DENIED", async () => {
    const custUid = `usr_cust_tx_write_${Date.now()}`;
    await db.collection("users").doc(custUid).set({
      uid: custUid,
      email: `${custUid}@stage1.test`,
      role: "user",
    });

    await authenticateClient(custUid, { role: "user" });

    // 1. Attempt client write to users/{uid}/Transactions (PascalCase) -> MUST BE DENIED
    let pascalDenied = false;
    try {
      await setDoc(doc(clientDb, "users", custUid, "Transactions", `tx_pascal_${Date.now()}`), {
        amount: 5000,
        type: "credit",
      });
    } catch (err) {
      if (err.code === "permission-denied" || (err.message && err.message.includes("PERMISSION_DENIED"))) {
        pascalDenied = true;
      } else {
        throw err;
      }
    }
    assert(pascalDenied === true, "Expected client write to users/{uid}/Transactions to be denied by security rules");

    // 2. Attempt client write to users/{uid}/transactions (lowercase) -> MUST BE DENIED
    let lowerDenied = false;
    try {
      await setDoc(doc(clientDb, "users", custUid, "transactions", `tx_lower_${Date.now()}`), {
        amount: 5000,
        type: "credit",
      });
    } catch (err) {
      if (err.code === "permission-denied" || (err.message && err.message.includes("PERMISSION_DENIED"))) {
        lowerDenied = true;
      } else {
        throw err;
      }
    }
    assert(lowerDenied === true, "Expected client write to users/{uid}/transactions to be denied by security rules");
  });

  console.log("\n==================================================================");
  console.log("STAGE 1 TEST SUMMARY");
  console.log("==================================================================");
  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);

  if (failedCount > 0) {
    console.error("\nFAILED TESTS:");
    results.filter((r) => !r.pass).forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log("\nALL STAGE 1 RULES & ROLE MODEL TESTS PASSED! 🎉\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Stage 1 test suite:", err);
  process.exit(1);
});

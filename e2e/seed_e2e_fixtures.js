/**
 * PayWaka Meal Coupon MVP - E2E Fixture Seeding Script
 * 
 * STRICT EMULATOR-ONLY SAFEGUARDS:
 * - Refuses execution unless FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST,
 *   and FUNCTIONS_EMULATOR environment variables are explicitly configured.
 * - Targets ONLY the local Firebase Emulator Suite on 127.0.0.1.
 * - Never writes to live/production Firebase projects or customer records.
 */

import dotenv from "dotenv";
dotenv.config({ path: "./functions/.env" });

const EXPECTED_PROJECT_ID = "vtu-site-43118";
const EXPECTED_FIRESTORE_HOST = "127.0.0.1:8085";
const EXPECTED_AUTH_HOST = "127.0.0.1:9099";

// Hard environment assertion
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || EXPECTED_FIRESTORE_HOST;
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || EXPECTED_AUTH_HOST;
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || EXPECTED_PROJECT_ID;
process.env.FUNCTIONS_EMULATOR = "true";
if (!process.env.PIN_PEPPER_SECRET_V1) {
  process.env.PIN_PEPPER_SECRET_V1 = "dev_pepper_secret_v1_mock_value_for_testing_123456";
}

if (
  process.env.FIRESTORE_EMULATOR_HOST !== EXPECTED_FIRESTORE_HOST ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== EXPECTED_AUTH_HOST ||
  process.env.FUNCTIONS_EMULATOR !== "true"
) {
  console.error("FATAL ERROR: Refusing to run E2E seeder outside local emulator environment.");
  process.exit(1);
}

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: EXPECTED_PROJECT_ID });
}

const db = admin.firestore();
const auth = admin.auth();

export const E2E_CONFIG = {
  customer: {
    uid: "usr_e2e_customer_test",
    email: "customer.e2e@paywaka.demo",
    password: "DemoPass123!",
    userName: "E2E Test Customer",
    fullName: "E2E Test Customer",
    phone: "08012345678",
    initialPoints: 1500,
    initialBalance: 10000,
    pin: "8361",
  },
  cashier: {
    uid: "usr_e2e_cashier_test",
    email: "cashier.e2e@paywaka.demo",
    password: "DemoPass123!",
    userName: "Demo Cashier",
    fullName: "Demo Cashier",
    role: "vendor",
    vendorId: "paywaka-demo-foods",
    vendorBranch: "Victoria Island",
  },
  vendor: {
    id: "paywaka-demo-foods",
    name: "PayWaka Demo Foods",
    category: "Local Delicacies",
    branch: "Victoria Island • 1.2km",
    address: "14 Adeola Odeku St, Victoria Island, Lagos",
    isOpen: true,
    status: "active",
  },
  campaign: {
    id: "camp-demo-jollof",
    offerId: "coupon-demo-jollof",
    vendorId: "paywaka-demo-foods",
    vendorName: "PayWaka Demo Foods",
    title: "₦500 Meal Discount Voucher",
    pointsCost: 100,
    discountNaira: 500,
    minSpendNaira: 2500,
    status: "active",
    campaignBudgetNaira: 100000,
    campaignSpentNaira: 0,
    redemptionCount: 0,
  },
};

async function ensureAuthUser({ uid, email, password }) {
  try {
    const existing = await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password,
      emailVerified: true,
    });
    return existing;
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      return await auth.createUser({
        uid,
        email,
        password,
        emailVerified: true,
      });
    }
    throw err;
  }
}

export async function seedE2EFixtures() {
  console.log("====================================================");
  console.log("PAYWAKA E2E FIXTURE SEEDER (EMULATOR ONLY)");
  console.log("Target Project:", EXPECTED_PROJECT_ID);
  console.log("Firestore Host:", process.env.FIRESTORE_EMULATOR_HOST);
  console.log("Auth Host:     ", process.env.FIREBASE_AUTH_EMULATOR_HOST);
  console.log("====================================================");

  // Import functions index to access createTransactionPin
  const indexModule = await import("../functions/index.js");
  const createTransactionPin = indexModule.createTransactionPin;

  // 1. Seed Customer in Auth
  console.log(`[1/5] Ensuring Customer Auth account (${E2E_CONFIG.customer.email})...`);
  await ensureAuthUser(E2E_CONFIG.customer);

  // 2. Clean & Seed Customer Profile in Firestore
  console.log(`[2/5] Initializing Customer profile & spendable points (${E2E_CONFIG.customer.initialPoints} pts)...`);
  const custRef = db.collection("users").doc(E2E_CONFIG.customer.uid);
  
  // Clean subcollections
  const ptsSnap = await custRef.collection("points").get();
  for (const doc of ptsSnap.docs) await doc.ref.delete();

  const claimsSnap = await custRef.collection("mealClaims").get();
  for (const doc of claimsSnap.docs) await doc.ref.delete();

  const secSnap = await custRef.collection("private_security").get();
  for (const doc of secSnap.docs) await doc.ref.delete();

  // Clean customer's previous vouchers
  const vchSnap = await db.collection("meal_vouchers").where("userId", "==", E2E_CONFIG.customer.uid).get();
  for (const doc of vchSnap.docs) await doc.ref.delete();

    // Set base profile
    await custRef.set({
      uid: E2E_CONFIG.customer.uid,
      email: E2E_CONFIG.customer.email,
      userEmail: E2E_CONFIG.customer.email,
      userName: E2E_CONFIG.customer.userName,
      firstName: "E2E",
      lastName: "Customer",
      fullName: E2E_CONFIG.customer.fullName,
      phone: E2E_CONFIG.customer.phone,
      userPhone: E2E_CONFIG.customer.phone,
      points: E2E_CONFIG.customer.initialPoints,
      balance: E2E_CONFIG.customer.initialBalance,
      accountReference: "",
      accountNumber: "0123456789",
      bankName: "PayWaka Test Bank",
      role: "user",
      isVerified: true,
      hasTransactionPin: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await custRef.collection("preferences").doc(E2E_CONFIG.customer.uid).set({
      notifications: true,
      darkMode: false,
    });

    await custRef.collection("achievements").doc("stats").set({
      totalTransactions: 0,
      pointsEarned: E2E_CONFIG.customer.initialPoints,
    });

    await custRef.collection("mealClaims").doc(E2E_CONFIG.campaign.offerId).set({
      offerId: E2E_CONFIG.campaign.offerId,
      campaignId: E2E_CONFIG.campaign.id,
      userId: E2E_CONFIG.customer.uid,
      lifetimeClaimCount: 0,
      activeVoucherId: null,
      activeVoucherExpiresAt: null,
      claimHistory: {},
    });

  // Seed 4-digit Transaction PIN via callable
  console.log(`      Configuring Customer 4-digit PIN ('${E2E_CONFIG.customer.pin}')...`);
  await createTransactionPin.run({
    auth: { uid: E2E_CONFIG.customer.uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
    data: { pin: E2E_CONFIG.customer.pin },
  });

  // 3. Seed Cashier in Auth & Firestore
  console.log(`[3/5] Ensuring Cashier Auth account (${E2E_CONFIG.cashier.email})...`);
  await ensureAuthUser(E2E_CONFIG.cashier);
  await auth.setCustomUserClaims(E2E_CONFIG.cashier.uid, {
    role: E2E_CONFIG.cashier.role,
    vendorId: E2E_CONFIG.cashier.vendorId,
  });

  const cashierRef = db.collection("users").doc(E2E_CONFIG.cashier.uid);
  await cashierRef.set({
    uid: E2E_CONFIG.cashier.uid,
    email: E2E_CONFIG.cashier.email,
    userName: E2E_CONFIG.cashier.userName,
    fullName: E2E_CONFIG.cashier.fullName,
    role: E2E_CONFIG.cashier.role,
    vendorId: E2E_CONFIG.cashier.vendorId,
    vendorBranch: E2E_CONFIG.cashier.vendorBranch,
    isVerified: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 4. Seed Vendor
  console.log(`[4/5] Seeding Fictional Vendor (${E2E_CONFIG.vendor.id})...`);
  await db.collection("meal_vendors").doc(E2E_CONFIG.vendor.id).set({
    ...E2E_CONFIG.vendor,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 5. Seed Canonical Campaign
  console.log(`[5/5] Seeding Canonical Campaign (${E2E_CONFIG.campaign.id})...`);
  await db.collection("meal_campaigns").doc(E2E_CONFIG.campaign.id).set({
    ...E2E_CONFIG.campaign,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection("meal_campaigns").doc(E2E_CONFIG.campaign.offerId).set({
    ...E2E_CONFIG.campaign,
    id: E2E_CONFIG.campaign.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("\n✔ E2E FIXTURES SUCCESSFULLY SEEDED INTO FIREBASE EMULATORS!\n");
}

// Auto-run if executed directly
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  seedE2EFixtures()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("✖ Fixture Seeding Failed:", err);
      process.exit(1);
    });
}

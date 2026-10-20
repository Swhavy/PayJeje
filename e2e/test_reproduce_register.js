import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "fake-api-key-for-emulator",
  projectId: "vtu-site-43118",
}, `test-app-${Date.now()}`);

const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8085);

async function runDiagnostics() {
  const testEmail = `diag_${Date.now()}@paywaka.demo`;
  const testPass = "TestPassword123!";

  console.log("=== DIAGNOSTIC 1: Exact Current Register.jsx Code ===");
  const cred = await createUserWithEmailAndPassword(auth, testEmail, testPass);
  const uid = cred.user.uid;
  console.log("✔ Auth account created with UID:", uid);

  const achievements = doc(db, "users", uid, "achievements", "stats");
  const achievementsData = {
    firstSurvey: 0,
    pointsEarned: 0,
    billPayer: 0,
    referralMaster: 0,
  };

  const currentRegisterUserData = {
    firstName: "Test",
    lastName: "User",
    userEmail: testEmail,
    userPhone: "08012345678",
    userGender: "female",
    userName: "testuser",
    refferalsCount: 0,
    streak: 0,
    points: 0,
    referredBy: "",
  };

  try {
    await setDoc(doc(db, "users", uid), currentRegisterUserData);
    console.log("✔ users/{uid} setDoc with points: 0 succeeded");
  } catch (err) {
    console.log("✖ users/{uid} setDoc with points: 0 FAILED as expected:", err.message);
  }

  console.log("\n=== DIAGNOSTIC 2: Profile setDoc WITHOUT 'points' field ===");
  const { points, ...userDataWithoutPoints } = currentRegisterUserData;
  try {
    await setDoc(doc(db, "users", uid), userDataWithoutPoints);
    console.log("✔ users/{uid} setDoc WITHOUT 'points' SUCCEEDED!");
  } catch (err) {
    console.log("✖ users/{uid} setDoc WITHOUT 'points' FAILED:", err.message);
  }

  console.log("\n=== DIAGNOSTIC 3: achievements/stats Subcollection write ===");
  try {
    await setDoc(achievements, achievementsData);
    console.log("✔ achievements/stats setDoc SUCCEEDED!");
  } catch (err) {
    console.log("✖ achievements/stats setDoc FAILED:", err.message);
  }

  console.log("\n=== DIAGNOSTIC 4: Reading created profile ===");
  try {
    const snap = await getDoc(doc(db, "users", uid));
    console.log("✔ Profile read succeeded, exists:", snap.exists(), "data:", snap.data());
  } catch (err) {
    console.log("✖ Profile read FAILED:", err.message);
  }
}

runDiagnostics().catch(console.error);

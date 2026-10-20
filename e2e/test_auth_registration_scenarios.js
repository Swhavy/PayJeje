import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "fake-api-key-for-emulator",
  projectId: "vtu-site-43118",
}, `scenarios-app-${Date.now()}`);

const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8085);

async function runScenarios() {
  console.log("====================================================");
  console.log("REGISTRATION & AUTHENTICATION SECURITY SCENARIOS");
  console.log("====================================================");

  // Scenario 1: Fresh Registration with points: 0 (Current Register.jsx behavior)
  const email1 = `test_points0_${Date.now()}@paywaka.demo`;
  const cred1 = await createUserWithEmailAndPassword(auth, email1, "TestPass123!");
  const uid1 = cred1.user.uid;

  let err1 = null;
  try {
    await setDoc(doc(db, "users", uid1), {
      firstName: "Test",
      lastName: "User",
      userEmail: email1,
      points: 0,
    });
  } catch (e) {
    err1 = e;
  }
  console.log("Scenario 1 (points: 0 on create):", err1 ? `DENIED (${err1.message.split("\n")[0]})` : "ALLOWED");

  // Scenario 2: Registration with points: 500 (Attempted points forging)
  const email2 = `test_points500_${Date.now()}@paywaka.demo`;
  const cred2 = await createUserWithEmailAndPassword(auth, email2, "TestPass123!");
  const uid2 = cred2.user.uid;

  let err2 = null;
  try {
    await setDoc(doc(db, "users", uid2), {
      firstName: "Test",
      lastName: "User",
      userEmail: email2,
      points: 500,
    });
  } catch (e) {
    err2 = e;
  }
  console.log("Scenario 2 (points: 500 on create):", err2 ? `DENIED (${err2.message.split("\n")[0]})` : "ALLOWED");

  // Scenario 3: Registration with walletBalance: 10000 (Attempted wallet forging)
  const email3 = `test_wallet_${Date.now()}@paywaka.demo`;
  const cred3 = await createUserWithEmailAndPassword(auth, email3, "TestPass123!");
  const uid3 = cred3.user.uid;

  let err3 = null;
  try {
    await setDoc(doc(db, "users", uid3), {
      firstName: "Test",
      lastName: "User",
      userEmail: email3,
      walletBalance: 10000,
    });
  } catch (e) {
    err3 = e;
  }
  console.log("Scenario 3 (walletBalance: 10000 on create):", err3 ? `DENIED (${err3.message.split("\n")[0]})` : "ALLOWED");

  // Scenario 4: Registration with role: 'admin' (Attempted privilege escalation)
  const email4 = `test_role_${Date.now()}@paywaka.demo`;
  const cred4 = await createUserWithEmailAndPassword(auth, email4, "TestPass123!");
  const uid4 = cred4.user.uid;

  let err4 = null;
  try {
    await setDoc(doc(db, "users", uid4), {
      firstName: "Test",
      lastName: "User",
      userEmail: email4,
      role: "admin",
    });
  } catch (e) {
    err4 = e;
  }
  console.log("Scenario 4 (role: 'admin' on create):", err4 ? `DENIED (${err4.message.split("\n")[0]})` : "ALLOWED");

  // Scenario 5: Registration without any protected fields (Only profile info)
  const email5 = `test_clean_${Date.now()}@paywaka.demo`;
  const cred5 = await createUserWithEmailAndPassword(auth, email5, "TestPass123!");
  const uid5 = cred5.user.uid;

  let err5 = null;
  try {
    await setDoc(doc(db, "users", uid5), {
      firstName: "Clean",
      lastName: "User",
      userEmail: email5,
      userName: "cleanuser",
      userPhone: "08012345678",
      userGender: "male",
      refferalsCount: 0,
      streak: 0,
    });
  } catch (e) {
    err5 = e;
  }
  console.log("Scenario 5 (clean profile without points on create):", err5 ? `DENIED (${err5.message.split("\n")[0]})` : "ALLOWED");

  // Scenario 6: Once created, can clean user modify their points directly?
  if (!err5) {
    let errUpdatePoints = null;
    try {
      await updateDoc(doc(db, "users", uid5), { points: 999 });
    } catch (e) {
      errUpdatePoints = e;
    }
    console.log("Scenario 6 (clean user updating points to 999):", errUpdatePoints ? `DENIED (${errUpdatePoints.message.split("\n")[0]})` : "ALLOWED");

    // Scenario 7: Can clean user update their own non-protected profile field (e.g. userName)?
    let errUpdateName = null;
    try {
      await updateDoc(doc(db, "users", uid5), { userName: "new_username" });
    } catch (e) {
      errUpdateName = e;
    }
    console.log("Scenario 7 (clean user updating userName):", errUpdateName ? `DENIED (${errUpdateName.message.split("\n")[0]})` : "ALLOWED");
  }
}

runScenarios().catch(console.error);

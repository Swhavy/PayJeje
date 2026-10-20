import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "fake-api-key-for-emulator",
  projectId: "vtu-site-43118",
}, `rules-test-app-${Date.now()}`);

const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8085);

async function runSecuritySuite() {
  console.log("=================================================================");
  console.log("PAYWAKA FIRESTORE AUTH & PROFILE SECURITY TEST SUITE (EMULATOR)");
  console.log("=================================================================\n");

  const results = [];

  async function testCase(name, fn) {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✔ PASS: ${name}`);
    } catch (err) {
      results.push({ name, passed: false, error: err.message });
      console.error(`✖ FAIL: ${name} -> ${err.message}`);
    }
  }

  // Helper to create an authenticated user
  async function createTestUser(tag) {
    const email = `sec_${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@paywaka.demo`;
    const password = "TestPass123!";
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return { cred, uid: cred.user.uid, email };
  }

  // 1. Authenticated user creates their own profile with points: 0 — allowed
  await testCase("1. Authenticated user creates their own profile with points: 0 (ALLOWED)", async () => {
    const { uid, email } = await createTestUser("pts0");
    await setDoc(doc(db, "users", uid), {
      firstName: "Test",
      lastName: "User",
      userEmail: email,
      points: 0,
    });
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists() || snap.data().points !== 0) {
      throw new Error("Document was not created properly with points: 0");
    }
  });

  // 2. Authenticated user creates their own profile without points — allowed
  await testCase("2. Authenticated user creates their own profile without points (ALLOWED)", async () => {
    const { uid, email } = await createTestUser("nopts");
    await setDoc(doc(db, "users", uid), {
      firstName: "No",
      lastName: "Points",
      userEmail: email,
    });
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists() || "points" in snap.data()) {
      throw new Error("Document was not created properly without points");
    }
  });

  // 3. Client attempts to create a profile with points: 500 — denied
  await testCase("3. Client attempts to create a profile with points: 500 (DENIED)", async () => {
    const { uid, email } = await createTestUser("forge500");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Hacker",
        lastName: "Points",
        userEmail: email,
        points: 500,
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected points: 500 create to be DENIED, but it succeeded!");
  });

  // 4. Client attempts to create a profile with negative or non-integer points — denied
  await testCase("4a. Client attempts to create a profile with negative points (-50) (DENIED)", async () => {
    const { uid, email } = await createTestUser("negpts");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Bad",
        lastName: "Negative",
        userEmail: email,
        points: -50,
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected negative points to be DENIED, but it succeeded!");
  });

  await testCase("4b. Client attempts to create a profile with float points (0.5) (DENIED)", async () => {
    const { uid, email } = await createTestUser("floatpts");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Bad",
        lastName: "Float",
        userEmail: email,
        points: 0.5,
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected float points to be DENIED, but it succeeded!");
  });

  await testCase("4c. Client attempts to create a profile with string points ('0') (DENIED)", async () => {
    const { uid, email } = await createTestUser("strpts");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Bad",
        lastName: "String",
        userEmail: email,
        points: "0",
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected string points to be DENIED, but it succeeded!");
  });

  // 5. Client attempts to create a profile with role: 'admin' — denied
  await testCase("5. Client attempts to create a profile with role: 'admin' (DENIED)", async () => {
    const { uid, email } = await createTestUser("adminrole");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Fake",
        lastName: "Admin",
        userEmail: email,
        role: "admin",
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected role: 'admin' create to be DENIED, but it succeeded!");
  });

  // 6. Client attempts to inject walletBalance, account_reference, or hasTransactionPin — denied
  await testCase("6a. Client attempts to inject walletBalance: 50000 on create (DENIED)", async () => {
    const { uid, email } = await createTestUser("walletbal");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Rich",
        lastName: "Wallet",
        userEmail: email,
        walletBalance: 50000,
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected walletBalance injection to be DENIED, but it succeeded!");
  });

  await testCase("6b. Client attempts to inject account_reference on create (DENIED)", async () => {
    const { uid, email } = await createTestUser("accref");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Fake",
        lastName: "Account",
        userEmail: email,
        account_reference: "FLW_INJECTED_12345",
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected account_reference injection to be DENIED, but it succeeded!");
  });

  await testCase("6c. Client attempts to inject hasTransactionPin: true on create (DENIED)", async () => {
    const { uid, email } = await createTestUser("pinbypass");
    let failed = false;
    try {
      await setDoc(doc(db, "users", uid), {
        firstName: "Pin",
        lastName: "Bypass",
        userEmail: email,
        hasTransactionPin: true,
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected hasTransactionPin injection to be DENIED, but it succeeded!");
  });

  // 7. Client attempts to modify their points or protected balances after creation — denied
  await testCase("7a. Client attempts to modify points after creation (DENIED)", async () => {
    const { uid, email } = await createTestUser("postpoints");
    await setDoc(doc(db, "users", uid), {
      firstName: "Honest",
      lastName: "User",
      userEmail: email,
      points: 0,
    });
    let failed = false;
    try {
      await updateDoc(doc(db, "users", uid), {
        points: 500,
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected post-creation points modification to be DENIED, but it succeeded!");
  });

  await testCase("7b. Client attempts to modify walletBalance after creation (DENIED)", async () => {
    const { uid, email } = await createTestUser("postwallet");
    await setDoc(doc(db, "users", uid), {
      firstName: "Honest",
      lastName: "User",
      userEmail: email,
    });
    let failed = false;
    try {
      await updateDoc(doc(db, "users", uid), {
        walletBalance: 99999,
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected post-creation walletBalance modification to be DENIED, but it succeeded!");
  });

  // 8. Client updates a permitted profile field — allowed
  await testCase("8. Client updates a permitted profile field (ALLOWED)", async () => {
    const { uid, email } = await createTestUser("updateprof");
    await setDoc(doc(db, "users", uid), {
      firstName: "Initial",
      lastName: "Name",
      userEmail: email,
      points: 0,
    });
    await updateDoc(doc(db, "users", uid), {
      firstName: "UpdatedFirstName",
      userPhone: "+2348012345678",
    });
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.data().firstName !== "UpdatedFirstName" || snap.data().userPhone !== "+2348012345678") {
      throw new Error("Permitted update was not persisted correctly!");
    }
  });

  // 9. Client cannot create or modify another user's profile
  await testCase("9a. Client cannot create another user's profile (DENIED)", async () => {
    const userA = await createTestUser("userA");
    // Attempt to write to a document with victim UID
    const victimUid = "victim_uid_" + Date.now();
    let failed = false;
    try {
      await setDoc(doc(db, "users", victimUid), {
        firstName: "Malicious",
        userEmail: "victim@paywaka.demo",
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected cross-user profile creation to be DENIED, but it succeeded!");
  });

  await testCase("9b. Client cannot modify another user's profile (DENIED)", async () => {
    const userA = await createTestUser("userA");
    await setDoc(doc(db, "users", userA.uid), {
      firstName: "UserA",
      userEmail: userA.email,
      points: 0,
    });

    // Create userB and try to update userA's doc
    const userB = await createTestUser("userB");
    let failed = false;
    try {
      await updateDoc(doc(db, "users", userA.uid), {
        firstName: "HijackedByB",
      });
    } catch (e) {
      failed = true;
    }
    if (!failed) throw new Error("Expected cross-user profile modification to be DENIED, but it succeeded!");
  });

  console.log("\n=================================================================");
  console.log(`SECURITY TEST SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log("=================================================================");

  const allPassed = results.every(r => r.passed);
  if (!allPassed) {
    process.exit(1);
  }
}

runSecuritySuite().catch(err => {
  console.error("FATAL ERROR IN SECURITY SUITE:", err);
  process.exit(1);
});

//Referral Logics;

// functions/index.js

// import firebase functions runtime and admin SDK
const functions = require("firebase-functions"); // Firebase Functions SDK
const admin = require("firebase-admin"); // Admin SDK to access Firestore, Auth, etc.
const axios = require("axios"); // HTTP client used to call your data/airtime vendor API

// Initialize the Admin SDK (uses service account provided by the Functions runtime)
admin.initializeApp();

// shorthand reference to Firestore
const db = admin.firestore();

/* -----------------------
   Helper: random referral code
   ----------------------- */
function generateRandomCode(length = 6) {
  // Allowed characters for code (uppercase letters + digits)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = "";
  // pick 'length' characters at random
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // prefix with PWK- so codes read like: PWK-3G7H2A
  return "PWK-" + res;
}

/* -----------------------
   Helper: ensure code is unique (tries a few times)
   ----------------------- */
async function getUniqueReferralCode() {
  let attempts = 0;
  // try a few times to avoid collisions
  while (attempts < 5) {
    const code = generateRandomCode();
    // query users collection to see if code already exists
    const q = await db
      .collection("users")
      .where("referralCode", "==", code)
      .limit(1)
      .get();
    if (q.empty) return code; // unique — return it
    attempts++;
  }
  // fallback: if collisions happen (very unlikely), include timestamp to guarantee uniqueness
  return "PWK-" + Date.now().toString(36);
}

/* -----------------------
   Trigger A: When a user doc is created in `users/{uid}`
   - ensures the new user has a referralCode
   - if the new user used a referral code, find the referrer and enqueue reward (1GB data) for the referrer
   ----------------------- */
exports.handleNewUserReferral = functions.firestore
  .document("users/{uid}")
  .onCreate(async (snap, context) => {
    // snapshot data of newly created user document
    const userData = snap.data();

    // uid of the user is the document id (path parameter from context)
    const uid = context.params.uid;

    // 1) Ensure the new user has their own referralCode (so they can later refer others)
    if (!userData.referralCode) {
      // if client didn't create a code, generate one and write back to the user doc
      const newCode = await getUniqueReferralCode();
      await db.collection("users").doc(uid).update({ referralCode: newCode });
    }

    // 2) Determine if the new user signed up with a referral code
    // clients should write either referredByCode or referredBy when creating the user doc
    const referredByCode =
      userData.referredByCode || userData.referredBy || null;

    // if there's no referral code used, we stop here (nothing to reward)
    if (!referredByCode) {
      // optional: flag so the frontend knows we've processed referrals for this user
      await db.collection("users").doc(uid).update({ referralHandled: true });
      return null;
    }

    // 3) Look up the referrer by referralCode
    const refQuery = await db
      .collection("users")
      .where("referralCode", "==", referredByCode)
      .limit(1)
      .get();

    // if code is invalid (no matching user), mark and stop
    if (refQuery.empty) {
      await db.collection("users").doc(uid).update({
        referralHandled: true,
        referredByInvalid: true,
        referredByCode: referredByCode, // keep original used code for auditing
      });
      return null;
    }

    // we have a matching referrer
    const referrerDoc = refQuery.docs[0];
    const referrerId = referrerDoc.id;

    // prevent self-referral (same uid)
    if (referrerId === uid) {
      await db.collection("users").doc(uid).update({
        referralHandled: true,
        selfReferralBlocked: true,
      });
      return null;
    }

    // defensive: check if a referral record already exists for this referredId (shouldn't on onCreate but safe)
    const existingReferral = await db
      .collection("referrals")
      .where("referredId", "==", uid)
      .limit(1)
      .get();
    if (!existingReferral.empty) {
      await db.collection("users").doc(uid).update({
        referralHandled: true,
        duplicateReferralIgnored: true,
      });
      return null;
    }

    // 4) Create referral record, increment counters, enqueue data top-up request
    // We do this inside a transaction so the operations are atomic
    try {
      await db.runTransaction(async (tx) => {
        // ref to the referrer's user doc
        const referrerRef = db.collection("users").doc(referrerId);

        // fetch referrer snapshot inside transaction
        const referrerSnap = await tx.get(referrerRef);
        if (!referrerSnap.exists)
          throw new Error("Referrer disappeared during processing");

        // prepare a referral document (stores the relation + status)
        const referralRef = db.collection("referrals").doc(); // auto-id
        tx.set(referralRef, {
          referrerId: referrerId, // uid of who referred
          referredId: uid, // new user's uid
          status: "pending", // pending until we successfully deliver the 1GB
          package: "1GB", // reward package
          rewardType: "data",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // increment referrer's referralsCount (create the field if it doesn't exist)
        tx.update(referrerRef, {
          referralsCount: admin.firestore.FieldValue.increment(1),
          lastReferralAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // enqueue data top-up request — this will be processed by a separate function
        const topupRef = db.collection("dataTopupRequests").doc(); // auto-id
        // create a simple idempotency key to avoid double top-ups (referrerId + referredId + timestamp)
        const idempotencyKey = `${referrerId}_${uid}_${Date.now()}`;

        tx.set(topupRef, {
          referrerId: referrerId, // who will receive the data
          phoneNumber: referrerSnap.data().phoneNumber || null, // phone to top-up; must be set on referrer's profile
          package: "1GB", // requested package
          status: "pending", // will transition to success/failed
          referralId: referralRef.id, // link back to referral
          idempotencyKey: idempotencyKey,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // mark the new user's doc as handled and record the referrerUid for easy lookup later
        const newUserRef = db.collection("users").doc(uid);
        tx.update(newUserRef, {
          referredByUid: referrerId,
          referralHandled: true,
        });
      }); // end transaction
    } catch (err) {
      // transaction failed — log and mark the user doc so you can debug
      console.error("referral transaction failed:", err);
      await db
        .collection("users")
        .doc(uid)
        .update({
          referralHandled: false,
          referralError: err.message || String(err),
        });
      return null;
    }

    // done
    return null;
  });

/* -----------------------
   Trigger B: When a dataTopupRequests doc is created.
   - Calls your data/airtime vendor to deliver 1GB to the referrer's phone
   - Updates request status + referral status + writes to user's rewards history on success
   ----------------------- */
exports.processDataTopupRequest = functions.firestore
  .document("dataTopupRequests/{reqId}")
  .onCreate(async (snap, context) => {
    // request data
    const req = snap.data();
    const reqRef = snap.ref;

    // simple validation: you need a phone to top-up
    if (!req.phoneNumber) {
      // update request and referral to failed so you can fix caller data later
      await reqRef.update({
        status: "failed",
        failureReason: "referrer_missing_phone",
      });
      //updates the referrals record on the error
      if (req.referraldocId) {
        await db.collection("referrals").doc(req.referraldocId).update({
          status: "failed",
          failureReason: "referrer_missing_phone",
        });
      }
      return null;
    }

    // vendor config — prefer Firebase functions config but allow environment fallback
    // set these with: `firebase functions:config:set data.vendor_url="..." data.vendor_key="..."`
    const vendorConfig =
      functions.config && functions.config().data
        ? functions.config().data
        : {};
    const VENDOR_URL =
      vendorConfig.vendor_url || process.env.DATA_VENDOR_URL || null;
    const VENDOR_API_KEY =
      vendorConfig.vendor_key || process.env.DATA_VENDOR_API_KEY || null;

    // if you haven't set vendor credentials, fail early so you don't attempt a call
    if (!VENDOR_URL || !VENDOR_API_KEY) {
      await reqRef.update({
        status: "failed",
        failureReason: "vendor_not_configured",
      });
      if (req.referraldocId) {
        //updates the referrals record on the error
        await db.collection("referrals").doc(req.referraldocId).update({
          status: "failed",
          failureReason: "vendor_not_configured",
        });
      }
      console.error(
        'Vendor not configured. Set functions config: firebase functions:config:set data.vendor_url="..." data.vendor_key="..."',
      );
      return null;
    }

    // prepare payload for vendor — replace fields to match your vendor's API
    const payload = {
      phone: req.phoneNumber,
      plan: "1GB",
      reference: req.idempotencyKey, // idempotency token so vendor can avoid duplicates
    };

    try {
      // call vendor API (POST) — adapt headers/payload to your vendor's spec
      const resp = await axios.post(VENDOR_URL, payload, {
        headers: {
          Authorization: `Bearer ${VENDOR_API_KEY}`,
          "Idempotency-Key": req.idempotencyKey,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15s timeout
      });

      // interpret vendor response — adjust to match your vendor
      if (resp.data && resp.data.success) {
        // mark top-up request success
        await reqRef.update({
          status: "success",
          providerReference: resp.data.providerReference || null,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // mark referral as rewarded
        if (req.referraldocId) {
          //updates the referrals record on the successful reward implementation
          await db.collection("referrals").doc(req.referraldocId).update({
            status: "rewarded",
            rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // write a rewards entry inside referrer's subcollection for history/UX
        await db
          .collection("users")
          .doc(req.referrerId)
          .collection("rewards")
          .add({
            type: "data",
            package: "1GB",
            referraldocId: req.referraldocId || null, //link to the referrals record
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            providerReference: resp.data.providerReference || null,
          });
      } else {
        // vendor returned but indicated failure — persist the full response for debugging
        await reqRef.update({
          status: "failed",
          failureReason: JSON.stringify(resp.data || "vendor_failed"),
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (req.referraldocId) {
          //updates the referrals record on the error
          await db.collection("referrals").doc(req.referraldocId).update({
            status: "failed",
            failureReason: "vendor_rejected",
          });
        }
      }
    } catch (err) {
      // network or other error — log and persist failure reason
      console.error("Top-up API error:", err.message || err);
      await reqRef.update({
        status: "failed",
        failureReason: err.message || String(err),
      });
      if (req.referraldocId) {
        //updates the referrals record on the error
        await db
          .collection("referrals")
          .doc(req.referraldocId)
          .update({
            status: "failed",
            failureReason: err.message || String(err),
          });
      }
    }

    return null;
  });

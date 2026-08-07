/**
 * Firebase Cloud Functions (v2 Node.js)
 * Place this inside: functions/index.js
 */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Admin SDK once if not already initialized elsewhere in your codebase
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Declare your Flutterwave secret securely using Cloud Secret Manager
const FLW_SECRET_KEY = defineSecret("FLW_SECRET_KEY");

/**
 * ------------------------------------------------------------------
 * ⚡ FLOW 1: FIREBASE FIRESTORE DATABASE TRIGGER
 * ------------------------------------------------------------------
 * Listens for updates to 'users/{userId}'. If a user has no active wallet,
 * and an admin or schedule updates 'retryWalletCreation' to 'true',
 * this function automatically triggers to attempt subaccount + static virtual account setup.
 */
export const onUserWalletRetryTrigger = onDocumentUpdated(
  {
    document: "failedWallets/{userId}",
    timeoutSeconds: 300, // Generous timeout for multiple Flutterwave API roundtrips
    memory: "512MiB",
  },
  async (event) => {
    const change = event.data;
    if (!change) {
      logger.warn("No data associated with the event");
      return null;
    }

    // 🛡️ Guard against deletion events:
    // If the document was deleted, change.after won't exist. Abort gracefully.
    if (!change.after.exists) {
      logger.info(`Cleanup: failedWallets document deleted for user.`);
      return null;
    }

    const beforeData = change.before.data() || {};
    const afterData = change.after.data() || {};
    const uid = event.params.userId;

    // 🛡️ CRITICAL LOOP SAFETY GUARD:
    // Only trigger if 'retryWalletCreation' changes from not-true (or undefined) to true.
    // This guarantees we don't cause an infinite trigger storm when we update the document.
    const isRetryRequested = afterData?.retryWalletCreation === true;
    const wasAlreadyRequested = beforeData?.retryWalletCreation === true;

    if (!isRetryRequested || wasAlreadyRequested) {
      // State has not transitioned; abort execution gracefully
      return null;
    }

    // 🛡️ NO WALLET CHECK: Verify they don't already have an active configured wallet reference
    // if (afterData.accountReference && afterData.accountNumber) {
    //   logger.info(
    //     `[Trigger] User ${uid} already has a fully complete wallet. Resetting trigger flag.`,
    //   );
    //   await db
    //     .collection("users")
    //     .doc(uid)
    //     .update({ retryWalletCreation: false });
    //   return null;
    // }

    logger.info(`⚡ Wallet retry database event triggered for user ${uid}`);

    try {
      // 1. Mark status as processing in database to block concurrent attempts
      await db.collection("failedWallets").doc(uid).update({
        walletStatus: "processing",
        walletError: null,
      });

      // 2. Extract registration params
      const email = afterData.userEmail || afterData.email;
      const phonenumber = afterData.userPhone || afterData.phonenumber;
      const firstName = afterData.firstName;
      const lastName = afterData.lastName;
      const country = afterData.country || "NG";

      if (!email || !phonenumber || !firstName || !lastName) {
        throw new Error(
          "Missing required registration parameters on user document.",
        );
      }

      // 3. Create Flutterwave Subaccount
      const walletResult = await createWallet(
        email,
        phonenumber,
        firstName,
        lastName,
        country,
        uid,
      );

      if (walletResult && walletResult.status === "success") {
        logger.info(
          `[Trigger] Payout subaccount successfully created/synced for ${uid}`,
        );

        // 4. Create Static Virtual Account for local transfers (using the subaccount reference)
        const virtualResult = await createVirtualAccount(
          walletResult.accountReference,
          uid,
        );

        if (virtualResult && virtualResult.status === "success") {
          logger.info(
            `🎉 [Trigger] Subaccount and static virtual account fully configured for ${uid}`,
          );
          //delete that particular doc from failedWallets
          await db.collection("failedWallets").doc(uid).delete()
        } else {
          throw new Error(
            `Virtual static account setup failed: ${virtualResult.message}`,
          );
        }
      } else {
        throw new Error(
          `Subaccount wallet registration failed: ${walletResult?.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      logger.error(
        `❌ [Trigger] Retry failed for user ${uid}: ${error.message}`,
      );

      // 6. Record failure to DB but clear trigger flag so we can trigger again in the future
      await db.collection("failedWallets").doc(uid).update({
        walletStatus: "failed",
        walletError: error.message,
        retryWalletCreation: false,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return null;
  },
);

/**
 * ------------------------------------------------------------------
 * 🌐 FLOW 2: MANUAL RETRY BUTTON (HTTPS CALLABLE FUNCTION)
 * ------------------------------------------------------------------
 * Call this directly from your admin dashboard or profile page.
 * Securely executes the repair pipeline instantly for the passed 'targetUid'.
 */
exports.manualRetryWalletCreation = onCall(
  {
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    // Ensure the caller is authenticated
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "This execution requires admin authentication.",
      );
    }

    const { targetUid } = request.data;
    if (!targetUid) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required 'targetUid' parameter.",
      );
    }

    logger.info(
      `🌐 Manual callable override triggered by operator ${request.auth.uid} for target user ${targetUid}`,
    );

    try {
      const userDoc = await db.collection("users").doc(targetUid).get();
      if (!userDoc.exists) {
        throw new HttpsError(
          "not-found",
          "User document does not exist in Firestore database.",
        );
      }

      const userData = userDoc.data() || {};
      const email = userData.userEmail || userData.email;
      const phonenumber = userData.userPhone || userData.phonenumber;
      const firstName = userData.firstName;
      const lastName = userData.lastName;
      const country = userData.country || "NG";

      if (!email || !phonenumber || !firstName || !lastName) {
        throw new HttpsError(
          "failed-precondition",
          "Target user document has incomplete registration parameters.",
        );
      }

      // Set processing flag
      await db.collection("users").doc(targetUid).update({
        walletStatus: "processing",
        walletError: null,
      });

      // Run subaccount generator
      const walletResult = await createWallet(
        email,
        phonenumber,
        firstName,
        lastName,
        country,
        targetUid,
      );

      if (walletResult && walletResult.status === "success") {
        // Run static virtual account generator
        const virtualResult = await createVirtualAccount(
          walletResult.accountReference,
          targetUid,
        );

        if (virtualResult && virtualResult.status === "success") {
          await db.collection("users").doc(targetUid).update({
            walletStatus: "success",
            retryWalletCreation: false,
            walletError: null,
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          return {
            status: "success",
            message: "Subaccount and static account successfully repaired.",
            accountReference: walletResult.accountReference,
          };
        } else {
          throw new Error(`Virtual account failed: ${virtualResult.message}`);
        }
      } else {
        throw new Error(`Subaccount wallet failed: ${walletResult?.message}`);
      }
    } catch (error) {
      logger.error(
        `❌ [Callable] Manual override failed for user ${targetUid}: ${error.message}`,
      );

      // Save error states
      await db.collection("users").doc(targetUid).update({
        walletStatus: "failed",
        walletError: error.message,
        retryWalletCreation: false,
      });

      throw new HttpsError(
        "internal",
        error.message || "Failed to configure wallet subaccount during retry.",
      );
    }
  },
);

/**
 * ------------------------------------------------------------------
 * 🛠️ UTILITY API SERVICE MODULES
 * ------------------------------------------------------------------
 * Refined wrappers with integrated exponential backoffs, rate-limiting,
 * timeouts, and email collision lookup functions.
 */

// Exponential backoff configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 10000; // 10 seconds

const isRetryableError = (error, response) => {
  if (error?.name === "AbortError" || error?.code === "ECONNRESET") return true;
  if (response && (response.status >= 500 || response.status === 429))
    return true;

  const msg = error?.message || "";
  if (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("ENOTFOUND")
  ) {
    return true;
  }
  return false;
};

const calculateDelay = (attempt) => {
  const exponentialDelay = BASE_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Anti-thundering herd randomness
  return Math.min(exponentialDelay + jitter, MAX_DELAY);
};

// 1. CREATE SUBACCOUNT
async function createWallet(
  email,
  phonenumber,
  firstName,
  lastName,
  country,
  uid,
) {
  const payload = {
    account_name: `${firstName} ${lastName}`,
    email,
    country: country,
    mobilenumber: phonenumber,
    bank_code: "035", // default routing code (Wema Bank)
  };

  const makeRequestWithRetry = async (attempt = 0) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s network timeout

    try {
      logger.info(
        `[createWallet] Attempt ${attempt + 1}/${MAX_RETRIES + 1} for user ${uid}`,
      );

      const res = await fetch(
        "https://api.flutterwave.com/v3/payout-subaccounts",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text();
        let errorJson = {};
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {}

        logger.warn(
          `[createWallet] HTTP ${res.status} on attempt ${attempt + 1}: ${errorText}`,
        );

        // 🌟 COLLISION HANDLING: Email already exists on Flutterwave
        if (
          errorJson?.message === "Email already exists" ||
          errorText.includes("Email already exists")
        ) {
          logger.info(
            `[createWallet] Email already exists. Resolving from Flutterwave's subaccount list...`,
          );
          return await resolveExistingWallet(email, uid);
        }

        // Retry if it's a transient server issue or rate limit
        if (isRetryableError(null, res) && attempt < MAX_RETRIES) {
          const delay = calculateDelay(attempt);
          await new Promise((r) => setTimeout(r, delay));
          return makeRequestWithRetry(attempt + 1);
        }

        throw new Error(
          `HTTP ${res.status}: ${errorJson?.message || errorText}`,
        );
      }

      const wallet = await res.json();

      if (wallet.status === "success") {
        await db
          .collection("users")
          .doc(uid)
          .update({
            accountReference: wallet?.data?.account_reference,
            barter_id: wallet?.data?.barter_id || null,
          });

        return {
          status: "success",
          accountReference: wallet?.data?.account_reference,
        };
      } else {
        throw new Error(
          wallet.message || "Unknown error creating payout subaccount.",
        );
      }
    } catch (error) {
      clearTimeout(timeout);

      if (error?.message?.includes("Email already exists")) {
        return await resolveExistingWallet(email, uid);
      }

      if (
        attempt < MAX_RETRIES &&
        (error.name === "AbortError" || isRetryableError(error))
      ) {
        const delay = calculateDelay(attempt);
        logger.warn(
          `[createWallet] Retryable catch block error (attempt ${attempt + 1}): ${error.message}. Retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        return makeRequestWithRetry(attempt + 1);
      }

      throw error;
    }
  };

  return await makeRequestWithRetry();
}

// 2. RETRIEVE SUBACCOUNT ON COLLISION
async function resolveExistingWallet(email, uid) {
  const existing = await getWallets(email);
  if (existing.status === "success") {
    await db
      .collection("users")
      .doc(uid)
      .update({
        accountReference: existing.accountReference,
        barter_id: existing.barter_id || null,
        accountNumber: existing.accountNumber || null,
      });
    return {
      status: "success",
      accountReference: existing.accountReference,
    };
  } else {
    throw new Error(
      `Email collision detected, and automated lookups failed: ${existing.message}`,
    );
  }
}

// 3. CREATE STATIC VIRTUAL ACCOUNT
async function createVirtualAccount(accountReference, uid) {
  const makeRequestWithRetry = async (attempt = 0) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      logger.info(
        `[createVirtualAccount] Attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${uid}`,
      );

      const res = await fetch(
        `https://api.flutterwave.com/v3/payout-subaccounts/${accountReference}/static-account?currency=NGN`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text();
        if (isRetryableError(null, res) && attempt < MAX_RETRIES) {
          const delay = calculateDelay(attempt);
          await new Promise((r) => setTimeout(r, delay));
          return makeRequestWithRetry(attempt + 1);
        }
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const wallet = await res.json();

      if (wallet.status === "success") {
        await db
          .collection("users")
          .doc(uid)
          .update({
            accountNumber: wallet?.data?.static_account || null,
            bankName: wallet?.data?.bank_name || null,
            bankCode: wallet?.data?.bank_code || null,
          });

        return {
          status: "success",
          accountNumber: wallet?.data?.static_account,
        };
      } else {
        throw new Error(
          wallet.message || "Unknown error creating static virtual account.",
        );
      }
    } catch (error) {
      clearTimeout(timeout);
      if (
        attempt < MAX_RETRIES &&
        (error.name === "AbortError" || isRetryableError(error))
      ) {
        const delay = calculateDelay(attempt);
        await new Promise((r) => setTimeout(r, delay));
        return makeRequestWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  return await makeRequestWithRetry();
}

// 4. GET ALL SUBACCOUNTS TO RE-SYNC BY EMAIL
async function getWallets(email) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      "https://api.flutterwave.com/v3/payout-subaccounts",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const info = await res.json();
    if (info.status === "success") {
      const data = info.data || [];
      const userWallet = data.find((usr) => usr.email === email);
      if (!userWallet) {
        return {
          status: "error",
          message: "Subaccount details not found on Flutterwave's ledger.",
        };
      }
      return {
        status: "success",
        accountReference: userWallet.account_reference,
        barter_id: userWallet.barter_id || null,
        accountNumber: userWallet.nuban || null,
      };
    }
    return {
      status: "error",
      message: info.message || "Failed to search subaccounts.",
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      status: "error",
      message: error.message || "Timeout querying subaccounts.",
    };
  }
}

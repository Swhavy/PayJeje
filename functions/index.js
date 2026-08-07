/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import EnvVar from "./var.js";
import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import { Resend } from "resend";
//import { doc, updateDoc, increment } from "firebase/firestore";
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
//import logger from "firebase-functions/logger";
import * as logger from "firebase-functions/logger";
import dotenv from "dotenv";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
//import chromium from "chrome-aws-lambda";
//import puppeteer from "puppeteer-core";
import * as functions from "firebase-functions";
import { type } from "node:os";
//import { user } from "firebase-functions/v1/auth";
//import { log } from "console";
//import CryptoJS from 'crypto-js'
//import { setDoc } from 'firebase/firestore'

admin.initializeApp();
const db = admin.firestore();

// admin.projectConfigManager().updateProjectConfig({
//   multiFactorConfig: {
//     providerConfigs: [{
//       state: "ENABLED",
//       totpProviderConfig: {
//         adjacentIntervals: 5 // accept codes from ±5 windows (handles clock drift)
//       }
//     }]
//   }
// });

//dotenv.config();

//const FLW_SECRET_KEY = defineSecret("FLW_SECRET_KEY");
const FLW_SECRET_KEY = new EnvVar("FLW_MSECRET_KEY");
const FLW_WEBHOOK_HASH = new EnvVar("FLW_WEBHOOK_HASH");
//const FLW_WEBHOOK_HASH = defineSecret("FLW_WEBHOOK_HASH");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

export const flutterwaveWebhook = onRequest(async (req, res) => {
  const payload = req.body;
  // if (payload.data.status == "fail") {
  //   return logger.error(
  //     "webhook event payment returned with a failed payload state:",
  //     payload,
  //   );
  // }
  logger.info("Received webhook payload:", payload);
  const flwHash = FLW_WEBHOOK_HASH.value();
  const receivedHash = req.headers["verif-hash"];
  if (!receivedHash || receivedHash !== flwHash) {
    return res.status(401).send("says it is Unauthorized");
  }

  const tx_ref = payload?.data["tx_ref"]
    ? payload?.data["tx_ref"]
    : payload?.data["reference"];
  const tx_refParts = tx_ref.split("-");
  const userID = tx_refParts[1] || null;

  //userRef
  // const userSnapshot = await db
  //   .collection('users')
  //   .where('email', '==', email)
  //   .limit(1)
  //   .get()

  const transactionData = payload.data;

  if (payload.event) {
    //BVN Verification
    if (payload.event == "bvn.completed") {
      let q = await db
        .collection("users")
        .where("nameOnCard", "==", transactionData["bvn_data"]["nameOnCard"])
        .limit(1)
        .get();
      if (!q.empty) res.status(200).send("success");
      const { data } = payload;
      await db
        .collection("users")
        .doc(userID)
        .collection("KYC")
        .doc("bvnGenerated")
        .set(
          {
            firstName: data["first_name"],
            lastName: data["last_name"],
            status: data["status"],
            email: data["bvn_data"]["email"],
            gender: data["bvn_data"]["gender"],
            DOB: data["bvn_data"]["dateOfBirth"],
            tel1: data["bvn_data"]["phoneNumber1"],
            tel2: data["bvn_data"]["phoneNumber2"],
            maritalStatus: data["bvn_data"]["maritalStatus"],
            stateOfOrigin: data["bvn_data"]["stateOfOrigin"],
            lgaOfResidence: data["bvn_data"]["lgaOfResidence"],
            stateOfResidence: data["bvn_data"]["stateOfResidence"],
            nin: data["bvn_data"]["nin"],
            nameOnCard: data["bvn_data"]["nameOnCard"],
            ["createdAt"]: admin.firebase.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    // payments
    else if (payload.event == "charge.completed") {
      //idempotency
      let q = await db
        .collection("users")
        .doc(userID)
        .collection("Transactions")
        .where("flw_ref", "==", transactionData.flw_ref)
        .limit(1)
        .get();

      if (!q.empty) res.status(200).send("success");

      await db
        .collection("users")
        .doc(userID)
        .collection("Transactions")
        .doc(tx_ref)
        .set(
          {
            ...transactionData,
            createdAt: admin.firestore.Timestamp.fromDate(
              new Date(transactionData.createdAt),
            ),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      logger.info("transaction recorded:", transactionData);
    } // end of payments

    // Withdrawal
    else if (payload.event == "transfer.completed") {
      const txDocRef = db
        .collection("users")
        .doc(userID)
        .collection("Transactions")
        .doc(tx_ref);

      const existingDoc = await txDocRef.get();
      const incomingStatus = transactionData.status; // NEW | PENDING | INITIATED | SUCCESSFUL | FAILED | CANCELLED
      const timedOutAndStillPending =
        existingDoc.exists &&
        existingDoc.data()?.failureReason === "Request timed out" &&
        incomingStatus === "PENDING";

      // Idempotency: skip if this exact status was already recorded
      if (
        (existingDoc.exists && existingDoc.data().status === incomingStatus) ||
        timedOutAndStillPending
      ) {
        logger.info(
          "Duplicate webhook ignored, status unchanged:",
          tx_ref,
          incomingStatus,
        );
        return res.status(200).send("success");
      }

      const isCredit = transactionData.debit_currency === "PSA";
      const isTerminalSuccess = incomingStatus === "SUCCESSFUL";
      const isTerminalFailure =
        incomingStatus === "FAILED" || incomingStatus === "CANCELLED";
      const wasAlreadyTerminal =
        existingDoc.exists &&
        ["SUCCESSFUL", "FAILED", "CANCELLED"].includes(
          existingDoc.data().status,
        );

      try {
        await db.runTransaction(async (t) => {
          const userRef = db.collection("users").doc(userID);
          const userSnap = await t.get(userRef);

          if (!userSnap.exists) {
            throw new Error(`User ${userID} not found`);
          }

          // Guard: never touch balance if this tx already reached a terminal state before
          if (!wasAlreadyTerminal) {
            if (isTerminalSuccess) {
              // Withdrawal succeeded — balance was already deducted at queue time, nothing to do here
              // (Only credit flows would increment here)
              if (isCredit) {
                t.set(
                  userRef,
                  {
                    walletBalance: admin.firestore.FieldValue.increment(
                      transactionData.amount,
                    ),
                  },
                  { merge: true },
                );
              }
            } else if (isTerminalFailure && !isCredit) {
              // Withdrawal failed/cancelled — refund the amount that was deducted upfront
              t.set(
                userRef,
                {
                  walletBalance: admin.firestore.FieldValue.increment(
                    transactionData.amount,
                  ),
                },
                { merge: true },
              );
            }
          }

          t.set(
            txDocRef,
            {
              ...transactionData,
              type: isCredit ? "inflow" : "outflow",
              status: incomingStatus,
              failureReason: isTerminalFailure
                ? (transactionData.provider_response ?? null)
                : existingDoc.exists
                  ? (existingDoc.data().failureReason ?? null)
                  : null,
              createdAt: existingDoc.exists
                ? existingDoc.data().createdAt
                : admin.firestore.Timestamp.fromDate(
                    new Date(transactionData.created_at),
                  ),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });

        logger.info(
          `transaction ${tx_ref} updated to status ${incomingStatus}`,
        );
        return res.status(200).send("success");
      } catch (err) {
        logger.error("Failed to process transfer.completed:", err);
        return res.status(500).send("error");
      }
    } // end of payments

    //bills payment
    else if (payload.event == "singlebillpayment.status") {
      await db
        .collection("users")
        .doc(userID)
        .collection("Transactions")
        .doc(tx_ref)
        .set(
          {
            narration: "bill",
            ...transactionData,
            createdAt: admin.firestore.Timestamp.fromDate(
              new Date(transactionData.createdAt),
            ),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      logger.info("bills payment completed:", transactionData);
    } //end of bills payment
  }

  res.status(200).send("success");
  logger.info(
    "Complete yeah, first cloud functions written yeah you all😊👌",
    tx_ref,
  );
  return console.log("console data you all", tx_ref);
});

// const encryption = (BVN, key) => {
//   const encryptedKey = CrptoJS.enc.utf8.parse(key)

//   const mainEncryption = CryptoJS.AES.encrypt(
//     JSON.stringify(BVN),
//     encryptedKey,
//     {
//       mode: CryptoJS.mode.ECB,
//       padding: CryptoJS.pad.Pkcs7,
//     }
//   )

//   return mainEncryption.toString()
// }

export const initiateBVNConsent = onCall(async (req, context) => {
  const { firstname, lastname, bvn, redirectURL } = req.data;

  //API timeout Controller
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout

  //encryption(BVN, process.env.FLW_ENCRYPTION_KEY)

  try {
    const res = await fetch(
      "https://api.flutterwave.com/v3/bvn/verifications",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstname,
          lastname,
          bvn,
          redirectURL,
        }),
        signal: controller.signal, // Attached the abort signal
      },
    );
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    console.log("yeah this is from BVNCOnsent context: ", context.auth);
    logger.info("yeah this is from BVNCOnsent context: ", context.auth);
    return res.json();
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error initiating BVN consent:", error);
    return { status: "error", message: "Failed to initiate BVN consent" };
  }
});

//wallet functions
const createWallet = async (
  email,
  phonenumber,
  firstName,
  lastName,
  country,
  uid,
) => {
  if (!email || !phonenumber || !firstName || !lastName || !country || !uid)
    return logger.error("Missing required parameters for createWallet");

  const payload = {
    account_name: `${firstName} ${lastName}`,
    email,
    country: country,
    mobilenumber: phonenumber,
    bank_code: "035",
  };
  console.log("hey wallet dets", payload);
  // Retry configuration
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 second
  const MAX_DELAY = 10000; // 10 seconds

  // Helper function to determine if error is retryable
  const isRetryableError = (error, response) => {
    // Network errors and timeouts are retryable
    if (error?.name === "AbortError" || error?.code === "ECONNRESET")
      return true;

    // 5xx server errors are retryable
    if (response && response.status >= 500) return true;

    // 429 rate limiting is retryable
    if (response && response.status === 429) return true;

    // Connection errors
    if (
      response?.message?.includes("Validation error") ||
      error?.message?.includes("fetch failed") ||
      error?.message?.includes("network") ||
      error?.message?.includes("ENOTFOUND")
    )
      return true;

    return false;
  };

  // Exponential backoff with jitter
  const calculateDelay = (attempt) => {
    const exponentialDelay = BASE_DELAY * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
    return Math.min(exponentialDelay + jitter, MAX_DELAY);
  };

  // Main retry logic
  const makeRequestWithRetry = async (attempt = 0) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 20000); // 20 seconds timeout

    try {
      logger.info(
        `Creating wallet attempt ${attempt + 1}/${
          MAX_RETRIES + 1
        } for user ${uid}`,
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

      // Check for HTTP errors
      if (!res.ok) {
        const errorText = await res.text();

        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
          logger.error("Flutterwave validation error:", errorJson);
        } catch {
          logger.error("Flutterwave returned non-JSON:", errorText);
        }

        logger.warn(
          `HTTP ${res.status} error on attempt ${attempt + 1}: ` + errorText,
        );

        // If it's a retryable error and we have retries left
        if (isRetryableError(null, res) && attempt < MAX_RETRIES) {
          const delay = calculateDelay(attempt);
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return makeRequestWithRetry(attempt + 1);
        }
        if (errorJson?.message === "Email already exists") {
          logger.info(
            "Email already exists, fetching existing wallet to store to the DB",
          );
          const fetchWallets = await getWallets(email);

          if (fetchWallets?.status === "success") {
            logger.info("successfully fetched existing wallets");
            await db.collection("users").doc(uid).update({
              accountReference: fetchWallets?.accountReference,
              barter_id: fetchWallets?.barter_id,
              accountNumber: fetchWallets?.accountNumber,
            });
            return {
              status: "success",
              message: "Wallet created successfull",
              accountReference: fetchWallets?.accountReference,
            };
          } else {
            throw new Error(
              `error occured while fetching existing wallets: ${fetchWallets?.message}`,
            );
          }
        }

        // If not retryable or no retries left, throw error
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const wallet = await res.json();

      if (wallet.status === "success") {
        logger.info(
          `Wallet created successfully for user ${uid} on attempt ${
            attempt + 1
          }`,
        );

        // Update database
        await db.collection("users").doc(uid).update({
          accountReference: wallet?.data?.account_reference,
          barter_id: wallet?.data?.barter_id,
        });

        return {
          status: "success",
          message: "Wallet created successfully",
          accountReference: wallet?.data?.account_reference,
          attempt: attempt + 1, // Include attempt info for monitoring
        };
      } else {
        const errorMsg = wallet.message || "Unknown error from Flutterwave";
        logger.warn(
          `Wallet creation failed on attempt ${attempt + 1}: ` + errorMsg,
        );

        // Check if this is a retryable API error (you may want to customize this based on Flutterwave's error codes)
        if (
          attempt < MAX_RETRIES &&
          (errorMsg.includes("timeout") ||
            errorMsg.includes("temporarily unavailable") ||
            errorMsg.includes("Validation error") ||
            errorMsg.includes("try again"))
        ) {
          const delay = calculateDelay(attempt);
          logger.info(`Retrying in ${delay}ms due to API error: ` + errorMsg);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return makeRequestWithRetry(attempt + 1);
        }

        // Non-retryable API error or max retries reached
        throw new Error(`API Error: ${errorMsg}`);
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error?.message === "Email already exists" && attempt < MAX_RETRIES) {
        logger.info(
          "Email already exists, fetching existing wallet to store to the DB",
        );
        const fetchWallets = await getWallets(email);

        if (fetchWallets?.status === "success") {
          logger.info("successfully fetched existing wallets");
          await db.collection("users").doc(uid).update({
            accountReference: fetchWallets?.accountReference,
            barter_id: fetchWallets?.barter_id,
            accountNumber: fetchWallets?.nuban,
          });
          return {
            status: "success",
            message: "Wallet created successfully",
            accountReference: fetchWallets?.accountReference,
          };
        } else {
          throw new Error(
            `error occured while fetching existing wallets: ${fetchWallets?.message}`,
          );
        }
      } else if (error.name === "AbortError") {
        logger.warn(
          `Request timeout on attempt ${attempt + 1} for user ${uid}`,
        );

        if (attempt < MAX_RETRIES) {
          const fetchWallets = await getWallets(email);
          logger.info(
            "fetching wallets to search for user before hitting retry logic ",
            fetchWallets,
          );
          if (fetchWallets?.status === "success") {
            logger.info("successfully fetched wallets");
            await db.collection("users").doc(uid).update({
              accountReference: fetchWallets?.accountReference,
              barter_id: fetchWallets?.barter_id,
              accountNumber: fetchWallets?.accountNumber,
            });
            return {
              status: "success",
              message: "Wallet created successfull",
              accountReference: fetchWallets?.accountReference,
            };
          } else {
            logger.info("error fetching wallets");
            const delay = calculateDelay(attempt);
            logger.info(`Retrying in ${delay}ms after timeout: ` + error);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return makeRequestWithRetry(attempt + 1);
          }
        }
      } else if (isRetryableError(error) && attempt < MAX_RETRIES) {
        logger.warn(
          `Retryable error on attempt ${attempt + 1}:`,
          error.message,
        );
        const delay = calculateDelay(attempt);
        logger.info(`Retrying in ${delay}ms: ` + error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return makeRequestWithRetry(attempt + 1);
      }

      // Either not retryable or max retries reached
      logger.error(`Final error after ${attempt + 1} attempts:`, error);
      await db
        .collection("failedWallets")
        .doc(uid)
        .set(
          {
            ...payload,
            walletStatus: "idle",
            retryWalletCreation: true,
            walletError: error.message,
          },
          { merge: true },
        );
      throw error;
    }
  };

  // Execute the request with retry logic
  try {
    return await makeRequestWithRetry();
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        status: "error",
        message: "Request timed out after multiple attempts",
        attempts: MAX_RETRIES + 1,
      };
    }

    return {
      status: "error",
      message: "Failed to create wallet after multiple attempts: " + error,
      error: error.message,
      attempts: MAX_RETRIES + 1,
    };
  }
};

//create virtual account

const createVirtualAccount = async (accountReference, uid) => {
  if (!accountReference)
    return logger.error("Missing required parameters for virtual account");

  // Retry configuration
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 second
  const MAX_DELAY = 10000; // 10 seconds

  // Helper function to determine if error is retryable
  const isRetryableError = (error, response) => {
    // Network errors and timeouts are retryable
    if (error?.name === "AbortError" || error?.code === "ECONNRESET")
      return true;

    // 5xx server errors are retryable
    if (response && response.status >= 500) return true;

    // 429 rate limiting is retryable
    if (response && response.status === 429) return true;

    // Connection errors
    if (
      response?.message?.includes("Validation error") ||
      error?.message?.includes("fetch failed") ||
      error?.message?.includes("network") ||
      error?.message?.includes("ENOTFOUND")
    )
      return true;

    return false;
  };

  // Exponential backoff with jitter
  const calculateDelay = (attempt) => {
    const exponentialDelay = BASE_DELAY * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
    return Math.min(exponentialDelay + jitter, MAX_DELAY);
  };

  // Main retry logic
  const makeRequestWithRetry = async (attempt = 0) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 seconds timeout

    try {
      logger.info(
        `Creating Virtual wallet attempt ${attempt + 1}/${
          MAX_RETRIES + 1
        } for user ${uid}`,
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

      // Check for HTTP errors
      if (!res.ok) {
        const errorText = await res.text();
        logger.warn(
          `HTTP ${res.status} error on attempt ${attempt + 1}:`,
          errorText,
        );

        // If it's a retryable error and we have retries left
        if (isRetryableError(null, res) && attempt < MAX_RETRIES) {
          const delay = calculateDelay(attempt);
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return makeRequestWithRetry(attempt + 1);
        }

        // If not retryable or no retries left, throw error
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const wallet = await res.json();

      if (wallet.status === "success") {
        logger.info(
          `Virtual Wallet created successfully for user ${uid} on attempt ${
            attempt + 1
          }`,
          wallet,
        );

        // Update database
        await db.collection("users").doc(uid).update({
          accountNumber: wallet?.data?.static_account,
          bankName: wallet?.data?.bank_name,
          bankCode: wallet?.data?.bank_code,
        });

        return {
          status: "success",
          message: "Virtual created successfully",
          accountReference: wallet?.data?.account_reference,
          attempt: attempt + 1, // Include attempt info for monitoring
        };
      } else {
        const errorMsg = wallet.message || "Unknown error from Flutterwave";
        logger.warn(
          `Virtual Wallet creation failed on attempt ${attempt + 1}:`,
          errorMsg,
        );

        // Check if this is a retryable API error (you may want to customize this based on Flutterwave's error codes)
        if (
          attempt < MAX_RETRIES &&
          (errorMsg.includes("timeout") ||
            errorMsg.includes("temporarily unavailable") ||
            errorMsg.includes("Validation error") ||
            errorMsg.includes("try again"))
        ) {
          const delay = calculateDelay(attempt);
          logger.info(`Retrying in ${delay}ms due to API error...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return makeRequestWithRetry(attempt + 1);
        }

        // Non-retryable API error or max retries reached
        throw new Error(`API Error: ${errorMsg}`);
      }
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === "AbortError") {
        logger.warn(
          `Request timeout on attempt ${attempt + 1} for user ${uid} `,
          error,
        );

        if (attempt < MAX_RETRIES) {
          const delay = calculateDelay(attempt);
          logger.info(`Retrying in ${delay}ms after timeout: `, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return makeRequestWithRetry(attempt + 1);
        }
      } else if (isRetryableError(error) && attempt < MAX_RETRIES) {
        logger.warn(
          `Retryable error on attempt ${attempt + 1}: `,
          error.message,
        );
        const delay = calculateDelay(attempt);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return makeRequestWithRetry(attempt + 1);
      }

      // Either not retryable or max retries reached
      logger.error(`Final error after ${attempt + 1} attempts:`, error);
      throw error;
    }
  };

  // Execute the request with retry logic
  try {
    return await makeRequestWithRetry();
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        status: "error",
        message: "Request timed out after multiple attempts",
        error: error.message,
        attempts: MAX_RETRIES + 1,
      };
    }

    return {
      status: "error",
      message: "Failed to create wallet after multiple attempts ",
      error: error.message,
      attempts: MAX_RETRIES + 1,
    };
  }
};

//Cloudfunction to retry wallet creation failures
export const onUserWalletRetryTrigger = onDocumentWritten(
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
      const email = afterData.email || afterData.email;
      const phonenumber = afterData.mobilenumber || afterData.phonenumber;
      const firstName = afterData.account_name.split(" ")[0];
      const lastName = afterData.account_name.split(" ")[1];
      const country = afterData.country;

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
          await db.collection("failedWallets").doc(uid).delete();
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

//Fetch PSA(Wallets)
export const getWallets = async (email) => {
  //API timeout Controller
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout

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
        signal: controller.signal, // Attached the abort signal
      },
    );
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const info = await res.json();
    if (info.status === "success") {
      const data = info.data;
      const userWallet = await data.find((usr) => usr.email === email);
      if (!userWallet)
        return {
          status: "error",
          message: "could not find user details in wallet search",
        };
      return {
        status: "success",
        message: "Wallet fetched successfully",
        accountReference: userWallet?.account_reference,
        barter_id: userWallet?.barter_id,
        accountNumber: userWallet?.nuban,
      };
    } else {
      return { status: "error", message: "API error, Failed to fetch Wallets" };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error fetching wallets:", error);
    return { status: "error", message: "Failed to fetch wallets" };
  }
};

//Wallet Balances

export const fetchBalance = onCall(async (req, context) => {
  const uid = req.auth.uid;
  const payload = req.data;
  if (!uid || !payload)
    return { status: "error", message: "Unauthorized request" };
  const { accountReference } = payload;
  if (!accountReference)
    return { status: "error", message: "Missing account reference" };
  logger.info(`fetching wallet balance for user ${accountReference}`);
  const url = `https://api.flutterwave.com/v3/payout-subaccounts/${accountReference}/balances`;
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const response = await res.json();
    if (
      response?.status == "success" &&
      response?.message == "Subaccount balance fetched"
    ) {
      logger.info("wallet fetched", response);
      //insert to DB"
      await db.collection("users").doc(uid).update({
        walletBalance: response?.data?.available_balance,
        lastBalanceCheck: admin.firestore.FieldValue.serverTimestamp(),
      });
      // return info to the clientside
      return {
        status: "success",
        walletBalance: response?.data?.available_balance,
      };
    } else {
      logger.error(`unsuccessful wallet fetch because ${response.message}`);
      return { status: "error", message: response.message };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave Wallet fetch API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error fetching wallet balance:", error);
    return { status: "error", message: error.message };
  }
});

//Withdrawal
// export const withdraw = onCall(async (req, context) => {
//   const uid = req.auth.uid;
//   const payload = req.data;
//   if (!uid || !payload)
//     return { status: "error", message: "Unauthorized request" };
//   const { account_bank, account_number, amount, debit_subaccount } = payload;
//   if (!account_bank || !account_number || !amount || !debit_subaccount)
//     return { status: "error", message: "Missing some payloads" };
//   logger.info(`withdrawing to user's account ${account_number}`);
//   const url = `https://api.flutterwave.com/v3/transfers`;
//   //API timeout Controller
//   const controller = new AbortController();
//   const timeout = setTimeout(() => {
//     controller.abort();
//   }, 5000); // 5 seconds timeout
//   try {
//     const walletRef = db.collection("users").doc(uid);
//     await db.runTransaction(async (transaction) => {
//       const walletDoc = await transaction.get(walletRef);
//       if (!walletDoc.exists)
//         return { status: "error", message: "Can't identify user in the DB" };

//       const currentBalance = walletDoc.data().walletBalance;
//       console.log(walletDoc.data());
//       if (currentBalance < amount){
//          throw new Error("Insufficient wallet balance for withdrawal");
//       }
//     });
//     const res = await fetch(url, {
//       method: "POST",
//       headers: {
//         accept: "application/json",
//         Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         ...payload,
//         currency: "NGN",
//         debit_currency: "NGN",
//         reference: `PayWaka-${uid}-${Date.now()}`,
//       }),
//       signal: controller.signal, // Attached the abort signal
//     });
//     clearTimeout(timeout); // Clear the timeout if the request completes in time
//     const response = await res.json();
//     console.log("withdrawal Data: ", response);
//     if (
//       response?.status == "success" &&
//       response?.message == "Transfer Queued Successfully"
//     ) {
//       logger.info("withdrawal pending", response);
//       //insert to DB"
//       await db
//         .collection("users")
//         .doc(uid)
//         .update({
//           walletBalance: admin.firestore.FieldValue.increment(-amount),
//         });
//       await db
//         .collection("users")
//         .doc(uid)
//         .collection("Transactions")
//         .doc(response?.data?.reference)
//         .set({
//           ...response.data,
//           status: "pending", // Mark as pending until confirmed by webhook
//           tx_ref: response.data.reference,
//           transactionType: "withdrawal",
//         });
//       // return info to the clientside
//       return {
//         status: "success",
//         message: "Transfer Pending",
//       };
//     } else {
//       await db
//         .collection("users")
//         .doc(uid)
//         .collection("Transactions")
//         .doc(response?.data?.reference)
//         .set({
//           ...response.data,
//           tx_ref: response.data.reference, //To make implementation uniform especially for webHook Idempotency check
//           transactionType: "withdrawal",
//         });
//       console.log("unsuccessful wallet withdrawal", response);
//       return { status: "error", message: response.message, response };
//     }
//   } catch (error) {
//     if(error.message === "Insufficient wallet balance for withdrawal") {
//       logger.error("Error withdrawing from wallet balance:", error);
//       return { status: "error", message: error.message };
//     }
//     else if (error.name === "AbortError") {
//       logger.error(
//         "🔥 Timeout: Flutterwave Wallet withdrawal API took too long to respond: ",
//         error,
//       );
//       return { status: "error", message: "Request timed out" };
//     }
//     logger.error("Error withdrawing from wallet balance:", error);
//     return { status: "error", message: "Sorry an error occured" };
//   }
// });

//new
export const withdraw = onCall(async (req, context) => {
  const uid = req.auth?.uid;
  const payload = req.data;
  if (!uid || !payload)
    return { status: "error", message: "Unauthorized request" };

  const { account_bank, account_number, amount, debit_subaccount } = payload;
  if (!account_bank || !account_number || !amount || !debit_subaccount)
    return { status: "error", message: "Missing some payloads" };

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0)
    return { status: "error", message: "Invalid withdrawal amount" };

  logger.info(`withdrawing to user's account ${account_number}`);

  const reference = `PayWaka-${uid}-${Date.now()}`;
  const walletRef = db.collection("users").doc(uid);

  // Atomically check balance AND debit in one transaction
  try {
    await db.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists) {
        throw new Error("USER_NOT_FOUND");
      }

      const currentBalance = walletDoc.data().walletBalance ?? 0;
      if (currentBalance < numericAmount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      transaction.update(walletRef, {
        walletBalance: admin.firestore.FieldValue.increment(-numericAmount),
      });
    });
  } catch (error) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      return {
        status: "error",
        message: "Insufficient wallet balance for withdrawal",
      };
    }
    if (error.message === "USER_NOT_FOUND") {
      logger.error("Withdrawal attempted for unknown user:", uid);
      return { status: "error", message: "Can't identify user in the DB" };
    }
    logger.error("Error debiting wallet:", error);
    return { status: "error", message: "Sorry, an error occurred" };
  }

  // Balance is now debited. Record a pending transaction BEFORE calling Flutterwave,
  // so there's a record even if the fetch never completes.
  await db
    .collection("users")
    .doc(uid)
    .collection("Transactions")
    .doc(reference)
    .set({
      tx_ref: reference,
      amount: numericAmount,
      account_bank,
      account_number,
      status: "pending",
      transactionType: "withdrawal",
      type: "outflow",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); //15secs Timeout;

  try {
    const res = await fetch("https://api.flutterwave.com/v3/transfers", {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_bank,
        account_number,
        amount: numericAmount,
        debit_subaccount,
        narration: payload.narration,
        currency: "NGN",
        debit_currency: "NGN",
        reference,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const response = await res.json();
    console.log("withdrawal Data:", response);

    if (
      response?.status === "success" &&
      response?.message === "Transfer Queued Successfully"
    ) {
      logger.info("withdrawal pending", response);
      await db
        .collection("users")
        .doc(uid)
        .collection("Transactions")
        .doc(reference)
        .set({ ...response.data, status: "pending" }, { merge: true });

      return {
        status: "success",
        message: "Transfer Pending",
        reference: reference,
      };
    }

    // Flutterwave rejected the request outright — refund immediately, no need to wait for a webhook
    await walletRef.update({
      walletBalance: admin.firestore.FieldValue.increment(numericAmount),
    });
    await db
      .collection("users")
      .doc(uid)
      .collection("Transactions")
      .doc(reference)
      .set({ ...(response?.data ?? {}), status: "FAILED" }, { merge: true });

    console.log("unsuccessful wallet withdrawal", response);
    return {
      status: "error",
      message:
        response?.message ?? "The withdrawal failed, but you've been refunded",
    };
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      await db
        .collection("users")
        .doc(uid)
        .collection("Transactions")
        .doc(reference)
        .set(
          {
            status: "PENDING",
            failureReason: "Request timed out, awaiting webhook confirmation",
          },
          { merge: true },
        );
      logger.error(
        "🔥 Timeout: Flutterwave withdrawal API took too long:",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }

    // Refund since we debited upfront but the request to Flutterwave never confirmed
    await walletRef.update({
      walletBalance: admin.firestore.FieldValue.increment(numericAmount),
    });
    await db
      .collection("users")
      .doc(uid)
      .collection("Transactions")
      .doc(reference)
      .set({ status: "FAILED", errorReason: error.message }, { merge: true });
    logger.error("Error withdrawing from wallet balance:", error);
    return { status: "error", message: "Sorry, an error occurred" };
  }
});
//end
//fetch Banks details(bank codes, Bank names available for withdrawals)
export const fetchBanks = onCall(async (req, context) => {
  const uid = req.auth.uid;
  if (!uid) return { status: "error", message: "Unauthorized request" };

  logger.info("fetching banks infos for user");
  const url = "https://api.flutterwave.com/v3/banks/NG?include_provider_type=1";
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000); // 15 seconds timeout
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const response = await res.json();
    if (
      response?.status == "success" &&
      response?.message == "Banks fetched successfully"
    ) {
      logger.info("wallet fetched");
      // return info to the clientside
      return {
        status: "success",
        message: "Banks fetched successfully",
        bankDetails: response?.data,
      };
    } else {
      logger.error(`unsuccessful banks fetch because ${response.message}`);
      return { status: "error", message: response.message };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave Banks fetch API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error fetching Banks Info:", error);
    return { status: "error", message: error.message };
  }
});

//confirm Account details before user make a transfer/withdrawal
export const confirmAccountDetails = onCall(async (req, context) => {
  const uid = req.auth.uid;
  const payload = req.data;
  if (!uid || !payload)
    return { status: "error", message: "Unauthorized request" };
  const { account_bank, account_number } = payload;
  if (!account_bank || !account_number)
    return { status: "error", message: "Missing some payloads" };
  logger.info(`confirming account details for user ${uid}`);
  try {
    const response = await fetch(
      "https://api.flutterwave.com/v3/accounts/resolve",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number,
          account_bank,
        }),
      },
    );

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.message || "Account resolution failed");
    }

    return data.data; // { account_number, account_name }
  } catch (err) {
    console.error("Account resolve error:", err);
    throw err;
  }
});

//end of wallet functions

export const paymentRedirect = onCall(async (req, context) => {
  const { email, phonenumber, name, amount, userID } = req.data;
  const payload = {
    tx_ref: `PayWaka-${userID}-${Date.now()}`,
    amount,
    currency: "NGN",
    redirect_url: "http://localhost:8080/paymentSuccesful",
    customer: {
      email,
      name,
      phonenumber,
    },
    customizations: {
      title: "Paywaka Payment Page",
    },
    configurations: {
      session_duration: 30, // Session timeout in minutes (maxValue: 1440)
      max_retry_attempt: 5, // Max retry (int)
    },
  };

  //API timeout Controller
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout

  //encryption(BVN, process.env.FLW_ENCRYPTION_KEY)

  try {
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    console.log("yeah this is from PaymentUI context: ", context.auth);
    logger.info("yeah this is from PaymentUI context: ", context.auth);
    return res.json();
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error initiating Payment:", error);
    return { status: "error", message: "Failed to initiate Payment" };
  }
});

//Verification of payment status before value is given to a user
export const verifyTransactionStatus = onCall(async (req, context) => {
  const payload = req.data;
  const expectedAmount = 50; //payload.amount;
  const tx_id = payload.tx_id;
  const url = `https://api.flutterwave.com/v3/transactions/${tx_id}/verify`;
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const data = await res.json();
    console.log("Transaction verification response:", data);
    if (
      data.status == "success" &&
      data.data.amount == expectedAmount &&
      data.data.currency == "NGN"
    ) {
      // return info to the clientside
      logger.info("Transaction verification successful:", data);
      return {
        status: "success",
        message: "Transaction verified successfully",
      };
    }
    console.log("verify", data.status, data.data.amount, data.data.currency);
    return logger.info(
      "Transaction verification unsuccessful as data mismatch:",
      data,
    );
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave Transaction verification API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error verifying transaction status:", error);
    return { status: "error", message: "Failed to verify transaction status" };
  }
});

//Fetching bills info
export const billsFetch = onCall(async (req, context) => {
  const payload = req.data;
  const billerCode = payload.billerCode;
  const url = `https://api.flutterwave.com/v3/billers/${billerCode}/items`;
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const data = await res.json();
    logger.info("successfully fetched bills info:", data);
    // return info to the clientside
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave bills fetch API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error fetching bills:", error);
    return { status: "error", message: "Failed to fetch bills" };
  }
});

//payout Bill core function
const payoutBillCore = async (
  network,
  uid,
  billType,
  country,
  customer_id,
  amount,
  reference,
  billerCode,
  itemCode,
) => {
  if (
    !network ||
    !country ||
    !customer_id ||
    !amount ||
    !reference ||
    !billerCode ||
    !itemCode ||
    !billType
  )
    return logger.error("Missing required parameters for payoutBillCore");
  //const callback_url = `https://ca2554e253b1.ngrok-free.app/payoutsuccessfullmodule`;
  const url = `https://api.flutterwave.com/v3/billers/${billerCode}/items/${itemCode}/payment`;
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        country: country,
        customer_id: customer_id,
        amount: amount,
        reference: reference,
        //callback_url: callback_url,
      }),
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const data = await res.json();
    logger.info("topup dets", data.message);
    if (data.status == "success") {
      logger.info("successfully payed out bills:", data);
      //store Data to DB
      if (billType && data.data.amount) {
        await db
          .collection("users")
          .doc(uid)
          .collection("Transactions")
          .doc(data.data["tx_ref"])
          .set(
            {
              status: "successful",
              narration: billType,
              ...data.data,
            },
            { merge: true },
          );
        await db
          .collection("users")
          .doc(uid)
          .collection("bills")
          .doc(data.data["tx_ref"])
          .set(
            {
              billType,
              network: data.data.network,
              tx_ref: data.data["tx_ref"],
              amount: data.data.amoumt,
              customerId: data.data["phone_number"],
              status: "successful",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
      // return info to the clientside
      return { status: "successful", message: "successfully payed out bill" };
    } else {
      const tx_ref = reference;
      if (billType) {
        await db
          .collection("users")
          .doc(uid)
          .collection("Transactions")
          .doc(tx_ref)
          .set(
            {
              status: "failed",
              narration: billType,
              ...data.data,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        await db
          .collection("users")
          .doc(uid)
          .collection("bills")
          .doc(tx_ref)
          .set(
            {
              billType,
              network,
              tx_ref,
              amount,
              customerId: customer_id,
              status: "failed",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
      logger.error("Error occured while paying bills:", data.message);
      // return info to the clientside
      return { status: "error", message: "Failed to pay bills" };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave bills payment API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error paying bills:", error);
    return { status: "error", message: "Failed to pay bills" };
  }
};

//validate the user's customer ID core Function
const validateCustomerCore = async (itemCode, customerID) => {
  const url = `https://api.flutterwave.com/v3/bill-items/${itemCode}/validate?customer=${customerID}`;
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const data = await res.json();
    if (data.status == "success") {
      logger.info("successfully validated customer Details:", data);
      return {
        status: "success",
        message: "Customer validated successfully",
        provider: data.data.name,
      };
    } else {
      logger.error("Customer validation failed:", data);
      return {
        status: "error",
        message: "Customer validation failed",
      };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave customerId verification API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error verifying customerId:", error);
    return {
      status: "error",
      message: "Failed to verify customerId",
    };
  }
};

//validate the user's customer ID before paying out bill to them
export const validateCustomer = onCall(async (req, context) => {
  const payload = req.data;

  if (!payload) {
    logger.error("No payload provided for customer validation");
    return { status: "error", message: "No payload provided" };
  }

  const { itemCode, customerID } = payload;
  if (!itemCode || !customerID) {
    logger.error("payload particulars empty for customer validation");
    return { status: "error", message: "No payload provided" };
  }
  try {
    logger.info("Validating customer with itemCode:", itemCode, customerID);
    const res = await validateCustomerCore(itemCode, customerID);
    logger.info("Customer validation result:", res);
    console.log("Console Customer validation result:", res);
    if (res.status === "success") {
      return {
        status: "success",
        message: "customerID successfully verified",
        provider: res.provider,
      };
    } else {
      return { status: "error", message: "Customer validation failed" };
    }
  } catch (error) {
    logger.error("Error validating customer:", error.message);
    return { status: "error", message: "Failed to validate customer" };
  }
});

//Fetching paying out bill to customer
export const payoutBill = onCall(async (req, context) => {
  const payload = req.data;
  const country = payload.country;
  const network = payload.network;
  const uid = payload.uid;
  const customer_id = payload.customerID;
  const amount = payload.amount;
  const billType = payload.billType;
  //const userID = payload.userID
  //same as the refernce that was used to pay for the bill on the payment page but now has an extra _(1) at the end
  const reference = `${payload.reference}-one`;
  const billerCode = payload.billerCode;
  const itemCode = payload.itemCode;

  try {
    await payoutBillCore(
      network,
      uid,
      billType,
      country,
      customer_id,
      amount,
      reference,
      billerCode,
      itemCode,
    );
  } catch (error) {
    logger.error("Error paying out bill:", error);
  }
});

//Fetching paying out bill to customer
export const verifyBillPaymentStatus = onCall(async (req, context) => {
  const payload = req.data;
  const reference = payload.rawTx_Ref;
  //same as the refernce that was used to pay for the bill on the payment page but now has an extra _(1) at the end
  //const tx_ref = payload.ref
  const url = `https://api.flutterwave.com/v3/bills/PayWaka-EBOpxIuxxwUkdCi1cBtkKDzq7cV2-1754159103042?verbose=1`;
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const data = await res.json();
    logger.info(
      "successfully fetched bill payment status:",
      data,
      "payload: " + reference,
    );
    // return info to the clientside
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave bills verification payment status API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error verifying bills payment status:", error);
    return {
      status: "error",
      message: "Failed to verify bills payment status",
    };
  }
});

//Bills History
export const billHistory = onCall(async (req, context) => {
  const payload = req.data;
  const { from, to, status, category, pageStart } = payload;
  //same as the refernce that was used to pay for the bill on the payment page but now has an extra _(1) at the end
  //const tx_ref = payload.ref
  const url = `https://api.flutterwave.com/v3/bills/history?status=${status}&from=${from}&to=${to}&page=${pageStart}&limit=10&category=${category}`;
  //API timeout Controller
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 seconds timeout
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY.value()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attached the abort signal
    });
    clearTimeout(timeout); // Clear the timeout if the request completes in time
    const data = await res.json();
    if (data.status == "success") {
      logger.info("successfully fetched bills history");
      return {
        status: "success",
        message: "successfully fetched bills history",
        data: data.data,
        totalPages: data.meta["page_info"]["total_pages"],
        currentPages: data.meta["page_info"]["current_page"],
      };
    }
    logger.error("error occured", data);
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        "🔥 Timeout: Flutterwave bills Transactions History API took too long to respond: ",
        error,
      );
      return { status: "error", message: "Request timed out" };
    }
    logger.error("Error fetching bills history:", error);
    return {
      status: "error",
      message: "Failed to fetch bills transactions history",
    };
  }
});

// export const generateReceipt = functions.https.onCall(async (req, context) => {
//   const { id, uid, type } = req.data; // 👈 default to pdf
//   if (!id || !uid) {
//     throw new functions.https.HttpsError(
//       "invalid-argument",
//       "Missing ID or UID",
//     );
//   }

//   const url = `https://8e1eedb2e578.ngrok-free.app/Receipts/${id}/${uid}`;
//   let browser;

//   try {
//     const isLocal =
//       process.env.FUNCTIONS_EMULATOR === "true" ||
//       process.env.NODE_ENV !== "production";

//     if (isLocal) {
//       const puppeteerLocal = await import("puppeteer");
//       browser = await puppeteerLocal.launch({
//         headless: true,
//         args: ["--no-sandbox", "--disable-setuid-sandbox"],
//       });
//     } else {
//       browser = await puppeteer.launch({
//         args: chromium.args,
//         executablePath: await chromium.executablePath,
//         headless: chromium.headless,
//       });
//     }

//     const page = await browser.newPage();
//     await page.setUserAgent("PuppeteerBot/1.0");

//     // Load page
//     await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

//     // Wait until spinner (if exists) is hidden
//     try {
//       await page.waitForSelector(".spinner", { hidden: true, timeout: 60000 });
//     } catch {
//       console.log("No spinner detected or already hidden.");
//     }

//     // Wait for receipt container
//     await page.waitForSelector(".receipt", { visible: true, timeout: 60000 });
//     const receiptElement = await page.$(".receipt");
//     if (!receiptElement) {
//       throw new Error("Receipt container not found or not visible.");
//     }

//     // Get bounding box (works for both modes)
//     const boundingBox = await receiptElement.boundingBox();
//     if (!boundingBox) {
//       throw new Error("Failed to get receipt bounding box.");
//     }

//     let fileBase64;

//     if (type === "image") {
//       // Boost resolution before screenshot
//       await page.setViewport({
//         width: 1200,
//         height: 800,
//         deviceScaleFactor: 2, // try 3 for even sharper
//       });

//       const boundingBox = await receiptElement.boundingBox();
//       if (!boundingBox) {
//         throw new Error("Failed to get receipt bounding box.");
//       }

//       const pngBuffer = await page.screenshot({
//         type: "png",
//         omitBackground: false,
//         clip: {
//           x: boundingBox.x,
//           y: boundingBox.y,
//           width: Math.min(boundingBox.width, page.viewport().width),
//           height: Math.min(boundingBox.height, page.viewport().height),
//         },
//       });

//       fileBase64 = pngBuffer.toString("base64");
//     } else {
//       // Cropped PDF matching receipt size
//       const pdfBuffer = await page.pdf({
//         printBackground: true,
//         width: `${boundingBox.width}px`,
//         height: `${boundingBox.height}px`,
//         pageRanges: "1",
//       });

//       fileBase64 = Buffer.from(pdfBuffer).toString("base64");
//     }

//     await browser.close();
//     return { success: true, id, type, file: fileBase64 };
//   } catch (err) {
//     if (browser) await browser.close();
//     console.error("Error generating receipt:", err);
//     throw new functions.https.HttpsError(
//       "internal",
//       err.message || "Puppeteer error",
//     );
//   }
// });

//Ref Logic
const generateRandomCode = () => {
  let length = 6;
  let char = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += char.charAt(Math.floor(Math.random() * char.length));
  }
  return `PWK-${res}`;
};

const getUniqueCode = async () => {
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
  return +Date.now().toString(36);
};

export const handleNewRefferal = onDocumentCreated(
  {
    document: "users/{userId}",
    timeoutSeconds: 300,
    memory: "512MiB",
    retry: true,
  },
  async (event) => {
    const snapshot = event.data;
    const data = event.data.data();
    logger.info("New user signup detected, processing referral...", snapshot);
    if (!snapshot) {
      console.log("No data associated with the event");
      return null;
    }
    const userData = snapshot.data();

    const uid = event.params.userId;

    //Create User Preferences
    const userPreferences = await db
      .collection("users")
      .doc(uid)
      .collection("preferences")
      .doc(uid)
      .set(
        {
          email: true,
          push: true,
          sms: false,
          marketing: true,
          surveys: true,
          rewards: true,
          loginAlerts: false,
          sessionTimeout: null,
        },
        { merge: true },
      );
    const twoFactor = db
      .collection("users")
      .doc(uid)
      .set({ twoFactor: false }, { merge: true });
    const walletCreate = await createWallet(
      userData.userEmail,
      userData.userPhone,
      userData.firstName,
      userData.lastName,
      "NG",
      uid,
    );
    if (walletCreate && walletCreate.status === "success") {
      logger.info("virtual Wallet args:", walletCreate);
      const virtualAccount = await createVirtualAccount(
        walletCreate?.accountReference,
        uid,
      );
      if (virtualAccount && virtualAccount.status === "success") {
        logger.info("Virtual account created successfully for user:", uid);
      } else {
        logger.error(
          "Error creating virtual account for user:",
          virtualAccount.message,
          "and" + virtualAccount.error,
        );
      }
    }
    if (walletCreate && walletCreate.status === "error") {
      logger.error("Error creating wallet for user:", walletCreate.message);
    }
    logger.info("New user created:", uid, userData);

    //if the user has no referralCode assign one to them
    if (!userData.referralCode) {
      const newCode = await getUniqueCode();
      await db.collection("users").doc(uid).update({ referralCode: newCode });
    }

    //If the new user signed up with a referral code get the snapshot of the user that referred
    const referredByCode = userData.referredBy || null;
    if (!referredByCode) {
      await db.collection("users").doc(uid).update({ referralHandled: true });
      return null;
    }

    const referrerSnapShot = await db
      .collection("users")
      .where("referralCode", "==", referredByCode)
      .limit(1)
      .get();

    if (referrerSnapShot.empty) {
      await db.collection("users").doc(uid).update({
        referralHandled: true,
        referredByInvalid: true,
        referredBy: referredByCode, // keep original used code for auditing
      });
      return null;
    }

    //if the referrerSnapShot is not empty extract the uid of the referrer from the snapshot
    const referrerDoc = referrerSnapShot.docs[0];
    const referrerId = referrerDoc.id;
    //firstLink Uid  refers to the person that referred the referrer(i.e the referrer is the person that just recently referred)
    const firstLinkUid = referrerDoc.data()?.referredByUid;

    //avoid users referring themselves
    if (referrerId === uid) {
      await db.collection("users").doc(uid).update({
        referralHandled: true,
        selfReferralBlocked: true,
      });
      return null;
    }

    //check  if the new user has been referred in the past.
    const existingReferral = await db
      .collection("Referrals")
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
    // We do this inside a transaction so the operations are atomic(To keep data consistent throughout)
    try {
      await db.runTransaction(async (tx) => {
        //new user doc ref
        const newUserLastLogRef = db
          .collection("users")
          .doc(uid)
          .collection("lastLogin")
          .doc("details01");
        //get the referrer's user data from the DB
        const referrerDoc = db.collection("users").doc(referrerId);
        //referrer's Referral Records
        const referrerRefDocs = db
          .collection("users")
          .doc(referrerId)
          .collection("referrals")
          .doc(uid);
        const referrerPstDoc = db
          .collection("users")
          .doc(referrerId)
          .collection("points")
          .doc();

        // prepare a referral document if the user exists (stores the relation + status)
        const referralRef = db.collection("referrals").doc(); // auto-id

        const referrerSnap = await tx.get(referrerDoc);

        if (!referrerSnap.exists)
          throw new Error("The referrer does not exists");

        if (firstLinkUid) {
          const firstLinkRef = db
            .collection("users")
            .doc(firstLinkUid)
            .collection("referrals")
            .doc(referrerId);
          tx.set(
            firstLinkRef,
            { points: admin.firestore.FieldValue.increment(20) },
            { merge: true },
          );
        }

        tx.set(referralRef, {
          referrerId: referrerId, // uid of who referred
          referredId: uid, // new user's uid
          status: "pending", // pending until we successfully deliver the 1GB
          package: "₦100", // reward package
          rewardType: "airtime",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // increment referrer's referralsCount
        tx.update(referrerDoc, {
          refferalsCount: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(20),
          lastReferralAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        //document users past referrals to display the user's referrals stats and assign 20points each time a user successfully referes
        tx.set(
          referrerPstDoc,
          {
            type: "referrals",
            points: 20,
            referredId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        tx.set(
          newUserLastLogRef,
          {
            refferredBy: referrerId,
          },
          { merge: true },
        );

        //this document shows some important details of a referred person in the db of the person who referred
        tx.set(
          referrerRefDocs,
          {
            name: data.userName,
            points: 0,
            email: data.userEmail,
            referredOn: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        // enqueue data top-up request — this will be processed by a separate function
        const topupRef = db.collection("airtimeTopupRequests").doc(); // auto-id
        // create a simple idempotency key to avoid double top-ups (referrerId + referredId + timestamp)
        const idempotencyKey = `${referrerId}_${uid}_${Date.now()}`;

        tx.set(topupRef, {
          referrerId: referrerId, // who will receive the data
          userPhone: referrerSnap.data().userPhone || null, // phone to top-up; must be set on referrer's profile
          amount: "₦100", // requested package
          status: "pending", // will transition to success/failed
          referraldocId: referralRef.id, // Id of the particular referral doc
          referrerId: referrerId, // uid of who referred
          idempotencyKey: idempotencyKey,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // mark the new user's doc as handled and record the referrerUid for easy lookup later
        const newUserRef = db.collection("users").doc(uid);
        tx.update(newUserRef, {
          referredByUid: referrerId,
          referralHandled: true,
        });
      }); //end of transaction
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
    //done
    return null;
  },
);

export const processAirtimeTopupRequest = onDocumentCreated(
  "airtimeTopupRequests/{reqId}",
  async (event) => {
    // request data
    const snapshot = event.data;
    const req = snapshot.data();
    if (!req) {
      logger.error("No data associated with the event");
      return null;
    }
    const reqRef = event.params.reqId;

    logger.info("Processing new data top-up request...", req);

    // simple validation: you need a phone to top-up
    if (!req.userPhone) {
      // update request and referral to failed so you can fix caller data later
      await db.collection("airtimeTopupRequests").doc(reqRef).update({
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

    try {
      //validate the referrer's network provider
      const validate = await validateCustomerCore("AT099", req.userPhone);
      let network;
      let billerCode;
      let itemCode;
      const country = "NG";
      const reference = req.idempotencyKey;
      const customer_id = req.userPhone;
      const amount = 100; //₦100 airtime

      if (validate.status !== "success") {
        // await reqRef.update({});
        logger.error(`Customer validation failed ${req.userPhone}:`, validate);
        return null;
      } else if (validate.status === "success") {
        network = validate.provider;
        switch (network) {
          case "MTN":
            billerCode = "BIL099";
            itemCode = "AT099";
            break;
          case "AIRTEL":
            billerCode = "BIL100";
            itemCode = "AT100";
            break;
          case "GLO":
            billerCode = "BIL102";
            itemCode = "AT102";
            break;
          default: //9mobile
            billerCode = "BIL103";
            itemCode = "AT103";
            break;
        }
      }
      //end of validation of the referrer's network provider
      logger.info(
        "billerCode, itemCode, network:",
        "billler: " + billerCode,
        "itemCode: " + itemCode,
        "network: " + network,
      );

      const resp = await payoutBillCore(
        network,
        req.referrerId,
        "airtime",
        country,
        customer_id,
        amount,
        reference,
        billerCode,
        itemCode,
      );

      // if success, update request + referral status, write reward entry
      logger.info("Top-up response:", resp.message);
      if (resp.data && resp.status === "success") {
        // mark top-up request success
        await db
          .collection("airtimeTopupRequests")
          .doc(reqRef)
          .update({
            status: "success",
            providerReference: resp.data.reference || null,
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
            type: "Airtime",
            amount: "₦100",
            referraldocId: req.referraldocId || null, //link to the referrals record
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            providerReference: resp.data.reference || null,
          });
      } else {
        //later try to add a bill pay retry here
        // vendor returned but indicated failure — persist the full response for debugging
        logger.error("Top-up failed:", resp.message);
        await db
          .collection("airtimeTopupRequests")
          .doc(reqRef)
          .update({
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
      await db
        .collection("airtimeTopupRequests")
        .doc(reqRef)
        .update({
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
  },
);

const streak = async (dates) => {
  console.log("Dates yoo", dates);
  const sorted = dates
    .map((d) => new Date(d).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);

  let streak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const current = sorted[i];

    const diff = Math.abs((current - prev) / (1000 * 60 * 60 * 24));

    if (diff === 1) streak++;
    else {
      break;
    }
  }
  return streak;
};

//checking
export const checkin = onCall(async (req, context) => {
  //block access if user is not logged in
  //users ID
  const { id } = req.data;
  const uid = id;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action.",
    );
  }

  //server Time
  const now = admin.firestore.Timestamp.now().toDate();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const startOfMonthDate = new Date(year, month - 1, 1);
  startOfMonthDate.setHours(0, 0, 0, 0);
  const startOfNextMonthDate = new Date(year, month, 1);
  startOfNextMonthDate.setHours(0, 0, 0, 0);
  const startOfMonth = admin.firestore.Timestamp.fromDate(startOfMonthDate);
  const startOfNextMonth =
    admin.firestore.Timestamp.fromDate(startOfNextMonthDate);

  const dateId = now.toISOString().split("T")[0];
  logger.info("now " + now);
  //checkin document ref
  const checkinRef = db
    .collection("users")
    .doc(uid)
    .collection("points")
    .doc(dateId);

  const existing = await checkinRef.get();
  //prevent a user from checking in twice a day
  if (existing.exists) {
    throw new HttpsError("already-exists", "Already checked in today");
  }

  await checkinRef.set({
    type: "checkin",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    year,
    month,
    day,
    // streak: CalcStreak,
  });
  logger.info("hey passed here");
  const user = db.collection("users").doc(uid);
  let points = 0;
  const q = await db
    .collection("users")
    .doc(uid)
    .collection("points")
    .where("type", "==", "checkin")
    .where("createdAt", ">=", startOfMonth)
    .where("createdAt", "<", startOfNextMonth)
    .orderBy("createdAt", "asc")
    .get();
  const dateArray = q.docs.map((d) => d.data().createdAt.toDate());
  const days = q.docs.map((d) => d.data().day);
  logger.info(`query details: ${dateArray} ${month}`);
  const CalcStreak = await streak(dateArray);

  switch (CalcStreak) {
    case 20:
      points = 2000;
      await db
        .collection("users")
        .doc(uid)
        .collection("points")
        .doc(dateId)
        .set(
          {
            points,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      await user.set(
        {
          streak: CalcStreak,
          points: admin.firestore.FieldValue.increment(points),
        },
        { merge: true },
      );
      break;

    default:
      points = 1;
      await db
        .collection("users")
        .doc(uid)
        .collection("points")
        .doc(dateId)
        .set(
          {
            points,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      await user.set(
        {
          streak: CalcStreak,
          points: admin.firestore.FieldValue.increment(points),
        },
        { merge: true },
      );
      break;
  }

  //get the uid of the person that referred this user
  const userSnapshot = await user.get();
  if (userSnapshot.exists) {
    const userData = userSnapshot.data();
    //the referrerUid here is the same Uid as the firstLinkUid in the handleNewReferral Code block
    const referrerUid = userData?.referredByUid;
    referrerUid
      ? db
          .collection("users")
          .doc(referrerUid)
          .collection("referrals")
          .doc(uid)
          .set(
            { points: admin.firestore.FieldValue.increment(points) },
            { merge: true },
          )
      : null;
  }

  // if (CalcStreak === 20) {
  //   points = 2000;
  //   db.collection("users")
  //     .doc(uid)
  //     .collection("streakRewards")
  //     .doc(dateId)
  //     .set({
  //       points: 2000,
  //       createdAt: admin.firestore.FieldValue.serverTimestamp(),
  //     });
  // }

  //store the data in the db
  //await user.set({ streak: CalcStreak, points: admin.firestore.FieldValue.increment(points)}, { merge: true });

  logger.info("checkin done");
  return { status: "success", date: dateId };
});

export const getServerTime = onCall(async (data) => {
  const now = admin.firestore.Timestamp.now().toDate();
  now.setHours(0, 0, 0, 0);
  const dateId = now.toISOString().split("T")[0];
  console.log(dateId);
  logger.info("uid " + data.auth.uid);
  return { status: "success", serverDate: dateId };
});

export const userDPUpdate = onCall(async (req) => {
  const { uid, DP } = req.data;
  console.log(`DP param ${uid}-${DP}`);
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();
  try {
    if (userSnapshot.exists) {
      const referrerUid = userSnapshot.data()?.referredByUid;
      if (referrerUid) {
        db.collection("users")
          .doc(referrerUid)
          .collection("referrals")
          .doc(uid)
          .set({ dp: DP }, { merge: true });
        return {
          status: "success",
          message: "Profile pic updated sucessfully",
        };
      }
    }
    logger.info("No referrer for this user");
    return { status: "success", message: "No referrer" };
  } catch (err) {
    logger.error("userDp failed to push into the referrer DB", err);
    return {
      status: "failed",
      message:
        "something occured while trying to update your Profile Pic please try again",
    };
  }
});

const getLoginEmailHtml = ({ displayName, email, loginTime, signInMethod }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>New Login – PayWaka</title>
  </head>
  <body style="margin:0;padding:0;background-color:#060d18;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060d18;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

            <!-- Logo header -->
            <tr>
              <td align="center" style="padding-bottom:32px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#22c55e;border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                      <span style="font-size:22px;font-weight:700;color:#060d18;line-height:44px;">₦</span>
                    </td>
                    <td style="padding-left:10px;vertical-align:middle;">
                      <span style="font-size:24px;font-weight:700;color:#ffffff;">Pay</span><span style="font-size:24px;font-weight:700;color:#22c55e;">Waka</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background:#0d1b2a;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">

                <!-- Green top accent -->
                <div style="height:4px;background:#22c55e;"></div>

                <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 40px;">

                  <!-- Alert icon + heading -->
                  <tr>
                    <td style="padding-bottom:8px;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:rgba(34,197,94,0.12);border-radius:50%;width:48px;height:48px;text-align:center;vertical-align:middle;">
                            <span style="font-size:22px;line-height:48px;">🔐</span>
                          </td>
                          <td style="padding-left:14px;vertical-align:middle;">
                            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">New Login Detected</p>
                            <p style="margin:4px 0 0;font-size:13px;color:#6b8aad;">Security notification</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr><td style="padding:20px 0 24px;"><div style="height:1px;background:#1e3a5f;"></div></td></tr>

                  <!-- Greeting -->
                  <tr>
                    <td style="padding-bottom:20px;">
                      <p style="margin:0;font-size:15px;color:#c9d8e8;line-height:1.6;">
                        Hi <strong style="color:#ffffff;">${displayName ?? "there"}</strong>, a new sign-in was just recorded on your PayWaka account. Here are the details:
                      </p>
                    </td>
                  </tr>

                  <!-- Details block -->
                  <tr>
                    <td style="padding-bottom:28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;border-radius:10px;border:1px solid #1e3a5f;overflow:hidden;">
                        <tr>
                          <td style="padding:14px 20px;border-bottom:1px solid #1e3a5f;">
                            <p style="margin:0;font-size:11px;font-weight:600;color:#6b8aad;text-transform:uppercase;letter-spacing:1px;">Account</p>
                            <p style="margin:4px 0 0;font-size:14px;color:#ffffff;">${email}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:14px 20px;border-bottom:1px solid #1e3a5f;">
                            <p style="margin:0;font-size:11px;font-weight:600;color:#6b8aad;text-transform:uppercase;letter-spacing:1px;">Time</p>
                            <p style="margin:4px 0 0;font-size:14px;color:#ffffff;">${loginTime} (WAT)</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:14px 20px;">
                            <p style="margin:0;font-size:11px;font-weight:600;color:#6b8aad;text-transform:uppercase;letter-spacing:1px;">Sign-in method</p>
                            <p style="margin:4px 0 0;font-size:14px;color:#ffffff;">${signInMethod}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Safe notice -->
                  <tr>
                    <td style="padding-bottom:20px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(34,197,94,0.08);border-left:3px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;">
                        <tr>
                          <td>
                            <p style="margin:0;font-size:14px;color:#c9d8e8;line-height:1.6;">
                              If this was <strong style="color:#22c55e;">you</strong>, no action is needed. Enjoy PayWaka!
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Warning notice -->
                  <tr>
                    <td style="padding-bottom:32px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.08);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:14px 18px;">
                        <tr>
                          <td>
                            <p style="margin:0;font-size:14px;color:#c9d8e8;line-height:1.6;">
                              If this <strong style="color:#ef4444;">wasn't you</strong>, secure your account immediately.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- CTA -->
                  <tr>
                    <td align="center">
                      <a href="https://paywaka.com/auth/reset-password"
                        style="display:inline-block;background:#22c55e;color:#060d18;font-size:14px;font-weight:700;padding:13px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                        Secure My Account
                      </a>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:28px;">
                <p style="margin:0;font-size:12px;color:#3d5a73;line-height:1.6;">
                  You're receiving this because login alerts are enabled on your account.<br/>
                  To manage notification preferences, visit your
                  <a href="https://paywaka.com/settings/notifications" style="color:#6b8aad;text-decoration:underline;">account settings</a>.
                </p>
                <p style="margin:12px 0 0;font-size:11px;color:#2a3f54;">© ${new Date().getFullYear()} PayWaka · All rights reserved.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

///add your resend api key to firestore
export const loginNotification = beforeUserSignedIn(async (event) => {
  const user = event.data;

  if (!user.email) return;

  // check if user opted in for login alerts
  const prefSnap = await db
    .collection("users")
    .doc(user.uid)
    .collection("preferences")
    .doc(user.uid)
    .get();

  // grab all tokens for this user
  const tokensSnap = await db
    .collection("users")
    .doc(user.uid)
    .collection("fcmTokens")
    .get();

  if (!prefSnap.exists) {
    console.log(`No preferences doc found for ${user.uid}, skipping.`);
    return;
  }

  const { loginAlerts } = prefSnap.data();

  if (!loginAlerts) {
    console.log(`Login alerts disabled for ${user.uid}, skipping.`);
    return;
  }

  // send push notification to all tokens
  if (tokensSnap.exists && tokensSnap.size > 0) {
    const tokens = tokensSnap.docs.map((d) => d.data().token);
    if (!tokens.length) return;

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: "New login detected",
        body: "A new sign-in was recorded on your PayWaka account.",
      },
    });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  const resend = new Resend(RESEND_API_KEY);

  const loginTime = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    dateStyle: "full",
    timeStyle: "short",
  });

  const signInMethod = event.credential?.signInMethod ?? "Email & Password";

  const { error } = await resend.emails.send({
    //from: "PayWaka <noreply@paywaka.com>",
    from: "onboarding@resend.dev",
    to: user.email,
    subject: "New login to your PayWaka account",
    html: getLoginEmailHtml({
      displayName: user.displayName,
      email: user.email,
      loginTime,
      signInMethod,
    }),
  });

  if (error) {
    console.error("Resend failed to send login notification:", error);
  }
});

export const onUserLogin = onDocumentUpdated(
  "users/{uid}/lastLogin/details01",
  async (event) => {
    logger.info("see login det: ", event.data.after);
    const uid = event.params.uid;
    const data = event.data.after.data();
    const referrerId = data?.refferredBy;
    if (!referrerId) {
      //logger.info("event: ", event.data)
      return logger.warn(`No referrerID found for uid ${uid}`);
    }
    const referrerRef = db
      .collection("users")
      .doc(referrerId)
      .collection("referrals")
      .doc(uid);
    await referrerRef.set({ lastLogin: data?.lastLogin }, { merge: true });
  },
);

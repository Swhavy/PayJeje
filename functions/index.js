/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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
import crypto from "node:crypto";
import util from "node:util";
//import { user } from "firebase-functions/v1/auth";
//import { log } from "console";
//import CryptoJS from 'crypto-js'
//import { setDoc } from 'firebase/firestore'

import { EXCEL_COMPETITOR_PRICES } from "./excelPricingData.js";

if (!admin.apps.length) {
  admin.initializeApp();
}
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
export const PIN_PEPPER_SECRETS = {
  1: defineSecret("PIN_PEPPER_SECRET_V1"),
  // 2: defineSecret("PIN_PEPPER_SECRET_V2"),  // add when you rotate
};
export const PIN_PEPPER_SECRET = PIN_PEPPER_SECRETS[1];
const ALL_PIN_SECRETS = Object.values(PIN_PEPPER_SECRETS);

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

  const transactionData = payload.data || {};
  console.log("transaction occured: ", payload);
  const rawTxRef = transactionData["tx_ref"] || transactionData["reference"];
  const tx_ref = String(rawTxRef);

  const isInboundTransfer =
    payload.event === "transfer.completed" &&
    payload.data?.debit_currency === "PSA" &&
    payload.data?.narration === "WALLET FUNDING";

  let userID = null;

  if (isInboundTransfer) {
    // Strictly identify the receiving user by their dedicated Virtual Account Number (users.accountNumber)
    const acctNum =
      transactionData.account_number ||
      transactionData.account?.account_number ||
      transactionData.accountNumber ||
      transactionData.virtual_account_number;
    if (acctNum) {
      const acctQuery = await db
        .collection("users")
        .where("accountNumber", "==", String(acctNum).trim())
        .limit(1)
        .get();
      if (!acctQuery.empty) {
        userID = acctQuery.docs[0].id;
      }
    }
  } else {
    // For Outbound Transfers (Withdrawals): we control the tx_ref format (PWK-UID-TIMESTAMP)
    if (tx_ref.includes("-")) {
      const tx_refParts = tx_ref.split("-");
      const candidateUid = tx_refParts[1];
      if (candidateUid) {
        const checkUser = await db.collection("users").doc(candidateUid).get();
        if (checkUser.exists) {
          userID = candidateUid;
        }
      }
    }
  }

  if (payload.event) {
    // BVN Verification
    if (payload.event == "bvn.completed") {
      if (!userID) {
        logger.error(
          `BVN completed webhook received but userID could not be resolved. tx_ref=${tx_ref}`,
        );
        return res.status(200).send("User not found");
      }
      let q = await db
        .collection("users")
        .where("nameOnCard", "==", transactionData["bvn_data"]?.["nameOnCard"])
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
            firstName: data?.["first_name"],
            lastName: data?.["last_name"],
            status: data?.["status"],
            email: data?.["bvn_data"]?.["email"],
            gender: data?.["bvn_data"]?.["gender"],
            DOB: data?.["bvn_data"]?.["dateOfBirth"],
            tel1: data?.["bvn_data"]?.["phoneNumber1"],
            tel2: data?.["bvn_data"]?.["phoneNumber2"],
            maritalStatus: data?.["bvn_data"]?.["maritalStatus"],
            stateOfOrigin: data?.["bvn_data"]?.["stateOfOrigin"],
            lgaOfResidence: data?.["bvn_data"]?.["lgaOfResidence"],
            stateOfResidence: data?.["bvn_data"]?.["stateOfResidence"],
            nin: data?.["bvn_data"]?.["nin"],
            nameOnCard: data?.["bvn_data"]?.["nameOnCard"],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    // Inbound Payments / Card Charges
    else if (payload.event == "charge.completed") {
      if (!userID) {
        logger.error(
          `❌ [Webhook Error]: Could not resolve userID for charge.completed with tx_ref=${tx_ref}, account_number=${transactionData?.account_number}`,
          transactionData,
        );
        return res.status(200).send("User not found for charge");
      }

      const isSuccessful =
        String(transactionData.status || "").toLowerCase() === "successful";
      const creditAmount = Number(
        transactionData.amount ||
        transactionData.charged_amount ||
        transactionData.settlement_amount ||
        0,
      );
      const userRef = db.collection("users").doc(userID);
      const txDocRef = userRef.collection("Transactions").doc(tx_ref);

      const senderName =
        transactionData.fullname ||
        transactionData.customer?.name ||
        transactionData.meta?.sender_name ||
        "External Bank Transfer";
      const senderAccountNumber =
        transactionData.meta?.sender_account_number || "";
      const senderBankCode = transactionData.meta?.sender_bank_code || "";
      const recipientAccountNumber =
        transactionData.account_number ||
        transactionData.account?.account_number ||
        "";
      const recipientBankName = transactionData.bank_name || "Wema Bank PLC";

      try {
        await db.runTransaction(async (t) => {
          const userDoc = await t.get(userRef);
          if (!userDoc.exists) {
            throw new Error(`User ${userID} does not exist`);
          }
          const existingTx = await t.get(txDocRef);
          if (existingTx.exists && existingTx.data()?.status === "successful") {
            logger.info(
              `⚡ [Idempotent Webhook]: Transaction ${tx_ref} was already processed for user ${userID}`,
            );
            return;
          }

          if (isSuccessful && creditAmount > 0) {
            t.update(userRef, {
              walletBalance: admin.firestore.FieldValue.increment(creditAmount),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            logger.info(
              `💰 [Wallet Credited]: Added ₦${creditAmount} to user ${userID}'s wallet balance via inbound charge!`,
            );
          }

          t.set(
            txDocRef,
            {
              ...transactionData,
              tx_ref,
              flw_ref:
                transactionData.flw_ref || transactionData.reference || "",
              amount: creditAmount,
              fee: Number(transactionData.fee || 0),
              currency: transactionData.currency || "NGN",
              type: "credit",
              category: "Wallet Funding",
              senderName,
              senderAccountNumber,
              senderBankCode,
              recipientAccountNumber,
              recipientBankName,
              narration:
                transactionData.narration || `Transfer from ${senderName}`,
              status: isSuccessful
                ? "successful"
                : transactionData.status || "failed",
              createdAt:
                transactionData.created_at || transactionData.createdAt
                  ? admin.firestore.Timestamp.fromDate(
                    new Date(
                      transactionData.created_at || transactionData.createdAt,
                    ),
                  )
                  : admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });

        logger.info(
          `✅ [charge.completed processed successfully]: tx_ref=${tx_ref} for user ${userID}`,
        );
        return res.status(200).send("success");
      } catch (err) {
        logger.error(`❌ [charge.completed failed to process]:`, err);
        return res.status(200).send("success");
      }
    }

    // Transfers (Inbound PSA Funding & Outbound Withdrawals)
    else if (payload.event == "transfer.completed") {
      if (!userID) {
        logger.error(
          `❌ [Webhook Error]: Could not resolve userID for transfer.completed with tx_ref=${tx_ref}, account_number=${transactionData?.account_number}`,
          transactionData,
        );
        return res.status(200).send("User not found for transfer");
      }

      const isCredit =
        payload.event === "transfer.completed" &&
        transactionData.debit_currency === "PSA" &&
        transactionData.narration === "WALLET FUNDING";
      console.log(`${isCredit ? "💰 credit" : "💸 debit"} :` + transactionData);

      //for credits the tx_ref field is generated upon receiving the webhook
      const tx_ref = isCredit
        ? `PWK-${userID}-${Date.now()}`
        : transactionData?.reference;

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

      // 1. Idempotency Guard: skip if this exact status was already recorded
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

      const isTerminalSuccess = incomingStatus === "SUCCESSFUL";
      const isTerminalFailure =
        incomingStatus === "FAILED" || incomingStatus === "CANCELLED";
      const wasAlreadyTerminal =
        existingDoc.exists &&
        ["SUCCESSFUL", "FAILED", "CANCELLED"].includes(
          existingDoc.data().status,
        );

      const numAmount = Number(transactionData.amount || 0);
      const senderName =
        transactionData.fullname ||
        transactionData.meta?.sender_name ||
        (isCredit ? "External Bank Transfer" : "PayWaka User");
      const senderAccountNumber =
        transactionData.meta?.sender_account_number || "";
      const senderBankCode = transactionData.meta?.sender_bank_code || "";
      const recipientAccountNumber = transactionData.account_number || "";
      const recipientBankName =
        transactionData.bank_name || (isCredit ? "Wema Bank PLC" : "Bank");

      try {
        await db.runTransaction(async (t) => {
          const userRef = db.collection("users").doc(userID);
          const userSnap = await t.get(userRef);

          if (!userSnap.exists) {
            throw new Error(`User ${userID} not found`);
          }

          // 2. Transition Guard: never touch balance if this tx already reached a terminal state before
          if (!wasAlreadyTerminal) {
            if (isTerminalSuccess) {
              // Inbound transfer succeeded -> credit user's wallet
              if (isCredit && numAmount > 0) {
                t.update(userRef, {
                  walletBalance:
                    admin.firestore.FieldValue.increment(numAmount),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger.info(
                  `💰 [PSA Inbound Transfer]: Credited ₦${numAmount} to user ${userID}'s wallet!`,
                );
              }
            } else if (isTerminalFailure && !isCredit && numAmount > 0) {
              // Withdrawal failed/cancelled — refund the amount that was deducted upfront
              t.update(userRef, {
                walletBalance: admin.firestore.FieldValue.increment(numAmount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              logger.info(
                `🔄 [Withdrawal Refund]: Refunded ₦${numAmount} to user ${userID}'s wallet!`,
              );
            }
          }

          t.set(
            txDocRef,
            {
              ...transactionData,
              tx_ref,
              flw_ref:
                transactionData.reference || transactionData.flw_ref || "",
              amount: numAmount,
              fee: Number(transactionData.fee || 0),
              currency: transactionData.currency || "NGN",
              type: isCredit ? "inflow" : "outflow",
              category: isCredit ? "Wallet Funding" : "Withdrawal",
              senderName,
              senderAccountNumber,
              senderBankCode,
              recipientAccountNumber,
              recipientBankName,
              narration:
                transactionData.narration ||
                (isCredit
                  ? `Transfer from ${senderName}`
                  : `Withdrawal to ${recipientBankName}`),
              status: incomingStatus,
              failureReason: isTerminalFailure
                ? (transactionData.provider_response ?? null)
                : existingDoc.exists
                  ? (existingDoc.data().failureReason ?? null)
                  : null,
              createdAt: existingDoc.exists
                ? existingDoc.data().createdAt
                : transactionData.created_at || transactionData.createdAt
                  ? admin.firestore.Timestamp.fromDate(
                    new Date(
                      transactionData.created_at || transactionData.createdAt,
                    ),
                  )
                  : admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });

        logger.info(
          `transaction ${tx_ref} updated to status ${incomingStatus} for user ${userID}`,
        );
        return res.status(200).send("success");
      } catch (err) {
        logger.error("Failed to process transfer.completed:", err);
        return res.status(200).send("success");
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
export const createWallet = async (
  email,
  phonenumber,
  firstName,
  lastName,
  country,
  uid,
) => {
  if (!email || !phonenumber || !firstName || !lastName || !country || !uid)
    return logger.error("Missing required parameters for createWallet");

  if (process.env.FUNCTIONS_EMULATOR === "true" && (email.includes("@paywaka.demo") || email.includes("@paywaka.test"))) {
    return { status: "success", accountReference: `mock_ref_${uid}`, isMock: true };
  }

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
        `Creating wallet attempt ${attempt + 1}/${MAX_RETRIES + 1
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
          `Wallet created successfully for user ${uid} on attempt ${attempt + 1
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
        `Creating Virtual wallet attempt ${attempt + 1}/${MAX_RETRIES + 1
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
          `Virtual Wallet created successfully for user ${uid} on attempt ${attempt + 1
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
        message: "Wallet fetch successfully",
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
    if (!snapshot || typeof snapshot.data !== "function") {
      logger.info("No data associated with the event");
      return null;
    }
    const userData = snapshot.data();
    if (!userData) {
      logger.info("Empty user document snapshot, skipping.");
      return null;
    }
    logger.info("New user signup detected, processing referral...", snapshot);

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

// ==========================================
// LIVE BILLS PROVIDER INTEGRATION (CLUBKONNECT / NELLOBYTE)
// ==========================================

function getClubKonnectUserId() {
  return process.env.CLUBKONNECT_USER_ID;
}

function getClubKonnectApiKey() {
  return process.env.CLUBKONNECT_API_KEY;
}

function getClubKonnectNetworkCode(networkName) {
  if (!networkName) return "01";
  const name = String(networkName).toLowerCase();
  if (name.includes("mtn")) return "01";
  if (name.includes("glo")) return "02";
  if (name.includes("9mob") || name.includes("etisalat")) return "03";
  if (name.includes("airtel")) return "04";
  return "01";
}

function isClubKonnectOrderSuccess(res) {
  if (!res) return false;
  const status = String(res.status || "").toUpperCase();
  const statusCode = String(res.statuscode || "");
  const remark = String(
    res.remark || res.description || res.msg || "",
  ).toUpperCase();
  const orderId = res.orderid || res.order_id || res.OrderID;

  // 1. HARD FAILURE CHECKS: If remark or status explicitly mentions failure or invalid inputs, it is NEVER a success!
  if (
    remark.includes("INVALID") ||
    remark.includes("FAILED") ||
    remark.includes("DECLINED") ||
    remark.includes("UNSUCCESSFUL") ||
    remark.includes("ERROR") ||
    remark.includes("CANCELLED") ||
    remark.includes("REJECTED") ||
    remark.includes("NOT FOUND") ||
    remark.includes("INSUFFICIENT") ||
    remark.includes("LOW BALANCE") ||
    status.includes("FAIL") ||
    status.includes("CANCEL") ||
    status.includes("INVALID") ||
    status.includes("REJECT") ||
    status.includes("ERROR") ||
    status.includes("MISSING") ||
    statusCode === "400" ||
    statusCode === "404" ||
    statusCode === "500"
  ) {
    return false;
  }

  // 2. SUCCESS INDICATORS: Order was received/completed without failure remarks
  const hasSuccessStatus =
    status === "ORDER_RECEIVED" ||
    status === "ORDER_COMPLETED" ||
    status === "ORDER_ON_HOLD" ||
    status === "ORDER_PROCESSING" ||
    status === "SUCCESSFUL" ||
    status === "SUCCESS" ||
    status === "100" ||
    status === "200" ||
    statusCode === "100" ||
    statusCode === "200";

  return Boolean(orderId && hasSuccessStatus);
}

function isClubKonnectBalanceOutage(res) {
  if (!res) return false;
  const status = String(res.status || "").toUpperCase();
  const desc = String(
    res.description || res.msg || res.remark || "",
  ).toUpperCase();
  return (
    status.includes("INSUFFICIENT") ||
    status.includes("LOW_WALLET") ||
    status.includes("LOW_BALANCE") ||
    desc.includes("INSUFFICIENT") ||
    desc.includes("LOW BALANCE")
  );
}

function resolveProviderFailureReason(
  result,
  isProviderBalanceIssue,
  isNetworkOrHtmlError,
  defaultMsg = "Transaction failed",
) {
  if (isNetworkOrHtmlError) {
    return "Provider Connection Error / Invalid API Response";
  }
  if (isProviderBalanceIssue) {
    return "Insufficient Reseller Gateway Balance / Temporary Provider Maintenance";
  }
  const rawStatus = String(result?.status || "").toUpperCase();
  const rawDesc = String(
    result?.description || result?.remark || result?.msg || "",
  );
  const descUpper = rawDesc.toUpperCase();

  if (
    rawStatus.includes("INVALID_METER") ||
    descUpper.includes("INVALID METER") ||
    descUpper.includes("INVALID ACCOUNT") ||
    rawStatus.includes("METER_NOT_FOUND") ||
    descUpper.includes("METER NOT FOUND")
  ) {
    return "Invalid meter / account number. Please verify your meter details with your distribution company.";
  }
  if (
    rawStatus.includes("INVALID_SMARTCARD") ||
    descUpper.includes("SMARTCARD") ||
    rawStatus.includes("INVALID_IUC") ||
    descUpper.includes("INVALID IUC")
  ) {
    return "Invalid decoder / smartcard IUC number. Please verify your decoder details.";
  }
  if (
    rawStatus.includes("INVALID_PHONE") ||
    descUpper.includes("PHONE") ||
    descUpper.includes("INVALID MOBILE")
  ) {
    return "Invalid recipient phone number format.";
  }
  if (rawStatus.includes("INVALID_AMOUNT") || descUpper.includes("AMOUNT")) {
    return rawDesc || "Invalid purchase amount specified for this service.";
  }
  if (
    rawStatus.includes("MISSING_ORDERID") ||
    rawStatus.includes("ORDER_NOT_FOUND")
  ) {
    return (
      rawDesc ||
      "Provider gateway did not accept this transaction. Please verify your account/meter details."
    );
  }

  return (
    rawDesc ||
    (rawStatus !== "ORDER_COMPLETED" ? result?.status : null) ||
    defaultMsg
  );
}

async function verifyClubKonnectOrderStatus(requestId) {
  const userId = getClubKonnectUserId();
  const apiKey = getClubKonnectApiKey();
  const queryUrl = `https://www.nellobytesystems.com/APIQueryV1.asp?UserID=${userId}&APIKey=${apiKey}&RequestID=${requestId}`;
  try {
    logger.info(
      `🔍 [2-Step Verification]: Querying order status for RequestID ${requestId}...`,
    );
    const queryRes = await fetchClubKonnectApi(queryUrl, 10000);
    if (queryRes.success && queryRes.data) {
      const isSuccess = isClubKonnectOrderSuccess(queryRes.data);
      logger.info(
        `🔍 [2-Step Verification Result for ${requestId}]: isSuccess=${isSuccess}`,
        queryRes.data,
      );
      return { checked: true, isSuccess, data: queryRes.data };
    }
  } catch (err) {
    logger.error(`❌ [2-Step Verification Error for ${requestId}]:`, err);
  }
  return { checked: false, isSuccess: false, data: null };
}

async function fetchClubKonnectApi(targetUrl, timeoutMs = 15000) {
  const customHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 PayWaka/1.0",
    Accept: "application/json, text/plain, */*",
    "Cache-Control": "no-cache",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  logger.info(
    `📡 [ClubKonnect API Outbound Request]: ${targetUrl.replace(/APIKey=[^&]+/i, "APIKey=***")}`,
  );

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: customHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const rawText = await res.text();
    logger.info(
      `📥 [ClubKonnect API Inbound Response (HTTP ${res.status})]: ${rawText.substring(0, 500)}`,
    );
    console.log("what's happening", rawText)

    if (!res.ok || rawText.trim().startsWith("<")) {
      return {
        success: false,
        error: new Error(`HTTP ${res.status}: Invalid HTML or Gateway Error`),
        rawText,
      };
    }

    try {
      const parsed = JSON.parse(rawText);
      return { success: true, data: parsed, rawText };
    } catch (parseErr) {
      return {
        success: true,
        data: { status: "RAW_RESPONSE", rawText },
        rawText,
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error(`❌ [ClubKonnect API Fetch Failed]: ${err.message}`);
    return { success: false, error: err };
  }
}

function getFlutterwaveMerchantId() {
  return process.env.FLW_MERCHANT_ID || "100381242";
}

async function recordPendingSettlement({
  uid,
  requestId,
  category,
  amount,
  provider = "ClubKonnect",
  userDocData = {},
}) {
  const dateKey = new Date().toISOString().split("T")[0];
  const now = admin.firestore.FieldValue.serverTimestamp();
  const isoNow = new Date().toISOString();

  await db
    .collection("admin_pending_settlements")
    .doc(requestId)
    .set({
      tx_ref: requestId,
      uid,
      userEmail: userDocData.email || "",
      accountReference: userDocData.accountReference || "",
      accountNumber: userDocData.accountNumber || "",
      bankCode: userDocData.bankCode || "035",
      bankName: userDocData.bankName || "Wema Bank PLC",
      barter_id: userDocData.barter_id || "",
      merchantId: getFlutterwaveMerchantId(),
      category,
      amount: Number(amount),
      provider,
      status: "PENDING_SWEEP", // PENDING_SWEEP, SETTLED_SUCCESSFULLY, CANCELLED_REFUNDED, SWEEP_FAILED
      dateKey,
      createdAt: now,
      created_at: isoNow,
    });
}

async function cancelPendingSettlement(requestId, failureReasonStr) {
  const dateKey = new Date().toISOString().split("T")[0];
  const now = admin.firestore.FieldValue.serverTimestamp();
  const isoNow = new Date().toISOString();

  await db
    .collection("admin_pending_settlements")
    .doc(requestId)
    .set(
      {
        status: "CANCELLED_REFUNDED",
        failureReason:
          failureReasonStr ||
          "Transaction failed and refunded to in-app wallet",
        dateKey,
        updatedAt: now,
        updated_at: isoNow,
      },
      { merge: true },
    );
}

// ==========================================
// TRANSACTION PIN SECURITY ENGINE
// ==========================================

const scryptAsync = util.promisify(crypto.scrypt);

// Weak-PIN blocklist: repeated digits (0000-9999), 1234, 4321, ascending, descending, and trivial patterns
const WEAK_PINS = new Set([
  // Repeating digits
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  // Simple common pins
  "1234", "4321", "1212", "6969", "2580", "0852",
  // Ascending sequences
  "0123", "2345", "3456", "4567", "5678", "6789",
  // Descending sequences
  "9876", "8765", "7654", "6543", "5432", "3210"
]);

export function validatePinFormat(pin) {
  if (pin === undefined || pin === null || typeof pin !== "string" || !/^\d{4}$/.test(String(pin).trim())) {
    throw new HttpsError(
      "invalid-argument",
      "Transaction PIN must be exactly 4 digits (0-9)."
    );
  }
  const cleanPin = String(pin).trim();
  const d0 = Number(cleanPin[0]);
  const d1 = Number(cleanPin[1]);
  const d2 = Number(cleanPin[2]);
  const d3 = Number(cleanPin[3]);

  const isRepeating = cleanPin[0] === cleanPin[1] && cleanPin[1] === cleanPin[2] && cleanPin[2] === cleanPin[3];
  const isAscending = d1 === d0 + 1 && d2 === d1 + 1 && d3 === d2 + 1;
  const isDescending = d1 === d0 - 1 && d2 === d1 - 1 && d3 === d2 - 1;

  if (WEAK_PINS.has(cleanPin) || isRepeating || isAscending || isDescending) {
    throw new HttpsError(
      "invalid-argument",
      "This PIN is too common or predictable. Please choose a stronger 4-digit PIN."
    );
  }
  return cleanPin;
}

export function generatePinSalt() {
  return crypto.randomBytes(16).toString("hex");
}

export function getPinPepper(version = 1) {
  const vKey = `PIN_PEPPER_SECRET_V${version}`;

  if (process.env[vKey]) return process.env[vKey];

  const secretDef = PIN_PEPPER_SECRETS[version];
  if (secretDef) {
    try {
      const secretVal = secretDef.value();
      if (secretVal) return secretVal;
    } catch (_) { }
  }

  throw new Error(`PIN pepper not configured for version ${version}`);
}

export function deriveHmacPin(pin, pepper) {
  return crypto.createHmac("sha256", pepper).update(pin).digest("hex");
}

export async function hashTransactionPin(pin, salt, pepperVersion = 1) {
  const pepper = getPinPepper(pepperVersion);
  const hmacPin = deriveHmacPin(pin, pepper);
  const derivedKey = await scryptAsync(hmacPin, salt, 64);
  return derivedKey.toString("hex");
}

export async function verifyPinMatch(inputPin, salt, storedHash, pepperVersion = 1) {
  const pepper = getPinPepper(pepperVersion);
  const hmacPin = deriveHmacPin(inputPin, pepper);
  const computedBuf = await scryptAsync(hmacPin, salt, 64);
  const storedBuf = Buffer.from(storedHash, "hex");
  if (computedBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, storedBuf);
}

export async function sendPinSecurityNotification(uid, action) {
  try {
    const isChange = action === "PIN_CHANGED";
    const title = isChange
      ? "Security Alert: Transaction PIN Changed"
      : "Security Alert: Transaction PIN Reset";
    const body = isChange
      ? "Your PayWaka transaction PIN was just updated. If you did not make this change, please contact support immediately."
      : "Your PayWaka transaction PIN was reset following a security verification. If you did not initiate this reset, contact support immediately.";

    // 1. In-App Notification Record in users/{uid}/notifications
    const notifRef = db.collection("users").doc(uid).collection("notifications").doc();
    await notifRef.set({
      title,
      message: body,
      type: "security",
      action,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Fetch User Details for Email & Push
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? (userDoc.data() || {}) : {};
    const userEmail = userData.userEmail || userData.email;
    const displayName = userData.userName || userData.firstName || "Valued Customer";

    // 3. Push Notification via FCM
    try {
      const tokensSnap = await db.collection("users").doc(uid).collection("fcmTokens").get();
      if (!tokensSnap.empty) {
        const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
        if (tokens.length > 0) {
          await getMessaging().sendEachForMulticast({
            tokens,
            notification: { title, body },
          });
          logger.info(`📱 Security push notification dispatched to ${tokens.length} token(s) for user ${uid}`);
        }
      }
    } catch (fcmErr) {
      logger.warn(`Push notification skipped or failed for user ${uid}: ${fcmErr.message}`);
    }

    // 4. Email Notification via Resend (if configured)
    if (userEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const eventTime = new Date().toLocaleString("en-GB", {
          timeZone: "Africa/Lagos",
          dateStyle: "full",
          timeStyle: "short",
        });

        await resend.emails.send({
          from: "PayWaka Security <onboarding@resend.dev>",
          to: userEmail,
          subject: title,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #060d18; color: #ffffff; padding: 32px 24px; border-radius: 12px;">
              <h2 style="color: #22c55e; margin-top: 0;">PayWaka Security Notification</h2>
              <p style="font-size: 16px; color: #c9d8e8;">Hi <strong>${displayName}</strong>,</p>
              <p style="font-size: 15px; color: #c9d8e8; line-height: 1.6;">${body}</p>
              <div style="background: #0a1628; border: 1px solid #1e3a5f; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b8aad;"><strong>Event:</strong> ${isChange ? "PIN Changed" : "PIN Reset"}</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b8aad;"><strong>Time:</strong> ${eventTime} (WAT)</p>
                <p style="margin: 0; font-size: 13px; color: #6b8aad;"><strong>Status:</strong> Completed Successfully</p>
              </div>
              <p style="font-size: 13px; color: #ef4444; line-height: 1.5;">
                If you did not authorize this change, please navigate to your PayWaka settings or contact support immediately to secure your account.
              </p>
              <p style="font-size: 12px; color: #3d5a73; margin-top: 32px; border-top: 1px solid #1e3a5f; padding-top: 16px;">
                © ${new Date().getFullYear()} PayWaka. All rights reserved.
              </p>
            </div>
          `,
        });
        logger.info(`✉️ Security alert email dispatched to ${userEmail} for user ${uid}`);
      } catch (emailErr) {
        logger.warn(`Resend email notification failed for user ${uid}: ${emailErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to process security notification for user ${uid}:`, err);
  }
}

export async function verifyUserPinCore(uid, rawPin) {
  if (!rawPin) {
    throw new HttpsError(
      "invalid-argument",
      "Transaction PIN is required to complete this transaction."
    );
  }
  const pin = String(rawPin).trim();
  if (!/^\d{4}$/.test(pin)) {
    throw new HttpsError(
      "invalid-argument",
      "Transaction PIN must be exactly 4 digits (0-9)."
    );
  }

  const pinCredRef = db.collection("users").doc(uid).collection("private_security").doc("pin_credentials");

  let verificationResult = null;

  await db.runTransaction(async (t) => {
    const credDoc = await t.get(pinCredRef);
    if (!credDoc.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Transaction PIN has not been created yet. Please set up your 4-digit PIN first."
      );
    }

    const credData = credDoc.data() || {};
    let { hash, salt, attempts = 0, lockedUntil } = credData;

    const now = new Date();
    // Check temporary security lockout
    if (lockedUntil) {
      const lockDate = lockedUntil.toDate ? lockedUntil.toDate() : new Date(lockedUntil);
      if (lockDate > now) {
        const remainingMinutes = Math.ceil((lockDate.getTime() - now.getTime()) / (60 * 1000));
        throw new HttpsError(
          "resource-exhausted",
          `Security lockout: Too many failed PIN attempts. Account locked for your safety. Try again in ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}.`
        );
      } else {
        // Lockout expired: reset attempts counter so first wrong attempt does not immediately re-lock
        attempts = 0;
        lockedUntil = null;
      }
    }

    const isMatch = await verifyPinMatch(pin, salt, hash, credData.pepperVersion || 1);

    if (!isMatch) {
      const newAttempts = (Number(attempts) || 0) + 1;
      const updateData = {
        attempts: newAttempts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (newAttempts >= 5) {
        const newLockDate = new Date(Date.now() + 15 * 60 * 1000);
        updateData.lockedUntil = admin.firestore.Timestamp.fromDate(newLockDate);
        t.update(pinCredRef, updateData);

        // Audit log entry for lockout event
        const auditRef = db.collection("admin_audit_logs").doc();
        t.set(auditRef, {
          uid,
          action: "PIN_LOCKOUT",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        verificationResult = {
          success: false,
          errorType: "lockout",
          message: "Security lockout: Too many failed PIN attempts. Your account has been locked for 15 minutes.",
        };
      } else {
        updateData.lockedUntil = null;
        t.update(pinCredRef, updateData);
        const remaining = 5 - newAttempts;
        verificationResult = {
          success: false,
          errorType: "mismatch",
          message: `Incorrect transaction PIN. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining before temporary lockout.`,
        };
      }
    } else {
      // Success! Reset attempts to 0 and clear lockedUntil in Firestore
      if (credData.attempts > 0 || credData.lockedUntil || attempts > 0 || lockedUntil) {
        t.update(pinCredRef, {
          attempts: 0,
          lockedUntil: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      verificationResult = { success: true };
    }
  });

  if (!verificationResult?.success) {
    if (verificationResult?.errorType === "lockout") {
      throw new HttpsError("resource-exhausted", verificationResult.message);
    }
    throw new HttpsError("permission-denied", verificationResult?.message || "Incorrect transaction PIN.");
  }

  return true;
}

export const createTransactionPin = onCall({ cors: true, secrets: ALL_PIN_SECRETS }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required to create transaction PIN.");
  }

  const { pin } = request.data || {};
  const validPin = validatePinFormat(pin);

  const userRef = db.collection("users").doc(uid);
  const pinCredRef = userRef.collection("private_security").doc("pin_credentials");

  // Server-side check: Must reject if pin_credentials already exists
  const credDoc = await pinCredRef.get();
  if (credDoc.exists) {
    throw new HttpsError(
      "already-exists",
      "Transaction PIN already exists. Use the change PIN option in Settings or reset PIN if forgotten."
    );
  }

  const salt = generatePinSalt();
  const hash = await hashTransactionPin(validPin, salt, 1);

  const batch = db.batch();
  batch.set(pinCredRef, {
    hash,
    salt,
    pepperVersion: 1,
    attempts: 0,
    lockedUntil: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(
    userRef,
    {
      hasTransactionPin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Write audit log
  const auditRef = db.collection("admin_audit_logs").doc();
  batch.set(auditRef, {
    uid,
    action: "PIN_CREATED",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  logger.info(`🔐 Transaction PIN securely created for user: ${uid}`);
  return { success: true, message: "Transaction PIN created successfully." };
});

export const changeTransactionPin = onCall({ cors: true, secrets: ALL_PIN_SECRETS }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required to change transaction PIN.");
  }

  const { currentPin, newPin } = request.data || {};
  if (!currentPin || typeof currentPin !== "string" || !/^\d{4}$/.test(String(currentPin).trim())) {
    throw new HttpsError("invalid-argument", "Current PIN must be exactly 4 digits.");
  }
  const validCurrentPin = String(currentPin).trim();
  const validNewPin = validatePinFormat(newPin);

  if (validCurrentPin === validNewPin) {
    throw new HttpsError(
      "invalid-argument",
      "New PIN must be different from your current PIN."
    );
  }

  // Verify current PIN (verifies timing-safe hash, tracks attempts and lockouts in transaction)
  await verifyUserPinCore(uid, validCurrentPin);

  const salt = generatePinSalt();
  const hash = await hashTransactionPin(validNewPin, salt, 1);

  const pinCredRef = db.collection("users").doc(uid).collection("private_security").doc("pin_credentials");
  const batch = db.batch();
  batch.set(pinCredRef, {
    hash,
    salt,
    pepperVersion: 1,
    attempts: 0,
    lockedUntil: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(db.collection("users").doc(uid), {
    hasTransactionPin: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Write audit log
  const auditRef = db.collection("admin_audit_logs").doc();
  batch.set(auditRef, {
    uid,
    action: "PIN_CHANGED",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Send security notification to user (email, push, in-app) - isolated from PIN transaction
  try {
    await sendPinSecurityNotification(uid, "PIN_CHANGED");
  } catch (notifErr) {
    logger.warn(`Security notification dispatch failed for user ${uid}:`, notifErr);
  }

  logger.info(`🔐 Transaction PIN changed successfully for user: ${uid}`);
  return { success: true, message: "Transaction PIN changed successfully." };
});

export const resetTransactionPin = onCall({ cors: true, secrets: ALL_PIN_SECRETS }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required to reset transaction PIN.");
  }

  // Verify recent re-authentication window (fresh login within last 5 minutes = 300 seconds)
  const authTime = request.auth?.token?.auth_time;
  if (!authTime && !isEmulator) {
    throw new HttpsError(
      "unauthenticated",
      "Unable to verify recent authentication. Please re-authenticate and try again."
    );
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (authTime && (nowSeconds - authTime > 300)) {
    throw new HttpsError(
      "permission-denied",
      "Security requirement: Your login session is not fresh. Please enter your account password to verify your identity before resetting your PIN."
    );
  }

  const { newPin } = request.data || {};
  const validNewPin = validatePinFormat(newPin);

  const salt = generatePinSalt();
  const hash = await hashTransactionPin(validNewPin, salt, 1);

  const pinCredRef = db.collection("users").doc(uid).collection("private_security").doc("pin_credentials");
  const userRef = db.collection("users").doc(uid);

  const batch = db.batch();
  // Reset also clears attempts and lockedUntil
  batch.set(pinCredRef, {
    hash,
    salt,
    pepperVersion: 1,
    attempts: 0,
    lockedUntil: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(userRef, {
    hasTransactionPin: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Write audit log
  const auditRef = db.collection("admin_audit_logs").doc();
  batch.set(auditRef, {
    uid,
    action: "PIN_RESET",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Send security notification to user (email, push, in-app) - isolated from PIN transaction
  try {
    await sendPinSecurityNotification(uid, "PIN_RESET");
  } catch (notifErr) {
    logger.warn(`Security notification dispatch failed for user ${uid}:`, notifErr);
  }

  logger.info(`🔐 Transaction PIN securely reset for user: ${uid}`);
  return { success: true, message: "Transaction PIN reset successfully." };
});

export const verifyTransactionPin = onCall({ cors: true, secrets: ALL_PIN_SECRETS }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required to verify transaction PIN.");
  }

  const { pin } = request.data || {};
  await verifyUserPinCore(uid, pin);
  return { success: true, valid: true };
});

/**
 * Idempotently awards points for eligible completed transactions.
 * Approved Business Rule: ₦50 eligible spend = 1 point (Math.floor(amount / 50)).
 * Eligible categories: Airtime, Data, Electricity, Cable.
 * 
 * Double-layer update:
 * 1. Append-only Points Ledger: users/{uid}/points/earn_{requestId}
 * 2. Aggregate Spendable Balance: users/{uid}.points (atomic increment)
 * 3. Idempotency: users/{uid}/Transactions/{requestId}.points_awarded flag + ledger doc existence
 */
export async function awardTransactionPointsCore({ uid, requestId, category, amount }) {
  const numAmount = Number(amount || 0);
  if (!uid || !requestId || numAmount < 50) {
    return { pointsEarned: 0, awarded: false };
  }

  const pointsAwarded = Math.floor(numAmount / 50);
  if (pointsAwarded <= 0) {
    return { pointsEarned: 0, awarded: false };
  }

  const userRef = db.collection("users").doc(uid);
  const ledgerDocRef = userRef.collection("points").doc(`earn_${requestId}`);
  const txDocRef = userRef.collection("Transactions").doc(requestId);

  try {
    let alreadyAwarded = false;
    await db.runTransaction(async (t) => {
      const [ledgerSnap, txSnap] = await Promise.all([
        t.get(ledgerDocRef),
        t.get(txDocRef),
      ]);

      const txData = txSnap.exists ? txSnap.data() : {};
      if (ledgerSnap.exists || txData.points_awarded) {
        alreadyAwarded = true;
        return;
      }

      // 1. Update aggregate spendable balance
      t.set(
        userRef,
        {
          points: admin.firestore.FieldValue.increment(pointsAwarded),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // 2. Append-only ledger record
      t.set(ledgerDocRef, {
        type: "transaction_earn",
        points: pointsAwarded,
        direction: "credit",
        source: String(category).toLowerCase(),
        referenceId: requestId,
        amountNaira: numAmount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Mark transaction doc as points awarded
      if (txSnap.exists) {
        t.set(
          txDocRef,
          {
            points_awarded: true,
            points_amount: pointsAwarded,
            points_awarded_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    });

    if (alreadyAwarded) {
      logger.info(`ℹ️ Points already awarded for transaction ${requestId}. Skipped.`);
      return { pointsEarned: pointsAwarded, awarded: false, duplicate: true };
    }

    logger.info(`🎉 Awarded ${pointsAwarded} points to user ${uid} for ${category} (₦${numAmount}).`);
    return { pointsEarned: pointsAwarded, awarded: true };
  } catch (err) {
    logger.error(`❌ Failed to award transaction points for ${requestId}:`, err);
    return { pointsEarned: 0, awarded: false, error: err.message };
  }
}

// 1. BUY AIRTIME
export const clubkonnectBuyAirtime = onCall({ cors: true, secrets: ALL_PIN_SECRETS }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required to perform airtime purchase.",
    );
  }
  const { network, phone, amount, pin } = request.data || {};
  const numAmount = Number(amount || 0);
  if (!network || !phone || !numAmount || numAmount <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "Network, valid phone number, and positive amount are required.",
    );
  }

  // Verify user transaction PIN before proceeding with wallet debit
  await verifyUserPinCore(uid, pin);

  const userId = getClubKonnectUserId();
  const apiKey = getClubKonnectApiKey();
  const networkCode = getClubKonnectNetworkCode(network);
  const requestId = `PWK_${uid}_${Date.now()}`;
  const userRef = db.collection("users").doc(uid);
  let cachedUserData = {};

  try {
    await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (userDoc.exists) {
        cachedUserData = userDoc.data() || {};
        const currentBalance = Number(cachedUserData.walletBalance || 0);
        if (currentBalance < numAmount) {
          throw new Error("Insufficient wallet balance for airtime purchase.");
        }
        t.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(-numAmount),
        });
      } else if (process.env.FUNCTIONS_EMULATOR === "true") {
        cachedUserData = {
          email: "dev_user@paywaka.com",
          accountReference: "PSAF010632D562280420",
          accountNumber: "7353739008",
          bankCode: "035",
          bankName: "Wema Bank PLC",
          barter_id: "234000003484364",
          walletBalance: 100000,
        };
        t.set(userRef, cachedUserData, { merge: true });
      } else {
        throw new Error("User account not found or has zero balance.");
      }
    });
  } catch (err) {
    logger.error(`Transaction failed for airtime: ${requestId}`, err);
    throw new HttpsError(
      "failed-precondition",
      err.message || "Balance deduction failed.",
    );
  }

  const primaryUrl = `https://www.nellobytesystems.com/APIAirtimeV1.asp?UserID=${userId}&APIKey=${apiKey}&MobileNetwork=${networkCode}&Amount=${numAmount}&MobileNumber=${phone}&RequestID=${requestId}`;

  let result;
  let isSuccess = false;
  let isProviderBalanceIssue = false;
  let isNetworkOrHtmlError = false;

  const fetchRes = await fetchClubKonnectApi(primaryUrl);
  if (!fetchRes.success) {
    logger.error(`Airtime API fetch error for ${requestId}:`, fetchRes.error);
    isSuccess = false;
    isNetworkOrHtmlError = true;
    result = {
      status: "NETWORK_ERROR",
      description: fetchRes.error?.message || "Provider connection failed",
    };
  } else {
    result = fetchRes.data;
    isSuccess = isClubKonnectOrderSuccess(result);
    isProviderBalanceIssue = !isSuccess && isClubKonnectBalanceOutage(result);
  }

  // 2-STEP CHECK: Query status API before issuing refund if primary call was ambiguous or network failed
  if (!isSuccess) {
    logger.warn(
      `⚠️ Airtime primary purchase returned non-success for ${requestId}. Executing Step 2 Status Query...`,
    );
    await new Promise((r) => setTimeout(r, 1200));
    const step2Check = await verifyClubKonnectOrderStatus(requestId);
    if (step2Check.isSuccess) {
      logger.info(
        `✅ [Step 2 Check Succeeded]: Airtime was received/fulfilled by provider for ${requestId}!`,
      );
      isSuccess = true;
      result = step2Check.data || result;
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const isoNow = new Date().toISOString();

  if (!isSuccess) {
    // AUTOMATIC USER WALLET REFUND
    await userRef.set(
      { walletBalance: admin.firestore.FieldValue.increment(numAmount) },
      { merge: true },
    );

    const failureReasonStr = resolveProviderFailureReason(
      result,
      isProviderBalanceIssue,
      isNetworkOrHtmlError,
      "Airtime recharge failed",
    );

    await cancelPendingSettlement(requestId, failureReasonStr);

    await db.collection("system_failed_payouts").doc(requestId).set({
      tx_ref: requestId,
      uid,
      category: "Airtime",
      amount: numAmount,
      customerId: phone,
      reason: failureReasonStr,
      providerResponse: result,
      createdAt: now,
      created_at: isoNow,
      resolved: false,
    });

    await userRef
      .collection("Transactions")
      .doc(requestId)
      .set({
        tx_ref: requestId,
        narration: `Airtime Recharge (${network}) - Refunded`,
        category: "Airtime",
        type: "debit",
        amount: numAmount,
        status: "failed",
        phone,
        customerId: phone,
        failureReason: failureReasonStr,
        created_at: isoNow,
        createdAt: now,
        response: result,
      });

    return {
      status: "provider_error",
      message: isProviderBalanceIssue
        ? "We're experiencing temporary service maintenance on our provider gateway. Your PayWaka wallet was NOT charged (and has been safely refunded). Please try again shortly!"
        : failureReasonStr,
      tx_ref: requestId,
      refunded: true,
      data: result,
    };
  }

  // SUCCESS PATH: Record pending subaccount sweep for midnight batch
  await recordPendingSettlement({
    uid,
    requestId,
    category: "Airtime",
    amount: numAmount,
    userDocData: cachedUserData,
  });
  await userRef
    .collection("Transactions")
    .doc(requestId)
    .set({
      tx_ref: requestId,
      narration: `Airtime Recharge (${network})`,
      category: "Airtime",
      type: "debit",
      amount: numAmount,
      status: "completed",
      phone,
      customerId: phone,
      created_at: isoNow,
      createdAt: now,
      response: result,
    });

  await userRef.collection("airtime").doc(requestId).set({
    network,
    phone,
    amount: numAmount,
    status: "completed",
    createdAt: now,
  });

  const ptsRes = await awardTransactionPointsCore({
    uid,
    requestId,
    category: "Airtime",
    amount: numAmount,
  });

  return {
    status: "success",
    message: "Airtime purchase successful",
    data: result,
    tx_ref: requestId,
    pointsEarned: ptsRes.pointsEarned,
  };
});

// 2. BUY DATA
export const clubkonnectBuyData = onCall({ cors: true, secrets: ALL_PIN_SECRETS }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required to purchase data.",
    );
  }
  const { network, plan, phone, pin } = request.data || {};
  if (!network || !plan || !phone) {
    throw new HttpsError(
      "invalid-argument",
      "Network, plan code, and phone number are required.",
    );
  }

  // Verify user transaction PIN before proceeding with price calculation and wallet debit
  await verifyUserPinCore(uid, pin);

  const netUpper = String(network).toUpperCase();
  const planCodeStr = String(plan).trim();

  // 1. Server-side purchase-time price recomputation
  const config = await getPricingConfigCore();
  const planDocRef = db.collection("data_plan_pricing").doc(`${netUpper}_${planCodeStr}`);
  const planDocSnap = await planDocRef.get();

  let costPrice = 0;
  let competitorPrice = null;
  let customDisplayPrice = null;
  let overrideMode = "AUTOMATIC";

  if (planDocSnap.exists) {
    const planData = planDocSnap.data() || {};
    costPrice = Number(planData.costPrice || 0);
    competitorPrice = planData.competitorPrice;
    customDisplayPrice = planData.customDisplayPrice;
    overrideMode = planData.overrideMode || "AUTOMATIC";
  } else {
    // Fallback: fetch live cost from ClubKonnect if plan not in Firestore yet
    try {
      const userId = getClubKonnectUserId();
      const res = await fetch(`https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${userId}`);
      const rawData = typeof res.json === "function" ? await res.json() : JSON.parse(await res.text());
      const mobileNetworkObj = rawData?.MOBILE_NETWORK || {};
      let rawPlans = [];
      if (netUpper.includes("MTN") && mobileNetworkObj.MTN) rawPlans = mobileNetworkObj.MTN[0]?.PRODUCT || [];
      else if (netUpper.includes("GLO") && mobileNetworkObj.Glo) rawPlans = mobileNetworkObj.Glo[0]?.PRODUCT || [];
      else if (netUpper.includes("AIRTEL") && mobileNetworkObj.Airtel) rawPlans = mobileNetworkObj.Airtel[0]?.PRODUCT || [];
      else if ((netUpper.includes("9MOB") || netUpper.includes("ETISALAT")) && (mobileNetworkObj.m_9mobile || mobileNetworkObj["9mobile"])) {
        rawPlans = (mobileNetworkObj.m_9mobile || mobileNetworkObj["9mobile"])[0]?.PRODUCT || [];
      }
      const matched = rawPlans.find((p) => String(p.PRODUCT_ID || p.PRODUCT_CODE).trim() === planCodeStr);
      if (matched) {
        costPrice = Number(matched.PRODUCT_AMOUNT || 0);
      }
    } catch (err) {
      logger.error("Error fetching fallback plan cost:", err);
    }
  }

  if (!costPrice || costPrice <= 0) {
    throw new HttpsError("invalid-argument", "Invalid data plan or cost price unavailable.");
  }

  const pricingResult = calculatePlanPricing(
    costPrice,
    netUpper,
    competitorPrice,
    customDisplayPrice,
    overrideMode,
    config,
  );

  const numAmount = pricingResult.displayPrice;

  const userId = getClubKonnectUserId();
  const apiKey = getClubKonnectApiKey();
  const networkCode = getClubKonnectNetworkCode(network);
  const requestId = `PWK_${uid}_${Date.now()}`;
  const userRef = db.collection("users").doc(uid);
  let cachedUserData = {};

  try {
    await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (userDoc.exists) {
        cachedUserData = userDoc.data() || {};
        const currentBalance = Number(cachedUserData.walletBalance || 0);
        if (currentBalance < numAmount) {
          throw new Error(
            `Insufficient PayWaka wallet balance. Data plan price is ₦${numAmount.toLocaleString()}. Please add funds to your wallet.`,
          );
        }
        t.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(-numAmount),
        });
      } else if (process.env.FUNCTIONS_EMULATOR === "true") {
        cachedUserData = {
          email: "dev_user@paywaka.com",
          accountReference: "PSAF010632D562280420",
          accountNumber: "7353739008",
          bankCode: "035",
          bankName: "Wema Bank PLC",
          barter_id: "234000003484364",
          walletBalance: 100000,
        };
        t.set(userRef, cachedUserData, { merge: true });
      } else {
        throw new Error("User account not found or has zero balance.");
      }
    });
  } catch (err) {
    logger.error(`Transaction failed for data: ${requestId}`, err);
    throw new HttpsError(
      "failed-precondition",
      err.message || "Balance deduction failed.",
    );
  }

  const primaryUrl = `https://www.nellobytesystems.com/APIDatabundleV1.asp?UserID=${userId}&APIKey=${apiKey}&MobileNetwork=${networkCode}&DataPlan=${planCodeStr}&MobileNumber=${phone}&RequestID=${requestId}`;

  let result;
  let isSuccess = false;
  let isProviderBalanceIssue = false;
  let isNetworkOrHtmlError = false;

  const dataFetch = await fetchClubKonnectApi(primaryUrl);
  if (!dataFetch.success) {
    logger.error(`Data API fetch error for ${requestId}:`, dataFetch.error);
    isSuccess = false;
    isNetworkOrHtmlError = true;
    result = {
      status: "NETWORK_ERROR",
      description: dataFetch.error?.message || "Provider connection failed",
    };
  } else {
    result = dataFetch.data;
    logger.info("📶 [DATA BUNDLE PURCHASE RAW PROVIDER RESPONSE]:", result);
    isSuccess = isClubKonnectOrderSuccess(result);
    isProviderBalanceIssue = !isSuccess && isClubKonnectBalanceOutage(result);
  }

  // 2-STEP CHECK: Query status API before issuing refund if primary call was ambiguous or network failed
  if (!isSuccess) {
    logger.warn(
      `⚠️ Data primary purchase returned non-success for ${requestId}. Executing Step 2 Status Query...`,
    );
    await new Promise((r) => setTimeout(r, 1200));
    const step2Check = await verifyClubKonnectOrderStatus(requestId);
    if (step2Check.isSuccess) {
      logger.info(
        `✅ [Step 2 Check Succeeded]: Data plan was received/fulfilled by provider for ${requestId}!`,
      );
      isSuccess = true;
      result = step2Check.data || result;
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const isoNow = new Date().toISOString();

  if (!isSuccess) {
    await userRef.set(
      { walletBalance: admin.firestore.FieldValue.increment(numAmount) },
      { merge: true },
    );

    const failureReasonStr = resolveProviderFailureReason(
      result,
      isProviderBalanceIssue,
      isNetworkOrHtmlError,
      "Data plan purchase failed",
    );

    await cancelPendingSettlement(requestId, failureReasonStr);

    await db.collection("system_failed_payouts").doc(requestId).set({
      tx_ref: requestId,
      uid,
      category: "Data",
      amount: numAmount,
      customerId: phone,
      reason: failureReasonStr,
      providerResponse: result,
      createdAt: now,
      created_at: isoNow,
      resolved: false,
    });

    await userRef
      .collection("Transactions")
      .doc(requestId)
      .set({
        tx_ref: requestId,
        narration: `Data Purchase (${netUpper}) - Refunded`,
        category: "Data",
        type: "debit",
        amount: numAmount,
        status: "failed",
        phone,
        customerId: phone,
        failureReason: failureReasonStr,
        created_at: isoNow,
        createdAt: now,
        response: result,
      });

    return {
      status: "provider_error",
      message: isProviderBalanceIssue
        ? "We're experiencing temporary service maintenance on our provider gateway. Your PayWaka wallet was NOT charged (and has been safely refunded). Please try again shortly!"
        : failureReasonStr,
      tx_ref: requestId,
      refunded: true,
      data: result,
    };
  }

  // SUCCESS PATH: Record pending subaccount sweep for midnight batch
  await recordPendingSettlement({
    uid,
    requestId,
    category: "Data",
    amount: numAmount,
    userDocData: cachedUserData,
  });

  const txDocRef = userRef.collection("Transactions").doc(requestId);
  await txDocRef.set({
    tx_ref: requestId,
    narration: `Data Purchase (${netUpper})`,
    category: "Data",
    type: "debit",
    amount: numAmount,
    costPrice: pricingResult.costPrice,
    profit: pricingResult.profit,
    isHero: pricingResult.isHero,
    status: "completed",
    phone,
    customerId: phone,
    created_at: isoNow,
    createdAt: now,
    response: result,
  });

  // IDEMPOTENT CASHBACK CREDITING: Check if cashback has already been awarded
  if (pricingResult.cashbackAmount > 0) {
    try {
      await db.runTransaction(async (t) => {
        const txDocSnap = await t.get(txDocRef);
        const txData = txDocSnap.exists ? txDocSnap.data() : {};
        if (!txData.cashback_awarded) {
          t.update(userRef, {
            walletBalance: admin.firestore.FieldValue.increment(pricingResult.cashbackAmount),
          });
          t.set(
            txDocRef,
            {
              cashback_awarded: true,
              cashback_amount: pricingResult.cashbackAmount,
              cashback_rate: pricingResult.cashbackRate,
              cashback_awarded_at: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
      });
    } catch (cbErr) {
      logger.error(`Cashback crediting error for ${requestId}:`, cbErr);
    }
  }

  const ptsRes = await awardTransactionPointsCore({
    uid,
    requestId,
    category: "Data",
    amount: numAmount,
  });

  return {
    status: "success",
    message: "Data purchase successful",
    data: result,
    tx_ref: requestId,
    chargedAmount: numAmount,
    cashbackEarned: pricingResult.cashbackAmount,
    pointsEarned: ptsRes.pointsEarned,
  };
});

// 3. PAY ELECTRICITY
export const clubkonnectPayElectricity = onCall(
  { cors: true, secrets: ALL_PIN_SECRETS },
  async (request) => {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required to perform electricity payment.",
      );
    }
    const { company, meterType, meterNo, amount, phone, pin } = request.data || {};
    const numAmount = Number(amount || 0);
    if (!company || !meterNo || !numAmount || numAmount <= 0) {
      throw new HttpsError(
        "invalid-argument",
        "Electricity company, meter number, and valid positive amount are required.",
      );
    }

    // Verify user transaction PIN before proceeding with wallet debit
    await verifyUserPinCore(uid, pin);

    const userId = getClubKonnectUserId();
    const apiKey = getClubKonnectApiKey();
    const typeParam = meterType || "01";
    const requestId = `PWK_${uid}_${Date.now()}`;
    const userRef = db.collection("users").doc(uid);
    let cachedUserData = {};

    try {
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (userDoc.exists) {
          cachedUserData = userDoc.data() || {};
          const currentBalance = Number(cachedUserData.walletBalance || 0);
          if (currentBalance < numAmount) {
            throw new Error(
              "Insufficient PayWaka wallet balance. Please add funds to your wallet to complete this purchase.",
            );
          }
          t.update(userRef, {
            walletBalance: admin.firestore.FieldValue.increment(-numAmount),
          });
        } else if (process.env.FUNCTIONS_EMULATOR === "true") {
          cachedUserData = {
            email: "dev_user@paywaka.com",
            accountReference: "PSAF010632D562280420",
            accountNumber: "7353739008",
            bankCode: "035",
            bankName: "Wema Bank PLC",
            barter_id: "234000003484364",
            walletBalance: 100000,
          };
          t.set(userRef, cachedUserData, { merge: true });
        } else {
          throw new Error("User account not found or has zero balance.");
        }
      });
    } catch (err) {
      logger.error(`Transaction failed for elec: ${requestId}`, err);
      throw new HttpsError(
        "failed-precondition",
        err.message || "Balance deduction failed.",
      );
    }

    const primaryUrl = `https://www.nellobytesystems.com/APIElectricityV1.asp?UserID=${userId}&APIKey=${apiKey}&ElectricCompany=${company}&MeterType=${typeParam}&MeterNo=${meterNo}&Amount=${numAmount}&PhoneNo=${phone || ""}&RequestID=${requestId}`;

    let result;
    let isSuccess = false;
    let isProviderBalanceIssue = false;
    let isNetworkOrHtmlError = false;

    const elecFetch = await fetchClubKonnectApi(primaryUrl);
    if (!elecFetch.success) {
      logger.error(
        `Electricity API fetch error for ${requestId}:`,
        elecFetch.error,
      );
      isSuccess = false;
      isNetworkOrHtmlError = true;
      result = {
        status: "NETWORK_ERROR",
        description: elecFetch.error?.message || "Provider connection failed",
      };
    } else {
      result = elecFetch.data;
      logger.info("🔌 [ELECTRICITY PURCHASE RAW PROVIDER RESPONSE]:", result);
      isSuccess = isClubKonnectOrderSuccess(result);
      isProviderBalanceIssue = !isSuccess && isClubKonnectBalanceOutage(result);
    }

    // 2-STEP CHECK: Query status API before issuing refund if primary call was ambiguous or network failed
    if (!isSuccess) {
      logger.warn(
        `⚠️ Electricity primary payment returned non-success for ${requestId}. Executing Step 2 Status Query...`,
        result,
      );
      await new Promise((r) => setTimeout(r, 1200));
      const step2Check = await verifyClubKonnectOrderStatus(requestId);
      if (step2Check.isSuccess) {
        logger.info(
          `✅ [Step 2 Check Succeeded]: Electricity bill was received/fulfilled by provider for ${requestId}!`,
          step2Check.data,
        );
        isSuccess = true;
        result = step2Check.data || result;
      }
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const isoNow = new Date().toISOString();

    if (!isSuccess) {
      await userRef.set(
        { walletBalance: admin.firestore.FieldValue.increment(numAmount) },
        { merge: true },
      );

      const failureReasonStr = resolveProviderFailureReason(
        result,
        isProviderBalanceIssue,
        isNetworkOrHtmlError,
        "Electricity payment failed",
      );

      await cancelPendingSettlement(requestId, failureReasonStr);

      await db.collection("system_failed_payouts").doc(requestId).set({
        tx_ref: requestId,
        uid,
        category: "Electricity",
        amount: numAmount,
        customerId: meterNo,
        reason: failureReasonStr,
        providerResponse: result,
        createdAt: now,
        created_at: isoNow,
        resolved: false,
      });

      await userRef
        .collection("Transactions")
        .doc(requestId)
        .set({
          tx_ref: requestId,
          narration: `Electricity Payment (${company}) - Refunded`,
          category: "Electricity",
          type: "debit",
          amount: numAmount,
          status: "failed",
          meterNo,
          customerId: meterNo,
          failureReason: failureReasonStr,
          created_at: isoNow,
          createdAt: now,
          response: result,
        });

      return {
        status: "provider_error",
        message: isProviderBalanceIssue
          ? "We're experiencing temporary service maintenance on our provider gateway. Your PayWaka wallet was NOT charged (and has been safely refunded). Please try again shortly!"
          : failureReasonStr,
        tx_ref: requestId,
        refunded: true,
        data: result,
      };
    }

    // SUCCESS PATH: Record pending subaccount sweep for midnight batch
    await recordPendingSettlement({
      uid,
      requestId,
      category: "Electricity",
      amount: numAmount,
      userDocData: cachedUserData,
    });
    await userRef
      .collection("Transactions")
      .doc(requestId)
      .set({
        tx_ref: requestId,
        narration: `Electricity Payment (${company})`,
        category: "Electricity",
        type: "debit",
        amount: numAmount,
        status: "completed",
        meterNo,
        customerId: meterNo,
        tokenPin: result.token || result.pin || "",
        created_at: isoNow,
        createdAt: now,
        response: result,
      });

    await userRef
      .collection("utility")
      .doc(requestId)
      .set({
        billType: "electricity",
        provider: company,
        amount: numAmount,
        customerId: meterNo,
        token: result.token || result.pin || "",
        status: "completed",
        createdAt: now,
      });

    const ptsRes = await awardTransactionPointsCore({
      uid,
      requestId,
      category: "Electricity",
      amount: numAmount,
    });

    return {
      status: "success",
      message: "Electricity payment successful",
      token: result.token || result.pin,
      data: result,
      tx_ref: requestId,
      pointsEarned: ptsRes.pointsEarned,
    };
  },
);

// 4. PAY CABLE
export const clubkonnectPayCable = onCall({ cors: true, secrets: ALL_PIN_SECRETS }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required to perform cable TV payment.",
    );
  }
  const { cableTV, packageCode, smartCardNo, amount, phone, pin } =
    request.data || {};
  const numAmount = Number(amount || 0);
  if (!cableTV || !packageCode || !smartCardNo) {
    throw new HttpsError(
      "invalid-argument",
      "CableTV, package code, and smartcard number are required.",
    );
  }

  // Verify user transaction PIN before proceeding with wallet debit
  await verifyUserPinCore(uid, pin);

  const userId = getClubKonnectUserId();
  const apiKey = getClubKonnectApiKey();
  const requestId = `PWK_${uid}_${Date.now()}`;
  const userRef = db.collection("users").doc(uid);
  let cachedUserData = {};

  if (numAmount > 0) {
    try {
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (userDoc.exists) {
          cachedUserData = userDoc.data() || {};
          const currentBalance = Number(cachedUserData.walletBalance || 0);
          if (currentBalance < numAmount) {
            throw new Error(
              "Insufficient PayWaka wallet balance. Please add funds to your wallet to complete this purchase.",
            );
          }
          t.update(userRef, {
            walletBalance: admin.firestore.FieldValue.increment(-numAmount),
          });
        } else if (process.env.FUNCTIONS_EMULATOR === "true") {
          cachedUserData = {
            email: "dev_user@paywaka.com",
            accountReference: "PSAF010632D562280420",
            accountNumber: "7353739008",
            bankCode: "035",
            bankName: "Wema Bank PLC",
            barter_id: "234000003484364",
            walletBalance: 100000,
          };
          t.set(userRef, cachedUserData, { merge: true });
        } else {
          throw new Error("User account not found or has zero balance.");
        }
      });
    } catch (err) {
      logger.error(`Transaction failed for cable: ${requestId}`, err);
      throw new HttpsError(
        "failed-precondition",
        err.message || "Balance deduction failed.",
      );
    }
  }

  const primaryUrl = `https://www.nellobytesystems.com/APICableTVV1.asp?UserID=${userId}&APIKey=${apiKey}&CableTV=${cableTV}&Package=${packageCode}&SmartCardNo=${smartCardNo}&PhoneNo=${phone || ""}&RequestID=${requestId}`;

  let result;
  let isSuccess = false;
  let isProviderBalanceIssue = false;
  let isNetworkOrHtmlError = false;

  const cableFetch = await fetchClubKonnectApi(primaryUrl);
  if (!cableFetch.success) {
    logger.error(`Cable API fetch error for ${requestId}:`, cableFetch.error);
    isSuccess = false;
    isNetworkOrHtmlError = true;
    result = {
      status: "NETWORK_ERROR",
      description: cableFetch.error?.message || "Provider connection failed",
    };
  } else {
    result = cableFetch.data;
    logger.info("📺 [CABLE TV PURCHASE RAW PROVIDER RESPONSE]:", result);
    isSuccess = isClubKonnectOrderSuccess(result);
    isProviderBalanceIssue = !isSuccess && isClubKonnectBalanceOutage(result);
  }

  // 2-STEP CHECK: Query status API before issuing refund if primary call was ambiguous or network failed
  if (!isSuccess) {
    logger.warn(
      `⚠️ Cable primary payment returned non-success for ${requestId}. Executing Step 2 Status Query...`,
    );
    await new Promise((r) => setTimeout(r, 1200));
    const step2Check = await verifyClubKonnectOrderStatus(requestId);
    if (step2Check.isSuccess) {
      logger.info(
        `✅ [Step 2 Check Succeeded]: Cable subscription was received/fulfilled by provider for ${requestId}!`,
      );
      isSuccess = true;
      result = step2Check.data || result;
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const isoNow = new Date().toISOString();

  if (!isSuccess) {
    if (numAmount > 0) {
      await userRef.set(
        { walletBalance: admin.firestore.FieldValue.increment(numAmount) },
        { merge: true },
      );
    }

    const failureReasonStr = resolveProviderFailureReason(
      result,
      isProviderBalanceIssue,
      isNetworkOrHtmlError,
      "Cable TV payment failed",
    );

    await cancelPendingSettlement(requestId, failureReasonStr);

    await db.collection("system_failed_payouts").doc(requestId).set({
      tx_ref: requestId,
      uid,
      category: "Cable",
      amount: numAmount,
      customerId: smartCardNo,
      reason: failureReasonStr,
      providerResponse: result,
      createdAt: now,
      created_at: isoNow,
      resolved: false,
    });

    await userRef
      .collection("Transactions")
      .doc(requestId)
      .set({
        tx_ref: requestId,
        narration: `Cable Payment (${cableTV}) - Refunded`,
        category: "Cable",
        type: "debit",
        amount: numAmount,
        status: "failed",
        smartCardNo,
        customerId: smartCardNo,
        failureReason: failureReasonStr,
        created_at: isoNow,
        createdAt: now,
        response: result,
      });

    return {
      status: "provider_error",
      message: isProviderBalanceIssue
        ? "We're experiencing temporary service maintenance on our provider gateway. Your PayWaka wallet was NOT charged (and has been safely refunded). Please try again shortly!"
        : failureReasonStr,
      tx_ref: requestId,
      refunded: true,
      data: result,
    };
  }

  // SUCCESS PATH: Record pending subaccount sweep for midnight batch
  await recordPendingSettlement({
    uid,
    requestId,
    category: "Cable",
    amount: numAmount,
    userDocData: cachedUserData,
  });
  await userRef
    .collection("Transactions")
    .doc(requestId)
    .set({
      tx_ref: requestId,
      narration: `Cable Payment (${cableTV})`,
      category: "Cable",
      type: "debit",
      amount: numAmount,
      status: "completed",
      smartCardNo,
      customerId: smartCardNo,
      created_at: isoNow,
      createdAt: now,
      response: result,
    });

  await userRef.collection("cable").doc(requestId).set({
    cableTV,
    packageCode,
    smartCardNo,
    amount: numAmount,
    status: "completed",
    createdAt: now,
  });

  const ptsRes = await awardTransactionPointsCore({
    uid,
    requestId,
    category: "Cable",
    amount: numAmount,
  });

  return {
    status: "success",
    message: "Cable subscription successful",
    data: result,
    tx_ref: requestId,
    pointsEarned: ptsRes.pointsEarned,
  };
});

// 5. FETCH CABLE PACKAGES
export const clubkonnectFetchCablePackages = onCall(
  { cors: true },
  async (request) => {
    const userId = getClubKonnectUserId();
    const { provider } = request.data || {};
    const provUpper = String(provider || "DSTV")
      .toUpperCase()
      .trim();

    // Rigorously verified fallback catalog matching live ClubKonnect specifications
    const FALLBACK_CABLE_PACKAGES = {
      GOTV: [
        {
          id: "gotv-smallie",
          name: "GOtv Smallie - Monthly",
          amount: 1900,
          package_code: "gotv-smallie",
          item_code: "gotv-smallie",
          short_name: "GOtv Smallie - Monthly - ₦1,900",
        },
        {
          id: "gotv-smallie-3months",
          name: "GOtv Smallie - Quarterly",
          amount: 5100,
          package_code: "gotv-smallie-3months",
          item_code: "gotv-smallie-3months",
          short_name: "GOtv Smallie - Quarterly - ₦5,100",
        },
        {
          id: "gotv-smallie-1year",
          name: "GOtv Smallie - Yearly",
          amount: 15000,
          package_code: "gotv-smallie-1year",
          item_code: "gotv-smallie-1year",
          short_name: "GOtv Smallie - Yearly - ₦15,000",
        },
        {
          id: "gotv-jinja",
          name: "GOtv Jinja",
          amount: 3900,
          package_code: "gotv-jinja",
          item_code: "gotv-jinja",
          short_name: "GOtv Jinja - ₦3,900",
        },
        {
          id: "gotv-jolli",
          name: "GOtv Jolli",
          amount: 5800,
          package_code: "gotv-jolli",
          item_code: "gotv-jolli",
          short_name: "GOtv Jolli - ₦5,800",
        },
        {
          id: "gotv-max",
          name: "GOtv Max",
          amount: 8500,
          package_code: "gotv-max",
          item_code: "gotv-max",
          short_name: "GOtv Max - ₦8,500",
        },
        {
          id: "gotv-supa",
          name: "GOtv Supa",
          amount: 11400,
          package_code: "gotv-supa",
          item_code: "gotv-supa",
          short_name: "GOtv Supa - ₦11,400",
        },
        {
          id: "gotv-supa-plus",
          name: "GOtv Supa Plus",
          amount: 16800,
          package_code: "gotv-supa-plus",
          item_code: "gotv-supa-plus",
          short_name: "GOtv Supa Plus - ₦16,800",
        },
      ],
      DSTV: [
        {
          id: "dstv-padi",
          name: "DStv Padi",
          amount: 4400,
          package_code: "dstv-padi",
          item_code: "dstv-padi",
          short_name: "DStv Padi - ₦4,400",
        },
        {
          id: "dstv-yanga",
          name: "DStv Yanga",
          amount: 6000,
          package_code: "dstv-yanga",
          item_code: "dstv-yanga",
          short_name: "DStv Yanga - ₦6,000",
        },
        {
          id: "dstv-confam",
          name: "DStv Confam",
          amount: 11000,
          package_code: "dstv-confam",
          item_code: "dstv-confam",
          short_name: "DStv Confam - ₦11,000",
        },
        {
          id: "dstv-compact",
          name: "DStv Compact",
          amount: 19000,
          package_code: "dstv-compact",
          item_code: "dstv-compact",
          short_name: "DStv Compact - ₦19,000",
        },
        {
          id: "dstv-compact-plus",
          name: "DStv Compact Plus",
          amount: 30000,
          package_code: "dstv-compact-plus",
          item_code: "dstv-compact-plus",
          short_name: "DStv Compact Plus - ₦30,000",
        },
        {
          id: "dstv-premium",
          name: "DStv Premium",
          amount: 44000,
          package_code: "dstv-premium",
          item_code: "dstv-premium",
          short_name: "DStv Premium - ₦44,000",
        },
      ],
      STARTIMES: [
        {
          id: "nova",
          name: "Nova (Antenna) - 1 Month",
          amount: 2100,
          package_code: "nova",
          item_code: "nova",
          short_name: "Nova (Antenna) - ₦2,100",
        },
        {
          id: "basic",
          name: "Basic (Antenna) - 1 Month",
          amount: 3700,
          package_code: "basic",
          item_code: "basic",
          short_name: "Basic (Antenna) - ₦3,700",
        },
        {
          id: "smart",
          name: "Basic (Dish) - 1 Month",
          amount: 4700,
          package_code: "smart",
          item_code: "smart",
          short_name: "Basic (Dish) - ₦4,700",
        },
        {
          id: "classic",
          name: "Classic (Antenna) - 1 Month",
          amount: 6000,
          package_code: "classic",
          item_code: "classic",
          short_name: "Classic (Antenna) - ₦6,000",
        },
        {
          id: "super",
          name: "Super (Dish) - 1 Month",
          amount: 9800,
          package_code: "super",
          item_code: "super",
          short_name: "Super (Dish) - ₦9,800",
        },
      ],
      SHOWMAX: [
        {
          id: "showmax-entertainment",
          name: "Showmax Entertainment",
          amount: 2900,
          package_code: "showmax-entertainment",
          item_code: "showmax-entertainment",
          short_name: "Showmax Entertainment - ₦2,900",
        },
        {
          id: "showmax-premier-league",
          name: "Showmax Premier League",
          amount: 3200,
          package_code: "showmax-premier-league",
          item_code: "showmax-premier-league",
          short_name: "Showmax Premier League - ₦3,200",
        },
        {
          id: "showmax-all",
          name: "Showmax All Access",
          amount: 5400,
          package_code: "showmax-all",
          item_code: "showmax-all",
          short_name: "Showmax All Access - ₦5,400",
        },
      ],
    };

    try {
      const res = await fetch(
        `https://www.nellobytesystems.com/APICableTVPackagesV2.asp?UserID=${userId}`,
      );
      const data = await res.json();
      const tvObj = data?.TV_ID || data?.CABLETV || {};
      let rawPackages = [];

      if ((provUpper === "01" || provUpper.includes("DSTV")) && tvObj.DStv) {
        rawPackages = tvObj.DStv[0]?.PRODUCT || tvObj.DStv[0]?.PACKAGE || [];
      } else if (
        (provUpper === "02" || provUpper.includes("GOTV")) &&
        tvObj.GOtv
      ) {
        rawPackages = tvObj.GOtv[0]?.PRODUCT || tvObj.GOtv[0]?.PACKAGE || [];
      } else if (
        (provUpper === "03" ||
          provUpper.includes("STARTIMES") ||
          provUpper.includes("STARTIME")) &&
        tvObj.Startimes
      ) {
        rawPackages =
          tvObj.Startimes[0]?.PRODUCT || tvObj.Startimes[0]?.PACKAGE || [];
      } else if (
        (provUpper === "04" || provUpper.includes("SHOWMAX")) &&
        tvObj.Showmax
      ) {
        rawPackages =
          tvObj.Showmax[0]?.PRODUCT || tvObj.Showmax[0]?.PACKAGE || [];
      }

      if (rawPackages.length > 0) {
        const formatted = rawPackages.map((p) => {
          const amt = Number(p.PACKAGE_AMOUNT || p.amount || 0);
          const name = p.PACKAGE_NAME || p.name || "Package";
          const pkgCode = p.PACKAGE_ID || p.PACKAGE_CODE || p.package_code;
          return {
            id: pkgCode,
            name: name,
            short_name: `${name} - ₦${amt.toLocaleString()}`,
            amount: amt,
            package_code: pkgCode,
            item_code: pkgCode,
          };
        });
        return { status: "success", data: formatted };
      }
    } catch (err) {
      logger.error("Error fetching live cable packages:", err);
    }

    // Fallback to verified catalog matching provider
    const key =
      provUpper === "02" || provUpper.includes("GOTV")
        ? "GOTV"
        : provUpper === "03" ||
          provUpper.includes("STARTIMES") ||
          provUpper.includes("STARTIME")
          ? "STARTIMES"
          : provUpper === "04" || provUpper.includes("SHOWMAX")
            ? "SHOWMAX"
            : "DSTV";

    const fallback =
      FALLBACK_CABLE_PACKAGES[key] || FALLBACK_CABLE_PACKAGES.GOTV;
    return { status: "success", data: fallback };
  },
);

// ============================================================================
// DYNAMIC DATA PLAN PRICING ENGINE & ADMIN MANAGED CATALOG MODULE
// ============================================================================

export const DEFAULT_PRICING_CONFIG = {
  networks: {
    MTN: { marginRate: 0.30, cashbackRate: 0.025 },
    GLO: { marginRate: 0.20, cashbackRate: 0.020 },
    AIRTEL: { marginRate: 0.28, cashbackRate: 0.025 },
    "9MOBILE": { marginRate: 0.15, cashbackRate: 0.015 },
  },
  undercutSpreadMin: 20,
  undercutDiscount: 10,
  largePlanThreshold: 10000,
  heroCashbackRate: 0.005,
};

export const parsePlanValidity = (productName) => {
  const name = String(productName || "").toLowerCase();
  const matchDays = name.match(/(\d+)\s*(?:day|days|day\(s\)|d)\b/i);
  if (matchDays)
    return `${matchDays[1]} ${Number(matchDays[1]) === 1 ? "Day" : "Days"}`;
  const matchWeeks = name.match(/(\d+)\s*(?:week|weeks|wk|wks)\b/i);
  if (matchWeeks) return `${Number(matchWeeks[1]) * 7} Days`;
  const matchMonths = name.match(/(\d+)\s*(?:month|months|mo|mos)\b/i);
  if (matchMonths) return `${Number(matchMonths[1]) * 30} Days`;
  if (
    name.includes("daily") ||
    name.includes("24hr") ||
    name.includes("24 hour") ||
    name.includes("1day")
  )
    return "1 Day";
  if (
    name.includes("weekly") ||
    name.includes("1week") ||
    name.includes("7day")
  )
    return "7 Days";
  if (
    name.includes("fortnight") ||
    name.includes("2week") ||
    name.includes("14day")
  )
    return "14 Days";
  if (
    name.includes("monthly") ||
    name.includes("30day") ||
    name.includes("1month") ||
    name.includes("sme")
  )
    return "30 Days";
  return "30 Days";
};

export function calculatePlanPricing(
  costPrice,
  network,
  competitorPrice = null,
  customDisplayPrice = null,
  overrideMode = "AUTOMATIC",
  config = DEFAULT_PRICING_CONFIG,
) {
  const netUpper = String(network || "MTN").toUpperCase();
  const netKey = netUpper.includes("GLO")
    ? "GLO"
    : netUpper.includes("AIRTEL")
      ? "AIRTEL"
      : netUpper.includes("9MOB") || netUpper.includes("ETISALAT")
        ? "9MOBILE"
        : "MTN";

  const netConfig = config?.networks?.[netKey] || DEFAULT_PRICING_CONFIG.networks[netKey];

  const undercutSpreadMin = Number(config?.undercutSpreadMin ?? 20);
  const undercutDiscount = Number(config?.undercutDiscount ?? 10);
  const largePlanThreshold = Number(config?.largePlanThreshold ?? 10000);
  const heroCashbackRate = Number(config?.heroCashbackRate ?? 0.005);
  const standardMarginRate = Number(netConfig?.marginRate ?? 0.30);
  const standardCashbackRate = Number(netConfig?.cashbackRate ?? 0.025);

  const numCost = Number(costPrice || 0);
  const numComp =
    competitorPrice !== null && competitorPrice !== undefined && competitorPrice !== ""
      ? Number(competitorPrice)
      : null;
  const numCustom =
    customDisplayPrice !== null && customDisplayPrice !== undefined && customDisplayPrice !== ""
      ? Number(customDisplayPrice)
      : null;

  // Rule 6: Manual Override Mode
  if (overrideMode === "MANUAL" && numCustom && numCustom > 0) {
    const isHero = numComp !== null && !isNaN(numComp) && numComp > 0;
    const cashbackRate = isHero ? heroCashbackRate : standardCashbackRate;
    const margin = Math.max(0, numCustom - numCost);
    const cashbackAmount = Math.round(margin * cashbackRate * 100) / 100;
    const profit = Math.round((numCustom - numCost - cashbackAmount) * 100) / 100;

    return {
      displayPrice: numCustom,
      costPrice: numCost,
      competitorPrice: numComp,
      isHero,
      cashbackRate,
      cashbackAmount,
      profit,
      ruleApplied: "MANUAL_OVERRIDE",
    };
  }

  let displayPrice = 0;
  let isHero = false;
  let ruleApplied = "STANDARD_MARGIN";

  if (numComp !== null && !isNaN(numComp) && numComp > 0) {
    const spread = numComp - numCost;

    if (numComp >= largePlanThreshold) {
      // Rule 3: Large Plan Match
      displayPrice = numComp;
      isHero = true;
      ruleApplied = "LARGE_PLAN_MATCH";
    } else if (spread > undercutSpreadMin) {
      // Rule 2: Competitor Undercut Rule
      const floorTarget = Math.round((numCost * 1.01) / 10) * 10;
      const undercutTarget = numComp - undercutDiscount;
      displayPrice = Math.max(floorTarget, undercutTarget);
      isHero = true;
      ruleApplied = "COMPETITOR_UNDERCUT";
    } else if (spread > 0) {
      // Rule 4a: Tight Margin Match
      displayPrice = numComp;
      isHero = true;
      ruleApplied = "TIGHT_MARGIN_MATCH";
    } else {
      // Rule 4b: Loss Prevention Fallback
      displayPrice = Math.round((numCost * (1 + standardMarginRate)) / 10) * 10;
      isHero = false;
      ruleApplied = "LOSS_PREVENTION_FALLBACK";
    }
  } else {
    // Rule 1: Standard Network Margin (MROUND 10)
    displayPrice = Math.round((numCost * (1 + standardMarginRate)) / 10) * 10;
    isHero = false;
    ruleApplied = "STANDARD_MARGIN";
  }

  const cashbackRate = isHero ? heroCashbackRate : standardCashbackRate;
  const margin = Math.max(0, displayPrice - numCost);
  const cashbackAmount = Math.round(margin * cashbackRate * 100) / 100;
  const profit = Math.round((displayPrice - numCost - cashbackAmount) * 100) / 100;

  return {
    displayPrice,
    costPrice: numCost,
    competitorPrice: numComp,
    isHero,
    cashbackRate,
    cashbackAmount,
    profit,
    ruleApplied,
  };
}

export async function getPricingConfigCore() {
  try {
    const docSnap = await db.collection("system_settings").doc("pricing_config").get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      return {
        ...DEFAULT_PRICING_CONFIG,
        ...data,
        networks: {
          ...DEFAULT_PRICING_CONFIG.networks,
          ...(data.networks || {}),
        },
      };
    }
  } catch (err) {
    logger.error("Error reading pricing_config:", err);
  }
  return DEFAULT_PRICING_CONFIG;
}

export async function syncClubKonnectDataPlansCore() {
  const userId = getClubKonnectUserId();
  const res = await fetch(
    `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${userId}`,
  );
  const data = await res.json();
  const mobileNetworkObj = data?.MOBILE_NETWORK || {};

  const networkMappings = [
    { key: "MTN", rawObj: mobileNetworkObj.MTN },
    { key: "GLO", rawObj: mobileNetworkObj.Glo },
    { key: "AIRTEL", rawObj: mobileNetworkObj.Airtel },
    {
      key: "9MOBILE",
      rawObj: mobileNetworkObj.m_9mobile || mobileNetworkObj["9mobile"],
    },
  ];

  let syncedCount = 0;
  const batch = db.batch();

  for (const net of networkMappings) {
    const rawPlans = net.rawObj?.[0]?.PRODUCT || [];
    for (const p of rawPlans) {
      const planId = String(p.PRODUCT_ID || p.PRODUCT_CODE).trim();
      const planName = String(p.PRODUCT_NAME).trim();
      const rawCost = Number(p.PRODUCT_AMOUNT || 0);
      const roundedCost = Math.round(rawCost * 100) / 100;
      const docRef = db.collection("data_plan_pricing").doc(`${net.key}_${planId}`);

      batch.set(
        docRef,
        {
          planId,
          network: net.key,
          planName,
          costPrice: roundedCost,
          validity_period: parsePlanValidity(planName),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      syncedCount++;
    }
  }

  const configRef = db.collection("system_settings").doc("pricing_config");
  batch.set(
    configRef,
    { lastSyncedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );

  await batch.commit();
  return syncedCount;
}

export async function seedPricingFromExcelCore() {
  const configRef = db.collection("system_settings").doc("pricing_config");
  await configRef.set(
    {
      ...DEFAULT_PRICING_CONFIG,
      seededAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const syncedCount = await syncClubKonnectDataPlansCore();

  const excelCompetitorPrices = [
    { docId: "MTN_22", competitorPrice: 500 },  // 650MB Awoof
    { docId: "MTN_27", competitorPrice: 1200 }, // 2.44GB Direct Data
    { docId: "MTN_30", competitorPrice: 2500 }, // 5.10GB Direct Data
    { docId: "MTN_31", competitorPrice: 3000 }, // 6.5GB Direct Data
    { docId: "MTN_33", competitorPrice: 10000 },// 24.3GB Direct Data
    { docId: "MTN_35", competitorPrice: 15000 },// 39GB Direct Data
  ];

  const batch = db.batch();
  for (const item of excelCompetitorPrices) {
    const docRef = db.collection("data_plan_pricing").doc(item.docId);
    batch.set(docRef, { competitorPrice: item.competitorPrice }, { merge: true });
  }
  await batch.commit();

  return syncedCount;
}

const verifyAdmin = async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator ? "dev_user_123" : null);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  if (isEmulator) return uid;
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data() || {};
  if (userData.role !== "admin" && !userData.isAdmin) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
  return uid;
};

// 6. FETCH DATA PLANS (Firestore Catalog Reader in <30ms)
export const clubkonnectFetchDataPlans = onCall(
  { cors: true },
  async (request) => {
    const { network } = request.data || {};
    const netUpper = String(network || "MTN").toUpperCase();
    const netKey = netUpper.includes("GLO")
      ? "GLO"
      : netUpper.includes("AIRTEL")
        ? "AIRTEL"
        : netUpper.includes("9MOB") || netUpper.includes("ETISALAT")
          ? "9MOBILE"
          : "MTN";

    try {
      const config = await getPricingConfigCore();
      let plansSnap = await db
        .collection("data_plan_pricing")
        .where("network", "==", netKey)
        .get();

      if (plansSnap.empty) {
        logger.info(`data_plan_pricing empty for ${netKey}, executing auto-sync...`);
        await syncClubKonnectDataPlansCore();
        plansSnap = await db
          .collection("data_plan_pricing")
          .where("network", "==", netKey)
          .get();
      }

      const formattedPlans = [];
      plansSnap.forEach((doc) => {
        const p = doc.data() || {};
        if (p.isActive === false) return;

        const pricingResult = calculatePlanPricing(
          p.costPrice,
          netKey,
          p.competitorPrice,
          p.customDisplayPrice,
          p.overrideMode,
          config,
        );

        formattedPlans.push({
          id: p.planId || doc.id.replace(`${netKey}_`, ""),
          biller_name: `${netKey} ${p.planName}`,
          amount: pricingResult.displayPrice,
          costPrice: pricingResult.costPrice,
          cashbackAmount: pricingResult.cashbackAmount,
          isHero: pricingResult.isHero,
          item_code: p.planId || doc.id.replace(`${netKey}_`, ""),
          validity_period: p.validity_period || parsePlanValidity(p.planName),
          validity: p.validity_period || parsePlanValidity(p.planName),
        });
      });

      if (formattedPlans.length > 0) {
        return { status: "success", data: formattedPlans };
      }
    } catch (error) {
      logger.error("Error fetching dynamic data plans from Firestore:", error);
    }

    return { status: "error", message: "Failed to fetch data plans" };
  },
);

// ADMIN CALLABLES & EXPORTS
export const adminSyncClubKonnect = onCall({ cors: true }, async (request) => {
  await verifyAdmin(request);
  const syncedCount = await syncClubKonnectDataPlansCore();
  return { status: "success", message: `Synced ${syncedCount} data plans from ClubKonnect.` };
});

export const adminGetPricingConfig = onCall({ cors: true }, async (request) => {
  console.log("📥 [adminGetPricingConfig] Invocation by UID:", request.auth?.uid || "unauthenticated");
  try {
    await verifyAdmin(request);
    const config = await getPricingConfigCore();
    const plansSnap = await db.collection("data_plan_pricing").get();
    const plans = [];
    const flaggedPlans = [];

    plansSnap.forEach((doc) => {
      const data = doc.data() || {};
      const fallbackFields = [];
      const fallbackReasons = [];

      if (
        data.costPrice === undefined ||
        data.costPrice === null ||
        data.costPrice === "" ||
        isNaN(Number(data.costPrice)) ||
        Number(data.costPrice) <= 0
      ) {
        fallbackFields.push("costPrice");
        fallbackReasons.push(
          data.costPrice === undefined || data.costPrice === null
            ? "costPrice is missing (fallback default: 0)"
            : `costPrice is invalid '${data.costPrice}' (fallback default: 0)`
        );
      }

      if (!data.network || typeof data.network !== "string") {
        fallbackFields.push("network");
        fallbackReasons.push("network is missing (fallback default: 'MTN')");
      }

      if (!data.validity_period && !data.validity) {
        fallbackFields.push("validity");
        fallbackReasons.push("validity is missing (fallback default: '30 Days')");
      }

      if (!data.planName || typeof data.planName !== "string" || !data.planName.trim()) {
        fallbackFields.push("planName");
        fallbackReasons.push(`planName is missing (fallback default: '${doc.id}')`);
      }

      if (data.isActive === undefined || data.isActive === null) {
        fallbackFields.push("isActive");
        fallbackReasons.push("isActive is missing (fallback default: true)");
      }

      if (!data.overrideMode) {
        fallbackFields.push("overrideMode");
        fallbackReasons.push("overrideMode is missing (fallback default: 'AUTOMATIC')");
      }

      const netUpper = String(data.network || "MTN").toUpperCase();
      const netKey = netUpper.includes("GLO")
        ? "GLO"
        : netUpper.includes("AIRTEL")
          ? "AIRTEL"
          : netUpper.includes("9MOB") || netUpper.includes("ETISALAT")
            ? "9MOBILE"
            : "MTN";

      if (!config?.networks?.[netKey]) {
        fallbackFields.push("networkConfig");
        fallbackReasons.push(`network config missing for '${netKey}' (fallback to DEFAULT_PRICING_CONFIG)`);
      }

      const fallbackApplied = fallbackFields.length > 0;

      if (fallbackApplied) {
        flaggedPlans.push({
          id: doc.id,
          planName: data.planName || doc.id,
          network: data.network || "UNKNOWN",
          fallbackFields,
          fallbackReasons,
        });
        logger.warn(`⚠️ [adminGetPricingConfig] Plan ${doc.id} required fallback defaults:`, {
          planId: doc.id,
          fallbackFields,
          fallbackReasons,
        });
        console.warn(`⚠️ [adminGetPricingConfig] Plan ${doc.id} fallback needed: ${fallbackReasons.join("; ")}`);
      }

      const validityVal = data.validity_period || data.validity || "30 Days";
      const pricingResult = calculatePlanPricing(
        data.costPrice,
        data.network,
        data.competitorPrice,
        data.customDisplayPrice,
        data.overrideMode,
        config,
      );

      plans.push({
        id: doc.id,
        planName: data.planName || doc.id,
        ...data,
        validity_period: validityVal,
        validity: validityVal,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isHero: pricingResult.isHero,
        overrideMode: data.overrideMode || "AUTOMATIC",
        fallbackApplied,
        fallbackFields,
        fallbackReasons,
        ...pricingResult,
      });
    });

    if (flaggedPlans.length > 0) {
      logger.warn(
        `🚨 [adminGetPricingConfig] VISIBILITY WARNING: ${flaggedPlans.length}/${plansSnap.size} plans required fallback defaults. Upstream sync may have dropped fields. Flagged plan IDs: ${flaggedPlans.map((p) => `${p.id} [${p.fallbackFields.join(",")}]`).join("; ")}`
      );
      console.warn(
        `🚨 [adminGetPricingConfig] VISIBILITY WARNING: ${flaggedPlans.length} plans required fallback defaults.`
      );
    } else {
      console.log(`✅ [adminGetPricingConfig] All ${plans.length} plans loaded cleanly without fallbacks.`);
    }

    console.log(`✅ [adminGetPricingConfig] Returning ${plans.length} plans (${flaggedPlans.length} flagged for fallbacks).`);
    return {
      status: "success",
      config,
      plans,
      flaggedCount: flaggedPlans.length,
      hasFallbackPlans: flaggedPlans.length > 0,
      flaggedPlansSummary: flaggedPlans.map((p) => ({
        id: p.id,
        fallbackFields: p.fallbackFields,
        fallbackReasons: p.fallbackReasons,
      })),
    };
  } catch (err) {
    console.error("❌ [adminGetPricingConfig] CRITICAL ERROR:", err);
    logger.error("adminGetPricingConfig error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || "Failed to fetch pricing config");
  }
});

export const adminUpdatePricingConfig = onCall({ cors: true }, async (request) => {
  await verifyAdmin(request);
  const { networks, undercutSpreadMin, undercutDiscount, largePlanThreshold, heroCashbackRate } =
    request.data || {};
  const updateData = {};
  if (networks) updateData.networks = networks;
  if (undercutSpreadMin !== undefined) updateData.undercutSpreadMin = Number(undercutSpreadMin);
  if (undercutDiscount !== undefined) updateData.undercutDiscount = Number(undercutDiscount);
  if (largePlanThreshold !== undefined) updateData.largePlanThreshold = Number(largePlanThreshold);
  if (heroCashbackRate !== undefined) updateData.heroCashbackRate = Number(heroCashbackRate);
  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("system_settings").doc("pricing_config").set(updateData, { merge: true });
  return { status: "success", message: "Pricing configuration updated successfully." };
});

export const adminUpdatePlanPrice = onCall({ cors: true }, async (request) => {
  await verifyAdmin(request);
  const { docId, competitorPrice, customDisplayPrice, overrideMode, isActive } = request.data || {};
  if (!docId) throw new HttpsError("invalid-argument", "Plan docId is required.");

  const updateData = {};
  if (competitorPrice !== undefined)
    updateData.competitorPrice = competitorPrice === "" || competitorPrice === null ? null : Number(competitorPrice);
  if (customDisplayPrice !== undefined)
    updateData.customDisplayPrice = customDisplayPrice === "" || customDisplayPrice === null ? null : Number(customDisplayPrice);
  if (overrideMode) updateData.overrideMode = overrideMode;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("data_plan_pricing").doc(docId).set(updateData, { merge: true });
  return { status: "success", message: "Plan price updated successfully." };
});

export const adminSeedPricingFromExcel = onCall({ cors: true }, async (request) => {
  await verifyAdmin(request);
  const count = await seedPricingFromExcelCore();
  return { status: "success", message: `Seeded pricing logic and ${count} plan initial configurations.` };
});

export const scheduledClubKonnectSync = onSchedule("every 6 hours", async (event) => {
  logger.info("⏰ Executing scheduled 6-hour ClubKonnect data plan cost sync...");
  try {
    const count = await syncClubKonnectDataPlansCore();
    logger.info(`✅ Scheduled sync complete! Updated ${count} data plans.`);
  } catch (err) {
    logger.error("❌ Scheduled ClubKonnect sync failed:", err);
  }
});

// EXPORT CALLABLE ALIASES
export const buyAirtime = clubkonnectBuyAirtime;
export const buyData = clubkonnectBuyData;
export const payElectricity = clubkonnectPayElectricity;
export const payCable = clubkonnectPayCable;
export const fetchDataPlans = clubkonnectFetchDataPlans;
export const fetchCablePackages = clubkonnectFetchCablePackages;

// 6. END-OF-DAY NET SUBACCOUNT SETTLEMENT BATCH ENGINE
export async function executeSubaccountSettlementBatch() {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const isoNow = new Date().toISOString();
  const dateKey = new Date().toISOString().split("T")[0];
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const merchantId = getFlutterwaveMerchantId();

  logger.info(
    `🚀 Starting Nightly Subaccount Settlement Batch for ${dateKey}...`,
  );

  const pendingSnap = await db
    .collection("admin_pending_settlements")
    .where("status", "==", "PENDING_SWEEP")
    .get();

  if (pendingSnap.empty) {
    logger.info("ℹ️ No pending subaccount settlements found to sweep tonight.");
    return {
      status: "success",
      message: "No pending settlements to process",
      settledCount: 0,
      totalAmount: 0,
    };
  }

  // Group pending debits by user accountReference
  const grouped = {};
  pendingSnap.docs.forEach((d) => {
    const data = d.data();
    const ref = data.accountReference || data.uid;
    if (!grouped[ref]) {
      grouped[ref] = {
        accountReference: data.accountReference || "",
        accountNumber: data.accountNumber || "",
        bankCode: data.bankCode || "035",
        bankName: data.bankName || "Wema Bank PLC",
        barter_id: data.barter_id || "",
        uid: data.uid,
        userEmail: data.userEmail || "",
        totalAmount: 0,
        docIds: [],
      };
    }
    grouped[ref].totalAmount += Number(data.amount || 0);
    grouped[ref].docIds.push(d.id);
  });

  let totalSettledAmount = 0;
  let settledSubaccountsCount = 0;
  const batchLogRef = db
    .collection("admin_daily_sweep_batches")
    .doc(`BATCH_${dateKey}_${Date.now()}`);

  for (const [refKey, group] of Object.entries(grouped)) {
    const sweepRef = `PWK_SWEEP_${group.uid}_${Date.now()}`;
    let sweepSuccess = false;
    let flwResponse = null;

    if (isEmulator || !group.accountReference) {
      // Emulator / Mock mode simulation
      logger.info(
        `🧪 [Emulator Sweep Simulation]: Sweeping ₦${group.totalAmount} from Subaccount (${group.accountReference || group.uid}) to Merchant ID ${merchantId}`,
      );
      sweepSuccess = true;
      flwResponse = {
        status: "success",
        message: "Simulated sweep in emulator mode",
        id: `EMU_${Date.now()}`,
      };
    } else {
      // Live Flutterwave debit_subaccount call to pull funds from user subaccount into merchant pool
      try {
        const flwSecKey =
          process.env.FLW_MSECRET_KEY || process.env.FLW_SECRET_KEY;
        const res = await fetch("https://api.flutterwave.com/v3/transfers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${flwSecKey}`,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            amount: group.totalAmount,
            currency: "NGN",
            debit_currency: "NGN",
            debit_subaccount: group.accountReference, // Sweeps directly from customer's PSA
            narration: `PayWaka Daily Net Bill Settlement - ${group.userEmail}`,
            reference: sweepRef,
          }),
        });
        flwResponse = await res.json();
        sweepSuccess =
          flwResponse?.status === "success" ||
          flwResponse?.status === "NEW" ||
          flwResponse?.status === "PENDING";
      } catch (err) {
        logger.error(
          `❌ Flutterwave sweep transfer failed for ${group.accountReference}:`,
          err,
        );
        sweepSuccess = false;
        flwResponse = { error: err.message };
      }
    }

    // Update the pending settlements in Firestore
    const batch = db.batch();
    group.docIds.forEach((docId) => {
      const docRef = db.collection("admin_pending_settlements").doc(docId);
      batch.update(docRef, {
        status: sweepSuccess ? "SETTLED_SUCCESSFULLY" : "SWEEP_FAILED",
        sweepRef,
        sweepResponse: flwResponse,
        settledAt: now,
        settled_at: isoNow,
      });
    });
    await batch.commit();

    if (sweepSuccess) {
      totalSettledAmount += group.totalAmount;
      settledSubaccountsCount++;
    }
  }

  await batchLogRef.set({
    dateKey,
    totalSettledAmount,
    settledSubaccountsCount,
    totalItems: pendingSnap.size,
    merchantId,
    createdAt: now,
    created_at: isoNow,
  });

  logger.info(
    `✅ Daily Subaccount Settlement Batch Finished. Total: ₦${totalSettledAmount} across ${settledSubaccountsCount} subaccounts.`,
  );
  return {
    status: "success",
    settledCount: settledSubaccountsCount,
    totalAmount: totalSettledAmount,
  };
}

// 7. SCHEDULED DAILY SWEEP CRON (23:59 Daily Lagos Time)
export const nightlyConsolidatedSubaccountSweep = onSchedule(
  {
    schedule: "59 23 * * *",
    timeZone: "Africa/Lagos",
  },
  async () => {
    return await executeSubaccountSettlementBatch();
  },
);

// 8. ADMIN ONCALL TRIGGER FOR IMMEDIATE SWEEP RECONCILIATION
export const adminTriggerDailySettlement = onCall(
  { cors: true },
  async (request) => {
    return await executeSubaccountSettlementBatch();
  },
);

// =========================================================================
// MEAL REWARDS & COUPON SYSTEM (PHASE 4: CUSTOMER VOUCHER ISSUANCE)
// =========================================================================

const DEMO_OFFERS_CATALOG = {
  "coupon-demo-jollof": {
    offerId: "coupon-demo-jollof",
    campaignId: "camp-demo-jollof",
    vendorId: "paywaka-demo-foods",
    vendorName: "PayWaka Demo Foods",
    title: "₦500 Meal Discount Voucher",
    pointsCost: 100,
    discountNaira: 500,
    minSpendNaira: 2500,
    status: "active",
  },
  "coupon-demo-pizza": {
    offerId: "coupon-demo-pizza",
    campaignId: "camp-demo-pizza",
    vendorId: "demo-woodfire-pizza",
    vendorName: "Demo Woodfire Pizza",
    title: "₦1,000 Woodfire Discount",
    pointsCost: 200,
    discountNaira: 1000,
    minSpendNaira: 5000,
    status: "active",
  },
  "coupon-demo-burger": {
    offerId: "coupon-demo-burger",
    campaignId: "camp-demo-burger",
    vendorId: "test-kitchen-lagos",
    vendorName: "Test Kitchen Lagos",
    title: "₦750 Gourmet Burger Voucher",
    pointsCost: 150,
    discountNaira: 750,
    minSpendNaira: 3800,
    status: "active",
  },
  "coupon-demo-pastry": {
    offerId: "coupon-demo-pastry",
    campaignId: "camp-demo-pastry",
    vendorId: "artisan-bakehouse-demo",
    vendorName: "Artisan Bakehouse Demo",
    title: "₦400 Pastry & Coffee Voucher",
    pointsCost: 80,
    discountNaira: 400,
    minSpendNaira: 2000,
    status: "active",
  },
  "coupon-demo-suya": {
    offerId: "coupon-demo-suya",
    campaignId: "camp-demo-suya",
    vendorId: "demo-grill-hub",
    vendorName: "Demo Grill Hub",
    title: "₦600 Suya Feast Voucher",
    pointsCost: 120,
    discountNaira: 600,
    minSpendNaira: 3000,
    status: "active",
  },
};

/**
 * Authoritative Server-Side Voucher Issuance Engine
 * Enforces all Phase 3 & Phase 4 invariants:
 * - Caller authentication
 * - 4-digit PayWaka Transaction PIN security & temporary lockout checks
 * - users/{uid}.points is sole authoritative spendable balance (atomic decrement)
 * - Dedicated negative ledger entry users/{uid}/points/spend_pts_{idempotencyKey}
 * - 48h server expiration window
 * - Active voucher restriction (max 1 active unexpired voucher per offer)
 * - Lifetime claim limit (max 2 claims per offer)
 * - Campaign budget NOT consumed at issuance (budget reserved for Phase 5 vendor redemption)
 * - Idempotency by claimRequestId / idempotencyKey
 */
export async function redeemMealCouponCore({ uid, couponId, pin, idempotencyKey, overrideNow = null }) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required to redeem meal coupon.");
  }
  if (!couponId || typeof couponId !== "string") {
    throw new HttpsError("invalid-argument", "Valid couponId is required.");
  }

  // 1. Verify 4-digit Transaction PIN via existing security engine
  await verifyUserPinCore(uid, pin);

  const safeIdempotencyKey =
    idempotencyKey && typeof idempotencyKey === "string" && idempotencyKey.trim()
      ? idempotencyKey.trim()
      : `claim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const nowMs = overrideNow ? overrideNow.getTime() : Date.now();
  const nowDate = new Date(nowMs);
  const expiresAt = new Date(nowMs + 48 * 3600 * 1000); // 48h from server issuance

  const userRef = db.collection("users").doc(uid);

  // 2. Resolve Campaign Reference BEFORE entering transaction to prevent query locks
  let campaignRef = db.collection("meal_campaigns").doc(couponId);
  let resolvedCampSnap = await campaignRef.get();
  let catalogFallback = null;

  if (!resolvedCampSnap.exists) {
    const qSnap = await db.collection("meal_campaigns").where("offerId", "==", couponId).limit(1).get();
    if (!qSnap.empty) {
      resolvedCampSnap = qSnap.docs[0];
      campaignRef = resolvedCampSnap.ref;
    } else {
      const couponRef = db.collection("meal_coupons").doc(couponId);
      const couponSnap = await couponRef.get();
      if (couponSnap.exists) {
        resolvedCampSnap = couponSnap;
        campaignRef = couponRef;
      } else if (DEMO_OFFERS_CATALOG[couponId]) {
        catalogFallback = DEMO_OFFERS_CATALOG[couponId];
      }
    }
  }

  if (!resolvedCampSnap.exists && !catalogFallback) {
    throw new HttpsError("not-found", "Meal campaign or coupon offer not found.");
  }

  const result = await db.runTransaction(async (t) => {
    // 2. Fetch Campaign definition by direct document reference inside transaction
    let campaignDoc = resolvedCampSnap.exists ? await t.get(campaignRef) : null;
    let campaignData = campaignDoc && campaignDoc.exists ? campaignDoc.data() : catalogFallback;

    if (!campaignData) {
      throw new HttpsError("not-found", "Meal campaign or coupon offer not found.");
    }

    const campaignId = campaignDoc?.exists ? campaignDoc.id : campaignData.campaignId || couponId;
    const offerId = campaignData.offerId || couponId;

    // Authoritative In-Transaction Quarantine Check
    const quarantineRef = db.collection("quarantined_meal_campaigns").doc(campaignId);
    const quarantineDoc = await t.get(quarantineRef);
    if (quarantineDoc.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This meal offer is quarantined and unavailable for customer claims."
      );
    }

    // Public Projection Reference (must be read before writes)
    const publicOfferRef = db.collection("public_meal_offers").doc(campaignId);
    const publicOfferDoc = await t.get(publicOfferRef);

    // Require campaign with migrationStatus === "ready" before normal processing
    if (campaignDoc?.exists) {
      if (campaignData.migrationStatus !== "ready") {
        throw new HttpsError(
          "failed-precondition",
          `This meal offer is not ready for customer claims (migration status: ${campaignData.migrationStatus || "unmigrated"}).`
        );
      }
    }

    if (campaignData.status !== "active") {
      if (campaignData.status === "paused") {
        throw new HttpsError("failed-precondition", "This meal offer is currently paused for new claims.");
      }
      if (campaignData.status === "ended") {
        throw new HttpsError("failed-precondition", "This meal offer has concluded.");
      }
      if (campaignData.status === "emergency_halt") {
        throw new HttpsError("failed-precondition", "This meal offer is temporarily halted by administration.");
      }
      throw new HttpsError("failed-precondition", "This meal offer is currently inactive or concluded.");
    }

    const pointsCost = Number(campaignData.pointsCost || 100);
    const discountNaira = Number(campaignData.discountNaira || campaignData.discountAmount || 500);
    const minSpendNaira = Number(campaignData.minSpendNaira || campaignData.minSpend || 2500);
    const vendorId = campaignData.vendorId || "paywaka-demo-foods";
    const vendorName = campaignData.vendorName || "PayWaka Partner Food";

    // Read vendor profile inside transaction (all reads before writes) to resolve authoritative logo
    const vendorProfileSnap = await t.get(db.collection("meal_vendors").doc(vendorId));
    const vendorProfileData = vendorProfileSnap.exists ? vendorProfileSnap.data() || {} : {};
    const resolvedVendorLogoUrl = campaignData.vendorLogoUrl || vendorProfileData.logoUrl || null;
    const resolvedVendorLogoEmoji = campaignData.vendorLogoEmoji || vendorProfileData.logoEmoji || "🍗";

    // Commercial Terms Invariant: minSpendNaira >= discountNaira
    if (minSpendNaira < discountNaira) {
      throw new HttpsError(
        "failed-precondition",
        `Campaign configuration error: promotional discount (₦${discountNaira}) exceeds minimum spend requirement (₦${minSpendNaira}).`
      );
    }

    // Normal Available Capacity Calculation:
    // campaignBudgetNaira - (campaignSpentNaira + campaignReservedNaira) >= discountNaira
    const campaignBudget = Number(campaignData.campaignBudgetNaira || 100000);
    const campaignSpent = Number(campaignData.campaignSpentNaira || 0);
    const campaignReserved = Number(campaignData.campaignReservedNaira || 0);
    const availableCapacity = campaignBudget - (campaignSpent + campaignReserved);

    if (availableCapacity < discountNaira) {
      throw new HttpsError(
        "resource-exhausted",
        `Campaign promotional budget capacity exhausted. Available: ₦${Math.max(0, availableCapacity).toLocaleString()}, Required: ₦${discountNaira.toLocaleString()}.`
      );
    }

    // 3. Fetch User spendable balance
    const userDoc = await t.get(userRef);
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User account not found.");
    }
    const userData = userDoc.data() || {};
    const currentPoints = Number(userData.points || 0);
    if (currentPoints < pointsCost) {
      throw new HttpsError(
        "failed-precondition",
        `Insufficient PayWaka Points. Required: ${pointsCost} pts, Available: ${currentPoints} pts.`
      );
    }

    // 4. Fetch User Meal Claim record for this specific offer
    const claimRef = db.collection("users").doc(uid).collection("mealClaims").doc(offerId);
    const claimDoc = await t.get(claimRef);
    const claimData = claimDoc.exists
      ? claimDoc.data()
      : { lifetimeClaimCount: 0, activeVoucherId: null, activeVoucherExpiresAt: null, claimHistory: {} };

    // 4a. Idempotency Check: if already processed for this idempotency key, return existing voucher
    if (claimData.claimHistory && claimData.claimHistory[safeIdempotencyKey]) {
      const existingVoucherId = claimData.claimHistory[safeIdempotencyKey].voucherId;
      const existingVoucherSnap = await t.get(db.collection("meal_vouchers").doc(existingVoucherId));
      if (existingVoucherSnap.exists) {
        const vData = existingVoucherSnap.data();
        return {
          success: true,
          voucher: {
            ...vData,
            expiresAt: vData.expiresAt?.toDate ? vData.expiresAt.toDate().toISOString() : vData.expiresAt,
          },
          idempotent: true,
          lifetimeClaimCount: claimData.lifetimeClaimCount,
          pointsRemaining: currentPoints,
          message: "Voucher already issued for this claim request.",
        };
      }
    }

    // 4b. Lifetime Claim Limit Check (max 2)
    if (Number(claimData.lifetimeClaimCount || 0) >= 2) {
      throw new HttpsError(
        "resource-exhausted",
        "Lifetime claim limit reached. You can claim this offer a maximum of 2 times."
      );
    }

    // 4c. Active Voucher Restriction (max 1 active unexpired voucher per offer)
    if (claimData.activeVoucherId) {
      const activeExpiresAtMs = claimData.activeVoucherExpiresAt?.toMillis
        ? claimData.activeVoucherExpiresAt.toMillis()
        : claimData.activeVoucherExpiresAt?.toDate
          ? claimData.activeVoucherExpiresAt.toDate().getTime()
          : claimData.activeVoucherExpiresAt
            ? new Date(claimData.activeVoucherExpiresAt).getTime()
            : 0;

      if (nowMs < activeExpiresAtMs) {
        const activeVoucherDoc = await t.get(db.collection("meal_vouchers").doc(claimData.activeVoucherId));
        if (activeVoucherDoc.exists) {
          const vData = activeVoucherDoc.data();
          if (vData.status === "active") {
            throw new HttpsError(
              "already-exists",
              "You already hold an active unredeemed voucher for this offer. You can only hold 1 active voucher per offer at a time."
            );
          }
        }
      }
    }

    // 5. Generate Voucher ID & Unique Codes
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const voucherId = `vch_${uid.slice(0, 5)}_${Date.now().toString(36)}_${randomSuffix}`;
    const codeOfferPart = offerId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "MEAL";
    const codeDigits = Math.floor(1000 + Math.random() * 9000);
    const voucherCode = `PWK-${codeOfferPart}-${codeDigits}`;
    const voucherPin = String(Math.floor(1000 + Math.random() * 9000)); // Distinct voucher PIN

    // 6. Deduct points from users/{uid}.points
    t.update(userRef, {
      points: admin.firestore.FieldValue.increment(-pointsCost),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 7. Write Negative Ledger Entry users/{uid}/points/spend_pts_{idempotencyKey}
    const ledgerDocRef = db.collection("users").doc(uid).collection("points").doc(`spend_pts_${safeIdempotencyKey}`);
    t.set(ledgerDocRef, {
      type: "meal_voucher_spend",
      points: -pointsCost,
      direction: "debit",
      source: "meal_coupon",
      referenceId: safeIdempotencyKey,
      voucherId: voucherId,
      offerId: offerId,
      campaignId: campaignId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 8. Atomically reserve promotional budget capacity on the campaign
    if (!campaignDoc?.exists) {
      t.set(campaignRef, {
        id: campaignId,
        offerId: offerId,
        vendorId: vendorId,
        vendorName: vendorName,
        pointsCost: pointsCost,
        discountNaira: discountNaira,
        minSpendNaira: minSpendNaira,
        status: "active",
        migrationStatus: "ready",
        campaignBudgetNaira: campaignBudget,
        campaignSpentNaira: 0,
        campaignReservedNaira: discountNaira,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      t.update(campaignRef, {
        campaignReservedNaira: admin.firestore.FieldValue.increment(discountNaira),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 9. Write Voucher Document in meal_vouchers/{voucherId}
    const voucherDocRef = db.collection("meal_vouchers").doc(voucherId);
    const voucherRecord = {
      id: voucherId,
      userId: uid,
      campaignId: campaignId,
      offerId: offerId,
      vendorId: vendorId,
      vendorName: vendorName,
      vendorLogoUrl: resolvedVendorLogoUrl,
      vendorLogoEmoji: resolvedVendorLogoEmoji,
      title: campaignData.title || `${vendorName} ₦${discountNaira} Meal Discount`,
      category: campaignData.category || "Local Delicacies",
      image: campaignData.image || null,
      discountNaira: discountNaira,
      minSpendNaira: minSpendNaira,
      pointsDeducted: pointsCost,
      voucherCode: voucherCode,
      voucherPin: voucherPin,
      status: "active",
      budgetReserved: true,
      reservedAmountNaira: discountNaira,
      isLegacyVoucher: false,
      migrationBatchId: null,
      issuedAt: admin.firestore.Timestamp.fromDate(nowDate),
      createdAt: admin.firestore.Timestamp.fromDate(nowDate),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      redeemedAt: null,
      redeemedByVendorStaffUid: null,
      redeemedVendorBranch: null,
      redemptionId: null,
    };
    t.set(voucherDocRef, voucherRecord);

    // 10. Update Meal Claim tracking doc in users/{uid}/mealClaims/{offerId}
    const newLifetimeCount = (Number(claimData.lifetimeClaimCount) || 0) + 1;
    const updatedHistory = { ...(claimData.claimHistory || {}) };
    updatedHistory[safeIdempotencyKey] = {
      voucherId: voucherId,
      claimedAt: admin.firestore.Timestamp.fromDate(nowDate),
    };

    t.set(
      claimRef,
      {
        offerId: offerId,
        campaignId: campaignId,
        userId: uid,
        lifetimeClaimCount: newLifetimeCount,
        activeVoucherId: voucherId,
        activeVoucherExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        lastClaimedAt: admin.firestore.Timestamp.fromDate(nowDate),
        claimHistory: updatedHistory,
      },
      { merge: true }
    );

    // 11. Synchronize Public Meal Offer Projection Availability
    const newReservedTotal = campaignReserved + discountNaira;
    const remainingCapacityAfterClaim = campaignBudget - (campaignSpent + newReservedTotal);
    const isStillAvailable =
      campaignData.status === "active" &&
      campaignData.migrationStatus === "ready" &&
      remainingCapacityAfterClaim >= discountNaira;

    if (publicOfferDoc.exists) {
      t.update(publicOfferRef, {
        isAvailable: isStillAvailable,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Self-healing projection guard: NEVER recreate public projection for quarantined, unmigrated, or ineligible campaigns
      const isEligibleForProjection =
        !quarantineDoc.exists &&
        campaignData.migrationStatus === "ready" &&
        campaignData.status === "active" &&
        minSpendNaira >= discountNaira;

      if (isEligibleForProjection) {
        t.set(publicOfferRef, {
          id: campaignId,
          campaignId: campaignId,
          offerId: offerId,
          vendorId: vendorId,
          vendorName: vendorName,
          title: campaignData.title || `${vendorName} Meal Voucher`,
          pointsCost: pointsCost,
          discountNaira: discountNaira,
          minSpendNaira: minSpendNaira,
          isAvailable: isStillAvailable,
          status: campaignData.status,
          createdAt: campaignData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Note: Campaign budget is NOT consumed here. campaignSpentNaira remains unchanged!

    return {
      success: true,
      voucher: {
        id: voucherId,
        voucherCode: voucherCode,
        voucherPin: voucherPin,
        expiresAt: expiresAt.toISOString(),
        discountNaira: discountNaira,
        minSpendNaira: minSpendNaira,
        pointsDeducted: pointsCost,
        vendorId: vendorId,
        vendorName: vendorName,
        offerId: offerId,
        status: "active",
      },
      lifetimeClaimCount: newLifetimeCount,
      pointsRemaining: currentPoints - pointsCost,
    };
  });

  if (result?.success && !result?.idempotent && result?.voucher) {
    logger.info(`🎟️ Meal voucher ${result.voucher.id} (${result.voucher.voucherCode}) issued to user ${uid} for offer ${result.voucher.offerId} (-${result.voucher.pointsDeducted} pts).`);
  }

  return result;
}

export const redeemMealCoupon = onCall({ cors: true, secrets: ALL_PIN_SECRETS, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const uid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testUid : null);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required to redeem meal coupon.");
  }
  const { couponId, pin, idempotencyKey } = request.data || {};
  return await redeemMealCouponCore({ uid, couponId, pin, idempotencyKey });
});

// =========================================================================
// MEAL REWARDS & COUPON SYSTEM (PHASE 5: MERCHANT TERMINAL & REDEMPTION)
// =========================================================================

/**
 * Configure / assign demo cashier role to an authenticated user for a fictional vendor.
 * Server-enforced demo authorization mechanism.
 * 
 * Security Controls:
 * - Strictly disabled outside the local emulator environment (FUNCTIONS_EMULATOR !== 'true').
 * - Caller must be authenticated.
 * - Regular customers cannot self-provision or elevate privileges.
 * - Non-admins cannot assign roles to other UIDs or assign universal 'paywaka-demo-all'.
 * - Cashiers can revoke their own active session (return to customer mode).
 * - Preserves existing unrelated Firebase Auth custom claims upon role change.
 */
export async function setDemoCashierRoleCore({
  uid,
  vendorId,
  branch,
  cashierName,
  vendorRole,
  callerUid,
  isCallerAdmin = false,
}) {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  if (!isEmulator) {
    throw new HttpsError(
      "failed-precondition",
      "Demo cashier provisioning is strictly disabled outside the local emulator environment."
    );
  }

  const effectiveCallerUid = callerUid || uid;
  if (!effectiveCallerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to configure cashier role.");
  }

  const targetUid = uid || effectiveCallerUid;

  // Verify caller administrative privileges
  let callerIsAdmin = Boolean(isCallerAdmin);
  if (!callerIsAdmin) {
    const callerSnap = await db.collection("users").doc(effectiveCallerUid).get();
    if (callerSnap.exists) {
      const cData = callerSnap.data() || {};
      callerIsAdmin = cData.role === "admin" || cData.isAdmin === true;
    }
  }

  const isSelf = targetUid === effectiveCallerUid;
  const isRevocation = vendorId === "customer_only" || vendorId === null || vendorId === "none";

  // Validate vendorRole if provided
  if (vendorRole !== undefined && vendorRole !== null && vendorRole !== "") {
    if (!["owner", "manager", "cashier"].includes(vendorRole)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid vendorRole: must be 'owner', 'manager', or 'cashier'."
      );
    }
  }

  // Safe default: if vendorRole is not specified, default to 'cashier' (least privilege)
  const safeVendorRole = vendorRole || "cashier";

  // Security Guard: Ordinary callers (even existing cashiers) can NEVER provision 'owner' or 'manager' roles
  if ((safeVendorRole === "owner" || safeVendorRole === "manager") && !callerIsAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Unauthorized: System administrator authorization required to provision vendor owner or manager role."
    );
  }

  // Authorization policy enforcement
  if (!callerIsAdmin) {
    if (!isSelf) {
      throw new HttpsError(
        "permission-denied",
        "Unauthorized: Ordinary callers cannot assign or modify roles for another user."
      );
    }
    if (!isRevocation) {
      throw new HttpsError(
        "permission-denied",
        "Unauthorized: Regular customers cannot self-provision merchant cashier privileges. Administrator authorization required."
      );
    }
  }

  const targetRef = db.collection("users").doc(targetUid);
  const targetSnap = await targetRef.get();
  const targetData = targetSnap.exists ? targetSnap.data() || {} : {};
  const targetIsRealAdmin = targetData.role === "admin" || targetData.isAdmin === true;

  // Handle Role Revocation / Deactivation
  if (isRevocation) {
    const demoteData = {
      role: "user",
      vendorId: admin.firestore.FieldValue.delete(),
      vendorRole: admin.firestore.FieldValue.delete(),
      vendorBranch: admin.firestore.FieldValue.delete(),
      cashierName: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (targetSnap.exists) {
      await targetRef.update(demoteData);
    } else {
      await targetRef.set({ uid: targetUid, role: "user", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    try {
      let existingClaims = {};
      try {
        const userRecord = await admin.auth().getUser(targetUid);
        existingClaims = userRecord.customClaims || {};
      } catch (e) { }

      const updatedClaims = {
        ...existingClaims,
        role: "user",
      };
      delete updatedClaims.vendorId;
      delete updatedClaims.vendorRole;
      delete updatedClaims.vendorBranch;
      delete updatedClaims.cashierName;

      // Security Guard: If target user is NOT a verified system administrator in Firestore,
      // strip any administrative claims so a revoked cashier cannot retain administrative privileges.
      if (!targetIsRealAdmin) {
        delete updatedClaims.admin;
        delete updatedClaims.isAdmin;
        delete updatedClaims.superAdmin;
      }

      await admin.auth().setCustomUserClaims(targetUid, updatedClaims);
    } catch (err) {
      logger.warn(`Could not clear custom claims for demo user ${targetUid}: ${err.message}`);
    }

    return {
      success: true,
      message: `Cashier privileges revoked for user ${targetUid}. User set to customer role.`,
      role: "user",
      vendorId: null,
      vendorRole: null,
    };
  }

  // Handle Cashier Role Provisioning / Assignment
  if (!vendorId || typeof vendorId !== "string" || !/^[a-zA-Z0-9_\-]{3,64}$/.test(vendorId.trim())) {
    throw new HttpsError(
      "invalid-argument",
      "Valid alphanumeric vendor ID (3-64 characters) is required for demo cashier role."
    );
  }

  const cleanVendorId = vendorId.trim();

  // Wildcard 'paywaka-demo-all' requires system administrator privilege
  if (cleanVendorId === "paywaka-demo-all" && !callerIsAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Universal demo vendor access ('paywaka-demo-all') is reserved for system administrators."
    );
  }

  const roleData = {
    uid: targetUid,
    role: "vendor",
    vendorId: cleanVendorId,
    vendorRole: safeVendorRole,
    vendorBranch: branch || "Victoria Island • Lagos",
    cashierName: cashierName || "Demo Cashier",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!targetSnap.exists) {
    roleData.email = `${targetUid}@paywaka.demo`;
    roleData.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await targetRef.set(roleData, { merge: true });

  // Update Firebase Auth Custom Claims while PRESERVING unrelated claims
  try {
    let existingClaims = {};
    try {
      const userRecord = await admin.auth().getUser(targetUid);
      existingClaims = userRecord.customClaims || {};
    } catch (e) { }

    const updatedClaims = {
      ...existingClaims,
      role: "vendor",
      vendorId: cleanVendorId,
      vendorRole: safeVendorRole,
    };

    // Security Guard: Only users who are verified system administrators in Firestore
    // can retain administrative claims. Prevents privilege escalation through custom claims.
    if (!targetIsRealAdmin) {
      delete updatedClaims.admin;
      delete updatedClaims.isAdmin;
      delete updatedClaims.superAdmin;
    }

    await admin.auth().setCustomUserClaims(targetUid, updatedClaims);
  } catch (err) {
    logger.warn(`Could not set custom claims for demo cashier ${targetUid}: ${err.message}`);
  }

  return {
    success: true,
    message: `User ${targetUid} granted ${safeVendorRole} privileges for ${cleanVendorId}.`,
    role: "vendor",
    vendorId: cleanVendorId,
    vendorRole: safeVendorRole,
    vendorBranch: roleData.vendorBranch,
    cashierName: roleData.cashierName,
  };
}

/**
 * Authoritative Server-Side Vendor Authorization Helper.
 * Evaluates live Firestore user document for tenant isolation and role hierarchy.
 * Least privilege: missing or ambiguous vendorRole strictly defaults to 'cashier'.
 * 
 * Hierarchy:
 * - 'owner': highest vendor privilege (can perform owner, manager, cashier operations)
 * - 'manager': mid vendor privilege (can perform manager, cashier operations)
 * - 'cashier': operational privilege (can perform cashier redemption operations only)
 * 
 * Administrators (role === 'admin' || isAdmin === true) satisfy all checks.
 */
export async function verifyVendorAuthorizationCore({
  callerUid,
  targetVendorId,
  requiredRole = "cashier",
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required for vendor operation.");
  }
  if (!targetVendorId || typeof targetVendorId !== "string") {
    throw new HttpsError("invalid-argument", "Valid targetVendorId is required.");
  }

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }

  const userData = userSnap.data() || {};
  const isAdmin = userData.role === "admin" || userData.isAdmin === true;
  if (isAdmin) {
    return {
      authorized: true,
      role: "admin",
      vendorId: targetVendorId,
      vendorRole: "owner",
      isAdmin: true,
    };
  }

  if (userData.role !== "vendor" || !userData.vendorId) {
    throw new HttpsError(
      "permission-denied",
      "Access denied: User does not hold an authorized vendor role."
    );
  }

  // Tenant Isolation: caller vendorId must match targetVendorId
  if (userData.vendorId !== targetVendorId) {
    throw new HttpsError(
      "permission-denied",
      "Access denied: Cross-vendor operation forbidden."
    );
  }

  // Safe Default: Any missing, null, or unrecognized vendorRole strictly resolves to 'cashier'
  const rawRole = userData.vendorRole;
  const effectiveVendorRole = (rawRole === "owner" || rawRole === "manager") ? rawRole : "cashier";

  const roleRanks = { cashier: 1, manager: 2, owner: 3 };
  const userRank = roleRanks[effectiveVendorRole] || 1;
  const requiredRank = roleRanks[requiredRole] || 1;

  if (userRank < requiredRank) {
    throw new HttpsError(
      "permission-denied",
      `Access denied: Operation requires '${requiredRole}' role (current: '${effectiveVendorRole}').`
    );
  }

  return {
    authorized: true,
    role: "vendor",
    vendorId: userData.vendorId,
    vendorRole: effectiveVendorRole,
    vendorBranch: userData.vendorBranch || null,
    cashierName: userData.cashierName || null,
    isAdmin: false,
  };
}

/**
 * Shared, server-authoritative voucher redemption eligibility evaluation.
 * Evaluates:
 * 1. Voucher status ('active') and authoritative unexpired server time
 * 2. Vendor association match
 * 3. Voucher claim PIN (if present / verified)
 * 4. Minimum spend requirement (against bill total)
 * 5. Campaign state ('active', 'paused', 'ended' allowed for valid vouchers; 'emergency_halt' forbidden)
 * 6. Reservation & sealed promise integrity (reservedAmountNaira === discountNaira && budgetReserved === true)
 * 7. Authoritative actual discount calculation (min(discountNaira, billAmountNaira))
 * 8. Dual-Path Exposure Authorization:
 *    - Normal voucher: currentSpent + actualDiscount <= campaignBudgetNaira
 *    - Verified legacy voucher: verified migrationBatchId, valid frozen baseline, and
 *      currentSpent + actualDiscount <= Math.max(campaignBudgetNaira, legacyAuthorizedExposureCeilingNaira)
 */
export function evaluateVoucherRedemptionEligibilityCore({
  voucherData,
  campaignData,
  vendorId,
  isAuthorizedAdmin,
  billAmount,
  voucherPin,
  requirePin = false,
  overrideNow,
}) {
  const nowMs = overrideNow ? overrideNow.getTime() : Date.now();
  const expiresAtMs = voucherData?.expiresAt?.toMillis
    ? voucherData.expiresAt.toMillis()
    : voucherData?.expiresAt?.toDate
      ? voucherData.expiresAt.toDate().getTime()
      : voucherData?.expiresAt
        ? new Date(voucherData.expiresAt).getTime()
        : 0;

  const isExpired = nowMs >= expiresAtMs;

  // 1. Voucher status check
  if (!voucherData) {
    return { eligible: false, reason: "voucher-not-found", message: "Meal voucher not found." };
  }
  if (voucherData.status === "redeemed") {
    return { eligible: false, reason: "already-redeemed", message: "This meal voucher has already been redeemed." };
  }
  if (isExpired || voucherData.status === "expired") {
    return { eligible: false, reason: "expired", message: "This meal voucher has expired and cannot be redeemed." };
  }
  if (voucherData.status !== "active") {
    return {
      eligible: false,
      reason: "inactive-voucher",
      message: `This meal voucher cannot be redeemed (status: ${voucherData.status}).`,
    };
  }

  // 2. Vendor Association Match
  const isVendorMatch = voucherData.vendorId === vendorId || (vendorId === "paywaka-demo-all" && isAuthorizedAdmin);
  if (!isVendorMatch) {
    return {
      eligible: false,
      reason: "vendor-mismatch",
      message: `This voucher is issued for a different vendor (${voucherData.vendorName || voucherData.vendorId}).`,
    };
  }

  // 3. Voucher PIN Verification (mandatory when requirePin is true or when voucherPin is provided)
  if (requirePin && voucherData.voucherPin) {
    if (voucherPin === undefined || voucherPin === null || !/^\d{4}$/.test(String(voucherPin).trim())) {
      return {
        eligible: false,
        reason: "invalid-pin",
        message: "Valid 4-digit customer voucher claim PIN is required to confirm customer presence.",
      };
    }
    if (String(voucherPin).trim() !== String(voucherData.voucherPin).trim()) {
      return { eligible: false, reason: "invalid-pin", message: "Incorrect 4-digit voucher claim PIN." };
    }
  } else if (voucherPin !== undefined && voucherPin !== null && String(voucherPin).trim() !== "") {
    if (String(voucherPin).trim() !== String(voucherData.voucherPin || "").trim()) {
      return { eligible: false, reason: "invalid-pin", message: "Incorrect 4-digit voucher claim PIN." };
    }
  }

  // 4. Minimum Spend Requirement
  const minSpend = Number(voucherData.minSpendNaira || 0);
  if (billAmount !== undefined && billAmount !== null && billAmount < minSpend) {
    return {
      eligible: false,
      reason: "min-spend-unmet",
      message: `Minimum spend requirement not met. Order total must be at least ₦${minSpend.toLocaleString()} (Provided: ₦${billAmount.toLocaleString()}).`,
    };
  }

  // 5. Campaign Lifecycle Check
  if (!campaignData) {
    return { eligible: false, reason: "campaign-not-found", message: "Associated meal campaign not found." };
  }

  if (campaignData.status === "emergency_halt") {
    return {
      eligible: false,
      reason: "campaign-halted",
      message: "The meal campaign for this offer is under emergency administrative halt.",
    };
  }

  if (!["active", "paused", "ended"].includes(campaignData.status)) {
    return {
      eligible: false,
      reason: "campaign-inactive",
      message: `The meal campaign for this offer is currently inactive (status: ${campaignData.status}).`,
    };
  }

  // 6. Reservation & Sealed Promise Integrity
  const nominalDiscount = Number(voucherData.discountNaira || 0);
  const reservedAmount = Number(voucherData.reservedAmountNaira || 0);
  const hasExplicitReservation =
    voucherData.budgetReserved !== undefined || voucherData.reservedAmountNaira !== undefined;

  if (hasExplicitReservation) {
    if (voucherData.budgetReserved !== true || reservedAmount !== nominalDiscount) {
      return {
        eligible: false,
        reason: "reservation-integrity-mismatch",
        message: "Voucher reservation integrity mismatch: reserved capacity does not match promised discount.",
      };
    }
  } else if (campaignData.migrationStatus === "ready") {
    return {
      eligible: false,
      reason: "reservation-integrity-mismatch",
      message: "Voucher has no active budget reservation in a ready campaign.",
    };
  }

  // 7. Authoritative Discount Calculation
  const actualDiscount =
    billAmount !== undefined && billAmount !== null
      ? Math.min(nominalDiscount, billAmount)
      : nominalDiscount;

  // 8. Dual-Path Exposure Authorization
  const currentSpent = Number(campaignData.campaignSpentNaira || 0);
  const campaignBudget = Number(campaignData.campaignBudgetNaira || 0);

  if (voucherData.isLegacyVoucher === true) {
    // Verified Legacy Voucher Path
    if (!voucherData.migrationBatchId || voucherData.migrationBatchId !== campaignData.migrationBatchId) {
      return {
        eligible: false,
        reason: "legacy-provenance-mismatch",
        message: "Legacy voucher migration batch does not match campaign.",
      };
    }

    // Verify original issuance time strictly precedes campaign migration completion (issuedAt < migrationCompletedAt)
    // Both issuedAt and canonical migrationCompletedAt MUST be valid Firestore Timestamps (no migratedAt fallback).
    const isFirestoreTimestamp = (ts) =>
      Boolean(ts && typeof ts.toMillis === "function" && Number.isFinite(ts.toMillis()));

    const validIssuedAt = isFirestoreTimestamp(voucherData.issuedAt);
    const validMigrationCompletedAt = isFirestoreTimestamp(campaignData.migrationCompletedAt);

    if (
      !validIssuedAt ||
      !validMigrationCompletedAt ||
      voucherData.issuedAt.toMillis() >= campaignData.migrationCompletedAt.toMillis()
    ) {
      return {
        eligible: false,
        reason: "legacy-provenance-mismatch",
        message: "Legacy voucher issuance timestamp must precede campaign migration completion.",
      };
    }

    const rawCeiling = campaignData.legacyAuthorizedExposureCeilingNaira;
    if (rawCeiling === undefined || rawCeiling === null || !Number.isFinite(Number(rawCeiling))) {
      return {
        eligible: false,
        reason: "legacy-baseline-missing",
        message: "Campaign historical legacy authorization baseline is missing or corrupted.",
      };
    }

    const legacyCeiling = Number(rawCeiling);
    const applicableExposureCeiling = Math.max(campaignBudget, legacyCeiling);

    if (currentSpent + actualDiscount > applicableExposureCeiling) {
      return {
        eligible: false,
        reason: "legacy-ceiling-exceeded",
        message: `Historical authorized legacy exposure ceiling exceeded (Limit: ₦${applicableExposureCeiling.toLocaleString()}, Required: ₦${(currentSpent + actualDiscount).toLocaleString()}).`,
      };
    }
  } else {
    // Normal Voucher Path
    if (currentSpent + actualDiscount > campaignBudget) {
      const remainingBudget = Math.max(0, campaignBudget - currentSpent);
      return {
        eligible: false,
        reason: "budget-exhausted",
        message: `Campaign promotional budget exhausted. Remaining budget: ₦${remainingBudget.toLocaleString()}.`,
      };
    }
  }

  return {
    eligible: true,
    reason: null,
    message: "Voucher is valid and eligible for redemption.",
    actualDiscount,
    reservedAmount: hasExplicitReservation ? reservedAmount : nominalDiscount,
  };
}

/**
 * Server-side voucher pre-validation for merchant cashier terminal.
 * Validates existence, vendor matching, status, expiry, and budget without mutating records.
 */
export async function validateMealVoucherForMerchantCore({
  cashierUid,
  voucherCodeOrId,
  vendorId,
  overrideNow,
}) {
  if (!cashierUid) {
    throw new HttpsError("unauthenticated", "Cashier authentication required.");
  }
  if (!voucherCodeOrId || typeof voucherCodeOrId !== "string") {
    throw new HttpsError("invalid-argument", "Valid voucherCode or voucherId is required.");
  }
  if (!vendorId || typeof vendorId !== "string") {
    throw new HttpsError("invalid-argument", "Valid vendorId is required.");
  }

  // 1. Verify Cashier Authorization against live Firestore user record
  const authResult = await verifyVendorAuthorizationCore({
    callerUid: cashierUid,
    targetVendorId: vendorId,
    requiredRole: "cashier",
  });
  const isAuthorizedAdmin = authResult.isAdmin;

  // 2. Lookup Voucher
  const trimmed = voucherCodeOrId.trim();
  let voucherDoc = await db.collection("meal_vouchers").doc(trimmed).get();
  if (!voucherDoc.exists) {
    const qSnap = await db.collection("meal_vouchers").where("voucherCode", "==", trimmed).limit(1).get();
    if (!qSnap.empty) {
      voucherDoc = qSnap.docs[0];
    }
  }

  if (!voucherDoc.exists) {
    throw new HttpsError("not-found", "Meal voucher not found.");
  }

  const voucherData = voucherDoc.data();
  const nowMs = overrideNow ? overrideNow.getTime() : Date.now();
  const expiresAtMs = voucherData.expiresAt?.toMillis
    ? voucherData.expiresAt.toMillis()
    : voucherData.expiresAt?.toDate
      ? voucherData.expiresAt.toDate().getTime()
      : new Date(voucherData.expiresAt).getTime();

  // 3. Fetch Campaign
  const campaignSnap = await db.collection("meal_campaigns").doc(voucherData.campaignId).get();
  const campaignData = campaignSnap.exists ? campaignSnap.data() : null;

  // 4. Shared Eligibility Evaluation
  const evalResult = evaluateVoucherRedemptionEligibilityCore({
    voucherData,
    campaignData,
    vendorId,
    isAuthorizedAdmin,
    overrideNow,
  });

  const campaignBudget = Number(campaignData?.campaignBudgetNaira || 100000);
  const campaignSpent = Number(campaignData?.campaignSpentNaira || 0);

  return {
    success: true,
    eligible: evalResult.eligible,
    reason: evalResult.reason,
    validationMessage: evalResult.message,
    voucher: {
      id: voucherDoc.id,
      voucherCode: voucherData.voucherCode,
      vendorId: voucherData.vendorId,
      vendorName: voucherData.vendorName,
      campaignId: voucherData.campaignId,
      offerId: voucherData.offerId,
      discountNaira: voucherData.discountNaira,
      minSpendNaira: voucherData.minSpendNaira,
      status: voucherData.status,
      budgetReserved: voucherData.budgetReserved ?? false,
      reservedAmountNaira: voucherData.reservedAmountNaira ?? voucherData.discountNaira ?? 0,
      isLegacyVoucher: voucherData.isLegacyVoucher ?? false,
      expiresAt: voucherData.expiresAt?.toDate ? voucherData.expiresAt.toDate().toISOString() : voucherData.expiresAt,
      isExpired: nowMs >= expiresAtMs,
      requiresPin: Boolean(voucherData.voucherPin),
    },
    campaign: {
      id: voucherData.campaignId,
      title: campaignData?.title || voucherData.vendorName,
      remainingBudgetNaira: Math.max(0, campaignBudget - campaignSpent),
      status: campaignData?.status || "active",
      migrationStatus: campaignData?.migrationStatus || "unmigrated",
    },
  };
}

/**
 * Authoritative Server-Side Voucher Redemption Engine.
 * Enforces all Phase 5 and Stage 2 atomic requirements:
 * - Cashier authorization against target vendor via live Firestore profile
 * - Voucher lookup & existence validation
 * - Voucher status & unexpired server-time validation
 * - Minimum spend rule enforcement
 * - Finite positive bill range validation (₦1 to ₦10,000,000)
 * - Deterministic document-level idempotency locking on meal_idempotency_records/{safeIdempotencyKey}
 * - Concurrency-safe cross-voucher collision prevention
 * - Campaign active/paused/ended lifecycle states supported
 * - Sealed promise integrity verification (reservedAmountNaira === discountNaira)
 * - Dual-path budget exposure authorization (Option A legacy vs strict normal)
 * - Atomic voucher status transition, redemption record creation, and reservation release
 */
export async function redeemMealVoucherMerchantCore({
  cashierUid,
  voucherCodeOrId,
  vendorId,
  vendorBranch,
  billAmountNaira,
  voucherPin,
  requirePin = false,
  idempotencyKey,
  overrideNow,
}) {
  if (!cashierUid) {
    throw new HttpsError("unauthenticated", "Cashier authentication required.");
  }
  if (!voucherCodeOrId || typeof voucherCodeOrId !== "string" || !voucherCodeOrId.trim()) {
    throw new HttpsError("invalid-argument", "Valid voucherCode or voucherId is required.");
  }
  if (!vendorId || typeof vendorId !== "string" || !vendorId.trim()) {
    throw new HttpsError("invalid-argument", "Valid vendorId is required.");
  }

  // Monetary Bill Total Validation: Finite positive amount in Naira
  const billAmount = Number(billAmountNaira);
  if (!Number.isFinite(billAmount) || billAmount <= 0 || billAmount > 10000000) {
    throw new HttpsError(
      "invalid-argument",
      "Valid positive finite bill total is required (between ₦1 and ₦10,000,000)."
    );
  }
  const normalizedBillAmount = Math.round(billAmount * 100) / 100;

  // Idempotency Key Validation: 8 to 128 characters, alphanumeric + hyphens/underscores
  if (idempotencyKey !== undefined && idempotencyKey !== null) {
    if (
      typeof idempotencyKey !== "string" ||
      !/^[a-zA-Z0-9_\-:]{8,128}$/.test(idempotencyKey.trim())
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid idempotencyKey: must be an 8-128 character string containing only letters, numbers, hyphens, and underscores."
      );
    }
  }

  const safeIdempotencyKey =
    idempotencyKey && typeof idempotencyKey === "string" && idempotencyKey.trim()
      ? idempotencyKey.trim()
      : `red_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const nowMs = overrideNow ? overrideNow.getTime() : Date.now();
  const nowDate = new Date(nowMs);

  // 1. Pre-verify Cashier Authorization from live user profile
  const preAuth = await verifyVendorAuthorizationCore({
    callerUid: cashierUid,
    targetVendorId: vendorId,
    requiredRole: "cashier",
  });

  // 2. Pre-resolve voucher reference before entering transaction to avoid query locks
  const trimmed = voucherCodeOrId.trim();
  let voucherRef = db.collection("meal_vouchers").doc(trimmed);
  let resolvedVoucherSnap = await voucherRef.get();
  if (!resolvedVoucherSnap.exists) {
    const qSnap = await db.collection("meal_vouchers").where("voucherCode", "==", trimmed).limit(1).get();
    if (!qSnap.empty) {
      resolvedVoucherSnap = qSnap.docs[0];
      voucherRef = resolvedVoucherSnap.ref;
    }
  }
  if (!resolvedVoucherSnap.exists) {
    throw new HttpsError("not-found", "Meal voucher not found.");
  }

  logger.info(`[REDEEM_CORE] Executing for cashier=${cashierUid}, voucher=${voucherCodeOrId}, vendor=${vendorId}, bill=${normalizedBillAmount}, idem=${safeIdempotencyKey}`);

  const result = await db.runTransaction(async (t) => {
    logger.info(`[REDEEM_TRANSACTION] Started transaction for ${voucherCodeOrId}`);
    // Re-verify Cashier Authorization inside transaction from live user profile
    const cashierRef = db.collection("users").doc(cashierUid);
    const cashierSnap = await t.get(cashierRef);
    if (!cashierSnap.exists) {
      throw new HttpsError("permission-denied", "Cashier user account not found.");
    }
    const cashierData = cashierSnap.data() || {};
    const isAuthorizedAdmin = cashierData.role === "admin" || cashierData.isAdmin === true;
    const isAuthorizedVendor =
      cashierData.role === "vendor" &&
      (cashierData.vendorId === vendorId || (cashierData.vendorId === "paywaka-demo-all" && isAuthorizedAdmin));

    if (!isAuthorizedAdmin && !isAuthorizedVendor) {
      throw new HttpsError(
        "permission-denied",
        "Cashier is not authorized for this merchant. User must hold the 'vendor' role for this vendor."
      );
    }

    // 2. Lookup Voucher inside transaction by direct document reference
    const voucherDoc = await t.get(voucherRef);
    if (!voucherDoc.exists) {
      throw new HttpsError("not-found", "Meal voucher not found.");
    }
    const voucherData = voucherDoc.data();

    // 3. Deterministic Document-Level Idempotency Locking
    const idemRef = db.collection("meal_idempotency_records").doc(safeIdempotencyKey);
    const idemDoc = await t.get(idemRef);

    if (idemDoc.exists) {
      const prior = idemDoc.data();
      // Ensure the key belongs to the exact same voucher
      if (prior.voucherId !== voucherDoc.id) {
        throw new HttpsError(
          "already-exists",
          `Idempotency key collision: this key was already used for a different voucher (${prior.voucherCode || prior.voucherId}).`
        );
      }
      // Ensure vendor matches
      if (prior.vendorId !== vendorId) {
        throw new HttpsError(
          "already-exists",
          "Idempotency key collision: this key was previously used for a different vendor."
        );
      }

      // Ensure original cashier identity matches: prevent information leakage across cashiers
      if (prior.cashierUid !== cashierUid && !isAuthorizedAdmin) {
        throw new HttpsError(
          "permission-denied",
          "Idempotency conflict: this key is bound to a redemption initiated by another cashier."
        );
      }

      // Ensure request parameters (billAmountNaira) match original logical request
      if (Math.abs(Number(prior.billAmountNaira || 0) - normalizedBillAmount) > 0.01) {
        throw new HttpsError(
          "invalid-argument",
          `Idempotency conflict: this key was already used with a different bill amount (₦${prior.billAmountNaira}).`
        );
      }

      // Verify voucher PIN if voucher requires it
      if (requirePin && voucherData.voucherPin) {
        if (voucherPin === undefined || voucherPin === null || String(voucherPin).trim() !== String(voucherData.voucherPin).trim()) {
          throw new HttpsError("permission-denied", "Incorrect 4-digit voucher claim PIN.");
        }
      } else if (voucherData.voucherPin && voucherPin !== undefined && voucherPin !== null && String(voucherPin).trim() !== "") {
        if (String(voucherPin).trim() !== String(voucherData.voucherPin).trim()) {
          throw new HttpsError("permission-denied", "Incorrect 4-digit voucher claim PIN.");
        }
      }

      // Legitimate idempotent retry: return exact original result with zero mutation
      return {
        success: true,
        idempotent: true,
        redemptionId: prior.redemptionId,
        redemptionReference: prior.redemptionReference,
        voucherId: voucherDoc.id,
        voucherCode: voucherData.voucherCode,
        billAmountNaira: prior.billAmountNaira,
        discountNaira: prior.discountNaira,
        discountAppliedNaira: prior.discountNaira,
        finalPayableNaira: prior.finalPayableNaira,
        vendorId: prior.vendorId,
        vendorName: prior.vendorName,
        vendorBranch: prior.vendorBranch,
        redeemedAt: prior.redeemedAt?.toDate ? prior.redeemedAt.toDate().toISOString() : prior.redeemedAt,
        message: "Voucher already redeemed with this claim request.",
      };
    }

    // 4. Fetch Campaign & Public Offer inside transaction
    const campaignRef = db.collection("meal_campaigns").doc(voucherData.campaignId);
    const campaignDoc = await t.get(campaignRef);
    if (!campaignDoc.exists) {
      throw new HttpsError("not-found", "Associated meal campaign not found.");
    }
    const campaignData = campaignDoc.data();

    const pmoRef = db.collection("public_meal_offers").doc(voucherData.campaignId);
    const pmoSnap = await t.get(pmoRef);

    // 5. Shared Server-Authoritative Eligibility Check
    const evalResult = evaluateVoucherRedemptionEligibilityCore({
      voucherData,
      campaignData,
      vendorId,
      isAuthorizedAdmin,
      billAmount: normalizedBillAmount,
      voucherPin,
      requirePin,
      overrideNow,
    });

    if (!evalResult.eligible) {
      switch (evalResult.reason) {
        case "already-redeemed":
        case "expired":
        case "inactive-voucher":
        case "min-spend-unmet":
        case "campaign-halted":
        case "campaign-inactive":
        case "reservation-integrity-mismatch":
        case "legacy-baseline-missing":
          throw new HttpsError("failed-precondition", evalResult.message);
        case "vendor-mismatch":
        case "invalid-pin":
        case "legacy-provenance-mismatch":
          throw new HttpsError("permission-denied", evalResult.message);
        case "campaign-not-found":
          throw new HttpsError("not-found", evalResult.message);
        case "budget-exhausted":
        case "legacy-ceiling-exceeded":
          throw new HttpsError("resource-exhausted", evalResult.message);
        default:
          throw new HttpsError("failed-precondition", evalResult.message);
      }
    }

    // Authoritative Calculations
    const actualDiscount = evalResult.actualDiscount;
    const finalPayable = Math.max(0, normalizedBillAmount - actualDiscount);
    const reservedAmount = evalResult.reservedAmount;

    // 6. Generate Unique Redemption IDs
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const redemptionId = `red_${voucherDoc.id.replace(/^vch_/, "").slice(0, 8)}_${Date.now().toString(36)}_${randomSuffix}`;
    const redemptionReference = `PWK-RED-${Math.floor(100000 + Math.random() * 900000)}`;
    const branchName = vendorBranch || cashierData.vendorBranch || "Victoria Island • Lagos";

    // 7. Atomic Write: Update Voucher document in meal_vouchers
    t.update(voucherRef, {
      status: "redeemed",
      budgetReserved: false,
      redeemedAt: admin.firestore.Timestamp.fromDate(nowDate),
      redeemedByVendorStaffUid: cashierUid,
      redeemedVendorBranch: branchName,
      redemptionId: redemptionId,
      billAmountNaira: normalizedBillAmount,
      actualDiscountNaira: actualDiscount,
      finalPayableNaira: finalPayable,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 8. Atomic Write: Increment Campaign Spent, Release Reservation & Count
    const campaignUpdates = {
      campaignSpentNaira: admin.firestore.FieldValue.increment(actualDiscount),
      redemptionCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (reservedAmount > 0) {
      campaignUpdates.campaignReservedNaira = admin.firestore.FieldValue.increment(-reservedAmount);
    }
    if (voucherData.isLegacyVoucher === true && reservedAmount > 0) {
      campaignUpdates.outstandingLegacyReservedNaira = admin.firestore.FieldValue.increment(-reservedAmount);
    }
    t.update(campaignRef, campaignUpdates);

    // 8b. Clear activeVoucherId on users/{userId}/mealClaims/{offerId} so customer can purchase their 2nd voucher if under lifetime limit
    const claimOfferKey = voucherData.offerId || voucherData.campaignId;
    if (voucherData.userId && claimOfferKey) {
      const userClaimRef = db
        .collection("users")
        .doc(voucherData.userId)
        .collection("mealClaims")
        .doc(claimOfferKey);
      t.set(
        userClaimRef,
        {
          activeVoucherId: null,
          activeVoucherExpiresAt: null,
          lastRedeemedVoucherId: voucherDoc.id,
          lastRedeemedAt: admin.firestore.Timestamp.fromDate(nowDate),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 8c. Touch public_meal_offers/{campaignId} so real-time listeners sync immediately
    if (pmoSnap.exists) {
      t.update(pmoRef, {
        lastRedemptionAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 9. Atomic Write: Create Immutable Redemption Audit Document in meal_redemptions
    const redemptionDocRef = db.collection("meal_redemptions").doc(redemptionId);
    t.set(redemptionDocRef, {
      id: redemptionId,
      redemptionReference: redemptionReference,
      voucherId: voucherDoc.id,
      voucherCode: voucherData.voucherCode || voucherDoc.id,
      userId: voucherData.userId || null,
      vendorId: vendorId,
      vendorName: voucherData.vendorName || "Partner Vendor",
      vendorBranch: branchName,
      campaignId: voucherData.campaignId || null,
      offerId: voucherData.offerId || null,
      cashierUid: cashierUid,
      cashierName: cashierData.cashierName || "Demo Cashier",
      billAmountNaira: normalizedBillAmount,
      discountNaira: actualDiscount,
      finalPayableNaira: finalPayable,
      status: "completed",
      idempotencyKey: safeIdempotencyKey,
      redeemedAt: admin.firestore.Timestamp.fromDate(nowDate),
      createdAt: admin.firestore.Timestamp.fromDate(nowDate),
    });

    // 10. Atomic Write: Deterministic idempotency lock record in meal_idempotency_records
    t.set(idemRef, {
      idempotencyKey: safeIdempotencyKey,
      voucherId: voucherDoc.id,
      voucherCode: voucherData.voucherCode || voucherDoc.id,
      vendorId: vendorId,
      vendorName: voucherData.vendorName || "Partner Vendor",
      vendorBranch: branchName,
      cashierUid: cashierUid,
      redemptionId: redemptionId,
      redemptionReference: redemptionReference,
      billAmountNaira: normalizedBillAmount,
      discountNaira: actualDiscount,
      finalPayableNaira: finalPayable,
      redeemedAt: admin.firestore.Timestamp.fromDate(nowDate),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 11. Atomic Write: Audit Log in admin_audit_logs
    const auditRef = db.collection("admin_audit_logs").doc();
    t.set(auditRef, {
      action: "MEAL_VOUCHER_REDEMPTION",
      redemptionId: redemptionId,
      voucherId: voucherDoc.id,
      voucherCode: voucherData.voucherCode || voucherDoc.id,
      cashierUid: cashierUid,
      vendorId: voucherData.vendorId,
      discountNaira: actualDiscount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      redemptionId: redemptionId,
      redemptionReference: redemptionReference,
      voucherId: voucherDoc.id,
      voucherCode: voucherData.voucherCode,
      billAmountNaira: normalizedBillAmount,
      discountNaira: actualDiscount,
      discountAppliedNaira: actualDiscount,
      finalPayableNaira: finalPayable,
      vendorId: voucherData.vendorId,
      vendorName: voucherData.vendorName,
      vendorBranch: branchName,
      redeemedAt: nowDate.toISOString(),
      message: "Voucher successfully validated and redeemed.",
    };
  });

  if (result?.success && !result?.idempotent) {
    logger.info(`✅ Meal voucher ${result.voucherId} (${result.voucherCode}) redeemed at ${result.vendorName} by cashier ${cashierUid} (Bill: ₦${result.billAmountNaira}, Discount: ₦${result.discountNaira}, Paid: ₦${result.finalPayableNaira}).`);
  }

  return result;
}

/**
 * Migration Engine for Campaign Budget Reservations and Legacy Provenance.
 * Enforces:
 * - Lease-based worker ownership with monotonically increasing workerFencingGeneration
 * - Immutable migrationBatchId stamped on campaign and all legacy vouchers
 * - Paginated voucher backfill (batches of 50)
 * - Quarantine of vouchers missing server-created issuedAt or valid discount amounts
 * - Expiry reconciliation against authoritative server time
 * - Frozen historical authorization baseline:
 *     legacyAuthorizedExposureCeilingNaira = campaignBudgetAtMigrationNaira + legacyOverCommitmentInitialNaira
 * - Campaign readiness only finalized after reconciliation sweep succeeds
 */
export async function migrateCampaignReservationsCore({
  campaignId,
  workerId,
  batchSize = 50,
  overrideNow,
}) {
  if (!campaignId || typeof campaignId !== "string") {
    throw new HttpsError("invalid-argument", "Valid campaignId is required.");
  }
  const effectiveWorkerId = workerId || `worker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowMs = overrideNow ? overrideNow.getTime() : Date.now();
  const nowDate = new Date(nowMs);
  const leaseDurationMs = 90000; // 90 seconds
  const leaseExpiresAtMs = nowMs + leaseDurationMs;

  const campaignRef = db.collection("meal_campaigns").doc(campaignId);

  // 1. Acquire Migration Lease & Monotonic Fencing Generation in Transaction
  const lockResult = await db.runTransaction(async (t) => {
    const campaignDoc = await t.get(campaignRef);
    if (!campaignDoc.exists) {
      throw new HttpsError("not-found", `Meal campaign ${campaignId} not found.`);
    }
    const campData = campaignDoc.data();

    // If already ready, migration is complete!
    if (campData.migrationStatus === "ready") {
      return {
        status: "already_ready",
        campaignId,
        migrationBatchId: campData.migrationBatchId,
        migrationCompletedAt: campData.migrationCompletedAt || campData.migratedAt || null,
        legacyAuthorizedExposureCeilingNaira: campData.legacyAuthorizedExposureCeilingNaira,
      };
    }

    if (campData.migrationStatus === "quarantined") {
      throw new HttpsError(
        "failed-precondition",
        `Campaign ${campaignId} is quarantined and requires administrative review.`
      );
    }

    // Check existing lock if migrating
    if (campData.migrationStatus === "migrating" && campData.migrationLock) {
      const lock = campData.migrationLock;
      const lockExpiryMs = lock.leaseExpiresAt?.toMillis
        ? lock.leaseExpiresAt.toMillis()
        : lock.leaseExpiresAt?.toDate
          ? lock.leaseExpiresAt.toDate().getTime()
          : 0;

      // If lease is still valid and held by another worker, block
      if (nowMs < lockExpiryMs && lock.workerId !== effectiveWorkerId) {
        throw new HttpsError(
          "failed-precondition",
          `Campaign is locked by active worker ${lock.workerId} (lease expires in ${Math.round((lockExpiryMs - nowMs) / 1000)}s).`
        );
      }
    }

    // Monotonically increment fencing generation
    const currentGen = Number(campData.migrationLock?.workerFencingGeneration || 0);
    const nextFencingGeneration = currentGen + 1;

    // Immutable migrationBatchId (created once per campaign migration identity)
    const migrationBatchId =
      campData.migrationBatchId || `mig_${campaignId.slice(-6)}_${Date.now().toString(36)}`;

    // Set lease
    t.update(campaignRef, {
      migrationStatus: "migrating",
      migrationBatchId: migrationBatchId,
      migrationLock: {
        workerId: effectiveWorkerId,
        workerFencingGeneration: nextFencingGeneration,
        acquiredAt: admin.firestore.Timestamp.fromDate(nowDate),
        leaseExpiresAt: admin.firestore.Timestamp.fromMillis(leaseExpiresAtMs),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      status: "lease_acquired",
      campaignId,
      workerId: effectiveWorkerId,
      workerFencingGeneration: nextFencingGeneration,
      migrationBatchId,
    };
  });

  if (lockResult.status === "already_ready") {
    return lockResult;
  }

  const { workerFencingGeneration, migrationBatchId } = lockResult;

  // 2. Paginated Voucher Backfill Loop
  let hasMore = true;
  let lastDoc = null;
  let totalProcessed = 0;
  let totalQuarantined = 0;
  let totalExpired = 0;
  let totalReservedNaira = 0;

  while (hasMore) {
    let q = db
      .collection("meal_vouchers")
      .where("campaignId", "==", campaignId)
      .limit(batchSize);

    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }

    const snap = await q.get();
    if (snap.empty) {
      hasMore = false;
      break;
    }

    lastDoc = snap.docs[snap.docs.length - 1];

    // Process this page in a transaction with fencing verification
    const pageResult = await db.runTransaction(async (t) => {
      // Re-verify fencing token on campaign
      const campDoc = await t.get(campaignRef);
      if (!campDoc.exists) {
        throw new HttpsError("not-found", "Campaign document missing during migration.");
      }
      const cData = campDoc.data();
      const currentGen = cData.migrationLock?.workerFencingGeneration;
      if (currentGen !== workerFencingGeneration || cData.migrationLock?.workerId !== effectiveWorkerId) {
        throw new HttpsError(
          "aborted",
          `Fencing fence trip: Worker ${effectiveWorkerId} lost lease (camp gen: ${currentGen}, worker gen: ${workerFencingGeneration}). Migration aborted.`
        );
      }

      let pageReserved = 0;
      let pageQuarantined = 0;
      let pageExpired = 0;

      for (const vDoc of snap.docs) {
        const vData = vDoc.data();

        // Already migrated in a previous run?
        if (vData.budgetReserved === true && vData.migrationBatchId === migrationBatchId) {
          if (vData.status === "active") {
            pageReserved += Number(vData.reservedAmountNaira || vData.discountNaira || 0);
          }
          continue;
        }

        // Check server-created issuedAt timestamp & discount validity
        const hasValidIssuedAt =
          vData.issuedAt &&
          (typeof vData.issuedAt.toDate === "function" ||
            vData.issuedAt._seconds !== undefined ||
            vData.issuedAt instanceof Date);
        const hasValidDiscount = Number.isFinite(Number(vData.discountNaira)) && Number(vData.discountNaira) > 0;

        if (!hasValidIssuedAt || !hasValidDiscount) {
          // QUARANTINE!
          const qRef = db.collection("quarantined_meal_vouchers").doc(vDoc.id);
          t.set(qRef, {
            originalVoucherId: vDoc.id,
            campaignId: campaignId,
            quarantineReason: !hasValidIssuedAt ? "MISSING_OR_INVALID_ISSUED_AT" : "INVALID_DISCOUNT_AMOUNT",
            quarantinedAt: admin.firestore.Timestamp.fromDate(nowDate),
            quarantinedByWorker: effectiveWorkerId,
            workerFencingGeneration,
            voucherData: vData,
          });
          t.update(vDoc.ref, {
            status: "quarantined",
            quarantinedAt: admin.firestore.Timestamp.fromDate(nowDate),
            budgetReserved: false,
            isLegacyVoucher: true,
            migrationBatchId: migrationBatchId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          pageQuarantined++;
          continue;
        }

        // Authoritative Expiry Check
        const expMs = vData.expiresAt?.toMillis
          ? vData.expiresAt.toMillis()
          : vData.expiresAt?.toDate
            ? vData.expiresAt.toDate().getTime()
            : new Date(vData.expiresAt).getTime();

        if (nowMs >= expMs || vData.status === "expired") {
          t.update(vDoc.ref, {
            status: "expired",
            budgetReserved: false,
            isLegacyVoucher: true,
            migrationBatchId: migrationBatchId,
            migratedAt: admin.firestore.Timestamp.fromDate(nowDate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          pageExpired++;
          continue;
        }

        // Active unexpired legacy voucher -> Reserve capacity!
        if (vData.status === "active") {
          const discount = Number(vData.discountNaira);
          t.update(vDoc.ref, {
            budgetReserved: true,
            reservedAmountNaira: discount,
            isLegacyVoucher: true,
            migrationBatchId: migrationBatchId,
            migratedAt: admin.firestore.Timestamp.fromDate(nowDate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          pageReserved += discount;
        }
      }

      return { pageReserved, pageQuarantined, pageExpired, count: snap.docs.length };
    });

    totalProcessed += pageResult.count;
    totalQuarantined += pageResult.pageQuarantined;
    totalExpired += pageResult.pageExpired;
    totalReservedNaira += pageResult.pageReserved;

    if (snap.docs.length < batchSize) {
      hasMore = false;
    }
  }

  // 3. Final Reconciliation Sweep & Freeze Historical Baseline
  const finalResult = await db.runTransaction(async (t) => {
    const campDoc = await t.get(campaignRef);
    if (!campDoc.exists) {
      throw new HttpsError("not-found", "Campaign not found at final reconciliation.");
    }
    const cData = campDoc.data();

    // Verify fencing lease is still held by this worker
    if (
      cData.migrationLock?.workerFencingGeneration !== workerFencingGeneration ||
      cData.migrationLock?.workerId !== effectiveWorkerId
    ) {
      throw new HttpsError(
        "aborted",
        `Fencing lease lost before finalization (camp gen: ${cData.migrationLock?.workerFencingGeneration}, worker gen: ${workerFencingGeneration}).`
      );
    }

    const campaignBudgetAtMigrationNaira = Number(cData.campaignBudgetNaira || 100000);
    const campaignSpentNaira = Number(cData.campaignSpentNaira || 0);

    // Sum all active reserved amounts for this campaign & migration batch
    const totalExposureAtMigration = campaignSpentNaira + totalReservedNaira;
    const legacyOverCommitmentInitialNaira = Math.max(0, totalExposureAtMigration - campaignBudgetAtMigrationNaira);
    const legacyAuthorizedExposureCeilingNaira = campaignBudgetAtMigrationNaira + legacyOverCommitmentInitialNaira;

    // Mark campaign ready and freeze historical baseline!
    t.update(campaignRef, {
      migrationStatus: "ready",
      migrationBatchId: migrationBatchId,
      campaignBudgetAtMigrationNaira,
      legacyOverCommitmentInitialNaira,
      legacyAuthorizedExposureCeilingNaira,
      campaignReservedNaira: totalReservedNaira,
      outstandingLegacyReservedNaira: totalReservedNaira,
      migrationLock: null,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(nowDate),
      migratedAt: admin.firestore.Timestamp.fromDate(nowDate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      status: "ready",
      campaignId,
      migrationBatchId,
      migrationCompletedAt: admin.firestore.Timestamp.fromDate(nowDate),
      campaignBudgetAtMigrationNaira,
      legacyOverCommitmentInitialNaira,
      legacyAuthorizedExposureCeilingNaira,
      totalReservedNaira,
      totalProcessed,
      totalQuarantined,
      totalExpired,
    };
  });

  logger.info(`✅ Campaign ${campaignId} successfully migrated to ready: Reserved=₦${finalResult.totalReservedNaira}, Ceiling=₦${finalResult.legacyAuthorizedExposureCeilingNaira}, Quarantined=${finalResult.totalQuarantined}.`);
  return finalResult;
}

/**
 * Standalone Expiry Reconciliation Engine.
 * - Finds expired active vouchers reliably through pagination
 * - Marks vouchers expired and atomically releases promotional capacity
 * - Avoids conflicting with active migration workers (skips migrating campaigns)
 * - Retries failed items safely
 */
export async function reconcileExpiredVouchersCore({
  campaignId,
  batchSize = 100,
  overrideNow,
}) {
  const nowMs = overrideNow ? overrideNow.getTime() : Date.now();
  const nowDate = new Date(nowMs);
  const nowTimestamp = admin.firestore.Timestamp.fromDate(nowDate);

  let q = db
    .collection("meal_vouchers")
    .where("status", "==", "active")
    .where("expiresAt", "<=", nowTimestamp)
    .limit(batchSize);

  if (campaignId) {
    q = db
      .collection("meal_vouchers")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "active")
      .where("expiresAt", "<=", nowTimestamp)
      .limit(batchSize);
  }

  const snap = await q.get();
  if (snap.empty) {
    return { success: true, reconciledCount: 0, totalReleasedNaira: 0 };
  }

  let reconciledCount = 0;
  let quarantinedCount = 0;
  let totalReleasedNaira = 0;

  for (const vDoc of snap.docs) {
    const vRef = vDoc.ref;
    try {
      const singleResult = await db.runTransaction(async (t) => {
        const vSnap = await t.get(vRef);
        if (!vSnap.exists) return null;
        const vData = vSnap.data();

        // Verify still active and unexpired in transaction
        if (vData.status !== "active") return null;

        const expMs = vData.expiresAt?.toMillis
          ? vData.expiresAt.toMillis()
          : vData.expiresAt?.toDate
            ? vData.expiresAt.toDate().getTime()
            : new Date(vData.expiresAt).getTime();

        if (nowMs < expMs) return null;

        // Public projection & quarantine checks (must be read before any writes)
        const pmoRef = db.collection("public_meal_offers").doc(vData.campaignId);
        const pmoSnap = await t.get(pmoRef);
        const qRef = db.collection("quarantined_meal_campaigns").doc(vData.campaignId);
        const qSnap = await t.get(qRef);

        // Fetch parent campaign
        const cRef = db.collection("meal_campaigns").doc(vData.campaignId);
        const cSnap = await t.get(cRef);
        if (!cSnap.exists) {
          // Orphaned voucher: parent campaign document does not exist.
          // Quarantine safely without attempting to decrement a nonexistent campaign reservation.
          const qVoucherRef = db.collection("quarantined_meal_vouchers").doc(vDoc.id);
          t.set(qVoucherRef, {
            originalVoucherId: vDoc.id,
            campaignId: vData.campaignId || null,
            quarantineReason: "ORPHANED_CAMPAIGN_NOT_FOUND",
            quarantinedAt: admin.firestore.Timestamp.fromDate(nowDate),
            quarantinedByWorker: "expiry_worker",
            voucherData: vData,
          });
          t.update(vRef, {
            status: "quarantined",
            quarantinedAt: admin.firestore.Timestamp.fromDate(nowDate),
            budgetReserved: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return { releasedNaira: 0, quarantined: true };
        }
        const cData = cSnap.data();

        // Migration-Readiness Gate: Only process reservation accounting when migrationStatus === "ready".
        // Campaigns in 'pending', 'unmigrated', 'migrating', 'reconciling', or 'quarantined' states
        // MUST be skipped without mutating voucher status, campaign counters, or reservation flags.
        if (cData.migrationStatus !== "ready") {
          return null;
        }

        const reservedAmount = Number(
          vData.reservedAmountNaira || (vData.budgetReserved ? vData.discountNaira : 0)
        );
        const shouldRelease = vData.budgetReserved === true && reservedAmount > 0;

        // Mark voucher expired and release reservation
        t.update(vRef, {
          status: "expired",
          budgetReserved: false,
          expiredReconciledAt: admin.firestore.Timestamp.fromDate(nowDate),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (shouldRelease) {
          const campaignUpdates = {
            campaignReservedNaira: admin.firestore.FieldValue.increment(-reservedAmount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          if (vData.isLegacyVoucher === true) {
            campaignUpdates.outstandingLegacyReservedNaira = admin.firestore.FieldValue.increment(-reservedAmount);
          }
          t.update(cRef, campaignUpdates);
        }

        // Synchronize public projection availability or enforce quarantine deactivation
        const currentReserved = Number(cData.campaignReservedNaira || 0);
        const newReserved = Math.max(0, currentReserved - (shouldRelease ? reservedAmount : 0));
        const budget = Number(cData.campaignBudgetNaira || 0);
        const spent = Number(cData.campaignSpentNaira || 0);
        const availableCap = budget - (spent + newReserved);
        const discount = Number(cData.discountNaira || 0);
        const isNowAvailable = availableCap >= discount;

        if (qSnap.exists || cData.migrationStatus !== "ready" || cData.status !== "active") {
          // If quarantined, unmigrated, or inactive, NEVER republish! If projection exists, remove it!
          if (pmoSnap.exists) {
            t.delete(pmoRef);
          }
        } else {
          if (pmoSnap.exists) {
            t.update(pmoRef, {
              isAvailable: isNowAvailable,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (Number(cData.minSpendNaira || 0) >= discount) {
            t.set(pmoRef, {
              id: vData.campaignId,
              campaignId: vData.campaignId,
              offerId: cData.offerId || vData.campaignId,
              vendorId: cData.vendorId || vData.vendorId,
              vendorName: cData.vendorName || vData.vendorName || "Partner Vendor",
              title: cData.title || "Meal Voucher",
              pointsCost: Number(cData.pointsCost || 0),
              discountNaira: discount,
              minSpendNaira: Number(cData.minSpendNaira || 0),
              isAvailable: isNowAvailable,
              status: cData.status,
              createdAt: cData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        return { releasedNaira: shouldRelease ? reservedAmount : 0, quarantined: false };
      });

      if (singleResult) {
        if (singleResult.quarantined) {
          quarantinedCount++;
        } else {
          reconciledCount++;
        }
        totalReleasedNaira += singleResult.releasedNaira;
      }
    } catch (err) {
      logger.error(`Error reconciling expired voucher ${vDoc.id}:`, err);
    }
  }

  logger.info(`🕒 Expired vouchers reconciliation completed: ${reconciledCount} vouchers expired, ${quarantinedCount} orphaned vouchers quarantined, ₦${totalReleasedNaira} reserved released.`);
  return { success: true, reconciledCount, quarantinedCount, totalReleasedNaira };
}

/**
 * Vendor Owner & Administrator Campaign Budget Update Engine.
 * Enforces:
 * - Vendor owner can increase/update the budget of their own campaign within ₦200,000 cap.
 * - Cross-vendor changes: strictly denied with permission-denied.
 * - Cashier and regular customer: strictly denied with permission-denied.
 * - Administrator: authorized across campaigns, subject to ₦200,000 cap and immutability invariants.
 * - Campaign spending and reservation totals cannot be reset or edited through budget update.
 * - The immutable historical migration baseline remains unchanged after budget increases.
 * - Budgets above ₦200,000 are rejected (no unapproved above-cap workflow).
 */
export async function updateCampaignBudgetCore({
  callerUid,
  adminUid,
  campaignId,
  newBudgetNaira,
}) {
  const effectiveCallerUid = callerUid || adminUid;
  if (!effectiveCallerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to update campaign budget.");
  }
  if (!campaignId || typeof campaignId !== "string") {
    throw new HttpsError("invalid-argument", "Valid campaignId is required.");
  }

  const budget = Number(newBudgetNaira);
  if (!Number.isFinite(budget) || budget <= 0 || budget > 200000) {
    throw new HttpsError(
      "invalid-argument",
      "Budget must be a finite number between ₦1 and ₦200,000 (MVP ceiling)."
    );
  }

  const campRef = db.collection("meal_campaigns").doc(campaignId);

  return await db.runTransaction(async (t) => {
    const cSnap = await t.get(campRef);
    if (!cSnap.exists) {
      throw new HttpsError("not-found", "Campaign not found.");
    }
    const cData = cSnap.data();

    const pmoRef = db.collection("public_meal_offers").doc(campaignId);
    const pmoSnap = await t.get(pmoRef);
    const qRef = db.collection("quarantined_meal_campaigns").doc(campaignId);
    const qSnap = await t.get(qRef);

    // Verify Authorization: Must be system admin OR vendor owner of this specific vendor
    await verifyVendorAuthorizationCore({
      callerUid: effectiveCallerUid,
      targetVendorId: cData.vendorId,
      requiredRole: "owner",
    });

    const currentSpent = Number(cData.campaignSpentNaira || 0);
    const currentReserved = Number(cData.campaignReservedNaira || 0);
    const committedExposure = currentSpent + currentReserved;

    if (budget < committedExposure) {
      throw new HttpsError(
        "invalid-argument",
        `New budget cannot be less than current committed promotional exposure (₦${committedExposure.toLocaleString()}).`
      );
    }

    // Update campaign budget ONLY.
    // Spending, reservations, and historical migration baseline fields remain strictly IMMUTABLE!
    t.update(campRef, {
      campaignBudgetNaira: budget,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const newCapacity = budget - committedExposure;
    const discount = Number(cData.discountNaira || 0);
    const isAvail =
      cData.status === "active" &&
      cData.migrationStatus === "ready" &&
      newCapacity >= discount;

    if (qSnap.exists || cData.migrationStatus !== "ready" || cData.status !== "active") {
      if (pmoSnap.exists) {
        t.delete(pmoRef);
      }
    } else {
      if (pmoSnap.exists) {
        t.update(pmoRef, {
          isAvailable: isAvail,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (Number(cData.minSpendNaira || 0) >= discount) {
        t.set(pmoRef, {
          id: campaignId,
          campaignId,
          offerId: cData.offerId || campaignId,
          vendorId: cData.vendorId,
          vendorName: cData.vendorName || cData.vendorId,
          title: cData.title || "Meal Voucher",
          pointsCost: Number(cData.pointsCost || 0),
          discountNaira: discount,
          minSpendNaira: Number(cData.minSpendNaira || 0),
          isAvailable: isAvail,
          status: cData.status,
          createdAt: cData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return {
      success: true,
      campaignId,
      vendorId: cData.vendorId,
      newBudgetNaira: budget,
      previousBudgetNaira: Number(cData.campaignBudgetNaira || 0),
      historicalBaselineUntouched: true,
    };
  });
}

/**
 * Administrative Campaign Lifecycle Status Update.
 * Enforces canonical statuses: 'active', 'paused', 'ended', 'emergency_halt'.
 */
export async function updateCampaignStatusCore({
  adminUid,
  campaignId,
  newStatus,
}) {
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }
  const adminSnap = await db.collection("users").doc(adminUid).get();
  const aData = adminSnap.data() || {};
  if (aData.role !== "admin" && aData.isAdmin !== true) {
    throw new HttpsError("permission-denied", "Admin role required to update campaign status.");
  }

  const allowedStatuses = ["active", "paused", "ended", "emergency_halt"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid status: must be one of ${allowedStatuses.join(", ")}.`
    );
  }

  const campRef = db.collection("meal_campaigns").doc(campaignId);
  return await db.runTransaction(async (t) => {
    const cSnap = await t.get(campRef);
    if (!cSnap.exists) {
      throw new HttpsError("not-found", "Campaign not found.");
    }
    const cData = cSnap.data();

    const pmoRef = db.collection("public_meal_offers").doc(campaignId);
    const pmoSnap = await t.get(pmoRef);
    const qRef = db.collection("quarantined_meal_campaigns").doc(campaignId);
    const qSnap = await t.get(qRef);

    t.update(campRef, {
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const currentSpent = Number(cData.campaignSpentNaira || 0);
    const currentReserved = Number(cData.campaignReservedNaira || 0);
    const budget = Number(cData.campaignBudgetNaira || 0);
    const availableCap = budget - (currentSpent + currentReserved);
    const discount = Number(cData.discountNaira || 0);
    const isAvail =
      newStatus === "active" &&
      cData.migrationStatus === "ready" &&
      availableCap >= discount;

    if (qSnap.exists || cData.migrationStatus !== "ready" || newStatus !== "active") {
      if (pmoSnap.exists) {
        t.update(pmoRef, {
          status: newStatus,
          isAvailable: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      if (pmoSnap.exists) {
        t.update(pmoRef, {
          status: newStatus,
          isAvailable: isAvail,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (Number(cData.minSpendNaira || 0) >= discount) {
        t.set(pmoRef, {
          id: campaignId,
          campaignId,
          offerId: cData.offerId || campaignId,
          vendorId: cData.vendorId,
          vendorName: cData.vendorName || cData.vendorId,
          title: cData.title || "Meal Voucher",
          pointsCost: Number(cData.pointsCost || 0),
          discountNaira: discount,
          minSpendNaira: Number(cData.minSpendNaira || 0),
          isAvailable: isAvail,
          status: newStatus,
          createdAt: cData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return { success: true, campaignId, status: newStatus };
  });
}

export const setDemoCashierRole = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  if (!isEmulator) {
    throw new HttpsError(
      "failed-precondition",
      "Demo cashier provisioning is strictly disabled outside the local emulator environment."
    );
  }

  // Deployed callers cannot spoof identity. request.auth.uid is always authoritative.
  const callerUid = request.auth?.uid;
  if (!callerUid && !isEmulator) {
    throw new HttpsError("unauthenticated", "Authentication required to configure cashier role.");
  }

  // Test-only identity override is allowed ONLY when unauthenticated AND strictly in emulator test environment
  const effectiveCallerUid = callerUid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!effectiveCallerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to configure cashier role.");
  }

  const { targetUid, vendorId, branch, cashierName, vendorRole } = request.data || {};
  return await setDemoCashierRoleCore({
    callerUid: effectiveCallerUid,
    uid: targetUid || effectiveCallerUid,
    vendorId,
    branch,
    cashierName,
    vendorRole,
  });
});

export const validateMealVoucherForMerchant = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  // Deployed callers can NEVER override auth.uid. testUid is strictly ignored if !isEmulator or if request.auth is present!
  const cashierUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testUid : null);
  if (!cashierUid) {
    throw new HttpsError("unauthenticated", "Authentication required for merchant terminal.");
  }
  const { voucherCodeOrId, vendorId } = request.data || {};
  return await validateMealVoucherForMerchantCore({ cashierUid, voucherCodeOrId, vendorId });
});

export const redeemMealVoucherMerchant = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  // Deployed callers can NEVER override auth.uid. testUid is strictly ignored if !isEmulator or if request.auth is present!
  const cashierUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testUid : null);
  logger.info(`[REDEEM_CALLABLE] Entry cashierUid=${cashierUid}, authUid=${request.auth?.uid}`);
  if (!cashierUid) {
    throw new HttpsError("unauthenticated", "Authentication required for merchant redemption.");
  }
  const { voucherCodeOrId, vendorId, vendorBranch, billAmountNaira, voucherPin, idempotencyKey } = request.data || {};
  logger.info(`[REDEEM_CALLABLE] Payload: voucherCodeOrId=${voucherCodeOrId}, vendorId=${vendorId}, billAmountNaira=${billAmountNaira}, idem=${idempotencyKey}`);
  return await redeemMealVoucherMerchantCore({
    cashierUid,
    voucherCodeOrId,
    vendorId,
    vendorBranch,
    billAmountNaira,
    voucherPin,
    requirePin: true,
    idempotencyKey,
  });
});

export const reconcileExpiredMealVouchersScheduled = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Africa/Lagos",
    timeoutSeconds: 300,
  },
  async (event) => {
    logger.info("Executing scheduled expiry reconciliation for meal vouchers...");
    return await reconcileExpiredVouchersCore({});
  }
);

export const migrateCampaignReservations = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to migrate campaign.");
  }
  const { campaignId, workerId, batchSize } = request.data || {};
  return await migrateCampaignReservationsCore({ campaignId, workerId, batchSize });
});

export const reconcileExpiredMealVouchers = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to reconcile expired vouchers.");
  }
  const { campaignId, batchSize } = request.data || {};
  return await reconcileExpiredVouchersCore({ campaignId, batchSize });
});

// =========================================================================
// STAGE 3.1: PUBLIC OFFERS PROJECTION, CAMPAIGN CREATION & VERIFICATION
// =========================================================================

/**
 * Stage 3.1 Vendor Campaign Creation Engine.
 * Dual-writes authoritative campaign to meal_campaigns and sanitized projection
 * to public_meal_offers atomically.
 *
 * Enforces:
 * - Verified vendor owner for targetVendorId OR platform admin authorization
 * - minSpendNaira >= discountNaira
 * - discountNaira > 0
 * - 0 < campaignBudgetNaira <= 200,000 (positive initial budget & MVP cap)
 * - pointsCost >= 0
 * - Public projection isAvailable calculated from: status === 'active' &&
 *   migrationStatus === 'ready' && budget >= discountNaira
 * - Canonical legacy offerId preserved if supplied, else defaults to campaignId
 */
export async function createVendorCampaignCore({
  callerUid,
  targetVendorId,
  title,
  discountNaira,
  minSpendNaira,
  pointsCost = 0,
  campaignBudgetNaira,
  category = "Local Delicacies",
  image = null,
  imageUploadStatus = null,
  offerId,
  vendorName,
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to create campaign.");
  }
  if (!targetVendorId || typeof targetVendorId !== "string" || !targetVendorId.trim()) {
    throw new HttpsError("invalid-argument", "Valid targetVendorId is required.");
  }

  // 1. Authorize Caller: Must be verified vendor owner of target vendor OR platform administrator
  await verifyVendorAuthorizationCore({
    callerUid,
    targetVendorId: targetVendorId.trim(),
    requiredRole: "owner",
  });

  // 2. Validate Inputs
  if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 100) {
    throw new HttpsError("invalid-argument", "Title must be a string between 3 and 100 characters.");
  }

  const discount = Number(discountNaira);
  if (!Number.isFinite(discount) || discount <= 0) {
    throw new HttpsError("invalid-argument", "discountNaira must be a positive finite number greater than 0.");
  }

  const minSpend = Number(minSpendNaira);
  if (!Number.isFinite(minSpend) || minSpend <= 0) {
    throw new HttpsError("invalid-argument", "minSpendNaira must be a positive finite number.");
  }

  // Mandatory Commercial Invariant: minSpendNaira >= discountNaira
  if (minSpend < discount) {
    throw new HttpsError(
      "invalid-argument",
      `Commercial terms violation: minimum spend (₦${minSpend}) cannot be less than promotional discount (₦${discount}).`
    );
  }

  const budget = Number(campaignBudgetNaira);
  if (!Number.isFinite(budget) || budget <= 0 || budget > 200000) {
    throw new HttpsError(
      "invalid-argument",
      "campaignBudgetNaira must be a positive finite number greater than ₦0 and up to ₦200,000 (MVP cap)."
    );
  }

  const points = Number(pointsCost ?? 0);
  if (!Number.isFinite(points) || points < 0) {
    throw new HttpsError("invalid-argument", "pointsCost must be a non-negative finite integer.");
  }

  // Disallow custom offerId for new campaigns: campaign identity must be server-generated and immutable (offerId === campaignId)
  if (offerId !== undefined && offerId !== null && String(offerId).trim() !== "") {
    throw new HttpsError(
      "invalid-argument",
      "New campaigns cannot specify a custom offerId. Campaign identity is server-generated with offerId === campaignId."
    );
  }

  // 3. Resolve Vendor Name, Branch & Branding Logo
  let resolvedVendorName = vendorName && typeof vendorName === "string" ? vendorName.trim() : null;
  let resolvedBranch = "Main Branch";
  let resolvedVendorLogoUrl = null;
  let resolvedVendorLogoEmoji = "🍗";
  const vDoc = await db.collection("meal_vendors").doc(targetVendorId.trim()).get();
  if (vDoc.exists) {
    const vData = vDoc.data() || {};
    if (!resolvedVendorName && vData.name) {
      resolvedVendorName = vData.name;
    }
    if (Array.isArray(vData.branches) && vData.branches.length > 0) {
      resolvedBranch = vData.branches[0];
    } else if (typeof vData.branch === "string" && vData.branch.trim()) {
      resolvedBranch = vData.branch.trim();
    }
    if (vData.logoUrl) {
      resolvedVendorLogoUrl = vData.logoUrl;
    }
    if (vData.logoEmoji) {
      resolvedVendorLogoEmoji = vData.logoEmoji;
    }
  }
  if (!resolvedVendorName) {
    resolvedVendorName = targetVendorId.trim();
  }

  const allowedCategories = ["Small Chops", "Fast Foods", "Local Delicacies", "Drinks", "Pastries"];
  const cleanCategory =
    typeof category === "string" && allowedCategories.includes(category.trim())
      ? category.trim()
      : typeof category === "string" && category.trim()
        ? category.trim()
        : "Local Delicacies";

  const cleanImage = typeof image === "string" && image.trim() ? image.trim() : null;
  const cleanImageUploadStatus =
    typeof imageUploadStatus === "string" && ["uploading", "synced", "failed", "none"].includes(imageUploadStatus)
      ? imageUploadStatus
      : cleanImage
      ? "synced"
      : "none";

  const campRef = db.collection("meal_campaigns").doc();
  const campaignId = campRef.id;
  const canonicalOfferId = campaignId;

  const pmoRef = db.collection("public_meal_offers").doc(campaignId);

  return await db.runTransaction(async (t) => {
    const campSnap = await t.get(campRef);
    if (campSnap.exists) {
      throw new HttpsError("already-exists", "Generated campaign ID collision. Please retry.");
    }
    const pmoSnap = await t.get(pmoRef);
    if (pmoSnap.exists) {
      throw new HttpsError("already-exists", "Public offer ID collision. Please retry.");
    }

    // Availability calculation: status === 'active' && migrationStatus === 'ready' && budget >= discount
    const isAvailable = budget >= discount;

    const campaignRecord = {
      id: campaignId,
      campaignId: campaignId,
      offerId: canonicalOfferId,
      vendorId: targetVendorId.trim(),
      vendorName: resolvedVendorName,
      vendorLogoUrl: resolvedVendorLogoUrl,
      vendorLogoEmoji: resolvedVendorLogoEmoji,
      branch: resolvedBranch,
      title: title.trim(),
      category: cleanCategory,
      image: cleanImage,
      imageUploadStatus: cleanImageUploadStatus,
      isFeatured: false,
      pointsCost: Math.round(points),
      discountNaira: Math.round(discount),
      minSpendNaira: Math.round(minSpend),
      campaignBudgetNaira: Math.round(budget),
      campaignSpentNaira: 0,
      campaignReservedNaira: 0,
      status: "active",
      migrationStatus: "ready",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const publicOfferRecord = {
      id: campaignId,
      campaignId: campaignId,
      offerId: canonicalOfferId,
      vendorId: targetVendorId.trim(),
      vendorName: resolvedVendorName,
      vendorLogoUrl: resolvedVendorLogoUrl,
      vendorLogoEmoji: resolvedVendorLogoEmoji,
      branch: resolvedBranch,
      title: title.trim(),
      category: cleanCategory,
      image: cleanImage,
      imageUploadStatus: cleanImageUploadStatus,
      isFeatured: false,
      pointsCost: Math.round(points),
      discountNaira: Math.round(discount),
      minSpendNaira: Math.round(minSpend),
      isAvailable: isAvailable,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    t.set(campRef, campaignRecord);
    t.set(pmoRef, publicOfferRecord);

    return {
      success: true,
      campaignId,
      offerId: canonicalOfferId,
      vendorId: targetVendorId.trim(),
      vendorName: resolvedVendorName,
      branch: resolvedBranch,
      title: title.trim(),
      category: cleanCategory,
      image: cleanImage,
      imageUploadStatus: cleanImageUploadStatus,
      isFeatured: false,
      pointsCost: Math.round(points),
      discountNaira: Math.round(discount),
      minSpendNaira: Math.round(minSpend),
      campaignBudgetNaira: Math.round(budget),
      isAvailable,
      status: "active",
      migrationStatus: "ready",
    };
  });
}

export const createVendorCampaign = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to create campaign.");
  }
  const {
    targetVendorId,
    vendorId,
    title,
    discountNaira,
    minSpendNaira,
    pointsCost,
    campaignBudgetNaira,
    category,
    image,
    imageUploadStatus,
    offerId,
    vendorName,
  } = request.data || {};
  return await createVendorCampaignCore({
    callerUid,
    targetVendorId: targetVendorId || vendorId,
    title,
    discountNaira,
    minSpendNaira,
    pointsCost,
    campaignBudgetNaira,
    category,
    image,
    imageUploadStatus,
    offerId,
    vendorName,
  });
});

/**
 * Stage 4 Merchant-Funded Dashboard Backend Query.
 *
 * Enforces:
 * - Server-side authentication and role check via verifyVendorAuthorizationCore
 * - Strict multi-tenant isolation (only targetVendorId data is returned)
 * - Authoritative metrics aggregation (allocated budget, consumed spent, reserved, available capacity)
 * - Returns vendor's recent completed redemptions
 */
export async function getMerchantDashboardDataCore({
  callerUid,
  targetVendorId,
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to view merchant dashboard.");
  }
  if (!targetVendorId || typeof targetVendorId !== "string" || !targetVendorId.trim()) {
    throw new HttpsError("invalid-argument", "Valid targetVendorId is required.");
  }

  const vId = targetVendorId.trim();

  // Authorize: cashier, manager, owner, or platform admin
  const authResult = await verifyVendorAuthorizationCore({
    callerUid,
    targetVendorId: vId,
    requiredRole: "cashier",
  });

  // Fetch Vendor Profile
  const vendorSnap = await db.collection("meal_vendors").doc(vId).get();
  const vendorProfile = vendorSnap.exists
    ? { id: vId, ...vendorSnap.data() }
    : { id: vId, name: vId, branch: authResult.vendorBranch || "Main Branch" };

  // Fetch Campaigns for this vendor (Tenant Isolation)
  const campsSnap = await db.collection("meal_campaigns")
    .where("vendorId", "==", vId)
    .get();

  let totalAllocatedBudgetNaira = 0;
  let totalSpentBudgetNaira = 0;
  let totalReservedBudgetNaira = 0;
  let totalAvailableCapacityNaira = 0;
  let activeCampaignsCount = 0;
  let pausedCampaignsCount = 0;
  let endedCampaignsCount = 0;
  let haltedCampaignsCount = 0;

  const campaigns = campsSnap.docs.map((docSnap) => {
    const cData = docSnap.data();
    const budget = Number(cData.campaignBudgetNaira || 0);
    const spent = Number(cData.campaignSpentNaira || 0);
    const reserved = Number(cData.campaignReservedNaira || 0);
    const discount = Number(cData.discountNaira || 0);
    const minSpend = Number(cData.minSpendNaira || 0);
    const pointsCost = Number(cData.pointsCost || 0);
    const committed = spent + reserved;
    const availableCapacity = Math.max(0, budget - committed);
    const status = cData.status || "active";

    totalAllocatedBudgetNaira += budget;
    totalSpentBudgetNaira += spent;
    totalReservedBudgetNaira += reserved;
    totalAvailableCapacityNaira += availableCapacity;

    if (status === "active") activeCampaignsCount++;
    else if (status === "paused") pausedCampaignsCount++;
    else if (status === "ended") endedCampaignsCount++;
    else if (status === "emergency_halt") haltedCampaignsCount++;

    return {
      id: docSnap.id,
      campaignId: docSnap.id,
      offerId: cData.offerId || docSnap.id,
      vendorId: cData.vendorId,
      vendorName: cData.vendorName || vendorProfile.name,
      branch: cData.branch || vendorProfile.branch || "Main Branch",
      title: cData.title || "Meal Discount Offer",
      category: cData.category || "Local Delicacies",
      image: cData.image || null,
      imageUploadStatus: cData.imageUploadStatus || (cData.image ? "synced" : "none"),
      isFeatured: Boolean(cData.isFeatured),
      pointsCost,
      discountNaira: discount,
      minSpendNaira: minSpend,
      campaignBudgetNaira: budget,
      campaignSpentNaira: spent,
      campaignReservedNaira: reserved,
      committedExposureNaira: committed,
      availableCapacityNaira: availableCapacity,
      isAvailable: status === "active" && cData.migrationStatus === "ready" && availableCapacity >= discount,
      status,
      migrationStatus: cData.migrationStatus || "ready",
      createdAt: cData.createdAt?.toDate ? cData.createdAt.toDate().toISOString() : cData.createdAt,
      updatedAt: cData.updatedAt?.toDate ? cData.updatedAt.toDate().toISOString() : cData.updatedAt,
    };
  });

  // Fetch Recent Completed Redemptions for this vendor (Tenant Isolation)
  let recentRedemptions = [];
  try {
    const redSnap = await db.collection("meal_redemptions")
      .where("vendorId", "==", vId)
      .orderBy("redeemedAt", "desc")
      .limit(50)
      .get();

    recentRedemptions = redSnap.docs.map((docSnap) => {
      const rData = docSnap.data();
      return {
        id: docSnap.id,
        redemptionReference: rData.redemptionReference || docSnap.id,
        voucherCode: rData.voucherCode,
        campaignId: rData.campaignId,
        offerId: rData.offerId,
        cashierUid: rData.cashierUid,
        cashierName: rData.cashierName || "Cashier",
        vendorBranch: rData.vendorBranch,
        billAmountNaira: Number(rData.billAmountNaira || 0),
        discountNaira: Number(rData.discountNaira || 0),
        finalPayableNaira: Number(rData.finalPayableNaira || 0),
        status: rData.status || "completed",
        redeemedAt: rData.redeemedAt?.toDate ? rData.redeemedAt.toDate().toISOString() : rData.redeemedAt,
      };
    });
  } catch (err) {
    const fallbackRedSnap = await db.collection("meal_redemptions")
      .where("vendorId", "==", vId)
      .get();
    recentRedemptions = fallbackRedSnap.docs
      .map((docSnap) => {
        const rData = docSnap.data();
        const dateMs = rData.redeemedAt?.toMillis ? rData.redeemedAt.toMillis() : new Date(rData.redeemedAt || 0).getTime();
        return {
          id: docSnap.id,
          redemptionReference: rData.redemptionReference || docSnap.id,
          voucherCode: rData.voucherCode,
          campaignId: rData.campaignId,
          offerId: rData.offerId,
          cashierUid: rData.cashierUid,
          cashierName: rData.cashierName || "Cashier",
          vendorBranch: rData.vendorBranch,
          billAmountNaira: Number(rData.billAmountNaira || 0),
          discountNaira: Number(rData.discountNaira || 0),
          finalPayableNaira: Number(rData.finalPayableNaira || 0),
          status: rData.status || "completed",
          redeemedAt: rData.redeemedAt?.toDate ? rData.redeemedAt.toDate().toISOString() : rData.redeemedAt,
          _dateMs: dateMs,
        };
      })
      .sort((a, b) => b._dateMs - a._dateMs)
      .slice(0, 50);
  }

  const totalGrossBillAmountNaira = recentRedemptions.reduce((acc, r) => acc + r.billAmountNaira, 0);
  const totalMerchantRevenueNaira = recentRedemptions.reduce((acc, r) => acc + r.finalPayableNaira, 0);

  return {
    success: true,
    callerRole: authResult.vendorRole,
    isAdmin: authResult.isAdmin,
    vendor: vendorProfile,
    summary: {
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaignsCount,
      pausedCampaigns: pausedCampaignsCount,
      endedCampaigns: endedCampaignsCount,
      haltedCampaigns: haltedCampaignsCount,
      totalAllocatedBudgetNaira,
      totalSpentBudgetNaira,
      totalReservedBudgetNaira,
      totalAvailableCapacityNaira,
      totalRedemptionsCount: recentRedemptions.length,
      totalGrossBillAmountNaira,
      totalMerchantRevenueNaira,
    },
    metrics: {
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaignsCount,
      pausedCampaigns: pausedCampaignsCount,
      endedCampaigns: endedCampaignsCount,
      haltedCampaigns: haltedCampaignsCount,
      totalAllocatedBudgetNaira,
      totalSpentBudgetNaira,
      totalReservedBudgetNaira,
      totalAvailableCapacityNaira,
      totalRedemptionsCount: recentRedemptions.length,
      totalGrossBillAmountNaira,
      totalMerchantRevenueNaira,
    },
    campaigns,
    recentRedemptions,
  };
}

export const getMerchantDashboardData = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to view merchant dashboard.");
  }
  const { targetVendorId } = request.data || {};
  return await getMerchantDashboardDataCore({ callerUid, targetVendorId });
});

/**
 * Stage 4 Merchant Campaign Status Transition Core.
 *
 * Enforces:
 * - Role check: requires 'manager' or 'owner' role on targetVendorId
 * - Allowed merchant transitions: 'active' <-> 'paused', and ('active'|'paused') -> 'ended'
 * - Inviolability: strictly blocks setting or clearing 'emergency_halt'
 * - Atomically synchronizes public_meal_offers projection availability
 */
export async function updateMerchantCampaignStatusCore({
  callerUid,
  campaignId,
  newStatus,
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to update campaign status.");
  }
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    throw new HttpsError("invalid-argument", "Valid campaignId is required.");
  }

  const allowedMerchantStatuses = ["active", "paused", "ended"];
  if (newStatus === "emergency_halt") {
    throw new HttpsError(
      "invalid-argument",
      "Merchants cannot assert emergency administrative halt. This status is reserved for system administrators."
    );
  }
  if (!allowedMerchantStatuses.includes(newStatus)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid status: must be one of ${allowedMerchantStatuses.join(", ")}.`
    );
  }

  const campRef = db.collection("meal_campaigns").doc(campaignId.trim());

  return await db.runTransaction(async (t) => {
    const cSnap = await t.get(campRef);
    if (!cSnap.exists) {
      throw new HttpsError("not-found", "Campaign not found.");
    }
    const cData = cSnap.data();

    // Verify Authorization: caller must be manager, owner, or admin for this specific vendor
    await verifyVendorAuthorizationCore({
      callerUid,
      targetVendorId: cData.vendorId,
      requiredRole: "manager",
    });

    // Inviolability check: If campaign is under emergency_halt, merchant cannot modify it!
    if (cData.status === "emergency_halt") {
      throw new HttpsError(
        "failed-precondition",
        "Campaign is under emergency administrative halt and cannot be modified by merchant. Contact platform administration."
      );
    }

    const pmoRef = db.collection("public_meal_offers").doc(campaignId.trim());
    const pmoSnap = await t.get(pmoRef);
    const qRef = db.collection("quarantined_meal_campaigns").doc(campaignId.trim());
    const qSnap = await t.get(qRef);

    t.update(campRef, {
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const currentSpent = Number(cData.campaignSpentNaira || 0);
    const currentReserved = Number(cData.campaignReservedNaira || 0);
    const budget = Number(cData.campaignBudgetNaira || 0);
    const availableCap = budget - (currentSpent + currentReserved);
    const discount = Number(cData.discountNaira || 0);

    // Public offer recalculation: only available if active, ready, not quarantined, and has capacity
    const isAvail =
      newStatus === "active" &&
      cData.migrationStatus === "ready" &&
      !qSnap.exists &&
      availableCap >= discount;

    if (pmoSnap.exists) {
      t.update(pmoRef, {
        status: newStatus,
        isAvailable: isAvail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      campaignId: campaignId.trim(),
      vendorId: cData.vendorId,
      previousStatus: cData.status,
      status: newStatus,
      isAvailable: isAvail,
    };
  });
}

export const updateMerchantCampaignStatus = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to update campaign status.");
  }
  const { campaignId, newStatus } = request.data || {};
  return await updateMerchantCampaignStatusCore({
    callerUid,
    campaignId,
    newStatus,
  });
});

/**
 * Stage 4 Merchant Campaign Budget Top-up onCall wrapper.
 */
export const updateMerchantCampaignBudget = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to update campaign budget.");
  }
  const { campaignId, newBudgetNaira } = request.data || {};
  return await updateCampaignBudgetCore({
    callerUid,
    campaignId,
    newBudgetNaira,
  });
});

/**
 * Stage 4 Admin Provisioning Core: Creates Firebase Auth user & configures Firestore users/{uid}.
 * Restricted strictly to platform administrators (role === 'admin' || isAdmin === true).
 */
export async function adminProvisionVendorUserCore({
  callerUid,
  email,
  password,
  fullName,
  targetVendorId,
  vendorRole = "cashier",
  vendorBranch = "Main Branch",
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required for admin provisioning.");
  }
  const adminSnap = await db.collection("users").doc(callerUid).get();
  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Caller profile not found.");
  }
  const adminData = adminSnap.data() || {};
  const isAdmin = adminData.role === "admin" || adminData.isAdmin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Only platform administrators can provision vendor users.");
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Valid email address is required.");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters long.");
  }
  if (!targetVendorId || typeof targetVendorId !== "string" || !targetVendorId.trim()) {
    throw new HttpsError("invalid-argument", "Valid targetVendorId is required.");
  }

  const cleanRole = ["owner", "manager", "cashier"].includes(vendorRole) ? vendorRole : "cashier";
  const cleanVendorId = targetVendorId.trim();
  const cleanName = fullName?.trim() || "Store Staff";

  // Check if vendor exists in meal_vendors (or auto-create stub if requested)
  const vendorRef = db.collection("meal_vendors").doc(cleanVendorId);
  const vendorDoc = await vendorRef.get();
  if (!vendorDoc.exists) {
    await vendorRef.set({
      id: cleanVendorId,
      name: cleanVendorId,
      branches: [vendorBranch?.trim() || "Main Branch"],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Create or retrieve Auth User
  let authUser;
  try {
    authUser = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    await admin.auth().updateUser(authUser.uid, {
      password: password,
      displayName: cleanName,
    });
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      authUser = await admin.auth().createUser({
        email: email.trim().toLowerCase(),
        password: password,
        displayName: cleanName,
      });
    } else {
      throw new HttpsError("internal", `Auth creation failed: ${err.message}`);
    }
  }

  // Write authoritative profile to users/{uid}
  const userRef = db.collection("users").doc(authUser.uid);
  await userRef.set(
    {
      uid: authUser.uid,
      userEmail: email.trim().toLowerCase(),
      userName: cleanName,
      cashierName: cleanName,
      role: "vendor",
      vendorId: cleanVendorId,
      vendorRole: cleanRole,
      vendorBranch: vendorBranch?.trim() || "Main Branch",
      isProvisionedByAdmin: true,
      provisionedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    uid: authUser.uid,
    email: email.trim().toLowerCase(),
    vendorId: cleanVendorId,
    vendorRole: cleanRole,
    vendorBranch: vendorBranch?.trim() || "Main Branch",
    cashierName: cleanName,
  };
}

export const adminProvisionVendorUser = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required for admin provisioning.");
  }
  const { email, password, fullName, targetVendorId, vendorRole, vendorBranch } = request.data || {};
  return await adminProvisionVendorUserCore({
    callerUid,
    email,
    password,
    fullName,
    targetVendorId,
    vendorRole,
    vendorBranch,
  });
});

/**
 * Stage 4 Admin Store Entity Registration Core: Creates or updates meal_vendors/{slug}.
 * Restricted strictly to platform administrators (role === 'admin' || isAdmin === true).
 */
export async function adminRegisterVendorStoreCore({
  callerUid,
  name,
  slug,
  branches,
  logoEmoji = "🍗",
  contactEmail = null,
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required for store registration.");
  }

  const adminSnap = await db.collection("users").doc(callerUid).get();
  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Caller profile not found.");
  }
  const adminData = adminSnap.data() || {};
  const isAdmin = adminData.role === "admin" || adminData.isAdmin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Only platform administrators can register vendor stores.");
  }

  const cleanName = typeof name === "string" ? name.trim() : "";
  if (cleanName.length < 2 || cleanName.length > 100) {
    throw new HttpsError("invalid-argument", "Store name must be between 2 and 100 characters.");
  }

  const rawSlug = typeof slug === "string" && slug.trim() ? slug.trim() : cleanName;
  const cleanSlug = rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!cleanSlug) {
    throw new HttpsError("invalid-argument", "A valid store ID slug is required.");
  }

  let cleanBranches = ["Main Branch"];
  if (Array.isArray(branches)) {
    const filtered = branches.map((b) => String(b).trim()).filter(Boolean);
    if (filtered.length > 0) cleanBranches = filtered;
  } else if (typeof branches === "string" && branches.trim()) {
    const filtered = branches
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    if (filtered.length > 0) cleanBranches = filtered;
  }

  const cleanEmoji = typeof logoEmoji === "string" && logoEmoji.trim() ? logoEmoji.trim() : "🍗";
  const cleanEmail = typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim().toLowerCase() : null;

  const vendorRef = db.collection("meal_vendors").doc(cleanSlug);
  const existingSnap = await vendorRef.get();

  const payload = {
    id: cleanSlug,
    name: cleanName,
    branches: cleanBranches,
    logoEmoji: cleanEmoji,
    contactEmail: cleanEmail,
    isActive: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!existingSnap.exists) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await vendorRef.set(payload, { merge: true });

  return {
    success: true,
    vendorId: cleanSlug,
    name: cleanName,
    branches: cleanBranches,
    logoEmoji: cleanEmoji,
    contactEmail: cleanEmail,
  };
}

export const adminRegisterVendorStore = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required for store registration.");
  }
  const { name, slug, branches, logoEmoji, contactEmail } = request.data || {};
  return await adminRegisterVendorStoreCore({
    callerUid,
    name,
    slug,
    branches,
    logoEmoji,
    contactEmail,
  });
});

/**
 * Update Vendor Profile (Logo, Banner, Description)
 * Restricted to Owner of the target vendor or Admin.
 */
export async function updateVendorProfileCore({
  callerUid,
  targetVendorId,
  logoUrl,
  bannerUrl,
  description,
  address,
  phone,
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to update vendor profile.");
  }
  if (!targetVendorId || typeof targetVendorId !== "string" || !targetVendorId.trim()) {
    throw new HttpsError("invalid-argument", "Valid targetVendorId is required.");
  }

  const vId = targetVendorId.trim();

  // Requires 'owner' role on target vendor or platform admin
  await verifyVendorAuthorizationCore({
    callerUid,
    targetVendorId: vId,
    requiredRole: "owner",
  });

  const vendorRef = db.collection("meal_vendors").doc(vId);
  const vSnap = await vendorRef.get();
  if (!vSnap.exists) {
    throw new HttpsError("not-found", "Vendor not found.");
  }

  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
  if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
  if (description !== undefined) updateData.description = description;
  if (address !== undefined) updateData.address = address;
  if (phone !== undefined) updateData.phone = phone;

  await vendorRef.set(updateData, { merge: true });

  // Propagate updated store logoUrl to existing campaigns and public offers
  if (logoUrl !== undefined) {
    try {
      const [campsSnap, offersSnap] = await Promise.all([
        db.collection("meal_campaigns").where("vendorId", "==", vId).get(),
        db.collection("public_meal_offers").where("vendorId", "==", vId).get(),
      ]);

      const refsToUpdate = [...campsSnap.docs.map((d) => d.ref), ...offersSnap.docs.map((d) => d.ref)];
      for (let i = 0; i < refsToUpdate.length; i += 400) {
        const batch = db.batch();
        const chunk = refsToUpdate.slice(i, i + 400);
        for (const ref of chunk) {
          batch.update(ref, {
            vendorLogoUrl: logoUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (propErr) {
      logger.warn("Non-fatal error cascading vendorLogoUrl to offers/campaigns:", propErr);
    }
  }

  return {
    success: true,
    vendorId: vId,
    ...updateData,
  };
}

export const updateVendorProfile = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to update vendor profile.");
  }
  const { targetVendorId, logoUrl, bannerUrl, description, address, phone } = request.data || {};
  return await updateVendorProfileCore({
    callerUid,
    targetVendorId,
    logoUrl,
    bannerUrl,
    description,
    address,
    phone,
  });
});

/**
 * Reconcile or Retry Campaign Image Upload (Background Upload Reconciliation Engine).
 * Updates both meal_campaigns/{campaignId} and public_meal_offers/{campaignId}.
 */
export async function updateVendorCampaignImageCore({
  callerUid,
  campaignId,
  imageUrl,
  imageUploadStatus = "synced",
}) {
  try {
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Authentication required to update campaign image.");
    }
    if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
      throw new HttpsError("invalid-argument", "Valid campaignId is required.");
    }

    const cleanId = campaignId.trim();
    const campRef = db.collection("meal_campaigns").doc(cleanId);
    const campSnap = await campRef.get();
    if (!campSnap.exists) {
      throw new HttpsError("not-found", "Campaign not found.");
    }
    const campData = campSnap.data() || {};

    // Require manager/owner of the campaign's vendor or platform admin
    await verifyVendorAuthorizationCore({
      callerUid,
      targetVendorId: campData.vendorId,
      requiredRole: "manager",
    });

    const cleanImage = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
    const cleanStatus = ["uploading", "synced", "failed", "none"].includes(imageUploadStatus)
      ? imageUploadStatus
      : cleanImage
      ? "synced"
      : "none";

    await campRef.update({
      image: cleanImage,
      imageUploadStatus: cleanStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const pmoRef = db.collection("public_meal_offers").doc(cleanId);
    const pmoSnap = await pmoRef.get();
    if (pmoSnap.exists) {
      await pmoRef.update({
        image: cleanImage,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      campaignId: cleanId,
      vendorId: campData.vendorId,
      image: cleanImage,
      imageUploadStatus: cleanStatus,
    };
  } catch (err) {
    logger.error("updateVendorCampaignImageCore error:", {
      callerUid,
      campaignId,
      error: err?.message || String(err),
      stack: err?.stack || null,
    });

    // Write diagnostic failure audit log so engineer can inspect backend failure reasons
    try {
      await db.collection("admin_audit_logs").add({
        action: "CAMPAIGN_IMAGE_UPDATE_FAILED",
        callerUid: callerUid || null,
        campaignId: campaignId || null,
        imageUrl: typeof imageUrl === "string" ? imageUrl.slice(0, 500) : null,
        errorMessage: err?.message || String(err),
        errorCode: err?.code || "internal",
        errorStack: err?.stack || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (auditErr) {
      logger.error("Failed to write to admin_audit_logs:", auditErr);
    }

    if (err instanceof HttpsError) {
      throw err;
    }
    throw new HttpsError("internal", err?.message || "Internal error updating campaign image.");
  }
}

export const updateVendorCampaignImage = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to update campaign image.");
  }
  const { campaignId, imageUrl, imageUploadStatus } = request.data || {};
  return await updateVendorCampaignImageCore({
    callerUid,
    campaignId,
    imageUrl,
    imageUploadStatus,
  });
});

/**
 * Admin Featured Campaign Promotion Engine.
 * Allows platform administrators ONLY (role === 'admin' || isAdmin === true)
 * to promote or unpromote a campaign for the Featured Partner spotlight section.
 */
export async function adminSetCampaignFeaturedCore({
  callerUid,
  campaignId,
  isFeatured,
}) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to promote featured campaign.");
  }
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    throw new HttpsError("invalid-argument", "Valid campaignId is required.");
  }

  const adminSnap = await db.collection("users").doc(callerUid).get();
  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Caller profile not found.");
  }
  const adminData = adminSnap.data() || {};
  const isAdmin = adminData.role === "admin" || adminData.isAdmin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Only platform administrators can promote featured partner campaigns.");
  }

  const targetId = campaignId.trim();
  const featuredFlag = Boolean(isFeatured);

  // If setting isFeatured=true, clear isFeatured on any other campaigns so the admin's choice is the single Featured Partner
  if (featuredFlag) {
    const prevFeaturedCamps = await db.collection("meal_campaigns").where("isFeatured", "==", true).get();
    for (const docSnap of prevFeaturedCamps.docs) {
      if (docSnap.id !== targetId) {
        await docSnap.ref.update({ isFeatured: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const pRef = db.collection("public_meal_offers").doc(docSnap.id);
        const pSnap = await pRef.get();
        if (pSnap.exists) {
          await pRef.update({ isFeatured: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
      }
    }
  }

  const campRef = db.collection("meal_campaigns").doc(targetId);
  const campSnap = await campRef.get();
  if (!campSnap.exists) {
    throw new HttpsError("not-found", "Campaign not found.");
  }

  await campRef.update({
    isFeatured: featuredFlag,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const pmoRef = db.collection("public_meal_offers").doc(targetId);
  const pmoSnap = await pmoRef.get();
  if (pmoSnap.exists) {
    await pmoRef.update({
      isFeatured: featuredFlag,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {
    success: true,
    campaignId: targetId,
    isFeatured: featuredFlag,
  };
}

export const adminSetCampaignFeatured = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const callerUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testCallerUid : null);
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required to promote featured campaign.");
  }
  const { campaignId, isFeatured } = request.data || {};
  return await adminSetCampaignFeaturedCore({
    callerUid,
    campaignId,
    isFeatured,
  });
});



/**
 * Stage 3.1 Bounded, Resumable Public Projection Backfill Engine.
 *
 * Enforces:
 * - Admin authorization verified against users/{uid}
 * - Bounded pagination with continuation cursor
 * - Deterministic whole-collection identity collision detection
 * - Bilateral quarantine of all colliding campaigns & immediate projection deletion
 * - Fail-closed schema validation: rejects invalid terms (minSpend < discount, budget > 200k, negative numbers)
 * - Safe repeatability: meal_campaigns documents remain strictly UNMUTATED
 */
export async function backfillPublicMealOffersCore({
  adminUid,
  pageSize = 50,
  startAfterCampaignId = null,
}) {
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required for backfill.");
  }

  // 1. Authorize Administrator
  const adminSnap = await db.collection("users").doc(adminUid).get();
  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Admin user profile not found.");
  }
  const aData = adminSnap.data() || {};
  if (aData.role !== "admin" && aData.isAdmin !== true) {
    throw new HttpsError("permission-denied", "Unauthorized: System administrator privilege required for backfill.");
  }

  const safePageSize = Math.min(Math.max(Number(pageSize) || 50, 1), 100);

  // 2. Deterministic Whole-Collection Identity Collision Detection
  // Reads lightweight select("offerId") across all campaigns to find cross-campaign identity collisions
  const allCampsSnap = await db.collection("meal_campaigns").select("offerId").get();
  const offerIdToCampIds = new Map();
  const allCampDocIds = new Set();

  for (const doc of allCampsSnap.docs) {
    allCampDocIds.add(doc.id);
    const data = doc.data() || {};
    const effectiveOfferId = data.offerId || doc.id;
    if (!offerIdToCampIds.has(effectiveOfferId)) {
      offerIdToCampIds.set(effectiveOfferId, []);
    }
    offerIdToCampIds.get(effectiveOfferId).push(doc.id);
  }

  const collidingCampaignIds = new Set();
  for (const [offId, campIds] of offerIdToCampIds.entries()) {
    if (campIds.length > 1) {
      // Multiple campaigns share this canonical offerId!
      for (const cid of campIds) {
        collidingCampaignIds.add(cid);
      }
    }
    // Document ID vs offerId collision: if offId equals another campaign's doc.id
    if (allCampDocIds.has(offId)) {
      for (const cid of campIds) {
        if (cid !== offId) {
          collidingCampaignIds.add(cid);
          collidingCampaignIds.add(offId);
        }
      }
    }
  }

  // 3. Query Bounded Page of Campaigns
  let q = db.collection("meal_campaigns").orderBy(admin.firestore.FieldPath.documentId()).limit(safePageSize);
  if (startAfterCampaignId && typeof startAfterCampaignId === "string") {
    q = q.startAfter(startAfterCampaignId);
  }

  const pageSnap = await q.get();
  if (pageSnap.empty) {
    return {
      success: true,
      processedCount: 0,
      projectedCount: 0,
      quarantinedCount: 0,
      skippedCount: 0,
      nextCursor: null,
      hasMore: false,
    };
  }

  let processedCount = 0;
  let projectedCount = 0;
  let quarantinedCount = 0;
  let skippedCount = 0;

  for (const doc of pageSnap.docs) {
    const campId = doc.id;
    processedCount++;

    await db.runTransaction(async (t) => {
      const campRef = db.collection("meal_campaigns").doc(campId);
      const campSnap = await t.get(campRef);
      if (!campSnap.exists) return;

      const qRef = db.collection("quarantined_meal_campaigns").doc(campId);
      const qSnap = await t.get(qRef);

      const pmoRef = db.collection("public_meal_offers").doc(campId);
      const pmoSnap = await t.get(pmoRef);

      // Check whole-collection collision
      if (collidingCampaignIds.has(campId)) {
        if (!qSnap.exists) {
          t.set(qRef, {
            campaignId: campId,
            quarantineReason: "IDENTITY_COLLISION_ACROSS_CAMPAIGNS",
            details: "Campaign has conflicting canonical offerId or document ID colliding with another campaign.",
            quarantinedAt: admin.firestore.FieldValue.serverTimestamp(),
            quarantinedBy: adminUid,
          });
        }
        if (pmoSnap.exists) {
          t.delete(pmoRef);
        }
        quarantinedCount++;
        return;
      }

      // Check existing quarantine record
      if (qSnap.exists) {
        if (pmoSnap.exists) {
          t.delete(pmoRef);
        }
        skippedCount++;
        return;
      }

      const cData = campSnap.data() || {};
      const discount = Number(cData.discountNaira);
      const minSpend = Number(cData.minSpendNaira);
      const budget = Number(cData.campaignBudgetNaira);
      const spent = Number(cData.campaignSpentNaira ?? 0);
      const reserved = Number(cData.campaignReservedNaira ?? 0);
      const status = cData.status;
      const migrationStatus = cData.migrationStatus;

      // Fail-Closed Validation (No Fabricated Defaults!)
      const hasValidDiscount = Number.isFinite(discount) && discount > 0;
      const hasValidMinSpend = Number.isFinite(minSpend) && minSpend >= discount;
      const hasValidBudget = Number.isFinite(budget) && budget > 0 && budget <= 200000;
      const hasValidSpent = Number.isFinite(spent) && spent >= 0;
      const hasValidReserved = Number.isFinite(reserved) && reserved >= 0;
      const hasValidFloor = hasValidBudget && hasValidSpent && hasValidReserved && budget >= spent + reserved;
      const hasValidStatus = ["active", "paused", "ended", "emergency_halt"].includes(status);
      const isMigrationReady = migrationStatus === "ready";

      if (!hasValidDiscount || !hasValidMinSpend || !hasValidBudget || !hasValidFloor || !hasValidStatus || !isMigrationReady) {
        let reason = "INVALID_CAMPAIGN_TERMS";
        if (!hasValidDiscount) reason = "INVALID_DISCOUNT_AMOUNT";
        else if (!hasValidMinSpend) reason = "MIN_SPEND_LESS_THAN_DISCOUNT";
        else if (!hasValidBudget) reason = "BUDGET_EXCEEDS_CAP_OR_INVALID";
        else if (!hasValidFloor) reason = "BUDGET_FLOOR_VIOLATION";
        else if (!hasValidStatus) reason = "INVALID_STATUS";
        else if (!isMigrationReady) reason = "CAMPAIGN_NOT_MIGRATION_READY";

        t.set(qRef, {
          campaignId: campId,
          quarantineReason: reason,
          details: `Campaign failed schema verification: discount=${discount}, minSpend=${minSpend}, budget=${budget}, spent=${spent}, reserved=${reserved}, status=${status}, migration=${migrationStatus}`,
          quarantinedAt: admin.firestore.FieldValue.serverTimestamp(),
          quarantinedBy: adminUid,
        });
        if (pmoSnap.exists) {
          t.delete(pmoRef);
        }
        quarantinedCount++;
        return;
      }

      // Valid & Ready: Compute authoritative availability
      const availableCap = budget - (spent + reserved);
      const isAvailable = status === "active" && availableCap >= discount;

      const publicProjection = {
        id: campId,
        campaignId: campId,
        offerId: cData.offerId || campId,
        vendorId: cData.vendorId || "paywaka-demo-foods",
        vendorName: cData.vendorName || cData.vendorId || "PayWaka Partner Food",
        vendorLogoUrl: cData.vendorLogoUrl || null,
        vendorLogoEmoji: cData.vendorLogoEmoji || "🍗",
        branch: cData.branch || "Main Branch",
        category: cData.category || "Local Delicacies",
        image: cData.image || null,
        isFeatured: Boolean(cData.isFeatured),
        title: cData.title || `${cData.vendorName || "Meal"} Voucher`,
        pointsCost: Number(cData.pointsCost || 0),
        discountNaira: discount,
        minSpendNaira: minSpend,
        isAvailable,
        status,
        createdAt: cData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      t.set(pmoRef, publicProjection);
      projectedCount++;
    });
  }

  const lastDoc = pageSnap.docs[pageSnap.docs.length - 1];
  const hasMore = pageSnap.docs.length === safePageSize;
  const nextCursor = hasMore ? lastDoc.id : null;

  return {
    success: true,
    processedCount,
    projectedCount,
    quarantinedCount,
    skippedCount,
    nextCursor,
    hasMore,
  };
}

export const backfillPublicMealOffers = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const adminUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testAdminUid : null);
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required for backfill operation.");
  }
  const { pageSize, startAfterCampaignId } = request.data || {};
  return await backfillPublicMealOffersCore({ adminUid, pageSize, startAfterCampaignId });
});

/**
 * Server-Managed Bidirectional Cutover Verification Engine.
 *
 * Sessions are stored in verification_runs/{runId} and bound to the admin caller UID.
 * Zero client-passed counters/state: all audit progression, counts, and cutover gating
 * are calculated strictly server-side.
 *
 * Phases:
 * 1. FORWARD_AUDIT: Checks every eligible campaign in meal_campaigns has a matching public_meal_offers projection with accurate isAvailable.
 * 2. REVERSE_AUDIT: Checks every public projection maps to a valid, ready, unquarantined meal_campaigns document, cleaning orphans and stale records.
 * 3. FINAL_RECONCILIATION: Fresh concordance sweep; sets readyForCutover = true ONLY if 100% concordant.
 */
export async function startPublicOffersVerificationRunCore({ adminUid }) {
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }
  const adminSnap = await db.collection("users").doc(adminUid).get();
  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Admin user profile not found.");
  }
  const aData = adminSnap.data() || {};
  if (aData.role !== "admin" && aData.isAdmin !== true) {
    throw new HttpsError("permission-denied", "System administrator role required.");
  }

  const runId = `vrun_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const runRef = db.collection("verification_runs").doc(runId);

  const initialRecord = {
    runId,
    adminUid,
    phase: "FORWARD_AUDIT",
    cursor: null,
    forwardStats: { campaignsChecked: 0, matchedProjections: 0, discrepancies: 0 },
    reverseStats: { projectionsChecked: 0, validMatched: 0, orphansCleaned: 0, staleCleaned: 0 },
    finalReconciliation: { completed: false, passed: false, checkedCount: 0, errorCount: 0 },
    readyForCutover: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await runRef.set(initialRecord);

  return {
    success: true,
    runId,
    phase: "FORWARD_AUDIT",
    cursor: null,
    readyForCutover: false,
  };
}

export async function stepPublicOffersVerificationRunCore({
  adminUid,
  runId,
  pageSize = 50,
  expectedPhase,
  expectedCursor,
}) {
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }
  if (!runId || typeof runId !== "string") {
    throw new HttpsError("invalid-argument", "Valid runId is required.");
  }
  if (!expectedPhase || typeof expectedPhase !== "string") {
    throw new HttpsError("invalid-argument", "expectedPhase must be explicitly supplied.");
  }
  if (expectedCursor === undefined) {
    throw new HttpsError("invalid-argument", "expectedCursor must be explicitly supplied (pass null for initial cursor).");
  }
  if (expectedCursor !== null && typeof expectedCursor !== "string") {
    throw new HttpsError("invalid-argument", "expectedCursor must be null or a string document ID.");
  }

  const adminSnap = await db.collection("users").doc(adminUid).get();
  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Admin user profile not found.");
  }
  const aData = adminSnap.data() || {};
  if (aData.role !== "admin" && aData.isAdmin !== true) {
    throw new HttpsError("permission-denied", "System administrator role required.");
  }

  const runRef = db.collection("verification_runs").doc(runId);
  const safePageSize = Math.min(Math.max(Number(pageSize) || 50, 1), 100);

  return await db.runTransaction(async (t) => {
    const runSnap = await t.get(runRef);
    if (!runSnap.exists) {
      throw new HttpsError("not-found", `Verification run ${runId} not found.`);
    }
    const runData = runSnap.data();

    // Verify Session Ownership
    if (runData.adminUid !== adminUid) {
      throw new HttpsError("permission-denied", "Verification run is bound to another administrator.");
    }

    // Optimistic Concurrency Checks (Enforce explicit phase & cursor matching)
    if (runData.phase !== expectedPhase) {
      throw new HttpsError("failed-precondition", `Phase mismatch: expected ${expectedPhase}, session is at ${runData.phase}.`);
    }

    const serverCursor = runData.cursor || null;
    const clientCursor = expectedCursor;
    if (clientCursor !== serverCursor) {
      throw new HttpsError("failed-precondition", `Cursor mismatch: expected cursor "${clientCursor}" does not match server cursor "${serverCursor}".`);
    }

    if (runData.phase === "COMPLETED" || runData.phase === "FAILED") {
      return {
        success: true,
        runId,
        phase: runData.phase,
        readyForCutover: runData.readyForCutover,
        forwardStats: runData.forwardStats,
        reverseStats: runData.reverseStats,
        finalReconciliation: runData.finalReconciliation,
        completed: true,
      };
    }

    // -----------------------------------------------------------------------
    // PHASE 1: FORWARD AUDIT (meal_campaigns -> public_meal_offers)
    // -----------------------------------------------------------------------
    if (runData.phase === "FORWARD_AUDIT") {
      let q = db.collection("meal_campaigns").orderBy(admin.firestore.FieldPath.documentId()).limit(safePageSize);
      if (runData.cursor) {
        q = q.startAfter(runData.cursor);
      }
      const pageSnap = await q.get();

      if (pageSnap.empty) {
        // Transition to REVERSE_AUDIT
        t.update(runRef, {
          phase: "REVERSE_AUDIT",
          cursor: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
          success: true,
          runId,
          phase: "REVERSE_AUDIT",
          cursor: null,
          readyForCutover: false,
          forwardStats: runData.forwardStats,
          reverseStats: runData.reverseStats,
        };
      }

      let checked = 0;
      let matched = 0;
      let discrepancies = 0;

      for (const doc of pageSnap.docs) {
        checked++;
        const cData = doc.data() || {};
        const campId = doc.id;

        const qRef = db.collection("quarantined_meal_campaigns").doc(campId);
        const qSnap = await t.get(qRef);

        const pmoRef = db.collection("public_meal_offers").doc(campId);
        const pmoSnap = await t.get(pmoRef);

        const isClean = !qSnap.exists;
        const isReady = cData.migrationStatus === "ready";
        const budget = Number(cData.campaignBudgetNaira || 0);
        const spent = Number(cData.campaignSpentNaira || 0);
        const reserved = Number(cData.campaignReservedNaira || 0);
        const discount = Number(cData.discountNaira || 0);
        const minSpend = Number(cData.minSpendNaira || 0);
        const hasValidTerms = discount > 0 && minSpend >= discount && budget > 0 && budget <= 200000;
        const availableCap = budget - (spent + reserved);
        const expectedAvailable = cData.status === "active" && isReady && availableCap >= discount;

        if (isClean && isReady && hasValidTerms) {
          if (!pmoSnap.exists) {
            discrepancies++;
          } else {
            const pData = pmoSnap.data();
            if (pData.isAvailable === expectedAvailable && pData.status === cData.status) {
              matched++;
            } else {
              discrepancies++;
            }
          }
        } else {
          // If quarantined or unmigrated, projection must NOT exist!
          if (pmoSnap.exists) {
            discrepancies++;
          }
        }
      }

      const updatedForwardStats = {
        campaignsChecked: (runData.forwardStats?.campaignsChecked || 0) + checked,
        matchedProjections: (runData.forwardStats?.matchedProjections || 0) + matched,
        discrepancies: (runData.forwardStats?.discrepancies || 0) + discrepancies,
      };

      const lastDoc = pageSnap.docs[pageSnap.docs.length - 1];
      const hasMore = pageSnap.docs.length === safePageSize;
      const nextPhase = hasMore ? "FORWARD_AUDIT" : "REVERSE_AUDIT";
      const nextCursor = hasMore ? lastDoc.id : null;

      t.update(runRef, {
        phase: nextPhase,
        cursor: nextCursor,
        forwardStats: updatedForwardStats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        runId,
        phase: nextPhase,
        cursor: nextCursor,
        readyForCutover: false,
        forwardStats: updatedForwardStats,
      };
    }

    // -----------------------------------------------------------------------
    // PHASE 2: REVERSE AUDIT (public_meal_offers -> meal_campaigns)
    // -----------------------------------------------------------------------
    if (runData.phase === "REVERSE_AUDIT") {
      let q = db.collection("public_meal_offers").orderBy(admin.firestore.FieldPath.documentId()).limit(safePageSize);
      if (runData.cursor) {
        q = q.startAfter(runData.cursor);
      }
      const pageSnap = await q.get();

      if (pageSnap.empty) {
        // Transition to FINAL_RECONCILIATION
        t.update(runRef, {
          phase: "FINAL_RECONCILIATION",
          cursor: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
          success: true,
          runId,
          phase: "FINAL_RECONCILIATION",
          cursor: null,
          readyForCutover: false,
          forwardStats: runData.forwardStats,
          reverseStats: runData.reverseStats,
        };
      }

      let checked = 0;
      let validMatched = 0;
      let orphansCleaned = 0;
      let staleCleaned = 0;

      // First pass: execute ALL reads before any writes
      const auditItems = [];
      for (const doc of pageSnap.docs) {
        const pmoId = doc.id;
        const campRef = db.collection("meal_campaigns").doc(pmoId);
        const campSnap = await t.get(campRef);
        const qRef = db.collection("quarantined_meal_campaigns").doc(pmoId);
        const qSnap = await t.get(qRef);
        auditItems.push({ doc, campSnap, qSnap });
      }

      // Second pass: execute all writes
      for (const item of auditItems) {
        checked++;
        const { doc, campSnap, qSnap } = item;

        if (!campSnap.exists) {
          // Orphan projection without authoritative campaign -> Clean up!
          t.delete(doc.ref);
          orphansCleaned++;
        } else if (qSnap.exists) {
          // Stale projection of quarantined campaign -> Clean up!
          t.delete(doc.ref);
          staleCleaned++;
        } else {
          const cData = campSnap.data() || {};
          if (cData.migrationStatus !== "ready") {
            t.delete(doc.ref);
            staleCleaned++;
          } else {
            validMatched++;
          }
        }
      }

      const updatedReverseStats = {
        projectionsChecked: (runData.reverseStats?.projectionsChecked || 0) + checked,
        validMatched: (runData.reverseStats?.validMatched || 0) + validMatched,
        orphansCleaned: (runData.reverseStats?.orphansCleaned || 0) + orphansCleaned,
        staleCleaned: (runData.reverseStats?.staleCleaned || 0) + staleCleaned,
      };

      const lastDoc = pageSnap.docs[pageSnap.docs.length - 1];
      const hasMore = pageSnap.docs.length === safePageSize;
      const nextPhase = hasMore ? "REVERSE_AUDIT" : "FINAL_RECONCILIATION";
      const nextCursor = hasMore ? lastDoc.id : null;

      t.update(runRef, {
        phase: nextPhase,
        cursor: nextCursor,
        reverseStats: updatedReverseStats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        runId,
        phase: nextPhase,
        cursor: nextCursor,
        readyForCutover: false,
        reverseStats: updatedReverseStats,
      };
    }

    // -----------------------------------------------------------------------
    // PHASE 3: FINAL RECONCILIATION & CUTOVER GATE (Bounded & Resumable)
    // -----------------------------------------------------------------------
    if (runData.phase === "FINAL_RECONCILIATION") {
      let q = db.collection("public_meal_offers").orderBy(admin.firestore.FieldPath.documentId()).limit(safePageSize);
      if (runData.cursor) {
        q = q.startAfter(runData.cursor);
      }
      const pageSnap = await q.get();

      if (pageSnap.empty) {
        const forwardDiscrepancies = Number(runData.forwardStats?.discrepancies || 0);
        const totalErrors = Number(runData.finalReconciliation?.errorCount || 0);
        const passed = forwardDiscrepancies === 0 && totalErrors === 0;
        const finalPhase = passed ? "COMPLETED" : "FAILED";

        t.update(runRef, {
          phase: finalPhase,
          readyForCutover: passed,
          cursor: null,
          "finalReconciliation.completed": true,
          "finalReconciliation.passed": passed,
          "finalReconciliation.forwardDiscrepancies": forwardDiscrepancies,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          runId,
          phase: finalPhase,
          readyForCutover: passed,
          forwardStats: runData.forwardStats,
          reverseStats: runData.reverseStats,
          finalReconciliation: {
            ...(runData.finalReconciliation || {}),
            completed: true,
            passed,
            forwardDiscrepancies,
          },
        };
      }

      // First pass: perform all reads before writes
      const reconItems = [];
      for (const pDoc of pageSnap.docs) {
        const cRef = db.collection("meal_campaigns").doc(pDoc.id);
        const cSnap = await t.get(cRef);
        const qRef = db.collection("quarantined_meal_campaigns").doc(pDoc.id);
        const qSnap = await t.get(qRef);
        reconItems.push({ pDoc, cSnap, qSnap });
      }

      let stepErrors = 0;
      for (const item of reconItems) {
        const { pDoc, cSnap, qSnap } = item;
        if (!cSnap.exists || qSnap.exists) {
          stepErrors++;
          continue;
        }

        const cData = cSnap.data() || {};
        const pData = pDoc.data() || {};
        const budget = Number(cData.campaignBudgetNaira || 0);
        const spent = Number(cData.campaignSpentNaira || 0);
        const reserved = Number(cData.campaignReservedNaira || 0);
        const discount = Number(cData.discountNaira || 0);
        const availableCap = budget - (spent + reserved);
        const expectedAvailable = cData.status === "active" && cData.migrationStatus === "ready" && availableCap >= discount;

        if (pData.isAvailable !== expectedAvailable || pData.status !== cData.status) {
          stepErrors++;
        }
      }

      const totalChecked = (runData.finalReconciliation?.checkedCount || 0) + pageSnap.docs.length;
      const totalErrors = (runData.finalReconciliation?.errorCount || 0) + stepErrors;

      const lastDoc = pageSnap.docs[pageSnap.docs.length - 1];
      const hasMore = pageSnap.docs.length === safePageSize;
      const nextCursor = hasMore ? lastDoc.id : null;

      if (hasMore) {
        t.update(runRef, {
          cursor: nextCursor,
          "finalReconciliation.checkedCount": totalChecked,
          "finalReconciliation.errorCount": totalErrors,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          runId,
          phase: "FINAL_RECONCILIATION",
          cursor: nextCursor,
          readyForCutover: false,
          forwardStats: runData.forwardStats,
          reverseStats: runData.reverseStats,
          finalReconciliation: {
            checkedCount: totalChecked,
            errorCount: totalErrors,
          },
        };
      } else {
        const forwardDiscrepancies = Number(runData.forwardStats?.discrepancies || 0);
        const passed = forwardDiscrepancies === 0 && totalErrors === 0;
        const finalPhase = passed ? "COMPLETED" : "FAILED";

        t.update(runRef, {
          phase: finalPhase,
          readyForCutover: passed,
          cursor: null,
          "finalReconciliation.completed": true,
          "finalReconciliation.passed": passed,
          "finalReconciliation.checkedCount": totalChecked,
          "finalReconciliation.errorCount": totalErrors,
          "finalReconciliation.forwardDiscrepancies": forwardDiscrepancies,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          runId,
          phase: finalPhase,
          readyForCutover: passed,
          forwardStats: runData.forwardStats,
          reverseStats: runData.reverseStats,
          finalReconciliation: {
            completed: true,
            passed,
            checkedCount: totalChecked,
            errorCount: totalErrors,
            forwardDiscrepancies,
          },
        };
      }
    }
  });
}

export async function finalizePublicOffersVerificationRunCore({ adminUid, runId }) {
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }
  const runRef = db.collection("verification_runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) {
    throw new HttpsError("not-found", `Verification run ${runId} not found.`);
  }
  const runData = runSnap.data();
  if (runData.adminUid !== adminUid) {
    throw new HttpsError("permission-denied", "Unauthorized session access.");
  }

  return {
    success: true,
    runId,
    readyForCutover: runData.readyForCutover === true,
    phase: runData.phase,
    forwardStats: runData.forwardStats,
    reverseStats: runData.reverseStats,
    finalReconciliation: runData.finalReconciliation,
  };
}

export const startPublicOffersVerificationRun = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const adminUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testAdminUid : null);
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }
  return await startPublicOffersVerificationRunCore({ adminUid });
});

export const stepPublicOffersVerificationRun = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const adminUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testAdminUid : null);
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }
  const { runId, pageSize, expectedPhase, expectedCursor } = request.data || {};
  return await stepPublicOffersVerificationRunCore({ adminUid, runId, pageSize, expectedPhase, expectedCursor });
});

export const finalizePublicOffersVerificationRun = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const adminUid = request.auth?.uid || (isEmulator && !request.auth ? request.data?.testAdminUid : null);
  if (!adminUid) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }
  const { runId } = request.data || {};
  return await finalizePublicOffersVerificationRunCore({ adminUid, runId });
});


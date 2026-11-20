import admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";
import {
  DEFAULT_BILL_PRICING_CONFIG,
  computeBillPricingAndEarnings,
  computeCashbackFundingSplit,
  floorToWholeNairaKobo,
  mergeBillPricingConfig,
  toKobo,
  toNairaNumber,
} from "./billPricingEngine.js";

/**
 * Extracts actual provider cost from ClubKonnect order/query payloads when available.
 * Returns null if no actual cost/discount field is present, triggering fallback commission calculation.
 */
export function extractClubKonnectActualCost(ckData, faceAmountNaira) {
  if (!ckData || typeof ckData !== "object") {
    return { actualProviderCostNaira: null, commissionSource: "fallback" };
  }
  const face = Number(faceAmountNaira || 0);
  const directCandidates = [
    ckData.amountcharged,
    ckData.amount_charged,
    ckData.chargedamount,
    ckData.charged_amount,
    ckData.costprice,
    ckData.cost_price,
  ];
  for (const raw of directCandidates) {
    if (raw !== undefined && raw !== null && raw !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return { actualProviderCostNaira: parsed, commissionSource: "actual" };
      }
    }
  }

  const discountCandidates = [ckData.discountamount, ckData.discount_amount];
  for (const rawDisc of discountCandidates) {
    if (rawDisc !== undefined && rawDisc !== null && rawDisc !== "") {
      const disc = Number(rawDisc);
      if (Number.isFinite(disc) && disc > 0 && face > disc) {
        return {
          actualProviderCostNaira: Number((face - disc).toFixed(2)),
          commissionSource: "actual",
        };
      }
    }
  }

  return { actualProviderCostNaira: null, commissionSource: "fallback" };
}

export function createCashbackService({
  db,
  stripUndefined,
  writeUpperLevelTransaction,
  generatePaywakaRef,
  settleUserPsaToMerchantCore,
  recordPendingSettlement,
  cancelPendingSettlement,
  awardTransactionPointsCore,
  verifyUserPinCore,
  verifyClubKonnectOrderStatus,
  cancelClubKonnectOrder = null,
  executeFlutterwaveTransferFn = null,
  getFlutterwaveMerchantId,
  FLW_SECRET_KEY,
  assertWholeNairaKobo,
  getPricingConfigCore,
  calculatePlanPricing,
}) {
  let cachedBillConfig = null;
  let cachedBillConfigAt = 0;

  async function getBillPricingConfigCore(forceRefresh = false) {
    if (!forceRefresh && cachedBillConfig && Date.now() - cachedBillConfigAt < 30000) {
      return cachedBillConfig;
    }
    try {
      const snap = await db.collection("system_settings").doc("bill_pricing_config").get();
      const merged = mergeBillPricingConfig(snap.exists ? snap.data() : {});
      cachedBillConfig = merged;
      cachedBillConfigAt = Date.now();
      return merged;
    } catch (err) {
      logger.error("Error loading system_settings/bill_pricing_config:", err);
      return DEFAULT_BILL_PRICING_CONFIG;
    }
  }

  function buildTransactionFieldsFromPricing(pricing, { finalized = false } = {}) {
    const earnedKobo = finalized ? pricing.cashbackGivenKobo : 0;
    const earnedNaira = finalized ? pricing.cashbackGiven : 0;
    const netKobo = pricing.grossGainKobo - earnedKobo - pricing.gatewayCostKobo;
    const netNaira = toNairaNumber(netKobo);

    return {
      // Canonical `amount` ALWAYS preserves the full face product/bill amount P (never W)
      amount: pricing.faceAmount,
      amountKobo: pricing.faceAmountKobo,
      fee: pricing.feeCharged,
      feeKobo: pricing.feeChargedKobo,
      feeCharged: pricing.feeCharged,
      feeChargedKobo: pricing.feeChargedKobo,
      totalPayable: pricing.totalPayable,
      totalPayableKobo: pricing.totalPayableKobo,

      cashbackUsed: pricing.funding.cashbackUsed,
      cashbackApplied: pricing.funding.cashbackApplied,
      cashbackAppliedKobo: pricing.funding.cashbackAppliedKobo,
      walletContribution: pricing.funding.walletContribution,
      walletContributionKobo: pricing.funding.walletContributionKobo,
      isFullyCashbackFunded: pricing.funding.isFullyCashbackFunded,
      fundingSource: pricing.funding.fundingSource,
      fundingBreakdown: {
        originalAmount: pricing.faceAmount,
        originalAmountKobo: pricing.faceAmountKobo,
        feeCharged: pricing.feeCharged,
        feeChargedKobo: pricing.feeChargedKobo,
        totalPayable: pricing.totalPayable,
        totalPayableKobo: pricing.totalPayableKobo,
        cashbackApplied: pricing.funding.cashbackApplied,
        cashbackAppliedKobo: pricing.funding.cashbackAppliedKobo,
        walletContribution: pricing.funding.walletContribution,
        walletContributionKobo: pricing.funding.walletContributionKobo,
        cashbackUsed: pricing.funding.cashbackUsed,
        isFullyCashbackFunded: pricing.funding.isFullyCashbackFunded,
        fundingSource: pricing.funding.fundingSource,
      },

      providerCost: pricing.providerCost,
      providerCostKobo: pricing.providerCostKobo,
      commission: pricing.commission,
      commissionKobo: pricing.commissionKobo,
      commissionRate: pricing.commissionRate,
      commissionSource: pricing.commissionSource,
      grossGain: pricing.grossGain,
      grossGainKobo: pricing.grossGainKobo,
      cashbackExpected: pricing.cashbackGiven,
      cashbackEarned: earnedNaira,
      cashback_amount: earnedNaira,
      cashback_amount_kobo: earnedKobo,
      cashbackSuppressedReason: pricing.cashbackSuppressedReason || null,
      gatewayCost: pricing.gatewayCost,
      gatewayCostKobo: pricing.gatewayCostKobo,
      gatewayCostFlagged: pricing.gatewayCostFlagged,
      gatewayCostSource: pricing.gatewayCostSource,
      netEarning: netNaira,
      netEarningKobo: netKobo,
      profit: netNaira,
      isNegativeNet: netKobo < 0,
      ruleVersion: pricing.ruleVersion,
      pricingTier: pricing.tier,
      pricingTierLabel: pricing.tierLabel,

      earningsBreakdown: {
        faceValue: pricing.faceAmount,
        faceValueKobo: pricing.faceAmountKobo,
        providerCost: pricing.providerCost,
        providerCostKobo: pricing.providerCostKobo,
        commission: pricing.commission,
        commissionKobo: pricing.commissionKobo,
        commissionRate: pricing.commissionRate,
        commissionSource: pricing.commissionSource,
        feeCharged: pricing.feeCharged,
        feeChargedKobo: pricing.feeChargedKobo,
        grossGain: pricing.grossGain,
        grossGainKobo: pricing.grossGainKobo,
        cashbackGiven: earnedNaira,
        cashbackGivenKobo: earnedKobo,
        expectedCashbackGiven: pricing.cashbackGiven,
        cashbackSuppressedReason: pricing.cashbackSuppressedReason || null,
        gatewayCost: pricing.gatewayCost,
        gatewayCostKobo: pricing.gatewayCostKobo,
        gatewayCostFlagged: pricing.gatewayCostFlagged,
        gatewayCostSource: pricing.gatewayCostSource,
        netEarning: netNaira,
        netEarningKobo: netKobo,
        isNegativeNet: netKobo < 0,
        tier: pricing.tier,
        tierLabel: pricing.tierLabel,
        ruleVersion: pricing.ruleVersion,
      },
    };
  }

  /**
   * Atomically verifies live wallet + cashback balances, debits W from walletBalance
   * and C from cashbackBalance, writes a PENDING canonical transaction & spend ledger.
   */
  async function reservePurchaseFundsCore({
    uid,
    requestId,
    category,
    provider,
    faceAmountNaira,
    actualProviderCostNaira = null,
    baseDataCashbackNaira = null,
    useCashback = false,
    config,
    txBaseFields = {},
  }) {
    const userRef = db.collection("users").doc(uid);
    const userTxRef = userRef.collection("Transactions").doc(requestId);
    const cashbackLedgerRef = userRef.collection("cashback_ledger").doc(`spend_${requestId}`);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const isoNow = new Date().toISOString();

    return await db.runTransaction(async (t) => {
      const [userDoc, existingTxDoc] = await Promise.all([
        t.get(userRef),
        t.get(userTxRef),
      ]);

      if (existingTxDoc.exists) {
        return {
          duplicate: true,
          existingTx: existingTxDoc.data(),
        };
      }

      let userData = {};
      if (userDoc.exists) {
        userData = userDoc.data() || {};
      } else {
        throw new Error("User account not found or has zero balance.");
      }

      const walletBalanceKobo =
        userData.walletBalanceKobo !== undefined
          ? Number(userData.walletBalanceKobo || 0)
          : toKobo(userData.walletBalance || 0);
      const cashbackBalanceKobo =
        userData.cashbackBalanceKobo !== undefined
          ? Number(userData.cashbackBalanceKobo || 0)
          : toKobo(userData.cashbackBalance || 0);

      const pricing = computeBillPricingAndEarnings({
        category,
        provider,
        faceAmountNaira,
        actualProviderCostNaira,
        baseDataCashbackNaira,
        useCashback: Boolean(useCashback),
        walletBalanceNaira: toNairaNumber(walletBalanceKobo),
        cashbackBalanceNaira: toNairaNumber(cashbackBalanceKobo),
        config,
      });

      if (!pricing.valid) {
        throw new Error(pricing.error || "Invalid pricing configuration.");
      }

      if (!pricing.funding.canAfford) {
        throw new Error(
          `Insufficient PayWaka wallet balance. Total payable is ₦${pricing.totalPayable.toLocaleString()}` +
            (pricing.funding.cashbackApplied > 0
              ? ` (₦${pricing.funding.cashbackApplied.toLocaleString()} cashback + ₦${pricing.funding.walletContribution.toLocaleString()} wallet)`
              : "") +
            `. Available wallet: ₦${toNairaNumber(walletBalanceKobo).toLocaleString()}.`,
        );
      }

      const W = pricing.funding.walletContributionKobo;
      const C = pricing.funding.cashbackAppliedKobo;

      const balanceUpdates = {
        updatedAt: now,
      };
      if (W > 0) {
        balanceUpdates.walletBalance = admin.firestore.FieldValue.increment(-toNairaNumber(W));
        balanceUpdates.walletBalanceKobo = admin.firestore.FieldValue.increment(-W);
      }
      if (C > 0) {
        balanceUpdates.cashbackBalance = admin.firestore.FieldValue.increment(-toNairaNumber(C));
        balanceUpdates.cashbackBalanceKobo = admin.firestore.FieldValue.increment(-C);
      }
      t.update(userRef, balanceUpdates);

      if (C > 0) {
        t.set(cashbackLedgerRef, {
          entryId: `spend_${requestId}`,
          uid,
          type: "PURCHASE_SPEND",
          direction: "debit",
          amount: pricing.funding.cashbackApplied,
          amountKobo: C,
          requestId,
          tx_ref: requestId,
          category,
          provider,
          faceAmount: pricing.faceAmount,
          totalPayable: pricing.totalPayable,
          status: "RESERVED",
          createdAt: now,
          created_at: isoNow,
        });
      }

      const senderName =
        `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
        userData.userName ||
        "PayWaka User";

      const pricingFields = buildTransactionFieldsFromPricing(pricing, { finalized: false });
      const pendingTxPayload = stripUndefined({
        ...txBaseFields,
        ...pricingFields,
        tx_ref: requestId,
        reference: requestId,
        userId: uid,
        uid,
        senderName,
        category,
        provider: String(provider || ""),
        type: "debit",
        status: "pending",
        cashback_awarded: false,
        refunded: false,
        isP2P: false,
        createdAt: now,
        created_at: isoNow,
        updatedAt: now,
      });

      t.set(userTxRef, pendingTxPayload);
      await writeUpperLevelTransaction(requestId, pendingTxPayload, t);

      return {
        duplicate: false,
        userData,
        pricing,
        pendingTx: pendingTxPayload,
      };
    });
  }

  /**
   * Idempotently finalizes a purchase once ClubKonnect reports ORDER_COMPLETED (200).
   * - Credits cashbackEarned ONLY if walletContribution > 0 (W === 0 => 0 cashback).
   * - Updates earnings with actual vs fallback ClubKonnect commission.
   * - Sweeps ONLY walletContribution (W) from user PSA to merchant account when W > 0.
   */
  async function finalizePurchaseSuccessCore({
    uid,
    requestId,
    category,
    provider,
    ckResult,
    faceAmountNaira,
    baseDataCashbackNaira = null,
    actualCostOverrideNaira = null,
    useCashback = false,
    userDocData = {},
    extraSuccessFields = {},
    serviceSubcollection = null,
    serviceSubdocData = null,
  }) {
    const config = await getBillPricingConfigCore();
    const userRef = db.collection("users").doc(uid);
    const txDocRef = userRef.collection("Transactions").doc(requestId);
    const earnLedgerRef = userRef.collection("cashback_ledger").doc(`earn_${requestId}`);
    const spendLedgerRef = userRef.collection("cashback_ledger").doc(`spend_${requestId}`);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const isoNow = new Date().toISOString();

    const extracted = extractClubKonnectActualCost(ckResult, faceAmountNaira);
    const resolvedActualCost =
      actualCostOverrideNaira !== null && actualCostOverrideNaira !== undefined
        ? Number(actualCostOverrideNaira)
        : extracted.actualProviderCostNaira;

    let walletContributionNaira = 0;
    let finalCashbackEarned = 0;
    let finalPricingObj = null;
    let newlyCompleted = false;

    await db.runTransaction(async (t) => {
      const [txSnap, earnSnap, spendSnap] = await Promise.all([
        t.get(txDocRef),
        t.get(earnLedgerRef),
        t.get(spendLedgerRef),
      ]);

      const existing = txSnap.exists ? txSnap.data() || {} : {};
      const statusLower = String(existing.status || "").toLowerCase();
      if (statusLower === "completed" && existing.finalizedAt) {
        walletContributionNaira = Number(existing.walletContribution ?? faceAmountNaira);
        finalCashbackEarned = Number(existing.cashbackEarned || 0);
        return;
      }

      const resolvedFace = Number(existing.amount || faceAmountNaira || 0);
      const existingAppliedKobo = Number(
        existing.cashbackAppliedKobo ?? toKobo(existing.cashbackApplied || 0),
      );
      const existingWalletKobo = Number(
        existing.walletContributionKobo ?? toKobo(existing.walletContribution ?? resolvedFace),
      );
      const wasUsedCashback = Boolean(existing.cashbackUsed ?? useCashback ?? existingAppliedKobo > 0);

      // Compute pricing first to get tier, commission & baseCashback
      const pricing = computeBillPricingAndEarnings({
        category,
        provider,
        faceAmountNaira: resolvedFace,
        actualProviderCostNaira: resolvedActualCost,
        baseDataCashbackNaira,
        useCashback: wasUsedCashback,
        walletBalanceNaira: toNairaNumber(existingWalletKobo),
        cashbackBalanceNaira: toNairaNumber(existingAppliedKobo),
        config,
      });

      // Preserve exact reserved fee & funding split from pre-debit tx so accounting always balances to the kobo
      if (existing.feeChargedKobo !== undefined) {
        pricing.feeChargedKobo = Number(existing.feeChargedKobo || 0);
        pricing.feeCharged = toNairaNumber(pricing.feeChargedKobo);
        pricing.totalPayableKobo = pricing.faceAmountKobo + pricing.feeChargedKobo;
        pricing.totalPayable = toNairaNumber(pricing.totalPayableKobo);
        pricing.grossGainKobo = pricing.commissionKobo + pricing.feeChargedKobo;
        pricing.grossGain = toNairaNumber(pricing.grossGainKobo);
      }

      pricing.funding = {
        ...pricing.funding,
        totalPayableKobo: pricing.totalPayableKobo,
        totalPayable: pricing.totalPayable,
        cashbackAppliedKobo: existingAppliedKobo,
        cashbackApplied: toNairaNumber(existingAppliedKobo),
        walletContributionKobo: existingWalletKobo,
        walletContribution: toNairaNumber(existingWalletKobo),
        cashbackUsed: existingAppliedKobo > 0,
        isFullyCashbackFunded: existingWalletKobo === 0 && existingAppliedKobo > 0,
        fundingSource:
          existingAppliedKobo === 0
            ? "WALLET_ONLY"
            : existingWalletKobo === 0
              ? "CASHBACK_ONLY"
              : "CASHBACK_AND_WALLET",
      };

      // Enforce full cashback zero-earn rule cleanly with exact reserved W
      if (pricing.funding.isFullyCashbackFunded) {
        pricing.cashbackGivenKobo = 0;
        pricing.cashbackGiven = 0;
        pricing.cashbackSuppressedReason =
          pricing.baseCashbackKobo > 0 ? "FULLY_FUNDED_BY_CASHBACK" : null;
      } else {
        pricing.cashbackGivenKobo = pricing.baseCashbackKobo;
        pricing.cashbackGiven = pricing.baseCashback;
        pricing.cashbackSuppressedReason = null;
      }
      pricing.netEarningKobo =
        pricing.grossGainKobo - pricing.cashbackGivenKobo - pricing.gatewayCostKobo;
      pricing.netEarning = toNairaNumber(pricing.netEarningKobo);
      pricing.isNegativeNet = pricing.netEarningKobo < 0;

      finalPricingObj = pricing;
      walletContributionNaira = pricing.funding.walletContribution;
      finalCashbackEarned = pricing.cashbackGiven;
      newlyCompleted = true;

      const pricingFields = buildTransactionFieldsFromPricing(pricing, { finalized: true });
      const canAwardCashback =
        pricing.cashbackGivenKobo > 0 && !existing.cashback_awarded && !earnSnap.exists;

      if (canAwardCashback) {
        t.update(userRef, {
          cashbackBalance: admin.firestore.FieldValue.increment(pricing.cashbackGiven),
          cashbackBalanceKobo: admin.firestore.FieldValue.increment(pricing.cashbackGivenKobo),
          updatedAt: now,
        });

        t.set(earnLedgerRef, {
          entryId: `earn_${requestId}`,
          uid,
          type: "PURCHASE_EARN",
          direction: "credit",
          amount: pricing.cashbackGiven,
          amountKobo: pricing.cashbackGivenKobo,
          requestId,
          tx_ref: requestId,
          category,
          provider,
          tier: pricing.tier,
          ruleVersion: pricing.ruleVersion,
          status: "CREDITED",
          createdAt: now,
          created_at: isoNow,
        });
      }

      if (spendSnap.exists) {
        t.set(
          spendLedgerRef,
          {
            status: "SETTLED",
            settledAt: now,
          },
          { merge: true },
        );
      }

      const orderId = ckResult?.orderid || ckResult?.order_id || ckResult?.OrderID || existing.orderId || null;
      const completedPayload = stripUndefined({
        ...existing,
        ...extraSuccessFields,
        ...pricingFields,
        orderId,
        status: "completed",
        refunded: false,
        cashback_awarded: Boolean(existing.cashback_awarded || canAwardCashback),
        cashback_awarded_at: canAwardCashback ? now : existing.cashback_awarded_at || null,
        finalizedAt: now,
        updatedAt: now,
        response: ckResult || existing.response,
      });

      t.set(txDocRef, completedPayload, { merge: true });
      await writeUpperLevelTransaction(requestId, completedPayload, t);
    });

    if (newlyCompleted) {
      if (walletContributionNaira > 0) {
        await settleUserPsaToMerchantCore({
          uid,
          requestId,
          category,
          amountNaira: walletContributionNaira,
          userDocData,
        });
        await recordPendingSettlement({
          uid,
          requestId,
          category,
          amount: walletContributionNaira,
          userDocData,
        });
      }

      if (serviceSubcollection && serviceSubdocData) {
        await userRef
          .collection(serviceSubcollection)
          .doc(requestId)
          .set({
            ...serviceSubdocData,
            status: "completed",
            createdAt: now,
          });
      }

      const ptsRes = await awardTransactionPointsCore({
        uid,
        requestId,
        category,
        amount: faceAmountNaira,
      });

      return {
        pointsEarned: ptsRes.pointsEarned || 0,
        cashbackEarned: finalCashbackEarned,
        walletContribution: walletContributionNaira,
        pricing: finalPricingObj,
      };
    }

    return {
      pointsEarned: 0,
      cashbackEarned: finalCashbackEarned,
      walletContribution: walletContributionNaira,
      pricing: finalPricingObj,
    };
  }

  /**
   * Keeps an order in PENDING when ClubKonnect returns ORDER_RECEIVED (100) / ORDER_ONHOLD.
   * Reserves C and W cleanly, does NOT credit earned cashback yet.
   */
  async function keepPurchasePendingCore({ uid, requestId, category, provider, ckResult }) {
    const userRef = db.collection("users").doc(uid);
    const txDocRef = userRef.collection("Transactions").doc(requestId);
    const orderId = ckResult?.orderid || ckResult?.order_id || ckResult?.OrderID || ckResult?.orderId || null;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const isoNow = new Date().toISOString();

    const txSnap = await txDocRef.get();
    const txData = txSnap.exists ? txSnap.data() || {} : {};
    const walletContribution = Number(txData.walletContribution ?? txData.amount ?? 0);

    const pendingPatch = stripUndefined({
      uid,
      userId: uid,
      orderId,
      status: "pending",
      providerStatus: ckResult?.status || ckResult?.orderstatus || "ORDER_RECEIVED",
      providerStatusCode: String(ckResult?.statuscode ?? ckResult?.statusCode ?? ""),
      pendingReason:
        ckResult?.orderremark ||
        ckResult?.remark ||
        "Provider accepted order and is processing fulfillment.",
      response: ckResult,
      updatedAt: now,
    });

    await Promise.all([
      txDocRef.set(pendingPatch, { merge: true }),
      writeUpperLevelTransaction(requestId, pendingPatch),
      db
        .collection("admin_pending_clubkonnect_orders")
        .doc(requestId)
        .set(
          stripUndefined({
            tx_ref: requestId,
            requestId,
            orderId,
            uid,
            category,
            provider,
            faceAmount: txData.amount || 0,
            walletContribution,
            cashbackApplied: txData.cashbackApplied || 0,
            status: "PENDING_PROVIDER_CALLBACK",
            createdAt: now,
            created_at: isoNow,
          }),
          { merge: true },
        ),
    ]);

    return {
      status: "pending",
      tx_ref: requestId,
      orderId,
      walletContribution,
    };
  }

  /**
   * Atomically refunds BOTH walletContribution (+W) and cashbackApplied (+C),
   * and reverses any previously credited cashbackEarned if a completed order is reversed.
   */
  async function refundPurchaseFundsCore({
    uid,
    requestId,
    category,
    ckResult,
    failureReasonStr,
    isReversal = false,
    extraFailedFields = {},
  }) {
    const userRef = db.collection("users").doc(uid);
    const txDocRef = userRef.collection("Transactions").doc(requestId);
    const spendLedgerRef = userRef.collection("cashback_ledger").doc(`spend_${requestId}`);
    const refundLedgerRef = userRef.collection("cashback_ledger").doc(`refund_${requestId}`);
    const reversalLedgerRef = userRef.collection("cashback_ledger").doc(`reversal_${requestId}`);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const isoNow = new Date().toISOString();

    let refundedFaceAmount = 0;

    await db.runTransaction(async (t) => {
      const [userSnap, txSnap, spendSnap, refundSnap, reversalSnap] = await Promise.all([
        t.get(userRef),
        t.get(txDocRef),
        t.get(spendLedgerRef),
        t.get(refundLedgerRef),
        t.get(reversalLedgerRef),
      ]);

      const txData = txSnap.exists ? txSnap.data() || {} : {};
      refundedFaceAmount = Number(txData.amount || 0);

      if (txData.refunded === true || txData.refundedAt) {
        return;
      }

      const userData = userSnap.exists ? userSnap.data() || {} : {};
      const currentCbKobo =
        userData.cashbackBalanceKobo !== undefined
          ? Number(userData.cashbackBalanceKobo || 0)
          : toKobo(userData.cashbackBalance || 0);

      const walletRefundKobo =
        txData.walletContributionKobo !== undefined
          ? Number(txData.walletContributionKobo || 0)
          : toKobo(txData.walletContribution ?? txData.totalPayable ?? txData.amount ?? 0);

      const cashbackRestoreKobo =
        txData.cashbackAppliedKobo !== undefined
          ? Number(txData.cashbackAppliedKobo || 0)
          : toKobo(txData.cashbackApplied || 0);

      const previouslyEarnedCbKobo = txData.cashback_awarded
        ? Number(txData.cashback_amount_kobo ?? toKobo(txData.cashbackEarned || txData.cashback_amount || 0))
        : 0;

      // Net cashback delta = restore spent C minus any earned cashback being clawed back
      const clawbackKobo = Math.min(previouslyEarnedCbKobo, currentCbKobo + cashbackRestoreKobo);
      const netCashbackDeltaKobo = cashbackRestoreKobo - clawbackKobo;

      const userUpdates = { updatedAt: now };
      if (walletRefundKobo > 0) {
        userUpdates.walletBalance = admin.firestore.FieldValue.increment(toNairaNumber(walletRefundKobo));
        userUpdates.walletBalanceKobo = admin.firestore.FieldValue.increment(walletRefundKobo);
      }
      if (netCashbackDeltaKobo !== 0) {
        userUpdates.cashbackBalance = admin.firestore.FieldValue.increment(toNairaNumber(netCashbackDeltaKobo));
        userUpdates.cashbackBalanceKobo = admin.firestore.FieldValue.increment(netCashbackDeltaKobo);
      }
      t.set(userRef, userUpdates, { merge: true });

      if (cashbackRestoreKobo > 0 && !refundSnap.exists) {
        t.set(refundLedgerRef, {
          entryId: `refund_${requestId}`,
          uid,
          type: "PURCHASE_REFUND_RESTORE",
          direction: "credit",
          amount: toNairaNumber(cashbackRestoreKobo),
          amountKobo: cashbackRestoreKobo,
          requestId,
          tx_ref: requestId,
          category,
          status: "CREDITED",
          createdAt: now,
          created_at: isoNow,
        });
      }

      if (spendSnap.exists) {
        t.set(
          spendLedgerRef,
          {
            status: "REFUNDED",
            refundedAt: now,
          },
          { merge: true },
        );
      }

      if (previouslyEarnedCbKobo > 0 && !reversalSnap.exists) {
        t.set(reversalLedgerRef, {
          entryId: `reversal_${requestId}`,
          uid,
          type: "PURCHASE_REVERSAL_CLAWBACK",
          direction: "debit",
          amount: toNairaNumber(clawbackKobo),
          amountKobo: clawbackKobo,
          expectedClawback: toNairaNumber(previouslyEarnedCbKobo),
          unrecoveredClawback: toNairaNumber(Math.max(0, previouslyEarnedCbKobo - clawbackKobo)),
          requestId,
          tx_ref: requestId,
          category,
          status: "REVERSED",
          createdAt: now,
          created_at: isoNow,
        });
      }

      const failedPayload = stripUndefined({
        ...txData,
        ...extraFailedFields,
        status: isReversal ? "reversed" : "failed",
        refunded: true,
        refundedAt: now,
        failureReason: failureReasonStr,
        cashbackEarned: 0,
        cashback_amount: 0,
        cashback_amount_kobo: 0,
        providerCost: 0,
        providerCostKobo: 0,
        commission: 0,
        commissionKobo: 0,
        grossGain: 0,
        grossGainKobo: 0,
        netEarning: 0,
        netEarningKobo: 0,
        isNegativeNet: false,
        earningsBreakdown: {
          ...(txData.earningsBreakdown || {}),
          providerCost: 0,
          providerCostKobo: 0,
          commission: 0,
          commissionKobo: 0,
          feeCharged: 0,
          feeChargedKobo: 0,
          grossGain: 0,
          grossGainKobo: 0,
          cashbackGiven: 0,
          cashbackGivenKobo: 0,
          netEarning: 0,
          netEarningKobo: 0,
          reversed: true,
        },
        response: ckResult || txData.response,
        updatedAt: now,
      });

      t.set(txDocRef, failedPayload, { merge: true });
      await writeUpperLevelTransaction(requestId, failedPayload, t);
    });

    await cancelPendingSettlement(requestId, failureReasonStr);
    await db
      .collection("admin_pending_clubkonnect_orders")
      .doc(requestId)
      .set({ status: "FAILED_REFUNDED", updatedAt: now }, { merge: true })
      .catch(() => {});

    await db.collection("system_failed_payouts").doc(requestId).set({
      tx_ref: requestId,
      uid,
      category,
      amount: refundedFaceAmount,
      reason: failureReasonStr,
      providerResponse: ckResult || null,
      createdAt: now,
      created_at: isoNow,
      resolved: false,
    });
  }

  /**
   * Reconciles a PENDING (or callback-notified) ClubKonnect order by re-querying APIQueryV1.asp.
   * Never trusts unsigned inbound callback params directly — verifies against ClubKonnect first.
   */
  async function reconcileClubKonnectOrderCore({ requestId = "", orderId = "" }) {
    let txSnap = null;
    if (requestId) {
      txSnap = await db.collection("Transactions").doc(String(requestId).trim()).get();
    }
    if ((!txSnap || !txSnap.exists) && orderId) {
      const q = await db
        .collection("Transactions")
        .where("orderId", "==", String(orderId).trim())
        .limit(1)
        .get();
      if (!q.empty) {
        txSnap = q.docs[0];
      }
    }

    if (!txSnap || !txSnap.exists) {
      return { status: "not_found", message: "Transaction not found for callback/verification." };
    }

    const txData = txSnap.data() || {};
    const resolvedReqId = txData.tx_ref || txData.reference || txSnap.id;
    const resolvedOrderId = orderId || txData.orderId || "";
    const uid = txData.uid || txData.userId;

    // Also pass expected category/meterType context so Prepaid Electricity token guards work during reconciliation
    const verifyRes = await verifyClubKonnectOrderStatus(resolvedReqId, resolvedOrderId, {
      category: txData.category || "",
      meterType: txData.meterType === "Postpaid" ? "02" : "01",
    });
    if (!verifyRes.checked || !verifyRes.data) {
      return {
        status: "pending",
        tx_ref: resolvedReqId,
        message: "Unable to confirm final status with ClubKonnect yet.",
      };
    }

    const ckData = verifyRes.data;
    const category = txData.category || "Utility";
    const meterType = txData.meterType === "Postpaid" ? "02" : "01";
    const provider =
      txData.company || txData.cableTV || txData.network || txData.provider || "";

    if (verifyRes.isSuccess) {
      let userData = {};
      if (uid) {
        const uSnap = await db.collection("users").doc(uid).get();
        userData = uSnap.exists ? uSnap.data() || {} : {};
      }

      let baseDataCashbackNaira = null;
      let actualCostOverrideNaira = null;
      if (String(category).toLowerCase() === "data" && getPricingConfigCore && calculatePlanPricing) {
        const netUpper = String(txData.network || "MTN").toUpperCase();
        const planDocSnap = await db
          .collection("data_plan_pricing")
          .doc(`${netUpper}_${String(txData.planCode || "").trim()}`)
          .get();
        if (planDocSnap.exists) {
          const pData = planDocSnap.data() || {};
          const cfg = await getPricingConfigCore();
          const pRes = calculatePlanPricing(
            pData.costPrice,
            netUpper,
            pData.competitorPrice,
            pData.customDisplayPrice,
            pData.overrideMode,
            cfg,
          );
          actualCostOverrideNaira = pData.costPrice;
          baseDataCashbackNaira = Number(pRes.cashbackAmount || 0);
        }
      }

      const rawToken =
        ckData?.metertoken || ckData?.MeterToken || ckData?.token || ckData?.pin || "";
      const validElecToken =
        rawToken && rawToken !== "000123" ? rawToken : txData.tokenPin || txData.token || "";
      const extraSuccessFields = String(category).toLowerCase().includes("elect")
        ? {
            token: validElecToken,
            tokenPin: validElecToken,
            units: ckData?.units || ckData?.Units || txData.units || "",
          }
        : {};

      const fin = await finalizePurchaseSuccessCore({
        uid,
        requestId: resolvedReqId,
        category,
        provider,
        ckResult: ckData,
        faceAmountNaira: Number(txData.amount || 0),
        baseDataCashbackNaira,
        actualCostOverrideNaira,
        useCashback: Boolean(txData.cashbackUsed),
        userDocData: userData,
        extraSuccessFields,
      });

      await db
        .collection("admin_pending_clubkonnect_orders")
        .doc(resolvedReqId)
        .set({ status: "COMPLETED", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
        .catch(() => {});

      return {
        status: "completed",
        tx_ref: resolvedReqId,
        cashbackEarned: fin.cashbackEarned,
        pointsEarned: fin.pointsEarned,
      };
    }

    if (verifyRes.isPending) {
      return {
        status: "pending",
        tx_ref: resolvedReqId,
        providerStatus: ckData.status || ckData.orderstatus || "ORDER_RECEIVED",
        providerStatusCode: String(ckData.statuscode ?? ckData.statusCode ?? ""),
        message: "Order is still processing on provider network.",
      };
    }

    if (verifyRes.needsCancel && typeof cancelClubKonnectOrder === "function") {
      await cancelClubKonnectOrder(resolvedReqId, resolvedOrderId || ckData?.orderid || null).catch(() => null);
    }

    // Confirmed failure or reversal
    const wasCompleted = String(txData.status || "").toLowerCase() === "completed";
    await refundPurchaseFundsCore({
      uid,
      requestId: resolvedReqId,
      category,
      ckResult: ckData,
      failureReasonStr:
        verifyRes.reason ||
        ckData.remark ||
        ckData.orderremark ||
        ckData.description ||
        ckData.status ||
        "Order failed on provider",
      isReversal: wasCompleted,
    });

    return {
      status: wasCompleted ? "reversed" : "failed",
      refunded: true,
      tx_ref: resolvedReqId,
    };
  }

  /**
   * Cashback-to-Wallet Transfer (>= ₦1,000 threshold, Option 1A):
   * - Atomically moves whole-Naira cashback from cashbackBalance to walletBalance.
   * - Funds the user's Barter/PSA wallet from PayWaka's Merchant Flutterwave account
   *   at ₦0 fee so `fetchBalance` & external bank withdrawals remain 1:1 backed.
   */
  async function transferCashbackToWalletCore({ uid, requestedAmountNaira = null, pin }) {
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    await verifyUserPinCore(uid, pin);
    const config = await getBillPricingConfigCore();
    const minNaira = Number(config.minCashbackTransferNaira || 1000);
    const minKobo = toKobo(minNaira);

    const userRef = db.collection("users").doc(uid);
    const txRef = generatePaywakaRef("cashback");
    const userTxRef = userRef.collection("Transactions").doc(txRef);
    const ledgerRef = userRef.collection("cashback_ledger").doc(txRef);
    const refDoc = db.collection("transfer_references").doc(txRef);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const isoNow = new Date().toISOString();

    let userData = {};
    let transferKobo = 0;
    let transferNaira = 0;

    await db.runTransaction(async (t) => {
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError("not-found", "User account not found.");
      }
      userData = userSnap.data() || {};
      const cbKobo =
        userData.cashbackBalanceKobo !== undefined
          ? Number(userData.cashbackBalanceKobo || 0)
          : toKobo(userData.cashbackBalance || 0);

      if (cbKobo < minKobo) {
        throw new HttpsError(
          "failed-precondition",
          `You need at least ₦${minNaira.toLocaleString()} in Cashback to transfer to your Main Wallet. Current cashback: ₦${toNairaNumber(cbKobo).toLocaleString()}.`,
        );
      }

      if (
        requestedAmountNaira !== null &&
        requestedAmountNaira !== undefined &&
        requestedAmountNaira !== ""
      ) {
        transferKobo = toKobo(requestedAmountNaira);
        assertWholeNairaKobo(transferKobo);
        if (transferKobo < minKobo) {
          throw new HttpsError(
            "invalid-argument",
            `Minimum cashback transfer is ₦${minNaira.toLocaleString()}.`,
          );
        }
        if (transferKobo > cbKobo) {
          throw new HttpsError(
            "failed-precondition",
            `Requested transfer exceeds your cashback balance of ₦${toNairaNumber(cbKobo).toLocaleString()}.`,
          );
        }
      } else {
        transferKobo = floorToWholeNairaKobo(cbKobo);
      }

      transferNaira = toNairaNumber(transferKobo);

      t.update(userRef, {
        cashbackBalance: admin.firestore.FieldValue.increment(-transferNaira),
        cashbackBalanceKobo: admin.firestore.FieldValue.increment(-transferKobo),
        walletBalance: admin.firestore.FieldValue.increment(transferNaira),
        walletBalanceKobo: admin.firestore.FieldValue.increment(transferKobo),
        updatedAt: now,
      });

      t.set(refDoc, {
        reference: txRef,
        tx_ref: txRef,
        type: "CASHBACK_TO_WALLET",
        uid,
        amount: transferNaira,
        amountKobo: transferKobo,
        status: "INITIATED",
        createdAt: now,
      });

      t.set(ledgerRef, {
        entryId: txRef,
        uid,
        type: "TRANSFER_TO_WALLET",
        direction: "debit",
        amount: transferNaira,
        amountKobo: transferKobo,
        tx_ref: txRef,
        status: "PROCESSING",
        createdAt: now,
        created_at: isoNow,
      });
    });

    // Fund the user's Barter/PSA subaccount from PayWaka's Merchant Account (Option 1A — never simulated)
    let flwResponse = null;

    try {
      if (!userData.barter_id) {
        throw new Error(
          "Your PayWaka Barter wallet ID (barter_id) is missing. Please complete wallet setup before transferring cashback.",
        );
      }

      const transferPayload = {
        account_bank: "flutterwave",
        account_number: userData.barter_id,
        amount: transferNaira,
        currency: "NGN",
        debit_currency: "NGN",
        narration: `PayWaka Cashback Vault Transfer - ${txRef}`,
        reference: txRef,
      };

      if (typeof executeFlutterwaveTransferFn === "function") {
        flwResponse = await executeFlutterwaveTransferFn(transferPayload);
      } else {
        const flwSecKey = FLW_SECRET_KEY.value();
        const res = await fetch("https://api.flutterwave.com/v3/transfers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${flwSecKey}`,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(transferPayload),
        });
        flwResponse = await res.json();
      }

      const ok =
        flwResponse?.status === "success" ||
        flwResponse?.data?.status === "NEW" ||
        flwResponse?.data?.status === "PENDING" ||
        flwResponse?.data?.status === "SUCCESSFUL";

      if (!ok) {
        throw new Error(flwResponse?.message || "Merchant-to-User PSA transfer failed.");
      }
    } catch (flwErr) {
      logger.error(`❌ Cashback-to-wallet PSA funding failed for ${txRef}:`, flwErr);
      // Roll back Firestore transfer cleanly so user cashback is preserved
      await db.runTransaction(async (t) => {
        t.update(userRef, {
          cashbackBalance: admin.firestore.FieldValue.increment(transferNaira),
          cashbackBalanceKobo: admin.firestore.FieldValue.increment(transferKobo),
          walletBalance: admin.firestore.FieldValue.increment(-transferNaira),
          walletBalanceKobo: admin.firestore.FieldValue.increment(-transferKobo),
          updatedAt: now,
        });
        t.set(refDoc, { status: "FAILED", error: flwErr.message, updatedAt: now }, { merge: true });
        t.set(ledgerRef, { status: "FAILED_ROLLED_BACK", error: flwErr.message, updatedAt: now }, { merge: true });
      });
      throw new HttpsError(
        "internal",
        `Unable to settle cashback to wallet right now: ${flwErr.message}. Your cashback balance was preserved.`,
      );
    }

    const userFullName =
      `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
      userData.userName ||
      "PayWaka User";

    const internalTxPayload = stripUndefined({
      tx_ref: txRef,
      reference: txRef,
      userId: uid,
      uid,
      recipientUid: uid,
      senderName: "PayWaka Cashback Vault",
      recipientName: userFullName,
      recipientBarterId: userData.barter_id || "",
      recipientAccountNumber: userData.accountNumber || "",
      recipientBankName: userData.bankName || "PayWaka Wallet",
      title: "Cashback Transfer to Main Wallet",
      narration: `Cashback Vault Transfer | ${txRef}`,
      category: "Cashback Transfer",
      transactionType: "cashback_transfer",
      type: "inflow",
      isInternalTransfer: true,
      isP2P: false,
      amount: transferNaira,
      amountKobo: transferKobo,
      fee: 0,
      feeKobo: 0,
      status: "SUCCESSFUL",
      merchantId: getFlutterwaveMerchantId(),
      providerResponse: flwResponse,
      createdAt: now,
      created_at: isoNow,
      updatedAt: now,
    });

    await Promise.all([
      refDoc.set({ status: "SUCCESSFUL", updatedAt: now }, { merge: true }),
      ledgerRef.set({ status: "COMPLETED", updatedAt: now }, { merge: true }),
      userTxRef.set(internalTxPayload),
      writeUpperLevelTransaction(txRef, internalTxPayload),
    ]);

    return {
      status: "success",
      tx_ref: txRef,
      transferredAmount: transferNaira,
      message: `₦${transferNaira.toLocaleString()} moved from your Cashback Vault to your Main Wallet!`,
    };
  }

  /**
   * Builds complete Admin Dashboard financial summary, transaction rows with
   * full earnings/cashback breakdown, user liability totals, and audit logs.
   */
  async function adminGetDashboardDataCore() {
    const [usersSnap, txSnap, plansSnap, auditSnap, billCfg] = await Promise.all([
      db.collection("users").get(),
      db.collection("Transactions").orderBy("createdAt", "desc").limit(500).get().catch(async () => {
        return await db.collection("Transactions").limit(500).get();
      }),
      db.collection("data_plan_pricing").get(),
      db.collection("admin_audit_logs").limit(100).get().catch(() => ({ docs: [] })),
      getBillPricingConfigCore(),
    ]);

    const users = [];
    const userMap = new Map();
    let totalUserCashbackLiabilityKobo = 0;
    let totalWalletFloatKobo = 0;

    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() || {};
      const fullName =
        `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
        u.fullName ||
        u.userName ||
        u.email ||
        "PayWaka User";
      const walletBal = Number(u.walletBalance || 0);
      const cbBal = Number(u.cashbackBalance || 0);
      totalWalletFloatKobo += u.walletBalanceKobo !== undefined ? Number(u.walletBalanceKobo || 0) : toKobo(walletBal);
      totalUserCashbackLiabilityKobo += u.cashbackBalanceKobo !== undefined ? Number(u.cashbackBalanceKobo || 0) : toKobo(cbBal);

      let joinedStr = "—";
      if (u.createdAt?.toDate) {
        joinedStr = u.createdAt.toDate().toLocaleDateString("en-NG");
      } else if (u.created_at) {
        joinedStr = new Date(u.created_at).toLocaleDateString("en-NG");
      }

      const formattedUser = {
        id: docSnap.id,
        name: fullName,
        email: u.email || u.userEmail || "—",
        phone: u.phoneNumber || u.userPhone || u.phone || "—",
        role: u.isAdmin || u.role === "admin" ? "Admin" : u.vendorId ? "Merchant" : "Customer",
        isAdmin: Boolean(u.isAdmin || u.role === "admin"),
        kycTier: u.kycTier || (u.bvnVerified ? "Tier 2" : "Tier 1"),
        walletBalance: walletBal,
        cashbackBalance: cbBal,
        accountNumber: u.accountNumber || "—",
        bankName: u.bankName || "Wema Bank",
        joined: joinedStr,
        status: u.status || "Active",
      };
      users.push(formattedUser);
      userMap.set(docSnap.id, formattedUser);
    });

    let todayTransactions = 0;
    let successfulPayments = 0;
    let totalVolumeKobo = 0;
    let totalFeesCollectedKobo = 0;
    let totalCommissionKobo = 0;
    let totalProviderCostKobo = 0;
    let totalCashbackGivenKobo = 0;
    let totalCashbackSpentInAppKobo = 0;
    let totalCashbackTransferredToWalletKobo = 0;
    let totalGatewayCostKobo = 0;
    let totalGrossGainKobo = 0;
    let totalNetEarningKobo = 0;
    let actualCommissionCount = 0;
    let fallbackCommissionCount = 0;
    let negativeNetCount = 0;

    const todayKey = new Date().toISOString().slice(0, 10);
    const transactions = [];

    txSnap.forEach((docSnap) => {
      const tx = docSnap.data() || {};
      const uid = tx.uid || tx.userId || tx.senderUid;
      const userObj = userMap.get(uid) || {};
      const rawStatus = String(tx.status || "").toLowerCase();
      const isSuccess = rawStatus === "completed" || rawStatus === "successful";
      const isRefunded = Boolean(tx.refunded || rawStatus === "refunded" || rawStatus === "reversed");

      let timeMillis = Date.now();
      let timeStr = "Recently";
      let isoDate = "";
      if (tx.createdAt?.toDate) {
        const dt = tx.createdAt.toDate();
        timeMillis = dt.getTime();
        timeStr = dt.toLocaleString("en-NG");
        isoDate = dt.toISOString();
      } else if (tx.created_at) {
        const dt = new Date(tx.created_at);
        if (!isNaN(dt.getTime())) {
          timeMillis = dt.getTime();
          timeStr = dt.toLocaleString("en-NG");
          isoDate = dt.toISOString();
        }
      }
      if (isoDate.slice(0, 10) === todayKey) todayTransactions++;

      const faceValue = Number(tx.amount || 0);
      const faceKobo = tx.amountKobo !== undefined ? Number(tx.amountKobo || 0) : toKobo(faceValue);
      const categoryStr = String(tx.category || tx.billType || "Transaction");
      const catLower = categoryStr.toLowerCase();
      const isBillOrVtu =
        catLower.includes("data") ||
        catLower.includes("airtime") ||
        catLower.includes("elect") ||
        catLower.includes("cable") ||
        catLower.includes("tv");

      const eb = tx.earningsBreakdown || {};
      const providerCost = Number(
        tx.providerCost ?? eb.providerCost ?? tx.costPrice ?? (isBillOrVtu ? faceValue : 0),
      );
      const providerCostKobo =
        tx.providerCostKobo ?? eb.providerCostKobo ?? toKobo(providerCost);
      const feeCharged = Number(tx.feeCharged ?? eb.feeCharged ?? tx.fee ?? 0);
      const feeChargedKobo = tx.feeChargedKobo ?? eb.feeChargedKobo ?? toKobo(feeCharged);

      const commission = Number(
        tx.commission ??
          eb.commission ??
          (catLower.includes("data") && tx.costPrice ? faceValue - Number(tx.costPrice) : 0),
      );
      const commissionKobo = tx.commissionKobo ?? eb.commissionKobo ?? toKobo(commission);
      const commissionSource = tx.commissionSource || eb.commissionSource || (isBillOrVtu ? "fallback" : "n/a");

      const cashbackGiven = Number(tx.cashbackEarned ?? eb.cashbackGiven ?? tx.cashback_amount ?? 0);
      const cashbackGivenKobo = tx.cashback_amount_kobo ?? eb.cashbackGivenKobo ?? toKobo(cashbackGiven);

      const cashbackApplied = Number(tx.cashbackApplied ?? tx.fundingBreakdown?.cashbackApplied ?? 0);
      const cashbackAppliedKobo = tx.cashbackAppliedKobo ?? tx.fundingBreakdown?.cashbackAppliedKobo ?? toKobo(cashbackApplied);
      const walletContribution = Number(
        tx.walletContribution ?? tx.fundingBreakdown?.walletContribution ?? faceValue,
      );

      const gatewayCost = Number(tx.gatewayCost ?? eb.gatewayCost ?? 0);
      const gatewayCostKobo = tx.gatewayCostKobo ?? eb.gatewayCostKobo ?? toKobo(gatewayCost);

      const grossGainKobo =
        tx.grossGainKobo !== undefined
          ? Number(tx.grossGainKobo || 0)
          : commissionKobo + feeChargedKobo;
      const grossGain = toNairaNumber(grossGainKobo);

      const netEarningKobo =
        tx.netEarningKobo !== undefined
          ? Number(tx.netEarningKobo || 0)
          : tx.profit !== undefined && !isBillOrVtu
            ? toKobo(tx.profit)
            : grossGainKobo - cashbackGivenKobo - gatewayCostKobo;
      const netEarning = toNairaNumber(netEarningKobo);
      const isNegativeNet = Boolean(tx.isNegativeNet ?? (isSuccess && netEarningKobo < 0));

      if (isSuccess) {
        successfulPayments++;
        if (catLower.includes("cashback transfer") || tx.transactionType === "cashback_transfer") {
          totalCashbackTransferredToWalletKobo += faceKobo;
        } else {
          totalVolumeKobo += faceKobo;
        }

        if (isBillOrVtu) {
          totalProviderCostKobo += providerCostKobo;
          totalCommissionKobo += commissionKobo;
          totalFeesCollectedKobo += feeChargedKobo;
          totalCashbackGivenKobo += cashbackGivenKobo;
          totalCashbackSpentInAppKobo += cashbackAppliedKobo;
          totalGatewayCostKobo += gatewayCostKobo;
          totalGrossGainKobo += grossGainKobo;
          totalNetEarningKobo += netEarningKobo;
          if (commissionSource === "actual") actualCommissionCount++;
          else fallbackCommissionCount++;
          if (isNegativeNet) negativeNetCount++;
        }
      }

      const displayStatus = isSuccess
        ? "Success"
        : isRefunded
          ? "Refunded"
          : rawStatus === "pending"
            ? "Pending"
            : "Failed";

      transactions.push({
        id: tx.tx_ref || docSnap.id,
        reference: tx.tx_ref || tx.reference || docSnap.id,
        uid: uid || "",
        name: tx.senderName || userObj.name || "PayWaka User",
        email: userObj.email || "—",
        service: categoryStr,
        provider: tx.network || tx.company || tx.cableTV || tx.bankName || tx.recipientBankName || "PayWaka",
        amount: `₦${faceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        rawAmount: faceValue,
        faceValue,
        providerCost,
        commission,
        commissionSource,
        feeCharged,
        cashbackGiven,
        cashbackApplied,
        walletContribution,
        fundingSource: tx.fundingSource || (cashbackApplied > 0 ? (walletContribution === 0 ? "CASHBACK_ONLY" : "CASHBACK_AND_WALLET") : "WALLET_ONLY"),
        gatewayCost,
        gatewayCostFlagged: Boolean(tx.gatewayCostFlagged ?? eb.gatewayCostFlagged),
        grossGain,
        netEarning,
        rawGain: isSuccess ? netEarning : 0,
        gain: `₦${(isSuccess ? netEarning : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        isNegativeNet,
        ruleVersion: tx.ruleVersion || eb.ruleVersion || "—",
        status: displayStatus,
        time: timeStr,
        timeMillis,
        isoDate,
        isBillOrVtu,
      });
    });

    transactions.sort((a, b) => b.timeMillis - a.timeMillis);

    const auditLogs = [];
    (auditSnap.docs || []).forEach((d) => {
      const log = d.data() || {};
      auditLogs.push({
        id: d.id,
        actor: log.actor || log.adminEmail || "Admin",
        role: log.role || "Super Admin",
        category: log.category || "Pricing",
        event: log.event || log.summary || JSON.stringify(log),
        time: log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString("en-NG") : log.created_at || "Recent",
        ip: log.ip || "Cloud Function",
      });
    });

    return {
      status: "success",
      summary: {
        totalUsers: users.length,
        totalTransactions: transactions.length,
        todayTransactions,
        successfulPayments,
        managedPlansCount: plansSnap.size,
        totalVolume: toNairaNumber(totalVolumeKobo),
        totalFaceValue: toNairaNumber(totalVolumeKobo),
        netPlatformMargin: toNairaNumber(totalNetEarningKobo),
        totalNetEarning: toNairaNumber(totalNetEarningKobo),
        totalGrossGain: toNairaNumber(totalGrossGainKobo),
        totalFeesCollected: toNairaNumber(totalFeesCollectedKobo),
        totalCommission: toNairaNumber(totalCommissionKobo),
        clubkonnectReconciliationTotal: toNairaNumber(totalProviderCostKobo),
        totalCashbackGiven: toNairaNumber(totalCashbackGivenKobo),
        totalCashbackSpentInApp: toNairaNumber(totalCashbackSpentInAppKobo),
        totalCashbackTransferredToWallet: toNairaNumber(totalCashbackTransferredToWalletKobo),
        totalGatewayCost: toNairaNumber(totalGatewayCostKobo),
        totalUserCashbackLiability: toNairaNumber(totalUserCashbackLiabilityKobo),
        totalWalletFloat: toNairaNumber(totalWalletFloatKobo),
        actualCommissionCount,
        fallbackCommissionCount,
        negativeNetCount,
      },
      transactions,
      users,
      auditLogs,
      billPricingConfig: billCfg,
    };
  }

  async function adminUpdateBillPricingConfigCore({ adminUid, updates = {} }) {
    const current = await getBillPricingConfigCore(true);
    const merged = mergeBillPricingConfig({
      ...current,
      ...updates,
    });

    // Bump minor version automatically (e.g. v1.0.0 -> v1.0.1) unless caller specifies ruleVersion
    let nextVersion = merged.ruleVersion;
    if (!updates.ruleVersion || updates.ruleVersion === current.ruleVersion) {
      const m = String(current.ruleVersion || "v1.0.0").match(/^v(\d+)\.(\d+)\.(\d+)$/);
      if (m) {
        nextVersion = `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
      } else {
        nextVersion = `v1.0.${Date.now().toString().slice(-4)}`;
      }
    }
    merged.ruleVersion = nextVersion;

    const now = admin.firestore.FieldValue.serverTimestamp();
    const isoNow = new Date().toISOString();

    await Promise.all([
      db.collection("system_settings").doc("bill_pricing_config").set({
        ...merged,
        updatedBy: adminUid,
        updatedAt: now,
        updated_at: isoNow,
      }),
      db.collection("pricing_change_logs").add({
        adminUid,
        previousVersion: current.ruleVersion,
        newVersion: nextVersion,
        previousConfig: current,
        newConfig: merged,
        createdAt: now,
        created_at: isoNow,
      }),
      db.collection("admin_audit_logs").add({
        actor: adminUid,
        role: "Admin",
        category: "Pricing",
        event: `Updated bill pricing & cashback config (${current.ruleVersion} -> ${nextVersion})`,
        createdAt: now,
        created_at: isoNow,
      }),
    ]);

    cachedBillConfig = merged;
    cachedBillConfigAt = Date.now();
    return { status: "success", config: merged, ruleVersion: nextVersion };
  }

  return {
    getBillPricingConfigCore,
    reservePurchaseFundsCore,
    finalizePurchaseSuccessCore,
    keepPurchasePendingCore,
    refundPurchaseFundsCore,
    reconcileClubKonnectOrderCore,
    transferCashbackToWalletCore,
    adminGetDashboardDataCore,
    adminUpdateBillPricingConfigCore,
  };
}

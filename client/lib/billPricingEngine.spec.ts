import { describe, expect, it } from "vitest";
import {
  computeBillPricingAndEarnings,
  computeCashbackFundingSplit,
  DEFAULT_BILL_PRICING_CONFIG,
  floorToWholeNairaKobo,
  toKobo,
} from "@shared/billPricingEngine";

describe("PayWaka Bill Pricing, Cashback & Earnings Engine", () => {
  describe("Electricity Tiers (Fallback 0.5% Commission)", () => {
    it("computes Tier A for ₦2,000 electricity (fee ₦50, cashback ₦20, net +₦40)", () => {
      const res = computeBillPricingAndEarnings({
        category: "electricity",
        provider: "IKEDC",
        faceAmountNaira: 2000,
        walletBalanceNaira: 5000,
      });
      expect(res.valid).toBe(true);
      expect(res.tier).toBe("tierA");
      expect(res.feeCharged).toBe(50);
      expect(res.totalPayable).toBe(2050);
      expect(res.commission).toBe(10);
      expect(res.commissionSource).toBe("fallback");
      expect(res.grossGain).toBe(60);
      expect(res.cashbackGiven).toBe(20);
      expect(res.netEarning).toBe(40);
      expect(res.isNegativeNet).toBe(false);
    });

    it("computes Tier A for ₦5,000 electricity (fee ₦50, cashback ₦20, net +₦55)", () => {
      const res = computeBillPricingAndEarnings({
        category: "electricity",
        provider: "IKEDC",
        faceAmountNaira: 5000,
        walletBalanceNaira: 10000,
      });
      expect(res.tier).toBe("tierA");
      expect(res.feeCharged).toBe(50);
      expect(res.totalPayable).toBe(5050);
      expect(res.commission).toBe(25);
      expect(res.grossGain).toBe(75);
      expect(res.cashbackGiven).toBe(20);
      expect(res.netEarning).toBe(55);
    });

    it("handles boundary transition ₦5,999 (Tier A) vs ₦6,000 (Tier B)", () => {
      const tierAEdge = computeBillPricingAndEarnings({
        category: "electricity",
        faceAmountNaira: 5999,
        walletBalanceNaira: 10000,
      });
      const tierBEdge = computeBillPricingAndEarnings({
        category: "electricity",
        faceAmountNaira: 6000,
        walletBalanceNaira: 10000,
      });
      expect(tierAEdge.tier).toBe("tierA");
      expect(tierAEdge.feeCharged).toBe(50);
      expect(tierAEdge.cashbackGiven).toBe(20);

      expect(tierBEdge.tier).toBe("tierB");
      expect(tierBEdge.feeCharged).toBe(30);
      expect(tierBEdge.totalPayable).toBe(6030);
      expect(tierBEdge.commission).toBe(30);
      expect(tierBEdge.grossGain).toBe(60);
      expect(tierBEdge.cashbackGiven).toBe(40);
      expect(tierBEdge.netEarning).toBe(20);
    });

    it("computes Tier B for ₦9,000 electricity (fee ₦30, cashback ₦40, net +₦35)", () => {
      const res = computeBillPricingAndEarnings({
        category: "electricity",
        faceAmountNaira: 9000,
        walletBalanceNaira: 20000,
      });
      expect(res.tier).toBe("tierB");
      expect(res.feeCharged).toBe(30);
      expect(res.commission).toBe(45);
      expect(res.grossGain).toBe(75);
      expect(res.cashbackGiven).toBe(40);
      expect(res.netEarning).toBe(35);
    });

    it("handles boundary transition ₦9,999 (Tier B) vs ₦10,000 (Tier C)", () => {
      const tierBEdge = computeBillPricingAndEarnings({
        category: "electricity",
        faceAmountNaira: 9999,
        walletBalanceNaira: 20000,
      });
      const tierCEdge = computeBillPricingAndEarnings({
        category: "electricity",
        faceAmountNaira: 10000,
        walletBalanceNaira: 20000,
      });
      expect(tierBEdge.tier).toBe("tierB");
      expect(tierBEdge.feeCharged).toBe(30);
      expect(tierBEdge.cashbackGiven).toBe(40);

      expect(tierCEdge.tier).toBe("tierC");
      expect(tierCEdge.feeCharged).toBe(30);
      expect(tierCEdge.totalPayable).toBe(10030);
      expect(tierCEdge.commission).toBe(50);
      expect(tierCEdge.grossGain).toBe(80);
      expect(tierCEdge.cashbackGiven).toBe(40);
      expect(tierCEdge.netEarning).toBe(40);
    });

    it("computes Tier C for ₦20,000 electricity (fee ₦30, cashback ₦65, net +₦65)", () => {
      const res = computeBillPricingAndEarnings({
        category: "electricity",
        faceAmountNaira: 20000,
        walletBalanceNaira: 30000,
      });
      expect(res.tier).toBe("tierC");
      expect(res.feeCharged).toBe(30);
      expect(res.commission).toBe(100);
      expect(res.grossGain).toBe(130);
      expect(res.cashbackGiven).toBe(65);
      expect(res.netEarning).toBe(65);
    });

    it("rejects electricity amounts below ₦1,000", () => {
      const res = computeBillPricingAndEarnings({
        category: "electricity",
        faceAmountNaira: 999,
        walletBalanceNaira: 5000,
      });
      expect(res.valid).toBe(false);
    });
  });

  describe("Cable TV Pricing & Whole-Naira Flooring", () => {
    it("computes GOtv ₦6,000 (fee ₦0, comm ₦60, cashback ₦30, net +₦30)", () => {
      const res = computeBillPricingAndEarnings({
        category: "cable",
        provider: "GOTV",
        faceAmountNaira: 6000,
        walletBalanceNaira: 10000,
      });
      expect(res.feeCharged).toBe(0);
      expect(res.totalPayable).toBe(6000);
      expect(res.commission).toBe(60);
      expect(res.cashbackGiven).toBe(30);
      expect(res.netEarning).toBe(30);
    });

    it("floors odd cashback to whole Naira on DStv ₦44,500 (comm ₦445 -> ⌊₦222.50⌋ = ₦222, net +₦223)", () => {
      const res = computeBillPricingAndEarnings({
        category: "cable",
        provider: "DSTV",
        faceAmountNaira: 44500,
        walletBalanceNaira: 50000,
      });
      expect(res.feeCharged).toBe(0);
      expect(res.commission).toBe(445);
      expect(res.cashbackGiven).toBe(222);
      expect(res.netEarning).toBe(223);
    });

    it("uses Showmax 0.5% fallback commission rate", () => {
      const res = computeBillPricingAndEarnings({
        category: "cable",
        provider: "SHOWMAX",
        faceAmountNaira: 2900,
        walletBalanceNaira: 5000,
      });
      expect(res.commission).toBe(14.5);
      expect(res.cashbackGiven).toBe(7); // Math.floor(7.25) = 7
      expect(res.netEarning).toBe(7.5);
    });
  });

  describe("Cashback Funding Split & Full-Cashback Zero-Earn Rule", () => {
    it("splits partial cashback (₦250 product, ₦100 CB, ₦500 Wallet => C=100, W=150) and still earns cashback", () => {
      const res = computeBillPricingAndEarnings({
        category: "data",
        provider: "MTN",
        faceAmountNaira: 250,
        actualProviderCostNaira: 200,
        baseDataCashbackNaira: 5,
        useCashback: true,
        walletBalanceNaira: 500,
        cashbackBalanceNaira: 100,
      });
      expect(res.funding.cashbackApplied).toBe(100);
      expect(res.funding.walletContribution).toBe(150);
      expect(res.funding.isFullyCashbackFunded).toBe(false);
      expect(res.funding.fundingSource).toBe("CASHBACK_AND_WALLET");
      expect(res.funding.canAfford).toBe(true);
      expect(res.faceAmount).toBe(250);
      expect(res.cashbackGiven).toBe(5);
    });

    it("suppresses new cashback when 100% funded by cashback (W === 0)", () => {
      const res = computeBillPricingAndEarnings({
        category: "electricity",
        provider: "IKEDC",
        faceAmountNaira: 2000, // totalPayable = 2050
        useCashback: true,
        walletBalanceNaira: 500,
        cashbackBalanceNaira: 3000,
      });
      expect(res.totalPayable).toBe(2050);
      expect(res.funding.cashbackApplied).toBe(2050);
      expect(res.funding.walletContribution).toBe(0);
      expect(res.funding.isFullyCashbackFunded).toBe(true);
      expect(res.funding.fundingSource).toBe("CASHBACK_ONLY");
      expect(res.baseCashback).toBe(20);
      expect(res.cashbackGiven).toBe(0);
      expect(res.cashbackSuppressedReason).toBe("FULLY_FUNDED_BY_CASHBACK");
    });

    it("debits full payable from main wallet when useCashback is false", () => {
      const split = computeCashbackFundingSplit({
        totalPayableKobo: toKobo(250),
        walletBalanceKobo: toKobo(500),
        cashbackBalanceKobo: toKobo(400),
        useCashback: false,
      });
      expect(split.cashbackApplied).toBe(0);
      expect(split.walletContribution).toBe(250);
      expect(split.fundingSource).toBe("WALLET_ONLY");
      expect(split.canAfford).toBe(true);
    });

    it("rejects purchase when wallet balance < W even with partial cashback", () => {
      const split = computeCashbackFundingSplit({
        totalPayableKobo: toKobo(250),
        walletBalanceKobo: toKobo(100),
        cashbackBalanceKobo: toKobo(100),
        useCashback: true,
      });
      expect(split.cashbackApplied).toBe(100);
      expect(split.walletContribution).toBe(150);
      expect(split.canAfford).toBe(false);
      expect(split.shortfall).toBe(50);
    });
  });

  describe("Negative Net Detection, Holds & Actual Provider Cost", () => {
    it("uses actual provider cost when returned by ClubKonnect and flags negative net", () => {
      const res = computeBillPricingAndEarnings({
        category: "electricity",
        provider: "IKEDC",
        faceAmountNaira: 2000,
        actualProviderCostNaira: 2050, // supplier overcharged -> negative commission
        walletBalanceNaira: 5000,
        config: DEFAULT_BILL_PRICING_CONFIG,
      });
      expect(res.commissionSource).toBe("actual");
      expect(res.commission).toBe(-50);
      expect(res.grossGain).toBe(0); // -50 + 50 fee
      expect(res.cashbackGiven).toBe(20);
      expect(res.netEarning).toBe(-20);
      expect(res.isNegativeNet).toBe(true);
    });

    it("enforces hold on Water and Internet bills", () => {
      const water = computeBillPricingAndEarnings({ category: "water", faceAmountNaira: 1000 });
      const internet = computeBillPricingAndEarnings({ category: "internet", faceAmountNaira: 1000 });
      expect(water.valid).toBe(false);
      expect(water.isOnHold).toBe(true);
      expect(internet.valid).toBe(false);
      expect(internet.isOnHold).toBe(true);
    });

    it("floors kobo values cleanly to whole Naira kobo multiples", () => {
      expect(floorToWholeNairaKobo(22250)).toBe(22200);
      expect(floorToWholeNairaKobo(99)).toBe(0);
      expect(floorToWholeNairaKobo(-500)).toBe(0);
    });
  });

  describe("Airtime Per-Network Cashback & ClubKonnect Limits", () => {
    it("computes MTN 1.5% and Airtel 1.5% cashback out of 3% commission with kobo precision", () => {
      const mtn100 = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "MTN",
        faceAmountNaira: 100,
        walletBalanceNaira: 5000,
        config: DEFAULT_BILL_PRICING_CONFIG,
      });
      expect(mtn100.valid).toBe(true);
      expect(mtn100.commission).toBe(3);
      expect(mtn100.cashbackGiven).toBe(1.5);
      expect(mtn100.netEarning).toBe(1.5);

      const airtel200 = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "Airtel",
        faceAmountNaira: 200,
        walletBalanceNaira: 5000,
        config: DEFAULT_BILL_PRICING_CONFIG,
      });
      expect(airtel200.valid).toBe(true);
      expect(airtel200.commission).toBe(6);
      expect(airtel200.cashbackGiven).toBe(3);
      expect(airtel200.netEarning).toBe(3);
    });

    it("computes Glo 3.0% (of 8%) and 9mobile/t2mobile 2.5% (of 7%) cashback", () => {
      const glo = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "Glo",
        faceAmountNaira: 1000,
        walletBalanceNaira: 5000,
        config: DEFAULT_BILL_PRICING_CONFIG,
      });
      expect(glo.valid).toBe(true);
      expect(glo.commission).toBe(80);
      expect(glo.cashbackGiven).toBe(30);
      expect(glo.netEarning).toBe(50);

      const nineMobile = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "9mobile",
        faceAmountNaira: 100,
        walletBalanceNaira: 5000,
        config: DEFAULT_BILL_PRICING_CONFIG,
      });
      expect(nineMobile.valid).toBe(true);
      expect(nineMobile.commission).toBe(7);
      expect(nineMobile.cashbackGiven).toBe(2.5);
      expect(nineMobile.netEarning).toBe(4.5);

      const t2 = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "t2mobile",
        faceAmountNaira: 100,
        walletBalanceNaira: 5000,
        config: DEFAULT_BILL_PRICING_CONFIG,
      });
      expect(t2.cashbackGiven).toBe(2.5);
    });

    it("enforces ClubKonnect Airtime min ₦50 and max ₦200,000 limits", () => {
      const tooLow = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "MTN",
        faceAmountNaira: 40,
      });
      expect(tooLow.valid).toBe(false);

      const minOk = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "MTN",
        faceAmountNaira: 50,
      });
      expect(minOk.valid).toBe(true);
      expect(minOk.cashbackGiven).toBe(0.75);

      const tooHigh = computeBillPricingAndEarnings({
        category: "airtime",
        provider: "MTN",
        faceAmountNaira: 200001,
      });
      expect(tooHigh.valid).toBe(false);
    });
  });
});

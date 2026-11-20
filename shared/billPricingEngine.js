/**
 * PayWaka Unified Bill Pricing, Cashback Funding Split & Earnings Ledger Engine
 *
 * Shared pure integer-kobo financial calculations used identically by:
 * - Backend Cloud Functions (functions/billPricingEngine.js)
 * - Frontend UI Previews & Confirm Screens (shared/billPricingEngine.js)
 *
 * Invariants:
 * 1. All money math operates in integer kobo (1 NGN = 100 kobo) to eliminate IEEE-754 drift.
 * 2. Customer cashback earned is always floored to whole Naira (multiples of 100 kobo).
 * 3. If a purchase is 100% funded by existing cashback (walletContributionKobo === 0),
 *    cashback earned on that purchase is strictly 0.
 * 4. Canonical transaction `amount` ALWAYS equals the original product/bill face value P
 *    (never walletContribution W or totalPayable P + Fee).
 */

export function toKobo(naira) {
  const num = Number(naira || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function toNairaNumber(kobo) {
  const num = Number(kobo || 0);
  if (!Number.isFinite(num)) return 0;
  return Number((num / 100).toFixed(2));
}

export function floorToWholeNairaKobo(kobo) {
  const num = Number(kobo || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num / 100) * 100;
}

export const DEFAULT_BILL_PRICING_CONFIG = {
  ruleVersion: "v1.0.0",
  defaultGatewayCostKobo: 0,
  gatewayCostFlaggedByDefault: true,
  minCashbackTransferNaira: 1000,
  electricity: {
    enabled: true,
    minAmountNaira: 1000,
    fallbackCommissionRate: 0.005, // 0.5%
    tiers: {
      tierA: {
        label: "Tier A (₦1,000 – ₦5,999)",
        minNaira: 1000,
        maxExclusiveNaira: 6000,
        feeNaira: 50,
        cashbackMode: "flat",
        flatCashbackNaira: 20,
        cashbackShareOfGross: 0,
      },
      tierB: {
        label: "Tier B (₦6,000 – ₦9,999)",
        minNaira: 6000,
        maxExclusiveNaira: 10000,
        feeNaira: 30,
        cashbackMode: "flat",
        flatCashbackNaira: 40,
        cashbackShareOfGross: 0,
      },
      tierC: {
        label: "Tier C (₦10,000+)",
        minNaira: 10000,
        maxExclusiveNaira: null,
        feeNaira: 30,
        cashbackMode: "percentage_of_gross",
        flatCashbackNaira: 0,
        cashbackShareOfGross: 0.5, // 50% of (commission + fee)
      },
    },
  },
  cable: {
    enabled: true,
    feeNaira: 0,
    cashbackShareOfCommission: 0.5, // 50% of commission
    fallbackCommissionRates: {
      dstv: 0.01,
      gotv: 0.01,
      startimes: 0.01,
      showmax: 0.005,
      default: 0.01,
    },
  },
  airtime: {
    enabled: true,
    minAmountNaira: 50,
    maxAmountNaira: 200000,
    feeNaira: 0,
    fallbackCommissionRate: 0.03,
    fallbackCommissionRates: {
      mtn: 0.03, // 3.0% ClubKonnect MTN discount
      airtel: 0.03, // 3.0% ClubKonnect Airtel discount
      glo: 0.08, // 8.0% ClubKonnect Glo discount
      "9mobile": 0.07, // 7.0% ClubKonnect t2mobile/9mobile discount
      default: 0.03,
    },
    cashbackRate: 0.015, // Default fallback rate (1.5%)
    cashbackRates: {
      mtn: 0.015, // 1.5% customer cashback (1.5% PayWaka net profit)
      airtel: 0.015, // 1.5% customer cashback (1.5% PayWaka net profit)
      glo: 0.03, // 3.0% customer cashback (5.0% PayWaka net profit)
      "9mobile": 0.025, // 2.5% customer cashback (4.5% PayWaka net profit)
      default: 0.015,
    },
  },
  data: {
    enabled: true,
    feeNaira: 0,
  },
  water: {
    enabled: false,
    isOnHold: true,
  },
  internet: {
    enabled: false,
    isOnHold: true,
  },
};

export function mergeBillPricingConfig(saved = {}) {
  const s = saved && typeof saved === "object" ? saved : {};
  const d = DEFAULT_BILL_PRICING_CONFIG;
  return {
    ...d,
    ...s,
    electricity: {
      ...d.electricity,
      ...(s.electricity || {}),
      tiers: {
        tierA: {
          ...d.electricity.tiers.tierA,
          ...(s.electricity?.tiers?.tierA || {}),
        },
        tierB: {
          ...d.electricity.tiers.tierB,
          ...(s.electricity?.tiers?.tierB || {}),
        },
        tierC: {
          ...d.electricity.tiers.tierC,
          ...(s.electricity?.tiers?.tierC || {}),
        },
      },
    },
    cable: {
      ...d.cable,
      ...(s.cable || {}),
      fallbackCommissionRates: {
        ...d.cable.fallbackCommissionRates,
        ...(s.cable?.fallbackCommissionRates || {}),
      },
    },
    airtime: {
      ...d.airtime,
      ...(s.airtime || {}),
      fallbackCommissionRates: {
        ...d.airtime.fallbackCommissionRates,
        ...(s.airtime?.fallbackCommissionRates || {}),
      },
      cashbackRates: {
        ...d.airtime.cashbackRates,
        ...(s.airtime?.cashbackRates || {}),
      },
    },
    data: {
      ...d.data,
      ...(s.data || {}),
    },
    water: {
      ...d.water,
      ...(s.water || {}),
      enabled: false,
      isOnHold: true,
    },
    internet: {
      ...d.internet,
      ...(s.internet || {}),
      enabled: false,
      isOnHold: true,
    },
  };
}

export function normalizeCableProviderKey(provider) {
  const raw = String(provider || "").toLowerCase().trim();
  if (raw === "01" || raw.includes("dstv")) return "dstv";
  if (raw === "02" || raw.includes("gotv")) return "gotv";
  if (raw === "03" || raw.includes("startimes") || raw.includes("startime")) return "startimes";
  if (raw === "04" || raw.includes("showmax")) return "showmax";
  return "default";
}

export function normalizeAirtimeProviderKey(provider) {
  const raw = String(provider || "").toLowerCase().trim();
  if (raw === "01" || raw.includes("mtn")) return "mtn";
  if (raw === "02" || raw.includes("glo")) return "glo";
  if (raw === "03" || raw.includes("9mob") || raw.includes("etisalat") || raw.includes("t2")) return "9mobile";
  if (raw === "04" || raw.includes("airtel")) return "airtel";
  return "default";
}

/**
 * Computes cashback vs main wallet funding split against Total Payable (Face Amount + Processing Fee).
 * - When useCashback = true: C = min(totalPayable, cashbackBalance), W = totalPayable - C.
 * - When useCashback = false: C = 0, W = totalPayable.
 */
export function computeCashbackFundingSplit({
  totalPayableKobo,
  walletBalanceKobo = 0,
  cashbackBalanceKobo = 0,
  useCashback = false,
}) {
  const payable = Math.max(0, Math.round(Number(totalPayableKobo || 0)));
  const wallet = Math.max(0, Math.round(Number(walletBalanceKobo || 0)));
  const cashback = Math.max(0, Math.round(Number(cashbackBalanceKobo || 0)));

  const appliedCashbackKobo = useCashback ? Math.min(payable, cashback) : 0;
  const walletContributionKobo = Math.max(0, payable - appliedCashbackKobo);
  const isFullyCashbackFunded = payable > 0 && walletContributionKobo === 0 && appliedCashbackKobo >= payable;
  const cashbackUsed = appliedCashbackKobo > 0;
  const canAfford = wallet >= walletContributionKobo;
  const shortfallKobo = Math.max(0, walletContributionKobo - wallet);

  const fundingSource = !cashbackUsed
    ? "WALLET_ONLY"
    : walletContributionKobo === 0
      ? "CASHBACK_ONLY"
      : "CASHBACK_AND_WALLET";

  return {
    totalPayableKobo: payable,
    totalPayable: toNairaNumber(payable),
    cashbackAppliedKobo: appliedCashbackKobo,
    cashbackApplied: toNairaNumber(appliedCashbackKobo),
    walletContributionKobo,
    walletContribution: toNairaNumber(walletContributionKobo),
    cashbackUsed,
    isFullyCashbackFunded,
    fundingSource,
    canAfford,
    shortfallKobo,
    shortfall: toNairaNumber(shortfallKobo),
  };
}

/**
 * Resolves exact customer fees, fallback vs actual provider commission,
 * whole-Naira cashback earned (suppressed to 0 if 100% funded by cashback),
 * funding split (C vs W), gross gain, gateway cost, and net platform earnings.
 */
export function computeBillPricingAndEarnings({
  category,
  provider = "",
  faceAmountNaira = 0,
  actualProviderCostNaira = null,
  baseDataCashbackNaira = null,
  gatewayCostNaira = null,
  useCashback = false,
  walletBalanceNaira = 0,
  cashbackBalanceNaira = 0,
  config = DEFAULT_BILL_PRICING_CONFIG,
}) {
  const cfg = mergeBillPricingConfig(config);
  const catLower = String(category || "").toLowerCase().trim();

  if (catLower === "water" || catLower === "internet") {
    return {
      valid: false,
      enabled: false,
      isOnHold: true,
      error: `${catLower === "water" ? "Water" : "Internet"} bill payments are currently on hold and unavailable.`,
      ruleVersion: cfg.ruleVersion,
    };
  }

  const faceAmountKobo = toKobo(faceAmountNaira);
  if (!Number.isFinite(faceAmountKobo) || faceAmountKobo <= 0) {
    return {
      valid: false,
      enabled: true,
      isOnHold: false,
      error: "Amount must be greater than ₦0.",
      ruleVersion: cfg.ruleVersion,
    };
  }

  const hasActualProviderCost =
    actualProviderCostNaira !== null &&
    actualProviderCostNaira !== undefined &&
    actualProviderCostNaira !== "" &&
    Number(actualProviderCostNaira) > 0;

  let tierKey = "standard";
  let tierLabel = "Standard";
  let feeChargedKobo = 0;
  let providerCostKobo = 0;
  let commissionKobo = 0;
  let commissionRate = 0;
  let commissionSource = hasActualProviderCost ? "actual" : "fallback";
  let baseCashbackKobo = 0;

  if (catLower.includes("elect")) {
    const elecCfg = cfg.electricity;
    const minElecKobo = toKobo(elecCfg.minAmountNaira || 1000);
    if (faceAmountKobo < minElecKobo) {
      return {
        valid: false,
        enabled: true,
        isOnHold: false,
        error: `Minimum electricity payment is ₦${Number(elecCfg.minAmountNaira || 1000).toLocaleString()}.`,
        ruleVersion: cfg.ruleVersion,
      };
    }

    const tA = elecCfg.tiers.tierA;
    const tB = elecCfg.tiers.tierB;
    const tC = elecCfg.tiers.tierC;
    const tierAMaxKobo = toKobo(tA.maxExclusiveNaira || 6000);
    const tierBMaxKobo = toKobo(tB.maxExclusiveNaira || 10000);

    let activeTier = tC;
    if (faceAmountKobo < tierAMaxKobo) {
      tierKey = "tierA";
      activeTier = tA;
    } else if (faceAmountKobo < tierBMaxKobo) {
      tierKey = "tierB";
      activeTier = tB;
    } else {
      tierKey = "tierC";
      activeTier = tC;
    }
    tierLabel = activeTier.label || tierKey;
    feeChargedKobo = toKobo(activeTier.feeNaira || 0);

    commissionRate = Number(elecCfg.fallbackCommissionRate ?? 0.005);
    if (hasActualProviderCost) {
      providerCostKobo = toKobo(actualProviderCostNaira);
      commissionKobo = faceAmountKobo - providerCostKobo;
    } else {
      commissionKobo = Math.round(faceAmountKobo * commissionRate);
      providerCostKobo = faceAmountKobo - commissionKobo;
    }

    const grossGainForElec = commissionKobo + feeChargedKobo;
    if (activeTier.cashbackMode === "flat") {
      baseCashbackKobo = floorToWholeNairaKobo(toKobo(activeTier.flatCashbackNaira || 0));
    } else {
      const share = Number(activeTier.cashbackShareOfGross ?? 0.5);
      baseCashbackKobo = floorToWholeNairaKobo(Math.round(Math.max(0, grossGainForElec) * share));
    }
  } else if (catLower.includes("cable") || catLower.includes("tv")) {
    const cableCfg = cfg.cable;
    const provKey = normalizeCableProviderKey(provider);
    tierKey = `cable_${provKey}`;
    tierLabel = `${provKey === "default" ? "Cable TV" : provKey.toUpperCase()}`;
    feeChargedKobo = toKobo(cableCfg.feeNaira || 0);
    commissionRate = Number(
      cableCfg.fallbackCommissionRates?.[provKey] ??
      cableCfg.fallbackCommissionRates?.default ??
      0.01,
    );

    if (hasActualProviderCost) {
      providerCostKobo = toKobo(actualProviderCostNaira);
      commissionKobo = faceAmountKobo - providerCostKobo;
    } else {
      commissionKobo = Math.round(faceAmountKobo * commissionRate);
      providerCostKobo = faceAmountKobo - commissionKobo;
    }

    const share = Number(cableCfg.cashbackShareOfCommission ?? 0.5);
    baseCashbackKobo = floorToWholeNairaKobo(Math.round(Math.max(0, commissionKobo) * share));
  } else if (catLower.includes("data")) {
    tierKey = "data";
    tierLabel = "Data Bundle";
    feeChargedKobo = toKobo(cfg.data?.feeNaira || 0);
    if (hasActualProviderCost) {
      providerCostKobo = toKobo(actualProviderCostNaira);
      commissionKobo = faceAmountKobo - providerCostKobo;
      commissionSource = "actual";
    } else {
      providerCostKobo = faceAmountKobo;
      commissionKobo = 0;
      commissionSource = "fallback";
    }
    commissionRate = faceAmountKobo > 0 ? Number((commissionKobo / faceAmountKobo).toFixed(4)) : 0;
    baseCashbackKobo = toKobo(Math.max(0, Number(baseDataCashbackNaira || 0)));
  } else if (catLower.includes("airtime")) {
    const airCfg = cfg.airtime;
    const minAirKobo = toKobo(airCfg.minAmountNaira || 50);
    const maxAirKobo = toKobo(airCfg.maxAmountNaira || 200000);
    if (faceAmountKobo < minAirKobo) {
      return {
        valid: false,
        enabled: true,
        isOnHold: false,
        error: `Minimum airtime purchase is ₦${Number(airCfg.minAmountNaira || 50).toLocaleString()}.`,
        ruleVersion: cfg.ruleVersion,
      };
    }
    if (maxAirKobo > 0 && faceAmountKobo > maxAirKobo) {
      return {
        valid: false,
        enabled: true,
        isOnHold: false,
        error: `Maximum airtime purchase is ₦${Number(airCfg.maxAmountNaira || 200000).toLocaleString()}.`,
        ruleVersion: cfg.ruleVersion,
      };
    }
    const netKey = normalizeAirtimeProviderKey(provider);
    tierKey = `airtime_${netKey}`;
    tierLabel = netKey === "default" ? "Airtime VTU" : `Airtime ${netKey.toUpperCase()}`;
    feeChargedKobo = toKobo(airCfg.feeNaira || 0);
    commissionRate = Number(
      airCfg.fallbackCommissionRates?.[netKey] ?? airCfg.fallbackCommissionRate ?? 0.03,
    );
    if (hasActualProviderCost) {
      providerCostKobo = toKobo(actualProviderCostNaira);
      commissionKobo = faceAmountKobo - providerCostKobo;
    } else {
      commissionKobo = Math.round(faceAmountKobo * commissionRate);
      providerCostKobo = faceAmountKobo - commissionKobo;
    }
    const cbRate = Number(airCfg.cashbackRates?.[netKey] ?? airCfg.cashbackRate ?? 0.015);
    const rawCbKobo = Math.round(faceAmountKobo * Math.max(0, cbRate));
    // Never award more cashback than commission earned so platform net remains >= 0
    baseCashbackKobo = Math.max(0, Math.min(commissionKobo > 0 ? commissionKobo : rawCbKobo, rawCbKobo));
  } else {
    return {
      valid: false,
      enabled: false,
      error: `Unsupported billing category: ${category}`,
      ruleVersion: cfg.ruleVersion,
    };
  }

  const totalPayableKobo = faceAmountKobo + feeChargedKobo;
  const grossGainKobo = commissionKobo + feeChargedKobo;

  const hasExplicitGatewayCost =
    gatewayCostNaira !== null && gatewayCostNaira !== undefined && gatewayCostNaira !== "";
  const gatewayCostKobo = hasExplicitGatewayCost
    ? toKobo(gatewayCostNaira)
    : Number(cfg.defaultGatewayCostKobo || 0);
  const gatewayCostFlagged = !hasExplicitGatewayCost && Boolean(cfg.gatewayCostFlaggedByDefault ?? true);

  const funding = computeCashbackFundingSplit({
    totalPayableKobo,
    walletBalanceKobo: toKobo(walletBalanceNaira),
    cashbackBalanceKobo: toKobo(cashbackBalanceNaira),
    useCashback,
  });

  // Explicit rule: A purchase 100% funded by existing cashback earns ZERO new cashback.
  const cashbackGivenKobo = funding.isFullyCashbackFunded ? 0 : baseCashbackKobo;
  const cashbackSuppressedReason = funding.isFullyCashbackFunded && baseCashbackKobo > 0
    ? "FULLY_FUNDED_BY_CASHBACK"
    : null;

  const netEarningKobo = grossGainKobo - cashbackGivenKobo - gatewayCostKobo;
  const isNegativeNet = netEarningKobo < 0;

  return {
    valid: true,
    enabled: true,
    isOnHold: false,
    category: catLower,
    provider,
    tier: tierKey,
    tierLabel,
    ruleVersion: cfg.ruleVersion,
    faceAmountKobo,
    faceAmount: toNairaNumber(faceAmountKobo),
    providerCostKobo,
    providerCost: toNairaNumber(providerCostKobo),
    commissionKobo,
    commission: toNairaNumber(commissionKobo),
    commissionRate,
    commissionSource,
    feeChargedKobo,
    feeCharged: toNairaNumber(feeChargedKobo),
    totalPayableKobo,
    totalPayable: toNairaNumber(totalPayableKobo),
    grossGainKobo,
    grossGain: toNairaNumber(grossGainKobo),
    baseCashbackKobo,
    baseCashback: toNairaNumber(baseCashbackKobo),
    cashbackGivenKobo,
    cashbackGiven: toNairaNumber(cashbackGivenKobo),
    cashbackSuppressedReason,
    gatewayCostKobo,
    gatewayCost: toNairaNumber(gatewayCostKobo),
    gatewayCostFlagged,
    gatewayCostSource: hasExplicitGatewayCost ? "recorded" : "unallocated_wallet_float",
    netEarningKobo,
    netEarning: toNairaNumber(netEarningKobo),
    isNegativeNet,
    funding,
  };
}

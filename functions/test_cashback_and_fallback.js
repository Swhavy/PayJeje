import { calculatePlanPricing, DEFAULT_PRICING_CONFIG } from "./index.js";

console.log("=================================================");
console.log("TEST SUITE: CASHBACK FORMULA & FALLBACK VISIBILITY");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// TEST 1: MTN_6500.01 Sample Math Verification
// -------------------------------------------------------------
console.log("--- TEST 1: MTN_6500.01 Specific Math ---");
const mtnCost = 6305;
const mtnComp = 6500;
const mtnRes = calculatePlanPricing(
  mtnCost,
  "MTN",
  mtnComp,
  null,
  "AUTOMATIC",
  DEFAULT_PRICING_CONFIG
);

console.log("MTN_6500.01 calculation output:", JSON.stringify(mtnRes, null, 2));

// Step-by-step verification:
// Spread: 6500 - 6305 = 195 (> undercutSpreadMin 20)
// Floor target: Math.round((6305 * 1.01) / 10) * 10 = 6370
// Undercut target: 6500 - 10 = 6490
// displayPrice = Math.max(6370, 6490) = 6490
// isHero = true
// ruleApplied = "COMPETITOR_UNDERCUT"
// cashbackRate = heroCashbackRate = 0.005 (0.5%)
// Gross Margin = 6490 - 6305 = 185
// Cashback (NEW) = Math.round(185 * 0.005 * 100) / 100 = 0.93
// Profit = Math.round((6490 - 6305 - 0.93) * 100) / 100 = 184.07
assert(mtnRes.displayPrice === 6490, "displayPrice is ₦6,490 (Rule: COMPETITOR_UNDERCUT)");
assert(mtnRes.isHero === true, "isHero is true");
assert(mtnRes.cashbackRate === 0.005, "cashbackRate is 0.005 (0.5% Hero rate)");
assert(mtnRes.cashbackAmount === 0.93, `cashbackAmount is ₦0.93 ((6490 - 6305) * 0.005 = 0.925 -> 0.93), got: ${mtnRes.cashbackAmount}`);
assert(mtnRes.profit === 184.07, `Net profit is ₦184.07 (185 - 0.93), got: ${mtnRes.profit}`);

// Contrast with OLD formula:
const oldCashbackAmount = Math.round(6490 * 0.005 * 100) / 100; // 32.45
const oldProfit = Math.round((6490 - 6305 - oldCashbackAmount) * 100) / 100; // 152.55
console.log(`\nComparison for MTN_6500.01:`);
console.log(`  Wholesale Cost:    ₦${mtnCost}`);
console.log(`  Competitor Price:  ₦${mtnComp}`);
console.log(`  Selling Price:     ₦${mtnRes.displayPrice}`);
console.log(`  Gross Margin:      ₦${mtnRes.displayPrice - mtnCost}`);
console.log(`  Cashback Rate:     ${(mtnRes.cashbackRate * 100).toFixed(1)}% (Hero)`);
console.log(`  OLD Cashback:      ₦${oldCashbackAmount} (displayPrice * rate: ate 17.5% of gross margin)`);
console.log(`  OLD Net Profit:    ₦${oldProfit}`);
console.log(`  NEW Cashback:      ₦${mtnRes.cashbackAmount} ((displayPrice - costPrice) * rate: exactly 0.5% of gross margin)`);
console.log(`  NEW Net Profit:    ₦${mtnRes.profit}\n`);

// -------------------------------------------------------------
// TEST 2: Standard Network Margin (Non-Hero) Cashback
// -------------------------------------------------------------
console.log("--- TEST 2: Non-Hero Standard Margin Plan ---");
// Cost = 1000, no competitor price, MTN standard margin 30%, cashback 2.5%
// displayPrice = Math.round((1000 * 1.30) / 10) * 10 = 1300
// Gross margin = 1300 - 1000 = 300
// Cashback = Math.round(300 * 0.025 * 100) / 100 = 7.50
// Profit = 300 - 7.50 = 292.50
const stdRes = calculatePlanPricing(1000, "MTN", null, null, "AUTOMATIC", DEFAULT_PRICING_CONFIG);
assert(stdRes.displayPrice === 1300, `Standard display price is 1300, got: ${stdRes.displayPrice}`);
assert(stdRes.isHero === false, "isHero is false");
assert(stdRes.cashbackRate === 0.025, "cashbackRate is 0.025 (2.5%)");
assert(stdRes.cashbackAmount === 7.5, `cashbackAmount is 7.50 (300 * 0.025), got: ${stdRes.cashbackAmount}`);
assert(stdRes.profit === 292.5, `profit is 292.50 (300 - 7.50), got: ${stdRes.profit}`);

// -------------------------------------------------------------
// TEST 3: Manual Override Cashback
// -------------------------------------------------------------
console.log("--- TEST 3: Manual Override Plan ---");
// Cost = 2000, customDisplayPrice = 2500, no competitor (non-hero)
// Gross margin = 2500 - 2000 = 500
// Cashback = Math.round(500 * 0.025 * 100) / 100 = 12.50
// Profit = 500 - 12.50 = 487.50
const manualRes = calculatePlanPricing(2000, "MTN", null, 2500, "MANUAL", DEFAULT_PRICING_CONFIG);
assert(manualRes.displayPrice === 2500, "displayPrice is 2500");
assert(manualRes.cashbackAmount === 12.5, `cashbackAmount is 12.50, got: ${manualRes.cashbackAmount}`);
assert(manualRes.profit === 487.5, `profit is 487.50, got: ${manualRes.profit}`);

// -------------------------------------------------------------
// TEST 4: Zero or Negative Margin Safety Guard
// -------------------------------------------------------------
console.log("--- TEST 4: Zero or Negative Margin Safety Guard ---");
// If displayPrice <= costPrice (e.g. manual price set equal to or lower than cost)
const lossRes = calculatePlanPricing(2000, "MTN", null, 1900, "MANUAL", DEFAULT_PRICING_CONFIG);
assert(lossRes.cashbackAmount === 0, `cashbackAmount must be 0 when displayPrice < costPrice, got: ${lossRes.cashbackAmount}`);
assert(lossRes.profit === -100, `profit is -100, got: ${lossRes.profit}`);

// -------------------------------------------------------------
// TEST 5: Fallback Visibility Verification
// -------------------------------------------------------------
console.log("--- TEST 5: Fallback Detection Logic Verification ---");
function simulateFallbackCheck(docId, data, config) {
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
    fallbackReasons.push(`planName is missing (fallback default: '${docId}')`);
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

  return {
    fallbackApplied: fallbackFields.length > 0,
    fallbackFields,
    fallbackReasons,
  };
}

// 5a. Clean plan
const cleanPlan = {
  planId: "6500.01",
  network: "MTN",
  planName: "16.5GB Monthly Plan",
  costPrice: 6305,
  validity_period: "30 Days",
  isActive: true,
  overrideMode: "AUTOMATIC",
};
const cleanRes = simulateFallbackCheck("MTN_6500.01", cleanPlan, DEFAULT_PRICING_CONFIG);
assert(cleanRes.fallbackApplied === false, "Clean plan has fallbackApplied === false");
assert(cleanRes.fallbackFields.length === 0, "Clean plan has 0 fallbackFields");

// 5b. Plan missing costPrice and validity (e.g. bad sync)
const badPlan = {
  planId: "MTN_TEST",
  network: "MTN",
  planName: "Test Plan",
  isActive: true,
  overrideMode: "AUTOMATIC",
  // missing costPrice, missing validity
};
const badRes = simulateFallbackCheck("MTN_TEST", badPlan, DEFAULT_PRICING_CONFIG);
assert(badRes.fallbackApplied === true, "Bad plan has fallbackApplied === true");
assert(badRes.fallbackFields.includes("costPrice"), "Bad plan flags missing costPrice");
assert(badRes.fallbackFields.includes("validity"), "Bad plan flags missing validity");

// 5c. Plan with dropped network and planName
const droppedPlan = {
  costPrice: 500,
  validity: "30 Days",
  isActive: true,
  overrideMode: "AUTOMATIC",
};
const droppedRes = simulateFallbackCheck("UNKNOWN_DOC", droppedPlan, DEFAULT_PRICING_CONFIG);
assert(droppedRes.fallbackApplied === true, "Dropped plan has fallbackApplied === true");
assert(droppedRes.fallbackFields.includes("network"), "Dropped plan flags missing network");
assert(droppedRes.fallbackFields.includes("planName"), "Dropped plan flags missing planName");

console.log("\n=================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

/**
 * PayWaka Meal Offer Utilities & Fail-Closed Validators
 * 
 * Strict architectural boundaries:
 * - Pure functions with zero side-effects
 * - Fail-closed: invalid or missing data disables user action
 * - Zero fabricated defaults (no default 500 / 2500 amounts)
 * - Deterministic mapping to verified bundled assets
 */

/**
 * Authoritative Client-Side Availability Resolver
 * Strictly fail-closed: requires status === "active" && isAvailable === true.
 * Any missing, null, unrecognized, or malformed state fails closed to a disabled CTA.
 */
export function resolveOfferAvailability(offer) {
  if (!offer || typeof offer !== "object" || Array.isArray(offer)) {
    return {
      badgeLabel: "Unavailable",
      badgeStyle: "zinc",
      isActionable: false,
      statusReason: "malformed",
      buttonText: "Offer Data Unavailable",
      description: "Offer details could not be loaded. Please refresh or try again later.",
    };
  }

  const { status, isAvailable } = offer;

  if (status === "emergency_halt") {
    return {
      badgeLabel: "Administrative Halt",
      badgeStyle: "rose",
      isActionable: false,
      statusReason: "emergency_halt",
      buttonText: "Campaign Halted by Administration",
      description: "Temporarily suspended by platform administration.",
    };
  }

  if (status === "paused") {
    return {
      badgeLabel: "Offer Paused",
      badgeStyle: "amber",
      isActionable: false,
      statusReason: "paused",
      buttonText: "Campaign Paused by Merchant",
      description: "The merchant has temporarily paused new voucher claims.",
    };
  }

  if (status === "ended") {
    return {
      badgeLabel: "Offer Ended",
      badgeStyle: "zinc",
      isActionable: false,
      statusReason: "ended",
      buttonText: "Campaign Concluded",
      description: "This promotional campaign has reached the end of its duration.",
    };
  }

  if (status === "active" && isAvailable === false) {
    return {
      badgeLabel: "Sold Out",
      badgeStyle: "zinc",
      isActionable: false,
      statusReason: "sold_out",
      buttonText: "Promotional Capacity Reached (Sold Out)",
      description: "All promotional vouchers for this campaign budget have been claimed.",
    };
  }

  if (status === "active" && isAvailable === true) {
    return {
      badgeLabel: "Available",
      badgeStyle: "emerald",
      isActionable: true,
      statusReason: "available",
      buttonText: "Unlock Voucher",
      description: "Ready to claim with PayWaka Points.",
    };
  }

  return {
    badgeLabel: "Unavailable",
    badgeStyle: "zinc",
    isActionable: false,
    statusReason: "unknown_status",
    buttonText: "Offer Currently Unavailable",
    description: "This offer is currently unavailable due to unverified campaign status.",
  };
}

/**
 * Strict Commercial Terms Validator
 * Verifies that all required monetary and commercial attributes are present and consistent.
 * Does NOT invent or inject default amounts.
 */
export function validatePublicOfferTerms(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { isValid: false, reason: "MISSING_DATA" };
  }

  if (
    data.discountNaira === undefined ||
    data.discountNaira === null ||
    typeof data.discountNaira === "boolean" ||
    (typeof data.discountNaira === "string" && !data.discountNaira.trim())
  ) {
    return { isValid: false, reason: "INVALID_DISCOUNT_AMOUNT" };
  }
  const discount = Number(data.discountNaira);
  if (!Number.isFinite(discount) || discount <= 0) {
    return { isValid: false, reason: "INVALID_DISCOUNT_AMOUNT" };
  }

  if (
    data.minSpendNaira === undefined ||
    data.minSpendNaira === null ||
    typeof data.minSpendNaira === "boolean" ||
    (typeof data.minSpendNaira === "string" && !data.minSpendNaira.trim())
  ) {
    return { isValid: false, reason: "INVALID_MIN_SPEND" };
  }
  const minSpend = Number(data.minSpendNaira);
  if (!Number.isFinite(minSpend) || minSpend < discount) {
    return { isValid: false, reason: "INVALID_MIN_SPEND" };
  }

  if (
    data.pointsCost === undefined ||
    data.pointsCost === null ||
    typeof data.pointsCost === "boolean" ||
    (typeof data.pointsCost === "string" && !data.pointsCost.trim())
  ) {
    return { isValid: false, reason: "INVALID_POINTS_COST" };
  }
  const points = Number(data.pointsCost);
  if (!Number.isFinite(points) || points < 0) {
    return { isValid: false, reason: "INVALID_POINTS_COST" };
  }

  if (!data.vendorName || typeof data.vendorName !== "string" || !data.vendorName.trim()) {
    return { isValid: false, reason: "MISSING_VENDOR_NAME" };
  }
  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    return { isValid: false, reason: "MISSING_TITLE" };
  }

  return {
    isValid: true,
    discountNaira: Math.round(discount),
    minSpendNaira: Math.round(minSpend),
    pointsCost: Math.round(points),
    discountDisplay: `₦${Math.round(discount).toLocaleString()} OFF`,
    minSpendDisplay: `₦${Math.round(minSpend).toLocaleString()}`,
  };
}

/**
 * Strict Identity Validator for Meal Offers
 * Returns validated identifiers or fails closed with an explicit error code.
 * Zero silent fallback.
 */
export function validateOfferIdentity(docSnap, routeCouponId) {
  if (!docSnap || typeof docSnap.exists !== "function" || !docSnap.exists()) {
    return { isValid: false, reason: "DOCUMENT_NOT_FOUND" };
  }

  const docId = docSnap.id;
  const data = docSnap.data();
  if (!data || typeof data !== "object") {
    return { isValid: false, reason: "MALFORMED_DOCUMENT_DATA" };
  }

  // 1. Snapshot ID must match route parameter exactly
  if (routeCouponId && docId !== routeCouponId) {
    return { isValid: false, reason: "ROUTE_DOCUMENT_MISMATCH" };
  }

  // 2. data.campaignId must be explicitly present and equal to docSnap.id
  if (typeof data.campaignId !== "string" || data.campaignId !== docId) {
    return {
      isValid: false,
      reason: "CAMPAIGN_ID_INCONSISTENCY",
      message: "Explicit campaignId is missing or does not match document ID.",
    };
  }

  // 3. If data.id is present, it must also equal docSnap.id
  if (data.id !== undefined && data.id !== docId) {
    return {
      isValid: false,
      reason: "ID_FIELD_INCONSISTENCY",
      message: "Document field 'id' contradicts snapshot document ID.",
    };
  }

  // 4. data.offerId must be an explicit, non-empty string (NO || docId default)
  if (typeof data.offerId !== "string" || !data.offerId.trim()) {
    return {
      isValid: false,
      reason: "MISSING_OFFER_ID",
      message: "Explicit offerId is missing or empty.",
    };
  }

  return {
    isValid: true,
    canonicalDocumentId: docId,
    canonicalCampaignId: data.campaignId,
    canonicalOfferId: data.offerId.trim(),
    isLegacyIdentity: data.offerId.trim() !== data.campaignId,
  };
}

/**
 * Bundled Image Resolver
 * Deterministically maps category / vendor / title keywords to the 4 verified bundled images.
 */
export const BUNDLED_MEAL_IMAGES = {
  jollof: "/meals/jollof-chicken.png",
  pizza: "/meals/stone-pizza.png",
  burger: "/meals/gourmet-burger.png",
  bakery: "/meals/bakery-coffee.png",
};

export function resolveBundledMealImage(category, title, vendorName) {
  const combined = `${category || ""} ${title || ""} ${vendorName || ""}`.toLowerCase();
  if (combined.includes("pizza") || combined.includes("pasta") || combined.includes("italian")) {
    return BUNDLED_MEAL_IMAGES.pizza;
  }
  if (combined.includes("burger") || combined.includes("fast food") || combined.includes("sandwich")) {
    return BUNDLED_MEAL_IMAGES.burger;
  }
  if (
    combined.includes("bakery") ||
    combined.includes("coffee") ||
    combined.includes("croissant") ||
    combined.includes("dessert") ||
    combined.includes("pastry")
  ) {
    return BUNDLED_MEAL_IMAGES.bakery;
  }
  return BUNDLED_MEAL_IMAGES.jollof;
}

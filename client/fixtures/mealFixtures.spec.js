import { describe, it, expect } from "vitest";
import {
  FICTIONAL_VENDORS,
  MEAL_CATEGORIES,
  MEAL_OFFERS,
  MOCK_USER_VOUCHERS,
  getMealOffers,
  getMealOfferById,
  getFictionalVendors,
  getVendorById,
  getUserVouchers,
  getUserVoucherById,
} from "./mealFixtures";

describe("Phase 2: Meal Marketplace UI Foundation - Fixtures & States", () => {
  it("enforces fictional vendors only (no real vendor brands)", () => {
    const prohibitedRealBrands = ["kfc", "domino", "chicken republic", "the place", "mega chicken"];
    
    FICTIONAL_VENDORS.forEach((vendor) => {
      const lowerName = vendor.name.toLowerCase();
      prohibitedRealBrands.forEach((realBrand) => {
        expect(lowerName).not.toContain(realBrand);
      });
    });

    expect(FICTIONAL_VENDORS.length).toBeGreaterThanOrEqual(4);
    const vendorIds = FICTIONAL_VENDORS.map((v) => v.id);
    expect(vendorIds).toContain("paywaka-demo-foods");
    expect(vendorIds).toContain("demo-woodfire-pizza");
    expect(vendorIds).toContain("test-kitchen-lagos");
    expect(vendorIds).toContain("artisan-bakehouse-demo");
  });

  it("verifies all fictional vendors have required presentation metadata", () => {
    FICTIONAL_VENDORS.forEach((vendor) => {
      expect(vendor.id).toBeTruthy();
      expect(vendor.name).toBeTruthy();
      expect(vendor.category).toBeTruthy();
      expect(vendor.branch).toBeTruthy();
      expect(vendor.address).toBeTruthy();
      expect(vendor.logoEmoji).toBeTruthy();
      expect(vendor.rating).toBeGreaterThanOrEqual(4.0);
      expect(Array.isArray(vendor.tags)).toBe(true);
      expect(vendor.tags.length).toBeGreaterThan(0);
    });
  });

  it("validates meal offers integrity, economics, and terms", () => {
    expect(MEAL_OFFERS.length).toBeGreaterThanOrEqual(4);
    
    MEAL_OFFERS.forEach((offer) => {
      expect(offer.id).toBeTruthy();
      expect(offer.vendorId).toBeTruthy();
      expect(offer.vendorName).toBeTruthy();
      expect(offer.discountAmount).toBeGreaterThan(0);
      expect(offer.discountDisplay).toContain("OFF");
      expect(offer.pointsCost).toBeGreaterThan(0);
      expect(offer.minSpend).toBeGreaterThan(0);
      expect(offer.validityHours).toBe(48);
      expect(offer.image).toBeTruthy();
      expect(Array.isArray(offer.terms)).toBe(true);
      expect(offer.terms.length).toBeGreaterThanOrEqual(3);
    });

    const featured = MEAL_OFFERS.find((o) => o.isFeatured);
    expect(featured).toBeDefined();
    expect(featured.id).toBe("coupon-demo-jollof");
  });

  it("validates categories coverage", () => {
    expect(MEAL_CATEGORIES.length).toBe(6);
    const categoryIds = MEAL_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain("all");
    expect(categoryIds).toContain("small-chops");
    expect(categoryIds).toContain("fast-foods");
    expect(categoryIds).toContain("local-delicacies");
    expect(categoryIds).toContain("drinks");
    expect(categoryIds).toContain("pastries");
  });

  it("verifies user vouchers span all 3 required lifecycle states: active, used, expired", () => {
    const active = getUserVouchers("active");
    const used = getUserVouchers("used");
    const expired = getUserVouchers("expired");

    expect(active.length).toBeGreaterThanOrEqual(2);
    expect(used.length).toBeGreaterThanOrEqual(2);
    expect(expired.length).toBeGreaterThanOrEqual(2);

    // Active voucher requirements
    active.forEach((v) => {
      expect(v.status).toBe("active");
      expect(v.code).toMatch(/^PWK-/);
      expect(v.pin).toBeTruthy();
      expect(v.hoursRemaining).toBeGreaterThan(0);
      expect(v.discountDisplay).toBeTruthy();
      expect(v.minSpend).toBeGreaterThan(0);
    });

    // Used voucher requirements
    used.forEach((v) => {
      expect(v.status).toBe("used");
      expect(v.redeemedAt).toBeTruthy();
      expect(v.code).toBeTruthy();
    });

    // Expired voucher requirements
    expired.forEach((v) => {
      expect(v.status).toBe("expired");
      expect(v.expiredAt).toBeTruthy();
      expect(v.code).toBeTruthy();
    });
  });

  it("tests fixture query helper APIs", () => {
    expect(getMealOffers().length).toBe(MEAL_OFFERS.length);
    expect(getMealOfferById("coupon-demo-jollof")?.vendorName).toBe("PayWaka Demo Foods");
    expect(getMealOfferById("non-existent-id")).toBeNull();

    expect(getFictionalVendors().length).toBe(FICTIONAL_VENDORS.length);
    expect(getVendorById("demo-woodfire-pizza")?.category).toBe("Pizza & Pasta");
    expect(getVendorById("non-existent-vendor")).toBeNull();

    expect(getUserVouchers("all").length).toBe(MOCK_USER_VOUCHERS.length);
    expect(getUserVouchers("active").every((v) => v.status === "active")).toBe(true);
    expect(getUserVoucherById("vch-act-1")?.code).toBe("PWK-DEMO-4920");
    expect(getUserVoucherById("non-existent-voucher")).toBeNull();
  });

  it("verifies Phase 3 lifetime claim limit and active voucher state metadata", () => {
    MEAL_OFFERS.forEach((offer) => {
      expect(offer.maxLifetimeClaims).toBe(2);
      expect(typeof offer.lifetimeClaimCount).toBe("number");
      expect(offer.lifetimeClaimCount).toBeGreaterThanOrEqual(0);
      expect(offer.lifetimeClaimCount).toBeLessThanOrEqual(offer.maxLifetimeClaims);
      expect(typeof offer.hasActiveVoucher).toBe("boolean");
    });

    // Check specific state representations
    const withActiveVoucher = MEAL_OFFERS.find((o) => o.hasActiveVoucher);
    expect(withActiveVoucher).toBeDefined();
    expect(withActiveVoucher.activeVoucherId).toBeTruthy();

    const withLimitReached = MEAL_OFFERS.find((o) => o.lifetimeClaimCount === 2);
    expect(withLimitReached).toBeDefined();
    expect(withLimitReached.id).toBe("coupon-demo-burger");

    const withClaimsRemaining = MEAL_OFFERS.filter((o) => o.lifetimeClaimCount < 2);
    expect(withClaimsRemaining.length).toBeGreaterThan(0);
  });
});

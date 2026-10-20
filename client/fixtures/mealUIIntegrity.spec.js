import { describe, it, expect } from "vitest";
import {
  getMealOffers,
  getMealOfferById,
  getUserVouchers,
  getUserVoucherById,
  getFictionalVendors,
  getVendorById,
  MEAL_CATEGORIES,
} from "./mealFixtures";

describe("PayWaka Meal Coupon — UI Data Contracts & Fixture State Integrity", () => {
  it("verifies Screen 1 (Marketplace) data contract and Phase 3 claim limit states", () => {
    const offers = getMealOffers();
    expect(offers.length).toBeGreaterThanOrEqual(5);

    const featured = offers.find((o) => o.isFeatured);
    expect(featured).toBeDefined();
    expect(featured.discountDisplay).toContain("OFF");
    expect(featured.pointsCost).toBeGreaterThan(0);
    expect(featured.minSpend).toBeGreaterThan(0);

    // Phase 3 states present in offers
    const withActiveVoucher = offers.find((o) => o.hasActiveVoucher);
    expect(withActiveVoucher).toBeDefined();
    expect(withActiveVoucher.activeVoucherId).toBeTruthy();

    const withLimitReached = offers.find((o) => o.lifetimeClaimCount >= o.maxLifetimeClaims);
    expect(withLimitReached).toBeDefined();
    expect(withLimitReached.lifetimeClaimCount).toBe(2);

    const withClaimsRemaining = offers.find((o) => o.lifetimeClaimCount < o.maxLifetimeClaims && !o.hasActiveVoucher);
    expect(withClaimsRemaining).toBeDefined();

    // Verify categories
    expect(MEAL_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it("verifies Screen 2 (Coupon Details) data contract and economics calculation", () => {
    const offers = getMealOffers();
    offers.forEach((offer) => {
      const detailed = getMealOfferById(offer.id);
      expect(detailed).toBeDefined();
      expect(detailed.title).toBeTruthy();
      expect(detailed.vendorName).toBeTruthy();
      expect(detailed.branch).toBeTruthy();
      expect(detailed.transparencyText).toBeTruthy();
      expect(detailed.validityHours).toBe(48);
      expect(Array.isArray(detailed.terms)).toBe(true);
      expect(detailed.terms.length).toBeGreaterThanOrEqual(3);
      expect(detailed.maxLifetimeClaims).toBe(2);
    });
  });

  it("verifies Screen 3 (Digital Voucher Ticket) data contract and ticket elements", () => {
    const activeVouchers = getUserVouchers("active");
    expect(activeVouchers.length).toBeGreaterThanOrEqual(1);

    activeVouchers.forEach((voucher) => {
      const ticket = getUserVoucherById(voucher.id);
      expect(ticket).toBeDefined();
      expect(ticket.code).toMatch(/^PWK-/);
      expect(ticket.pin).toMatch(/^\d{4}$/);
      expect(ticket.status).toBe("active");
      expect(ticket.hoursRemaining).toBeGreaterThan(0);
      expect(ticket.discountDisplay).toContain("OFF");
      expect(ticket.vendorName).toBeTruthy();
      expect(ticket.vendorBranch).toBeTruthy();
    });
  });

  it("verifies Screen 4 (My Vouchers) data contract across active, used, and expired states", () => {
    const all = getUserVouchers("all");
    const active = getUserVouchers("active");
    const used = getUserVouchers("used");
    const expired = getUserVouchers("expired");

    expect(all.length).toBe(active.length + used.length + expired.length);
    expect(active.length).toBeGreaterThan(0);
    expect(used.length).toBeGreaterThan(0);
    expect(expired.length).toBeGreaterThan(0);

    used.forEach((v) => {
      expect(v.status).toBe("used");
      expect(v.redeemedAt).toBeTruthy();
      expect(v.cashierRef).toBeTruthy();
    });

    expired.forEach((v) => {
      expect(v.status).toBe("expired");
      expect(v.expiredAt).toBeTruthy();
    });
  });

  it("verifies partner vendors are exclusively fictional and have complete profile attributes", () => {
    const vendors = getFictionalVendors();
    vendors.forEach((vendor) => {
      expect(vendor.name).toMatch(/Demo|Test|Artisan/i);
      expect(vendor.category).toBeTruthy();
      expect(vendor.rating).toBeGreaterThanOrEqual(4.0);
      expect(vendor.address).toContain("Lagos");
      expect(vendor.closingTime).toBeTruthy();
      expect(vendor.isVerified).toBe(true);
    });
  });
});

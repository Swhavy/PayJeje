import { describe, it, expect } from "vitest";
import {
  resolveOfferAvailability,
  validatePublicOfferTerms,
  validateOfferIdentity,
  resolveBundledMealImage,
  BUNDLED_MEAL_IMAGES,
} from "./mealOfferUtils.js";

describe("PayWaka Meal Offer Utilities & Fail-Closed Validators", () => {
  describe("resolveOfferAvailability", () => {
    it("fails closed for undefined, null, or non-object inputs", () => {
      [undefined, null, "invalid", 123, []].forEach((input) => {
        const res = resolveOfferAvailability(input);
        expect(res.isActionable).toBe(false);
        expect(res.badgeLabel).toBe("Unavailable");
        expect(res.badgeStyle).toBe("zinc");
        expect(res.statusReason).toBe("malformed");
      });
    });

    it("correctly identifies administrative emergency_halt and fails closed", () => {
      const res = resolveOfferAvailability({ status: "emergency_halt", isAvailable: true });
      expect(res.isActionable).toBe(false);
      expect(res.badgeLabel).toBe("Administrative Halt");
      expect(res.badgeStyle).toBe("rose");
      expect(res.statusReason).toBe("emergency_halt");
      expect(res.buttonText).toContain("Halted");
    });

    it("correctly identifies merchant paused status and fails closed", () => {
      const res = resolveOfferAvailability({ status: "paused", isAvailable: true });
      expect(res.isActionable).toBe(false);
      expect(res.badgeLabel).toBe("Offer Paused");
      expect(res.badgeStyle).toBe("amber");
      expect(res.statusReason).toBe("paused");
      expect(res.buttonText).toContain("Paused");
    });

    it("correctly identifies concluded/ended status and fails closed", () => {
      const res = resolveOfferAvailability({ status: "ended", isAvailable: true });
      expect(res.isActionable).toBe(false);
      expect(res.badgeLabel).toBe("Offer Ended");
      expect(res.badgeStyle).toBe("zinc");
      expect(res.statusReason).toBe("ended");
      expect(res.buttonText).toContain("Concluded");
    });

    it("correctly identifies sold out state (active status but isAvailable is false)", () => {
      const res = resolveOfferAvailability({ status: "active", isAvailable: false });
      expect(res.isActionable).toBe(false);
      expect(res.badgeLabel).toBe("Sold Out");
      expect(res.badgeStyle).toBe("zinc");
      expect(res.statusReason).toBe("sold_out");
      expect(res.buttonText).toContain("Sold Out");
    });

    it("enables action ONLY when status is strictly 'active' and isAvailable is strictly true", () => {
      const res = resolveOfferAvailability({ status: "active", isAvailable: true });
      expect(res.isActionable).toBe(true);
      expect(res.badgeLabel).toBe("Available");
      expect(res.badgeStyle).toBe("emerald");
      expect(res.statusReason).toBe("available");
      expect(res.buttonText).toBe("Unlock Voucher");
    });

    it("fails closed for unknown, missing, or malformed status values", () => {
      ["draft", "archived", "pending", "", "ACTIVE", null, undefined].forEach((status) => {
        const res = resolveOfferAvailability({ status, isAvailable: true });
        expect(res.isActionable).toBe(false);
        expect(res.badgeLabel).toBe("Unavailable");
        expect(res.statusReason).toBe("unknown_status");
      });
    });

    it("fails closed when isAvailable is not boolean true (truthy values like 1 or 'true')", () => {
      [1, "true", "yes", {}, []].forEach((isAvailable) => {
        const res = resolveOfferAvailability({ status: "active", isAvailable });
        expect(res.isActionable).toBe(false);
        expect(res.badgeLabel).toBe("Unavailable");
      });
    });
  });

  describe("validatePublicOfferTerms", () => {
    const validTerms = {
      discountNaira: 500,
      minSpendNaira: 2500,
      pointsCost: 100,
      vendorName: "PayWaka Partner Food",
      title: "₦500 Meal Discount Voucher",
    };

    it("validates well-formed terms correctly without modifying values", () => {
      const res = validatePublicOfferTerms(validTerms);
      expect(res.isValid).toBe(true);
      expect(res.discountNaira).toBe(500);
      expect(res.minSpendNaira).toBe(2500);
      expect(res.pointsCost).toBe(100);
      expect(res.discountDisplay).toBe("₦500 OFF");
      expect(res.minSpendDisplay).toBe("₦2,500");
    });

    it("fails closed when discountNaira is missing, null, undefined, or zero (NO defaults invented)", () => {
      [undefined, null, 0, -100, NaN, "invalid"].forEach((discountNaira) => {
        const input = { ...validTerms, discountNaira };
        const res = validatePublicOfferTerms(input);
        expect(res.isValid).toBe(false);
        expect(res.reason).toBe("INVALID_DISCOUNT_AMOUNT");
        // Verify no default (like 500) was invented
        expect(res.discountNaira).toBeUndefined();
      });
    });

    it("fails closed when minSpendNaira is missing, null, undefined, or less than discountNaira (NO defaults invented)", () => {
      [undefined, null, NaN, 0, 499, -500].forEach((minSpendNaira) => {
        const input = { ...validTerms, minSpendNaira };
        const res = validatePublicOfferTerms(input);
        expect(res.isValid).toBe(false);
        expect(res.reason).toBe("INVALID_MIN_SPEND");
        // Verify no default (like 2500) was invented
        expect(res.minSpendNaira).toBeUndefined();
      });
    });

    it("fails closed when pointsCost is invalid or negative", () => {
      [-1, NaN, "abc", null, undefined].forEach((pointsCost) => {
        const input = { ...validTerms, pointsCost };
        const res = validatePublicOfferTerms(input);
        expect(res.isValid).toBe(false);
        expect(res.reason).toBe("INVALID_POINTS_COST");
      });
    });

    it("fails closed when vendorName is missing, empty, or whitespace", () => {
      ["", "   ", null, undefined, 123].forEach((vendorName) => {
        const input = { ...validTerms, vendorName };
        const res = validatePublicOfferTerms(input);
        expect(res.isValid).toBe(false);
        expect(res.reason).toBe("MISSING_VENDOR_NAME");
      });
    });

    it("fails closed when title is missing, empty, or whitespace", () => {
      ["", "   ", null, undefined, 123].forEach((title) => {
        const input = { ...validTerms, title };
        const res = validatePublicOfferTerms(input);
        expect(res.isValid).toBe(false);
        expect(res.reason).toBe("MISSING_TITLE");
      });
    });
  });

  describe("validateOfferIdentity", () => {
    function createMockDocSnap(id, data, exists = true) {
      return {
        id,
        exists: () => exists,
        data: () => data,
      };
    }

    it("fails closed when document snapshot does not exist", () => {
      const snap = createMockDocSnap("camp-123", null, false);
      const res = validateOfferIdentity(snap, "camp-123");
      expect(res.isValid).toBe(false);
      expect(res.reason).toBe("DOCUMENT_NOT_FOUND");
    });

    it("fails closed when snapshot ID does not match route couponId", () => {
      const snap = createMockDocSnap("camp-456", {
        campaignId: "camp-456",
        offerId: "coupon-456",
      });
      const res = validateOfferIdentity(snap, "different-route-id");
      expect(res.isValid).toBe(false);
      expect(res.reason).toBe("ROUTE_DOCUMENT_MISMATCH");
    });

    it("fails closed when campaignId is missing or does not match snapshot ID", () => {
      const missingSnap = createMockDocSnap("camp-123", {
        offerId: "coupon-123",
      });
      expect(validateOfferIdentity(missingSnap, "camp-123")).toEqual({
        isValid: false,
        reason: "CAMPAIGN_ID_INCONSISTENCY",
        message: "Explicit campaignId is missing or does not match document ID.",
      });

      const mismatchSnap = createMockDocSnap("camp-123", {
        campaignId: "camp-other",
        offerId: "coupon-123",
      });
      expect(validateOfferIdentity(mismatchSnap, "camp-123")).toEqual({
        isValid: false,
        reason: "CAMPAIGN_ID_INCONSISTENCY",
        message: "Explicit campaignId is missing or does not match document ID.",
      });
    });

    it("fails closed when explicit 'id' field contradicts snapshot ID", () => {
      const snap = createMockDocSnap("camp-123", {
        id: "contradictory-id",
        campaignId: "camp-123",
        offerId: "coupon-123",
      });
      const res = validateOfferIdentity(snap, "camp-123");
      expect(res.isValid).toBe(false);
      expect(res.reason).toBe("ID_FIELD_INCONSISTENCY");
    });

    it("fails closed when offerId is missing or empty (zero silent fallback to doc ID)", () => {
      ["", "   ", null, undefined].forEach((offerId) => {
        const snap = createMockDocSnap("camp-123", {
          campaignId: "camp-123",
          offerId,
        });
        const res = validateOfferIdentity(snap, "camp-123");
        expect(res.isValid).toBe(false);
        expect(res.reason).toBe("MISSING_OFFER_ID");
        // Verify canonicalOfferId is NOT defaulted to doc ID
        expect(res.canonicalOfferId).toBeUndefined();
      });
    });

    it("validates canonical identity where campaignId === offerId === docId", () => {
      const snap = createMockDocSnap("camp-jollof-2026", {
        id: "camp-jollof-2026",
        campaignId: "camp-jollof-2026",
        offerId: "camp-jollof-2026",
      });
      const res = validateOfferIdentity(snap, "camp-jollof-2026");
      expect(res.isValid).toBe(true);
      expect(res.canonicalDocumentId).toBe("camp-jollof-2026");
      expect(res.canonicalCampaignId).toBe("camp-jollof-2026");
      expect(res.canonicalOfferId).toBe("camp-jollof-2026");
      expect(res.isLegacyIdentity).toBe(false);
    });

    it("validates legitimate legacy identity where offerId !== campaignId without falling back", () => {
      const snap = createMockDocSnap("camp-demo-jollof", {
        id: "camp-demo-jollof",
        campaignId: "camp-demo-jollof",
        offerId: "coupon-demo-jollof",
      });
      const res = validateOfferIdentity(snap, "camp-demo-jollof");
      expect(res.isValid).toBe(true);
      expect(res.canonicalDocumentId).toBe("camp-demo-jollof");
      expect(res.canonicalCampaignId).toBe("camp-demo-jollof");
      expect(res.canonicalOfferId).toBe("coupon-demo-jollof");
      expect(res.isLegacyIdentity).toBe(true);
    });
  });

  describe("resolveBundledMealImage", () => {
    it("maps pizza keywords to stone-pizza.png", () => {
      expect(resolveBundledMealImage("Italian", "Woodfire Pizza", "Pizzeria")).toBe(BUNDLED_MEAL_IMAGES.pizza);
    });

    it("maps burger keywords to gourmet-burger.png", () => {
      expect(resolveBundledMealImage("Fast Food", "Double Beef Burger", "Burger Joint")).toBe(BUNDLED_MEAL_IMAGES.burger);
    });

    it("maps bakery keywords to bakery-coffee.png", () => {
      expect(resolveBundledMealImage("Café", "Croissant & Latte", "Artisan Bakery")).toBe(BUNDLED_MEAL_IMAGES.bakery);
    });

    it("falls back to jollof-chicken.png for local or unmapped meals", () => {
      expect(resolveBundledMealImage("Local Delicacies", "Smoky Party Jollof", "Lagos Kitchen")).toBe(BUNDLED_MEAL_IMAGES.jollof);
      expect(resolveBundledMealImage("", "", "")).toBe(BUNDLED_MEAL_IMAGES.jollof);
    });
  });
});

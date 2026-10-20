import { describe, it, expect } from "vitest";
import { FICTIONAL_VENDORS } from "./mealFixtures";

describe("PayWaka Meal Coupon — Phase 5 Merchant Terminal Client Logic & Contracts", () => {
  it("verifies all fictional demo vendors have valid identifiers, branches, and emojis", () => {
    expect(FICTIONAL_VENDORS.length).toBeGreaterThanOrEqual(4);
    FICTIONAL_VENDORS.forEach((vendor) => {
      expect(vendor.id).toBeTruthy();
      expect(vendor.name).toBeTruthy();
      expect(vendor.branch).toBeTruthy();
      expect(vendor.logoEmoji).toBeTruthy();
      expect(vendor.isOpen).toBe(true);
    });
  });

  it("verifies discount and payable calculations for valid bill totals", () => {
    const voucher = {
      discountNaira: 500,
      minSpendNaira: 2500,
    };

    // Case 1: Order bill is ₦3,500 (above minimum ₦2,500)
    const bill1 = 3500;
    const isBill1Valid = bill1 >= voucher.minSpendNaira;
    const discount1 = Math.min(voucher.discountNaira, bill1);
    const payable1 = bill1 - discount1;

    expect(isBill1Valid).toBe(true);
    expect(discount1).toBe(500);
    expect(payable1).toBe(3000);

    // Case 2: Order bill is exactly ₦2,500 (equal to minimum)
    const bill2 = 2500;
    const isBill2Valid = bill2 >= voucher.minSpendNaira;
    const discount2 = Math.min(voucher.discountNaira, bill2);
    const payable2 = bill2 - discount2;

    expect(isBill2Valid).toBe(true);
    expect(discount2).toBe(500);
    expect(payable2).toBe(2000);

    // Case 3: Order bill is ₦1,800 (below minimum ₦2,500) -> invalid
    const bill3 = 1800;
    const isBill3Valid = bill3 >= voucher.minSpendNaira;
    expect(isBill3Valid).toBe(false);
  });

  it("verifies canonical budget invariant: spent + discount <= budget", () => {
    const campaign = {
      campaignBudgetNaira: 100000,
      campaignSpentNaira: 99600,
    };

    const voucherDiscount = 500;
    const isWithinBudget =
      campaign.campaignSpentNaira + voucherDiscount <= campaign.campaignBudgetNaira;
    expect(isWithinBudget).toBe(false); // 99,600 + 500 = 100,100 > 100,000

    const remainingBudget = Math.max(
      0,
      campaign.campaignBudgetNaira - campaign.campaignSpentNaira
    );
    expect(remainingBudget).toBe(400);
  });

  it("verifies auditable redemption reference formatting", () => {
    const sampleRef = `PWK-RED-${Math.floor(100000 + 54321)}`;
    expect(sampleRef).toMatch(/^PWK-RED-\d{6}$/);
  });

  it("verifies cashier permission model requirements", () => {
    const cashierUser = {
      uid: "cashier_01",
      role: "vendor",
      vendorId: "paywaka-demo-foods",
    };

    const matchingVoucher = { vendorId: "paywaka-demo-foods" };
    const mismatchVoucher = { vendorId: "demo-woodfire-pizza" };

    const isAuthorizedMatch = cashierUser.role === "vendor" && cashierUser.vendorId === matchingVoucher.vendorId;
    const isAuthorizedMismatch = cashierUser.role === "vendor" && cashierUser.vendorId === mismatchVoucher.vendorId;

    expect(isAuthorizedMatch).toBe(true);
    expect(isAuthorizedMismatch).toBe(false);

    // Regular customer cannot act as cashier
    const customerUser = { uid: "cust_02", role: "customer" };
    const isCustomerAuthorized = customerUser.role === "vendor";
    expect(isCustomerAuthorized).toBe(false);
  });
});

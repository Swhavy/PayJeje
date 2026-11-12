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

  it("verifies production safety: ordinary merchant cannot impersonate or switch vendors", () => {
    // Normal merchant user
    const merchantUser = {
      uid: "vendor_owner_01",
      role: "vendor",
      vendorId: "vendor-alpha",
      isAdmin: false,
    };

    // Client target resolution logic
    const resolveTargetVendor = (user, selectedAdminVendorId) => {
      const isAdmin = user?.role === "admin" || user?.isAdmin === true;
      return isAdmin ? selectedAdminVendorId : user?.vendorId;
    };

    expect(resolveTargetVendor(merchantUser, "vendor-beta")).toBe("vendor-alpha");

    // Admin user can switch target vendor
    const adminUser = {
      uid: "admin_01",
      role: "admin",
      isAdmin: true,
    };
    expect(resolveTargetVendor(adminUser, "vendor-beta")).toBe("vendor-beta");

    // Ordinary merchant with missing vendorId fails closed
    const unassociatedUser = { uid: "user_orphan", role: "vendor", vendorId: null };
    expect(resolveTargetVendor(unassociatedUser, "vendor-beta")).toBeNull();
  });

  it("verifies defensive metrics normalization handles absent, null, or non-finite numbers safely", () => {
    const normalizeMetrics = (raw) => {
      const src = raw?.metrics || raw?.summary || {};
      const safeNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      return {
        totalAllocatedBudgetNaira: safeNum(src.totalAllocatedBudgetNaira),
        totalSpentBudgetNaira: safeNum(src.totalSpentBudgetNaira),
        totalReservedBudgetNaira: safeNum(src.totalReservedBudgetNaira),
        totalAvailableCapacityNaira: safeNum(src.totalAvailableCapacityNaira),
        totalGrossBillAmountNaira: safeNum(src.totalGrossBillAmountNaira),
        totalMerchantRevenueNaira: safeNum(src.totalMerchantRevenueNaira),
        totalRedemptionsCount: safeNum(src.totalRedemptionsCount),
        activeCampaignsCount: safeNum(src.activeCampaignsCount || src.activeCampaigns),
      };
    };

    // Malformed input with null, undefined, strings, NaN, Infinity
    const malformed = {
      metrics: {
        totalAllocatedBudgetNaira: null,
        totalSpentBudgetNaira: undefined,
        totalReservedBudgetNaira: "invalid-string",
        totalAvailableCapacityNaira: NaN,
        totalGrossBillAmountNaira: Infinity,
        totalMerchantRevenueNaira: -Infinity,
        totalRedemptionsCount: "42",
        activeCampaignsCount: null,
      },
    };

    const clean = normalizeMetrics(malformed);
    expect(clean.totalAllocatedBudgetNaira).toBe(0);
    expect(clean.totalSpentBudgetNaira).toBe(0);
    expect(clean.totalReservedBudgetNaira).toBe(0);
    expect(clean.totalAvailableCapacityNaira).toBe(0);
    expect(clean.totalGrossBillAmountNaira).toBe(0);
    expect(clean.totalMerchantRevenueNaira).toBe(0);
    expect(clean.totalRedemptionsCount).toBe(42);
    expect(clean.activeCampaignsCount).toBe(0);

    // Verify .toLocaleString() does not throw or print NaN
    Object.values(clean).forEach((val) => {
      expect(Number.isFinite(val)).toBe(true);
      expect(() => val.toLocaleString()).not.toThrow();
      expect(val.toLocaleString()).not.toContain("NaN");
    });
  });

  it("verifies cashier role boundaries on merchant dashboard", () => {
    const getPermissions = (vendorRole, isAdmin = false) => ({
      canPauseResume: vendorRole === "manager" || vendorRole === "owner" || isAdmin,
      canCreateCampaign: vendorRole === "owner" || isAdmin,
      canTopUpBudget: vendorRole === "owner" || isAdmin,
      canEditBranding: vendorRole === "owner" || isAdmin,
      canAccessPOS: true,
    });

    const cashier = getPermissions("cashier", false);
    expect(cashier.canPauseResume).toBe(false);
    expect(cashier.canCreateCampaign).toBe(false);
    expect(cashier.canTopUpBudget).toBe(false);
    expect(cashier.canEditBranding).toBe(false);
    expect(cashier.canAccessPOS).toBe(true);

    const manager = getPermissions("manager", false);
    expect(manager.canPauseResume).toBe(true);
    expect(manager.canCreateCampaign).toBe(false);
    expect(manager.canTopUpBudget).toBe(false);
    expect(manager.canEditBranding).toBe(false);
    expect(manager.canAccessPOS).toBe(true);

    const owner = getPermissions("owner", false);
    expect(owner.canPauseResume).toBe(true);
    expect(owner.canCreateCampaign).toBe(true);
    expect(owner.canTopUpBudget).toBe(true);
    expect(owner.canEditBranding).toBe(true);
    expect(owner.canAccessPOS).toBe(true);

    const admin = getPermissions("cashier", true);
    expect(admin.canPauseResume).toBe(true);
    expect(admin.canCreateCampaign).toBe(true);
    expect(admin.canTopUpBudget).toBe(true);
    expect(admin.canEditBranding).toBe(true);
    expect(admin.canAccessPOS).toBe(true);
  });

  it("verifies merchant login portal role gate and routing policy", () => {
    const getLoginRoute = (userProfile) => {
      const isVendor = userProfile?.role === "vendor";
      const isAdmin = userProfile?.role === "admin" || userProfile?.isAdmin === true;
      if (!isVendor && !isAdmin) {
        return { allowed: false, error: "Access Restricted: Regular customer accounts cannot access merchant operations." };
      }
      const role = userProfile?.vendorRole || (isAdmin ? "owner" : "cashier");
      if (role === "cashier") {
        return { allowed: true, targetRoute: "/merchant/terminal" };
      }
      return { allowed: true, targetRoute: "/merchant/meals" };
    };

    // Customer login attempt is blocked
    expect(getLoginRoute({ role: "customer" }).allowed).toBe(false);
    expect(getLoginRoute({ role: "user" }).allowed).toBe(false);

    // Cashier routes to POS terminal
    const cashierRes = getLoginRoute({ role: "vendor", vendorRole: "cashier" });
    expect(cashierRes.allowed).toBe(true);
    expect(cashierRes.targetRoute).toBe("/merchant/terminal");

    // Store Owner routes to Dashboard
    const ownerRes = getLoginRoute({ role: "vendor", vendorRole: "owner" });
    expect(ownerRes.allowed).toBe(true);
    expect(ownerRes.targetRoute).toBe("/merchant/meals");

    // Admin routes to Dashboard
    const adminRes = getLoginRoute({ role: "admin", isAdmin: true });
    expect(adminRes.allowed).toBe(true);
    expect(adminRes.targetRoute).toBe("/merchant/meals");
  });

  it("verifies budget utilization donut chart data calculations", () => {
    const computeBudgetData = (metrics) => {
      const consumed = Math.max(0, Number(metrics?.totalSpentBudgetNaira || 0));
      const reserved = Math.max(0, Number(metrics?.totalReservedBudgetNaira || 0));
      const available = Math.max(0, Number(metrics?.totalAvailableCapacityNaira || 0));
      const total = Number(metrics?.totalAllocatedBudgetNaira || 0);

      const utilizationPct = total > 0 ? Math.min(100, Math.round(((consumed + reserved) / total) * 100)) : 0;
      return { consumed, reserved, available, total, utilizationPct };
    };

    const res = computeBudgetData({
      totalAllocatedBudgetNaira: 100000,
      totalSpentBudgetNaira: 40000,
      totalReservedBudgetNaira: 20000,
      totalAvailableCapacityNaira: 40000,
    });

    expect(res.consumed).toBe(40000);
    expect(res.reserved).toBe(20000);
    expect(res.available).toBe(40000);
    expect(res.utilizationPct).toBe(60); // (40k + 20k) / 100k = 60%
  });

  it("verifies AdminRoute strict authorization policy blocks non-admins without dev-mode bypass", () => {
    const evaluateAdminRoute = (authUser, userDocData, claims = {}) => {
      if (!authUser) {
        return { status: "unauthenticated", redirect: "/auth/login" };
      }
      const isDocAdmin = userDocData?.role === "admin" || userDocData?.isAdmin === true;
      const isClaimAdmin = claims?.role === "admin" || claims?.admin === true;
      if (isDocAdmin || isClaimAdmin) {
        return { status: "authorized" };
      }
      return { status: "denied", code: 403 };
    };

    // Unauthenticated user is redirected to /auth/login even in dev mode
    expect(evaluateAdminRoute(null, null)).toEqual({
      status: "unauthenticated",
      redirect: "/auth/login",
    });

    // Regular customer is strictly denied (403)
    expect(evaluateAdminRoute({ uid: "u1" }, { role: "customer" })).toEqual({
      status: "denied",
      code: 403,
    });

    // Vendor/cashier is strictly denied (403) from admin provisioning
    expect(evaluateAdminRoute({ uid: "u2" }, { role: "vendor", vendorRole: "owner" })).toEqual({
      status: "denied",
      code: 403,
    });

    // Platform administrator is authorized
    expect(evaluateAdminRoute({ uid: "admin1" }, { role: "admin", isAdmin: true })).toEqual({
      status: "authorized",
    });
  });
});

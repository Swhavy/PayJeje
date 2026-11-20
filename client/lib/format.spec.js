import { describe, expect, it } from "vitest";
import {
  formatCashback,
  formatNaira,
  formatPlanPrice,
  formatPoints,
  formatSignedNaira,
  parseNumericAmount,
} from "./format";

describe("PayWaka currency & quantity formatters", () => {
  it("formats balances and receipts with 2 decimals and no space after ₦", () => {
    expect(formatNaira(0)).toBe("₦0.00");
    expect(formatNaira(100)).toBe("₦100.00");
    expect(formatNaira(1234)).toBe("₦1,234.00");
    expect(formatNaira("1234.5")).toBe("₦1,234.50");
    expect(formatNaira(-500)).toBe("-₦500.00");
    expect(formatNaira(null)).toBe("₦0.00");
    expect(formatNaira(undefined)).toBe("₦0.00");
  });

  it("formats plan prices without trailing .00 for whole Naira and keeps kobo when fractional", () => {
    expect(formatPlanPrice(0)).toBe("₦0");
    expect(formatPlanPrice(530)).toBe("₦530");
    expect(formatPlanPrice(1234)).toBe("₦1,234");
    expect(formatPlanPrice(1234.5)).toBe("₦1,234.50");
    expect(formatPlanPrice("₦ 2,500")).toBe("₦2,500");
  });

  it("formats cashback chips cleanly", () => {
    expect(formatCashback(0)).toBe("₦0");
    expect(formatCashback(-5)).toBe("₦0");
    expect(formatCashback(3)).toBe("+₦3");
    expect(formatCashback(3.5)).toBe("+₦3.50");
  });

  it("formats signed inflow and outflow amounts", () => {
    expect(formatSignedNaira(1234, true)).toBe("+₦1,234.00");
    expect(formatSignedNaira(-1234, false)).toBe("-₦1,234.00");
    expect(formatSignedNaira(500, false, { decimals: 0 })).toBe("-₦500");
  });

  it("formats singular and plural points correctly", () => {
    expect(formatPoints(0)).toBe("0 points");
    expect(formatPoints(1)).toBe("1 point");
    expect(formatPoints(2)).toBe("2 points");
    expect(formatPoints(1250)).toBe("1,250 points");
  });

  it("parses formatted strings safely", () => {
    expect(parseNumericAmount("₦ 1,234.50")).toBe(1234.5);
    expect(parseNumericAmount("bad")).toBe(0);
  });
});

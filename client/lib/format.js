/**
 * Single PayWaka currency & quantity formatting utilities.
 * Rules:
 *   - Never put a space after ₦ (always ₦1,234.00 or ₦1,234).
 *   - Balances and receipts: always 2 decimal places (₦1,234.00).
 *   - Plan prices and quick chips: whole Naira when integer (₦1,234), 2 decimals if fractional.
 */

export function parseNumericAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function formatNaira(value, options = {}) {
  const { decimals = 2 } = options;
  const raw = parseNumericAmount(value);
  const sign = raw < 0 ? "-" : "";
  const abs = Math.abs(raw);
  const formatted = abs.toLocaleString("en-NG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}₦${formatted}`;
}

export function formatPlanPrice(value) {
  const raw = Math.abs(parseNumericAmount(value));
  const rounded = Math.round(raw * 100) / 100;
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.001;
  return formatNaira(rounded, { decimals: hasCents ? 2 : 0 });
}

export function formatCashback(value) {
  const raw = Math.max(0, parseNumericAmount(value));
  if (raw <= 0) return "₦0";
  const rounded = Math.round(raw * 100) / 100;
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.001;
  const formatted = rounded.toLocaleString("en-NG", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `+₦${formatted}`;
}

export function formatSignedNaira(value, isCredit = false, options = {}) {
  const { decimals = 2 } = options;
  const abs = Math.abs(parseNumericAmount(value));
  const prefix = isCredit ? "+" : "-";
  return `${prefix}${formatNaira(abs, { decimals })}`;
}

export function formatPoints(count) {
  const n = Math.trunc(parseNumericAmount(count));
  const abs = Math.abs(n);
  return `${n.toLocaleString("en-NG")} ${abs === 1 ? "point" : "points"}`;
}

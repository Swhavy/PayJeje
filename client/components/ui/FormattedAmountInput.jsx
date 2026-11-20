import React, { useState } from "react";

// Converts a whole Naira amount into English words (up to billions) for instant visual verification
function amountToNairaWords(num) {
  if (!num || isNaN(num) || num <= 0) return "";
  const n = Math.floor(num);
  if (n === 0) return "Zero Naira";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(val) {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
    if (val < 1000) return a[Math.floor(val / 100)] + " Hundred" + (val % 100 !== 0 ? " and " + inWords(val % 100) : "");
    if (val < 1000000) return inWords(Math.floor(val / 1000)) + " Thousand" + (val % 1000 !== 0 ? " " + inWords(val % 1000) : "");
    if (val < 1000000000) return inWords(Math.floor(val / 1000000)) + " Million" + (val % 1000000 !== 0 ? " " + inWords(val % 1000000) : "");
    return inWords(Math.floor(val / 1000000000)) + " Billion" + (val % 1000000000 !== 0 ? " " + inWords(val % 1000000000) : "");
  }

  return `${inWords(n)} Naira`;
}

// Determines place value category using brand / warning / destructive tokens only
function getPlaceValueCategory(num) {
  if (!num || num <= 0) return null;
  const n = Math.floor(num);
  if (n < 10) return { label: "Units", className: "pw-chip" };
  if (n < 100) return { label: "Tens", className: "pw-chip-brand" };
  if (n < 1000) return { label: "Hundreds", className: "pw-chip-brand" };
  if (n < 10000) return { label: "Thousands", className: "pw-chip-brand" };
  if (n < 100000) return { label: "Tens of Thousands", className: "pw-chip-brand" };
  if (n < 1000000) {
    return {
      label: "Hundreds of Thousands",
      className: "inline-flex items-center gap-1 rounded-pill border border-warning/30 bg-warning/10 px-2 py-0.5 text-caption font-bold text-warning",
    };
  }
  return {
    label: n < 10000000 ? "Millions" : "Tens of Millions+",
    className: "inline-flex items-center gap-1 rounded-pill border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-caption font-bold text-destructive",
  };
}

export default function FormattedAmountInput({
  value,
  onChange,
  placeholder = "0.00",
  disabled = false,
  className = "",
  id = "formatted-amount-input",
  name = "amount",
  max = null,
  min = null,
  autoFocus = false,
  showWords = true,
}) {
  const [, setIsFocused] = useState(false);
  const rawNum = Number(String(value || "").replace(/[^\d.]/g, ""));
  const placeValue = getPlaceValueCategory(rawNum);
  const words = amountToNairaWords(rawNum);

  const formatWithCommas = (val) => {
    if (val === undefined || val === null || val === "") return "";
    const clean = String(val).replace(/[^\d.]/g, "");
    const parts = clean.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.slice(0, 2).join(".");
  };

  const handleChange = (e) => {
    const rawVal = e.target.value.replace(/,/g, "");
    if (rawVal === "" || /^\d*\.?\d*$/.test(rawVal)) {
      if (max !== null && Number(rawVal) > max) {
        onChange?.(String(max));
      } else {
        onChange?.(rawVal);
      }
    }
  };

  return (
    <div className="relative w-full space-y-1.5">
      {rawNum > 0 && placeValue && (
        <div className="flex items-center justify-between gap-2 px-0.5 text-caption">
          <div className={placeValue.className}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            <span>
              Place Value: <strong>{placeValue.label}</strong>
            </span>
          </div>
          {showWords && words && (
            <span className="text-caption font-semibold text-muted-foreground truncate max-w-[200px] sm:max-w-[280px]" title={words}>
              {words}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <span className="absolute left-3.5 z-10 text-sm font-mono font-bold text-muted-foreground pointer-events-none select-none">
          ₦
        </span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={formatWithCommas(value)}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`pw-input h-11 pl-8 pr-3.5 text-sm font-mono tabular-nums font-bold ${className}`}
        />
      </div>
    </div>
  );
}

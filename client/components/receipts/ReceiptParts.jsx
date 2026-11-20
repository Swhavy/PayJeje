import React, { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatCashback, formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Brand gradient top strip matching the official PayWaka receipt.
 */
export function ReceiptStrip({ className = "" }) {
  return <div className={cn("h-1.5 w-full bg-brand-strip shrink-0", className)} />;
}

/**
 * Official PAYWAKA logo lockup + uppercase receipt subtitle.
 */
export function ReceiptWordmark({ subtitle = "TRANSACTION RECEIPT", className = "" }) {
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <div className="h-9 w-9 rounded-panel bg-brand-tint border border-brand-400/25 flex items-center justify-center shrink-0 p-1">
        <img
          src="/logo.png"
          alt="PayWaka"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0">
        <span className="block text-sm font-black tracking-tight text-foreground leading-none">
          PAYWAKA
        </span>
        {subtitle && (
          <span className="block pw-label text-brand-400 mt-1 truncate">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Unified receipt-style status pill (SUCCESSFUL / PENDING / FAILED / REFUNDED).
 */
export function ReceiptStatusPill({ status = "success", label, className = "" }) {
  const key = String(status || "success").toLowerCase();
  const resolvedVariant =
    key === "pending" || key === "processing" || key === "initiated"
      ? "pending"
      : key === "failed" || key === "declined" || key === "error"
        ? "failed"
        : key === "refunded"
          ? "refunded"
          : "success";

  const resolvedLabel =
    label ||
    (resolvedVariant === "pending"
      ? "PENDING"
      : resolvedVariant === "failed"
        ? "FAILED"
        : resolvedVariant === "refunded"
          ? "REFUNDED"
          : "SUCCESSFUL");

  const variantClasses =
    resolvedVariant === "pending"
      ? "bg-warning/10 border-warning/30 text-warning"
      : resolvedVariant === "failed"
        ? "bg-destructive/10 border-destructive/30 text-destructive"
        : "bg-brand-tint border-brand-400/30 text-brand-400";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-pill border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0",
        variantClasses,
        className,
      )}
    >
      {resolvedLabel}
    </span>
  );
}

/**
 * Hero monospace amount block matching the receipt's AMOUNT TRANSFERRED / PAID section.
 */
export function ReceiptAmount({
  label = "AMOUNT",
  amount = 0,
  positive = false,
  subtitle,
  className = "",
}) {
  return (
    <div className={cn("text-center space-y-1", className)}>
      <span className="pw-label block">{label}</span>
      <div
        className={cn(
          "pw-num text-3xl font-black tracking-tight leading-tight",
          positive ? "text-brand-400" : "text-foreground",
        )}
      >
        {formatNaira(amount)}
      </div>
      {subtitle && (
        <p className="text-caption text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * Ticket perforation dashed divider with edge semicircular notches.
 */
export function ReceiptPerforation({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative -mx-4 sm:-mx-5 flex items-center py-1", className)}
    >
      <span className="h-5 w-5 rounded-pill bg-background border-r border-border -ml-2.5 shrink-0" />
      <div className="flex-1 mx-2 pw-perforation" />
      <span className="h-5 w-5 rounded-pill bg-background border-l border-border -mr-2.5 shrink-0" />
    </div>
  );
}

/**
 * Copy button with instant feedback and 44x44px touch target friendliness.
 */
export function ReceiptCopyButton({ value, label = "Value", className = "" }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Unable to copy");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className={cn(
        "pw-tap pw-pressable inline-flex items-center justify-center rounded-panel border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground shrink-0",
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-brand-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

/**
 * Inner panel wrapping ReceiptRow items inside a sheet or mini-receipt.
 */
export function ReceiptRows({ children, className = "" }) {
  return (
    <div className={cn("pw-panel divide-y divide-border px-3.5 py-0.5", className)}>
      {children}
    </div>
  );
}

/**
 * Single label/value receipt row.
 */
export function ReceiptRow({
  label,
  value,
  mono = false,
  code = false,
  accent = false,
  copyValue,
  copyLabel,
  className = "",
}) {
  if (value === undefined || value === null || value === "" || value === "N/A") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2.5 text-sm",
        className,
      )}
    >
      <span className="text-caption font-medium text-muted-foreground shrink-0">
        {label}
      </span>
      <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
        <span
          className={cn(
            "text-right truncate font-semibold",
            code ? "pw-code" : mono && "pw-num",
            accent ? "text-brand-400" : "text-foreground",
          )}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </span>
        {copyValue && (
          <ReceiptCopyButton
            value={copyValue}
            label={copyLabel || label}
            className="h-9 w-9 min-h-9 min-w-9"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Brand-tinted cashback chip used on plan tiles, confirm sheets, and receipts.
 */
export function ReceiptCashbackChip({ amount = 0, label, className = "" }) {
  const num = Number(amount || 0);
  if (!label && num <= 0) return null;

  return (
    <span className={cn("pw-chip-brand", className)}>
      <Sparkles className="h-3 w-3 shrink-0" />
      <span>{label || `${formatCashback(num)} cashback`}</span>
    </span>
  );
}

/**
 * Subtle animated check circle for the Payment Successful mini-receipt.
 * Reduced-motion safe via CSS rules in global.css.
 */
export function ReceiptAnimatedCheck({ className = "" }) {
  return (
    <div
      className={cn(
        "pw-check-pop mx-auto h-14 w-14 rounded-pill bg-brand-tint border border-brand-400/30 flex items-center justify-center text-brand-400",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
      >
        <path d="M5 13l4 4L19 7" className="pw-check-draw" />
      </svg>
    </div>
  );
}

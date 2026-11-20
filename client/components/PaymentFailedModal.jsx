import React from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import {
  XCircle,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatNaira } from "@/lib/format";
import {
  ReceiptRow,
  ReceiptRows,
  ReceiptStatusPill,
} from "@/components/receipts/ReceiptParts";

export default function PaymentFailedModal({
  isOpen,
  onClose,
  onRetry,
  data = {},
}) {
  const navigate = useNavigate();

  const {
    category = "Transaction",
    productName = "Service",
    network = "",
    amount = 0,
    customerId = "",
    tx_ref = "",
    reason = "Transaction could not be completed by provider.",
    refunded = true,
  } = data;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      noPadding
      maxWidthClass="max-w-[440px]"
      ariaLabel="Payment Failed"
    >
      <div className="h-1.5 w-full bg-destructive shrink-0" />

      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-card-title text-foreground">Payment Failed</h2>
          <ReceiptStatusPill status="failed" label="FAILED" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-pill bg-destructive/10 border border-destructive/25 flex items-center justify-center text-destructive">
            <XCircle className="h-7 w-7" />
          </div>
          <p className="text-caption text-muted-foreground">
            We were unable to complete your {category || "bill"} purchase with the provider.
          </p>
        </div>

        {/* Wallet Safety / Refund Guarantee Banner */}
        <div
          className={`p-3.5 rounded-panel border flex items-start gap-2.5 text-caption ${
            refunded
              ? "bg-brand-tint border-brand-400/25 text-brand-400"
              : "bg-warning/10 border-warning/25 text-warning"
          }`}
        >
          {refunded ? (
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold block text-foreground">
              {refunded ? "Wallet Balance Protected & Refunded" : "Payment Incomplete"}
            </span>
            <span className="text-muted-foreground">
              {refunded
                ? "Your PayWaka wallet was not charged (or has been automatically refunded)."
                : "Please review your balance or contact support if your wallet was deducted."}
            </span>
          </div>
        </div>

        <ReceiptRows>
          <ReceiptRow label="Service" value={productName || category} />
          {network && network !== "Default" && (
            <ReceiptRow label="Network / Provider" value={network} />
          )}
          <ReceiptRow label="Recipient / ID" value={customerId} mono />
          {Number(amount || 0) > 0 && (
            <ReceiptRow label="Attempted Amount" value={formatNaira(amount)} mono />
          )}
          <ReceiptRow
            label="Reference"
            value={tx_ref}
            mono
            copyValue={tx_ref}
            copyLabel="Reference"
          />
        </ReceiptRows>

        <div className="pw-panel p-3 space-y-1">
          <span className="pw-label text-destructive block">REASON</span>
          <p className="text-caption text-muted-foreground leading-relaxed break-words">
            {reason || "Provider error. Please retry in a few moments."}
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-border pb-safe space-y-2 shrink-0 bg-card">
        {onRetry && (
          <Button
            type="button"
            variant="destructive"
            className="w-full h-12"
            onClick={() => {
              onClose();
              onRetry();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              navigate("/wallet");
            }}
          >
            Check Wallet
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              navigate("/settings");
            }}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Support</span>
          </Button>
        </div>
      </div>
    </ModalPortal>
  );
}

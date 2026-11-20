import React from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ArrowRight,
  X,
  AlertCircle,
} from "lucide-react";
import { formatNaira } from "@/lib/format";
import {
  ReceiptAmount,
  ReceiptRow,
  ReceiptRows,
  ReceiptStatusPill,
  ReceiptStrip,
} from "@/components/receipts/ReceiptParts";

export default function WithdrawalConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  amount = 0,
  bankName = "Destination Bank",
  accountNumber = "0000000000",
  accountHolder = "Beneficiary",
  isP2P = false,
  transferFee = 0,
}) {
  const numAmount =
    typeof amount === "number"
      ? amount
      : parseFloat(String(amount).replace(/,/g, "")) || 0;

  let calculatedFee = 0;
  if (!isP2P) {
    if (transferFee !== undefined && transferFee !== null && transferFee > 0) {
      calculatedFee = transferFee;
    } else {
      if (numAmount <= 5000) calculatedFee = 10;
      else if (numAmount <= 50000) calculatedFee = 25;
      else calculatedFee = 50;
    }
  }

  const totalDeduction = numAmount + calculatedFee;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      noPadding
      maxWidthClass="max-w-[440px]"
      ariaLabel={isP2P ? "Confirm P2P Transfer" : "Confirm Withdrawal"}
    >
      <ReceiptStrip />

      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-card-title text-foreground truncate">
            {isP2P ? "Confirm P2P Transfer" : "Confirm Withdrawal"}
          </h3>
          <ReceiptStatusPill status="success" label="INSTANT" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
        <div className="pw-panel p-4">
          <ReceiptAmount
            label="TRANSFER AMOUNT"
            amount={numAmount}
            positive
            subtitle="Exact amount credited to recipient"
          />
        </div>

        <ReceiptRows>
          <ReceiptRow
            label={isP2P ? "Transfer Type" : "Destination Bank"}
            value={isP2P ? "PayWaka Wallet (P2P)" : bankName}
          />
          <ReceiptRow
            label={isP2P ? "Barter ID" : "Account Number"}
            value={accountNumber}
            mono
          />
          <ReceiptRow label="Beneficiary" value={accountHolder} />
        </ReceiptRows>

        <ReceiptRows>
          <ReceiptRow label="Principal Amount" value={formatNaira(numAmount)} mono />
          <ReceiptRow
            label="Processing Fee"
            value={isP2P ? "₦0.00 (Free)" : formatNaira(calculatedFee)}
            mono
            accent={isP2P}
          />
          <ReceiptRow
            label="Total Wallet Debit"
            value={formatNaira(totalDeduction)}
            mono
            accent
          />
        </ReceiptRows>

        <div className="pw-panel p-3 text-caption text-muted-foreground leading-relaxed flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
          <span>
            Your official receipt will display the clean transfer amount (
            <span className="pw-num font-semibold text-foreground">{formatNaira(numAmount)}</span>).
          </span>
        </div>
      </div>

      <div className="p-4 border-t border-border pb-safe flex gap-2.5 shrink-0 bg-card">
        <Button type="button" variant="outline" onClick={onClose} className="w-1/3">
          Modify
        </Button>
        <Button
          type="button"
          onClick={() =>
            onConfirm?.({ amount: numAmount, fee: calculatedFee, totalDeduction })
          }
          className="w-2/3"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Enter PIN</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </ModalPortal>
  );
}

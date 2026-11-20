import React, { useEffect, useMemo, useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import TransactionsModal from "@/components/TransactionsModal";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatNaira, formatCashback } from "@/lib/format";
import {
  ReceiptAmount,
  ReceiptAnimatedCheck,
  ReceiptCashbackChip,
  ReceiptCopyButton,
  ReceiptPerforation,
  ReceiptRow,
  ReceiptRows,
  ReceiptStatusPill,
  ReceiptStrip,
  ReceiptWordmark,
} from "@/components/receipts/ReceiptParts";

export default function PaymentSuccessfulModal({
  isOpen,
  onClose,
  data = {},
}) {
  const navigate = useNavigate();
  const [isShareReceiptOpen, setIsShareReceiptOpen] = useState(false);

  const {
    category = "Transaction",
    productName = "Service",
    network = "Default",
    amount = 0,
    feeCharged = 0,
    totalPayable = 0,
    cashbackApplied = 0,
    walletContribution = 0,
    cashbackEarned = 0,
    customerId = "",
    tx_ref = "",
    token = "",
    bonusToEarn = "",
  } = data;

  // Short success haptic respecting reduced motion
  useEffect(() => {
    if (!isOpen) return;
    setIsShareReceiptOpen(false);
    try {
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (!reduced && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(25);
      }
    } catch {
      // ignore haptic errors on unsupported browsers
    }
  }, [isOpen]);

  const resolvedTotal = Number(
    totalPayable || Number(amount || 0) + Number(feeCharged || 0),
  );

  const receiptSubtitle = useMemo(() => {
    const lower = String(category || productName || "").toLowerCase();
    if (lower.includes("data")) return "MOBILE DATA RECEIPT";
    if (lower.includes("airtime")) return "AIRTIME TOP-UP RECEIPT";
    if (lower.includes("elec")) return "UTILITY ELECTRICITY VOUCHER";
    if (lower.includes("cable")) return "CABLE TV SUBSCRIPTION";
    return "TRANSACTION RECEIPT";
  }, [category, productName]);

  const normalizedTxForReceipt = useMemo(() => {
    const lower = String(category || productName || "").toLowerCase();
    const isData = lower.includes("data");
    const isAirtime = lower.includes("airtime");
    const isElec = lower.includes("elec");
    const isCable = lower.includes("cable");

    return {
      id: tx_ref || `pwk_${Date.now()}`,
      tx_ref: tx_ref || `pwk_${Date.now()}`,
      reference: tx_ref,
      type: "debit",
      status: "completed",
      category: isElec
        ? "Electricity"
        : isData
          ? "Mobile Data"
          : isAirtime
            ? "Airtime"
            : isCable
              ? "Cable TV"
              : category,
      title: productName || category,
      network: network && network !== "Default" ? network : undefined,
      company: isElec ? network : undefined,
      cableTV: isCable ? network : undefined,
      phone: isData || isAirtime ? customerId : undefined,
      meterNo: isElec ? customerId : undefined,
      smartCardNo: isCable ? customerId : undefined,
      customerId,
      planName: isData ? productName : undefined,
      packageName: isCable ? productName : undefined,
      amount: Number(amount || 0),
      feeCharged: Number(feeCharged || 0),
      totalPayable: resolvedTotal,
      tokenPin: token || undefined,
      token: token || undefined,
      created_at: new Date().toISOString(),
    };
  }, [tx_ref, category, productName, network, customerId, amount, feeCharged, resolvedTotal, token]);

  const handleShareReceipt = () => {
    setIsShareReceiptOpen(true);
  };

  return (
    <>
      <ModalPortal
        isOpen={isOpen && !isShareReceiptOpen}
        onClose={onClose}
        variant="sheet"
        noPadding
        maxWidthClass="max-w-[388px]"
        ariaLabel="Payment Successful Receipt"
      >
        <ReceiptStrip />

        {/* Mini-receipt Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-border shrink-0">
          <ReceiptWordmark subtitle={receiptSubtitle} />
          <ReceiptStatusPill status="success" label="SUCCESSFUL" />
        </div>

        {/* Scrollable Mini-Receipt Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          <ReceiptAnimatedCheck />

          <div className="pw-panel p-4 space-y-2">
            <p className="text-sm font-bold text-foreground text-center truncate">
              {productName || category}
            </p>
            <ReceiptAmount label="AMOUNT PAID" amount={resolvedTotal} />
            {Number(cashbackEarned || 0) > 0 && (
              <div className="flex justify-center pt-1">
                <ReceiptCashbackChip
                  amount={cashbackEarned}
                  label={`${formatCashback(cashbackEarned)} cashback credited`}
                />
              </div>
            )}
            {!Number(cashbackEarned || 0) && bonusToEarn && bonusToEarn !== "₦0 Cashback" && (
              <div className="flex justify-center pt-1">
                <ReceiptCashbackChip label={bonusToEarn} />
              </div>
            )}
          </div>

          {/* Electricity Meter Token Block */}
          {token && (
            <div className="p-3.5 rounded-panel border-2 border-dashed border-brand-400/50 bg-brand-tint text-center space-y-1.5">
              <span className="pw-label text-brand-400 block">
                PREPAID METER TOKEN
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="pw-num text-lg font-black tracking-widest text-foreground break-all">
                  {token}
                </span>
                <ReceiptCopyButton value={token} label="Meter Token" />
              </div>
            </div>
          )}

          {/* Beneficiary / Recipient Block */}
          <div className="pw-panel p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="pw-label block">BENEFICIARY</span>
              <p className="pw-num text-sm font-bold text-foreground truncate mt-0.5">
                {customerId || "N/A"}
              </p>
              {network && network !== "Default" && (
                <p className="text-caption text-muted-foreground truncate">
                  {network}
                </p>
              )}
            </div>
            <ReceiptStatusPill status="success" label="DELIVERED" />
          </div>

          <ReceiptPerforation />

          <ReceiptRows>
            <ReceiptRow label="Product Value" value={formatNaira(amount)} mono />
            {Number(feeCharged || 0) > 0 && (
              <ReceiptRow label="Processing Fee" value={formatNaira(feeCharged)} mono />
            )}
            {Number(cashbackApplied || 0) > 0 && (
              <ReceiptRow
                label="Funding Split"
                value={`${formatNaira(cashbackApplied)} CB / ${formatNaira(walletContribution)} Wallet`}
                mono
              />
            )}
            <ReceiptRow
              label="Reference"
              value={tx_ref || "N/A"}
              code
              copyValue={tx_ref}
              copyLabel="Reference"
            />
          </ReceiptRows>
        </div>

        {/* Actions */}
        <div className="p-4 pt-3 border-t border-border/70 pb-safe space-y-2 shrink-0 bg-card/75 backdrop-blur-xl">
          <Button
            type="button"
            className="w-full h-12"
            onClick={handleShareReceipt}
          >
            <Share2 className="h-4 w-4" />
            <span>Share receipt</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={onClose}
          >
            Done
          </Button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/billhistory");
            }}
            className="w-full min-h-11 text-caption font-semibold text-brand-400 hover:underline text-center"
          >
            View history
          </button>
        </div>
      </ModalPortal>

      {isShareReceiptOpen && (
        <TransactionsModal
          transaction={normalizedTxForReceipt}
          isOpen={isShareReceiptOpen}
          onClose={() => setIsShareReceiptOpen(false)}
        />
      )}
    </>
  );
}

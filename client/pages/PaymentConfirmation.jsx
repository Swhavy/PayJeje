import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import ModalPortal from "@/components/ui/ModalPortal";
import AccountDetailsCard from "@/components/AccountDetailsCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import TransactionPinSetupModal from "@/components/TransactionPinSetupModal";
import ResetTransactionPinModal from "@/components/ResetTransactionPinModal";
import {
  computeBillPricingAndEarnings,
  computeCashbackFundingSplit,
  DEFAULT_BILL_PRICING_CONFIG,
  toKobo,
} from "@shared/billPricingEngine";
import { formatCashback, formatNaira } from "@/lib/format";
import {
  ReceiptAmount,
  ReceiptCashbackChip,
  ReceiptRow,
  ReceiptRows,
  ReceiptStrip,
} from "@/components/receipts/ReceiptParts";

const getBillDetails = (transaction, pricingPreview) => {
  const facePrice = Number(transaction?.price || transaction?.amount || 0);
  const feeAmount = Number(pricingPreview?.feeCharged ?? transaction?.fee ?? 0);
  const totalPayable = Number(pricingPreview?.totalPayable ?? facePrice + feeAmount);

  const typeMap = {
    Airtime: {
      Network: transaction?.network,
      Product: transaction?.productName || "Airtime",
      Amount: formatNaira(facePrice),
      Mobile_Number: transaction?.customerID,
    },
    Data: {
      Network: transaction?.network,
      Product: transaction?.productName || "Data",
      Plan: transaction?.plan,
      Amount: formatNaira(facePrice),
      Mobile_Number: transaction?.customerID,
    },
    Electricity: {
      Bill_Type: "Electricity",
      Provider: transaction?.network,
      Meter_No: transaction?.customerID,
      ...(transaction?.customerName ? { Customer_Name: transaction.customerName } : {}),
      Amount: formatNaira(facePrice),
      Service_Fee: formatNaira(feeAmount),
      Total: formatNaira(totalPayable),
    },
    Cable: {
      Bill_Type: "Cable TV",
      Provider: transaction?.network,
      Smartcard_IUC: transaction?.customerID,
      ...(transaction?.customerName ? { Customer_Name: transaction.customerName } : {}),
      Amount: formatNaira(facePrice),
      Service_Fee: formatNaira(feeAmount),
      Total: formatNaira(totalPayable),
    },
    Default: {
      Network: transaction?.network,
      Product: transaction?.productName,
      Plan: transaction?.plan,
      Amount: formatNaira(facePrice),
      Mobile_Number: transaction?.customerID,
    },
  };

  const detectedKey =
    Object.keys(typeMap).find((key) =>
      transaction?.productName?.toLowerCase().includes(key.toLowerCase()),
    ) || "Default";

  return typeMap[detectedKey];
};

const fieldLabels = {
  AIRTIME: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Amount: { label: "Airtime Amount", mono: true },
    Mobile_Number: { label: "Recipient Phone", mono: true },
  },
  DATA: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Plan: { label: "Bundle" },
    Amount: { label: "Plan Price", mono: true },
    Mobile_Number: { label: "Recipient Phone", mono: true },
  },
  ELECTRICITY: {
    Bill_Type: { label: "Bill Type" },
    Provider: { label: "DISCO" },
    Meter_No: { label: "Meter Number", mono: true },
    Customer_Name: { label: "Customer Name" },
    Amount: { label: "Bill Amount", mono: true },
    Service_Fee: { label: "Processing Fee", mono: true },
    Total: { label: "Total Payable", mono: true },
  },
  CABLE: {
    Bill_Type: { label: "Bill Type" },
    Provider: { label: "Cable Provider" },
    Smartcard_IUC: { label: "Smartcard / IUC", mono: true },
    Customer_Name: { label: "Subscriber Name" },
    Amount: { label: "Package Amount", mono: true },
    Service_Fee: { label: "Processing Fee", mono: true },
    Total: { label: "Total Payable", mono: true },
  },
  Default: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Plan: { label: "Plan" },
    Amount: { label: "Amount", mono: true },
    Mobile_Number: { label: "Recipient", mono: true },
  },
};

export default function PaymentConfirmation({
  isOpen,
  onClose,
  onConfirm,
  paymentDetails,
  billPricingConfig = DEFAULT_BILL_PRICING_CONFIG,
}) {
  const user = useSelector((state) => state.user?.user || {});
  const transactions = useSelector((state) => state.user?.transactions || {});

  const [step, setStep] = useState("review"); // "review" | "pin"
  const [pin, setPin] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  const [phase, setPhase] = useState(null);
  const [error, setError] = useState(null);

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const walletBalanceNaira = Number(user?.walletBalance || 0);
  const cashbackBalanceNaira = Number(user?.cashbackBalance || 0);

  const mergedDetails = useMemo(
    () => ({
      ...transactions,
      ...(paymentDetails || {}),
    }),
    [transactions, paymentDetails],
  );

  const pricingPreview = useMemo(() => {
    const facePrice = Number(mergedDetails?.price || mergedDetails?.amount || 0);
    const catRaw = String(
      mergedDetails?.billType || mergedDetails?.productName || "data",
    ).toLowerCase();
    const category = catRaw.includes("elec")
      ? "electricity"
      : catRaw.includes("cable")
        ? "cable"
        : catRaw.includes("airtime")
          ? "airtime"
          : "data";

    if (category === "electricity" || category === "cable" || category === "airtime") {
      const calc = computeBillPricingAndEarnings({
        category,
        provider: mergedDetails?.network || "",
        faceAmountNaira: facePrice,
        useCashback,
        walletBalanceNaira,
        cashbackBalanceNaira,
        config: billPricingConfig || DEFAULT_BILL_PRICING_CONFIG,
      });
      if (calc.valid) {
        return calc;
      }
    }

    const rawCb = Number(
      mergedDetails?.cashbackToEarn ?? mergedDetails?.cashbackAmount ?? 0,
    );
    const baseDataCb =
      Math.round(Math.max(0, Number.isFinite(rawCb) ? rawCb : 0) * 100) / 100;
    const feeCharged = Number(mergedDetails?.fee || 0);
    const totalPayable = facePrice + feeCharged;
    const funding = computeCashbackFundingSplit({
      totalPayableKobo: toKobo(totalPayable),
      walletBalanceKobo: toKobo(walletBalanceNaira),
      cashbackBalanceKobo: toKobo(cashbackBalanceNaira),
      useCashback,
    });
    const cashbackGiven = funding.isFullyCashbackFunded ? 0 : baseDataCb;
    return {
      valid: true,
      faceAmount: facePrice,
      feeCharged,
      totalPayable,
      baseCashback: baseDataCb,
      cashbackGiven,
      cashbackSuppressedReason:
        funding.isFullyCashbackFunded && baseDataCb > 0
          ? "FULLY_FUNDED_BY_CASHBACK"
          : null,
      funding,
    };
  }, [
    mergedDetails,
    useCashback,
    walletBalanceNaira,
    cashbackBalanceNaira,
    billPricingConfig,
  ]);

  const details = useMemo(
    () => (mergedDetails ? getBillDetails(mergedDetails, pricingPreview) : null),
    [mergedDetails, pricingPreview],
  );

  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setPin(["", "", "", ""]);
      setPinError("");
      setShowPin(false);
      setError(null);
      setLoading(false);
      setPhase(null);
      setUseCashback(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === "pin") {
      setTimeout(() => {
        pinRefs[0]?.current?.focus();
      }, 150);
    }
  }, [step]);

  const canAffordWithSelection = pricingPreview?.funding?.canAfford ?? false;
  const pointsEstimate = Math.floor(Number(pricingPreview?.faceAmount || 0) / 50);

  const cashbackApplied = pricingPreview?.funding?.cashbackApplied || 0;
  const walletDebit =
    pricingPreview?.funding?.walletContribution ?? pricingPreview?.totalPayable ?? 0;
  const isFullyCashbackFunded = Boolean(
    pricingPreview?.funding?.isFullyCashbackFunded,
  );
  const cashbackEarned = pricingPreview?.cashbackGiven || 0;
  const baseCashback = pricingPreview?.baseCashback || 0;
  const shortfallAmount = Math.max(0, Number(walletDebit) - walletBalanceNaira);

  const handleProceedClick = () => {
    setError(null);
    if (!canAffordWithSelection) {
      setError(
        `Insufficient wallet balance. You need ${formatNaira(shortfallAmount)} more to complete this payment.`,
      );
      return;
    }
    if (!user?.hasTransactionPin) {
      setIsSetupOpen(true);
      return;
    }
    setStep("pin");
  };

  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const updated = [...pin];
    updated[index] = cleanVal;
    setPin(updated);
    setPinError("");

    if (cleanVal && index < 3) {
      pinRefs[index + 1]?.current?.focus();
    }

    if (index === 3 && cleanVal) {
      const fullPin = updated.join("");
      if (fullPin.length === 4) {
        authorizeTransaction(fullPin);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1]?.current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;

    const digits = pasted.split("");
    const filled = [
      digits[0] || "",
      digits[1] || "",
      digits[2] || "",
      digits[3] || "",
    ];
    setPin(filled);
    setPinError("");

    if (pasted.length === 4) {
      authorizeTransaction(pasted);
    } else {
      pinRefs[Math.min(digits.length, 3)]?.current?.focus();
    }
  };

  const authorizeTransaction = async (overridePin) => {
    const pinStr = overridePin || pin.join("");
    if (pinStr.length !== 4) {
      setPinError("Please enter your 4-digit transaction PIN.");
      return;
    }

    try {
      setPinError("");
      setLoading(true);
      setPhase("Authorizing payment...");

      const fundingMeta = {
        useCashback: Boolean(useCashback && cashbackBalanceNaira > 0),
        cashbackApplied: pricingPreview?.funding?.cashbackApplied || 0,
        walletContribution:
          pricingPreview?.funding?.walletContribution ??
          pricingPreview?.totalPayable ??
          0,
        feeCharged: pricingPreview?.feeCharged || 0,
        totalPayable: pricingPreview?.totalPayable || 0,
        cashbackToEarn: pricingPreview?.cashbackGiven || 0,
      };

      if (onConfirm) {
        const result = await onConfirm(pinStr, fundingMeta);
        setPin(["", "", "", ""]);
        setLoading(false);
        setPhase(null);
        if (result !== false) {
          onClose();
          return;
        }
        return;
      }
      setPin(["", "", "", ""]);
      setLoading(false);
      setPhase(null);
      onClose();
    } catch (err) {
      console.error("Payment authorization error:", err);
      setPin(["", "", "", ""]);
      setLoading(false);
      setPhase(null);

      const errMsg = err?.message || "";
      if (
        err?.code === "failed-precondition" ||
        errMsg.toLowerCase().includes("not been created") ||
        errMsg.toLowerCase().includes("not configured")
      ) {
        setIsSetupOpen(true);
        return;
      }

      const cleanMsg =
        errMsg.replace(/^FirebaseError:\s*/, "") ||
        "PIN authorization failed. Please check your PIN and try again.";
      setPinError(cleanMsg);
      setTimeout(() => pinRefs[0]?.current?.focus(), 100);
    }
  };

  const productUpper = String(mergedDetails?.productName || "").toUpperCase();
  const labels =
    fieldLabels[productUpper] ||
    (productUpper.includes("ELEC")
      ? fieldLabels.ELECTRICITY
      : productUpper.includes("CABLE")
        ? fieldLabels.CABLE
        : fieldLabels.Default);

  const handleCloseSheet = () => {
    if (!loading) {
      setError(null);
      setPinError("");
      onClose();
    }
  };

  return (
    <>
      <TransactionPinSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSuccess={() => {
          setIsSetupOpen(false);
          setStep("pin");
        }}
      />

      <ResetTransactionPinModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onSuccess={() => {
          setIsResetOpen(false);
          setStep("pin");
          setPin(["", "", "", ""]);
          setTimeout(() => pinRefs[0]?.current?.focus(), 150);
        }}
      />

      {isTopUpOpen && (
        <AccountDetailsCard
          accountNumber={user?.accountNumber || "0000000000"}
          bankName={user?.bankName || "Your Bank"}
          open={isTopUpOpen}
          isClose={() => setIsTopUpOpen(false)}
        />
      )}

      <ModalPortal
        isOpen={isOpen && !isSetupOpen && !isResetOpen && Boolean(details)}
        onClose={handleCloseSheet}
        variant="sheet"
        noPadding
        closeOnBackdrop={!loading}
        closeOnEscape={!loading}
        maxWidthClass="max-w-[440px]"
        ariaLabel="Confirm Payment"
      >
        <ReceiptStrip />

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-card-title text-foreground">
              {step === "review" ? "Confirm Payment" : "Authorize Payment"}
            </h2>
            <p className="text-caption text-muted-foreground">
              {step === "review"
                ? "Review details before authorizing"
                : "Enter your 4-digit transaction PIN"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseSheet}
            disabled={loading}
            aria-label="Close confirmation"
            className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "review" ? (
          <>
            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              <div className="pw-panel p-4">
                <ReceiptAmount
                  label="AMOUNT TO PAY"
                  amount={pricingPreview?.totalPayable || 0}
                />
              </div>

              {!user?.hasTransactionPin && (
                <div className="flex items-start gap-2.5 p-3 rounded-panel bg-warning/10 border border-warning/25 text-warning text-caption">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Transaction PIN Required</p>
                    <p className="opacity-90">
                      You&apos;ll create a 4-digit PIN next to authorize this and future payments.
                    </p>
                  </div>
                </div>
              )}

              <ReceiptRows>
                {details &&
                  Object.keys(details).map((key) => {
                    const des = labels[key];
                    if (!des || !details[key] || details[key] === "N/A") return null;
                    return (
                      <ReceiptRow
                        key={key}
                        label={des.label}
                        value={details[key]}
                        mono={Boolean(des.mono)}
                      />
                    );
                  })}
              </ReceiptRows>

              {/* Existing Spendable Cashback Switch */}
              <div className="pw-panel p-3.5 space-y-2.5">
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <Label
                      htmlFor="use-cashback"
                      className="text-xs font-bold text-foreground cursor-pointer"
                    >
                      Use Cashback Balance
                    </Label>
                    <p className="text-caption text-muted-foreground">
                      Available:{" "}
                      <span className="pw-num font-bold text-brand-400">
                        {formatNaira(cashbackBalanceNaira)}
                      </span>
                    </p>
                  </div>
                  <Switch
                    id="use-cashback"
                    disabled={cashbackBalanceNaira <= 0}
                    checked={useCashback && cashbackBalanceNaira > 0}
                    onCheckedChange={setUseCashback}
                    className="data-[state=checked]:bg-brand-500"
                  />
                </div>

                <div className="pt-2 border-t border-border space-y-1.5 text-caption">
                  {useCashback && cashbackApplied > 0 && (
                    <div className="flex justify-between items-center text-brand-400 font-semibold">
                      <span>Cashback Applied</span>
                      <span className="pw-num">-{formatNaira(cashbackApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-foreground font-bold">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <WalletIcon className="w-3.5 h-3.5" />
                      Wallet Debit
                    </span>
                    <span className="pw-num font-bold text-foreground">
                      {formatNaira(walletDebit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cashback & Points Preview */}
              <div className="pw-panel p-3.5 space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-caption font-semibold text-foreground">
                    Reward on Completion
                  </span>
                  <ReceiptCashbackChip
                    amount={isFullyCashbackFunded ? 0 : cashbackEarned}
                    label={
                      isFullyCashbackFunded
                        ? "₦0 cashback"
                        : `${formatCashback(cashbackEarned)} cashback`
                    }
                  />
                </div>
                {isFullyCashbackFunded && baseCashback > 0 ? (
                  <p className="text-[11px] text-warning leading-snug">
                    100% cashback-funded purchases do not earn new cashback (wallet payments earn{" "}
                    {formatCashback(baseCashback)}).
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Credited to your Cashback Vault after completion.
                    {pointsEstimate > 0 ? ` Plus +${pointsEstimate} points.` : ""}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-caption rounded-panel bg-destructive/10 border border-destructive/25 text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Sticky Bottom Action */}
            <div className="sticky bottom-0 bg-card/80 backdrop-blur-xl border-t border-border/70 p-4 pb-safe space-y-2 shrink-0">
              {!canAffordWithSelection ? (
                <>
                  <p className="text-caption text-center font-medium text-warning">
                    You need <span className="pw-num font-bold">{formatNaira(shortfallAmount)}</span> more in your wallet
                  </p>
                  <Button
                    type="button"
                    className="w-full h-12"
                    onClick={() => setIsTopUpOpen(true)}
                  >
                    Top up wallet
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="w-full h-12"
                  onClick={handleProceedClick}
                >
                  <span>Proceed to Enter PIN</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        ) : (
          /* STEP 2: PIN AUTHORIZATION */
          <>
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
              <div className="pw-panel p-4 text-center space-y-1.5">
                <div className="pw-tile mx-auto h-11 w-11">
                  <Lock className="w-5 h-5" />
                </div>
                <p className="text-caption text-muted-foreground">
                  Confirming{" "}
                  <span className="pw-num font-bold text-foreground">
                    {formatNaira(pricingPreview?.totalPayable || 0)}
                  </span>
                  {useCashback && cashbackApplied > 0
                    ? ` (${formatNaira(cashbackApplied)} cashback + ${formatNaira(walletDebit)} wallet)`
                    : ""}
                  {mergedDetails?.customerID ? ` for ${mergedDetails.customerID}` : ""}
                </p>
              </div>

              {pinError && (
                <div className="flex items-start gap-2.5 p-3 text-caption rounded-panel bg-destructive/10 border border-destructive/25 text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{pinError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-center items-center gap-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={`pay-pin-${idx}`}
                      ref={pinRefs[idx]}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      maxLength={1}
                      disabled={loading}
                      value={pin[idx]}
                      aria-label={`PIN digit ${idx + 1}`}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className={`w-14 h-16 text-center text-2xl pw-num font-bold rounded-panel bg-panel border-2 transition-colors focus:outline-none ${pin[idx]
                          ? "border-brand-500 bg-brand-tint text-foreground"
                          : "border-border text-foreground focus:border-brand-400"
                        } disabled:opacity-50`}
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="min-h-11 px-2.5 text-caption text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-panel hover:bg-muted"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showPin ? "Hide Digits" : "Show Digits"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResetOpen(true)}
                    className="min-h-11 px-2.5 text-caption text-brand-400 hover:underline font-semibold rounded-panel hover:bg-brand-tint"
                  >
                    Forgot PIN?
                  </button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border p-4 pb-safe space-y-2 shrink-0">
              <Button
                type="button"
                onClick={() => authorizeTransaction()}
                disabled={loading || pin.join("").length !== 4}
                className="w-full h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{phase || "Authorizing Payment..."}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Authorize</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep("review");
                  setPin(["", "", "", ""]);
                  setPinError("");
                }}
                disabled={loading}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Details</span>
              </Button>
            </div>
          </>
        )}
      </ModalPortal>
    </>
  );
}

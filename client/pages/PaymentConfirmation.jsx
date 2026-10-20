import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
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
  HelpCircle,
} from "lucide-react";
import TransactionPinSetupModal from "@/components/TransactionPinSetupModal";
import ResetTransactionPinModal from "@/components/ResetTransactionPinModal";

// Extract transaction details dynamically
const getBillDetails = (transaction) => {
  const typeMap = {
    Airtime: {
      Network: transaction?.network,
      Product: transaction?.productName,
      Amount: `₦ ${Number(transaction?.price || 50).toLocaleString()}`,
      Mobile_Number: transaction?.customerID,
      bonusToEarn: transaction?.bonusToEarn || "10 NGN",
      cashbackAmount: transaction?.cashbackAmount,
    },
    Data: {
      Network: transaction?.network,
      Product: transaction?.productName,
      Plan: transaction?.plan,
      Amount: `₦ ${Number(transaction?.price || 0).toLocaleString()}`,
      Mobile_Number: transaction?.customerID,
      bonusToEarn: transaction?.bonusToEarn || "10 NGN",
      cashbackAmount: transaction?.cashbackAmount,
    },
    Cable: {
      Bill_Type: transaction?.productName,
      Provider: transaction?.network,
      Amount: `₦ ${Number(transaction?.price || 0).toLocaleString()}`,
      Service_Fee: "₦50",
      bonusToEarn: transaction?.bonusToEarn || "10 NGN",
      Total: `₦ ${Number((transaction?.price || 0) + 50).toLocaleString()}`,
    },
    Default: {
      Network: transaction?.network,
      Product: transaction?.productName,
      Plan: transaction?.plan,
      Amount: `₦ ${Number(transaction?.price || 0).toLocaleString()}`,
      Mobile_Number: transaction?.customerID,
      bonusToEarn: transaction?.bonusToEarn || "10 NGN",
      cashbackAmount: transaction?.cashbackAmount,
    },
  };

  const detectedKey =
    Object.keys(typeMap).find((key) =>
      transaction?.productName?.toLowerCase().includes(key.toLowerCase()),
    ) || "Default";

  return typeMap[detectedKey];
};

// Define field labels for each type
const fieldLabels = {
  AIRTIME: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Amount: { label: "Amount" },
    Mobile_Number: { label: "Mobile Number" },
  },

  DATA: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Plan: { label: "Plan" },
    Amount: { label: "Amount" },
    Mobile_Number: { label: "Mobile Number" },
  },

  CABLE: {
    Bill_Type: { label: "Bill Type" },
    Provider: { label: "Provider" },
    Amount: { label: "Amount" },
    Service_Fee: { label: "Service Fee" },
    Total: { label: "Total" },
  },

  Default: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Plan: { label: "Plan" },
    Amount: { label: "Amount" },
    Mobile_Number: { label: "Mobile Number" },
  },
};

export default function PaymentConfirmation({
  isOpen,
  onClose,
  onConfirm,
  paymentDetails,
}) {
  const user = useSelector((state) => state.user?.user || {});
  const transactions = useSelector((state) => state.user?.transactions || {});

  const [step, setStep] = useState("review"); // "review" | "pin"
  const [pin, setPin] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  const [phase, setPhase] = useState(null);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (paymentDetails) {
      const extractedDetails = getBillDetails(paymentDetails);
      setDetails(extractedDetails);
    }
  }, [paymentDetails]);

  // Reset modal state on close/open
  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setPin(["", "", "", ""]);
      setPinError("");
      setShowPin(false);
      setError(null);
      setLoading(false);
      setPhase(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === "pin") {
      setTimeout(() => {
        pinRefs[0]?.current?.focus();
      }, 150);
    }
  }, [step]);

  const handleProceedClick = () => {
    setError(null);
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

      if (onConfirm) {
        const result = await onConfirm(pinStr);
        // Clear local PIN state immediately
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
      // Clear PIN on failure immediately
      setPin(["", "", "", ""]);
      setLoading(false);
      setPhase(null);

      // Handle failed-precondition (PIN not set up) by launching setup modal
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

  // Detect the right label set based on type
  let labels =
    fieldLabels[paymentDetails?.productName?.toUpperCase()] ||
    fieldLabels.Default;

  return (
    <>
      {/* Fallback Setup PIN Modal if user hasn't created one yet */}
      <TransactionPinSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSuccess={() => {
          setIsSetupOpen(false);
          setStep("pin");
        }}
      />

      {/* Forgot / Reset PIN Modal */}
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

      <ModalPortal
        isOpen={isOpen && !isSetupOpen && !isResetOpen && Boolean(details)}
        onClose={() => {
          if (!loading) {
            setError(null);
            setPinError("");
            onClose();
          }
        }}
        closeOnBackdrop={!loading}
        closeOnEscape={!loading}
        maxWidthClass="max-w-[440px]"
      >
        {step === "review" ? (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Confirm Payment
              </h2>
              <p className="text-xs text-muted-foreground">
                Please review transaction details before proceeding.
              </p>
            </div>

            {!user?.hasTransactionPin && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Transaction PIN Required</p>
                  <p className="text-[11px] opacity-90">
                    You'll create a 4-digit PIN in the next step to authorize this and future payments.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2.5 py-1 text-foreground">
              {details &&
                Object.keys(details).map((key) => {
                  // Skip keys handled in bottom summary to avoid duplicate renders
                  if (
                    key === "bonusToEarn" ||
                    key === "BonusToEarn" ||
                    key === "cashbackAmount" ||
                    key === "Run"
                  ) {
                    return null;
                  }

                  const des = labels[key];
                  if (!des || !details[key] || details[key] === "N/A") return null;

                  return (
                    <div
                      key={key}
                      className="flex justify-between items-center text-sm py-1 border-b border-border/40 last:border-0"
                    >
                      <Label className="text-xs font-medium text-muted-foreground">
                        {des.label}
                      </Label>
                      <span className="font-bold text-foreground">
                        {details[key]}
                      </span>
                    </div>
                  );
                })}

              <Separator className="my-2" />

              {/* Single Non-Duplicated Bonus To Earn Row */}
              <div className="flex justify-between items-center text-sm py-0.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Bonus To Earn
                </Label>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {details?.bonusToEarn || details?.BonusToEarn || "10 NGN"}
                </span>
              </div>

              {/* Cashback Switch */}
              <div className="flex justify-between items-center text-sm py-0.5">
                <Label htmlFor="use-cashback" className="text-xs font-medium text-muted-foreground">
                  Use Cashback
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    ₦{Number(transactions?.cashbackAmount || 0).toLocaleString()}
                  </span>
                  <Switch
                    id="use-cashback"
                    checked={useCashback}
                    onCheckedChange={setUseCashback}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="button"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
                onClick={handleProceedClick}
              >
                <span>Proceed to Enter PIN</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 2: PIN AUTHORIZATION */
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div className="text-center space-y-1.5">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Authorize Payment
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your 4-digit transaction PIN to confirm{" "}
                <span className="font-bold text-foreground">
                  {details?.Amount || `₦${paymentDetails?.price}`}
                </span>
                {paymentDetails?.customerID ? ` for ${paymentDetails.customerID}` : ""}.
              </p>
            </div>

            {pinError && (
              <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{pinError}</span>
              </div>
            )}

            <div className="space-y-3 py-1">
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
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-2xl bg-muted/30 border-2 transition-all duration-150 focus:outline-none ${
                      pin[idx]
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border/70 text-foreground focus:border-primary/80 focus:bg-background"
                    } disabled:opacity-50`}
                  />
                ))}
              </div>

              {/* Show/Hide and Forgot PIN controls */}
              <div className="flex justify-between items-center px-1 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? "Hide Digits" : "Show Digits"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-xs text-primary hover:underline font-semibold py-1 px-2.5 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Forgot PIN?
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                onClick={() => authorizeTransaction()}
                disabled={loading || pin.join("").length !== 4}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
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
                className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Back to Details</span>
              </Button>
            </div>
          </div>
        )}
      </ModalPortal>
    </>
  );
}

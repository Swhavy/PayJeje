import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setHasTransactionPin } from "@/Features/userSlice";
import useCloudfunc from "@/components/useCloudfunc";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export default function TransactionPinSetupModal({
  isOpen,
  onClose,
  onSuccess,
  isDismissible = true,
}) {
  const dispatch = useDispatch();
  const { createTransactionPin } = useCloudfunc();

  const [step, setStep] = useState(1); // 1 = Enter PIN, 2 = Confirm PIN, 3 = Success
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const confirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Focus first input on mount or step change
  useEffect(() => {
    if (isOpen) {
      if (step === 1) {
        setTimeout(() => pinRefs[0]?.current?.focus(), 150);
      } else if (step === 2) {
        setTimeout(() => confirmRefs[0]?.current?.focus(), 150);
      }
    }
  }, [isOpen, step]);

  const resetState = () => {
    setStep(1);
    setPin(["", "", "", ""]);
    setConfirmPin(["", "", "", ""]);
    setShowPin(false);
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    if (!isDismissible && step === 1) return;
    resetState();
    onClose?.();
  };

  const handleDigitChange = (index, value, isConfirm = false) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const targetState = isConfirm ? [...confirmPin] : [...pin];
    targetState[index] = cleanVal;

    if (isConfirm) {
      setConfirmPin(targetState);
    } else {
      setPin(targetState);
    }
    setError("");

    const targetRefs = isConfirm ? confirmRefs : pinRefs;
    if (cleanVal && index < 3) {
      targetRefs[index + 1]?.current?.focus();
    }

    if (index === 3 && cleanVal) {
      const fullPin = targetState.join("");
      if (fullPin.length === 4) {
        if (!isConfirm) {
          setStep(2);
        } else {
          handleSubmit(targetState);
        }
      }
    }
  };

  const handleKeyDown = (index, e, isConfirm = false) => {
    const targetState = isConfirm ? confirmPin : pin;
    const targetRefs = isConfirm ? confirmRefs : pinRefs;

    if (e.key === "Backspace" && !targetState[index] && index > 0) {
      targetRefs[index - 1]?.current?.focus();
    }
  };

  const handlePaste = (e, isConfirm = false) => {
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

    if (isConfirm) {
      setConfirmPin(filled);
    } else {
      setPin(filled);
    }
    setError("");

    if (pasted.length === 4) {
      if (!isConfirm) {
        setStep(2);
      } else {
        handleSubmit(filled);
      }
    } else {
      const targetRefs = isConfirm ? confirmRefs : pinRefs;
      targetRefs[Math.min(digits.length, 3)]?.current?.focus();
    }
  };

  const handleSubmit = async (overrideConfirm) => {
    const initialPinStr = pin.join("");
    const confirmPinStr = (overrideConfirm || confirmPin).join("");

    if (initialPinStr.length !== 4 || confirmPinStr.length !== 4) {
      setError("Please fill all 4 digits.");
      return;
    }

    if (initialPinStr !== confirmPinStr) {
      setError("PINs do not match. Please re-enter.");
      setConfirmPin(["", "", "", ""]);
      setTimeout(() => confirmRefs[0]?.current?.focus(), 100);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await createTransactionPin({ pin: initialPinStr });
      if (res?.success) {
        dispatch(setHasTransactionPin(true));
        setStep(3);
        toast.success("Transaction PIN created successfully!");
        onSuccess?.();
        setTimeout(() => {
          handleClose();
        }, 1800);
      } else {
        setError(res?.message || "Failed to create transaction PIN.");
        setConfirmPin(["", "", "", ""]);
      }
    } catch (err) {
      console.error("PIN creation error:", err);
      const cleanMsg =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Failed to set up transaction PIN. Please try again.";
      setError(cleanMsg);
      setConfirmPin(["", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdrop={isDismissible && !loading}
      closeOnEscape={isDismissible && !loading}
      maxWidthClass="max-w-[420px]"
    >
      {step === 3 ? (
        <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground tracking-tight">
              Security PIN Activated!
            </h3>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Your 4-digit transaction PIN has been securely set up. All purchases are now protected.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              {step === 1 ? "Create Transaction PIN" : "Confirm Transaction PIN"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {step === 1
                ? "Choose a 4-digit secret PIN you will use to authorize all airtime, data, and bill payments."
                : "Please re-type your 4-digit PIN to make sure there are no typos."}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 1 ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 2 ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* 4-Box PIN Input */}
          <div className="space-y-3">
            <div className="flex justify-center items-center gap-3">
              {[0, 1, 2, 3].map((idx) => {
                const currentVal = step === 1 ? pin[idx] : confirmPin[idx];
                const currentRef = step === 1 ? pinRefs[idx] : confirmRefs[idx];

                return (
                  <input
                    key={`pin-${step}-${idx}`}
                    ref={currentRef}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={1}
                    value={currentVal}
                    onChange={(e) => handleDigitChange(idx, e.target.value, step === 2)}
                    onKeyDown={(e) => handleKeyDown(idx, e, step === 2)}
                    onPaste={(e) => handlePaste(e, step === 2)}
                    disabled={loading}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-2xl bg-muted/30 border-2 transition-all duration-150 focus:outline-none ${
                      currentVal
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border/70 text-foreground focus:border-primary/80 focus:bg-background"
                    } disabled:opacity-50`}
                  />
                );
              })}
            </div>

            {/* Show / Hide toggle */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-muted/30 transition-colors"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPin ? "Hide Digits" : "Show Digits"}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {step === 1 ? (
              <Button
                type="button"
                onClick={() => {
                  if (pin.join("").length === 4) {
                    setStep(2);
                  } else {
                    setError("Please enter all 4 digits.");
                  }
                }}
                disabled={pin.join("").length !== 4}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading || confirmPin.join("").length !== 4}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Securing PIN...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save & Activate PIN</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep(1);
                    setConfirmPin(["", "", "", ""]);
                    setError("");
                  }}
                  disabled={loading}
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  <span>Change PIN digits</span>
                </Button>
              </div>
            )}

            {isDismissible && step === 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
              >
                I'll do this later
              </Button>
            )}
          </div>
        </div>
      )}
    </ModalPortal>
  );
}

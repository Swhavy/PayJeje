import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";

export default function TransactionPinModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  recipient,
  serviceName,
  onBack,
}) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (isOpen) {
      setPin(["", "", "", ""]);
      setError("");
      setLoading(false);
      setTimeout(() => {
        pinRefs[0]?.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const updated = [...pin];
    updated[index] = cleanVal;
    setPin(updated);
    setError("");

    if (cleanVal && index < 3) {
      pinRefs[index + 1]?.current?.focus();
    }

    // Auto submit when 4th digit is entered
    if (index === 3 && cleanVal) {
      const fullPin = updated.join("");
      if (fullPin.length === 4) {
        handleAuthorize(fullPin);
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
    setError("");

    if (pasted.length === 4) {
      handleAuthorize(pasted);
    } else {
      pinRefs[Math.min(digits.length, 3)]?.current?.focus();
    }
  };

  const handleAuthorize = async (overridePin) => {
    const pinStr = overridePin || pin.join("");
    if (pinStr.length !== 4) {
      setError("Please enter your 4-digit transaction PIN.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (onConfirm) {
        const result = await onConfirm(pinStr);
        if (result === false) {
          // If onConfirm returned false, clear pin and focus
          setPin(["", "", "", ""]);
          setTimeout(() => pinRefs[0]?.current?.focus(), 100);
          return;
        }
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      const msg = err?.message?.replace(/^FirebaseError:\s*/, "") || "PIN authorization failed.";
      setError(msg);
      setPin(["", "", "", ""]);
      setTimeout(() => pinRefs[0]?.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose?.()}>
      <DialogContent className="sm:max-w-[400px] p-6 bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
        <div className="space-y-5">
          <DialogHeader className="text-center sm:text-center space-y-1.5">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
              Authorize Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your 4-digit PIN to confirm{" "}
              {amount ? (
                <span className="font-bold text-foreground">
                  ₦{Number(amount).toLocaleString()}
                </span>
              ) : (
                "this transaction"
              )}
              {recipient ? ` for ${recipient}` : ""}.
            </DialogDescription>
          </DialogHeader>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* 4-digit PIN Inputs */}
          <div className="space-y-3">
            <div className="flex justify-center items-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={`auth-pin-${idx}`}
                  ref={pinRefs[idx]}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
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
          <div className="space-y-2 pt-1">
            <Button
              onClick={() => handleAuthorize()}
              disabled={loading || pin.join("").length !== 4}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm & Authorize</span>
                </>
              )}
            </Button>

            <div className="flex gap-2">
              {onBack && (
                <Button
                  variant="ghost"
                  onClick={onBack}
                  disabled={loading}
                  className="flex-1 text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  <span>Review Details</span>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={loading}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground h-9"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useRef } from "react";
import useCloudfunc from "@/components/useCloudfunc";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function ChangeTransactionPinModal({ isOpen, onClose }) {
  const { changeTransactionPin } = useCloudfunc();

  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const currentRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const newRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const confirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const resetState = () => {
    setCurrentPin(["", "", "", ""]);
    setNewPin(["", "", "", ""]);
    setConfirmPin(["", "", "", ""]);
    setError("");
    setLoading(false);
    setIsSuccess(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose?.();
  };

  const handleDigitChange = (index, value, state, setState, refs, nextSectionRef) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const updated = [...state];
    updated[index] = cleanVal;
    setState(updated);
    setError("");

    if (cleanVal && index < 3) {
      refs[index + 1]?.current?.focus();
    } else if (cleanVal && index === 3 && nextSectionRef) {
      nextSectionRef.current?.focus();
    }
  };

  const handleKeyDown = (index, e, state, refs) => {
    if (e.key === "Backspace" && !state[index] && index > 0) {
      refs[index - 1]?.current?.focus();
    }
  };

  const handlePaste = (e, setState, refs, nextSectionRef) => {
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
    setState(filled);
    setError("");

    if (pasted.length === 4 && nextSectionRef) {
      nextSectionRef.current?.focus();
    } else {
      refs[Math.min(digits.length, 3)]?.current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentStr = currentPin.join("");
    const newStr = newPin.join("");
    const confirmStr = confirmPin.join("");

    if (currentStr.length !== 4) {
      setError("Please enter your current 4-digit PIN.");
      currentRefs[0]?.current?.focus();
      return;
    }

    if (newStr.length !== 4) {
      setError("Please choose a new 4-digit PIN.");
      newRefs[0]?.current?.focus();
      return;
    }

    if (newStr === currentStr) {
      setError("New PIN cannot be the same as your current PIN.");
      newRefs[0]?.current?.focus();
      return;
    }

    if (confirmStr !== newStr) {
      setError("New PIN and confirmation do not match.");
      setConfirmPin(["", "", "", ""]);
      confirmRefs[0]?.current?.focus();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await changeTransactionPin({
        currentPin: currentStr,
        newPin: newStr,
      });

      if (res?.success) {
        setIsSuccess(true);
        toast.success("Transaction PIN updated successfully!");
        setTimeout(() => {
          handleClose();
        }, 1800);
      } else {
        setError(res?.message || "Failed to update transaction PIN.");
      }
    } catch (err) {
      console.error("Change PIN error:", err);
      const cleanMsg =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Failed to change PIN. Please check your current PIN and try again.";
      setError(cleanMsg);
      // Clear pins on error
      setCurrentPin(["", "", "", ""]);
      setNewPin(["", "", "", ""]);
      setConfirmPin(["", "", "", ""]);
      setTimeout(() => currentRefs[0]?.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      maxWidthClass="max-w-[430px]"
    >
      {isSuccess ? (
        <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground tracking-tight">
              PIN Changed Successfully!
            </h3>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Your new 4-digit transaction PIN is now active for all purchases.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Change Transaction PIN
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter your current PIN to authenticate, then set your new 4-digit PIN.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Current PIN */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-foreground">
                  Current PIN
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {showCurrent ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showCurrent ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="flex justify-center gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={`cur-${idx}`}
                    ref={currentRefs[idx]}
                    type={showCurrent ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={1}
                    value={currentPin[idx]}
                    onChange={(e) =>
                      handleDigitChange(idx, e.target.value, currentPin, setCurrentPin, currentRefs, newRefs[0])
                    }
                    onKeyDown={(e) => handleKeyDown(idx, e, currentPin, currentRefs)}
                    onPaste={(e) => handlePaste(e, setCurrentPin, currentRefs, newRefs[0])}
                    disabled={loading}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-muted/30 border border-border/80 focus:border-primary focus:bg-background focus:outline-none transition-all disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            {/* New PIN */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-foreground">
                  New 4-Digit PIN
                </Label>
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {showNew ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showNew ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="flex justify-center gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={`new-${idx}`}
                    ref={newRefs[idx]}
                    type={showNew ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={1}
                    value={newPin[idx]}
                    onChange={(e) =>
                      handleDigitChange(idx, e.target.value, newPin, setNewPin, newRefs, confirmRefs[0])
                    }
                    onKeyDown={(e) => handleKeyDown(idx, e, newPin, newRefs)}
                    onPaste={(e) => handlePaste(e, setNewPin, newRefs, confirmRefs[0])}
                    disabled={loading}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-muted/30 border border-border/80 focus:border-primary focus:bg-background focus:outline-none transition-all disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            {/* Confirm New PIN */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-foreground">
                  Confirm New PIN
                </Label>
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {showConfirm ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showConfirm ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="flex justify-center gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={`conf-${idx}`}
                    ref={confirmRefs[idx]}
                    type={showConfirm ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={1}
                    value={confirmPin[idx]}
                    onChange={(e) =>
                      handleDigitChange(idx, e.target.value, confirmPin, setConfirmPin, confirmRefs, null)
                    }
                    onKeyDown={(e) => handleKeyDown(idx, e, confirmPin, confirmRefs)}
                    onPaste={(e) => handlePaste(e, setConfirmPin, confirmRefs, null)}
                    disabled={loading}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-muted/30 border border-border/80 focus:border-primary focus:bg-background focus:outline-none transition-all disabled:opacity-50"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 h-11 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                currentPin.join("").length !== 4 ||
                newPin.join("").length !== 4 ||
                confirmPin.join("").length !== 4
              }
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Update PIN</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </ModalPortal>
  );
}

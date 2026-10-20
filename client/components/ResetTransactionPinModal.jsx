import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setHasTransactionPin } from "@/Features/userSlice";
import useCloudfunc from "@/components/useCloudfunc";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/firebaseConfig";
import {
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
} from "firebase/auth";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

export default function ResetTransactionPinModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();
  const { resetTransactionPin } = useCloudfunc();

  // Steps: 1 = Identity Re-Auth, 'mfa' = Two-Factor Auth, 2 = Enter New PIN, 3 = Confirm New PIN, 4 = Success
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaResolver, setMfaResolver] = useState(null);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const newPinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const confirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const passwordInputRef = useRef(null);
  const mfaInputRef = useRef(null);

  const isGoogleUser = Boolean(
    auth.currentUser?.providerData?.some((p) => p.providerId === "google.com")
  );

  useEffect(() => {
    if (isOpen) {
      if (step === 1) {
        setTimeout(() => passwordInputRef.current?.focus(), 150);
      } else if (step === "mfa") {
        setTimeout(() => mfaInputRef.current?.focus(), 150);
      } else if (step === 2) {
        setTimeout(() => newPinRefs[0]?.current?.focus(), 150);
      } else if (step === 3) {
        setTimeout(() => confirmRefs[0]?.current?.focus(), 150);
      }
    }
  }, [isOpen, step]);

  const resetState = () => {
    setStep(1);
    setPassword("");
    setMfaCode("");
    setMfaResolver(null);
    setNewPin(["", "", "", ""]);
    setConfirmPin(["", "", "", ""]);
    setShowPassword(false);
    setShowPin(false);
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose?.();
  };

  // Re-authentication via Google Popup
  const handleGoogleReauth = async () => {
    try {
      setLoading(true);
      setError("");
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No active user session found.");

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await reauthenticateWithPopup(currentUser, provider);

      // Force refresh ID token to get updated auth_time claim
      await currentUser.getIdToken(true);

      setStep(2);
    } catch (err) {
      console.error("Google re-authentication error:", err);
      if (err?.code === "auth/multi-factor-auth-required") {
        setMfaResolver(getMultiFactorResolver(auth, err));
        setStep("mfa");
        return;
      }
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Verification popup was closed before completing.");
      } else {
        setError(err?.message || "Google verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-authentication via Email & Password
  const handleReauthSubmit = async (e) => {
    e?.preventDefault();
    if (!password) {
      setError("Please enter your account password to verify your identity.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        setStep(2);
        setLoading(false);
        return;
      }

      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // Force refresh ID token to ensure auth_time is fresh
      await currentUser.getIdToken(true);

      setPassword(""); // Clear password from state immediately
      setStep(2);
    } catch (err) {
      console.error("Re-authentication error:", err);
      if (err?.code === "auth/multi-factor-auth-required") {
        setMfaResolver(getMultiFactorResolver(auth, err));
        setStep("mfa");
        return;
      }
      if (
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-credential"
      ) {
        setError("Incorrect account password. Please try again.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a few moments before trying again.");
      } else {
        setError(err?.message || "Failed to verify account identity. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Resolve Two-Factor Authentication (MFA)
  const handleMfaSubmit = async (e) => {
    e?.preventDefault();
    if (!mfaResolver || mfaCode.length !== 6) {
      setError("Please enter the 6-digit authentication code.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const firstHint = mfaResolver.hints?.[0];
      if (!firstHint) {
        throw new Error("MFA resolver hints missing.");
      }

      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        firstHint.uid,
        mfaCode
      );

      await mfaResolver.resolveSignIn(assertion);

      // Refresh ID token to ensure fresh auth_time
      await auth.currentUser?.getIdToken(true);

      setMfaCode("");
      setMfaResolver(null);
      setStep(2);
    } catch (err) {
      console.error("MFA resolution error:", err);
      setError(err?.message || "Invalid two-factor authentication code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index, value, isConfirm = false) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const targetState = isConfirm ? [...confirmPin] : [...newPin];
    targetState[index] = cleanVal;

    if (isConfirm) {
      setConfirmPin(targetState);
    } else {
      setNewPin(targetState);
    }
    setError("");

    const targetRefs = isConfirm ? confirmRefs : newPinRefs;
    if (cleanVal && index < 3) {
      targetRefs[index + 1]?.current?.focus();
    }

    if (index === 3 && cleanVal) {
      const fullPin = targetState.join("");
      if (fullPin.length === 4) {
        if (!isConfirm) {
          setStep(3);
        } else {
          handleFinalSubmit(targetState);
        }
      }
    }
  };

  const handleKeyDown = (index, e, isConfirm = false) => {
    const targetState = isConfirm ? confirmPin : newPin;
    const targetRefs = isConfirm ? confirmRefs : newPinRefs;

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
      setNewPin(filled);
    }
    setError("");

    if (pasted.length === 4) {
      if (!isConfirm) {
        setStep(3);
      } else {
        handleFinalSubmit(filled);
      }
    } else {
      const targetRefs = isConfirm ? confirmRefs : newPinRefs;
      targetRefs[Math.min(digits.length, 3)]?.current?.focus();
    }
  };

  const handleFinalSubmit = async (overrideConfirm) => {
    const firstPinStr = newPin.join("");
    const secondPinStr = (overrideConfirm || confirmPin).join("");

    if (firstPinStr.length !== 4 || secondPinStr.length !== 4) {
      setError("Please fill all 4 digits of your new PIN.");
      return;
    }

    if (firstPinStr !== secondPinStr) {
      setError("PINs do not match. Please verify and try again.");
      setConfirmPin(["", "", "", ""]);
      setTimeout(() => confirmRefs[0]?.current?.focus(), 100);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Refresh ID token right before invoking callable
      await auth.currentUser?.getIdToken(true);

      const res = await resetTransactionPin({ newPin: firstPinStr });
      if (res?.success) {
        dispatch(setHasTransactionPin(true));
        setStep(4);
        toast.success("Transaction PIN reset successfully!");
        setTimeout(() => {
          resetState();
          onSuccess?.();
          onClose?.();
        }, 1600);
      }
    } catch (err) {
      console.error("Reset Transaction PIN error:", err);
      const cleanMsg =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Failed to reset transaction PIN. Please try again.";
      setError(cleanMsg);
      // Clear PIN on error
      setConfirmPin(["", "", "", ""]);
      setTimeout(() => confirmRefs[0]?.current?.focus(), 100);
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
      maxWidthClass="max-w-[420px]"
    >
      {step === 4 ? (
        <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground tracking-tight">
              PIN Reset Successful!
            </h3>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Your new 4-digit transaction PIN is active. Failed attempts have been cleared.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
              {step === 1 ? (
                <KeyRound className="w-6 h-6" />
              ) : step === "mfa" ? (
                <Smartphone className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              {step === 1
                ? "Verify Your Identity"
                : step === "mfa"
                ? "Two-Factor Authentication"
                : step === 2
                ? "Choose New 4-Digit PIN"
                : "Confirm New PIN"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {step === 1
                ? isGoogleUser
                  ? "Verify your account via Google or enter your password to authorize resetting your PIN."
                  : "For security, enter your account password to authorize resetting your transaction PIN."
                : step === "mfa"
                ? "Enter the 6-digit code from your authenticator app to authorize resetting your PIN."
                : step === 2
                ? "Choose a fresh 4-digit PIN you haven't used recently."
                : "Re-enter your 4-digit PIN to ensure accuracy."}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 1 || step === "mfa" ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 2 ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 3 ? "w-8 bg-primary" : "w-2 bg-muted"
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

          {/* STEP 1: IDENTITY RE-AUTHENTICATION */}
          {step === 1 && (
            <div className="space-y-4">
              {isGoogleUser && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleGoogleReauth}
                    disabled={loading}
                    className="w-full h-12 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-sm rounded-xl shadow-sm gap-3 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Verify with Google</span>
                  </Button>

                  <div className="relative text-center text-xs text-muted-foreground my-2">
                    <span className="bg-card px-2 relative z-10">or verify with password</span>
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleReauthSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-pin-password" className="text-xs font-semibold text-foreground">
                    Account Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reset-pin-password"
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="pr-10 h-12 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={loading}
                    className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* STEP MFA: TWO-FACTOR AUTHENTICATION RESOLUTION */}
          {step === "mfa" && (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-totp-code" className="text-xs font-semibold text-foreground">
                  6-Digit Authenticator Code
                </Label>
                <Input
                  id="mfa-totp-code"
                  ref={mfaInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => {
                    setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  disabled={loading}
                  className="h-12 rounded-xl text-center text-xl tracking-[0.3em] font-mono"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep(1);
                    setMfaResolver(null);
                    setMfaCode("");
                    setError("");
                  }}
                  disabled={loading}
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  Back
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2 & 3: NEW PIN & CONFIRM PIN */}
          {(step === 2 || step === 3) && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-center items-center gap-3">
                  {[0, 1, 2, 3].map((idx) => {
                    const currentVal = step === 2 ? newPin[idx] : confirmPin[idx];
                    const currentRef = step === 2 ? newPinRefs[idx] : confirmRefs[idx];

                    return (
                      <input
                        key={`reset-pin-${step}-${idx}`}
                        ref={currentRef}
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        maxLength={1}
                        value={currentVal}
                        onChange={(e) => handleDigitChange(idx, e.target.value, step === 3)}
                        onKeyDown={(e) => handleKeyDown(idx, e, step === 3)}
                        onPaste={(e) => handlePaste(e, step === 3)}
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

              <div className="space-y-2 pt-2">
                {step === 2 ? (
                  <Button
                    type="button"
                    disabled={loading || newPin.join("").length !== 4}
                    onClick={() => setStep(3)}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
                  >
                    <span>Confirm PIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={loading || confirmPin.join("").length !== 4}
                    onClick={() => handleFinalSubmit()}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-lg shadow-primary/20 gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resetting PIN...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Save New PIN</span>
                      </>
                    )}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (step === 3) {
                      setStep(2);
                      setConfirmPin(["", "", "", ""]);
                    } else {
                      setStep(1);
                    }
                  }}
                  disabled={loading}
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </ModalPortal>
  );
}

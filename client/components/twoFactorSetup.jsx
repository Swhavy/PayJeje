import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useTOTP } from "./hooks/useTOTP";
import { X, Loader2, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TwoFactorSetupModal({
  isOpen,
  user,
  onClose,
  onEnrolled,
  onCancelled,
  onUnenrolled,
  onEnrollmentFailed,
  onError,
}) {
  const [otpInput, setOtpInput] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const inputRef = useRef(null);

  const {
    phase,
    qrUri,
    manualKey,
    error,
    isEnrolled,
    startEnrollment,
    verifyAndEnroll,
    unenroll,
    reset,
    clearError,
  } = useTOTP(user);

  const handleVerify = async () => {
    if (otpInput.length !== 6) return;
    const success = await verifyAndEnroll(otpInput);
    if (success) {
      setOtpInput("");
      onEnrolled?.();
    } else {
      onEnrollmentFailed?.();
    }
  };

  const handleUnenroll = async () => {
    const success = await unenroll();
    success ? onUnenrolled?.() : onError?.();
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpInput(val);
    clearError();
  };

  const handleClose = () => {
    const didNotComplete = phase !== "enrolled";
    if (didNotComplete) {
      onCancelled?.();
    }
    reset();
    onClose();
  };

  return (
    <ModalPortal
      isOpen={Boolean(isOpen)}
      onClose={handleClose}
      maxWidthClass="max-w-md"
      ariaLabel="Two-Factor Authentication Setup"
    >
      <div className="relative">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          className="pw-tap pw-pressable absolute -top-2 -right-2 inline-flex items-center justify-center rounded-panel text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </button>

        {isEnrolled && phase !== "idle" ? (
          <div className="text-center space-y-4">
            <div className="pw-tile mx-auto w-12 h-12 rounded-pill">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-section-title text-foreground">
                Two-Factor Authentication
              </h2>
              <p className="text-sm text-muted-foreground">
                Your account is protected with an authenticator app.
              </p>
            </div>
            {error && (
              <div className="bg-destructive/10 border border-destructive/25 rounded-panel p-3">
                <p className="text-destructive text-caption">{error}</p>
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              onClick={handleUnenroll}
              className="w-full"
            >
              Disable 2FA
            </Button>
          </div>
        ) : phase === "idle" ? (
          <div className="text-center space-y-4">
            <div className="pw-tile mx-auto w-12 h-12 rounded-pill">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-section-title text-foreground">
                Enable Two-Factor Authentication
              </h2>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security using Google Authenticator or Authy.
              </p>
            </div>
            <Button type="button" onClick={startEnrollment} className="w-full">
              Enable Two-Factor Authentication
            </Button>
          </div>
        ) : phase === "generating" ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-sm text-muted-foreground">Setting up your 2FA...</p>
          </div>
        ) : phase === "ready" || phase === "verifying" ? (
          <div className="space-y-4">
            <h3 className="text-section-title text-foreground text-center pr-6">
              Scan with Authenticator App
            </h3>

            <div className="flex justify-center p-4 pw-panel">
              <div className="p-2 bg-white rounded-panel">
                <QRCodeCanvas
                  value={qrUri}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#111111"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManualKey((p) => !p)}
              className="w-full"
            >
              {showManualKey ? "Hide manual key" : "Can't scan? Enter key manually"}
            </Button>

            {showManualKey && (
              <div className="pw-panel p-3.5 space-y-1">
                <span className="pw-label block">MANUAL ENTRY KEY</span>
                <code className="text-brand-400 pw-num text-sm break-all block">
                  {manualKey}
                </code>
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-caption text-muted-foreground text-center">
                Enter the 6-digit code from your authenticator app
              </p>
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otpInput}
                onChange={handleOtpChange}
                maxLength={6}
                autoFocus
                className="text-center text-2xl tracking-widest pw-num h-12"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/25 rounded-panel p-3">
                <p className="text-destructive text-caption">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={phase === "verifying"}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleVerify}
                disabled={otpInput.length !== 6 || phase === "verifying"}
                className="flex-1"
              >
                {phase === "verifying" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  "Confirm & Enable"
                )}
              </Button>
            </div>
          </div>
        ) : phase === "enrolled" ? (
          <div className="text-center space-y-4">
            <div className="pw-tile mx-auto w-14 h-14 rounded-pill">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-section-title text-foreground">2FA Enabled</h3>
              <p className="text-sm text-muted-foreground">
                Your account is protected. You&apos;ll need your authenticator code when signing in.
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                reset();
                onEnrolled?.();
                handleClose();
              }}
            >
              Done
            </Button>
          </div>
        ) : phase === "error" ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 bg-destructive/10 border border-destructive/25 rounded-pill flex items-center justify-center text-destructive">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-section-title text-foreground">Setup Failed</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button type="button" onClick={startEnrollment} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ModalPortal>
  );
}

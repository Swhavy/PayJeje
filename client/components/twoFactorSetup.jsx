import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useTOTP } from "./hooks/useTOTP";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function TwoFactorSetupModal({
  isOpen,
  user,
  onClose,
  onEnrolled,
  onCancelled,
  onUnenrolled,
  onEnrollmentFailed,
  onError, //onError is triggered when a failure during 2FA disabling occurs.
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

  if (!isOpen) return null;

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
      onCancelled?.(); //notify parent if user closed modal before completing enrollment/unenrollment
    }
    reset();
    onClose();
  };

  // ─── Already enrolled view ─────────────────────────────────────────────────
  if (isEnrolled && phase !== "idle") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] rounded-2xl border border-[#1a3a52] p-8 max-w-md w-full shadow-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#8aa6b8] hover:text-[#e8f0f8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-[#1a3a52] rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#00FF41]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#e8f0f8] text-center mb-3">
            Two-Factor Authentication
          </h2>

          <p className="text-[#8aa6b8] text-center text-sm mb-6">
            Your account is protected with an authenticator app.
          </p>

          {error && (
            <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg p-3 mb-6">
              <p className="text-[#FF6B6B] text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleUnenroll}
            className="w-full px-4 py-3 bg-[#FF6B6B] text-white rounded-lg font-medium hover:bg-[#FF5252] transition-all"
          >
            Disable 2FA
          </button>
        </div>
      </div>
    );
  }

  // ─── Idle / entry point ────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] rounded-2xl border border-[#1a3a52] p-8 max-w-md w-full shadow-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#8aa6b8] hover:text-[#e8f0f8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-[#1a3a52] rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#00FF41]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#e8f0f8] text-center mb-3">
            Enable Two-Factor Authentication
          </h2>

          <p className="text-[#8aa6b8] text-center text-sm mb-6">
            Add an extra layer of security to your Paywaka account using an
            authenticator app like Google Authenticator or Authy.
          </p>

          <button
            onClick={startEnrollment}
            className="w-full px-4 py-3 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold hover:bg-[#00cc33] transition-all"
          >
            Enable Two-Factor Authentication
          </button>
        </div>
      </div>
    );
  }

  // ─── Generating secret ─────────────────────────────────────────────────────
  if (phase === "generating") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] rounded-2xl border border-[#1a3a52] p-8 max-w-md w-full shadow-2xl flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#00FF41] animate-spin mb-4" />
          <p className="text-[#8aa6b8]">Setting up your 2FA...</p>
        </div>
      </div>
    );
  }

  // ─── Ready: show QR + verify input ────────────────────────────────────────
  if (phase === "ready" || phase === "verifying") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] rounded-2xl border border-[#1a3a52] p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#8aa6b8] hover:text-[#e8f0f8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-bold text-[#e8f0f8] text-center mb-6">
            Scan with your authenticator app
          </h3>

          <div className="flex justify-center mb-6 p-4 bg-[#1a3a52]/50 rounded-lg border border-[#1a3a52]">
            <QRCodeCanvas
              value={qrUri}
              size={160}
              bgColor="#ffffff"
              fgColor="#111111"
            />
          </div>

          <button
            className="w-full px-4 py-2 bg-[#1a3a52] text-[#00FF41] rounded-lg text-sm font-medium hover:bg-[#2a4a62] transition-all mb-4"
            onClick={() => setShowManualKey((p) => !p)}
          >
            {showManualKey ? "Hide" : "Can't scan? Enter key manually"}
          </button>

          {showManualKey && (
            <div className="bg-[#1a3a52]/50 border border-[#1a3a52] rounded-lg p-4 mb-4">
              <p className="text-[#8aa6b8] text-xs uppercase tracking-wide mb-2">
                Manual entry key:
              </p>
              <code className="text-[#00FF41] font-mono text-sm break-all">
                {manualKey}
              </code>
            </div>
          )}

          <div className="border-t border-[#1a3a52] my-4" />

          <p className="text-[#8aa6b8] text-center text-sm mb-4">
            Enter the 6-digit code from your authenticator app
          </p>

          <input
            ref={inputRef}
            className="w-full px-4 py-3 bg-[#1a3a52] border border-[#2a4a62] rounded-lg text-[#e8f0f8] placeholder-[#8aa6b8] focus:border-[#00FF41] focus:outline-none focus:ring-1 focus:ring-[#00FF41] transition-all text-center text-2xl tracking-widest font-mono mb-4"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={otpInput}
            onChange={handleOtpChange}
            maxLength={6}
            autoFocus
          />

          {error && (
            <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg p-3 mb-4">
              <p className="text-[#FF6B6B] text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-3 bg-[#1a3a52] border border-[#2a4a62] rounded-lg text-[#e8f0f8] font-medium hover:bg-[#2a4a62] transition-all disabled:opacity-50"
              onClick={handleClose}
              disabled={phase === "verifying"}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-3 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold hover:bg-[#00cc33] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleVerify}
              disabled={otpInput.length !== 6 || phase === "verifying"}
            >
              {phase === "verifying" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Confirm & Enable"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Enrolled success ──────────────────────────────────────────────────────
  if (phase === "enrolled") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] rounded-2xl border border-[#1a3a52] p-8 max-w-md w-full shadow-2xl text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-[#00FF41]/10 border border-[#00FF41]/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-[#00FF41]" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-[#e8f0f8] mb-3">
            2FA Enabled
          </h3>

          <p className="text-[#8aa6b8] text-sm mb-6">
            Your account is now protected. You&apos;ll need your authenticator
            app each time you sign in.
          </p>

          <button
            className="w-full px-4 py-3 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold hover:bg-[#00cc33] transition-all"
            onClick={() => {
              reset();
              onEnrolled?.();
              handleClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative bg-[#0a1628] border border-red-500/20 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#8aa6b8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
          </div>

          <h3 className="text-white text-xl font-bold mb-2">Setup Failed</h3>
          <p className="text-[#8aa6b8] text-sm mb-6">{error}</p>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 bg-[#1a2f4a] text-[#8aa6b8] rounded-lg hover:bg-[#1a3a52] transition-all text-sm"
            >
              Close
            </button>
            <button
              onClick={startEnrollment}
              className="flex-1 py-3 bg-[#00FF41] text-[#0a1628] rounded-lg font-semibold hover:bg-[#00e63a] transition-all text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

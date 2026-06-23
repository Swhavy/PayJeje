import { useState, useCallback } from "react";
import { multiFactor, TotpMultiFactorGenerator } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "../../firebaseConfig";

/**
 * useTOTP — manages the full TOTP 2FA lifecycle:
 *   idle → generating → ready (QR shown) → verifying → enrolled
 *   also handles: unenrolling
 */
export const useTOTP = (user) => {
  const [phase, setPhase] = useState("idle"); // idle | generating | ready | verifying | enrolled | error
  const [qrUri, setQrUri] = useState(null);
  const [manualKey, setManualKey] = useState(null);
  const [totpSecret, setTotpSecret] = useState(null); // held in state between phases
  const [error, setError] = useState(null);

  const clearError = () => setError(null);

  // ─── Phase 1: Generate secret + QR ───────────────────────────────────────
 const startEnrollment = useCallback(async () => {
   if (!user) return;
   setPhase("generating");
   setError(null);

   try {
     await user.reload(); // ← refresh stale token
     const freshUser = auth.currentUser;

     const session = await multiFactor(freshUser).getSession();
     const secret = await TotpMultiFactorGenerator.generateSecret(session);
     const uri = secret.generateQrCodeUrl(freshUser.email, "PayWaka");

     setTotpSecret(secret);
     setQrUri(uri);
     setManualKey(secret.secretKey);
     setPhase("ready");
   } catch (err) {
     // 400 after recent unenroll — session is stale
     if (
       err.code === "auth/user-token-expired" ||
       err.code === "auth/requires-recent-login" ||
       err?.customData?.httpStatus === 400
     ) {
       setError(
         "Your session expired. Please sign out and sign back in before enabling 2FA.",
       );
       toast.error("Session expired — please sign in again to enable 2FA.");
     } else {
       setError("Failed to start 2FA setup. Please try again.");
       toast.error("Failed to generate 2FA setup.");
     }
     setPhase("error"); // ← new phase to show error UI
   }
 }, [user]);

  // ─── Phase 2: Verify code + finalize enrollment ───────────────────────────
  const verifyAndEnroll = useCallback(
    async (otpCode) => {
      if (!totpSecret || !otpCode) return;
      setPhase("verifying");
      setError(null);

      try {
        const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
          totpSecret,
          otpCode,
        );
        await multiFactor(user).enroll(assertion, "Authenticator App");
        setPhase("enrolled");
        return true; //success signal
      } catch (err) {
        // common: auth/invalid-verification-code → wrong code entered
        if (err.code === "auth/invalid-verification-code") {
          setError(
            "Incorrect code. Check your authenticator app and try again.",
          );
        } else {
          setError(err.message || "Verification failed.");
        }
        setPhase("ready"); // let them retry without regenerating QR
        return false; //failure signal
      }
    },
    [user, totpSecret],
  );

  // ─── Unenroll ─────────────────────────────────────────────────────────────
  const unenroll = useCallback(async () => {
    if (!user) return false; // ← return false on guard
    setPhase("unenrolling");
    setError(null);

    try {
      await user.reload();
      const freshUser = auth.currentUser;
      const factors = multiFactor(freshUser).enrolledFactors;
      if (!factors.length) return false;
      await multiFactor(freshUser).unenroll(factors[0].uid);
      toast.success("2FA has been disabled on your account.");
      setPhase("idle");
      setQrUri(null);
      setManualKey(null);
      setTotpSecret(null);
      return true; // ← success signal
    } catch (err) {
      if (err.code === "auth/user-token-expired") {
        toast.error("Session expired. Please sign in again.");
        setError("Session expired. Please sign in again.");
      } else if (err.code === "auth/requires-recent-login") {
        toast.error("Please sign out and sign back in before disabling 2FA.");
        setError("Recent login required. Please sign in again.");
      } else {
        toast.error("Failed to disable 2FA. Please try again.");
        setError(err.message || "Failed to disable 2FA.");
      }
      setPhase("idle");
      return false; // ← failure signal
    }
  }, [user]);

  // ─── Reset back to idle (e.g. user cancels) ───────────────────────────────
  const reset = useCallback(() => {
    setPhase("idle");
    setQrUri(null);
    setManualKey(null);
    setTotpSecret(null);
    setError(null);
  }, []);

  const isEnrolled = user
    ? multiFactor(user)?.enrolledFactors?.length > 0
    : false;

  return {
    phase, // current step in the flow
    qrUri, // URI for QRCodeCanvas
    manualKey, // raw secret key (for manual entry in authenticator apps)
    error,
    isEnrolled,
    startEnrollment,
    verifyAndEnroll,
    unenroll,
    reset,
    clearError,
  };
};;

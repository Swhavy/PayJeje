import { useState } from "react";
import { useTOTP } from "./hooks/useTOTP";
import { ShieldOff, Loader2, X } from "lucide-react";

const Disable2FA = ({ user, onSuccess, isOpen, isClose }) => {
  const { unenroll, error, phase } = useTOTP(user);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(false);

  const handleDisable = async () => {
    const success = await unenroll();
    setConfirming(false);

    if (success) {
      onSuccess?.();
      setStatus(true);
      setTimeout(() => isClose(true), 3000);
    } else {
      setStatus(false);
      onError?.();
    }
  };

  // ─── Initial button ───────────────────────────────────────────────
  //   if (!confirming) {
  //     return (
  //       <button
  //         onClick={() => setConfirming(true)}
  //         className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm font-medium"
  //       >
  //         <ShieldOff className="w-4 h-4" />
  //         Disable 2FA
  //       </button>
  //     );
  //   }

  // ─── Confirmation modal ───────────────────────────────────────────
  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative bg-[#0a1628] border border-red-500/20 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          {/* Close button */}
          <button
            onClick={() => {
              setConfirming(false);
              isClose(status);
            }}
            className="absolute top-4 right-4 text-[#8aa6b8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
              <ShieldOff className="w-7 h-7 text-red-400" />
            </div>
          </div>

          <h3 className="text-white text-xl font-bold text-center mb-2">
            Disable Two-Factor Authentication?
          </h3>
          <p className="text-[#8aa6b8] text-sm text-center mb-6">
            This will remove the extra layer of security from your PayWaka
            account. You can re-enable it anytime.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              disabled={phase === "unenrolling"}
              className="flex-1 py-3 bg-[#1a2f4a] text-[#8aa6b8] rounded-lg hover:bg-[#1a3a52] transition-all text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDisable}
              disabled={phase === "unenrolling"}
              className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {phase === "unenrolling" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Yes, Disable"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default Disable2FA;

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export default function PasswordResetModal({
  isOpen,
  onConfirm,
  onCancel,
  userEmail = "user@example.com",
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] rounded-2xl border border-[#1a3a52] p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-[#1a3a52] rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[#FF6B6B]" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[#e8f0f8] text-center mb-3">
          Reset Password?
        </h2>

        <p className="text-[#8aa6b8] text-center text-sm mb-6">
          A password reset link will be sent to{" "}
          <span className="text-[#00FF41] font-semibold">{userEmail}</span>.
          This action cannot be undone.
        </p>

        {error && (
          <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg p-3 mb-6">
            <p className="text-[#FF6B6B] text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-[#1a3a52] border border-[#2a4a62] rounded-lg text-[#e8f0f8] font-medium hover:bg-[#2a4a62] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-red-600 rounded-lg text-foreground font-medium hover:bg-[#FF5252] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </div>

        <p className="text-[#8aa6b8] text-xs text-center mt-6">
          Check your email and spam folder for the reset link
        </p>
      </div>
    </div>
  );
}

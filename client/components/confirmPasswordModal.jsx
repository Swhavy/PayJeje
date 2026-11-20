import { useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

export default function PasswordResetModal({
  isOpen,
  onConfirm,
  onCancel,
  userEmail = "user@example.com",
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <ModalPortal
      isOpen={Boolean(isOpen)}
      onClose={onCancel}
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
      maxWidthClass="max-w-md"
      ariaLabel="Reset Password"
    >
      <div className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-pill bg-destructive/10 border border-destructive/25 text-destructive flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-section-title text-foreground">Reset Password?</h2>
          <p className="text-sm text-muted-foreground">
            A password reset link will be sent to{" "}
            <span className="text-brand-400 font-semibold">{userEmail}</span>.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-panel p-3 text-left">
            <p className="text-destructive text-caption font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </div>

        <p className="text-caption text-muted-foreground">
          Check your inbox and spam folder for the reset link.
        </p>
      </div>
    </ModalPortal>
  );
}

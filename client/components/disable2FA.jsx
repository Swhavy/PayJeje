import { useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { useTOTP } from "./hooks/useTOTP";
import { ShieldOff, Loader2, X } from "lucide-react";

const Disable2FA = ({ user, onSuccess, onError, isOpen, isClose }) => {
  const { unenroll, error, phase } = useTOTP(user);
  const [status, setStatus] = useState(false);

  const handleDisable = async () => {
    const success = await unenroll();

    if (success) {
      onSuccess?.();
      setStatus(true);
      setTimeout(() => isClose(true), 1500);
    } else {
      setStatus(false);
      onError?.();
    }
  };

  return (
    <ModalPortal
      isOpen={Boolean(isOpen)}
      onClose={() => isClose(status)}
      maxWidthClass="max-w-sm"
      ariaLabel="Disable Two-Factor Authentication"
    >
      <div className="relative text-center space-y-4">
        <button
          type="button"
          onClick={() => isClose(status)}
          aria-label="Close modal"
          className="pw-tap pw-pressable absolute -top-2 -right-2 inline-flex items-center justify-center rounded-panel text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-12 h-12 bg-destructive/10 border border-destructive/25 rounded-pill flex items-center justify-center text-destructive">
          <ShieldOff className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-section-title text-foreground">
            Disable Two-Factor Authentication?
          </h3>
          <p className="text-sm text-muted-foreground">
            This removes authenticator protection from your PayWaka account. You can re-enable it anytime.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/25 rounded-panel px-4 py-3">
            <p className="text-destructive text-caption font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => isClose(false)}
            disabled={phase === "unenrolling"}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDisable}
            disabled={phase === "unenrolling"}
            className="flex-1"
          >
            {phase === "unenrolling" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Disabling...</span>
              </>
            ) : (
              "Yes, Disable"
            )}
          </Button>
        </div>
      </div>
    </ModalPortal>
  );
};

export default Disable2FA;

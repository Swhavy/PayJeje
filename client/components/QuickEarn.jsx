import { useState } from "react";
import { X, Gift, Users, Zap, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModalPortal from "@/components/ui/ModalPortal";
import { ReceiptStrip } from "@/components/receipts/ReceiptParts";
import CheckInCalendar from "./CheckinModal";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";

const quickActions = [
  {
    icon: Gift,
    title: "Daily Check-In Bonus",
    description: "Claim today's reward instantly.",
    buttonText: "Claim Now",
    action: "checkin",
    neutral: false,
  },
  {
    icon: Users,
    title: "Refer & Earn",
    description: "Invite friends and earn ₦50 per referral.",
    buttonText: "Refer Now",
    action: "refer",
    neutral: true,
  },
  {
    icon: Zap,
    title: "Pay & Earn",
    description: "Get cashback when you pay bills or buy data.",
    buttonText: "Start Earning",
    action: "pay",
    neutral: false,
  },
  {
    icon: Share2,
    title: "Social Share Bonus",
    description: "Share your referral link with friends.",
    buttonText: "Share Now",
    action: "share",
    neutral: true,
  },
];

const QuickEarnModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const reflink = useSelector((state) => state.user.user);
  const referralCode = reflink?.referralCode || "";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://paywaka.com";
  const referralLink = `${origin}/auth/register/${referralCode}`;

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied to clipboard!");
    } catch {
      toast.error("Unable to copy referral link");
    }
  };

  return (
    <>
      <CheckInCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />

      <ModalPortal
        isOpen={Boolean(isOpen)}
        onClose={onClose}
        variant="sheet"
        noPadding
        maxWidthClass="max-w-xl"
        ariaLabel="Quick Earn"
      >
        <ReceiptStrip />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border shrink-0">
          <div>
            <h2 className="text-card-title text-foreground">Quick Earn</h2>
            <p className="text-caption text-muted-foreground">
              Earn rewards instantly from daily actions
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 pb-safe overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.action}
                className="pw-panel p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      action.neutral ? "pw-tile-neutral h-10 w-10" : "pw-tile h-10 w-10"
                    }
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">
                      {action.title}
                    </h3>
                    <p className="text-caption text-muted-foreground mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (action.action === "checkin") {
                      setIsCalendarOpen(true);
                    } else if (action.action === "refer" || action.action === "share") {
                      copyReferralLink();
                    } else if (action.action === "pay") {
                      onClose?.();
                      navigate("/services/data");
                    }
                  }}
                  className="w-full"
                >
                  {action.buttonText}
                </Button>
              </div>
            );
          })}
        </div>
      </ModalPortal>
    </>
  );
};

export default QuickEarnModal;

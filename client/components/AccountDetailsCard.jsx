import { useState } from "react";
import {
  Building2,
  Wallet,
  Share2,
  ShieldCheck,
  ArrowDownLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ModalPortal from "@/components/ui/ModalPortal";
import {
  ReceiptCopyButton,
  ReceiptStatusPill,
  ReceiptStrip,
} from "@/components/receipts/ReceiptParts";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";

export default function AccountDetailsDialog({
  accountNumber,
  bankName,
  barterId,
  userName,
  open,
  isClose,
}) {
  const user = useSelector((state) => state?.user?.user) || {};
  const [activeTab, setActiveTab] = useState("bank"); // "bank" | "p2p"

  const resolvedAccount = accountNumber || user.accountNumber || "••••••••••";
  const resolvedBank = bankName || user.bankName || "Virtual Bank";
  const resolvedBarterId = barterId || user.barter_id || user.barterID || "";
  const resolvedName =
    userName ||
    user.userName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    "PayWaka User";

  const shareDetails = async (type) => {
    const text =
      type === "p2p"
        ? `Pay me on PayWaka instantly with ₦0 fee!\nMy Barter ID: ${resolvedBarterId}\nPayWaka Tag: @${user.userName || resolvedName}`
        : `Pay into my PayWaka Virtual Account (₦0 fee):\nBank: ${resolvedBank}\nAccount Number: ${resolvedAccount}\nAccount Name: PayWaka - ${resolvedName}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "PayWaka Account Details",
          text,
        });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Account details copied to clipboard!");
      } catch {
        toast.error("Unable to copy account details");
      }
    }
  };

  return (
    <ModalPortal
      isOpen={Boolean(open)}
      onClose={() => isClose?.(false)}
      variant="sheet"
      noPadding
      maxWidthClass="max-w-[440px]"
      ariaLabel="Receive Funds"
    >
      <ReceiptStrip />

      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-card-title text-foreground">Receive Funds</h2>
            <ReceiptStatusPill status="success" label="₦0 FEE" />
          </div>
          <p className="text-caption text-muted-foreground">
            Fund via Bank Transfer or PayWaka P2P
          </p>
        </div>
        <button
          type="button"
          onClick={() => isClose?.(false)}
          aria-label="Close account details"
          className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 pb-safe">
        {/* Segmented Mode Selector */}
        <div className="pw-segmented grid grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("bank")}
            className={cn(
              "min-h-10 text-xs font-bold rounded-pill transition-all",
              activeTab === "bank"
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Bank Transfer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("p2p")}
            className={cn(
              "min-h-10 text-xs font-bold rounded-pill transition-all",
              activeTab === "p2p"
                ? "bg-card text-brand-400 shadow-sm border border-brand-400/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            PayWaka P2P
          </button>
        </div>

        {/* TAB 1: BANK TRANSFER */}
        {activeTab === "bank" && (
          <div className="space-y-4">
            <div className="pw-panel p-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="pw-tile h-10 w-10">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="pw-label block">BANK NAME</span>
                  <p className="text-sm font-bold text-foreground truncate">
                    {resolvedBank}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="pw-label block">VIRTUAL ACCOUNT NUMBER</span>
                <div className="flex items-center justify-between gap-3 rounded-panel bg-background/60 p-3 border border-border/80">
                  <p className="pw-code text-xl font-black tracking-wider text-brand-400">
                    {resolvedAccount}
                  </p>
                  <ReceiptCopyButton value={resolvedAccount} label="Account Number" />
                </div>
              </div>

              <div className="pt-1">
                <span className="pw-label block">ACCOUNT NAME</span>
                <p className="text-xs font-bold text-foreground mt-0.5">
                  PayWaka - {resolvedName}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-panel bg-brand-tint border border-brand-400/25 text-brand-400 text-caption flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Zero deposit fee. Transfers credit in real time.</span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => shareDetails("bank")}
              className="w-full"
            >
              <Share2 className="h-4 w-4" />
              <span>Share Bank Details</span>
            </Button>
          </div>
        )}

        {/* TAB 2: PAYWAKA P2P (BARTER ID) */}
        {activeTab === "p2p" && (
          <div className="space-y-4">
            <div className="pw-panel p-4 space-y-3.5 border-brand-400/25">
              <div className="flex items-center gap-3">
                <div className="pw-tile h-10 w-10">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="pw-label block">PAYWAKA USERNAME</span>
                  <p className="text-sm font-bold text-foreground truncate">
                    @{user.userName || resolvedName}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between gap-2">
                  <span className="pw-label">15-DIGIT BARTER ID</span>
                  <ReceiptStatusPill status="success" label="INSTANT" className="text-[9px]" />
                </div>

                {resolvedBarterId ? (
                  <div className="flex items-center justify-between gap-3 rounded-panel bg-background/60 p-3 border border-border/80">
                    <p className="pw-code text-lg font-black tracking-wider text-brand-400 truncate">
                      {resolvedBarterId}
                    </p>
                    <ReceiptCopyButton value={resolvedBarterId} label="Barter ID" />
                  </div>
                ) : (
                  <div className="p-3 rounded-panel bg-card border border-border text-center">
                    <p className="text-caption text-muted-foreground">
                      Provisioning your Barter ID. Click Refresh Balance on the dashboard.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-panel bg-brand-tint border border-brand-400/25 text-brand-400 text-caption flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 shrink-0" />
              <span>Zero fees on all inbound PayWaka P2P transfers.</span>
            </div>

            {resolvedBarterId && (
              <Button
                type="button"
                onClick={() => shareDetails("p2p")}
                className="w-full"
              >
                <Share2 className="h-4 w-4" />
                <span>Share My Barter ID</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
}

import React, { useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Copy, Check, Smartphone, Tv, Zap, Wifi, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PaymentSuccessfulModal({
  isOpen,
  onClose,
  data = {},
}) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const navigate = useNavigate();

  const {
    category = "Transaction",
    productName = "Service",
    network = "Default",
    amount = 0,
    customerId = "",
    tx_ref = "",
    token = "",
    bonusToEarn = "",
  } = data;

  const copyToClipboard = (text, isRef = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isRef) {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
      toast.success("Transaction Reference copied!");
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast.success("Electricity Token copied!");
    }
  };

  const getCategoryIcon = () => {
    const catLower = String(category || productName || "").toLowerCase();
    if (catLower.includes("airtime") || catLower.includes("data")) {
      return <Smartphone className="h-6 w-6 text-emerald-500" />;
    }
    if (catLower.includes("elec") || catLower.includes("power")) {
      return <Zap className="h-6 w-6 text-amber-500" />;
    }
    if (catLower.includes("cable") || catLower.includes("tv")) {
      return <Tv className="h-6 w-6 text-purple-500" />;
    }
    return <Wifi className="h-6 w-6 text-emerald-500" />;
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[440px]"
      className="p-6 relative overflow-hidden"
    >
      {/* Decorative Top Gradient Header */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative mb-3">
          <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center animate-bounce duration-1000">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Payment Successful!
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your {category || "bill"} request has been processed and delivered instantly.
        </p>
      </div>

      {/* Token / PIN Highlight Banner (for electricity / vouchers) */}
      {token && (
        <div className="my-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Electricity Meter Token / PIN
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="font-mono text-xl font-extrabold tracking-widest break-all">
              {token}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(token, false)}
              className="h-8 w-8 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
            >
              {copiedToken ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Receipt Details Box */}
      <div className="my-3 p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Service / Plan</span>
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            {getCategoryIcon()}
            {productName || category}
          </span>
        </div>

        {network && network !== "Default" && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Network / Provider</span>
            <span className="font-semibold text-foreground">{network}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Recipient / ID</span>
          <span className="font-semibold text-foreground font-mono">{customerId || "N/A"}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Amount Paid</span>
          <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
            ₦{Number(amount || 0).toLocaleString()}
          </span>
        </div>

        {bonusToEarn && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Bonus / Cashback</span>
            <span className="font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {bonusToEarn}
            </span>
          </div>
        )}

        <Separator className="my-1.5 opacity-60" />

        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Transaction Reference</span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-muted-foreground max-w-[140px] truncate" title={tx_ref}>
              {tx_ref || "N/A"}
            </span>
            {tx_ref && (
              <button
                type="button"
                onClick={() => copyToClipboard(tx_ref, true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20"
          onClick={onClose}
        >
          Done
        </Button>
        <Button
          variant="outline"
          className="w-full font-medium py-2.5 rounded-xl border-border/70 hover:bg-accent flex items-center justify-center gap-2"
          onClick={() => {
            onClose();
            navigate("/Transactions");
          }}
        >
          View Transaction History
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </ModalPortal>
  );
}

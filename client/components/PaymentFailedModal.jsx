import React, { useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  XCircle,
  Copy,
  Check,
  Smartphone,
  Tv,
  Zap,
  Wifi,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PaymentFailedModal({
  isOpen,
  onClose,
  onRetry,
  data = {},
}) {
  const [copiedRef, setCopiedRef] = useState(false);
  const navigate = useNavigate();

  const {
    category = "Transaction",
    productName = "Service",
    network = "",
    amount = 0,
    customerId = "",
    tx_ref = "",
    reason = "Transaction could not be completed by provider.",
    refunded = true,
  } = data;

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast.success("Transaction Reference copied!");
  };

  const getCategoryIcon = () => {
    const catLower = String(category || productName || "").toLowerCase();
    if (catLower.includes("airtime") || catLower.includes("data")) {
      return <Smartphone className="h-5 w-5 text-red-500" />;
    }
    if (catLower.includes("elec") || catLower.includes("power")) {
      return <Zap className="h-5 w-5 text-amber-500" />;
    }
    if (catLower.includes("cable") || catLower.includes("tv")) {
      return <Tv className="h-5 w-5 text-purple-500" />;
    }
    return <Wifi className="h-5 w-5 text-red-500" />;
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[440px]"
      className="p-6 relative overflow-hidden"
    >
      {/* Decorative Top Gradient Header */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative mb-3">
          <div className="h-16 w-16 rounded-full bg-red-500/15 flex items-center justify-center animate-pulse">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Payment Failed
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          We were unable to complete your {category || "bill"} purchase with the provider.
        </p>
      </div>

      {/* Wallet Safety / Refund Guarantee Banner */}
      <div
        className={`my-3 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${refunded
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
          : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
          }`}
      >
        {refunded ? (
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        )}
        <div>
          <span className="font-semibold block text-sm">
            {refunded ? "Wallet Balance Protected & Refunded" : "Payment Incomplete"}
          </span>
          <span>
            {refunded
              ? "Your PayWaka wallet was not charged (or has been automatically refunded to your balance)."
              : "Please review your balance or contact support if your wallet was deducted."}
          </span>
        </div>
      </div>

      {/* Failure Breakdown Box */}
      <div className="my-2 p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Service</span>
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

        {customerId && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Recipient / ID</span>
            <span className="font-semibold text-foreground font-mono">{customerId}</span>
          </div>
        )}

        {amount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Attempted Amount</span>
            <span className="font-bold text-base text-foreground">
              ₦{Number(amount || 0).toLocaleString()}
            </span>
          </div>
        )}

        <Separator className="my-1.5 opacity-60" />

        {/* Reason Section */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
            Reason / Diagnosis
          </span>
          <p className="text-xs text-muted-foreground bg-background/80 p-2.5 rounded-lg border border-border/40 leading-relaxed break-words">
            {reason || "Provider error. Please retry in a few moments."}
          </p>
        </div>

        {tx_ref && (
          <div className="flex justify-between items-center text-xs pt-1">
            <span className="text-muted-foreground font-medium">Reference</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-muted-foreground max-w-[140px] truncate" title={tx_ref}>
                {tx_ref}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(tx_ref)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {copiedRef ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {onRetry && (
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
            onClick={() => {
              onClose();
              onRetry();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            variant="outline"
            className="w-full font-medium py-2 rounded-xl border-border/70 hover:bg-accent text-xs"
            onClick={() => {
              onClose();
              navigate("/Wallet");
            }}
          >
            Check Wallet
          </Button>
          <Button
            variant="outline"
            className="w-full font-medium py-2 rounded-xl border-border/70 hover:bg-accent text-xs flex items-center justify-center gap-1.5"
            onClick={() => {
              onClose();
              navigate("/ContactSupport");
            }}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Support
          </Button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground text-xs py-1.5 h-auto"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </ModalPortal>
  );
}

import React from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";
import { Check, XCircle } from "lucide-react";
import { ReceiptStrip } from "@/components/receipts/ReceiptParts";

export default function FeedbackAlert({ message, isOpen, isClose }) {
  const isSuccess = Boolean(message?.status);

  return (
    <ModalPortal
      isOpen={Boolean(isOpen)}
      onClose={() => isClose?.(false)}
      noPadding
      maxWidthClass="max-w-md"
      ariaLabel={message?.statusMsg || "Notification"}
    >
      {isSuccess ? (
        <ReceiptStrip />
      ) : (
        <div className="h-1.5 w-full bg-destructive shrink-0" />
      )}

      <div className="p-6 text-center space-y-4">
        <div
          className={`mx-auto h-14 w-14 rounded-pill border flex items-center justify-center ${
            isSuccess
              ? "bg-brand-tint border-brand-400/30 text-brand-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {isSuccess ? (
            <Check className="h-7 w-7" />
          ) : (
            <XCircle className="h-7 w-7" />
          )}
        </div>

        <div className="space-y-1.5">
          <h2 className="text-section-title text-foreground">
            {message?.statusMsg || (isSuccess ? "Success" : "An error occurred")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message?.message || "Something went wrong. Please try again."}
          </p>
        </div>

        <Button
          type="button"
          variant={isSuccess ? "default" : "outline"}
          className="w-full"
          onClick={() => isClose?.(false)}
        >
          Dismiss
        </Button>
      </div>
    </ModalPortal>
  );
}

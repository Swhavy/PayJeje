import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import PaywakaReceiptView, {
  PaywakaReceiptSurface,
} from "@/components/receipts/PaywakaReceiptView";

/**
 * Re-exported for backward compatibility across any component referencing OfficialPayWakaReceiptCard.
 */
export function OfficialPayWakaReceiptCard({
  transaction,
  cardRef,
  id = "paywaka-official-receipt-card",
  theme = "dark",
  includeQr = true,
  maskDigits = true,
  includeSeal = true,
}) {
  return (
    <PaywakaReceiptSurface
      transaction={transaction}
      cardRef={cardRef}
      id={id}
      theme={theme}
      includeQr={includeQr}
      maskDigits={maskDigits}
      includeSeal={includeSeal}
      isExportCanvas={true}
    />
  );
}

/**
 * Responsive Transaction Detail & Glassmorphic / Printable Receipt Modal.
 * Sized cleanly so the full receipt + controls appear at a glance without unnecessary scrolling.
 */
export default function TransactionsModal({ transaction, isOpen, onClose }) {
  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        onInteractOutside={(e) => {
          if (
            document.getElementById("paywaka-export-settings-portal") ||
            document.getElementById("paywaka-share-receipt-portal")
          ) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (
            document.getElementById("paywaka-export-settings-portal") ||
            document.getElementById("paywaka-share-receipt-portal")
          ) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          if (
            document.getElementById("paywaka-export-settings-portal") ||
            document.getElementById("paywaka-share-receipt-portal")
          ) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (
            document.getElementById("paywaka-export-settings-portal") ||
            document.getElementById("paywaka-share-receipt-portal")
          ) {
            e.preventDefault();
          }
        }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-[calc(100vw-24px)] max-w-[396px] pw-glass-hero text-foreground p-3 sm:p-3.5 shadow-2xl rounded-card max-h-[94vh] overflow-y-auto overflow-x-hidden z-[100] m-0 outline-none [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">
          PayWaka Transaction Receipt
        </DialogTitle>
        <PaywakaReceiptView
          transaction={transaction}
          mode="modal"
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AccountDetailsDialog({
  accountNumber,
  bankName,
  open,
  isClose,
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      toast("Account number copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast("Please try again");
    }
  };

  return (
    <Dialog open={open} onOpenChange={isClose}>
      <AnimatePresence mode="wait">
        {open && (
          <>
            <DialogOverlay>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogOverlay>

            <DialogContent className="sm:max-w-md absolute m-auto inset-0 z-[100] h-[70vh] min-h-[300px] max-h-[400px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 50 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">
                    Account Details
                  </DialogTitle>
                  <DialogDescription>
                    Your account information for receiving funds
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                  <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/80 p-6 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Bank Name
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {bankName}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Account Number
                        </p>
                        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3 border border-border/50">
                          <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                            {accountNumber}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={copyToClipboard}
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Share this account number to receive payments
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

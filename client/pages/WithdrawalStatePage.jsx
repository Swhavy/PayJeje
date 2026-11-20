import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Check,
  Sparkles,
  ChevronLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import useCloudfunc from "@/components/useCloudfunc";
import PaywakaReceiptView, {
  ProcessorFeeSlipCard,
} from "@/components/receipts/PaywakaReceiptView";
import {
  getTransactionDisplayTitle,
  formatNairaAmount,
} from "@/lib/receiptUtils";

/**
 * Re-exported alias for backward compatibility.
 */
export function PaymentProcessorFeeReceiptCard({
  fee,
  initialRef,
  txnDate,
  accountHolder,
  destination,
  isP2P = false,
}) {
  return (
    <ProcessorFeeSlipCard
      transaction={{
        fee,
        tx_ref: initialRef,
        reference: initialRef,
        created_at: txnDate,
        recipientName: accountHolder,
        bankName: destination,
        isP2P,
      }}
    />
  );
}

export default function WithdrawalStatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user) || {};

  const passedData = location.state || {};
  const amount = Number(passedData.amount || 0);
  const bankName = passedData.bankName || "Destination Bank";
  const accountNumber = passedData.accountNumber || "";
  const accountHolder =
    passedData.accountHolder ||
    passedData.recipientName ||
    "Beneficiary";
  const initialRef = passedData.reference || "";
  const initialNarration = passedData.narration || initialRef;

  const isP2P = Boolean(
    passedData.isP2P ||
      bankName?.toLowerCase().includes("paywaka") ||
      initialRef.toLowerCase().startsWith("pwkp2p") ||
      initialRef.startsWith("PWK-P2P"),
  );
  const fee =
    passedData.fee !== undefined
      ? Number(passedData.fee)
      : isP2P
        ? 0
        : amount <= 5000
          ? 10
          : amount <= 50000
            ? 25
            : 50;

  const { verifyWithdrawalStatus } = useCloudfunc();
  const [liveTxDoc, setLiveTxDoc] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const statusStepMap = {
    NEW: { progress: 20, activeStep: 0 },
    PENDING: { progress: 50, activeStep: 1 },
    INITIATED: { progress: 78, activeStep: 2 },
    SUCCESSFUL: { progress: 100, activeStep: 4 },
    COMPLETED: { progress: 100, activeStep: 4 },
    FAILED: { progress: 100, activeStep: 4 },
    CANCELLED: { progress: 100, activeStep: 4 },
  };

  const [status, setStatus] = useState(
    passedData.gatewayStatus === "SUCCESSFUL" || isP2P ? "pending" : "pending",
  );
  const [failureReason, setFailureReason] = useState(null);
  const [progress, setProgress] = useState(20);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Verifying Account Credentials",
      desc: "Checking balance & account limits",
    },
    {
      title: isP2P ? "Settling PayWaka Internal Ledger" : "Connecting NIBSS Settlement Node",
      desc: isP2P ? "Routing instant zero-fee P2P transfer" : "Securing interbank settlement",
    },
    {
      title: "Debiting PayWaka Subaccount Vault",
      desc: "Authorizing atomic wallet ledger update",
    },
    {
      title: "Finalizing Transfer Acknowledgment",
      desc: "Confirming settlement receipt",
    },
  ];

  // Real-time Firestore listener on the active transaction document
  useEffect(() => {
    if (!initialRef || !user?.uid) return;

    const unsub = onSnapshot(
      doc(db, "users", user.uid, "Transactions", initialRef),
      (snap) => {
        if (!snap.exists()) return;
        const data = { id: snap.id, ...snap.data() };
        setLiveTxDoc(data);

        const incomingUpper = String(data.status || "PENDING").toUpperCase();
        const mapped = statusStepMap[incomingUpper] ?? statusStepMap.PENDING;
        setProgress(mapped.progress);
        setActiveStep(mapped.activeStep);

        if (incomingUpper === "SUCCESSFUL" || incomingUpper === "COMPLETED") {
          setStatus((prev) => {
            if (prev !== "success") {
              toast.success("Transfer Completed Successfully!", {
                description: `₦${Number(data.amount || amount).toLocaleString()} sent to ${data.recipientName || accountHolder}`,
              });
            }
            return "success";
          });
        } else if (incomingUpper === "FAILED" || incomingUpper === "CANCELLED") {
          setStatus("failed");
          setFailureReason(
            typeof data.failureReason === "string"
              ? data.failureReason
              : data.failureReason?.message || "Transfer could not be completed",
          );
        } else {
          setStatus("pending");
        }
      },
      (err) => {
        console.error("Transaction listener error:", err);
      },
    );

    return () => unsub();
  }, [initialRef, user?.uid]);

  // Automatic Background Settlement Poller while pending (guarantees UI never freezes on Step 2 if webhook/ngrok is delayed)
  useEffect(() => {
    if (status !== "pending" || !initialRef || !user?.uid || isP2P) return;

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 12;

    const runPoll = async () => {
      if (cancelled || pollCount >= maxPolls) return;
      pollCount += 1;
      try {
        const res = await verifyWithdrawalStatus({ reference: initialRef });
        const gwStatus = String(
          res?.status || res?.data?.status || "",
        ).toUpperCase();
        if (!cancelled && (gwStatus === "SUCCESSFUL" || gwStatus === "COMPLETED")) {
          setProgress(100);
          setActiveStep(4);
          setStatus("success");
        } else if (!cancelled && (gwStatus === "FAILED" || gwStatus === "CANCELLED")) {
          setStatus("failed");
          setFailureReason(
            res?.message ||
              res?.data?.complete_message ||
              "Transfer was declined by destination bank.",
          );
        }
      } catch (_) {
        // Silent background retry; user also has manual button below
      }
    };

    const initialTimer = setTimeout(runPoll, 4000);
    const interval = setInterval(runPoll, 7000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [status, initialRef, user?.uid, isP2P]);

  const handleVerifyStatusNow = async () => {
    if (!initialRef || isVerifying) return;
    try {
      setIsVerifying(true);
      toast.info("Querying gateway settlement status...");
      const res = await verifyWithdrawalStatus({ reference: initialRef });
      const gwStatus = String(res?.status || res?.data?.status || "").toUpperCase();
      if (gwStatus === "SUCCESSFUL" || gwStatus === "COMPLETED") {
        setProgress(100);
        setActiveStep(4);
        setStatus("success");
        toast.success("Transfer verified as SUCCESSFUL!");
      } else if (gwStatus === "FAILED" || gwStatus === "CANCELLED") {
        setStatus("failed");
        setFailureReason(
          res?.data?.complete_message ||
            res?.message ||
            "Transfer was declined by beneficiary bank.",
        );
        toast.error("Transfer failed. Your funds have been refunded to your wallet.");
      } else {
        toast.info(
          res?.message || "Transfer is still processing at interbank node. Please hold on.",
        );
      }
    } catch (err) {
      console.error("Status verification error:", err);
      toast.error(err.message || "Failed to reach settlement gateway.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Merge passed route state & live Firestore transaction doc cleanly
  const senderDisplayName =
    liveTxDoc?.senderName ||
    passedData.senderName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.userName ||
    "PayWaka User";

  const mergedReceiptTx = {
    tx_ref: initialRef,
    reference: initialRef,
    amount,
    fee,
    bankName,
    recipientBankName: bankName,
    accountNumber,
    recipientAccountNumber: accountNumber,
    accountHolder,
    recipientName: accountHolder,
    senderName: senderDisplayName,
    recipientUserName: passedData.recipientUserName || liveTxDoc?.recipientUserName || "",
    recipientBarterId: isP2P ? accountNumber : liveTxDoc?.recipientBarterId || "",
    senderBarterId: liveTxDoc?.senderBarterId || user.barter_id || user.barterID || "",
    narration: liveTxDoc?.narration || initialNarration,
    isP2P,
    type: "outflow",
    category: isP2P ? "Transfer" : "Withdrawal",
    status: status === "success" ? "SUCCESSFUL" : status === "failed" ? "FAILED" : "PENDING",
    createdAt: liveTxDoc?.createdAt || new Date(),
    ...(liveTxDoc || {}),
  };

  const displayTitle = getTransactionDisplayTitle(mergedReceiptTx);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Top Action & Channel Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/wallet"
              className="pw-pressable inline-flex items-center gap-1.5 min-h-9 px-3 rounded-pill bg-card/80 border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Wallet</span>
            </Link>

            {status === "success" && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="pw-chip-brand text-[10px]">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Completed</span>
                </span>
                <span className="text-xs font-bold text-foreground truncate hidden sm:inline" title={displayTitle}>
                  ₦{formatNairaAmount(mergedReceiptTx.amount)} settled to {accountHolder} ({bankName})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status === "success" && (
              <Button
                type="button"
                onClick={() => navigate("/wallet")}
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-bold rounded-pill"
              >
                New Transfer
              </Button>
            )}
            <span className="pw-chip-brand text-[10px] uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3 shrink-0" />
              <span>{isP2P ? "PayWaka P2P" : "NIBSS Instant"}</span>
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* PHASE 1: PENDING / PROCESSING VIEW                            */}
          {/* ============================================================ */}
          {status === "pending" && (
            <motion.div
              key="pending-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="max-w-[440px] mx-auto w-full"
            >
              <div className="pw-glass-hero">
                <div className="h-1.5 w-full bg-brand-strip shrink-0" />
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Compact Emblem + Status */}
                  <div className="flex flex-col items-center text-center space-y-2.5 pt-1">
                    <div className="relative">
                      <div className="pw-tile-gold h-14 w-14 rounded-2xl">
                        <Clock
                          className="h-7 w-7 animate-spin"
                          style={{ animationDuration: "6s" }}
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-60" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-warning border-2 border-card" />
                      </span>
                    </div>

                    <span className="pw-pill-gold text-[10px] uppercase tracking-wider">
                      Processing Settlement
                    </span>

                    <div className="space-y-1 max-w-full">
                      <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-snug break-words">
                        {displayTitle}
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Routing funds securely to{" "}
                        <span className="font-semibold text-foreground">{bankName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Amount & Destination Panel */}
                  <div className="pw-panel p-3.5 space-y-2.5">
                    <div className="text-center space-y-0.5">
                      <span className="pw-label block">TRANSFER AMOUNT</span>
                      <div className="pw-num text-2xl sm:text-[26px] font-black text-warning tracking-tight">
                        ₦{formatNairaAmount(mergedReceiptTx.amount)}
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-border/70 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0">Beneficiary</span>
                      <span className="font-bold text-foreground text-right truncate">
                        {accountHolder}
                      </span>
                    </div>
                    {accountNumber && (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground shrink-0">
                          {isP2P ? "Barter ID" : "Account No."}
                        </span>
                        <span className="pw-code font-bold text-foreground text-right">
                          {accountNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Settlement Progress Track */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">
                        Settlement Progress
                      </span>
                      <span className="pw-num font-bold text-warning">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-pill overflow-hidden border border-border">
                      <motion.div
                        className="h-full bg-gradient-to-r from-warning to-brand-400 rounded-pill"
                        initial={{ width: "15%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Compact Stepper Checklist */}
                  <div className="pw-panel p-3.5 space-y-3">
                    {steps.map((step, idx) => {
                      const isDone = idx < activeStep;
                      const isCurrent = idx === activeStep;
                      return (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <div
                            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold transition-all ${
                              isDone
                                ? "bg-brand-500 text-brand-foreground"
                                : isCurrent
                                  ? "bg-warning/15 text-warning border border-warning/40"
                                  : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : isCurrent ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p
                              className={`text-xs leading-snug ${
                                isDone
                                  ? "text-muted-foreground line-through font-medium"
                                  : isCurrent
                                    ? "text-foreground font-bold"
                                    : "text-muted-foreground font-medium"
                              }`}
                            >
                              {step.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Controls */}
                  <div className="space-y-2 pt-0.5">
                    <Button
                      type="button"
                      onClick={handleVerifyStatusNow}
                      disabled={isVerifying}
                      variant="outline"
                      className="w-full h-10 text-xs font-bold border-warning/35 text-warning hover:bg-warning/10"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span>Verify Status Now</span>
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">
                      Auto-checking interbank settlement every few seconds
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* PHASE 2: SUCCESSFUL SETTLEMENT + AT-A-GLANCE RECEIPT UI       */}
          {/* ============================================================ */}
          {status === "success" && (
            <motion.div
              key="success-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PaywakaReceiptView
                transaction={mergedReceiptTx}
                mode="page"
              />
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* PHASE 3: FAILED / REFUNDED VIEW                              */}
          {/* ============================================================ */}
          {status === "failed" && (
            <motion.div
              key="failed-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="max-w-[440px] mx-auto w-full"
            >
              <div className="pw-glass-hero">
                <div className="h-1.5 w-full bg-destructive shrink-0" />
                <div className="p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
                  <div className="pw-tile-ruby h-14 w-14 rounded-2xl">
                    <AlertCircle className="h-7 w-7" />
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-pill border border-destructive/30 bg-destructive/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-destructive">
                    Transfer Failed
                  </span>

                  <div className="space-y-1.5">
                    <h1 className="text-lg font-extrabold text-foreground tracking-tight">
                      Withdrawal Failed
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {failureReason || "Transfer could not be completed."}
                    </p>
                  </div>

                  <div className="w-full pw-panel border-brand-400/25 bg-brand-tint p-3 text-xs font-semibold text-brand-400">
                    Your wallet balance has been refunded automatically.
                  </div>

                  <Button asChild className="w-full h-11 text-sm">
                    <Link to="/wallet">Return to Wallet</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

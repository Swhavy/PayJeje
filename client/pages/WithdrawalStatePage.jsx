import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Download,
  Share2,
  RefreshCw,
  Building2,
  Wallet,
  ShieldCheck,
  Check,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  FileText,
  AlertCircle,
  Zap,
  Image as ImageIcon,
  FileType,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {db} from "@/firebaseConfig"
import { doc, onSnapshot } from "firebase/firestore";


// PayWaka Logo SVG Component (P + Upward Growth Arrows matching attached logo)
export function PayWakaLogoSVG({
  className = "w-6 h-6",
  opacity = 1,
  style = {},
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ opacity, ...style }}
    >
      <defs>
        <linearGradient id="pwStemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="pwLoopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="pwArrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Vertical P Stem */}
      <rect
        x="70"
        y="85"
        width="22"
        height="85"
        rx="5"
        fill="url(#pwStemGrad)"
      />

      {/* Main P Ring / Loop */}
      <path
        d="M 70 52 C 70 28, 148 28, 148 80 C 148 128, 70 128, 70 128"
        fill="none"
        stroke="url(#pwLoopGrad)"
        strokeWidth="24"
        strokeLinecap="round"
      />

      {/* Primary Upward Sweeping Growth Arrow */}
      <path
        d="M 40 122 C 40 82, 85 65, 134 80"
        fill="none"
        stroke="url(#pwArrowGrad)"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path d="M 122 62 L 152 78 L 128 98 Z" fill="url(#pwArrowGrad)" />

      {/* Secondary Upper Growth Arrow Accent */}
      <path
        d="M 126 70 L 162 38"
        fill="none"
        stroke="url(#pwArrowGrad)"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path d="M 144 30 L 174 28 L 165 58 Z" fill="url(#pwArrowGrad)" />
    </svg>
  );
}

// Reusable Official PayWaka Receipt Card Component matching preview image 1:1
function ReceiptCard({
  amount,
  bankName,
  accountNumber,
  accountHolder,
  initialRef,
  narration,
  txnDate,
  cardRef,
  id = "paywaka-receipt-card",
}) {
  const formatAmount = (val) => {
    const num = Number(val);
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  return (
    <div
      ref={cardRef}
      id={id}
      className="bg-background border border-[#0d223a] text-foreground p-6 sm:p-7 rounded-3xl relative overflow-hidden shadow-2xl max-w-md w-full mx-auto"
      style={{
        backgroundColor: "#060d1a",
        borderColor: "#0d223a",
        color: "#ffffff",
        borderRadius: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* WATERMARKS: Logo Watermark + PayWaka Word Watermark           */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none select-none flex flex-col items-center justify-center overflow-hidden z-0">
        {/* PayWaka Logo Watermark */}
        <img
          src="/logo.png"
          className="w-64 h-64 sm:w-72 sm:h-72 text-emerald-500 opacity-[0.10] transform -rotate-12 translate-y-3"
        />
        {/* PayWaka Word Watermark */}
        <span
          className="absolute text-emerald-500/10 text-4xl sm:text-5xl font-black uppercase tracking-[0.25em] transform -rotate-[22deg] whitespace-nowrap"
          style={{ color: "rgba(16, 185, 129, 0.08)" }}
        >
          PAYWAKA
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* HEADER: LOGO + TITLE + STATUS BADGE                           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between pb-4 border-b border-[#12253d] relative z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" className="w-12 h-12 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-emerald-400 font-black text-lg tracking-wider leading-none">
              PAYWAKA
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              NIBSS INSTANT DIRECT CREDIT
            </span>
          </div>
        </div>

        <div
          className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider"
          style={{
            backgroundColor: "rgba(4, 40, 28, 0.7)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            color: "#34d399",
          }}
        >
          SUCCESSFUL
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* HERO AMOUNT BOX                                               */}
      {/* ------------------------------------------------------------- */}
      <div
        className="my-4 p-4 sm:p-5 bg-[#030813] border border-[#0e1f33] rounded-2xl text-center relative z-10"
        style={{ backgroundColor: "#030813", borderColor: "#0e1f33" }}
      >
        <span className="text-[10px] sm:text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block">
          AMOUNT TRANSFERRED
        </span>
        <div
          className="text-3xl sm:text-4xl font-black text-emerald-400 font-display mt-1 tracking-tight"
          style={{ color: "#10b981" }}
        >
          ₦{formatAmount(amount)}
        </div>
        <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-1">
          Zero Transaction Charges Applied
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TRANSACTION DETAILS LIST                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-2.5 relative z-10 text-xs sm:text-sm">
        <div className="flex justify-between items-center py-1.5 border-b border-[#0f1d30]">
          <span className="text-muted-foreground font-medium">Beneficiary Name:</span>
          <span className="font-bold text-foreground text-right">
            {accountHolder}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#0f1d30]">
          <span className="text-muted-foreground font-medium">Destination Bank:</span>
          <span className="font-bold text-foreground text-right">{bankName}</span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#0f1d30]">
          <span className="text-muted-foreground font-medium">Account Number:</span>
          <span className="font-mono font-bold text-foreground text-right">
            {accountNumber}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#0f1d30]">
          <span className="text-muted-foreground font-medium">Reference Number:</span>
          <span className="font-mono font-bold text-foreground text-right">
            {initialRef}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#0f1d30]">
          <span className="text-muted-foreground font-medium">Source Account:</span>
          <span className="font-semibold text-foreground text-right">
            PayWaka Settlement Vault
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#0f1d30]">
          <span className="text-muted-foreground font-medium">Narration:</span>
          <span className="text-foreground text-right text-xs max-w-[200px] truncate">
            {narration}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5">
          <span className="text-muted-foreground font-medium">Timestamp:</span>
          <span className="font-mono text-foreground text-right text-xs">
            {txnDate}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER: NIBSS VERIFIED + SYSTEM RECEIPT                      */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-4 pt-3 border-t border-[#0f1d30] flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <ShieldCheck className="h-4 w-4" />
          <span>NIBSS Verified</span>
        </div>
        <span className="text-muted-foreground text-[11px]">
          Automated System Receipt
        </span>
      </div>
    </div>
  );
}

export default function WithdrawalStatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user) || {};
  const receiptRef = useRef(null);

  // Extract navigation parameters or use realistic defaults
  const passedData = location.state || {};
  const amount = passedData.amount || 25000;
  const bankName =
    passedData.bankName || "Wema Bank / Paywaka";
  const accountNumber = passedData.accountNumber || "500000wqj";
  const accountHolder =
    passedData.accountHolder ||
    user.userName ||
    user.firstName ||
    "Divine Anyanechi";
  const initialRef =
    passedData.reference ||
    `PWK-WD-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const narration =
    passedData.narration || `Withdrawal to ${bankName} - ${accountNumber}`;


    const statusStepMap = {
      NEW: { progress: 15, activeStep: 0 },
      PENDING: { progress: 45, activeStep: 1 },
      INITIATED: { progress: 75, activeStep: 2 },
      SUCCESSFUL: { progress: 100, activeStep: 4 },
      FAILED: { progress: 100, activeStep: 4 },
      CANCELLED: { progress: 100, activeStep: 4 },
    };

  // Transition state: 'pending' -> 'success'
  const [status, setStatus] = useState("pending");
   const [liveStatus, setLiveStatus] = useState("NEW"); // raw Flutterwave status
   const [failureReason, setFailureReason] = useState(null);
  const [progress, setProgress] = useState(15);
  const [activeStep, setActiveStep] = useState(0);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null); // 'png' | 'pdf' | null
  const [txnDate, setTxnDate] = useState("");

  const steps = [
    {
      title: "Verifying Account Credentials",
      desc: "Checking balance & account limits",
    },
    {
      title: "Connecting NIBSS Settlement Node",
      desc: "Securing interbank connection",
    },
    {
      title: "Debiting PayWaka Subaccount Vault",
      desc: "Authorizing instant wallet ledger update",
    },
    {
      title: "Finalizing Bank Direct Deposit",
      desc: "Receiving electronic acknowledgment",
    },
  ];

  // Simulation timer for transition from Pending to Success
  // useEffect(() => {
  //   const formattedNow = new Date().toLocaleString("en-NG", {
  //     dateStyle: "full",
  //     timeStyle: "short",
  //   });
  //   setTxnDate(formattedNow);

  //   if (status === "pending") {
  //     setProgress(15);
  //     setActiveStep(0);

  //     const t1 = setTimeout(() => {
  //       setProgress(45);
  //       setActiveStep(1);
  //     }, 900);

  //     const t2 = setTimeout(() => {
  //       setProgress(75);
  //       setActiveStep(2);
  //     }, 2000);

  //     const t3 = setTimeout(() => {
  //       setProgress(95);
  //       setActiveStep(3);
  //     }, 2900);

  //     const t4 = setTimeout(() => {
  //       setProgress(100);
  //       setStatus("success");
  //       toast.success("Withdrawal Completed Successfully!", {
  //         description: `₦${Number(amount).toLocaleString()} sent to ${bankName}`,
  //       });
  //     }, 3700);

  //     return () => {
  //       clearTimeout(t1);
  //       clearTimeout(t2);
  //       clearTimeout(t3);
  //       clearTimeout(t4);
  //     };
  //   }
  // }, [status, amount, bankName]);

  useEffect(() => {
    const formattedNow = new Date().toLocaleString("en-NG", {
      dateStyle: "full",
      timeStyle: "short",
    });
    setTxnDate(formattedNow);

    if (!initialRef || !user?.uid) return;

    const unsub = onSnapshot(
      doc(db, "users", user.uid, "Transactions", initialRef),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const incoming = data.status;

        setLiveStatus(incoming);

        const mapped = statusStepMap[incoming] ?? statusStepMap.NEW;
        setProgress(mapped.progress);
        setActiveStep(mapped.activeStep);

        if (incoming === "SUCCESSFUL") {
          setStatus("success");
          toast.success("Withdrawal Completed Successfully!", {
            description: `₦${Number(amount).toLocaleString()} sent to ${bankName}`,
          });
        } else if (incoming === "FAILED" || incoming === "CANCELLED") {
          setStatus("failed");
          setFailureReason(
            data.failureReason?.message ?? "Withdrawal could not be completed",
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
  }, [initialRef, user?.uid, amount, bankName]);

  const handleReplay = () => {
    setStatus("pending");
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(initialRef);
    setCopiedRef(true);
    toast.success("Transaction reference copied to clipboard!");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleShare = () => {
    const text = `PayWaka Withdrawal Receipt\nAmount: ₦${Number(amount).toLocaleString()}\nBank: ${bankName} (${accountNumber})\nRef: ${initialRef}\nStatus: SUCCESSFUL`;
    if (navigator.share) {
      navigator.share({ title: "PayWaka Receipt", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Transaction summary copied to clipboard!");
    }
  };

  const handleOpenReceiptModal = () => {
    setShowReceiptModal(true);
  };

  // Capture DOM receipt element using html2canvas with oklab/oklch sanitizer for exact visual match
  const captureReceiptCanvas = async () => {
    const targetEl =
      receiptRef.current ||
      document.getElementById("paywaka-receipt-card") ||
      document.getElementById("paywaka-receipt-card-offscreen");

    if (!targetEl) throw new Error("Receipt card DOM element not found");

    return await html2canvas(targetEl, {
      scale: 3, // High DPI capture for crisp PNG & PDF export
      backgroundColor: "#060d1a",
      useCORS: true,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        // Clean out oklab and oklch declarations in cloned stylesheets to prevent html2canvas CSS parsing errors
        const styleElements = clonedDoc.querySelectorAll("style");
        styleElements.forEach((s) => {
          if (s.textContent) {
            s.textContent = s.textContent
              .replace(/oklab\([^)]+\)/gi, "rgba(16, 185, 129, 0.2)")
              .replace(/oklch\([^)]+\)/gi, "rgba(16, 185, 129, 0.2)");
          }
        });

        // Clean inline styles
        const allNodes = clonedDoc.querySelectorAll("*");
        allNodes.forEach((node) => {
          const styleAttr = node.getAttribute("style");
          if (
            styleAttr &&
            (styleAttr.includes("oklab") || styleAttr.includes("oklch"))
          ) {
            node.setAttribute(
              "style",
              styleAttr
                .replace(/oklab\([^)]+\)/gi, "#10b981")
                .replace(/oklch\([^)]+\)/gi, "#10b981"),
            );
          }
        });

        if (clonedElement) {
          clonedElement.style.backgroundColor = "#060d1a";
          clonedElement.style.color = "#ffffff";
        }
      },
    });
  };

  // Real PNG Image Download Handler
  const downloadAsImage = async () => {
    try {
      setDownloadingType("png");
      toast.info("Generating high-resolution PNG image...");

      const canvas = await captureReceiptCanvas();
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `PayWaka-Receipt-${initialRef}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Receipt image downloaded successfully!");
    } catch (err) {
      console.error("Image export error:", err);
      toast.error("Failed to export receipt image. Please try again.");
    } finally {
      setDownloadingType(null);
    }
  };

  // Real PDF Download Handler
  const downloadAsPDF = async () => {
    try {
      setDownloadingType("pdf");
      toast.info("Compiling official PDF receipt...");

      const canvas = await captureReceiptCanvas();
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth() - 20; // 10mm margins
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFillColor(6, 13, 26);
      pdf.rect(
        0,
        0,
        pdf.internal.pageSize.getWidth(),
        pdf.internal.pageSize.getHeight(),
        "F",
      );

      pdf.addImage(imgData, "PNG", 10, 15, pdfWidth, pdfHeight);
      pdf.save(`PayWaka-Receipt-${initialRef}.pdf`);

      toast.success("Official PDF receipt downloaded!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF receipt. Please try again.");
    } finally {
      setDownloadingType(null);
    }
  };

  const formatAmount = (val) => {
    const num = Number(val);
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  return (
    <DashboardLayout>
      {/* Off-screen target receipt container for DOM capture matching preview 1:1 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          width: "450px",
          pointerEvents: "none",
          opacity: 0,
          zIndex: -1,
        }}
      >
        <ReceiptCard
          cardRef={receiptRef}
          id="paywaka-receipt-card-offscreen"
          amount={amount}
          bankName={bankName}
          accountNumber={accountNumber}
          accountHolder={accountHolder}
          initialRef={initialRef}
          narration={narration}
          txnDate={txnDate}
        />
      </div>

      <div className="max-w-2xl mx-auto py-4 px-2 sm:px-4 space-y-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/wallet"
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors bg-card/40 border border-border px-3.5 py-2 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Wallet</span>
          </Link>

          <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-wider px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            NIBSS Instant Transfer
          </Badge>
        </div>

        {/* Main Card Wrapper */}
        <Card className="bg-card/60 border-border shadow-2xl rounded-3xl overflow-hidden relative border">
          {/* Subtle Ambient Glowing Background elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <CardContent className="p-6 sm:p-8 relative">
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
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center py-6 space-y-6"
                >
                  {/* Glowing Radar & Spinner Header */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Animated Pulsing Rings */}
                    <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-30" />
                    <div className="absolute -inset-3 rounded-full border border-amber-500/30 animate-pulse" />
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/10 via-muted to-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-2xl relative">
                      <Clock
                        className="h-10 w-10 text-amber-400 animate-spin"
                        style={{ animationDuration: "6s" }}
                      />
                    </div>
                  </div>

                  {/* Status Title & Subtitle */}
                  <div>
                    <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider px-3 py-1 mb-3">
                      <Clock className="h-3.5 w-3.5 mr-1 animate-spin" />
                      Transaction Processing
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                      Processing Withdrawal
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-md mx-auto">
                      Connecting to NIBSS Direct Credit engine. Transferring
                      funds to{" "}
                      <span className="text-foreground font-semibold">
                        {bankName}
                      </span>
                      .
                    </p>
                  </div>

                  {/* Highlighted Pending Amount */}
                  <div className="bg-muted/60 border border-border p-4 rounded-2xl w-full max-w-md">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Transfer Amount
                    </span>
                    <div className="text-3xl font-black text-amber-400 font-display mt-0.5">
                      ₦{formatAmount(amount)}
                    </div>
                  </div>

                  {/* Smooth Animated Progress Bar */}
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                      <span>Settlement Progress</span>
                      <span className="font-mono font-bold text-amber-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                        initial={{ width: "10%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Real-Time Processing Checklist */}
                  <div className="w-full max-w-md bg-muted/30 border border-border rounded-2xl p-4 text-left space-y-3">
                    {steps.map((step, idx) => {
                      const isDone = idx < activeStep;
                      const isCurrent = idx === activeStep;
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 text-xs"
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isDone
                                ? "bg-emerald-500 text-black font-bold"
                                : isCurrent
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                                  : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : isCurrent ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold ${
                                isDone
                                  ? "text-foreground line-through text-muted-foreground"
                                  : isCurrent
                                    ? "text-foreground font-bold"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {step.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Helper */}
                  <p className="text-[11px] text-muted-foreground animate-pulse">
                    Please hold on while we complete instant bank
                    verification...
                  </p>
                </motion.div>
              )}

              {/* ============================================================ */}
              {/* PHASE 2: SUCCESS / COMPLETED VIEW                            */}
              {/* ============================================================ */}
              {status === "success" && (
                <motion.div
                  key="success-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center text-center space-y-6"
                >
                  {/* Celebrating Animated Success Ring */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }}
                      className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-2xl shadow-emerald-500/20 flex items-center justify-center"
                    >
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <CheckCircle2 className="h-11 w-11 text-emerald-400" />
                      </div>
                    </motion.div>
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="h-6 w-6 text-yellow-400 animate-bounce" />
                    </div>
                  </div>

                  {/* Header Titles */}
                  <div>
                    <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider px-3.5 py-1 mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Transfer Successful
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                      Withdrawal Complete!
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                      Funds have been credited directly to destination account.
                    </p>
                  </div>

                  {/* Main Hero Amount Badge */}
                  <div className="bg-gradient-to-br from-emerald-950/60 via-muted/80 to-card border border-emerald-500/30 p-5 rounded-3xl w-full max-w-md relative overflow-hidden shadow-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                      Settled Amount
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-foreground font-display mt-1 tracking-tight">
                      ₦{formatAmount(amount)}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Zero Charge Instant Settlement</span>
                    </div>
                  </div>

                  {/* Detailed Transaction Breakdown Card */}
                  <div className="w-full max-w-md bg-card/80 border border-border rounded-2xl p-4 sm:p-5 text-left space-y-3.5">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-xs text-muted-foreground font-medium">
                        Transaction Reference
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-foreground">
                          {initialRef}
                        </span>
                        <button
                          onClick={handleCopyRef}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy reference"
                        >
                          {copiedRef ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Recipient Bank
                      </span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-400" />
                        {bankName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Account Number
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {accountNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Account Name
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {accountHolder}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Source
                      </span>
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                        PayWaka Subaccount Vault
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Fee
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        ₦0.00 (Free)
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground font-medium">
                        Timestamp
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {txnDate}
                      </span>
                    </div>
                  </div>

                  {/* Primary & Secondary Action Buttons */}
                  <div className="w-full max-w-md space-y-3 pt-2">
                    {/* Quick Direct Export Options */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={downloadAsImage}
                        disabled={downloadingType !== null}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs h-11 rounded-xl shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                      >
                        {downloadingType === "png" ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <ImageIcon className="h-4 w-4 mr-1.5" />
                        )}
                        Save as PNG Image
                      </Button>

                      <Button
                        onClick={downloadAsPDF}
                        disabled={downloadingType !== null}
                        className="bg-blue-600 hover:bg-blue-500 text-foreground font-extrabold text-xs h-11 rounded-xl shadow-lg shadow-blue-500/10 transition-transform active:scale-95"
                      >
                        {downloadingType === "pdf" ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <FileType className="h-4 w-4 mr-1.5" />
                        )}
                        Save as PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleOpenReceiptModal}
                        variant="outline"
                        className="border-border text-foreground hover:text-foreground bg-muted/60 text-xs h-10 rounded-xl"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                        Preview Digital Slip
                      </Button>

                      <Button
                        onClick={handleShare}
                        variant="outline"
                        className="border-border text-foreground hover:text-foreground bg-muted/50 text-xs h-10 rounded-xl"
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                        Share Details
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Link to="/wallet" className="flex-1">
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground hover:text-foreground hover:bg-muted text-xs h-10 rounded-xl"
                        >
                          Return to Wallet Overview
                        </Button>
                      </Link>

                      <Button
                        onClick={handleReplay}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-amber-400 hover:bg-muted h-10 w-10 rounded-xl shrink-0"
                        title="Replay Pending to Success Transition"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* ============================================================ */}
              {/* PHASE 2: FAILED / FAILED PAYMENT VIEW                            */}
              {/* ============================================================ */}
              {status === "failed" && (
                <motion.div
                  key="failed-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center py-6 space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                  </div>
                  <div>
                    <Badge className="bg-red-500/10 border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider px-3 py-1 mb-3">
                      Transfer Failed
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                      Withdrawal Failed
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-md mx-auto">
                      {failureReason}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-2">
                      Your balance has been refunded.
                    </p>
                  </div>
                  <Link to="/wallet">
                    <Button className="bg-muted hover:bg-muted text-foreground text-xs h-10 rounded-xl px-6">
                      Return to Wallet
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* DIGITAL RECEIPT PREVIEW MODAL                                */}
      {/* ============================================================ */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#091222] border border-border w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  ₦
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    PayWaka Official Receipt
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Electronic Transfer Acknowledgment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-lg hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Receipt Preview Card (Uses identical ReceiptCard component) */}
            <ReceiptCard
              amount={amount}
              bankName={bankName}
              accountNumber={accountNumber}
              accountHolder={accountHolder}
              initialRef={initialRef}
              narration={narration}
              txnDate={txnDate}
            />

            {/* Modal Download Action Options */}
            <div className="space-y-2.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block text-center">
                Choose Export Format
              </span>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={downloadAsImage}
                  disabled={downloadingType !== null}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold h-11 text-xs rounded-xl transition-all"
                >
                  {downloadingType === "png" ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                  )}
                  Save as PNG
                </Button>

                <Button
                  onClick={downloadAsPDF}
                  disabled={downloadingType !== null}
                  className="bg-blue-600 hover:bg-blue-500 text-foreground font-extrabold h-11 text-xs rounded-xl transition-all"
                >
                  {downloadingType === "pdf" ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <FileType className="h-4 w-4 mr-1.5" />
                  )}
                  Save as PDF
                </Button>
              </div>

              <Button
                onClick={() => setShowReceiptModal(false)}
                variant="outline"
                className="w-full border-border text-muted-foreground hover:text-foreground h-10 text-xs rounded-xl mt-1"
              >
                Close Preview
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Receipt,
  Share2,
  User,
  Smartphone,
  Building2,
  Clock,
  Hash,
  FileText,
  ImageIcon,
  ShieldCheck,
  Zap,
  Tv,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Reusable official PayWaka Receipt Card for DOM capture & PDF/PNG export
export function OfficialPayWakaReceiptCard({
  transaction,
  cardRef,
  id = "paywaka-official-receipt-card",
}) {
  if (!transaction) return null;

  const narrationLower = String(transaction.narration || "").toLowerCase();
  const statusLower = String(transaction.status || "").toLowerCase();
  const isRefund =
    narrationLower.includes("refund") ||
    statusLower === "refunded" ||
    transaction.refunded === true;
  const isSuccess =
    statusLower === "completed" ||
    statusLower === "successful" ||
    statusLower === "success" ||
    isRefund;
  const isPending = statusLower === "pending";

  const isCredit =
    isRefund ||
    String(transaction.type || "").toLowerCase() === "credit" ||
    String(transaction.category || "").toLowerCase() === "deposit" ||
    String(transaction.category || "").toLowerCase() === "cashback";

  // Parse transaction date
  let txDateObj = null;
  if (transaction?.createdAt?.toDate)
    txDateObj = transaction.createdAt.toDate();
  else if (transaction?.createdAt?.seconds)
    txDateObj = new Date(transaction.createdAt.seconds * 1000);
  else if (transaction?.created_at)
    txDateObj = new Date(transaction.created_at);
  else if (transaction?.timestamp?.toDate)
    txDateObj = transaction.timestamp.toDate();
  else if (transaction?.timestamp) txDateObj = new Date(transaction.timestamp);
  else if (transaction?.date) txDateObj = new Date(transaction.date);
  else txDateObj = new Date();

  const formattedDate = isNaN(txDateObj.getTime())
    ? "Recently"
    : txDateObj.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const txRef =
    transaction.tx_ref ||
    transaction.requestId ||
    transaction.reference ||
    transaction.id ||
    `PWK-${Date.now().toString(36).toUpperCase()}`;

  const numAmount = Math.abs(Number(transaction.amount) || 0);
  const formattedAmount = numAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      ref={cardRef}
      id={id}
      style={{
        backgroundColor: "#060d1a",
        borderColor: "#0d223a",
        borderWidth: "1px",
        borderStyle: "solid",
        color: "#ffffff",
        borderRadius: "24px",
        position: "relative",
        overflow: "hidden",
        width: "460px",
        padding: "30px 26px",
        boxSizing: "border-box",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Background Watermark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          userSelect: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <img
          src="/logo.png"
          alt="PayWaka Watermark"
          style={{
            width: "220px",
            height: "220px",
            opacity: 0.05,
            transform: "rotate(-12deg) translateY(10px)",
          }}
        />
        <span
          style={{
            position: "absolute",
            color: "rgba(16, 185, 129, 0.06)",
            fontSize: "36px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            transform: "rotate(-20deg)",
            whiteSpace: "nowrap",
          }}
        >
          PAYWAKA
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* HEADER: Table-based layout for pixel-perfect vertical alignment */}
      {/* ------------------------------------------------------------- */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderBottom: "1px solid #12253d",
          paddingBottom: "16px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                verticalAlign: "middle",
                textAlign: "left",
                paddingBottom: "16px",
              }}
            >
              <table style={{ borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td
                      style={{ verticalAlign: "middle", paddingRight: "12px" }}
                    >
                      <img
                        src="/logo.png"
                        alt="PayWaka Logo"
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "10px",
                          display: "block",
                        }}
                      />
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      <div
                        style={{
                          color: "#34d399",
                          fontWeight: 900,
                          fontSize: "18px",
                          letterSpacing: "0.08em",
                          lineHeight: "1.15",
                        }}
                      >
                        PAYWAKA
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#9ca3af",
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                          marginTop: "3px",
                          lineHeight: "1.1",
                        }}
                      >
                        OFFICIAL TRANSACTION RECEIPT
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            <td
              style={{
                verticalAlign: "middle",
                textAlign: "right",
                paddingBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  lineHeight: "1.2",
                  textAlign: "center",
                  backgroundColor:
                    isRefund || isSuccess
                      ? "rgba(4, 40, 28, 0.95)"
                      : isPending
                        ? "rgba(45, 26, 0, 0.95)"
                        : "rgba(45, 0, 0, 0.95)",
                  border: `1px solid ${
                    isRefund || isSuccess
                      ? "rgba(16, 185, 129, 0.7)"
                      : isPending
                        ? "rgba(245, 158, 11, 0.7)"
                        : "rgba(239, 68, 68, 0.7)"
                  }`,
                  color:
                    isRefund || isSuccess
                      ? "#34d399"
                      : isPending
                        ? "#fbbf24"
                        : "#f87171",
                }}
              >
                {isRefund
                  ? "REFUNDED"
                  : isSuccess
                    ? "SUCCESSFUL"
                    : isPending
                      ? "PENDING"
                      : "FAILED"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ------------------------------------------------------------- */}
      {/* HERO AMOUNT BOX                                               */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          margin: "18px 0",
          padding: "20px 16px",
          backgroundColor: "#030813",
          border: "1px solid #0e1f33",
          borderRadius: "18px",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            display: "block",
          }}
        >
          {isRefund
            ? "AMOUNT REFUNDED"
            : isCredit
              ? "AMOUNT RECEIVED"
              : "AMOUNT PAID"}
        </span>
        <div
          style={{
            fontSize: "36px",
            fontWeight: 900,
            color: isRefund || isCredit ? "#10b981" : "#ffffff",
            marginTop: "6px",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          {isCredit ? "+" : "-"}₦{formattedAmount}
        </div>
        <span
          style={{
            fontSize: "11px",
            color: "#6b7280",
            display: "block",
            marginTop: "6px",
          }}
        >
          {isRefund
            ? "Credited to your PayWaka Wallet"
            : "Zero Extra Platform Charges"}
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TRANSACTION DETAILS LIST                                     */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          fontSize: "13px",
          lineHeight: "1.6",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "10px 0",
            borderBottom: "1px solid #0f1d30",
          }}
        >
          <span
            style={{
              color: "#9ca3af",
              fontWeight: 500,
              paddingRight: "12px",
              flexShrink: 0,
            }}
          >
            Service / Narration:
          </span>
          <span
            style={{
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "right",
              wordBreak: "break-word",
              maxWidth: "240px",
            }}
          >
            {transaction.narration || "Payment"}
          </span>
        </div>

        {transaction.customer && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #0f1d30",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontWeight: 500,
                paddingRight: "12px",
                flexShrink: 0,
              }}
            >
              Recipient / Phone:
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#ffffff",
                textAlign: "right",
              }}
            >
              {transaction.customer}
            </span>
          </div>
        )}

        {(transaction.network || transaction.planName) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #0f1d30",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontWeight: 500,
                paddingRight: "12px",
                flexShrink: 0,
              }}
            >
              Network / Plan:
            </span>
            <span
              style={{
                fontWeight: 700,
                color: "#34d399",
                textAlign: "right",
              }}
            >
              {[transaction.network, transaction.planName]
                .filter(Boolean)
                .join(" - ")}
            </span>
          </div>
        )}

        {transaction.meterNo && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #0f1d30",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontWeight: 500,
                paddingRight: "12px",
                flexShrink: 0,
              }}
            >
              Meter Number:
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#ffffff",
                textAlign: "right",
              }}
            >
              {transaction.meterNo}
            </span>
          </div>
        )}

        {transaction.token && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #0f1d30",
            }}
          >
            <span
              style={{
                color: "#34d399",
                fontWeight: 700,
                paddingRight: "12px",
                flexShrink: 0,
              }}
            >
              Electricity Token:
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 900,
                color: "#34d399",
                textAlign: "right",
                fontSize: "14px",
              }}
            >
              {transaction.token}
            </span>
          </div>
        )}

        {transaction.smartCardNo && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #0f1d30",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontWeight: 500,
                paddingRight: "12px",
                flexShrink: 0,
              }}
            >
              Smartcard Number:
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#ffffff",
                textAlign: "right",
              }}
            >
              {transaction.smartCardNo}
            </span>
          </div>
        )}

        {transaction.bankName && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #0f1d30",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontWeight: 500,
                paddingRight: "12px",
                flexShrink: 0,
              }}
            >
              Bank / Institution:
            </span>
            <span
              style={{
                fontWeight: 700,
                color: "#ffffff",
                textAlign: "right",
              }}
            >
              {transaction.bankName}
            </span>
          </div>
        )}

        {transaction.accountNumber && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #0f1d30",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontWeight: 500,
                paddingRight: "12px",
                flexShrink: 0,
              }}
            >
              Account Number:
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#ffffff",
                textAlign: "right",
              }}
            >
              {transaction.accountNumber}
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "10px 0",
            borderBottom: "1px solid #0f1d30",
          }}
        >
          <span
            style={{
              color: "#9ca3af",
              fontWeight: 500,
              paddingRight: "12px",
              flexShrink: 0,
            }}
          >
            Reference Number:
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              color: "#e5e7eb",
              textAlign: "right",
              fontSize: "12px",
              wordBreak: "break-all",
              maxWidth: "240px",
            }}
          >
            {txRef}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px solid #0f1d30",
          }}
        >
          <span
            style={{
              color: "#9ca3af",
              fontWeight: 500,
              paddingRight: "12px",
              flexShrink: 0,
            }}
          >
            Payment Channel:
          </span>
          <span
            style={{
              fontWeight: 600,
              color: "#e5e7eb",
              textAlign: "right",
            }}
          >
            PayWaka Instant Settlement Vault
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
          }}
        >
          <span
            style={{
              color: "#9ca3af",
              fontWeight: 500,
              paddingRight: "12px",
              flexShrink: 0,
            }}
          >
            Timestamp:
          </span>
          <span
            style={{
              fontFamily: "monospace",
              color: "#d1d5db",
              textAlign: "right",
              fontSize: "12px",
            }}
          >
            {formattedDate}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER: Table-based layout for shield icon and text baseline */}
      {/* ------------------------------------------------------------- */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderTop: "1px solid #0f1d30",
          marginTop: "16px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                verticalAlign: "middle",
                textAlign: "left",
                paddingTop: "14px",
              }}
            >
              <table style={{ borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td
                      style={{ verticalAlign: "middle", paddingRight: "7px" }}
                    >
                      <ShieldCheck
                        style={{
                          width: "16px",
                          height: "16px",
                          color: "#34d399",
                          display: "block",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        verticalAlign: "middle",
                        color: "#34d399",
                        fontWeight: 700,
                        fontSize: "12px",
                        lineHeight: "1.2",
                      }}
                    >
                      PayWaka Verified
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            <td
              style={{
                verticalAlign: "middle",
                textAlign: "right",
                color: "#6b7280",
                fontSize: "11px",
                lineHeight: "1.2",
                paddingTop: "14px",
              }}
            >
              Secured Automated Receipt
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function TransactionsModal({ transaction, isOpen, onClose }) {
  const receiptCardRef = useRef(null);
  const [downloadingType, setDownloadingType] = useState(null);

  if (!transaction) return null;

  const narrationLower = String(transaction.narration || "").toLowerCase();
  const statusLower = String(transaction.status || "").toLowerCase();
  const isRefund =
    narrationLower.includes("refund") ||
    statusLower === "refunded" ||
    transaction.refunded === true;
  const isSuccess =
    statusLower === "completed" ||
    statusLower === "successful" ||
    statusLower === "success" ||
    isRefund;
  const isPending = statusLower === "pending";

  const isCredit =
    isRefund ||
    String(transaction.type || "").toLowerCase() === "credit" ||
    String(transaction.type || "").toLowerCase() === "inflow" ||
    String(transaction.category || "").toLowerCase() === "deposit" ||
    String(transaction.category || "").toLowerCase() === "cashback";

  // Parse transaction date
  let txDateObj = null;
  if (transaction?.createdAt?.toDate)
    txDateObj = transaction.createdAt.toDate();
  else if (transaction?.createdAt?.seconds)
    txDateObj = new Date(transaction.createdAt.seconds * 1000);
  else if (transaction?.created_at)
    txDateObj = new Date(transaction.created_at);
  else if (transaction?.timestamp?.toDate)
    txDateObj = transaction.timestamp.toDate();
  else if (transaction?.timestamp) txDateObj = new Date(transaction.timestamp);
  else if (transaction?.date) txDateObj = new Date(transaction.date);
  else txDateObj = new Date();

  const formattedDate = isNaN(txDateObj.getTime())
    ? "Recently"
    : txDateObj.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const txRef =
    transaction.tx_ref ||
    transaction.requestId ||
    transaction.reference ||
    transaction.id ||
    `PWK-${Date.now().toString(36).toUpperCase()}`;

  const numAmount = Math.abs(Number(transaction.amount) || 0);

  // Capture clean receipt canvas using html2canvas
  const captureReceiptCanvas = async () => {
    // Wait for all fonts and assets to finish rendering
    if (document.fonts) {
      await document.fonts.ready;
    }

    const targetEl =
      receiptCardRef.current ||
      document.getElementById("paywaka-official-receipt-card");

    if (!targetEl) throw new Error("Receipt template element not found");

    return await html2canvas(targetEl, {
      scale: 3, // High DPI for crystal clear text & logo
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#060d1a",
      logging: false,
      windowWidth: 1200,
    });
  };

  // Download High-Resolution PNG
  const handleDownloadPNG = async () => {
    try {
      setDownloadingType("png");
      toast.info("Generating high-resolution receipt image...");

      const canvas = await captureReceiptCanvas();
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `PayWaka-Receipt-${txRef}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Receipt image downloaded successfully!");
    } catch (err) {
      console.error("PNG export error:", err);
      toast.error("Failed to export receipt image. Please try again.");
    } finally {
      setDownloadingType(null);
    }
  };

  // Download Official PDF
  const handleDownloadPDF = async () => {
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

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const pdfWidth = pageWidth - margin * 2;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Dark background for PDF
      pdf.setFillColor(6, 13, 26);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.addImage(imgData, "PNG", margin, 20, pdfWidth, pdfHeight);
      pdf.save(`PayWaka-Receipt-${txRef}.pdf`);

      toast.success("Official PDF receipt downloaded!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF receipt. Please try again.");
    } finally {
      setDownloadingType(null);
    }
  };

  // Share Receipt
  const handleShare = async () => {
    const text = `PayWaka Transaction Receipt\nService: ${transaction.narration || "Payment"}\nAmount: ₦${numAmount.toLocaleString()}\nReference: ${txRef}\nStatus: ${isRefund ? "REFUNDED" : isSuccess ? "SUCCESSFUL" : "DONE"}\nDate: ${formattedDate}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "PayWaka Receipt",
          text,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Receipt summary copied to clipboard!");
    }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(txRef);
    toast.success("Reference copied!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md bg-card border border-border text-foreground p-0 shadow-2xl rounded-2xl max-h-[88vh] flex flex-col z-[100] m-0 outline-none">
        {/* Modal Header */}
        <div className="p-5 pb-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isRefund
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : isCredit
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/15 text-red-400 border border-red-500/20"
              }`}
            >
              {isRefund ? (
                <RotateCcw className="h-5 w-5 text-emerald-400" />
              ) : isCredit ? (
                <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Transaction Details
              </DialogTitle>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>

          <Badge
            className={`${
              isRefund
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : isSuccess
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : isPending
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-red-500/15 text-red-400 border-red-500/30"
            }`}
          >
            {isRefund ? (
              <RotateCcw className="h-3 w-3 mr-1" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {isRefund
              ? "Refunded"
              : isSuccess
                ? "Successful"
                : isPending
                  ? "Pending"
                  : "Failed"}
          </Badge>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Amount Hero */}
          <div className="p-4 rounded-xl bg-muted/60 border border-border text-center">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              {isRefund
                ? "Total Refunded"
                : isCredit
                  ? "Total Credited"
                  : "Total Paid"}
            </span>
            <div
              className={`text-3xl font-black mt-1 ${
                isRefund || isCredit ? "text-emerald-400" : "text-red-800"
              }`}
            >
              {isCredit ? "+" : "-"}₦
              {numAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transaction.narration || "PayWaka Transaction"}
            </p>
          </div>

          {/* Details Table */}
          <div className="rounded-xl bg-muted/40 border border-border divide-y divide-border text-xs sm:text-sm">
            <div className="p-3 flex justify-between items-start gap-3">
              <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Receipt className="w-3.5 h-3.5" /> Narration
              </span>
              <span className="font-semibold text-foreground text-right break-words max-w-[220px]">
                {transaction.narration || "N/A"}
              </span>
            </div>

            {transaction.customer && (
              <div className="p-3 flex justify-between items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Smartphone className="w-3.5 h-3.5" /> Beneficiary Phone / ID
                </span>
                <span className="font-mono font-bold text-foreground text-right">
                  {transaction.customer}
                </span>
              </div>
            )}

            {(transaction.network || transaction.planName) && (
              <div className="p-3 flex justify-between items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Network / Plan
                </span>
                <span className="font-bold text-emerald-400 text-right">
                  {[transaction.network, transaction.planName]
                    .filter(Boolean)
                    .join(" - ")}
                </span>
              </div>
            )}

            {transaction.meterNo && (
              <div className="p-3 flex justify-between items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" /> Meter Number
                </span>
                <span className="font-mono font-bold text-foreground text-right">
                  {transaction.meterNo}
                </span>
              </div>
            )}

            {transaction.token && (
              <div className="p-3 flex justify-between items-center gap-3 bg-emerald-950/20">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Electricity Token
                </span>
                <span className="font-mono font-black text-emerald-400 text-sm text-right">
                  {transaction.token}
                </span>
              </div>
            )}

            {transaction.smartCardNo && (
              <div className="p-3 flex justify-between items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Tv className="w-3.5 h-3.5" /> Smartcard Number
                </span>
                <span className="font-mono font-bold text-foreground text-right">
                  {transaction.smartCardNo}
                </span>
              </div>
            )}

            {transaction.bankName && (
              <div className="p-3 flex justify-between items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-3.5 h-3.5" /> Bank Name
                </span>
                <span className="font-semibold text-foreground text-right">
                  {transaction.bankName}
                </span>
              </div>
            )}

            {transaction.accountNumber && (
              <div className="p-3 flex justify-between items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <User className="w-3.5 h-3.5" /> Account Number
                </span>
                <span className="font-mono font-bold text-foreground text-right">
                  {transaction.accountNumber}
                </span>
              </div>
            )}

            <div className="p-3 flex justify-between items-start gap-3">
              <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Hash className="w-3.5 h-3.5" /> Reference No.
              </span>
              <button
                onClick={copyRef}
                className="font-mono text-foreground hover:text-foreground flex items-center gap-1 text-xs break-all text-right max-w-[200px]"
                title="Click to copy"
              >
                {txRef}
                <Copy className="w-3 h-3 text-muted-foreground shrink-0 ml-1" />
              </button>
            </div>

            <div className="p-3 flex justify-between items-center gap-3">
              <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5" /> Transaction Date
              </span>
              <span className="text-foreground text-xs text-right">
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/40 flex flex-wrap sm:flex-nowrap gap-2">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingType !== null}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-foreground font-semibold text-xs h-10 shadow-lg shadow-emerald-950/40"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            {downloadingType === "pdf" ? "Exporting PDF..." : "Download PDF"}
          </Button>

          <Button
            onClick={handleDownloadPNG}
            disabled={downloadingType !== null}
            variant="outline"
            className="flex-1 bg-muted border-border hover:bg-muted text-foreground font-semibold text-xs h-10"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
            {downloadingType === "png"
              ? "Exporting Image..."
              : "Download Image"}
          </Button>

          <Button
            onClick={handleShare}
            variant="ghost"
            className="bg-muted/70 border border-border hover:bg-muted text-foreground hover:text-foreground text-xs h-10 px-3 shrink-0"
            title="Share receipt"
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>

      {/* Offscreen Target Container: Positioned at left 0 with opacity 0 so browser computes exact layout metrics without clipping */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0px",
          width: "460px",
          zIndex: -50,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <OfficialPayWakaReceiptCard
          transaction={transaction}
          cardRef={receiptCardRef}
          id="paywaka-official-receipt-card"
        />
      </div>
    </Dialog>
  );
}

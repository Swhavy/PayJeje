import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Lock,
  Sparkles,
  Receipt as ReceiptIcon,
  MessageCircle,
  Send,
  Mail,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getTransactionReference,
  getFeeReference,
  getTransactionCategoryKind,
  getTransactionDisplayTitle,
  getTransactionEntityInfo,
  getTransactionStatusInfo,
  isP2PTransaction,
  isInboundTransaction,
  isRefundTransaction,
  maskAccountIdentifier,
  formatReceiptNarration,
  extractSessionId,
  formatTransactionDate,
  formatNairaAmount,
  computeReceiptChecksum,
  exportReceiptAsFile,
  generateReceiptShareAssets,
  triggerReceiptDownload,
} from "@/lib/receiptUtils";

/**
 * Tiled Diagonal Watermark Layer featuring /logo.png + PAYWAKA wordmark.
 * Renders crisply on both Obsidian Emerald Dark and Formal Print White sheets.
 */
function ReceiptWatermarkLayer({ light = false }) {
  const slots = [0, 1, 2, 3, 4];
  return (
    <div
      data-watermark-layer="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 flex flex-col justify-between py-4"
      aria-hidden="true"
    >
      {slots.map((row) => (
        <div
          key={row}
          className="flex items-center justify-around -rotate-12 transform"
          style={{
            opacity: light ? 0.045 : 0.045,
            marginLeft: row % 2 === 0 ? "-16px" : "22px",
          }}
        >
          {[0, 1, 2].map((col) => (
            <div key={col} className="flex items-center gap-2 px-3">
              <img
                src="/logo.png"
                alt=""
                className="w-7 h-7 object-contain"
                style={{ filter: light ? "grayscale(100%)" : "none" }}
              />
              <span
                className="text-base sm:text-lg font-black uppercase tracking-[0.26em] whitespace-nowrap"
                style={{ color: light ? "#0f172a" : "#10b981" }}
              >
                PAYWAKA
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Reusable Copy Button with instant feedback.
 */
function CopyChipButton({ value, label = "Copy", light = false }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Unable to copy");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label}`}
      className={`p-1 rounded-lg border transition-all active:scale-95 shrink-0 ${light
        ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"
        : "bg-white/5 hover:bg-emerald-500/15 border-white/10 text-emerald-400"
        }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

/**
 * Official Glassmorphic & Printable Receipt Surface
 * Tuned for at-a-glance zero-scroll viewing on desktop/mobile AND crisp, unclipped PNG/PDF export.
 */
export function PaywakaReceiptSurface({
  transaction,
  cardRef,
  id = "paywaka-receipt-surface",
  theme = "dark",
  includeQr = true,
  maskDigits = true,
  includeSeal = true,
  isExportCanvas = false,
  onToggleMask,
}) {
  if (!transaction) return null;

  const light = theme === "light";
  const kind = getTransactionCategoryKind(transaction);
  const statusInfo = getTransactionStatusInfo(transaction);
  const entity = getTransactionEntityInfo(transaction);
  const isP2P = isP2PTransaction(transaction);
  const isInbound = isInboundTransaction(transaction);
  const isRefund = isRefundTransaction(transaction);
  const txRef = getTransactionReference(transaction);
  const sessionId = extractSessionId(transaction);
  const displayTitle = getTransactionDisplayTitle(transaction);
  const formattedDate = formatTransactionDate(transaction, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const numAmount = Math.abs(Number(transaction.amount) || 0);
  const isUtility = ["electricity", "airtime", "data", "cable", "utility"].includes(kind);

  const displayedAccountId = maskAccountIdentifier(
    entity.accountIdentifier,
    maskDigits,
  );
  const displayedNarration = formatReceiptNarration(
    transaction.narration || txRef,
    txRef,
    maskDigits,
  );

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/Receipts/${txRef}/${transaction.uid || transaction.userId || "verify"}`
      : `https://paywaka.com/Receipts/${txRef}`;

  const rawMeterToken =
    transaction.tokenPin ||
    transaction.token ||
    transaction.response?.metertoken ||
    transaction.response?.token ||
    "";

  const guillocheStyle = isUtility || light
    ? {
        border: light
          ? "1.5px solid #059669"
          : isExportCanvas
            ? "1.5px solid #166534"
            : "1px solid rgba(5, 150, 105, 0.55)",
        outline: light
          ? isExportCanvas
            ? "1px dashed #6EE7B7"
            : "1px dashed rgba(5, 150, 105, 0.35)"
          : isExportCanvas
            ? "1px dashed #183529"
            : "1px dashed rgba(16, 185, 129, 0.25)",
        outlineOffset: "-5px",
      }
    : {
        border: isExportCanvas ? "1.5px solid #1E3F31" : "1px solid rgba(16, 185, 129, 0.24)",
        boxShadow: isExportCanvas
          ? "none"
          : "0 20px 45px -12px rgba(0, 0, 0, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
      };

  const containerStyle = {
    backgroundColor: light ? "#FFFFFF" : isUtility && !isExportCanvas ? "#0B1411" : "#070C0A",
    color: light ? "#0F172A" : "#F8FAFC",
    ...guillocheStyle,
  };

  const mutedText = light ? "text-slate-500" : "text-slate-400";
  const strongText = light ? "text-slate-900" : "text-white";
  const surfaceBox = light
    ? isExportCanvas
      ? "bg-[#F8FAFC] border border-[#E2E8F0]"
      : "bg-slate-50/90 border border-slate-200/90"
    : isExportCanvas
      ? "bg-[#0C1612] border border-[#182C24]"
      : "bg-[#0D1814]/90 border border-emerald-500/15";
  const dividerColor = light ? "border-[#E2E8F0]" : isExportCanvas ? "border-[#182C24]" : "border-white/10";
  const dividerHex = light ? "#E2E8F0" : isExportCanvas ? "#182C24" : "rgba(255, 255, 255, 0.1)";

  // Padding classes kept synchronized with perforation negative margin so notches kiss the border cleanly
  const contentPadClass = isExportCanvas ? "p-4 space-y-2.5" : "p-3.5 space-y-2";
  const perforationMarginClass = isExportCanvas ? "-mx-4" : "-mx-3.5";
  const valueTextClass = "whitespace-normal break-words leading-snug";

  const statusPillBg =
    statusInfo.key === "success" || statusInfo.key === "refunded"
      ? light
        ? "#ECFDF5"
        : isExportCanvas
          ? "#063729"
          : "rgba(6, 78, 59, 0.55)"
      : statusInfo.key === "pending"
        ? light
          ? "#FFFBEB"
          : isExportCanvas
            ? "#45230A"
            : "rgba(120, 53, 15, 0.45)"
        : light
          ? "#FEF2F2"
          : isExportCanvas
            ? "#4A1216"
            : "rgba(127, 29, 29, 0.45)";

  const statusPillBorder =
    statusInfo.key === "success" || statusInfo.key === "refunded"
      ? isExportCanvas
        ? "#10B981"
        : "rgba(16, 185, 129, 0.45)"
      : statusInfo.key === "pending"
        ? isExportCanvas
          ? "#D97706"
          : "rgba(245, 158, 11, 0.45)"
        : isExportCanvas
          ? "#DC2626"
          : "rgba(239, 68, 68, 0.45)";

  const statusPillColor =
    statusInfo.key === "success" || statusInfo.key === "refunded"
      ? light
        ? "#047857"
        : "#34D399"
      : statusInfo.key === "pending"
        ? light
          ? "#B45309"
          : "#FBBF24"
        : light
          ? "#B91C1C"
          : "#F87171";

  const detailRows = [];
  if (isP2P) {
    detailRows.push(
      { key: "sender", label: "Sender Name", value: entity.senderName, bold: true },
      { key: "receiver", label: "Receiver Name", value: entity.recipientName, bold: true },
    );
  }
  if (kind === "electricity") {
    detailRows.push(
      { key: "disco", label: "Distribution Company", value: transaction.company || transaction.provider || "Electricity Disco", bold: true },
      { key: "meter", label: "Meter Number", value: transaction.meterNo || transaction.customerId || "N/A", mono: true, bold: true },
      { key: "meterType", label: "Meter Type", value: transaction.meterType || "Prepaid", semibold: true },
    );
    if (transaction.units) {
      detailRows.push({ key: "units", label: "Purchased Units", value: `${transaction.units} kWh`, mono: true, bold: true, accent: true });
    }
  }
  if (kind === "airtime" || kind === "data") {
    detailRows.push(
      { key: "network", label: "Network Provider", value: transaction.network || "Mobile Network", bold: true },
      { key: "phone", label: "Recipient Phone", value: transaction.phone || transaction.customerId || transaction.customer || "N/A", mono: true, bold: true },
    );
    if (kind === "data" && (transaction.planName || transaction.planCode)) {
      detailRows.push({ key: "plan", label: "Data Plan", value: transaction.planName || transaction.planCode, bold: true, accent: true });
    }
  }
  if (kind === "cable") {
    detailRows.push(
      { key: "cable", label: "Cable Provider", value: transaction.cableTV || "Cable TV", bold: true },
      { key: "iuc", label: "Smartcard / IUC", value: transaction.smartCardNo || transaction.customerId || "N/A", mono: true, bold: true },
    );
    if (transaction.packageName || transaction.packageCode) {
      detailRows.push({ key: "package", label: "Package", value: transaction.packageName || transaction.packageCode, semibold: true });
    }
  }
  if (isUtility && Number(transaction.feeCharged ?? transaction.fee ?? 0) > 0) {
    const billFee = Number(transaction.feeCharged ?? transaction.fee ?? 0);
    const totalPaid = Number(transaction.totalPayable || numAmount + billFee);
    detailRows.push(
      { key: "billFee", label: "Processing Fee", value: `₦${formatNairaAmount(billFee)}`, semibold: true },
      { key: "totalPaid", label: "Total Paid", value: `₦${formatNairaAmount(totalPaid)}`, bold: true, accent: true },
    );
  }
  detailRows.push({
    key: "txRef",
    label: isExportCanvas ? "Transaction Reference" : (
      <>
        <span className="sm:hidden">Reference</span>
        <span className="hidden sm:inline">Transaction Reference</span>
      </>
    ),
    value: txRef,
    title: txRef,
    copyValue: txRef,
    copyLabel: "Reference",
    mono: true,
    bold: true,
  });
  if (sessionId) {
    detailRows.push({
      key: "sessionId",
      label: "Session ID",
      value: sessionId,
      title: sessionId,
      copyValue: sessionId,
      copyLabel: "Session ID",
      mono: true,
      bold: true,
      accent: true,
    });
  }
  detailRows.push({
    key: "source",
    label: "Source Account",
    value: entity.sourceAccount,
    title: entity.sourceAccount,
    semibold: true,
  });
  detailRows.push({
    key: "narration",
    label: "Narration",
    value: displayedNarration,
    title: displayedNarration,
    isNarration: true,
  });

  return (
    <div
      ref={cardRef}
      id={id}
      style={containerStyle}
      className="relative rounded-3xl overflow-hidden w-full transition-colors duration-200"
    >
      {/* Top Emerald Accent Bar */}
      {light ? (
        <div
          className="h-1.5 w-full"
          style={{
            background: "linear-gradient(90deg, #047857 0%, #00E887 50%, #059669 100%)",
          }}
        />
      ) : (
        <div
          className={isExportCanvas ? "h-1.5 w-full" : "h-1 w-full"}
          style={{
            background: isExportCanvas
              ? "linear-gradient(90deg, #064E3B 0%, #00E887 50%, #064E3B 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(52, 211, 153, 0.75) 50%, transparent 100%)",
          }}
        />
      )}

      {/* Subtle Radial Emerald Glow in Dark Mode (on-screen only — omitted on export to prevent capture seams) */}
      {!light && !isExportCanvas && (
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(0, 232, 135, 0.14) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Diagonal Repeating Watermarks */}
      <ReceiptWatermarkLayer light={light} />

      <div className={`relative z-10 min-w-0 ${contentPadClass}`}>
        {/* ============================================================== */}
        {/* HEADER: Bold Compact Logo + PAYWAKA + Status Pill              */}
        {/* ============================================================== */}
        <div className={`flex items-center justify-between gap-2 pb-2.5 border-b ${dividerColor}`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="p-1 rounded-xl shrink-0 border"
              style={{
                backgroundColor: light ? "#ECFDF5" : isExportCanvas ? "#0B2018" : "rgba(16, 185, 129, 0.12)",
                borderColor: light ? "#A7F3D0" : isExportCanvas ? "#1A4535" : "rgba(16, 185, 129, 0.35)",
              }}
            >
              <img
                src="/logo.png"
                alt="PayWaka"
                className={isExportCanvas ? "w-9 h-9 object-contain" : "w-8 h-8 object-contain"}
                style={{
                  filter:
                    light || isExportCanvas
                      ? "none"
                      : "drop-shadow(0 0 8px rgba(0, 232, 135, 0.35))",
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className={`text-sm font-black tracking-tight leading-none block ${light ? "text-slate-900" : "text-white"
                  }`}
              >
                PAYWAKA
              </span>
              <span
                className={`block text-[8px] font-bold uppercase tracking-[0.07em] mt-1 ${
                  isExportCanvas ? "whitespace-nowrap" : "whitespace-normal leading-tight"
                }`}
                style={{
                  color: light ? "#047857" : "#34D399",
                  lineHeight: isExportCanvas ? "9px" : undefined,
                }}
              >
                {kind === "electricity"
                  ? "UTILITY ELECTRICITY VOUCHER"
                  : kind === "data"
                    ? "MOBILE DATA RECEIPT"
                    : kind === "airtime"
                      ? "AIRTIME TOP-UP RECEIPT"
                      : kind === "cable"
                        ? "CABLE TV SUBSCRIPTION"
                        : isP2P
                          ? "PAYWAKA P2P INSTANT TRANSFER"
                          : isInbound
                            ? "DIRECT ACCOUNT SETTLEMENT"
                            : "NIBSS INSTANT PAYMENT RECEIPT"}
              </span>
            </div>
          </div>

          <div
            data-receipt-badge="true"
            className="inline-flex items-center justify-center px-3 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 border whitespace-nowrap"
            style={{
              backgroundColor: statusPillBg,
              borderColor: statusPillBorder,
              color: statusPillColor,
              paddingTop: isExportCanvas ? "6px" : "5px",
              paddingBottom: isExportCanvas ? "6px" : "5px",
              fontSize: "10px",
              lineHeight: "10px",
            }}
          >
            <span data-badge-text="true" style={{ fontSize: "10px", lineHeight: "10px" }}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RECEIPT TITLE & HERO AMOUNT CARD                               */}
        {/* ============================================================== */}
        <div className={`${surfaceBox} rounded-2xl px-3.5 py-2.5 space-y-0.5 text-center`}>
          <p
            className={`text-xs font-bold leading-snug ${strongText} ${valueTextClass}`}
            title={displayTitle}
          >
            {displayTitle}
          </p>

          <span className={`text-[9px] font-bold uppercase tracking-[0.14em] block ${mutedText}`}>
            {isRefund
              ? "AMOUNT REFUNDED"
              : isInbound
                ? "AMOUNT RECEIVED"
                : isUtility
                  ? "AMOUNT PAID"
                  : "AMOUNT TRANSFERRED"}
          </span>

          <div
            className="text-2xl font-black tracking-tight leading-tight font-mono"
            style={{
              color:
                isInbound || isRefund
                  ? light
                    ? "#059669"
                    : "#00E887"
                  : light
                    ? "#0F172A"
                    : "#FFFFFF",
            }}
          >
            ₦{formatNairaAmount(numAmount)}
          </div>

          <p className={`text-[10px] sm:text-[11px] ${mutedText}`}>
            {formattedDate}
          </p>

          {/* ZERO-FEE BADGE: STRICTLY SCOPED TO P2P TRANSFERS ONLY */}
          {isP2P && (
            <div className="pt-1 flex justify-center">
              <span
                data-receipt-badge="true"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap"
                style={{
                  backgroundColor: light ? "#ECFDF5" : isExportCanvas ? "#073022" : "rgba(0, 232, 135, 0.12)",
                  borderColor: isExportCanvas ? "#10B981" : "rgba(0, 232, 135, 0.35)",
                  color: light ? "#047857" : "#00E887",
                  fontSize: "10px",
                  lineHeight: "10px",
                }}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span data-badge-text="true" style={{ fontSize: "10px", lineHeight: "10px" }}>
                  Zero Transaction Charges Applied
                </span>
              </span>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* ELECTRICITY PREPAID TOKEN HIGHLIGHT BOX                        */}
        {/* ============================================================== */}
        {kind === "electricity" && rawMeterToken && (
          <div
            className="rounded-2xl px-4 py-3 text-center border-2 border-dashed space-y-1"
            style={{
              backgroundColor: light ? "#ECFDF5" : isExportCanvas ? "#0A2319" : "rgba(6, 78, 59, 0.25)",
              borderColor: light ? "#10B981" : isExportCanvas ? "#10B981" : "rgba(0, 232, 135, 0.45)",
            }}
          >
            <span
              className="text-[9px] font-extrabold uppercase tracking-[0.18em] block"
              style={{ color: light ? "#047857" : "#34D399" }}
            >
              Prepaid Meter Token
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-lg sm:text-xl font-mono font-black tracking-widest ${strongText}`}>
                {rawMeterToken}
              </span>
              {!isExportCanvas && (
                <CopyChipButton value={rawMeterToken} label="Meter Token" light={light} />
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BORDERLESS TICKET PERFORATION DIVIDER                          */}
        {/* On-screen circular cutouts match backdrop; export canvas       */}
        {/* punches true transparent destination-out semicircles cleanly.  */}
        {/* ============================================================== */}
        <div
          data-perforation-line="true"
          className={`relative ${perforationMarginClass} flex items-center justify-between py-0.5`}
        >
          <div
            className="w-5 h-5 rounded-full -ml-2.5 shrink-0"
            style={{
              backgroundColor: light ? "#E2E8F0" : "#020504",
              opacity: isExportCanvas ? 0 : 1,
            }}
          />
          <div
            className="flex-1 mx-2"
            style={{ borderTop: `2px dashed ${dividerHex}` }}
          />
          <div
            className="w-5 h-5 rounded-full -mr-2.5 shrink-0"
            style={{
              backgroundColor: light ? "#E2E8F0" : "#020504",
              opacity: isExportCanvas ? 0 : 1,
            }}
          />
        </div>

        {/* ============================================================== */}
        {/* ENTITY CARD (BENEFICIARY OR SENDER FOR TRANSFERS & DEPOSITS)   */}
        {/* ============================================================== */}
        {!isUtility && (
          <div className="space-y-2 min-w-0">
            <div className={`${surfaceBox} rounded-2xl px-3 py-2 flex items-center justify-between gap-2 min-w-0`}>
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  data-receipt-badge="true"
                  className="w-8 h-8 rounded-xl inline-flex items-center justify-center font-black text-xs shrink-0"
                  style={{
                    backgroundColor: light ? "#D1FAE5" : isExportCanvas ? "#073022" : "rgba(0, 232, 135, 0.14)",
                    color: light ? "#047857" : "#00E887",
                    border: `1px solid ${isExportCanvas ? "#1A4535" : "rgba(16, 185, 129, 0.3)"}`,
                    fontSize: "12px",
                    lineHeight: "12px",
                  }}
                >
                  <span data-badge-text="true" style={{ fontSize: "12px", lineHeight: "12px" }}>
                    {entity.initials}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-[8.5px] font-bold uppercase tracking-wider block ${mutedText}`}>
                    {isInbound ? "Sender" : "Beneficiary"}
                  </span>
                  <p className={`font-bold text-xs ${strongText} ${valueTextClass}`}>
                    {entity.counterpartyName}
                  </p>
                  <p className={`text-[10px] ${mutedText} ${valueTextClass}`}>
                    {entity.counterpartySub}
                  </p>
                </div>
              </div>

              <span
                data-receipt-badge="true"
                className="px-2 py-1 rounded-full text-[9.5px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: light ? "#ECFDF5" : isExportCanvas ? "#073022" : "rgba(16, 185, 129, 0.12)",
                  color: light ? "#047857" : "#34D399",
                  border: `1px solid ${isExportCanvas ? "#1A4535" : "rgba(16, 185, 129, 0.25)"}`,
                  fontSize: "9.5px",
                  lineHeight: "10px",
                }}
              >
                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                <span data-badge-text="true" style={{ fontSize: "9.5px", lineHeight: "10px" }}>
                  Verified
                </span>
              </span>
            </div>

            {/* 2-Column Bank & Masked Account Grid */}
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <div className={`${surfaceBox} rounded-2xl px-2.5 py-2 space-y-0.5 min-w-0`}>
                <span className={`text-[8px] font-bold uppercase tracking-wider block truncate ${mutedText}`}>
                  {isInbound ? "Source Bank" : "Destination Bank"}
                </span>
                <p className={`font-bold text-[11px] ${strongText} ${valueTextClass}`}>
                  {entity.bankName}
                </p>
              </div>

              <div className={`${surfaceBox} rounded-2xl px-2.5 py-2 space-y-0.5 min-w-0`}>
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <span className={`text-[8px] font-bold uppercase tracking-wider truncate ${mutedText}`}>
                    {isP2P ? "Barter ID" : "Account No."}
                  </span>
                  {!isExportCanvas && onToggleMask && entity.accountIdentifier && (
                    <button
                      type="button"
                      onClick={onToggleMask}
                      className={`text-[9px] font-semibold flex items-center gap-0.5 shrink-0 ${light ? "text-emerald-700" : "text-emerald-400"
                        }`}
                      title={maskDigits ? "Show full digits" : "Mask account digits"}
                    >
                      {maskDigits ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      {maskDigits ? "Show" : "Mask"}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <p className={`font-mono font-bold text-[11px] ${strongText} truncate`}>
                    {displayedAccountId}
                  </p>
                  {!isExportCanvas && !maskDigits && entity.accountIdentifier && (
                    <CopyChipButton
                      value={entity.accountIdentifier}
                      label={isP2P ? "Barter ID" : "Account Number"}
                      light={light}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STRUCTURED LEDGER METADATA ROWS (EXPLICIT SOFT DIVIDERS)       */}
        {/* ============================================================== */}
        <div className={`${surfaceBox} rounded-2xl px-3 py-0.5 min-w-0`}>
          {detailRows.map((row, idx) => (
            <div
              key={row.key}
              data-receipt-row="true"
              className={`${isExportCanvas ? "py-2" : "py-1.5"} flex items-start justify-between gap-2.5 min-w-0`}
              style={{
                borderTop: idx > 0 ? `1px solid ${dividerHex}` : "none",
              }}
            >
              <span
                data-receipt-row-label="true"
                className={`${mutedText} font-medium shrink-0 whitespace-nowrap pt-0.5`}
                style={{
                  fontSize: "10.5px",
                  lineHeight: "13px",
                }}
              >
                {row.label}
              </span>
              <div className="flex items-start justify-end gap-1.5 min-w-0 flex-1">
                <span
                  data-receipt-row-value="true"
                  className={`text-right min-w-0 ${
                    row.mono ? "font-mono break-all" : "break-words"
                  } ${
                    row.bold ? "font-bold" : row.semibold ? "font-semibold" : "font-normal"
                  } ${valueTextClass}`}
                  style={{
                    color: row.accent
                      ? light
                        ? "#047857"
                        : "#34D399"
                      : light
                        ? "#0F172A"
                        : "#FFFFFF",
                    fontSize: row.isNarration ? "10px" : "10.5px",
                    lineHeight: "13px",
                  }}
                  title={row.title || undefined}
                >
                  {row.value}
                </span>
                {!isExportCanvas && row.copyValue && (
                  <CopyChipButton
                    value={row.copyValue}
                    label={row.copyLabel || "Value"}
                    light={light}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ============================================================== */}
        {/* FOOTER: OFFICIAL SEAL + OPTIONAL QR VERIFICATION CODE          */}
        {/* ============================================================== */}
        <div
          className={`pt-2 border-t ${dividerColor} flex items-center justify-between gap-2 min-w-0`}
        >
          <div className="flex flex-col items-start gap-1 min-w-0">
            {includeSeal && (
              <div
                data-receipt-badge="true"
                className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-xl border text-[9.5px] font-bold whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: light ? "#ECFDF5" : isExportCanvas ? "#073022" : "rgba(16, 185, 129, 0.1)",
                  borderColor: isExportCanvas ? "#1A4535" : "rgba(16, 185, 129, 0.3)",
                  color: light ? "#047857" : "#34D399",
                  fontSize: "9.5px",
                  lineHeight: "10px",
                }}
              >
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span data-badge-text="true" style={{ fontSize: "9.5px", lineHeight: "10px" }}>
                  {isP2P
                    ? "PayWaka Ledger Verified"
                    : "Official Settlement Receipt"}
                </span>
              </div>
            )}
            <span
              className={`text-[9.5px] whitespace-nowrap pl-0.5 ${mutedText}`}
              style={{ fontSize: "9.5px", lineHeight: "10px" }}
            >
              Generated by PayWaka Systems
            </span>
          </div>

          {includeQr && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="text-right">
                <span className={`text-[7.5px] font-bold uppercase tracking-wider block whitespace-nowrap ${mutedText}`}>
                  Scan to Verify
                </span>
                <span className={`text-[9px] font-mono whitespace-nowrap ${mutedText}`}>
                  #{String(txRef).slice(-8)}
                </span>
              </div>
              <div className="p-1 bg-white rounded-lg border border-slate-200 shrink-0">
                <QRCodeSVG value={verifyUrl} size={isExportCanvas ? 34 : 32} level="M" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Strictly View-Only Payment Processor Fee Slip (Zero Download or Share controls).
 */
export function ProcessorFeeSlipCard({ transaction }) {
  if (!transaction) return null;
  const txRef = getTransactionReference(transaction);
  const feeRef = getFeeReference(transaction);
  const feeAmount = Number(transaction.fee || 0);
  const entity = getTransactionEntityInfo(transaction);
  const formattedDate = formatTransactionDate(transaction);

  return (
    <div
      className="relative rounded-3xl overflow-hidden max-w-[380px] w-full mx-auto border border-blue-500/30 shadow-2xl"
      style={{ backgroundColor: "#070C14", color: "#FFFFFF" }}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />
      <div className="p-4 sm:p-5 space-y-3.5 relative z-10">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-xl bg-blue-500/10 border border-blue-500/30 shrink-0">
              <img src="/logo.png" alt="PayWaka" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white block leading-none">
                PAYWAKA
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 block mt-1">
                PAYMENT PROCESSOR FEE SLIP
              </span>
            </div>
          </div>
          <Badge className="bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[10px] font-extrabold uppercase">
            PAID
          </Badge>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D1624] border border-blue-500/20 text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
            STATUTORY PROCESSOR FEE
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-blue-400">
            ₦{formatNairaAmount(feeAmount)}
          </div>
          <span className="text-[11px] text-slate-400 block">
            NIBSS Interbank Processing Charge
          </span>
        </div>

        <div className="rounded-2xl bg-[#0D1624]/80 border border-white/10 px-4 py-1 divide-y divide-white/10 text-xs">
          <div className="py-2.5 flex justify-between gap-3">
            <span className="text-slate-400 shrink-0">Fee Reference</span>
            <span className="font-mono font-bold text-white">{feeRef}</span>
          </div>
          <div className="py-2.5 flex justify-between gap-3">
            <span className="text-slate-400 shrink-0">Parent Transfer Ref</span>
            <span className="font-mono text-slate-200">{txRef}</span>
          </div>
          <div className="py-2.5 flex justify-between gap-3">
            <span className="text-slate-400 shrink-0">Beneficiary</span>
            <span className="font-semibold text-white">{entity.recipientName}</span>
          </div>
          <div className="py-2.5 flex justify-between gap-3">
            <span className="text-slate-400 shrink-0">Destination</span>
            <span className="text-slate-200">{entity.bankName}</span>
          </div>
          <div className="py-2.5 flex justify-between gap-3">
            <span className="text-slate-400 shrink-0">Timestamp</span>
            <span className="font-mono text-slate-300">{formattedDate}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/20 flex items-center justify-center gap-2 text-[11px] text-blue-300">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>View-only processor record (download & share disabled)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-Viewport Portal Export Settings Dialog
 * Portaled directly into document.body so its backdrop ALWAYS covers 100vw x 100vh even when opened from inside Dialogs.
 */
function ExportReceiptSettingsModal({
  isOpen,
  onClose,
  settings,
  onChange,
  onDownloadNow,
  isExporting,
}) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="paywaka-export-settings-portal"
      style={{ pointerEvents: "auto" }}
      className="fixed inset-0 w-screen h-screen z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{ pointerEvents: "auto" }}
        className="bg-[#0B1411] border border-emerald-500/30 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl text-white pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Receipt Export Settings</h3>
              <p className="text-[11px] text-slate-400">
                Customize appearance, format & privacy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Color Theme */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Document Color Theme
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ ...settings, theme: "dark" })}
              className={`p-3 rounded-2xl border text-left transition-all ${settings.theme === "dark"
                ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400"
                : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-4 h-4 rounded-full bg-[#070C0A] border border-emerald-400" />
                {settings.theme === "dark" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span className="text-xs font-bold block">Obsidian Emerald</span>
              <span className="text-[10px] text-slate-400">Signature dark look</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...settings, theme: "light" })}
              className={`p-3 rounded-2xl border text-left transition-all ${settings.theme === "light"
                ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400"
                : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-300" />
                {settings.theme === "light" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span className="text-xs font-bold block">Formal Print</span>
              <span className="text-[10px] text-slate-400">White paper sheet</span>
            </button>
          </div>
        </div>

        {/* Export File Format */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Export File Format
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ ...settings, format: "pdf" })}
              className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all ${settings.format === "pdf"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-slate-300"
                }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>PDF Document</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...settings, format: "png" })}
              className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all ${settings.format === "png"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-slate-300"
                }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>PNG Image</span>
            </button>
          </div>
        </div>

        {/* Security & Content Toggles */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold block">Include Verification QR Code</span>
              <span className="text-[10px] text-slate-400">Scannable digital lookup tag</span>
            </div>
            <Switch
              checked={settings.includeQr}
              onCheckedChange={(v) => onChange({ ...settings, includeQr: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold block">Mask Sensitive Account Digits</span>
              <span className="text-[10px] text-slate-400">Hide middle account digits on export</span>
            </div>
            <Switch
              checked={settings.maskDigits}
              onCheckedChange={(v) => onChange({ ...settings, maskDigits: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold block">Official PayWaka Settlement Seal</span>
              <span className="text-[10px] text-slate-400">Watermark & verification stamp</span>
            </div>
            <Switch
              checked={settings.includeSeal}
              onCheckedChange={(v) => onChange({ ...settings, includeSeal: v })}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs h-10 rounded-xl"
          >
            Done
          </Button>
          <Button
            type="button"
            disabled={isExporting}
            onClick={() => {
              onDownloadNow(settings.format, settings.theme);
              onClose();
            }}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs h-10 rounded-xl"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1.5" />
            )}
            Export {settings.format.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Interactive Multi-Platform Share Modal (Portaled to document.body above all stacking contexts).
 * Pre-renders a crisp preview and lets users share PNG Images or PDF Documents to
 * WhatsApp, Telegram, X, Email, Clipboard, or the device's Native Share Sheet.
 */
function ShareReceiptModal({
  isOpen,
  onClose,
  transaction,
  theme,
  exportCardRef,
  initialFormat = "png",
}) {
  const [shareFormat, setShareFormat] = useState(initialFormat);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState(null);
  const [copiedImage, setCopiedImage] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    let cancelled = false;
    setLoading(true);
    generateReceiptShareAssets({
      element: exportCardRef?.current,
      tx: transaction,
      format: shareFormat,
      theme,
    })
      .then((res) => {
        if (!cancelled) setAssets(res);
      })
      .catch((err) => {
        console.error("Failed to prepare share assets:", err);
        if (!cancelled) toast.error("Could not prepare receipt for sharing.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, transaction, shareFormat, theme, exportCardRef]);

  if (!isOpen || typeof document === "undefined") return null;

  const canNativeFileShare =
    typeof navigator !== "undefined" &&
    !!navigator.share &&
    !!navigator.canShare &&
    !!assets?.file &&
    navigator.canShare({ files: [assets.file] });

  const handleCopyImageOrSummary = async () => {
    if (!assets) return;
    try {
      if (
        shareFormat === "png" &&
        assets.pngBlob &&
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": assets.pngBlob }),
        ]);
        setCopiedImage(true);
        toast.success("Receipt image copied! Paste (Ctrl+V) into any chat.");
        setTimeout(() => setCopiedImage(false), 2000);
        return;
      }
      await navigator.clipboard?.writeText(assets.summary);
      toast.success("Receipt verification summary copied to clipboard!");
    } catch {
      await navigator.clipboard?.writeText(assets.summary).catch(() => {});
      toast.info("Receipt details copied to clipboard.");
    }
  };

  const handleNativeShare = async () => {
    if (!assets) return;
    try {
      if (canNativeFileShare) {
        await navigator.share({
          title: `PayWaka Receipt - ${assets.title}`,
          text: assets.summary,
          files: [assets.file],
        });
        toast.success("Receipt shared!");
        onClose();
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: `PayWaka Receipt - ${assets.title}`,
          text: assets.summary,
          url: assets.verifyUrl,
        });
        toast.success("Receipt shared!");
        onClose();
        return;
      }
      triggerReceiptDownload(assets.blob, assets.filename);
      await navigator.clipboard?.writeText(assets.summary).catch(() => {});
      toast.success(`Saved ${assets.filename} so you can attach it anywhere!`);
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error("Unable to invoke system share dialog.");
      }
    }
  };

  const handlePlatformShare = async (platform) => {
    if (!assets) return;
    // Try native file share directly only on touch/mobile OS where navigator.canShare works cleanly;
    // on desktop web open the social channel URL while placing PNG in clipboard / saving PDF locally.
    let preparedNote = "";
    if (
      shareFormat === "png" &&
      assets.pngBlob &&
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard?.write
    ) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": assets.pngBlob }),
        ]);
        preparedNote = "Receipt image copied — paste (Ctrl+V) to attach!";
      } catch {
        triggerReceiptDownload(assets.blob, assets.filename);
        preparedNote = `Saved ${assets.filename} — attach it in ${platform}!`;
      }
    } else {
      triggerReceiptDownload(assets.blob, assets.filename);
      preparedNote = `Saved ${assets.filename} — attach it in ${platform}!`;
    }

    const encodedSummary = encodeURIComponent(assets.summary);
    const encodedUrl = encodeURIComponent(assets.verifyUrl);
    const encodedSubject = encodeURIComponent(`PayWaka Receipt — ${assets.title}`);

    let targetUrl = "";
    if (platform === "WhatsApp") {
      targetUrl = `https://wa.me/?text=${encodedSummary}`;
    } else if (platform === "Telegram") {
      targetUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedSummary}`;
    } else if (platform === "X") {
      targetUrl = `https://twitter.com/intent/tweet?text=${encodedSummary}`;
    } else if (platform === "Email") {
      targetUrl = `mailto:?subject=${encodedSubject}&body=${encodedSummary}`;
    }

    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    toast.success(preparedNote);
  };

  return createPortal(
    <div
      id="paywaka-share-receipt-portal"
      role="dialog"
      aria-modal="true"
      aria-label="Share PayWaka Receipt"
      style={{ pointerEvents: "auto" }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 w-screen h-screen z-[2147483000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-white pointer-events-auto"
    >
      <div
        style={{ pointerEvents: "auto" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-[#070C0A] border border-emerald-500/35 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto pointer-events-auto"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share Receipt</h3>
              <p className="text-[11px] text-slate-400">
                Send crisp {shareFormat.toUpperCase()} to social apps or system sheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Share Modal"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Share File Format Switcher */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setShareFormat("png")}
            className={`p-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              shareFormat === "png"
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>Image (PNG)</span>
          </button>
          <button
            type="button"
            onClick={() => setShareFormat("pdf")}
            className={`p-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              shareFormat === "pdf"
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>PDF Document</span>
          </button>
        </div>

        {/* Rendered Receipt Thumbnail Preview */}
        <div className="rounded-2xl bg-[#0D1814] border border-white/10 p-3 flex items-center gap-3">
          <div className="w-16 h-20 rounded-xl bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
            {loading || !assets?.previewDataUrl ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            ) : (
              <img
                src={assets.previewDataUrl}
                alt="Receipt Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <span className="text-xs font-bold text-white block truncate">
              {assets?.title || getTransactionDisplayTitle(transaction)}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold block">
              {assets?.amountText || `₦${formatNairaAmount(transaction?.amount)}`}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block truncate">
              {assets?.filename || "Preparing high-res receipt..."}
            </span>
          </div>
        </div>

        {/* Social Platform Channels */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Send Directly To
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading || !assets}
              onClick={() => handlePlatformShare("WhatsApp")}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#0D1814] hover:bg-emerald-500/15 border border-emerald-500/25 text-xs font-bold text-white disabled:opacity-50 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              disabled={loading || !assets}
              onClick={() => handlePlatformShare("Telegram")}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#0D1814] hover:bg-sky-500/15 border border-sky-500/25 text-xs font-bold text-white disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Telegram</span>
            </button>
            <button
              type="button"
              disabled={loading || !assets}
              onClick={() => handlePlatformShare("X")}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#0D1814] hover:bg-white/10 border border-white/15 text-xs font-bold text-white disabled:opacity-50 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-slate-200 shrink-0" />
              <span>X (Twitter)</span>
            </button>
            <button
              type="button"
              disabled={loading || !assets}
              onClick={() => handlePlatformShare("Email")}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#0D1814] hover:bg-amber-500/15 border border-amber-500/25 text-xs font-bold text-white disabled:opacity-50 transition-all"
            >
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* Copy / Native Sheet Actions */}
        <div className="flex gap-2.5 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={loading || !assets}
            onClick={handleCopyImageOrSummary}
            className="flex-1 h-10 bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-bold rounded-xl"
          >
            {copiedImage ? (
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1.5" />
            )}
            {shareFormat === "png" ? "Copy Image" : "Copy Details"}
          </Button>
          <Button
            type="button"
            disabled={loading || !assets}
            onClick={handleNativeShare}
            className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            {canNativeFileShare ? "Share File" : "More Apps"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Full Responsive PayWaka Receipt Experience:
 * - mode="page": 12-column Desktop Split (Telemetry Left | Receipt Right) + Tablet + Mobile Ticket
 * - mode="modal": At-a-glance Centered Receipt with full Export Settings, PDF/PNG Download & Social Share
 */
export default function PaywakaReceiptView({
  transaction,
  mode = "page",
  onBack,
  onClose,
}) {
  const exportCardRef = useRef(null);
  const [activeTab, setActiveTab] = useState("main"); // "main" | "fee"
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalFormat, setShareModalFormat] = useState("png");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [exportSettings, setExportSettings] = useState({
    theme: "dark",
    format: "pdf",
    includeQr: true,
    maskDigits: true,
    includeSeal: true,
  });

  if (!transaction) return null;

  const txRef = getTransactionReference(transaction);
  const feeAmount = Number(transaction.fee || 0);
  const isP2P = isP2PTransaction(transaction);
  const isInbound = isInboundTransaction(transaction);
  const statusInfo = getTransactionStatusInfo(transaction);
  const displayTitle = getTransactionDisplayTitle(transaction);
  const checksum = computeReceiptChecksum(transaction);
  const numAmount = Math.abs(Number(transaction.amount) || 0);

  const handleDownload = async (
    chosenFormat = exportSettings.format,
    chosenTheme = exportSettings.theme,
  ) => {
    try {
      setShowDownloadMenu(false);
      setBusyAction(`download-${chosenFormat}`);
      toast.info(`Preparing ${chosenTheme === "light" ? "Formal Print" : "Obsidian"} ${chosenFormat.toUpperCase()}...`);
      if (chosenTheme !== exportSettings.theme) {
        setExportSettings((prev) => ({ ...prev, theme: chosenTheme }));
        await new Promise((r) => setTimeout(r, 150));
      }
      await exportReceiptAsFile({
        element: exportCardRef.current,
        txRef,
        format: chosenFormat,
        theme: chosenTheme,
      });
      toast.success(`PayWaka receipt (${chosenFormat.toUpperCase()}) downloaded!`);
    } catch (err) {
      console.error("Receipt export error:", err);
      toast.error("Failed to export receipt. Please try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = (chosenFormat = "png") => {
    setShowDownloadMenu(false);
    setShareModalFormat(chosenFormat);
    setIsShareModalOpen(true);
  };

  const ActionControls = (
    <div className="space-y-2.5 pt-1">
      {/* Fee Slip Switcher Banner when a Processor Fee exists */}
      {feeAmount > 0 && !transaction.isProcessorFeeSlip && (
        <div className="grid grid-cols-2 gap-1.5 bg-[#0A1310] p-1 rounded-2xl border border-emerald-500/20">
          <button
            type="button"
            onClick={() => setActiveTab("main")}
            className={`py-2 px-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === "main"
              ? "bg-emerald-500 text-black shadow-md"
              : "text-slate-400 hover:text-white"
              }`}
          >
            Receipt (₦{formatNairaAmount(numAmount)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fee")}
            className={`py-2 px-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === "fee"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-400 hover:text-white"
              }`}
          >
            Fee Slip (₦{formatNairaAmount(feeAmount)})
          </button>
        </div>
      )}

      {/* Single-Row Download, Share & Settings Action Bar (STRICTLY HIDDEN on Processor Fee Slip) */}
      {activeTab === "main" && !transaction.isProcessorFeeSlip && (
        <div className="flex items-center gap-2 w-full relative">
          {/* Download with Format Selector */}
          <div className="relative flex-1 min-w-0">
            <Button
              type="button"
              disabled={busyAction !== null}
              onClick={() => {
                setShowDownloadMenu((v) => !v);
              }}
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 px-3 whitespace-nowrap"
            >
              {busyAction?.startsWith("download") ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Download</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80 shrink-0" />
            </Button>

            {showDownloadMenu && (
              <div className="absolute left-0 right-0 min-w-[230px] bottom-full mb-2 bg-[#0D1814] border border-emerald-500/30 rounded-2xl p-2 shadow-2xl z-50 space-y-1 text-white">
                <button
                  type="button"
                  onClick={() => handleDownload("pdf", exportSettings.theme)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-500/15 text-xs font-semibold text-left"
                >
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block">Download as PDF</span>
                    <span className="text-[10px] text-slate-400">
                      {exportSettings.theme === "light" ? "Formal Print White" : "Obsidian Dark"}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("png", exportSettings.theme)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-500/15 text-xs font-semibold text-left"
                >
                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="block">Download as PNG Image</span>
                    <span className="text-[10px] text-slate-400">High-res crisp receipt</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("pdf", "light")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-500/15 text-xs font-semibold text-left border-t border-white/10 mt-1 pt-2"
                >
                  <ReceiptIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="block">Printable White PDF</span>
                    <span className="text-[10px] text-slate-400">White sheet with watermark</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Share to Social Media / Copy Image / System Share Modal */}
          <div className="relative flex-1 min-w-0">
            <Button
              type="button"
              variant="outline"
              disabled={busyAction !== null}
              onClick={() => handleShare("png")}
              className="w-full h-10 bg-[#0D1814] border-emerald-500/30 hover:bg-emerald-500/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 px-3 whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Share</span>
            </Button>
          </div>

          {/* Export Settings Trigger (Always stays inline on same row) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsExportSettingsOpen(true)}
            title="Customize receipt theme, masking & format"
            aria-label="Receipt Export Settings"
            className="h-10 w-10 p-0 bg-[#0D1814] border-white/15 hover:bg-white/10 text-slate-200 rounded-xl shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full min-w-0">
      {/* Top Bar in Page Mode */}
      {mode === "page" && onBack && (
        <div className="max-w-5xl mx-auto pb-3 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            size="sm"
            className="border-border bg-card/50 hover:bg-card text-foreground rounded-xl h-8 px-3 text-xs font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </Button>
          <button
            type="button"
            onClick={() =>
              setExportSettings((prev) => ({
                ...prev,
                theme: prev.theme === "dark" ? "light" : "dark",
              }))
            }
            className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors"
          >
            {exportSettings.theme === "light"
              ? "Switch to Obsidian Dark"
              : "Preview Formal Print Sheet"}
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* DESKTOP 12-COLUMN LAYOUT (when mode="page") OR COMPACT MODAL    */}
      {/* ================================================================ */}
      {mode === "page" ? (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* LEFT 5 COLUMNS: Compact Settlement Telemetry, Cryptographic Checksum & Single-Row Controls */}
          <div className="lg:col-span-5 space-y-3.5 order-2 lg:order-1 min-w-0">
            {/* Payment Status Card */}
            <div className="rounded-3xl bg-[#070C0A] border border-emerald-500/20 p-4 sm:p-5 space-y-3 shadow-2xl text-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Settlement Telemetry
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 whitespace-nowrap">
                  {statusInfo.badgeText}
                </span>
              </div>

              <div>
                <h2 className="text-base font-black text-white leading-snug" title={displayTitle}>
                  {displayTitle}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isP2P
                    ? "Settled internally via PayWaka ledger with zero fees."
                    : isInbound
                      ? "Confirmed inbound settlement to your PayWaka wallet."
                      : "Electronic transfer processed via NIBSS Direct Credit."}
                </p>
              </div>

              <div className="rounded-2xl bg-[#0D1814] border border-white/10 px-3.5 py-0.5 divide-y divide-white/10 text-[11px]">
                <div className="py-2 flex justify-between gap-2">
                  <span className="text-slate-400">Payment Channel</span>
                  <span className="font-semibold text-white text-right">
                    {isP2P ? "PayWaka Internal P2P" : "NIBSS Instant Payment (NIP)"}
                  </span>
                </div>
                <div className="py-2 flex justify-between gap-2">
                  <span className="text-slate-400">Response Code</span>
                  <span className="font-mono font-bold text-emerald-400 text-right">
                    {statusInfo.responseCode}
                  </span>
                </div>
                <div className="py-2 flex justify-between gap-2">
                  <span className="text-slate-400">Processor Fee</span>
                  <span className="font-mono font-bold text-white text-right">
                    {isP2P ? "₦0.00 (Free)" : `₦${formatNairaAmount(feeAmount)}`}
                  </span>
                </div>
                {(Number(transaction.cashbackApplied || 0) > 0 || transaction.cashbackUsed) && (
                  <>
                    <div className="py-2 flex justify-between gap-2">
                      <span className="text-slate-400">Cashback Applied</span>
                      <span className="font-mono font-bold text-emerald-400 text-right">
                        -₦{formatNairaAmount(transaction.cashbackApplied || 0)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between gap-2">
                      <span className="text-slate-400">Wallet Contribution</span>
                      <span className="font-mono font-bold text-white text-right">
                        ₦{formatNairaAmount(transaction.walletContribution ?? numAmount)}
                      </span>
                    </div>
                  </>
                )}
                {Number(transaction.cashbackEarned || 0) > 0 && (
                  <div className="py-2 flex justify-between gap-2">
                    <span className="text-slate-400">Cashback Earned</span>
                    <span className="font-mono font-bold text-emerald-400 text-right">
                      +₦{formatNairaAmount(transaction.cashbackEarned)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cryptographic SHA-256 Checksum Panel */}
            <div className="rounded-3xl bg-[#070C0A] border border-white/10 p-4 sm:p-5 space-y-2 shadow-xl text-white">
              <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Cryptographic Verification</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Deterministic SHA-256 integrity checksum for dispute & audit reconciliation.
              </p>
              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                <code className="text-[10px] font-mono text-emerald-300 break-all leading-relaxed">
                  {checksum}
                </code>
                <CopyChipButton value={checksum} label="Checksum" />
              </div>
            </div>

            {/* Single-Row Action Bar & Fee Switcher (Desktop Left Column) */}
            <div className="hidden lg:block">
              {ActionControls}
            </div>
          </div>

          {/* RIGHT 7 COLUMNS: Sleek At-a-Glance Official Glassmorphic or Formal Print Receipt */}
          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col items-center space-y-3 min-w-0">
            <div className="w-full max-w-[380px] mx-auto min-w-0">
              {activeTab === "main" ? (
                <PaywakaReceiptSurface
                  transaction={transaction}
                  theme={exportSettings.theme}
                  includeQr={exportSettings.includeQr}
                  maskDigits={exportSettings.maskDigits}
                  includeSeal={exportSettings.includeSeal}
                  onToggleMask={() =>
                    setExportSettings((s) => ({ ...s, maskDigits: !s.maskDigits }))
                  }
                />
              ) : (
                <ProcessorFeeSlipCard transaction={transaction} />
              )}
            </div>

            {/* Mobile & Tablet Action Bar directly beneath Receipt */}
            <div className="w-full max-w-[380px] mx-auto lg:hidden">
              {ActionControls}
            </div>
          </div>
        </div>
      ) : (
        /* COMPACT AT-A-GLANCE MODAL / EMBEDDED RECEIPT LAYOUT */
        <div className="w-full max-w-[368px] mx-auto space-y-2.5 min-w-0">
          {onClose && (
            <div className="flex items-center justify-between px-0.5">
              <button
                type="button"
                onClick={() =>
                  setExportSettings((prev) => ({
                    ...prev,
                    theme: prev.theme === "dark" ? "light" : "dark",
                  }))
                }
                className="px-2.5 py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors"
              >
                {exportSettings.theme === "light" ? "Dark View" : "Print Sheet"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-black/60 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === "main" ? (
            <PaywakaReceiptSurface
              transaction={transaction}
              theme={exportSettings.theme}
              includeQr={exportSettings.includeQr}
              maskDigits={exportSettings.maskDigits}
              includeSeal={exportSettings.includeSeal}
              onToggleMask={() =>
                setExportSettings((s) => ({ ...s, maskDigits: !s.maskDigits }))
              }
            />
          ) : (
            <ProcessorFeeSlipCard transaction={transaction} />
          )}

          {ActionControls}
        </div>
      )}

      {/* Full-Viewport Portal Export Settings Dialog */}
      <ExportReceiptSettingsModal
        isOpen={isExportSettingsOpen}
        onClose={() => setIsExportSettingsOpen(false)}
        settings={exportSettings}
        onChange={setExportSettings}
        onDownloadNow={handleDownload}
        isExporting={busyAction !== null}
      />

      {/* Full-Viewport Portal Multi-Platform Share Dialog */}
      <ShareReceiptModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        transaction={transaction}
        theme={exportSettings.theme}
        initialFormat={shareModalFormat}
        exportCardRef={exportCardRef}
      />

      {/* Sleek Offscreen Render Target (380px -> 1140px @ 3x scale) for seamless PNG/PDF export */}
      <div
        style={{
          position: "fixed",
          left: "-99999px",
          top: "0px",
          width: "380px",
          zIndex: -50,
          opacity: 1,
          pointerEvents: "none",
        }}
      >
        <PaywakaReceiptSurface
          transaction={transaction}
          cardRef={exportCardRef}
          id="paywaka-receipt-export-canvas"
          theme={exportSettings.theme}
          includeQr={exportSettings.includeQr}
          maskDigits={exportSettings.maskDigits}
          includeSeal={exportSettings.includeSeal}
          isExportCanvas={true}
        />
      </div>
    </div>
  );
}

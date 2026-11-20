import { toCanvas } from "html-to-image";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

/**
 * Normalizes transaction reference IDs cleanly.
 */
export function getTransactionReference(tx) {
  if (!tx) return "pwk";
  return (
    tx.tx_ref ||
    tx.reference ||
    tx.requestId ||
    tx.id ||
    `pwk${Date.now()}`
  );
}

/**
 * Generates or returns the linked Payment Processor Fee slip reference.
 */
export function getFeeReference(tx) {
  if (tx?.feeRef) return tx.feeRef;
  const baseRef = String(getTransactionReference(tx));
  if (baseRef.toLowerCase().startsWith("pwk")) {
    return baseRef.replace(/^pwk(p2p)?/i, "pwkfee");
  }
  return `pwkfee${baseRef.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Strips any internal gateway prefix ("PAYOUTSUB ") cleanly.
 */
export function sanitizeEntityName(name) {
  if (!name) return "";
  return String(name)
    .replace(/^PAYOUTSUB\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Determines whether a transaction represents a PayWaka P2P wallet-to-wallet transfer.
 * Zero-fee badges on receipts MUST only appear when this is true (or free inbound deposits).
 */
export function isP2PTransaction(tx) {
  if (!tx) return false;
  if (tx.isP2P === true) return true;
  const refLower = String(getTransactionReference(tx)).toLowerCase();
  if (refLower.startsWith("pwkp2p") || refLower.startsWith("pwk-p2p")) return true;
  const bankLower = String(tx.bankName || tx.recipientBankName || "").toLowerCase();
  if (bankLower.includes("paywaka")) return true;
  if (tx.senderBarterId && tx.recipientBarterId) return true;
  return false;
}

/**
 * Determines whether a transaction is a refund.
 */
export function isRefundTransaction(tx) {
  if (!tx) return false;
  const narrationLower = String(tx.narration || "").toLowerCase();
  const statusLower = String(tx.status || "").toLowerCase();
  return (
    tx.refunded === true ||
    statusLower === "refunded" ||
    narrationLower.includes("refunded")
  );
}

/**
 * Determines whether money flowed into the user's PayWaka wallet.
 */
export function isInboundTransaction(tx) {
  if (!tx) return false;
  if (isRefundTransaction(tx)) return true;
  const typeLower = String(tx.type || "").toLowerCase();
  const categoryLower = String(tx.category || "").toLowerCase();
  const narrationLower = String(tx.narration || "").toLowerCase();
  const titleLower = String(tx.title || "").toLowerCase();

  return (
    typeLower === "inflow" ||
    typeLower === "credit" ||
    typeLower === "income" ||
    categoryLower === "wallet funding" ||
    categoryLower === "deposit" ||
    categoryLower === "cashback" ||
    categoryLower === "earning" ||
    categoryLower === "referral" ||
    narrationLower === "credit" ||
    titleLower.startsWith("transfer from ")
  );
}

/**
 * Resolves high-level receipt category for tailored UI blocks & badges.
 */
export function getTransactionCategoryKind(tx) {
  if (!tx) return "withdrawal";
  if (tx.isProcessorFeeSlip || String(tx.category || "").toLowerCase() === "fee") {
    return "fee";
  }
  const cat = String(tx.category || tx.billType || "").toLowerCase();
  const nar = String(tx.narration || "").toLowerCase();

  if (cat.includes("electric") || cat === "utilitybills" || tx.meterNo || tx.tokenPin || tx.token) {
    return "electricity";
  }
  if (cat.includes("data") || cat === "mobiledata" || tx.planName || tx.planCode) {
    return "data";
  }
  if (cat.includes("airtime")) {
    return "airtime";
  }
  if (cat.includes("cable") || tx.smartCardNo || tx.cableTV) {
    return "cable";
  }
  if (isP2PTransaction(tx)) {
    return "p2p";
  }
  if (isInboundTransaction(tx)) {
    return "deposit";
  }
  if (nar.includes("bill") || cat.includes("meal")) {
    return "utility";
  }
  return "withdrawal";
}

/**
 * Resolves entity-driven transaction & receipt titles ("Transfer from {Sender}" / "Transfer to {Receiver}").
 */
export function getTransactionDisplayTitle(tx) {
  if (!tx) return "PayWaka Transaction";

  const kind = getTransactionCategoryKind(tx);
  if (kind === "fee") return "Payment Processor Fee";

  if (kind === "electricity") {
    return tx.title || (tx.company ? `${tx.company} Electricity Token` : "Electricity Bill Payment");
  }
  if (kind === "data") {
    return tx.title || (tx.network ? `${tx.network} Data Bundle` : "Mobile Data Purchase");
  }
  if (kind === "airtime") {
    return tx.title || (tx.network ? `${tx.network} Airtime Recharge` : "Airtime Purchase");
  }
  if (kind === "cable") {
    return tx.title || (tx.cableTV ? `${tx.cableTV} Subscription` : "Cable TV Subscription");
  }
  if (kind === "utility") {
    return tx.title || tx.narration || tx.category || "Bill Payment";
  }

  if (tx.transactionType === "cashback_transfer" || String(tx.category || "").toLowerCase() === "cashback transfer") {
    return tx.title || "Cashback Transfer to Main Wallet";
  }

  const inbound = isInboundTransaction(tx);

  if (inbound) {
    const sender =
      sanitizeEntityName(tx.senderName) ||
      sanitizeEntityName(tx.meta?.sender_name) ||
      sanitizeEntityName(tx.customer?.name) ||
      sanitizeEntityName(tx.fullname) ||
      "External Sender";

    // Preserve explicit "Transfer from X" if already persisted cleanly
    if (String(tx.title || "").startsWith("Transfer from ")) {
      return tx.title;
    }
    return `Transfer from ${sender}`;
  }

  const receiver =
    sanitizeEntityName(tx.recipientName) ||
    sanitizeEntityName(tx.accountHolder) ||
    sanitizeEntityName(tx.account_name) ||
    sanitizeEntityName(tx.fullname) ||
    tx.recipientBankName ||
    tx.bankName ||
    tx.recipientAccountNumber ||
    tx.account_number ||
    "Beneficiary";

  if (String(tx.title || "").startsWith("Transfer to ")) {
    return tx.title;
  }
  return `Transfer to ${receiver}`;
}

/**
 * Extracts normalized entity, bank, account, and initial metadata for the receipt card.
 */
export function getTransactionEntityInfo(tx) {
  if (tx.transactionType === "cashback_transfer" || String(tx.category || "").toLowerCase() === "cashback transfer") {
    return tx.title || "Cashback Transfer to Main Wallet";
  }

  const inbound = isInboundTransaction(tx);
  const isP2P = isP2PTransaction(tx);
  const kind = getTransactionCategoryKind(tx);

  const senderName =
    sanitizeEntityName(tx?.senderName) ||
    sanitizeEntityName(tx?.meta?.sender_name) ||
    (inbound ? sanitizeEntityName(tx?.fullname) : "") ||
    "PayWaka Wallet Holder";

  const recipientName =
    sanitizeEntityName(tx?.recipientName) ||
    sanitizeEntityName(tx?.accountHolder) ||
    sanitizeEntityName(tx?.account_name) ||
    (!inbound ? sanitizeEntityName(tx?.fullname) : "") ||
    tx?.bankName ||
    tx?.recipientBankName ||
    "Beneficiary";

  const counterpartyName = inbound ? senderName : recipientName;
  const initials =
    counterpartyName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "PW";

  const accountIdentifier = inbound
    ? isP2P
      ? tx?.senderBarterId || tx?.recipientBarterId || tx?.senderAccountNumber || ""
      : tx?.senderAccountNumber || tx?.recipientAccountNumber || tx?.account_number || tx?.accountNumber || ""
    : isP2P
      ? tx?.recipientBarterId || tx?.accountNumber || tx?.account_number || ""
      : tx?.recipientAccountNumber || tx?.account_number || tx?.accountNumber || "";

  const bankName = isP2P
    ? "PayWaka Wallet (P2P)"
    : inbound
      ? tx?.senderBankName || tx?.bank_name || tx?.recipientBankName || "Wema Bank PLC (PSA)"
      : tx?.recipientBankName || tx?.bankName || tx?.bank_name || "Destination Bank";

  const sourceAccount = inbound
    ? isP2P
      ? `@${tx?.senderUserName || senderName}`
      : bankName
    : isP2P
      ? `PayWaka Wallet (@${tx?.senderUserName || "paywaka"})`
      : "PayWaka PSA Vault";

  const counterpartySub = isP2P
    ? inbound
      ? `@${tx?.senderUserName || "paywaka"} • PayWaka Verified`
      : `@${tx?.recipientUserName || "paywaka"} • PayWaka Verified`
    : bankName;

  return {
    inbound,
    isP2P,
    kind,
    senderName,
    recipientName,
    counterpartyName,
    counterpartySub,
    initials,
    accountIdentifier,
    bankName,
    sourceAccount,
  };
}

/**
 * Cleanly masks sensitive account numbers and Barter IDs when masking is enabled:
 * - 10-digit NUBAN: 8136259221 -> 813****221
 * - 15-digit Barter ID: 234000003565029 -> 2340*******5029
 */
export function maskAccountIdentifier(value, shouldMask = true) {
  if (!value) return "N/A";
  const str = String(value).trim();
  if (!shouldMask) return str;

  if (/^\d{10}$/.test(str)) {
    return `${str.slice(0, 3)}****${str.slice(-3)}`;
  }
  if (str.length >= 11) {
    const maskLen = Math.max(4, str.length - 8);
    return `${str.slice(0, 4)}${"*".repeat(maskLen)}${str.slice(-4)}`;
  }
  if (str.length > 5) {
    return `${str.slice(0, 2)}***${str.slice(-2)}`;
  }
  return str;
}

/**
 * Formats transaction narration for receipt display and export.
 * When masking is enabled, masks 10-digit NUBAN account numbers embedded inside
 * narration text (e.g., "Withdrawal to Opay - 8136259221 | pwk..." ->
 * "Withdrawal to Opay - 813****221 | pwk...") while keeping longer refs intact.
 */
export function formatReceiptNarration(narration, fallback = "Transaction Settlement", shouldMask = true) {
  const raw = String(narration || fallback || "Transaction Settlement").trim();
  if (!shouldMask) return raw;
  return raw.replace(/(?<![a-zA-Z0-9])\d{10}(?![a-zA-Z0-9])/g, (match) =>
    maskAccountIdentifier(match, true),
  );
}

/**
 * Extracts deposit Session ID with "PSA_" stripped when present.
 */
export function extractSessionId(tx) {
  if (!tx) return null;
  if (tx.sessionId) {
    return String(tx.sessionId).replace(/^PSA_/i, "").trim();
  }
  const candidate = String(tx.flw_ref || tx.reference || "");
  if (/^PSA_/i.test(candidate)) {
    return candidate.replace(/^PSA_/i, "").trim();
  }
  return null;
}

/**
 * Safely parses Firestore Timestamp, ISO string, or Date into a JS Date object.
 */
export function parseTransactionDate(tx) {
  if (!tx) return new Date();
  if (tx?.createdAt?.toDate) return tx.createdAt.toDate();
  if (tx?.createdAt?.seconds) return new Date(tx.createdAt.seconds * 1000);
  if (tx?.created_at) return new Date(tx.created_at);
  if (tx?.timestamp?.toDate) return tx.timestamp.toDate();
  if (tx?.timestamp) return new Date(tx.timestamp);
  if (tx?.date) return new Date(tx.date);
  return new Date();
}

export function formatTransactionDate(tx, opts = { dateStyle: "medium", timeStyle: "short" }) {
  const dateObj = parseTransactionDate(tx);
  if (isNaN(dateObj.getTime())) return "Recently";
  return dateObj.toLocaleString("en-NG", opts);
}

/**
 * Maps raw transaction status into unified visual badges & settlement response codes.
 */
export function getTransactionStatusInfo(tx) {
  const statusLower = String(tx?.status || "").toLowerCase();
  const isRefund = isRefundTransaction(tx);

  if (isRefund) {
    return {
      key: "refunded",
      label: "REFUNDED",
      badgeText: "Refunded to Wallet",
      responseCode: "00 (Reversed)",
    };
  }
  if (
    statusLower === "completed" ||
    statusLower === "successful" ||
    statusLower === "success" ||
    statusLower === "settled"
  ) {
    return {
      key: "success",
      label: "SUCCESSFUL",
      badgeText: "Settled",
      responseCode: "00 (Approved)",
    };
  }
  if (["pending", "new", "initiated", "processing"].includes(statusLower)) {
    return {
      key: "pending",
      label: "PENDING",
      badgeText: "Processing",
      responseCode: "09 (In Progress)",
    };
  }
  return {
    key: "failed",
    label: "FAILED",
    badgeText: "Declined",
    responseCode: "91 (Declined)",
  };
}

/**
 * Produces a deterministic 64-char SHA-256 style cryptographic checksum for receipt audit display.
 */
export function computeReceiptChecksum(tx) {
  const seed = `${getTransactionReference(tx)}|${tx?.amount || 0}|${extractSessionId(tx) || ""}|${parseTransactionDate(tx).toISOString().slice(0, 10)}|paywaka`;
  const parts = [];
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let round = 0; round < 8; round++) {
    for (let i = 0; i < seed.length; i++) {
      const ch = seed.charCodeAt(i);
      h1 = Math.imul(h1 ^ (ch + round * 31), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ ((ch << 3) + round * 17), 0x85ebca6b) >>> 0;
    }
    parts.push(((h1 ^ h2) >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 64);
}

/**
 * Formats Nigerian Naira currency values consistently.
 */
export function formatNairaAmount(val) {
  const num = Math.abs(Number(val) || 0);
  return num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Clips the captured receipt canvas to its exact rounded outer corners and punches
 * clean transparent semicircular voucher perforation cutouts on both side edges.
 */
function punchVoucherCanvas(rawCanvas, sourceElement) {
  if (!rawCanvas || !sourceElement) return rawCanvas;
  const width = rawCanvas.width;
  const height = rawCanvas.height;
  const rect = sourceElement.getBoundingClientRect();
  const scale = rect.width > 0 ? width / rect.width : 3;

  const computed = getComputedStyle(sourceElement);
  const rawRadius = parseFloat(computed.borderTopLeftRadius) || 24;
  const radius = Math.min(rawRadius * scale, Math.min(width, height) / 2);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) return rawCanvas;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(rawCanvas, 0, 0);
  ctx.restore();

  const perfEl = sourceElement.querySelector('[data-perforation-line="true"]');
  if (perfEl && rect.height > 0) {
    const perfRect = perfEl.getBoundingClientRect();
    const perfY = (perfRect.top + perfRect.height / 2 - rect.top) * scale;
    const notchRadius = 10 * scale;
    if (perfY > notchRadius && perfY < height - notchRadius) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(0, perfY, notchRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width, perfY, notchRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return outCanvas;
}

/**
 * Captures the PayWaka receipt card cleanly at 3x scale for sharp PNG and PDF export.
 * Guarantees transparent outer corners, borderless perforation cutouts, zero dark seams,
 * and centered pill/row baselines after fonts, logo images, and QR SVGs finish rendering.
 */
export async function captureReceiptCanvas({ element, theme = "dark" }) {
  if (!element) throw new Error("Receipt element not found for export.");
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      if (typeof img.decode === "function") {
        await img.decode().catch(() => { });
      }
    }),
  );

  // Wait one paint frame so SVG QR codes and layout metrics settle completely
  await new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    } else {
      setTimeout(resolve, 16);
    }
  });

  const bgColor = theme === "light" ? "#FFFFFF" : "#070C0A";

  let rawCanvas = null;
  try {
    rawCanvas = await toCanvas(element, {
      pixelRatio: 3,
      cacheBust: false,
      backgroundColor: null,
      fontEmbedCSS: "",
      style: {
        opacity: "1",
        boxShadow: "none",
        transform: "none",
      },
      filter: (node) =>
        !(node instanceof HTMLElement && node.getAttribute("data-export-hide") === "true"),
    });
  } catch (nativeRenderErr) {
    console.warn("html-to-image capture fallback to html2canvas:", nativeRenderErr);
    rawCanvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        const styleElements = clonedDoc.querySelectorAll("style");
        styleElements.forEach((s) => {
          if (s.textContent) {
            s.textContent = s.textContent
              .replace(/oklab\([^)]+\)/gi, "transparent")
              .replace(/oklch\([^)]+\)/gi, "transparent");
          }
        });

        const allNodes = clonedDoc.querySelectorAll("*");
        allNodes.forEach((node) => {
          const styleAttr = node.getAttribute("style");
          if (styleAttr && (styleAttr.includes("oklab") || styleAttr.includes("oklch"))) {
            node.setAttribute(
              "style",
              styleAttr
                .replace(/oklab\([^)]+\)/gi, "transparent")
                .replace(/oklch\([^)]+\)/gi, "transparent"),
            );
          }
        });

        if (clonedElement) {
          if (clonedElement.parentElement) {
            clonedElement.parentElement.style.opacity = "1";
            clonedElement.parentElement.style.background = "transparent";
          }
          clonedElement.style.backgroundColor = bgColor;
          clonedElement.style.opacity = "1";
          clonedElement.style.boxShadow = "none";
          clonedElement.style.backdropFilter = "none";
          clonedElement.style.webkitBackdropFilter = "none";
        }
      },
    });
  }

  return punchVoucherCanvas(rawCanvas, element);
}

/**
 * Builds an exact-aspect-ratio jsPDF instance matching the receipt card (zero margin bands).
 */
export function buildReceiptPdfFromCanvas(canvas, theme = "dark") {
  const imgData = canvas.toDataURL("image/png");
  const pageWidthMm = 100;
  const pageHeightMm = Number(((canvas.height * pageWidthMm) / canvas.width).toFixed(2));
  const pdf = new jsPDF({
    orientation: pageHeightMm >= pageWidthMm ? "portrait" : "landscape",
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
  });

  if (theme === "light") {
    pdf.setFillColor(255, 255, 255);
  } else {
    pdf.setFillColor(7, 12, 10);
  }
  pdf.rect(0, 0, pageWidthMm, pageHeightMm, "F");
  pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm);
  return pdf;
}

/**
 * Triggers a browser file download for a Blob or Data URL.
 */
export function triggerReceiptDownload(blobOrUrl, filename) {
  const isUrlString = typeof blobOrUrl === "string";
  const url = isUrlString ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (!isUrlString) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Generates and downloads either a PDF Document or High-Res PNG Image of the receipt.
 */
export async function exportReceiptAsFile({ element, txRef, format = "pdf", theme = "dark" }) {
  const safeRef = String(txRef || "receipt").replace(/[^a-zA-Z0-9_-]/g, "");
  const canvas = await captureReceiptCanvas({ element, theme });

  if (format === "png" || format === "image") {
    const imgData = canvas.toDataURL("image/png");
    triggerReceiptDownload(imgData, `PayWaka-Receipt-${safeRef}.png`);
    return { format: "png" };
  }

  const pdf = buildReceiptPdfFromCanvas(canvas, theme);
  pdf.save(`PayWaka-Receipt-${safeRef}.pdf`);
  return { format: "pdf" };
}

/**
 * Prepares ready-to-share PNG/PDF File, preview DataURL, and clean verification summary
 * for the interactive ShareReceiptModal and native Web Share API.
 */
export async function generateReceiptShareAssets({ element, tx, format = "png", theme = "dark" }) {
  const txRef = getTransactionReference(tx);
  const safeRef = String(txRef).replace(/[^a-zA-Z0-9_-]/g, "");
  const title = getTransactionDisplayTitle(tx);
  const amountText = `₦${formatNairaAmount(tx?.amount)}`;
  const statusInfo = getTransactionStatusInfo(tx);
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/Receipts/${txRef}/${tx?.uid || tx?.userId || "verify"}`
      : `https://paywaka.com/Receipts/${txRef}`;

  const summary = [
    `PayWaka Receipt — ${title}`,
    `Amount: ${amountText}`,
    `Reference: ${txRef}`,
    `Status: ${statusInfo.label}`,
    `Date: ${formatTransactionDate(tx)}`,
    `Verify: ${verifyUrl}`,
  ].join("\n");

  const canvas = await captureReceiptCanvas({ element, theme });
  const previewDataUrl = canvas.toDataURL("image/png");
  const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

  let file = new File([pngBlob], `PayWaka-Receipt-${safeRef}.png`, {
    type: "image/png",
  });
  let pdfBlob = null;

  if (format === "pdf") {
    const pdf = buildReceiptPdfFromCanvas(canvas, theme);
    pdfBlob = pdf.output("blob");
    file = new File([pdfBlob], `PayWaka-Receipt-${safeRef}.pdf`, {
      type: "application/pdf",
    });
  }

  return {
    file,
    blob: format === "pdf" ? pdfBlob : pngBlob,
    pngBlob,
    pdfBlob,
    previewDataUrl,
    filename: file.name,
    mimeType: file.type,
    title,
    amountText,
    txRef,
    statusLabel: statusInfo.label,
    verifyUrl,
    summary,
  };
}

/**
 * Shares the actual rendered Receipt as an Image (PNG) or PDF Document via Web Share API,
 * or triggers download + summary copy on unsupported desktop browsers.
 */
export async function shareReceiptToSocial({ element, tx, format = "png", theme = "dark" }) {
  const assets = await generateReceiptShareAssets({ element, tx, format, theme });

  if (
    navigator.share &&
    navigator.canShare &&
    assets.file &&
    navigator.canShare({ files: [assets.file] })
  ) {
    try {
      await navigator.share({
        title: `PayWaka Receipt - ${assets.title}`,
        text: assets.summary,
        files: [assets.file],
      });
      return { shared: true, method: "native-file", assets };
    } catch (err) {
      if (err?.name === "AbortError") {
        return { shared: false, cancelled: true, assets };
      }
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `PayWaka Receipt - ${assets.title}`,
        text: assets.summary,
      });
      return { shared: true, method: "native-text", assets };
    } catch (err) {
      if (err?.name === "AbortError") {
        return { shared: false, cancelled: true, assets };
      }
    }
  }

  triggerReceiptDownload(assets.blob, assets.filename);
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(assets.summary).catch(() => { });
  }
  toast.info(
    `Downloaded ${format.toUpperCase()} & copied summary so you can attach it to WhatsApp, X, or Telegram!`,
  );
  return { shared: true, method: "fallback-download", assets };
}

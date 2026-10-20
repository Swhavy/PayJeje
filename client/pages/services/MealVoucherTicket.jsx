import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Info,
  CheckCircle,
  MapPin,
  RefreshCw,
  Copy,
  Check,
  Key,
  Timer,
  Receipt,
  Navigation,
  ShieldCheck,
  X,
  AlertTriangle,
  Store,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { db, auth, doc, onSnapshot } from "@/firebaseConfig";
import { getUserVoucherById, getUserVouchers, getVendorById } from "@/fixtures/mealFixtures";

export default function MealVoucherTicketPage() {
  const { voucherId } = useParams();
  const navigate = useNavigate();

  const isRealVoucher = Boolean(voucherId && voucherId.startsWith("vch_"));
  const [loading, setLoading] = useState(isRealVoucher);
  const [liveVoucherDoc, setLiveVoucherDoc] = useState(null);
  const fixtureVoucher = isRealVoucher ? null : (getUserVoucherById(voucherId) || getUserVouchers("active")[0]);

  useEffect(() => {
    if (!voucherId) return;

    let unsubDoc = null;

    const setupListener = (uid) => {
      unsubDoc = onSnapshot(
        doc(db, "meal_vouchers", voucherId),
        (snap) => {
          setLoading(false);
          if (snap.exists()) {
            setLiveVoucherDoc({ id: snap.id, ...snap.data() });
          }
        },
        (err) => {
          console.warn("Live voucher fetch note:", err.message);
          setLoading(false);
        }
      );
    };

    if (auth.currentUser) {
      setupListener(auth.currentUser.uid);
      return () => {
        if (unsubDoc) unsubDoc();
      };
    } else {
      const unsubAuth = auth.onAuthStateChanged((user) => {
        if (user) {
          setupListener(user.uid);
        } else if (!isRealVoucher) {
          setLoading(false);
        }
      });
      return () => {
        unsubAuth();
        if (unsubDoc) unsubDoc();
      };
    }
  }, [voucherId, isRealVoucher]);

  const voucher = liveVoucherDoc
    ? {
        id: liveVoucherDoc.id || voucherId,
        vendorId: liveVoucherDoc.vendorId || "paywaka-demo-foods",
        vendorName: liveVoucherDoc.vendorName || "PayWaka Demo Foods",
        vendorBranch: liveVoucherDoc.redeemedVendorBranch || "Victoria Island • 1.2km",
        title: `₦${(liveVoucherDoc.discountNaira || 500).toLocaleString()} Meal Discount Voucher`,
        discountAmount: liveVoucherDoc.discountNaira || 500,
        discountDisplay: `₦${(liveVoucherDoc.discountNaira || 500).toLocaleString()} OFF`,
        minSpend: liveVoucherDoc.minSpendNaira || 2500,
        code: liveVoucherDoc.voucherCode,
        pin: liveVoucherDoc.voucherPin,
        status: liveVoucherDoc.status || "active",
        expiresAt: liveVoucherDoc.expiresAt?.toDate ? liveVoucherDoc.expiresAt.toDate().toISOString() : liveVoucherDoc.expiresAt,
        category: "Local Delicacies",
        transparencyText: `Enjoy ₦${(liveVoucherDoc.discountNaira || 500).toLocaleString()} off meals when spending ₦${(liveVoucherDoc.minSpendNaira || 2500).toLocaleString()} or more.`,
        instructions: [
          "Present this QR code or 4-digit claim PIN to cashier before order placement.",
          "Cashier validates the discount on PayWaka Merchant Terminal.",
          "Valid exclusively for meals & drinks during store operating hours.",
          "Cannot be combined with another promotional discount in the same order."
        ],
      }
    : fixtureVoucher;

  const vendor = getVendorById(voucher?.vendorId);

  const [copied, setCopied] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    (fixtureVoucher?.hoursRemaining || 24) * 3600
  );

  // Sync countdown timer with live voucher expiration
  useEffect(() => {
    if (!voucher) return;
    if (voucher.status !== "active") return;

    if (liveVoucherDoc?.expiresAt) {
      const expDate = liveVoucherDoc.expiresAt.toDate
        ? liveVoucherDoc.expiresAt.toDate()
        : new Date(liveVoucherDoc.expiresAt);
      const remainingSec = Math.max(0, Math.floor((expDate.getTime() - Date.now()) / 1000));
      setSecondsRemaining(remainingSec);
    } else if (fixtureVoucher?.hoursRemaining) {
      setSecondsRemaining(fixtureVoucher.hoursRemaining * 3600);
    }
  }, [liveVoucherDoc, voucher?.status, fixtureVoucher?.hoursRemaining]);

  // Live countdown timer ticker
  useEffect(() => {
    if (voucher?.status !== "active") return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [voucher?.status]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const handleCopyCode = () => {
    if (voucher?.code) {
      navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isActive = voucher?.status === "active";
  const isUsed = voucher?.status === "used";
  const isExpired = voucher?.status === "expired";

  if (loading && !liveVoucherDoc) {
    return (
      <DashboardLayout>
        <div className="w-full bg-[#111317] text-[#e2e2e8] min-h-[400px] flex items-center justify-center p-8 rounded-2xl border border-[#282a2e]/60">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#44e092] animate-spin" />
            <p className="text-sm font-semibold text-zinc-300">Retrieving Voucher Ticket from Vault...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-28 sm:pb-32 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="max-w-md mx-auto flex flex-col gap-5">
          {/* TOP FLOATING ACTIONS BAR */}
          <div className="flex items-center justify-between pb-4 border-b border-[#282a2e]/70">
            <button
              type="button"
              onClick={() => navigate("/services/meals/vouchers")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] text-zinc-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Vouchers</span>
            </button>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1c20] border border-[#282a2e] text-xs whitespace-nowrap">
              <span
                className={`w-2 h-2 rounded-full ${
                  isActive
                    ? "bg-[#44e092] animate-pulse shadow-[0_0_8px_rgba(68,224,146,0.8)]"
                    : isUsed
                    ? "bg-zinc-500"
                    : "bg-[#ffb4ab]"
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                {isActive ? "Live Ticket" : isUsed ? "Redeemed Ticket" : "Expired Ticket"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              aria-label="Voucher Information"
              className="w-9 h-9 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* DIGITAL VOUCHER TICKET (GENUINE PERFORATED TWO-PART CONSTRUCTION WITH SMOOTH EMERALD GRADIENT) */}
          <div className="relative w-full flex flex-col drop-shadow-[0_16px_36px_rgba(0,0,0,0.6)]">
            {/* TICKET TOP SECTION: MERCHANT & REWARD CORE (SMOOTH EMERALD GRADIENT) */}
            <div className="w-full rounded-t-[26px] bg-gradient-to-b from-[#091e14] via-[#0d2118] to-[#121915] border-t border-l border-r border-[#44e092]/35 p-6 sm:p-7 flex flex-col gap-4 relative">
              {/* Brand & Status Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#004729]/60 flex items-center justify-center text-2xl shadow-inner border border-[#44e092]/30 flex-shrink-0">
                    {vendor?.logoEmoji || "🍗"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-white truncate">
                        {voucher?.vendorName}
                      </h2>
                      <CheckCircle className="w-4 h-4 text-[#44e092] flex-shrink-0" />
                    </div>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{voucher?.vendorBranch}</span>
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-2 flex-shrink-0 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                    isActive
                      ? "bg-[#004729] text-[#44e092] border border-[#44e092]/30"
                      : isUsed
                      ? "bg-[#282a2e] text-zinc-400 border border-white/5"
                      : "bg-[#93000a]/20 text-[#ffdad6] border border-[#ffdad6]/20"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-[#44e092]" : isUsed ? "bg-zinc-500" : "bg-[#ffb4ab]"
                    }`}
                  />
                  <span>{isActive ? "Ready" : isUsed ? "Redeemed" : "Expired"}</span>
                </div>
              </div>

              {/* Hero Discount Block */}
              <div className="flex flex-col items-center justify-center py-2 text-center">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                  Instant Meal Discount
                </span>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-[#ff6b00] tracking-tight">
                    {voucher?.discountDisplay}
                  </span>
                </div>
                <div className="mt-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#06180f] to-[#101814] text-zinc-300 text-xs border border-[#44e092]/25 whitespace-nowrap shadow-sm">
                  Min. order <strong className="text-white">₦{voucher?.minSpend?.toLocaleString()}</strong> on food & drinks
                </div>
              </div>
            </div>

            {/* GENUINE PERFORATION BAND WITH CONTINUOUS CONNECTED NOTCHES */}
            <div className="relative w-full h-7 flex items-center justify-between bg-[#121915] px-0 overflow-visible">
              {/* Left Notch: Genuine Inward Cutout Void, Outer Border Curves Inward */}
              <div className="relative -ml-[1px] w-4.5 h-7 flex-shrink-0">
                <svg viewBox="0 0 18 28" className="w-full h-full" fill="none" preserveAspectRatio="none">
                  <path
                    d="M 0 0 C 9.94 0 18 6.27 18 14 C 18 21.73 9.94 28 0 28"
                    fill="#111317"
                    stroke="rgba(68, 224, 146, 0.35)"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>

              {/* Dashed Perforation Line Connecting Left and Right Notches */}
              <div className="flex-1 border-b-2 border-dashed border-[#44e092]/30 mx-3 opacity-80" />

              {/* Right Notch: Symmetrical Inward Cutout Void */}
              <div className="relative -mr-[1px] w-4.5 h-7 flex-shrink-0">
                <svg viewBox="0 0 18 28" className="w-full h-full" fill="none" preserveAspectRatio="none">
                  <path
                    d="M 18 0 C 8.06 0 0 6.27 0 14 C 0 21.73 8.06 28 18 28"
                    fill="#111317"
                    stroke="rgba(68, 224, 146, 0.35)"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>
            </div>

            {/* TICKET BOTTOM SECTION: QR CODE & VOUCHER TOKEN (SMOOTH EMERALD GRADIENT) */}
            <div className="w-full rounded-b-[26px] bg-gradient-to-b from-[#121915] via-[#0e1d16] to-[#13171a] border-b border-l border-r border-[#44e092]/35 p-6 sm:p-7 flex flex-col items-center gap-4 relative">
              {/* Scannable Frame with Corner Focus Accents */}
              <div className="relative p-4 rounded-2xl bg-gradient-to-b from-[#06160e] to-[#0c1410] shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-[#44e092]/30">
                {/* 4 Corner Focus Accents */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#44e092] rounded-tl-sm pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#44e092] rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#44e092] rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#44e092] rounded-br-sm pointer-events-none" />

                {/* Clean QR Code Center */}
                <div
                  className={`w-48 h-48 rounded-xl bg-white p-3 flex items-center justify-center transition-all ${
                    !isActive ? "opacity-30 grayscale" : ""
                  }`}
                >
                  <QRCodeSVG
                    value={voucher?.code || "PWK-DEMO-NULL"}
                    size={168}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <RefreshCw className="w-3.5 h-3.5 text-[#44e092]" />
                <span>Dynamic QR code refreshes for fraud prevention</span>
              </div>

              {/* Token String with Quick Copy Trigger */}
              <div className="w-full flex items-center justify-between bg-gradient-to-r from-[#071911] to-[#101713] rounded-2xl px-5 py-3.5 border border-[#44e092]/30 shadow-inner">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Voucher Token
                  </span>
                  <span className="text-base sm:text-lg font-bold tracking-wider text-white font-mono">
                    {voucher?.code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                    copied
                      ? "bg-[#004729] text-[#44e092] border border-[#44e092]/30"
                      : "bg-[#ff6b00] hover:bg-[#ff7a1a] text-white active:scale-95"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Manual Redemption PIN Display */}
              <div className="w-full flex items-center justify-between bg-gradient-to-r from-[#071911] to-[#101713] rounded-2xl px-5 py-3 border border-[#44e092]/25">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400">Manual Cashier PIN:</span>
                </div>
                <span className="text-lg font-mono font-black text-white tracking-widest">
                  {voucher?.pin}
                </span>
              </div>

              {/* Expiration Timer Warning */}
              {isActive ? (
                <div className="w-full flex items-center gap-3.5 bg-gradient-to-r from-[#0a1a12] via-[#0f1d16] to-[#14171a] text-zinc-300 p-4 rounded-2xl border border-[#44e092]/30 text-left">
                  <Timer className="w-5 h-5 text-[#ff6b00] flex-shrink-0 animate-pulse" />
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white">
                        Expires in {hours}h {minutes}m {seconds}s
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate">
                        {voucher?.expiresAtText}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-0.5">
                      Voucher will auto-relinquish back into pool after expiration.
                    </span>
                  </div>
                </div>
              ) : isUsed ? (
                <div className="w-full flex items-center gap-3 bg-gradient-to-r from-[#071911] to-[#101713] text-zinc-400 p-4 rounded-2xl border border-[#44e092]/25 text-left">
                  <CheckCircle className="w-4 h-4 text-[#44e092]" />
                  <span className="text-xs">
                    Redeemed at cashier ({voucher?.redeemedAt || "Past Order"})
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center gap-3 bg-[#93000a]/20 text-[#ffdad6] p-4 rounded-2xl border border-[#93000a]/40 text-left">
                  <AlertTriangle className="w-4 h-4 text-[#ffb4ab]" />
                  <span className="text-xs">Voucher has expired and can no longer be redeemed.</span>
                </div>
              )}
            </div>
          </div>

          {/* CASHIER WALKTHROUGH ACCORDION (SMOOTH EMERALD GRADIENT) */}
          <div className="bg-gradient-to-b from-[#091d14] via-[#0d1e17] to-[#14171a] rounded-2xl p-5 sm:p-6 border border-[#44e092]/30 flex flex-col gap-3.5 text-left shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#004729]/50 border border-[#44e092]/30 flex items-center justify-center text-[#44e092]">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">How to Redeem at Counter</h3>
            </div>
            <div className="pt-3.5 mt-0.5 border-t border-[#44e092]/20 flex flex-col gap-3">
              <div className="bg-gradient-to-b from-[#06180f] to-[#0e1613] rounded-xl p-4 sm:p-5 border border-[#44e092]/20 flex flex-col gap-3.5">
                <div className="flex gap-3.5 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#1b222a] text-white border border-[#44e092]/30 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                    1
                  </span>
                  <span className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                    Present this QR code or 6-digit claim PIN before cashier generates your final bill.
                  </span>
                </div>
                <div className="flex gap-3.5 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#ff6b00] text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-sm mt-0.5">
                    2
                  </span>
                  <span className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                    The cashier scans your code to apply the instant ₦ discount to your order.
                  </span>
                </div>
                <div className="flex gap-3.5 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#004729] text-[#44e092] border border-[#44e092]/30 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                    3
                  </span>
                  <span className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                    Pay the remaining order balance by card, cash, or transfer directly at POS.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BRANCH DIRECTIONS / ACTIONS (SMOOTH EMERALD GRADIENT) */}
          <div className="bg-gradient-to-r from-[#081c13] via-[#0d1e17] to-[#14171a] rounded-2xl p-4 border border-[#44e092]/30 flex items-center justify-between text-left shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#004729]/50 border border-[#44e092]/30 flex items-center justify-center text-[#44e092] flex-shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">{voucher?.vendorName}</span>
                <span className="text-[11px] text-zinc-400 truncate">{voucher?.vendorBranch}</span>
              </div>
            </div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(voucher?.vendorName + " " + voucher?.vendorBranch)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-full bg-[#004729]/60 hover:bg-[#004729]/90 text-[#44e092] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#44e092]/30 flex-shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-[#44e092]" />
              <span>Directions</span>
            </a>
          </div>
        </div>

        {/* INFO MODAL (SMOOTH EMERALD GRADIENT) */}
        {showInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-gradient-to-b from-[#091e14] via-[#0e1d17] to-[#14171a] border border-[#44e092]/35 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-left animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-[#44e092]/20">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#44e092]" />
                  Voucher Security & Rules
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="w-8 h-8 rounded-full bg-[#1a1c20] text-zinc-400 hover:text-white flex items-center justify-center transition-colors border border-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed bg-gradient-to-b from-[#06180f] to-[#0e1613] p-4 rounded-2xl border border-[#44e092]/20">
                <p>
                  • <strong>Single Use:</strong> Each voucher code can only be scanned and redeemed once by the cashier.
                </p>
                <p>
                  • <strong>48-Hour Validity:</strong> Unused vouchers automatically expire after 48 hours to protect partner campaign budgets.
                </p>
                <p>
                  • <strong>Fair Usage Limits:</strong> You can hold 1 active voucher per offer at a time, up to 2 claims lifetime per campaign.
                </p>
                <p>
                  • <strong>Minimum Spend:</strong> Ensure your order meets the minimum spend (e.g. ₦{voucher?.minSpend?.toLocaleString()}) to qualify.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-full py-2.5 rounded-full bg-[#ff6b00] text-white font-bold text-xs shadow-md mt-2 hover:bg-[#ff7a1a] transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Clock,
  CheckCircle,
  MapPin,
  Sparkles,
  Wallet,
  Minus,
  FileText,
  ChevronDown,
  Navigation,
  Redo2,
  AlertCircle,
  Ticket,
  X,
  Store,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { db, auth, doc, onSnapshot } from "@/firebaseConfig";
import { getMealOfferById, getMealOffers, getVendorById } from "@/fixtures/mealFixtures";

export default function MealCouponDetailPage() {
  const { couponId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user) || {};
  const userData = useSelector((state) => state.user?.userData);
  const currentUid = user?.uid || auth.currentUser?.uid;

  const { redeemMealCoupon } = useCloudfunc();

  const offer = getMealOfferById(couponId) || getMealOffers()[0];
  const vendor = getVendorById(offer.vendorId);

  const [livePoints, setLivePoints] = useState(null);
  const [liveClaim, setLiveClaim] = useState(null);
  const [isTermsOpen, setIsTermsOpen] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [pinError, setPinError] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);

  const pin0Ref = useRef(null);
  const pin1Ref = useRef(null);
  const pin2Ref = useRef(null);
  const pin3Ref = useRef(null);
  const pinInputRefs = [pin0Ref, pin1Ref, pin2Ref, pin3Ref];

  // Subscribe to real-time points & claims in Firestore
  useEffect(() => {
    if (!currentUid) return;

    const unsubUser = onSnapshot(doc(db, "users", currentUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.points === "number") {
          setLivePoints(data.points);
        }
      }
    });

    const unsubClaim = onSnapshot(doc(db, "users", currentUid, "mealClaims", offer.id), (snap) => {
      if (snap.exists()) {
        setLiveClaim(snap.data());
      }
    });

    return () => {
      unsubUser();
      unsubClaim();
    };
  }, [currentUid, offer.id]);

  const pointsBalance = typeof livePoints === "number"
    ? livePoints
    : typeof user?.points === "number"
    ? user.points
    : 0;

  const pointsCost = offer.pointsCost || 100;
  const balanceAfter = Math.max(0, pointsBalance - pointsCost);
  const hasEnoughPoints = pointsBalance >= pointsCost;

  // Authoritative claim stats
  const lifetimeClaimCount = liveClaim?.lifetimeClaimCount ?? offer.lifetimeClaimCount ?? 0;
  const maxLifetimeClaims = offer.maxLifetimeClaims || 2;
  const isLimitReached = lifetimeClaimCount >= maxLifetimeClaims;

  let hasActiveVoucher = false;
  let activeVoucherId = offer.activeVoucherId || null;

  if (liveClaim) {
    if (liveClaim.activeVoucherId) {
      const activeExpiresAtMs = liveClaim.activeVoucherExpiresAt?.toMillis
        ? liveClaim.activeVoucherExpiresAt.toMillis()
        : liveClaim.activeVoucherExpiresAt?.toDate
        ? liveClaim.activeVoucherExpiresAt.toDate().getTime()
        : liveClaim.activeVoucherExpiresAt
        ? new Date(liveClaim.activeVoucherExpiresAt).getTime()
        : 0;

      if (Date.now() < activeExpiresAtMs) {
        hasActiveVoucher = true;
        activeVoucherId = liveClaim.activeVoucherId;
      }
    }
  } else {
    hasActiveVoucher = Boolean(offer.hasActiveVoucher);
  }

  const pinValuesRef = useRef(["", "", "", ""]);
  const isRedeemingRef = useRef(false);
  const claimIdempotencyRef = useRef(null);

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    pinValuesRef.current[index] = clean;
    const updated = [...pinValuesRef.current];
    setPinDigits(updated);
    setPinError("");

    if (clean && index < 3) {
      pinInputRefs[index + 1]?.current?.focus();
    }

    if (index === 3 && clean) {
      const fullPin = pinValuesRef.current.join("");
      if (fullPin.length === 4 && !isRedeemingRef.current) {
        handleExecuteRedemption(fullPin);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinValuesRef.current[index] && index > 0) {
      pinInputRefs[index - 1]?.current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    const digits = pasted.split("");
    const filled = [digits[0] || "", digits[1] || "", digits[2] || "", digits[3] || ""];
    pinValuesRef.current = filled;
    setPinDigits(filled);
    setPinError("");
    if (pasted.length === 4 && !isRedeemingRef.current) {
      handleExecuteRedemption(pasted);
    } else {
      pinInputRefs[Math.min(digits.length, 3)]?.current?.focus();
    }
  };

  const handleExecuteRedemption = async (overridePin) => {
    if (isRedeemingRef.current) return;

    const rawPin = overridePin || pinValuesRef.current.join("") || pinDigits.join("");
    if (rawPin.length !== 4) {
      setPinError("Please enter your 4-digit transaction PIN.");
      return;
    }

    isRedeemingRef.current = true;
    setIsRedeeming(true);
    setPinError("");

    try {
      if (!claimIdempotencyRef.current) {
        claimIdempotencyRef.current = `claim_${currentUid || "guest"}_${offer.id}_${Date.now()}`;
      }
      const idempotencyKey = claimIdempotencyRef.current;
      const res = await redeemMealCoupon({
        couponId: offer.id,
        pin: rawPin,
        idempotencyKey,
      });

      if (res?.success && res?.voucher) {
        toast.success("Meal Voucher claimed successfully! Valid for 48 hours.");
        setShowPinModal(false);
        pinValuesRef.current = ["", "", "", ""];
        setPinDigits(["", "", "", ""]);
        navigate(`/services/meals/voucher/${res.voucher.id}`);
      } else {
        throw new Error(res?.message || "Failed to redeem meal voucher.");
      }
    } catch (err) {
      console.error("Voucher claim error:", err);
      const friendlyMessage =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Failed to authorize voucher claim. Please check your PIN and try again.";
      setPinError(friendlyMessage);
      pinValuesRef.current = ["", "", "", ""];
      setPinDigits(["", "", "", ""]);
      setTimeout(() => pinInputRefs[0]?.current?.focus(), 150);
    } finally {
      isRedeemingRef.current = false;
      setIsRedeeming(false);
    }
  };

  const handleOpenPinModal = () => {
    claimIdempotencyRef.current = `claim_${currentUid || "guest"}_${offer.id}_${Date.now()}`;
    pinValuesRef.current = ["", "", "", ""];
    setPinDigits(["", "", "", ""]);
    setPinError("");
    setIsRedeeming(false);
    setShowPinModal(true);
    setTimeout(() => pinInputRefs[0]?.current?.focus(), 200);
  };

  return (
    <DashboardLayout>
      <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-40 lg:pb-32 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {/* TOP NAVIGATION ROW */}
          <div className="flex items-center justify-between pb-4 border-b border-[#282a2e]/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/services/meals")}
                className="w-10 h-10 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] flex items-center justify-center text-[#e2e2e8] transition-colors"
                aria-label="Back to marketplace"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#44e092] flex items-center gap-1.5 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#44e092] shadow-[0_0_8px_rgba(68,224,146,0.8)]" />
                  PayWaka Food Rewards
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                  Coupon Details
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBookmarked(!isBookmarked)}
                aria-label="Bookmark voucher"
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                  isBookmarked
                    ? "bg-[#004729] border-[#44e092]/50 text-[#44e092]"
                    : "bg-[#1a1c20] hover:bg-[#282a2e] border-[#282a2e] text-zinc-400"
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: offer.title,
                      text: `Check out ${offer.discountDisplay} at ${offer.vendorName} on PayWaka!`,
                      url: window.location.href,
                    });
                  }
                }}
                aria-label="Share voucher"
                className="w-10 h-10 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* HERO VISUAL MODULE (SMOOTH EMERALD GRADIENT ON CARD & MERCHANT PILL) */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a1c14] via-[#0f1d17] to-[#14171a] shadow-2xl border border-[#44e092]/30">
            <img
              src={offer.image}
              alt={offer.title}
              className="w-full h-64 sm:h-72 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c14] via-[#0a1c14]/35 to-transparent" />

            {/* Top Left: 48h Countdown Badge */}
            <div className="absolute top-3.5 left-3.5 bg-[#05140e]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 text-white border border-[#44e092]/30 shadow-lg">
              <Clock className="w-4 h-4 text-[#44e092]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Valid 48h Once Claimed
              </span>
            </div>

            {/* Top Right: Phase 3 Claim Tracker */}
            <div className="absolute top-3.5 right-3.5 bg-[#05140e]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
              <span className="text-xs font-semibold text-zinc-300">
                {lifetimeClaimCount}/2 Lifetime Claims
              </span>
            </div>

            {/* Merchant Info Pill with Smooth Emerald Gradient */}
            <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between bg-gradient-to-r from-[#071b12]/95 via-[#0b2116]/95 to-[#121b16]/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-[#44e092]/35 shadow-xl">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#004729]/70 border border-[#44e092]/30 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                  {vendor?.logoEmoji || "🍗"}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-bold text-white truncate">{offer.vendorName}</span>
                    <CheckCircle className="w-4 h-4 text-[#44e092] flex-shrink-0" />
                  </div>
                  <span className="text-xs text-zinc-400 truncate mt-0.5">{offer.branch}</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#004729]/60 text-[#44e092] text-xs font-semibold flex-shrink-0 border border-[#44e092]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#44e092] animate-pulse" />
                Open
              </span>
            </div>
          </div>

          {/* KEY TAGS ROW */}
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1">
            {vendor?.tags?.map((tag, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#091b13] to-[#121815] border border-[#44e092]/20 text-zinc-400 text-xs font-medium flex-shrink-0 shadow-sm"
              >
                {tag}
              </span>
            )) || (
              <>
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#091b13] to-[#121815] border border-[#44e092]/20 text-zinc-400 text-xs font-medium flex-shrink-0 shadow-sm">
                  Fast Food & Grills
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#091b13] to-[#121815] border border-[#44e092]/20 text-zinc-400 text-xs font-medium flex-shrink-0 shadow-sm">
                  Dine-in & Takeout
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#091b13] to-[#121815] border border-[#44e092]/20 text-zinc-400 text-xs font-medium flex-shrink-0 shadow-sm">
                  Closes 10:00 PM
                </span>
              </>
            )}
          </div>

          {/* PHASE 3 RULE NOTICES (ACTIVE VOUCHER / LIMIT REACHED) */}
          {hasActiveVoucher && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#004729]/30 border border-[#44e092]/40 flex items-start gap-3.5 text-left shadow-md">
              <Ticket className="w-5 h-5 text-[#44e092] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[#44e092] uppercase tracking-wider">Active Voucher in Wallet</span>
                <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                  You already hold an active, unredeemed voucher for this offer. Per Phase 3 rules, users may hold only 1 active voucher per offer at a time.
                </p>
                <Link
                  to={`/services/meals/voucher/${activeVoucherId || "vch-act-1"}`}
                  className="mt-1.5 text-xs font-bold text-[#44e092] underline hover:text-white inline-flex items-center gap-1"
                >
                  View Active Ticket in Wallet →
                </Link>
              </div>
            </div>
          )}

          {isLimitReached && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#93000a]/20 border border-[#93000a]/40 flex items-start gap-3.5 text-left shadow-md">
              <AlertCircle className="w-5 h-5 text-[#ffb4ab] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[#ffdad6] uppercase tracking-wider">Lifetime Claim Limit Reached</span>
                <p className="text-xs sm:text-[13px] text-[#ffb4ab] leading-relaxed">
                  You have claimed this campaign 2 of 2 times. Under PayWaka Fair Usage policies, each user may claim an offer a maximum of 2 times across the lifetime of the campaign.
                </p>
              </div>
            </div>
          )}

          {/* REWARD ECONOMICS & TRANSPARENCY CARD (SMOOTH EMERALD GRADIENT) */}
          <div className="bg-gradient-to-b from-[#091d14] via-[#0d1e17] to-[#13171a] p-5 sm:p-6 rounded-2xl flex flex-col gap-4 shadow-lg border border-[#44e092]/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 text-left">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold block">
                  Meal Discount Voucher
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#ff6b00] tracking-tight mt-1">
                  {offer.discountDisplay}
                </div>
                <p className="text-xs sm:text-[13px] text-zinc-400 mt-1 leading-snug">
                  {offer.subtitle || "Applies instantly at checkout"}
                </p>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 pt-0.5">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#06180f] to-[#101814] text-white font-extrabold text-sm sm:text-base border border-[#44e092]/25 shadow-sm whitespace-nowrap">
                  <Wallet className="w-4 h-4 text-[#44e092] flex-shrink-0" />
                  <span>{pointsCost} pts</span>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 font-medium whitespace-nowrap tracking-wide">
                  Reward Cost
                </span>
              </div>
            </div>

            {/* Transparency Banner */}
            <div className="bg-gradient-to-r from-[#06180f] via-[#0a1c13] to-[#101814] p-4 sm:p-5 rounded-2xl flex gap-3.5 items-start border border-[#44e092]/25">
              <div className="w-8 h-8 rounded-lg bg-[#004729]/50 border border-[#44e092]/30 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                💡
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white uppercase tracking-wider mb-1 block">
                  How this discount works
                </span>
                <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                  {offer.transparencyText ||
                    `You will receive ${offer.discountDisplay} off your food bill when you spend a minimum of ₦${offer.minSpend?.toLocaleString()} at ${offer.vendorName}. Pay the balance directly to the cashier.`}
                </p>
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-gradient-to-b from-[#071911] to-[#0f1714] p-4 sm:p-5 rounded-2xl flex flex-col gap-1.5 border border-[#44e092]/20 text-left">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Minimum Purchase
                </span>
                <span className="text-base font-bold text-white tracking-tight">
                  ₦{offer.minSpend?.toLocaleString()}
                </span>
              </div>
              <div className="bg-gradient-to-b from-[#071911] to-[#0f1714] p-4 sm:p-5 rounded-2xl flex flex-col gap-1.5 border border-[#44e092]/20 text-left">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Reward Cost
                </span>
                <span className="text-base font-bold text-white tracking-tight">
                  {pointsCost} pts
                </span>
              </div>
              <div className="bg-gradient-to-b from-[#071911] to-[#0f1714] p-4 sm:p-5 rounded-2xl flex flex-col gap-1.5 border border-[#44e092]/20 text-left">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Redemption Window
                </span>
                <span className="text-base font-bold text-white tracking-tight">
                  {offer.validityHours || 48} Hours
                </span>
              </div>
              <div className="bg-gradient-to-b from-[#071911] to-[#0f1714] p-4 sm:p-5 rounded-2xl flex flex-col gap-1.5 border border-[#44e092]/20 text-left">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Merchant Limit
                </span>
                <span className="text-base font-bold text-white tracking-tight">
                  {offer.merchantLimit || "1 per day"}
                </span>
              </div>
            </div>
          </div>

          {/* POINTS BALANCE & DEDUCTION CALCULATOR CARD (SMOOTH EMERALD GRADIENT) */}
          <div className="bg-gradient-to-b from-[#091f15] via-[#0d2118] to-[#13181a] p-5 sm:p-6 rounded-2xl flex flex-col gap-4 shadow-lg border border-[#44e092]/35">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#004729]/50 border border-[#44e092]/40 flex items-center justify-center text-[#44e092]">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">Points Calculation</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  hasEnoughPoints ? "text-[#44e092]" : "text-[#ffb4ab]"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {hasEnoughPoints ? "Sufficient Balance" : "Insufficient Balance"}
              </span>
            </div>

            {/* Math Breakdown */}
            <div className="bg-gradient-to-b from-[#05140d] via-[#081810] to-[#0e1612] p-5 sm:p-6 rounded-2xl flex flex-col gap-3.5 border border-[#44e092]/25 shadow-inner">
              <div className="flex justify-between items-center py-1 text-xs text-zinc-400">
                <span>Current PayWaka Points</span>
                <span className="text-white font-bold text-sm">
                  {pointsBalance.toLocaleString()} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5" />
                  Voucher Cost
                </span>
                <span className="text-white font-bold text-sm">-{pointsCost} pts</span>
              </div>
              <div className="my-1 h-px w-full bg-[#44e092]/20" />
              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-zinc-300">Balance After Claim</span>
                <span className={`text-sm font-bold ${hasEnoughPoints ? "text-[#44e092]" : "text-white"}`}>
                  {balanceAfter.toLocaleString()} pts
                </span>
              </div>
            </div>
          </div>

          {/* INTERACTIVE TERMS & REDEMPTION ACCORDION (SMOOTH EMERALD GRADIENT) */}
          <div className="bg-gradient-to-b from-[#0a1e15] via-[#0e1f18] to-[#14171a] rounded-2xl p-5 sm:p-6 flex flex-col gap-3.5 border border-[#44e092]/30 shadow-lg">
            <button
              type="button"
              onClick={() => setIsTermsOpen(!isTermsOpen)}
              className="w-full flex items-center justify-between text-left py-0.5 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#004729]/50 border border-[#44e092]/30 flex items-center justify-center text-[#44e092]">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-zinc-200 transition-colors">
                  Terms & Redemption Steps
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#1a1c20] flex items-center justify-center text-zinc-400">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isTermsOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isTermsOpen && (
              <div className="pt-3.5 mt-1 border-t border-[#44e092]/20 flex flex-col gap-3">
                <div className="bg-gradient-to-b from-[#071911] to-[#0e1613] rounded-xl p-4 sm:p-5 border border-[#44e092]/20 flex flex-col gap-3.5">
                  {offer.terms?.map((term, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs sm:text-[13px] leading-relaxed text-left">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#44e092] mt-2 flex-shrink-0" />
                      <span className="text-zinc-300">{term}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STORE LOCATION CARD (SMOOTH EMERALD GRADIENT) */}
          <div className="bg-gradient-to-r from-[#091d14] via-[#0d1e17] to-[#14171a] rounded-2xl p-4 sm:p-5 flex items-center justify-between border border-[#44e092]/30 shadow-lg">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#004729]/50 border border-[#44e092]/30 flex items-center justify-center text-[#44e092] flex-shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-sm sm:text-base font-bold text-white truncate">{vendor?.name || offer.vendorName}</span>
                <span className="text-xs text-zinc-400 truncate mt-0.5">{vendor?.address || offer.branch}</span>
              </div>
            </div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(vendor?.address || offer.vendorName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full bg-[#004729]/60 hover:bg-[#004729]/90 text-[#44e092] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#44e092]/30 flex-shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Map</span>
            </a>
          </div>
        </div>

        {/* FIXED STICKY BOTTOM ACTION DOCK (CENTRALIZED RELATIVE TO DESKTOP CONTENT) */}
        <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 z-40 bg-[#0c0e12]/95 backdrop-blur-xl px-4 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.7)] border-t border-[#282a2e]">
          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2">
            {isLimitReached ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#282a2e] text-zinc-500 cursor-not-allowed border border-[#333539] whitespace-nowrap"
              >
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Lifetime Claim Limit Reached ({lifetimeClaimCount}/2)</span>
              </button>
            ) : hasActiveVoucher ? (
              <button
                type="button"
                onClick={() => navigate(`/services/meals/voucher/${activeVoucherId || "vch-act-1"}`)}
                className="w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#004729] hover:bg-[#00522f] text-[#44e092] border border-[#44e092]/40 shadow-[0_4px_16px_rgba(68,224,146,0.3)] transition-all whitespace-nowrap"
              >
                <Ticket className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="whitespace-nowrap">View Active Voucher Ticket</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasEnoughPoints}
                onClick={handleOpenPinModal}
                className={`w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                  hasEnoughPoints
                    ? "bg-[#ff6b00] hover:bg-[#ff7a1a] text-white shadow-[0_8px_24px_rgba(255,107,0,0.35)] active:scale-[0.98]"
                    : "bg-[#282a2e] text-zinc-500 cursor-not-allowed"
                }`}
              >
                <Redo2 className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {hasEnoughPoints
                    ? `Confirm & Redeem (${pointsCost} pts)`
                    : `Need ${pointsCost - pointsBalance} More Points`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/services/meals")}
              className="w-full text-center py-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Cancel & Return to Marketplace
            </button>
          </div>
        </div>

        {/* PHASE 4: SECURE TRANSACTION PIN AUTHORIZATION MODAL */}
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-gradient-to-b from-[#091d14] via-[#0d1e17] to-[#13171a] border border-[#44e092]/35 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-[#004729] text-[#44e092] border border-[#44e092]/40 flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#44e092] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Secure PIN Authorization
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  Authorize Voucher Claim
                </h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Enter your 4-digit PayWaka transaction PIN to authorize debiting <strong className="text-white">{pointsCost} pts</strong>.
                </p>
              </div>

              {/* Economic Summary */}
              <div className="bg-gradient-to-b from-[#05140d] to-[#0d1511] p-3.5 rounded-2xl border border-[#44e092]/25 text-left text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Offer / Vendor</span>
                  <span className="font-bold text-white truncate max-w-[200px]">{offer.discountDisplay} • {offer.vendorName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Reward Cost</span>
                  <span className="font-bold text-[#ff6b00]">-{pointsCost} pts</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#44e092]/20 pt-2">
                  <span className="text-zinc-400">Balance After Claim</span>
                  <span className="font-bold text-[#44e092]">{balanceAfter.toLocaleString()} pts</span>
                </div>
              </div>

              {/* Error Message */}
              {pinError && (
                <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-destructive/15 border border-destructive/30 text-[#ffb4ab] text-left animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{pinError}</span>
                </div>
              )}

              {/* 4-digit PIN Inputs */}
              <div className="space-y-3 py-1">
                <div className="flex justify-center items-center gap-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={`pin-digit-${idx}`}
                      ref={pinInputRefs[idx]}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      disabled={isRedeeming}
                      value={pinDigits[idx]}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className={`w-13 sm:w-14 h-14 sm:h-16 text-center text-2xl font-black rounded-2xl bg-[#06140d] border-2 transition-all duration-150 focus:outline-none ${
                        pinDigits[idx]
                          ? "border-[#44e092] bg-[#004729]/30 text-white shadow-[0_0_12px_rgba(68,224,146,0.3)]"
                          : "border-[#44e092]/30 text-white focus:border-[#44e092] focus:bg-[#004729]/20"
                      } disabled:opacity-50`}
                    />
                  ))}
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors py-1"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? "Hide PIN" : "Show PIN"}</span>
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={isRedeeming || pinDigits.join("").length !== 4}
                  onClick={() => handleExecuteRedemption()}
                  className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    pinDigits.join("").length === 4 && !isRedeeming
                      ? "bg-[#ff6b00] hover:bg-[#ff7a1a] text-white shadow-[0_4px_20px_rgba(255,107,0,0.4)] active:scale-[0.98]"
                      : "bg-[#282a2e] text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  {isRedeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing & Deducting Points...</span>
                    </>
                  ) : (
                    <span>Authorize & Redeem Voucher</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isRedeeming}
                  onClick={() => {
                    setShowPinModal(false);
                    setPinDigits(["", "", "", ""]);
                    setPinError("");
                  }}
                  className="w-full py-2.5 rounded-full bg-[#1e2024] hover:bg-[#282a2e] text-zinc-300 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

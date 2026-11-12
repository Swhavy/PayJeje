import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
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
  AlertTriangle,
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
import {
  resolveOfferAvailability,
  validatePublicOfferTerms,
  validateOfferIdentity,
  resolveBundledMealImage,
} from "@/lib/mealOfferUtils";
import { getVendorById } from "@/fixtures/mealFixtures";

export default function MealCouponDetailPage() {
  const { couponId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user) || {};
  const currentUid = user?.uid || auth.currentUser?.uid;

  const { redeemMealCoupon } = useCloudfunc();

  // Real-time Firestore Offer State & Invariant Checks
  const [offerDocSnap, setOfferDocSnap] = useState(null);
  const [offerLoading, setOfferLoading] = useState(true);
  const [offerError, setOfferError] = useState(null); // null | "OFFER_NOT_FOUND" | "IDENTITY_INVALID" | "TERMS_INVALID" | "FETCH_ERROR"
  const [identityResult, setIdentityResult] = useState(null);
  const [termsResult, setTermsResult] = useState(null);
  const [availabilityResult, setAvailabilityResult] = useState(null);

  const [livePoints, setLivePoints] = useState(null);
  const [liveClaim, setLiveClaim] = useState(null);
  const [liveVendorDoc, setLiveVendorDoc] = useState(null);
  const [activeVoucherLiveStatus, setActiveVoucherLiveStatus] = useState(null);
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

  // 1. Authoritative real-time public offer projection subscription
  useEffect(() => {
    if (!couponId) {
      setOfferLoading(false);
      setOfferError("OFFER_NOT_FOUND");
      return;
    }

    setOfferLoading(true);
    setOfferError(null);

    const unsub = onSnapshot(
      doc(db, "public_meal_offers", couponId),
      (snap) => {
        setOfferLoading(false);
        if (!snap.exists()) {
          setOfferDocSnap(null);
          setOfferError("OFFER_NOT_FOUND");
          return;
        }

        setOfferDocSnap(snap);

        // Strict Identity Validation (snap.id === campaignId, explicit offerId, zero fallback)
        const ident = validateOfferIdentity(snap, couponId);
        setIdentityResult(ident);
        if (!ident.isValid) {
          console.warn("[MealCouponDetail] Identity invariant violation:", ident.reason, ident.message);
          setOfferError("IDENTITY_INVALID");
          return;
        }

        // Strict Commercial Terms Validation (no default amounts invented)
        const data = snap.data();
        const terms = validatePublicOfferTerms(data);
        setTermsResult(terms);
        if (!terms.isValid) {
          console.warn("[MealCouponDetail] Commercial terms validation failed:", terms.reason);
          setOfferError("TERMS_INVALID");
          return;
        }

        // Fail-Closed Availability Resolution
        const avail = resolveOfferAvailability(data);
        setAvailabilityResult(avail);
      },
      (err) => {
        console.error("[MealCouponDetail] Error fetching public offer:", err);
        setOfferLoading(false);
        setOfferError("FETCH_ERROR");
      }
    );

    return () => unsub();
  }, [couponId]);

  // 2. Authoritative real-time points subscription
  useEffect(() => {
    if (!currentUid) return;

    const unsubUser = onSnapshot(
      doc(db, "users", currentUid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.points === "number") {
            setLivePoints(data.points);
          }
        }
      },
      (err) => {
        console.warn("[MealCouponDetail] Points listener error:", err);
      }
    );

    return () => unsubUser();
  }, [currentUid]);

  // 3. Authoritative customer meal claim subscription for this specific canonical offer
  useEffect(() => {
    if (!currentUid || !identityResult?.isValid || !identityResult.canonicalOfferId) {
      setLiveClaim(null);
      return;
    }

    const unsubClaim = onSnapshot(
      doc(db, "users", currentUid, "mealClaims", identityResult.canonicalOfferId),
      (snap) => {
        if (snap.exists()) {
          setLiveClaim(snap.data());
        } else {
          setLiveClaim(null);
        }
      },
      (err) => {
        console.warn("[MealCouponDetail] Claim subscription error:", err);
      }
    );

    return () => unsubClaim();
  }, [currentUid, identityResult?.canonicalOfferId]);

  // 4. Authoritative merchant store profile subscription for live logo & metadata
  const rawOfferVendorId = offerDocSnap?.data()?.vendorId || null;
  useEffect(() => {
    if (!rawOfferVendorId) {
      setLiveVendorDoc(null);
      return;
    }

    const unsubVendor = onSnapshot(
      doc(db, "meal_vendors", rawOfferVendorId),
      (snap) => {
        if (snap.exists()) {
          setLiveVendorDoc({ id: snap.id, ...snap.data() });
        } else {
          setLiveVendorDoc(null);
        }
      },
      (err) => {
        console.warn("[MealCouponDetail] Vendor profile notice:", err.message);
      }
    );

    return () => unsubVendor();
  }, [rawOfferVendorId]);

  // 3b. Cross-verify activeVoucherId status in meal_vouchers so already-redeemed vouchers never block a 2nd claim
  useEffect(() => {
    const vId = liveClaim?.activeVoucherId;
    if (!currentUid || !vId) {
      setActiveVoucherLiveStatus(null);
      return;
    }

    const unsubVoucher = onSnapshot(
      doc(db, "meal_vouchers", vId),
      (snap) => {
        if (snap.exists()) {
          const vData = snap.data();
          const isRedeemed =
            vData.status === "redeemed" ||
            vData.status === "used" ||
            Boolean(vData.redeemedAt) ||
            Boolean(vData.redemptionId);
          setActiveVoucherLiveStatus(isRedeemed ? "redeemed" : vData.status || "active");
        } else {
          setActiveVoucherLiveStatus("missing");
        }
      },
      () => {
        setActiveVoucherLiveStatus(null);
      }
    );

    return () => unsubVoucher();
  }, [currentUid, liveClaim?.activeVoucherId]);

  const pointsBalance = typeof livePoints === "number"
    ? livePoints
    : typeof user?.points === "number"
      ? user.points
      : 0;

  const pointsCost = termsResult?.pointsCost || 100;
  const balanceAfter = Math.max(0, pointsBalance - pointsCost);
  const hasEnoughPoints = pointsBalance >= pointsCost;

  // Authoritative claim stats
  const lifetimeClaimCount = Number(liveClaim?.lifetimeClaimCount || 0);
  const isLimitReached = lifetimeClaimCount >= 2;

  let hasActiveVoucher = false;
  let activeVoucherId = null;

  if (liveClaim?.activeVoucherId) {
    const activeExpiresAtMs = liveClaim.activeVoucherExpiresAt?.toMillis
      ? liveClaim.activeVoucherExpiresAt.toMillis()
      : liveClaim.activeVoucherExpiresAt?.toDate
        ? liveClaim.activeVoucherExpiresAt.toDate().getTime()
        : liveClaim.activeVoucherExpiresAt
          ? new Date(liveClaim.activeVoucherExpiresAt).getTime()
          : 0;

    const isStillActiveInVault = !activeVoucherLiveStatus || activeVoucherLiveStatus === "active";
    if (Date.now() < activeExpiresAtMs && isStillActiveInVault) {
      hasActiveVoucher = true;
      activeVoucherId = liveClaim.activeVoucherId;
    }
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
    if (!identityResult?.isValid || !identityResult.canonicalCampaignId) {
      setPinError("Invalid offer identity. Cannot claim.");
      return;
    }

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
        claimIdempotencyRef.current = `claim_${currentUid || "guest"}_${identityResult.canonicalCampaignId}_${Date.now()}`;
      }
      const idempotencyKey = claimIdempotencyRef.current;

      // Always pass canonical campaignId (docSnap.id) to claim callable
      const res = await redeemMealCoupon({
        couponId: identityResult.canonicalCampaignId,
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
    if (!identityResult?.isValid) return;
    claimIdempotencyRef.current = `claim_${currentUid || "guest"}_${identityResult.canonicalCampaignId}_${Date.now()}`;
    pinValuesRef.current = ["", "", "", ""];
    setPinDigits(["", "", "", ""]);
    setPinError("");
    setIsRedeeming(false);
    setShowPinModal(true);
    setTimeout(() => pinInputRefs[0]?.current?.focus(), 200);
  };

  // State: Loading
  if (offerLoading) {
    return (
      <DashboardLayout>
        <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-32 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-6 lg:p-12 shadow-2xl flex flex-col items-center justify-center min-h-[500px] text-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#44e092] border-t-transparent animate-spin" />
          <span className="text-zinc-400 text-sm font-medium">Verifying offer terms and platform security...</span>
        </div>
      </DashboardLayout>
    );
  }

  // State: 404 Offer Not Found (Strict: Zero fallback to demo fixtures)
  if (offerError === "OFFER_NOT_FOUND" || !offerDocSnap) {
    return (
      <DashboardLayout>
        <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-32 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-6 lg:p-12 shadow-2xl flex flex-col items-center justify-center min-h-[500px] text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1c20] text-zinc-400 flex items-center justify-center border border-zinc-700 shadow-lg">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Offer Not Found</h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-md leading-relaxed">
            The meal offer you requested could not be located in the PayWaka marketplace. It may have expired, been concluded, or does not exist.
          </p>
          <button
            type="button"
            onClick={() => navigate("/services/meals")}
            className="mt-2 px-6 py-3 rounded-full bg-[#ff6b00] hover:bg-[#ff7a1a] text-white font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(255,107,0,0.35)] transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Meal Marketplace</span>
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // State: Identity or Commercial Terms Configuration Error (Fails closed)
  if (offerError === "IDENTITY_INVALID" || offerError === "TERMS_INVALID") {
    return (
      <DashboardLayout>
        <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-32 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-6 lg:p-12 shadow-2xl flex flex-col items-center justify-center min-h-[500px] text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2a0d13] text-[#ff8093] flex items-center justify-center border border-[#ff4d6d]/40 shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Offer Configuration Error</h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-md leading-relaxed">
            This meal offer has an inconsistent or unverified configuration and cannot be claimed. Platform security checks prevented loading this offer.
          </p>
          <button
            type="button"
            onClick={() => navigate("/services/meals")}
            className="mt-2 px-6 py-3 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] text-zinc-300 font-bold text-xs sm:text-sm border border-zinc-700 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Meal Marketplace</span>
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Construct verified offer object
  const rawData = offerDocSnap.data();
  const offerImage = rawData.image || resolveBundledMealImage(rawData.category, rawData.title, rawData.vendorName);
  const fixtureVendor = getVendorById(rawData.vendorId);
  const vendor = liveVendorDoc || fixtureVendor;
  const resolvedVendorLogoUrl = liveVendorDoc?.logoUrl || rawData.vendorLogoUrl || fixtureVendor?.logoUrl || null;
  const resolvedVendorLogoEmoji = liveVendorDoc?.logoEmoji || rawData.vendorLogoEmoji || fixtureVendor?.logoEmoji || "🍗";

  const offer = {
    id: offerDocSnap.id,
    campaignId: identityResult.canonicalCampaignId,
    offerId: identityResult.canonicalOfferId,
    title: rawData.title,
    vendorId: rawData.vendorId,
    vendorName: rawData.vendorName,
    vendorLogoUrl: resolvedVendorLogoUrl,
    vendorLogoEmoji: resolvedVendorLogoEmoji,
    branch: rawData.branch || "Main Branch",
    category: rawData.category || "Local Delicacies",
    discountNaira: termsResult.discountNaira,
    minSpendNaira: termsResult.minSpendNaira,
    pointsCost: termsResult.pointsCost,
    discountDisplay: termsResult.discountDisplay,
    minSpend: termsResult.minSpendNaira,
    image: offerImage,
    status: rawData.status,
    isAvailable: rawData.isAvailable,
    validityHours: rawData.validityHours || 48,
    merchantLimit: rawData.merchantLimit || "1 per customer per visit",
    transparencyText: rawData.transparencyText || `Enjoy ₦${termsResult.discountNaira.toLocaleString()} off when you spend ₦${termsResult.minSpendNaira.toLocaleString()} or more at ${rawData.vendorName}. Pay the balance directly to cashier.`,
    terms: Array.isArray(rawData.terms) && rawData.terms.length > 0
      ? rawData.terms
      : [
        `Valid for ₦${termsResult.discountNaira.toLocaleString()} instant discount on total meal bill.`,
        `Minimum spend of ₦${termsResult.minSpendNaira.toLocaleString()} required.`,
        "Voucher expires 48 hours after issuance from PayWaka Points.",
        "Must present 4-digit voucher PIN or QR code to cashier before payment.",
        "Limit of 1 active voucher per customer for this offer at a time.",
      ],
  };

  const isEmergencyHalt = rawData.status === "emergency_halt";

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
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${isBookmarked
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

          {/* EMERGENCY HALT PLATFORM BANNER */}
          {isEmergencyHalt && (
            <div className="p-4 rounded-2xl bg-[#2a0d13]/85 border border-[#ff4d6d]/50 flex items-start gap-3.5 text-left shadow-lg">
              <AlertTriangle className="w-5 h-5 text-[#ff8093] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#ff8093] uppercase tracking-wider">
                  Administrative Hold Notice
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  This campaign is currently temporarily halted by platform administration.
                  {hasActiveVoucher
                    ? " Your existing voucher is safe in your wallet, but in-store cashier redemption is temporarily blocked until the hold is lifted."
                    : " New voucher claims are temporarily paused."}
                </p>
              </div>
            </div>
          )}

          {/* HERO VISUAL MODULE */}
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

            {/* Top Right: Lifetime Claims Tracker */}
            <div className="absolute top-3.5 right-3.5 bg-[#05140e]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
              <span className="text-xs font-semibold text-zinc-300">
                {lifetimeClaimCount}/2 Lifetime Claims
              </span>
            </div>

            {/* Merchant Info Pill */}
            <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between bg-gradient-to-r from-[#071b12]/95 via-[#0b2116]/95 to-[#121b16]/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-[#44e092]/35 shadow-xl">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#004729]/70 border border-[#44e092]/30 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner overflow-hidden">
                  {offer.vendorLogoUrl ? (
                    <img
                      src={offer.vendorLogoUrl}
                      alt={offer.vendorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{offer.vendorLogoEmoji}</span>
                  )}
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
                {availabilityResult?.badgeLabel || "Available"}
              </span>
            </div>
          </div>

          {/* KEY TAGS ROW */}
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1">
            <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#091b13] to-[#121815] border border-[#44e092]/20 text-zinc-300 text-xs font-medium flex-shrink-0 shadow-sm">
              {offer.category}
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#091b13] to-[#121815] border border-[#44e092]/20 text-zinc-300 text-xs font-medium flex-shrink-0 shadow-sm">
              Instant Voucher
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#091b13] to-[#121815] border border-[#44e092]/20 text-zinc-300 text-xs font-medium flex-shrink-0 shadow-sm">
              Closes 10:00 PM
            </span>
          </div>

          {/* ACTIVE VOUCHER NOTICE */}
          {hasActiveVoucher && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#004729]/30 border border-[#44e092]/40 flex items-start gap-3.5 text-left shadow-md">
              <Ticket className="w-5 h-5 text-[#44e092] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[#44e092] uppercase tracking-wider">
                  Active Voucher in Wallet
                </span>
                <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                  You already hold an active unredeemed voucher for this offer. Per platform rules, you may hold 1 active voucher per offer at a time.
                </p>
                <Link
                  to={`/services/meals/voucher/${activeVoucherId}`}
                  className="mt-1.5 text-xs font-bold text-[#44e092] underline hover:text-white inline-flex items-center gap-1"
                >
                  View Active Ticket in Wallet →
                </Link>
              </div>
            </div>
          )}

          {/* LIFETIME CLAIM LIMIT NOTICE */}
          {isLimitReached && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#93000a]/20 border border-[#93000a]/40 flex items-start gap-3.5 text-left shadow-md">
              <AlertCircle className="w-5 h-5 text-[#ffb4ab] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[#ffdad6] uppercase tracking-wider">
                  Lifetime Claim Limit Reached
                </span>
                <p className="text-xs sm:text-[13px] text-[#ffb4ab] leading-relaxed">
                  You have claimed this campaign 2 of 2 times. Under PayWaka Fair Usage policies, each user may claim an offer a maximum of 2 times across the lifetime of the campaign.
                </p>
              </div>
            </div>
          )}

          {/* REWARD ECONOMICS & TRANSPARENCY CARD */}
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
                  Applies instantly at merchant checkout
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
                  {offer.transparencyText}
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
                  {offer.validityHours} Hours
                </span>
              </div>
              <div className="bg-gradient-to-b from-[#071911] to-[#0f1714] p-4 sm:p-5 rounded-2xl flex flex-col gap-1.5 border border-[#44e092]/20 text-left">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Merchant Limit
                </span>
                <span className="text-base font-bold text-white tracking-tight">
                  {offer.merchantLimit}
                </span>
              </div>
            </div>
          </div>

          {/* POINTS BALANCE & DEDUCTION CALCULATOR CARD */}
          <div className="bg-gradient-to-b from-[#091f15] via-[#0d2118] to-[#13181a] p-5 sm:p-6 rounded-2xl flex flex-col gap-4 shadow-lg border border-[#44e092]/35">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#004729]/50 border border-[#44e092]/40 flex items-center justify-center text-[#44e092]">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">Points Calculation</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${hasEnoughPoints ? "text-[#44e092]" : "text-[#ffb4ab]"
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

          {/* INTERACTIVE TERMS & REDEMPTION ACCORDION */}
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
                  className={`w-4 h-4 transition-transform duration-200 ${isTermsOpen ? "rotate-180" : ""
                    }`}
                />
              </div>
            </button>

            {isTermsOpen && (
              <div className="pt-3.5 mt-1 border-t border-[#44e092]/20 flex flex-col gap-3">
                <div className="bg-gradient-to-b from-[#071911] to-[#0e1613] rounded-xl p-4 sm:p-5 border border-[#44e092]/20 flex flex-col gap-3.5">
                  {offer.terms.map((term, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs sm:text-[13px] leading-relaxed text-left">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#44e092] mt-2 flex-shrink-0" />
                      <span className="text-zinc-300">{term}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STORE LOCATION CARD */}
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

        {/* FIXED STICKY BOTTOM ACTION DOCK */}
        <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 z-40 bg-[#0c0e12]/95 backdrop-blur-xl px-4 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.7)] border-t border-[#282a2e]">
          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2">
            {hasActiveVoucher ? (
              <button
                type="button"
                onClick={() => navigate(`/services/meals/voucher/${activeVoucherId}`)}
                className="w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#004729] hover:bg-[#00522f] text-[#44e092] border border-[#44e092]/40 shadow-[0_4px_16px_rgba(68,224,146,0.3)] transition-all whitespace-nowrap"
              >
                <Ticket className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="whitespace-nowrap">View Active Voucher Ticket</span>
              </button>
            ) : isLimitReached ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#282a2e] text-zinc-500 cursor-not-allowed border border-[#333539] whitespace-nowrap"
              >
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Lifetime Claim Limit Reached ({lifetimeClaimCount}/2)</span>
              </button>
            ) : !availabilityResult?.isActionable ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#1f2125] text-zinc-400 cursor-not-allowed border border-zinc-700 whitespace-nowrap"
              >
                <span className="whitespace-nowrap">{availabilityResult?.buttonText}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasEnoughPoints}
                onClick={handleOpenPinModal}
                className={`w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${hasEnoughPoints
                    ? "bg-[#ff6b00] hover:bg-[#ff7a1a] text-white shadow-[0_8px_24px_rgba(255,107,0,0.35)] active:scale-[0.98]"
                    : "bg-[#282a2e] text-zinc-500 cursor-not-allowed border border-[#333539]"
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
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Min. Spend</span>
                  <span className="text-white font-medium">₦{offer.minSpend?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#44e092]/20 pt-2">
                  <span className="text-zinc-300 font-semibold">Remaining Points</span>
                  <span className="font-bold text-[#44e092]">{balanceAfter.toLocaleString()} pts</span>
                </div>
              </div>

              {/* 4-Digit PIN Input Fields */}
              <div className="flex justify-center gap-3 my-2" onPaste={handlePaste}>
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={pinInputRefs[idx]}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={isRedeeming}
                    className="w-12 h-14 text-center text-2xl font-bold bg-[#05140e] border border-[#44e092]/40 rounded-xl text-white focus:outline-none focus:border-[#44e092] focus:ring-2 focus:ring-[#44e092]/30 transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              {/* PIN Visibility Toggle */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? "Hide PIN" : "Show PIN"}</span>
                </button>
              </div>

              {/* PIN Error Message */}
              {pinError && (
                <div className="p-2.5 rounded-xl bg-[#2a0d13] border border-[#ff4d6d]/40 text-[#ff8093] text-xs leading-relaxed flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#ff4d6d]" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isRedeeming || pinDigits.join("").length !== 4}
                  onClick={() => handleExecuteRedemption()}
                  className={`w-full py-3.5 px-6 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all ${!isRedeeming && pinDigits.join("").length === 4
                      ? "bg-[#ff6b00] hover:bg-[#ff7a1a] text-white shadow-[0_4px_16px_rgba(255,107,0,0.4)] active:scale-[0.98]"
                      : "bg-[#282a2e] text-zinc-500 cursor-not-allowed"
                    }`}
                >
                  {isRedeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing & Debiting Points...</span>
                    </>
                  ) : (
                    <span>Confirm & Authorize</span>
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
                  className="w-full py-2 text-xs text-zinc-400 hover:text-white transition-colors"
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

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Ticket,
  Search,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  QrCode,
  Receipt,
  Utensils,
  Store,
  Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import MealFloatingNav from "@/components/meals/MealFloatingNav";
import { db, auth, collection, query, where, onSnapshot } from "@/firebaseConfig";
import { resolveBundledMealImage } from "@/lib/mealOfferUtils";
import { getMealOfferById, getVendorById } from "@/fixtures/mealFixtures";

export default function MyMealVouchersPage() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user);
  const currentUid = user?.uid || auth.currentUser?.uid;

  const [vouchers, setVouchers] = useState([]);
  const [publicOffersMap, setPublicOffersMap] = useState({});
  const [vendorsMap, setVendorsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [activeTab, setActiveTab] = useState("active"); // "active" | "used" | "expired"
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterChip, setActiveFilterChip] = useState("all");
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Real-time subscription to public_meal_offers and meal_vendors so campaign images & store logos resolve live
  useEffect(() => {
    const unsubOffers = onSnapshot(
      collection(db, "public_meal_offers"),
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          const oData = d.data();
          map[d.id] = oData;
          if (oData.offerId) map[oData.offerId] = oData;
          if (oData.campaignId) map[oData.campaignId] = oData;
        });
        setPublicOffersMap(map);
      },
      () => {}
    );
    const unsubVendors = onSnapshot(
      collection(db, "meal_vendors"),
      (snap) => {
        const vMap = {};
        snap.docs.forEach((d) => {
          vMap[d.id] = d.data();
        });
        setVendorsMap(vMap);
      },
      () => {}
    );
    return () => {
      unsubOffers();
      unsubVendors();
    };
  }, []);

  // Real-time subscription to authenticated user's meal vouchers in Firestore
  useEffect(() => {
    let unsubSnapshot = null;

    const setupSubscription = (uid) => {
      if (!uid) {
        setVouchers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      // Enforce user isolation: query specifically for authenticated user's records.
      // Firestore security rules (match /meal_vouchers/{voucherId}) verify resource.data.userId == request.auth.uid
      const q = query(
        collection(db, "meal_vouchers"),
        where("userId", "==", uid)
      );

      unsubSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const nowMs = Date.now();
          const list = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const offerMeta = getMealOfferById(data.offerId);
            const vendorMeta = getVendorById(data.vendorId);
            const liveOffer =
              publicOffersMap[data.campaignId] ||
              publicOffersMap[data.offerId] ||
              null;

            const discountNaira = Number.isFinite(Number(data.discountNaira))
              ? Number(data.discountNaira)
              : Number.isFinite(Number(offerMeta?.discountAmount))
              ? Number(offerMeta.discountAmount)
              : 0;
            const minSpendNaira = Number.isFinite(Number(data.minSpendNaira))
              ? Number(data.minSpendNaira)
              : Number.isFinite(Number(offerMeta?.minSpend))
              ? Number(offerMeta.minSpend)
              : 0;
            const discountDisplay = discountNaira > 0 ? `₦${discountNaira.toLocaleString()} OFF` : "Discount";

            const expiresMs = data.expiresAt?.toMillis
              ? data.expiresAt.toMillis()
              : data.expiresAt?.toDate
              ? data.expiresAt.toDate().getTime()
              : new Date(data.expiresAt || 0).getTime();

            const isRedeemedOrUsed =
              data.status === "redeemed" ||
              data.status === "used" ||
              Boolean(data.redeemedAt) ||
              Boolean(data.redemptionId);
            const isPastExpiry = !isRedeemedOrUsed && expiresMs > 0 && expiresMs < nowMs;
            const effectiveStatus = isRedeemedOrUsed
              ? "used"
              : data.status === "expired" || isPastExpiry
              ? "expired"
              : "active";

            const hoursRemaining = expiresMs > nowMs ? Math.max(0, Math.round((expiresMs - nowMs) / (3600 * 1000))) : 0;
            const timeText = hoursRemaining > 0 ? `${hoursRemaining}h left` : "Expiring soon";

            const issuedMs = data.issuedAt?.toMillis
              ? data.issuedAt.toMillis()
              : data.issuedAt?.toDate
              ? data.issuedAt.toDate().getTime()
              : data.createdAt?.toMillis
              ? data.createdAt.toMillis()
              : 0;

            const resolvedCategory =
              data.category ||
              liveOffer?.category ||
              offerMeta?.category ||
              vendorMeta?.category ||
              "Local Delicacies";

            const resolvedTitle =
              data.title ||
              liveOffer?.title ||
              offerMeta?.title ||
              (data.vendorName ? `${data.vendorName} Meal Voucher` : "Meal Discount Voucher");

            const voucherImage =
              data.image ||
              liveOffer?.image ||
              offerMeta?.image ||
              resolveBundledMealImage(
                resolvedCategory,
                resolvedTitle,
                data.vendorName || vendorMeta?.name
              );

            return {
              id: docSnap.id,
              campaignId: data.campaignId,
              offerId: data.offerId,
              vendorId: data.vendorId || offerMeta?.vendorId,
              vendorName: data.vendorName || liveOffer?.vendorName || vendorMeta?.name || offerMeta?.vendorName || "PayWaka Partner Food",
              vendorBranch: data.redeemedVendorBranch || liveOffer?.branch || vendorMeta?.branch || offerMeta?.branch || "Main Branch",
              vendorLogoUrl: data.vendorLogoUrl || liveOffer?.vendorLogoUrl || vendorMeta?.logoUrl || null,
              vendorLogoEmoji: data.vendorLogoEmoji || liveOffer?.vendorLogoEmoji || vendorMeta?.logoEmoji || "🍗",
              title: resolvedTitle,
              discountAmount: discountNaira,
              discountDisplay,
              minSpend: minSpendNaira,
              code: data.voucherCode || data.code || docSnap.id,
              pin: data.voucherPin || "",
              status: effectiveStatus,
              rawStatus: data.status,
              category: resolvedCategory,
              image: voucherImage,
              timeText,
              hoursRemaining,
              expiresAt: data.expiresAt,
              redeemedAt: data.redeemedAt,
              issuedMs,
            };
          });

          // Sort by issue timestamp descending (newest claimed vouchers first)
          list.sort((a, b) => (b.issuedMs || 0) - (a.issuedMs || 0));

          setVouchers(list);
          setLoading(false);
        },
        (err) => {
          console.error("Error subscribing to user meal vouchers:", err);
          setFetchError("Unable to load meal vouchers from vault. Please try again.");
          setLoading(false);
        }
      );
    };

    if (currentUid) {
      setupSubscription(currentUid);
    } else {
      const unsubAuth = auth.onAuthStateChanged((fbUser) => {
        if (fbUser?.uid) {
          setupSubscription(fbUser.uid);
        } else {
          setVouchers([]);
          setLoading(false);
        }
      });
      return () => {
        unsubAuth();
        if (unsubSnapshot) unsubSnapshot();
      };
    }

    return () => {
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [currentUid]);

  const enrichVoucher = (v) => {
    const liveOffer = publicOffersMap[v.campaignId] || publicOffersMap[v.offerId];
    const liveVendor = vendorsMap[v.vendorId];
    const fixtureVendor = getVendorById(v.vendorId);
    const resolvedImage =
      liveOffer?.image && v.image !== liveOffer.image && (!v.image || v.image.startsWith("/images/meals/"))
        ? liveOffer.image
        : v.image;
    const resolvedVendorLogoUrl =
      liveVendor?.logoUrl || v.vendorLogoUrl || liveOffer?.vendorLogoUrl || fixtureVendor?.logoUrl || null;
    const resolvedVendorLogoEmoji =
      liveVendor?.logoEmoji || v.vendorLogoEmoji || liveOffer?.vendorLogoEmoji || fixtureVendor?.logoEmoji || "🍗";
    return {
      ...v,
      image: resolvedImage,
      vendorLogoUrl: resolvedVendorLogoUrl,
      vendorLogoEmoji: resolvedVendorLogoEmoji,
    };
  };

  const enrichedVouchers = vouchers.map(enrichVoucher);
  const activeList = enrichedVouchers.filter((v) => v.status === "active");
  const usedList = enrichedVouchers.filter((v) => v.status === "used" || v.status === "redeemed");
  const expiredList = enrichedVouchers.filter((v) => v.status === "expired");

  const currentList =
    activeTab === "active"
      ? activeList
      : activeTab === "used"
      ? usedList
      : expiredList;

  const filteredList = currentList.filter((voucher) => {
    const matchesSearch =
      (voucher.vendorName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (voucher.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (voucher.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (voucher.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilterChip === "expiring-soon") {
      return (voucher.hoursRemaining || 999) <= 24;
    }
    if (activeFilterChip === "high-value") {
      return (voucher.discountAmount || 0) >= 1000;
    }
    if (activeFilterChip === "fast-food") {
      return voucher.category === "Fast Food";
    }
    if (activeFilterChip === "bakery") {
      return voucher.category === "Desserts";
    }
    return true;
  });

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-16 sm:pb-20 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* TOP STATUS BAR ROW & IN-FLOW SUB-NAVIGATION */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282a2e]/70">
            <div className="flex items-center gap-3">
              <Link
                to="/services/meals"
                className="w-10 h-10 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] flex items-center justify-center text-[#e2e2e8] transition-colors flex-shrink-0"
                aria-label="Back to marketplace"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#44e092] flex items-center gap-1.5 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#44e092] shadow-[0_0_8px_rgba(68,224,146,0.8)]" />
                  PayWaka Rewards Vault
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                  My Vouchers
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <MealFloatingNav className="w-full sm:w-auto" />
            </div>
          </div>

          {/* UNIFIED STATUS FILTER TABS (SMOOTH EMERALD GRADIENT) */}
          <div className="flex items-center p-1.5 bg-gradient-to-r from-[#071911] via-[#0b1e15] to-[#111815] rounded-full border border-[#44e092]/30 gap-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "active"
                  ? "bg-[#004729] text-[#44e092] border border-[#44e092]/30 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Active</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  activeTab === "active" ? "bg-[#002110] text-[#44e092]" : "bg-[#282a2e] text-zinc-300"
                }`}
              >
                {activeList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("used")}
              className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "used"
                  ? "bg-[#282a2e] text-white border border-[#383a40] shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Redeemed</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "used" ? "bg-[#16181d] text-white" : "bg-[#282a2e] text-zinc-400"
                }`}
              >
                {usedList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("expired")}
              className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "expired"
                  ? "bg-[#282a2e] text-zinc-300 border border-[#383a40] shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Expired</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "expired" ? "bg-[#16181d] text-zinc-300" : "bg-[#282a2e] text-zinc-400"
                }`}
              >
                {expiredList.length}
              </span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, vendors or voucher code..."
              className="w-full bg-[#121915] border border-[#44e092]/25 rounded-full py-2.5 pl-10 pr-10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#44e092]/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* FAST FILTER CHIPS */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
            <button
              type="button"
              onClick={() => setActiveFilterChip("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilterChip === "all"
                  ? "bg-[#004729] border border-[#44e092] text-[#44e092] shadow-sm"
                  : "bg-gradient-to-b from-[#091b13] to-[#121815] text-zinc-400 border border-[#44e092]/20"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterChip("expiring-soon")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeFilterChip === "expiring-soon"
                  ? "bg-[#282a2e] border border-[#ff6b00] text-white shadow-sm"
                  : "bg-gradient-to-b from-[#091b13] to-[#121815] text-zinc-400 border border-[#44e092]/20"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#ffb77a]" />
              <span>Expiring Soon</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterChip("high-value")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilterChip === "high-value"
                  ? "bg-[#282a2e] border border-[#ff6b00] text-white shadow-sm"
                  : "bg-gradient-to-b from-[#091b13] to-[#121815] text-zinc-400 border border-[#44e092]/20"
              }`}
            >
              ₦ High Value
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterChip("fast-food")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilterChip === "fast-food"
                  ? "bg-[#282a2e] border border-[#ff6b00] text-white shadow-sm"
                  : "bg-gradient-to-b from-[#091b13] to-[#121815] text-zinc-400 border border-[#44e092]/20"
              }`}
            >
              Fast Food & Grills
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterChip("bakery")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilterChip === "bakery"
                  ? "bg-[#282a2e] border border-[#ff6b00] text-white shadow-sm"
                  : "bg-gradient-to-b from-[#091b13] to-[#121815] text-zinc-400 border border-[#44e092]/20"
              }`}
            >
              Bakery & Sweet
            </button>
          </div>

          {/* VOUCHERS LISTING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {loading ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-[#44e092] animate-spin" />
                <p className="text-xs text-zinc-400 font-medium">Syncing meal vouchers from vault...</p>
              </div>
            ) : fetchError ? (
              <div className="col-span-full p-8 rounded-2xl bg-[#1c1214] border border-rose-900/40 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-700/50 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Vault Sync Issue</h3>
                <p className="text-xs text-rose-300 max-w-sm">{fetchError}</p>
              </div>
            ) : vouchers.length === 0 ? (
              <div className="col-span-full p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#091d14] via-[#0d1e17] to-[#131619] border border-[#44e092]/25 flex flex-col items-center text-center gap-3 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-[#004729]/50 border border-[#44e092]/30 flex items-center justify-center text-[#ff6b00]">
                  <Ticket className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Your Meal Vault is Empty</h3>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                  You haven't claimed any meal discount vouchers yet. Use your PayWaka points in the marketplace to unlock exclusive discounts at partner restaurants.
                </p>
                <Link
                  to="/services/meals"
                  className="mt-3 px-6 py-2.5 rounded-full bg-[#ff6b00] hover:bg-[#ff7a1a] text-white text-xs font-bold shadow-lg shadow-[#ff6b00]/20 transition-all active:scale-[0.98]"
                >
                  Explore Meal Offers
                </Link>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="col-span-full p-8 rounded-2xl bg-gradient-to-b from-[#091d14] via-[#0d1e17] to-[#131619] border border-[#44e092]/25 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[#004729]/50 border border-[#44e092]/30 flex items-center justify-center text-zinc-400">
                  <Ticket className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No {activeTab} vouchers found</h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  {searchQuery || activeFilterChip !== "all"
                    ? "No vouchers matched your current search and filter settings."
                    : `You have no ${activeTab} vouchers in your vault.`}
                </p>
                {activeTab === "active" && (
                  <Link
                    to="/services/meals"
                    className="mt-2 px-5 py-2.5 rounded-full bg-[#ff6b00] text-white text-xs font-bold shadow-md hover:bg-[#ff7a1a] transition-colors"
                  >
                    Explore Marketplace
                  </Link>
                )}
              </div>
            ) : (
              filteredList.map((voucher) => {
                const isActive = voucher.status === "active";
                const isUsed = voucher.status === "used" || voucher.status === "redeemed";

                return (
                  <article
                    key={voucher.id}
                    className={`relative flex flex-col rounded-3xl overflow-visible shadow-xl transition-all ${
                      !isActive ? "opacity-75" : ""
                    }`}
                  >
                    {/* HERO VISUAL SECTION (TOP TICKET HALF) */}
                    <div className="relative w-full h-40 overflow-hidden rounded-t-3xl border-t border-l border-r border-[#44e092]/25 bg-gradient-to-b from-[#091d14] to-[#0d1e17]">
                      <img
                        src={voucher.image}
                        alt={voucher.title}
                        className={`w-full h-full object-cover ${!isActive ? "grayscale-[40%]" : ""}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1e17] via-[#0d1e17]/40 to-transparent" />

                      {/* Vendor Logo & Tag */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#004729]/60 flex items-center justify-center shadow-md text-base border border-[#44e092]/30 overflow-hidden">
                          {voucher.vendorLogoUrl ? (
                            <img
                              src={voucher.vendorLogoUrl}
                              alt={voucher.vendorName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{voucher.vendorLogoEmoji || "🍗"}</span>
                          )}
                        </div>
                        <span className="px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold border border-white/10 whitespace-nowrap shadow-sm">
                          {voucher.vendorName}
                        </span>
                      </div>

                      {/* Status / Urgency Pill */}
                      {isActive ? (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#004729] text-[#44e092] border border-[#44e092]/30 px-3 py-1 rounded-full shadow-md text-xs font-bold whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{voucher.timeText || "Active"}</span>
                        </div>
                      ) : isUsed ? (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#004729]/90 text-[#44e092] px-3 py-1 rounded-full text-xs font-bold border border-[#44e092]/40 whitespace-nowrap shadow-md">
                          <CheckCircle className="w-3.5 h-3.5 text-[#44e092]" />
                          <span>Redeemed</span>
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#93000a]/30 text-rose-300 border border-rose-900/40 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Expired</span>
                        </div>
                      )}

                      {/* Bottom Deal Headline inside Frame */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="text-base font-extrabold text-white tracking-tight leading-tight block truncate">
                            {voucher.title}
                          </span>
                          <span className="text-xs text-[#44e092] flex items-center gap-1 mt-0.5 truncate">
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{voucher.vendorBranch}</span>
                          </span>
                        </div>
                        <div className="bg-[#06180f] text-[#ff6b00] px-3 py-1 rounded-full text-xs font-black border border-[#44e092]/30 flex-shrink-0 whitespace-nowrap shadow-sm">
                          {voucher.discountDisplay}
                        </div>
                      </div>
                    </div>

                    {/* GENUINE UNBOUNDED PERFORATION BAND (NO CONTINUOUS SIDE BORDER) */}
                    <div className="relative w-full h-6 flex items-center justify-between bg-[#0d1e17] px-0 overflow-visible">
                      {/* Left Notch: Genuine Inward Cutout Void */}
                      <div className="relative -ml-[1px] w-4 h-6 flex-shrink-0">
                        <svg viewBox="0 0 16 24" className="w-full h-full" fill="none" preserveAspectRatio="none">
                          <path
                            d="M 0 0 C 8.8 0 16 5.4 16 12 C 16 18.6 8.8 24 0 24"
                            fill="#111317"
                            stroke="rgba(68,224,146,0.3)"
                            strokeWidth="1.2"
                          />
                        </svg>
                      </div>

                      {/* Dashed Perforation Line Connecting Left and Right Notches */}
                      <div className="flex-1 mx-2.5 border-b-2 border-dashed border-[#44e092]/30 opacity-70" />

                      {/* Right Notch: Symmetrical Inward Cutout Void */}
                      <div className="relative -mr-[1px] w-4 h-6 flex-shrink-0">
                        <svg viewBox="0 0 16 24" className="w-full h-full" fill="none" preserveAspectRatio="none">
                          <path
                            d="M 16 0 C 7.2 0 0 5.4 0 12 C 0 18.6 7.2 24 16 24"
                            fill="#111317"
                            stroke="rgba(68,224,146,0.3)"
                            strokeWidth="1.2"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* TICKET REDEEM STUB SECTION (BOTTOM TICKET HALF) */}
                    <div className="p-5 pt-2 flex flex-col gap-3.5 bg-gradient-to-b from-[#0d1e17] to-[#131619] rounded-b-3xl border-b border-l border-r border-[#44e092]/25">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            Voucher Code
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-mono font-bold tracking-wider text-white">
                              {voucher.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(voucher.code, voucher.id)}
                              className="text-zinc-400 hover:text-white transition-colors p-1"
                              aria-label="Copy voucher code"
                            >
                              {copiedCodeId === voucher.id ? (
                                <Check className="w-4 h-4 text-[#44e092]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            Min. Spend
                          </span>
                          <div className="text-xs font-bold text-white">
                            ₦{voucher.minSpend?.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/services/meals/voucher/${voucher.id}`)}
                          className="w-full py-3 rounded-full bg-[#ff6b00] hover:bg-[#ff7a1a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,107,0,0.3)] transition-all active:scale-[0.99]"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Show QR Code & Claim PIN</span>
                        </button>
                      ) : isUsed ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/services/meals/voucher/${voucher.id}`)}
                          className="w-full py-2.5 rounded-full bg-[#004729]/40 hover:bg-[#004729]/60 text-[#44e092] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-[#44e092]/30"
                        >
                          <CheckCircle className="w-4 h-4 text-[#44e092]" />
                          <span>Redeemed • View Ticket Receipt</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/services/meals/voucher/${voucher.id}`)}
                          className="w-full py-2.5 rounded-full bg-[#282a2e] hover:bg-[#333539] text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/5"
                        >
                          <Receipt className="w-4 h-4" />
                          <span>Expired • View Ticket Archive</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

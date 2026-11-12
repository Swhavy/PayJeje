import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Ticket,
  Sparkles,
  Wallet,
  TrendingUp,
  HelpCircle,
  CheckCircle,
  Clock,
  MapPin,
  Receipt,
  Store,
  ChevronRight,
  PartyPopper,
  ArrowRight,
  X,
  AlertTriangle,
  Award,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import MealFloatingNav from "@/components/meals/MealFloatingNav";
import { db, auth, doc, collection, query, where, onSnapshot } from "@/firebaseConfig";
import {
  resolveOfferAvailability,
  validatePublicOfferTerms,
  validateOfferIdentity,
  resolveBundledMealImage,
} from "@/lib/mealOfferUtils";
import { MEAL_CATEGORIES } from "@/fixtures/mealFixtures";

const HERO_PHRASES = [
  { text: "Something Delicious", type: "ember" },
  { text: "Fresh Artisan Pizza", type: "ember" },
  { text: "Crispy Jollof Feasts", type: "ember" },
  { text: "Instant Food Savings", type: "emerald" },
  { text: "Gourmet Burgers", type: "ember" },
];

export default function MealsPage() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user);
  const currentUid = user?.uid || auth.currentUser?.uid;
  const [livePoints, setLivePoints] = useState(null);
  const [pointsLoading, setPointsLoading] = useState(true);

  // Authoritative real-time points subscription matching Dashboard and MealCouponDetail
  useEffect(() => {
    let unsubDoc = null;

    const setupListener = (uid) => {
      if (!uid) {
        setPointsLoading(false);
        return;
      }
      unsubDoc = onSnapshot(
        doc(db, "users", uid),
        (snap) => {
          setPointsLoading(false);
          if (snap.exists()) {
            const data = snap.data();
            if (typeof data.points === "number") {
              setLivePoints(data.points);
            }
          }
        },
        (err) => {
          console.warn("Marketplace points live fetch error:", err);
          setPointsLoading(false);
        }
      );
    };

    if (currentUid) {
      setupListener(currentUid);
    } else {
      const unsubAuth = auth.onAuthStateChanged((fbUser) => {
        if (fbUser?.uid) {
          setupListener(fbUser.uid);
        } else {
          setPointsLoading(false);
        }
      });
      return () => {
        unsubAuth();
        if (unsubDoc) unsubDoc();
      };
    }

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, [currentUid]);

  // Spendable points: authoritative Firestore live snapshot first, then Redux state
  const spendablePoints =
    typeof livePoints === "number"
      ? livePoints
      : typeof user?.points === "number"
      ? user.points
      : null;

  const pointsBalance = spendablePoints ?? 0;

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Kinetic Headline Word Swap & Ambient Effects State
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);
  const [leavingPhraseIndex, setLeavingPhraseIndex] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const heroCanvasRef = useRef(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Word Swap Transitions Cycle (~3.2s per phrase)
  useEffect(() => {
    if (prefersReducedMotion) return;

    let timeoutId;
    const intervalId = setInterval(() => {
      setActivePhraseIndex((current) => {
        setLeavingPhraseIndex(current);
        timeoutId = setTimeout(() => {
          setLeavingPhraseIndex(null);
        }, 750);
        return (current + 1) % HERO_PHRASES.length;
      });
    }, 3200);

    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion]);

  // Ambient Procedural Canvas for Floating Ember Sparks & Emerald Light Particles
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas || prefersReducedMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || 800);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || 400);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    class AmbientParticle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.8;
        this.speedX = (Math.random() - 0.5) * 0.35;
        this.speedY = -Math.random() * 0.55 - 0.2; // float upwards
        this.opacity = Math.random() * 0.5 + 0.2;
        // 60% emerald green, 40% warm ember
        this.color = Math.random() > 0.4 ? "rgba(0, 192, 118, " : "rgba(255, 107, 0, ";
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.y < -10 || this.x < -10 || this.x > width + 10) {
          this.reset();
          this.y = height + 10;
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.opacity + ")";
        ctx.shadowColor = this.color.includes("192") ? "#00C076" : "#FF6B00";
        ctx.shadowBlur = 5;
        ctx.fill();
      }
    }

    const particles = Array.from({ length: 32 }, () => new AmbientParticle());

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  // Real-time Public Meal Offers, Vendor Branding & Customer Claims Subscriptions
  const [offers, setOffers] = useState([]);
  const [vendorsMap, setVendorsMap] = useState({});
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(null);
  const [userClaimsMap, setUserClaimsMap] = useState({});

  useEffect(() => {
    const unsubVendors = onSnapshot(
      collection(db, "meal_vendors"),
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setVendorsMap(map);
      },
      () => {}
    );
    return () => unsubVendors();
  }, []);

  useEffect(() => {
    setOffersLoading(true);
    setOffersError(null);

    const unsub = onSnapshot(
      collection(db, "public_meal_offers"),
      (snapshot) => {
        const validOffers = [];
        snapshot.forEach((docSnap) => {
          const ident = validateOfferIdentity(docSnap);
          if (!ident.isValid) {
            console.warn(`[Meals Marketplace] Skipping invalid public offer projection ${docSnap.id}:`, ident.reason);
            return;
          }
          const data = docSnap.data();
          const terms = validatePublicOfferTerms(data);
          if (!terms.isValid) {
            console.warn(`[Meals Marketplace] Skipping offer with invalid commercial terms ${docSnap.id}:`, terms.reason);
            return;
          }
          const avail = resolveOfferAvailability(data);
          const image = resolveBundledMealImage(data.category, data.title, data.vendorName);

          validOffers.push({
            id: docSnap.id,
            campaignId: ident.canonicalCampaignId,
            offerId: ident.canonicalOfferId,
            isLegacyIdentity: ident.isLegacyIdentity,
            title: data.title,
            vendorId: data.vendorId,
            vendorName: data.vendorName,
            vendorLogoUrl: data.vendorLogoUrl || null,
            vendorLogoEmoji: data.vendorLogoEmoji || "🍗",
            branch: data.branch || "Main Branch",
            category: data.category || "Local Delicacies",
            discountNaira: terms.discountNaira,
            minSpendNaira: terms.minSpendNaira,
            pointsCost: terms.pointsCost,
            discountDisplay: terms.discountDisplay,
            minSpend: terms.minSpendNaira,
            image: data.image || image,
            status: data.status,
            isAvailable: data.isAvailable,
            availability: avail,
            isFeatured: Boolean(data.isFeatured),
            spotlightBadge: data.spotlightBadge || "Partner Spotlight",
          });
        });
        setOffers(validOffers);
        setOffersLoading(false);
      },
      (err) => {
        console.error("[Meals Marketplace] Error listening to public_meal_offers:", err);
        setOffersError("Unable to load meal offers at this time. Please check your connection.");
        setOffersLoading(false);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setUserClaimsMap({});
      return;
    }
    let rawClaimsMap = {};
    let vouchersStatusById = {};

    const recomputeClaims = () => {
      const merged = {};
      const nowMs = Date.now();
      Object.entries(rawClaimsMap).forEach(([claimKey, cData]) => {
        const activeExpiresAtMs = cData.activeVoucherExpiresAt?.toMillis
          ? cData.activeVoucherExpiresAt.toMillis()
          : cData.activeVoucherExpiresAt?.toDate
          ? cData.activeVoucherExpiresAt.toDate().getTime()
          : new Date(cData.activeVoucherExpiresAt || 0).getTime();

        const vId = cData.activeVoucherId;
        const liveVchStatus = vId ? vouchersStatusById[vId] : null;
        // Voucher is only considered active if activeVoucherId exists, not expired, and not already redeemed/used/expired in meal_vouchers
        const isStillActiveInVault = !liveVchStatus || liveVchStatus === "active";
        const hasActive = Boolean(vId && nowMs < activeExpiresAtMs && isStillActiveInVault);

        merged[claimKey] = {
          ...cData,
          hasActiveVoucher: hasActive,
          activeVoucherId: hasActive ? vId : null,
          lifetimeClaimCount: Number(cData.lifetimeClaimCount || 0),
        };
      });
      setUserClaimsMap(merged);
    };

    const unsubClaims = onSnapshot(
      collection(db, "users", currentUid, "mealClaims"),
      (snapshot) => {
        const nextRaw = {};
        snapshot.forEach((claimDoc) => {
          nextRaw[claimDoc.id] = claimDoc.data();
        });
        rawClaimsMap = nextRaw;
        recomputeClaims();
      },
      (err) => {
        console.warn("[Meals Marketplace] Claims subscription error:", err);
      }
    );

    const unsubVouchers = onSnapshot(
      query(collection(db, "meal_vouchers"), where("userId", "==", currentUid)),
      (snapshot) => {
        const nextStatuses = {};
        snapshot.forEach((vDoc) => {
          const vData = vDoc.data();
          const isRedeemed =
            vData.status === "redeemed" ||
            vData.status === "used" ||
            Boolean(vData.redeemedAt) ||
            Boolean(vData.redemptionId);
          nextStatuses[vDoc.id] = isRedeemed ? "redeemed" : vData.status || "active";
        });
        vouchersStatusById = nextStatuses;
        recomputeClaims();
      },
      () => {}
    );

    return () => {
      unsubClaims();
      unsubVouchers();
    };
  }, [currentUid]);

  const featuredOffer = offers.find((o) => o.isFeatured === true) || null;

  const filteredOffers = offers.filter((offer) => {
    if (selectedCategory === "all") return true;
    const cat = (offer.category || "").toLowerCase();
    if (selectedCategory === "small-chops") return cat === "small chops";
    if (selectedCategory === "fast-foods") return cat === "fast foods" || cat === "fast food";
    if (selectedCategory === "local-delicacies") return cat === "local delicacies";
    if (selectedCategory === "drinks") return cat === "drinks" || cat === "drink";
    if (selectedCategory === "pastries") return cat === "pastries" || cat === "pastry" || cat === "desserts";
    return true;
  });

  const getBadgeClass = (style) => {
    if (style === "emerald") return "bg-[#05140e]/90 text-[#44e092] border-[#44e092]/30";
    if (style === "rose") return "bg-[#2a0d13]/90 text-[#ff8093] border-[#ff4d6d]/40";
    if (style === "amber") return "bg-[#2a1a08]/90 text-[#ffb03a] border-[#ffb03a]/40";
    return "bg-[#1a1c20]/90 text-zinc-400 border-zinc-700";
  };

  return (
    <DashboardLayout>
      <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-16 sm:pb-20 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-4 sm:p-6 lg:p-8 shadow-2xl">
        {/* TOP STATUS BAR ROW & IN-FLOW SUB-NAVIGATION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#282a2e]/70">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="w-10 h-10 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] flex items-center justify-center text-[#e2e2e8] transition-colors flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#44e092] flex items-center gap-1.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#44e092] shadow-[0_0_8px_rgba(68,224,146,0.8)]" />
                PayWaka Rewards
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                Meal Marketplace
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <MealFloatingNav className="w-full sm:w-auto" />
          </div>
        </div>

        {/* SECTION 1: TOP HERO / REWARD BALANCE CARD (KINETIC AMBIENT HERO WITH WORD SWAP & PARTICLES) */}
        <section className="pt-4 sm:pt-6 pb-6 sm:pb-8">
          <style>{`
            @keyframes subtleDrift {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(15px, -20px) scale(1.08); }
            }
            @keyframes emberDrift {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(-20px, 15px) scale(1.12); }
            }
            @keyframes sheenSweep {
              0% { transform: translateX(-150%) skewX(-20deg); }
              35%, 100% { transform: translateX(250%) skewX(-20deg); }
            }
            @keyframes floatSoft {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
            }
            @keyframes textShimmer {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }

            .shimmer-text-ember {
              background: linear-gradient(135deg, #FF6B00 0%, #FFA24A 35%, #FFDF85 50%, #FF6B00 75%, #FF3D00 100%);
              background-size: 250% 250%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: textShimmer 4.5s ease infinite;
              filter: drop-shadow(0 0 16px rgba(255, 107, 0, 0.4));
            }

            .shimmer-text-emerald {
              background: linear-gradient(135deg, #00C076 0%, #38EF9A 40%, #B2FFD9 55%, #00C076 80%, #008F56 100%);
              background-size: 250% 250%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: textShimmer 5s ease infinite;
              filter: drop-shadow(0 0 16px rgba(0, 192, 118, 0.4));
            }

            .glow-aura-green {
              animation: subtleDrift 10s ease-in-out infinite;
            }
            .glow-aura-ember {
              animation: emberDrift 12s ease-in-out infinite;
            }
            .float-card {
              animation: floatSoft 5s ease-in-out infinite;
            }

            .word-swap-container {
              display: block;
              position: relative;
              width: 100%;
              max-width: 100%;
              height: 1.65em;
              min-height: 1.65em;
              overflow: hidden;
              overflow-y: clip;
              overflow-x: visible;
            }
            .word-slot {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              width: 100%;
              height: 100%;
              padding: 0 0.5rem;
              opacity: 0;
              transform: translateY(100%) rotateX(-45deg);
              transition: all 0.75s cubic-bezier(0.16, 1, 0.3, 1);
              transform-origin: center bottom;
              white-space: nowrap;
              pointer-events: none;
            }
            .word-slot.active {
              opacity: 1;
              transform: translateY(0%) rotateX(0deg);
              pointer-events: auto;
            }
            .word-slot.leaving {
              opacity: 0;
              transform: translateY(-80%) rotateX(45deg);
              filter: blur(4px);
            }

            @media (prefers-reduced-motion: reduce) {
              .glow-aura-green,
              .glow-aura-ember,
              .float-card,
              .shimmer-text-ember,
              .shimmer-text-emerald {
                animation: none !important;
              }
              .word-slot {
                transition: none !important;
                transform: none !important;
              }
            }
          `}</style>

          <div
            className="relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-10 border transition-all"
            style={{
              background:
                "radial-gradient(ellipse at 16% 18%, rgba(0, 201, 110, 0.18) 0%, rgba(0, 201, 110, 0.05) 45%, transparent 70%), radial-gradient(ellipse at 86% 84%, rgba(255, 107, 0, 0.28) 0%, rgba(255, 136, 46, 0.12) 42%, transparent 72%), linear-gradient(145deg, #07120e 0%, #0b1412 35%, #101515 65%, #19140e 100%)",
              borderColor: "rgba(68, 224, 146, 0.28)",
              boxShadow:
                "0 24px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px -8px rgba(0, 201, 110, 0.14), 0 0 40px -8px rgba(255, 107, 0, 0.22)",
            }}
          >
            {/* Atmospheric Procedural Canvas for Floating Ember Sparks & Emerald Light Particles */}
            <canvas
              ref={heroCanvasRef}
              className="pointer-events-none absolute inset-0 w-full h-full opacity-60 z-0"
            />

            {/* Ambient Lighting Orbs — Drift & Scale Animations */}
            <div className="glow-aura-green absolute -left-10 -top-10 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-[#00c96e]/12 blur-3xl pointer-events-none z-0" />
            <div className="glow-aura-ember absolute -right-10 -bottom-10 w-64 sm:w-88 h-64 sm:h-88 rounded-full bg-[#ff6b00]/22 blur-3xl pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col items-center text-center gap-3 sm:gap-4 md:gap-5 max-w-3xl lg:max-w-4xl mx-auto w-full">
              {/* Feature Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#004729]/60 text-[#44e092] border border-[#44e092]/40 whitespace-nowrap shadow-sm backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#44e092] flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#44e092] whitespace-nowrap">
                  PayWaka Food Rewards
                </span>
              </div>

              {/* High-Impact Kinetic Headline with Calibrated Rollup Text (Never Cut Off) */}
              <h1 className="font-display text-[17px] min-[375px]:text-[19px] sm:text-2xl md:text-3xl lg:text-[38px] xl:text-[40px] font-bold tracking-tight text-white leading-tight text-center w-full max-w-4xl mx-auto py-0.5 select-none">
                <span className="block text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.8)]">
                  Turn your points into
                </span>
                <span className="word-swap-container relative block w-full h-[1.65em] mt-0.5 sm:mt-1 px-1">
                  {HERO_PHRASES.map((phrase, idx) => {
                    const isActive = idx === activePhraseIndex;
                    const isLeaving = idx === leavingPhraseIndex;
                    const isEmerald = phrase.type === "emerald";
                    const shimmerClass = isEmerald ? "shimmer-text-emerald" : "shimmer-text-ember";

                    if (prefersReducedMotion) {
                      if (idx !== 0) return null;
                      return (
                        <span
                          key={phrase.text}
                          className={`word-slot active ${shimmerClass} block`}
                        >
                          {phrase.text}
                        </span>
                      );
                    }

                    return (
                      <span
                        key={phrase.text}
                        className={`word-slot ${isActive ? "active" : ""} ${isLeaving ? "leaving" : ""} ${shimmerClass}`}
                      >
                        {phrase.text}
                      </span>
                    );
                  })}
                </span>
              </h1>

              {/* Greyed Supporting Text — Less Bold, Soft Neutral & Refined Desktop Spacing */}
              <p className="text-xs sm:text-sm md:text-base text-zinc-400 font-normal max-w-md sm:max-w-xl mx-auto leading-relaxed px-2 tracking-normal">
                Use your accumulated PayWaka Points to unlock instant meal discount vouchers at participating partner restaurants.
              </p>

              {/* PayWaka Emerald Points Balance Card with Floating & Glass Highlight Animation */}
              <div className="float-card relative w-full max-w-md sm:max-w-lg mt-0.5 sm:mt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-[#071711]/90 via-[#0c1614]/85 to-[#16130f]/85 backdrop-blur-md p-3.5 sm:p-4 sm:px-6 rounded-xl sm:rounded-2xl border border-[#44e092]/30 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#44e092]/50 hover:shadow-[0_16px_40px_rgba(0,192,118,0.15)] transition-all duration-300 group">
                {/* Glass Specular Sheen Sweep Reflection */}
                <div className="pointer-events-none absolute -inset-px rounded-xl sm:rounded-2xl overflow-hidden">
                  <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transform -skew-x-12 translate-x-[-150%] animate-[sheenSweep_8s_infinite]" />
                </div>

                <div className="flex items-center gap-3 relative z-10">
                  {/* Wallet Icon Container with Soft Glow and Live Pulse Dot */}
                  <div className="relative w-10 sm:w-11 h-10 sm:h-11 rounded-xl bg-[#004729]/80 border border-[#44e092]/40 flex items-center justify-center text-[#44e092] flex-shrink-0 shadow-[0_0_16px_rgba(68,224,146,0.3)] transition-transform duration-300 group-hover:scale-105">
                    <Wallet className="w-5 h-5" />
                    {/* Live Pulse Dot */}
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38EF9A] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00c96e]" />
                    </span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] sm:text-[11px] text-zinc-400 uppercase tracking-wider font-medium whitespace-nowrap">
                      PayWaka Points Balance
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      {pointsLoading && spendablePoints === null ? (
                        <span className="font-display text-xl sm:text-2xl md:text-3xl font-black text-zinc-500 tracking-tight leading-none animate-pulse">
                          —
                        </span>
                      ) : (
                        <span className="font-display text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                          {pointsBalance.toLocaleString()}
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#44e092] font-mono">pts</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0 relative z-10">
                  <span className="text-xs text-[#44e092] flex items-center gap-1 font-bold whitespace-nowrap">
                    <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                    +180 pts
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-zinc-400 whitespace-nowrap">this week</span>
                </div>
              </div>

              {/* Bottom Card Actions — Compact Single Row Horizontal Alignment */}
              <div className="w-full max-w-md sm:max-w-lg flex flex-row items-center justify-between gap-2 pt-2.5 sm:pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowHowItWorksModal(true)}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#44e092] flex-shrink-0" />
                  <span className="whitespace-nowrap">How Meal Rewards Work</span>
                </button>
                <Link
                  to="/earn"
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#004729]/50 hover:bg-[#004729]/80 border border-[#44e092]/40 text-[#44e092] hover:text-white text-[11px] sm:text-xs font-bold transition-all shadow-sm whitespace-nowrap flex-shrink-0"
                >
                  <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#44e092] flex-shrink-0" />
                  <span className="whitespace-nowrap">Earn More Points</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* REAL-TIME MARKETPLACE CONTENT */}
        {offersLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#44e092] border-t-transparent animate-spin" />
            <span className="text-zinc-400 text-sm font-medium">Discovering live meal rewards from verified partners...</span>
          </div>
        ) : offersError ? (
          <div className="my-6 p-6 rounded-2xl bg-[#2a0d13]/60 border border-[#ff4d6d]/40 text-center flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-[#ff8093]" />
            <p className="text-sm text-zinc-200">{offersError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] text-xs font-bold text-white border border-zinc-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : offers.length === 0 ? (
          <div className="my-8 p-10 rounded-3xl bg-gradient-to-b from-[#0e1713] to-[#121418] border border-[#282a2e] text-center flex flex-col items-center gap-3 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-[#1a1c20] text-zinc-400 flex items-center justify-center border border-zinc-700">
              <Store className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Meal Offers Available</h3>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Our partner restaurants are preparing new promotions. Check back soon for exclusive food rewards!
            </p>
          </div>
        ) : (
          <>
            {/* SECTION 2: FEATURED MEAL REWARD SPOTLIGHT */}
            {featuredOffer && (() => {
              const featClaim = userClaimsMap[featuredOffer.offerId];
              const featLifetimeClaims = featClaim?.lifetimeClaimCount || 0;
              const featHasActive = Boolean(featClaim?.hasActiveVoucher);
              const featActiveVoucherId = featClaim?.activeVoucherId;
              const featLimitReached = featLifetimeClaims >= 2;
              const featHasEnough = pointsBalance >= featuredOffer.pointsCost;

              return (
                <section className="py-4">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#44e092]" />
                      <h3 className="text-lg font-bold text-white tracking-tight">Featured Partner</h3>
                    </div>
                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold whitespace-nowrap">
                      Curated Selection
                    </span>
                  </div>

                  <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-b from-[#0b1c14] via-[#0f1d17] to-[#14171a] shadow-2xl border border-[#44e092]/35 transition-all hover:border-[#44e092]/65 hover:shadow-[0_16px_40px_rgba(68,224,146,0.15)]">
                    <div className="relative w-full h-56 sm:h-64 lg:h-72 overflow-hidden">
                      <img
                        src={featuredOffer.image}
                        alt={featuredOffer.title}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c14] via-[#0b1c14]/40 to-transparent" />

                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 border whitespace-nowrap backdrop-blur-md ${getBadgeClass(featuredOffer.availability.badgeStyle)}`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          {featuredOffer.availability.badgeLabel}
                        </span>

                        <span className="px-3.5 py-1.5 rounded-full bg-[#05140e]/90 text-xs font-semibold text-zinc-300 border border-white/10 whitespace-nowrap shadow-sm">
                          {featLifetimeClaims}/2 Claims Used
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-4 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-[#ff6b00] tracking-tight leading-none drop-shadow-[0_2px_16px_rgba(255,107,0,0.35)]">
                          {featuredOffer.discountDisplay}
                        </span>
                        <span className="text-xs bg-[#05140e]/85 px-3 py-1 rounded-full text-zinc-300 font-medium border border-white/10 whitespace-nowrap shadow-sm">
                          Instant Voucher
                        </span>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 flex flex-col gap-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-[#004729]/70 border border-[#44e092]/30 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden shadow-inner">
                            {vendorsMap[featuredOffer.vendorId]?.logoUrl || featuredOffer.vendorLogoUrl ? (
                              <img
                                src={vendorsMap[featuredOffer.vendorId]?.logoUrl || featuredOffer.vendorLogoUrl}
                                alt={featuredOffer.vendorName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{vendorsMap[featuredOffer.vendorId]?.logoEmoji || featuredOffer.vendorLogoEmoji || "🍗"}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-lg font-bold text-white truncate">{featuredOffer.vendorName}</h4>
                            <div className="flex items-center gap-1 text-zinc-400 text-xs mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                              <span className="truncate">{featuredOffer.branch}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-lg font-black text-white">{featuredOffer.pointsCost} pts</span>
                          <div className="text-xs text-zinc-400">required</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300 text-xs bg-gradient-to-r from-[#07170f] via-[#0b1d14] to-[#101915] px-4 py-3 rounded-xl border border-[#44e092]/25">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-zinc-400" />
                          Min. purchase: ₦{featuredOffer.minSpend?.toLocaleString()}
                        </span>
                        <span className="text-[#44e092] flex items-center gap-1 font-bold whitespace-nowrap">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {featHasEnough ? "Sufficient Balance" : "Need points"}
                        </span>
                      </div>

                      {featHasActive ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/services/meals/voucher/${featActiveVoucherId}`)}
                          className="w-full mt-1 py-3.5 px-4 rounded-full bg-[#004729] hover:bg-[#00522f] border border-[#44e092]/40 text-[#44e092] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(68,224,146,0.25)] transition-all whitespace-nowrap"
                        >
                          <Ticket className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">Active Voucher in Wallet (Show Ticket)</span>
                        </button>
                      ) : featLimitReached ? (
                        <button
                          type="button"
                          disabled
                          className="w-full mt-1 py-3.5 px-4 rounded-full bg-[#282a2e] text-zinc-500 border border-[#333539] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed whitespace-nowrap"
                        >
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">Lifetime Claim Limit Reached (2/2)</span>
                        </button>
                      ) : !featuredOffer.availability.isActionable ? (
                        <button
                          type="button"
                          disabled
                          className="w-full mt-1 py-3.5 px-4 rounded-full bg-[#1f2125] text-zinc-400 border border-zinc-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed whitespace-nowrap"
                        >
                          <span>{featuredOffer.availability.buttonText}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/services/meals/coupon/${featuredOffer.id}`)}
                          className={`w-full mt-1 py-3.5 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                            featHasEnough
                              ? "bg-[#ff6b00] hover:bg-[#ff7a1a] text-white shadow-[0_4px_20px_rgba(255,107,0,0.35)] active:scale-[0.98]"
                              : "bg-[#1e2024] text-zinc-400 hover:bg-[#282a2e]"
                          }`}
                        >
                          <span className="whitespace-nowrap">
                            {featHasEnough ? "Redeem Reward" : `Need ${featuredOffer.pointsCost - pointsBalance} More Points`}
                          </span>
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* SECTION 3: CATEGORY FILTER CHIPS */}
            <section className="py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">Categories</span>
                <span className="text-xs text-zinc-400 font-medium">Verified Partner Spots</span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                {MEAL_CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`snap-start flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                        active
                          ? "bg-[#004729] border border-[#44e092] text-[#44e092] shadow-[0_0_12px_rgba(68,224,146,0.25)]"
                          : "bg-gradient-to-b from-[#091b13] to-[#121815] hover:bg-[#1a201c] text-zinc-300 border border-[#44e092]/20"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SECTION 4: EXPLORE PARTNER VENDORS GRID */}
            <section className="pt-2 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#44e092]" />
                  <h3 className="text-lg font-bold text-white tracking-tight">Available Meal Offers</h3>
                </div>
                <span className="text-xs text-zinc-400">
                  {filteredOffers.length} {filteredOffers.length === 1 ? "Offer" : "Offers"}
                </span>
              </div>

              {filteredOffers.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No offers found in this category.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOffers.map((offer) => {
                    const claim = userClaimsMap[offer.offerId];
                    const lifetimeClaims = claim?.lifetimeClaimCount || 0;
                    const hasActive = Boolean(claim?.hasActiveVoucher);
                    const activeVoucherId = claim?.activeVoucherId;
                    const limitReached = lifetimeClaims >= 2;
                    const hasEnough = pointsBalance >= offer.pointsCost;

                    return (
                      <div
                        key={offer.id}
                        className="rounded-2xl bg-gradient-to-b from-[#0a1b13] via-[#0e1a15] to-[#141619] border border-[#44e092]/25 hover:border-[#44e092]/50 shadow-lg hover:shadow-[0_10px_28px_rgba(68,224,146,0.14)] transition-all flex flex-col overflow-hidden"
                      >
                        <div className="relative w-full h-40 overflow-hidden">
                          <img
                            src={offer.image}
                            alt={offer.title}
                            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1b13] via-[#0a1b13]/30 to-transparent" />

                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap shadow-sm backdrop-blur-md ${getBadgeClass(offer.availability.badgeStyle)}`}>
                              {offer.availability.badgeLabel}
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-[#05140e]/85 text-[11px] font-semibold text-zinc-300 border border-white/10 whitespace-nowrap shadow-sm">
                              {lifetimeClaims}/2
                            </span>
                          </div>

                          <div className="absolute bottom-2.5 left-3">
                            <span className="text-2xl font-black text-[#ff6b00] tracking-tight drop-shadow-[0_2px_12px_rgba(255,107,0,0.3)]">
                              {offer.discountDisplay}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-white truncate">{offer.title}</h4>
                            <div className="flex items-center justify-between text-xs text-zinc-400 mt-1.5 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-[#004729]/70 border border-[#44e092]/30 flex items-center justify-center text-[11px] flex-shrink-0 overflow-hidden">
                                  {vendorsMap[offer.vendorId]?.logoUrl || offer.vendorLogoUrl ? (
                                    <img
                                      src={vendorsMap[offer.vendorId]?.logoUrl || offer.vendorLogoUrl}
                                      alt={offer.vendorName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>{vendorsMap[offer.vendorId]?.logoEmoji || offer.vendorLogoEmoji || "🍗"}</span>
                                  )}
                                </span>
                                <span className="truncate">{offer.vendorName}</span>
                              </div>
                              <span className="flex-shrink-0">₦{offer.minSpend?.toLocaleString()} min</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#44e092]/20">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-white">{offer.pointsCost} pts</span>
                              <span className="text-[10px] text-zinc-400">Reward cost</span>
                            </div>

                            {hasActive ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/services/meals/voucher/${activeVoucherId}`)}
                                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#004729] text-[#44e092] border border-[#44e092]/40 hover:brightness-110 transition-all whitespace-nowrap shadow-sm"
                              >
                                View Active
                              </button>
                            ) : limitReached ? (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#282a2e] text-zinc-500 border border-[#333539] cursor-not-allowed whitespace-nowrap"
                              >
                                Limit Reached
                              </button>
                            ) : !offer.availability.isActionable ? (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#1f2125] text-zinc-400 border border-zinc-700 cursor-not-allowed whitespace-nowrap"
                              >
                                {offer.availability.badgeLabel}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate(`/services/meals/coupon/${offer.id}`)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                  hasEnough
                                    ? "bg-[#ff6b00] text-white shadow-[0_2px_10px_rgba(255,107,0,0.35)] hover:brightness-110 active:scale-95"
                                    : "bg-[#1e2024] text-zinc-400 hover:bg-[#282a2e]"
                                }`}
                              >
                                Unlock
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* SECTION 5: MOTIVATIONAL "ALMOST THERE" REWARD CARD (SMOOTH EMERALD GRADIENT) */}
        <section className="py-3">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-[22px] bg-gradient-to-r from-[#071c12] via-[#0c2217] to-[#131917] p-4 sm:p-6 shadow-xl border border-[#44e092]/40">
            <div className="flex items-start gap-3 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#004729]/60 text-[#44e092] flex-shrink-0 flex items-center justify-center border border-[#44e092]/30 shadow-[0_0_12px_rgba(68,224,146,0.2)]">
                <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#44e092]">
                  PayWaka Points Goal
                </span>
                <h4 className="text-base font-bold text-white">Unlock ₦1,500 Gourmet Feast</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Earn points every time you pay for airtime, data, electricity, and cable on PayWaka (1 point for every ₦50 spent).
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Link
                    to="/earn"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#44e092] hover:text-white transition-colors"
                  >
                    <span>Earn More Points</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: HOW IT WORKS INFOGRAPHIC STRIP (EXPLICITLY KEPT ON CLEAN OBSIDIAN WITHOUT EMERALD GRADIENT PER USER REQUEST) */}
        <section className="py-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-lg font-bold text-white">How It Works</h3>
            <span className="text-xs text-zinc-400">3 Easy Steps</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#16181d] border border-[#282a2e] shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#282a2e] text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0 border border-[#383a40]">
                1
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white">Pick a Merchant</span>
                <span className="text-xs text-zinc-400 truncate mt-0.5">Choose a participating diner or café.</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#16181d] border border-[#282a2e] shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-md">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white">Unlock with Points</span>
                <span className="text-xs text-zinc-400 truncate mt-0.5">Redeem instant ₦ discount voucher.</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#16181d] border border-[#282a2e] shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#004729] text-[#44e092] flex items-center justify-center font-extrabold text-sm flex-shrink-0 border border-[#44e092]/30">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white">Show QR at Counter</span>
                <span className="text-xs text-zinc-400 truncate mt-0.5">Present QR or PIN, pay discounted bill.</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS MODAL */}
        {showHowItWorksModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#16181d] border border-[#282a2e] rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-left animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#282a2e]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#44e092]" />
                  <h3 className="text-lg font-bold text-white">How Meal Rewards Work</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHowItWorksModal(false)}
                  className="w-8 h-8 rounded-full bg-[#282a2e] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
                <div className="p-3.5 sm:p-4 bg-[#0c0e12] rounded-2xl border border-[#282a2e]">
                  <strong className="text-white block mb-1">1. Earn Points Automatically</strong>
                  Earn 1 PayWaka Point for every ₦50 spent on Airtime, Data, Electricity, and Cable TV bills.
                </div>
                <div className="p-3.5 sm:p-4 bg-[#0c0e12] rounded-2xl border border-[#282a2e]">
                  <strong className="text-white block mb-1">2. Unlock Meal Coupons</strong>
                  Exchange your accumulated points for instant cash discounts (e.g. ₦500 OFF, ₦1,000 OFF) at partner food vendors.
                </div>
                <div className="p-3.5 sm:p-4 bg-[#0c0e12] rounded-2xl border border-[#282a2e]">
                  <strong className="text-white block mb-1">3. Fair Usage Rules</strong>
                  You can claim a specific deal up to 2 times across the lifetime of the campaign, and hold 1 active voucher per offer at any time.
                </div>
                <div className="p-3.5 sm:p-4 bg-[#0c0e12] rounded-2xl border border-[#282a2e]">
                  <strong className="text-white block mb-1">4. Redeem at Counter</strong>
                  Each unlocked voucher generates a secure digital QR code and 4-digit PIN. Present this to the cashier before paying to deduct your discount.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHowItWorksModal(false)}
                className="w-full py-3 rounded-full bg-[#004729] hover:bg-[#005430] border border-[#44e092]/40 text-[#44e092] hover:text-white font-bold text-xs shadow-md mt-2 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/customProgress";
import StateView from "@/components/ui/StateView";
import AccountDetailsCard from "@/components/AccountDetailsCard";
import {
  ReceiptStrip,
  ReceiptStatusPill,
  ReceiptCopyButton,
} from "@/components/receipts/ReceiptParts";
import {
  Star,
  Smartphone,
  Wifi,
  Zap,
  Gift,
  Utensils,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  RotateCcw,
  Target,
  Flame,
  History,
  Receipt,
  Building2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useTransactionFetch, {
  useInflowData,
  useReferallData,
} from "@/components/useTransactionFetch";
import TransactionChart from "@/components/HistoryChart.jsx";
import { db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import QuickEarnModal from "@/components/QuickEarn";
import TransactionsModal from "@/components/TransactionsModal";
import TransactionPinSetupModal from "@/components/TransactionPinSetupModal";
import { getTransactionDisplayTitle, getTransactionStatusInfo } from "@/lib/receiptUtils";
import {
  formatNaira,
  formatPlanPrice,
  formatPoints,
  formatSignedNaira,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const quickActions = [
  { title: "Data", icon: Wifi, href: "/services/data", neutral: false },
  { title: "Airtime", icon: Smartphone, href: "/services/airtime", neutral: true },
  { title: "Bills", icon: Zap, href: "/services/bills", neutral: false },
  { title: "Meals", icon: Utensils, href: "/services/meals", neutral: true },
  { title: "Gift Cards", icon: Gift, href: "/services/giftcards", neutral: false },
  { title: "Earn", icon: Star, href: "/earn", neutral: true },
  { title: "Referrals", icon: Users, href: "/referrals", neutral: false },
  { title: "History", icon: History, href: "/billhistory", neutral: true },
];

const rewardTasks = [
  {
    id: 1,
    href: null,
    state: "coming soon",
    title: "Complete Survey",
    subtitle: "5 mins • +50 points",
    icon: Star,
    buttonText: "Coming Soon",
  },
  {
    id: 2,
    href: null,
    state: "coming soon",
    title: "Watch Video",
    subtitle: "2 mins • +25 points",
    icon: Eye,
    buttonText: "Coming Soon",
  },
  {
    id: 3,
    href: "/referrals",
    state: "available",
    title: "Invite Friend",
    subtitle: "Share link • +100 points",
    icon: Users,
    buttonText: "Share Link",
  },
];

const DashboardPage = React.memo(() => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountPopup, setAccountPopup] = useState(false);
  const [hide, setHide] = useState(
    localStorage.getItem("hideBalance") === "true",
  );
  const [mounted, setMounted] = useState(false);
  const user = useSelector((state) => state.user.user);
  const {
    userName,
    walletBalance,
    uid,
    userPhoto,
    points,
    bankName,
    accountNumber: account,
    hasTransactionPin,
  } = user;

  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const { inflowData } = useInflowData(uid);
  const { PointsData, refData } = useReferallData(uid);
  const { trxn } = useTransactionFetch();
  const [selectedTx, setSelectedTx] = useState(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [achievementsState, setAchievementsState] = useState({});

  useEffect(() => {
    if (uid && hasTransactionPin === false) {
      const timer = setTimeout(() => {
        setIsPinSetupOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [uid, hasTransactionPin]);

  useEffect(() => {
    if (!uid) return;
    const userAchievement = doc(db, "users", uid, "achievements", "stats");
    const userData = doc(db, "users", uid);
    const subscribeStreak = onSnapshot(
      userData,
      (snapshot) => {
        const streakCount = Number(snapshot.data()?.streak || 0);
        const streakPercentage = Math.min(100, Math.round((streakCount / 20) * 100));
        setAchievementsState((prev) => ({
          ...prev,
          streak: { counts: streakCount, rate: streakPercentage },
        }));
      },
      (error) => {
        console.log("error fetching user data for streak: ", error);
      },
    );
    const subscribe = onSnapshot(
      userAchievement,
      (snapshot) => {
        const {
          firstSurvey = 0,
          pointsEarned = 0,
          billPayer = 0,
        } = snapshot.data() ?? {};
        setAchievementsState((prev) => ({
          ...prev,
          firstSurvey: {
            counts: firstSurvey,
            rate: Math.min(100, Math.ceil((firstSurvey / 1) * 100)),
          },
          pointsEarned: {
            counts: pointsEarned,
            rate: Math.min(100, Math.ceil((pointsEarned / 1000) * 100)),
          },
          billPayer: {
            counts: billPayer,
            rate: Math.min(100, Math.ceil((billPayer / 5) * 100)),
          },
        }));
      },
      () => { },
    );
    return () => {
      subscribe();
      subscribeStreak();
    };
  }, [uid]);

  const referralCount =
    user?.refferalsCount ?? user?.referralsCount ?? refData?.currentAmount ?? 0;

  const achievements = useMemo(
    () => [
      {
        title: "First Survey",
        description: "Complete your first survey",
        progress: achievementsState?.firstSurvey?.rate ?? 0,
        icon: Target,
      },
      {
        title: "Point Collector",
        description: "Earn 1,000 points",
        progress: achievementsState?.pointsEarned?.rate ?? 0,
        icon: Star,
      },
      {
        title: "Bill Payer",
        description: "Pay 5 bills successfully",
        progress: achievementsState?.billPayer?.rate ?? 0,
        icon: Zap,
      },
      {
        title: "Referral Master",
        description: "Refer 10 friends",
        progress: Math.min(100, Math.round((Number(referralCount || 0) / 10) * 100)),
        icon: Users,
      },
      {
        title: "Streak Master",
        description: "Check in 20 days straight",
        progress: achievementsState?.streak?.rate ?? 0,
        icon: Flame,
      },
    ],
    [achievementsState, referralCount],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleBalanceVisibility = () => {
    const next = !hide;
    setHide(next);
    localStorage.setItem("hideBalance", String(next));
  };

  const totalPoints = user?.points ?? PointsData?.pntsData?.currentAmount ?? 0;
  const pointsChange = PointsData?.pntsData?.percentageChange ?? 0;
  const pointsIncrease = PointsData?.pntsData?.isIncrease ?? true;
  const inflowAmount = Number(inflowData?.currentAmount || 0);
  const inflowChange = inflowData?.percentageChange ?? 0;
  const inflowIncrease = inflowData?.isIncrease ?? true;
  const refChange = refData?.percentageChange ?? 0;
  const refIncrease = refData?.isIncrease ?? true;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* MOBILE HERO: Reference Image 2 Flagship Glass Container + Satin Emerald Card */}
        <div className="lg:hidden pw-glass-hero p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-pill border border-border/80 ring-2 ring-brand-400/20 overflow-hidden bg-brand-tint shrink-0">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    className="w-full h-full object-cover object-top"
                    alt={userName || "User"}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] font-extrabold text-brand-400">
                    {(userName || "PW").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold tracking-tight text-foreground truncate leading-tight">
                  Welcome, {userName || "User"}!
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  PayWaka Member
                </p>
              </div>
            </div>
            <span className="pw-pill-gold pw-num px-2.5 py-0.5 text-[11px] shrink-0">
              <Sparkles className="h-3 w-3" />
              {formatPoints(points ?? 0)}
            </span>
          </div>

          <div className="pw-wallet-hero-card p-4 space-y-2.5">
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
                    WALLET BALANCE
                  </span>
                  <button
                    type="button"
                    onClick={toggleBalanceVisibility}
                    aria-label={hide ? "Show balance" : "Hide balance"}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-pill bg-white/15 hover:bg-white/25 text-white transition-colors"
                  >
                    {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-md border border-white/25 inline-flex items-center justify-center text-white shrink-0">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>

              <div className="pw-num text-2xl sm:text-[28px] font-extrabold tracking-tight text-white leading-tight">
                {hide ? "₦••••••" : formatNaira(walletBalance || 0)}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/20">
                <span className="text-xs font-medium text-white/95 truncate">
                  Cashback:{" "}
                  <span className="pw-num font-bold text-white">
                    {hide ? "₦••••" : formatNaira(user?.cashbackBalance || 0)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setAccountPopup(true)}
                  className="pw-glass-cta-white min-h-9 h-9 px-3.5 text-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Top Up</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP TOP HEADER */}
        <div className="hidden lg:flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-pill border border-brand-400/25 ring-2 ring-brand-400/15 bg-brand-tint overflow-hidden shrink-0">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  className="w-full h-full object-cover object-top"
                  alt={userName || "User"}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-extrabold text-brand-400">
                  {(userName || "PW").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="pw-page-title truncate">
                  Welcome back, {userName || "User"}
                </h1>
                <span className="pw-pill-gold pw-num shrink-0">
                  <Sparkles className="h-3 w-3" />
                  {formatPoints(points ?? 0)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Here is what is happening with your PayWaka wallet today.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button onClick={() => setIsModalOpen(true)}>
              <Sparkles className="h-4 w-4" />
              <span>Quick Earn</span>
            </Button>
            <Button variant="outline" onClick={() => setAccountPopup(true)}>
              <Plus className="h-4 w-4" />
              <span>Add Funds</span>
            </Button>
          </div>
        </div>

        {/* DESKTOP BENTO HERO: Reference Image 2 Wallet Card (left) + Reference Image 1 Stat Stack (right) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 pw-glass-hero p-4 flex flex-col justify-between gap-3.5">
            <div className="pw-wallet-hero-card p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
                      WALLET BALANCE
                    </span>
                    <button
                      type="button"
                      onClick={toggleBalanceVisibility}
                      aria-label={hide ? "Show balance" : "Hide balance"}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-pill bg-white/15 hover:bg-white/25 text-white transition-colors"
                    >
                      {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="pw-num text-3xl font-extrabold tracking-tight text-white">
                    {hide ? "₦••••••" : formatNaira(walletBalance || 0)}
                  </div>
                </div>
                <div className="h-11 w-11 rounded-full bg-white/15 backdrop-blur-md border border-white/25 inline-flex items-center justify-center text-white shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between gap-4 pt-3.5 border-t border-white/20">
                <div className="text-xs sm:text-sm text-white/95">
                  <span className="font-medium">Cashback Vault: </span>
                  <span className="pw-num font-bold text-white">
                    {hide ? "₦••••" : formatNaira(user?.cashbackBalance || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/wallet")}
                    className="pw-pressable min-h-9 h-9 px-3.5 rounded-pill bg-black/20 hover:bg-black/30 border border-white/25 backdrop-blur-md text-white text-xs font-bold transition-all"
                  >
                    Withdraw
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountPopup(true)}
                    className="pw-glass-cta-white min-h-9 h-9 px-4 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Top Up</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pw-panel px-3.5 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="pw-tile h-8 w-8">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground truncate">
                    {bankName || "PayWaka Virtual Bank"}
                  </span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="pw-code font-bold text-foreground tracking-wide">
                    {account || "••••••••••"}
                  </span>
                </div>
              </div>
              {account && <ReceiptCopyButton value={account} label="Account number" />}
            </div>
          </div>

          <div className="lg:col-span-5 pw-glass-hero p-4 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="pw-label">ACCOUNT PULSE</span>
              <span className="pw-chip-brand text-[10px]">Live</span>
            </div>

            <div className="space-y-2 flex-1 flex flex-col justify-center">
              <div className="pw-panel p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="pw-tile-gold h-10 w-10">
                    <Star className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="pw-label block">TOTAL POINTS</span>
                    <p className="pw-num text-lg font-extrabold text-foreground">
                      {Number(totalPoints).toLocaleString("en-NG")}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "pw-chip pw-num font-bold",
                    pointsIncrease
                      ? "text-brand-400 border-brand-400/25 bg-brand-tint"
                      : "text-destructive border-destructive/25 bg-destructive/10",
                  )}
                >
                  {pointsChange}%
                </span>
              </div>

              <div className="pw-panel p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("h-10 w-10", inflowIncrease ? "pw-tile" : "pw-tile-ruby")}>
                    {inflowIncrease ? (
                      <TrendingUp className="h-4.5 w-4.5" />
                    ) : (
                      <TrendingDown className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="pw-label block">MONTHLY INFLOW</span>
                    <p className="pw-num text-lg font-extrabold text-foreground">
                      {hide ? "₦••••••" : formatPlanPrice(inflowAmount)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "pw-chip pw-num font-bold",
                    inflowIncrease
                      ? "text-brand-400 border-brand-400/25 bg-brand-tint"
                      : "text-destructive border-destructive/25 bg-destructive/10",
                  )}
                >
                  {inflowIncrease
                    ? `+${inflowChange}%`
                    : `${inflowChange === 0 ? 0 : -inflowChange}%`}
                </span>
              </div>

              <div className="pw-panel p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="pw-tile-neutral h-10 w-10">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="pw-label block">REFERRALS</span>
                    <p className="pw-num text-lg font-extrabold text-foreground">
                      {Number(referralCount || 0).toLocaleString("en-NG")}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "pw-chip pw-num font-bold",
                    refIncrease
                      ? "text-brand-400 border-brand-400/25 bg-brand-tint"
                      : "text-destructive border-destructive/25 bg-destructive/10",
                  )}
                >
                  +{refChange}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE & TABLET QUICK STATS (scroll-px-4 aligns first card cleanly with page gutter) */}
        <div className="lg:hidden flex overflow-x-auto no-scrollbar gap-2.5 sm:grid sm:grid-cols-3 sm:gap-3.5 -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          {/* Total Points */}
          <Card className="min-w-[162px] shrink-0 sm:min-w-0 snap-start">
            <CardContent className="p-3.5 flex items-start justify-between gap-2.5">
              <div className="min-w-0 space-y-0.5">
                <span className="pw-label block">TOTAL POINTS</span>
                <p className="pw-num text-lg font-extrabold text-foreground">
                  {Number(totalPoints).toLocaleString("en-NG")}
                </p>
                <p
                  className={cn(
                    "text-caption font-semibold inline-flex items-center gap-1",
                    pointsIncrease ? "text-brand-400" : "text-destructive",
                  )}
                >
                  {pointsIncrease ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="pw-num">{pointsChange}%</span>
                </p>
              </div>
              <div className="pw-tile-gold h-9 w-9">
                <Star className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* Monthly Inflow */}
          <Card className="min-w-[162px] shrink-0 sm:min-w-0 snap-start">
            <CardContent className="p-3.5 flex items-start justify-between gap-2.5">
              <div className="min-w-0 space-y-0.5">
                <span className="pw-label block">MONTHLY INFLOW</span>
                <p className="pw-num text-lg font-extrabold text-foreground">
                  {hide ? "₦••••••" : formatPlanPrice(inflowAmount)}
                </p>
                <p
                  className={cn(
                    "text-caption font-semibold inline-flex items-center gap-1",
                    inflowIncrease ? "text-brand-400" : "text-destructive",
                  )}
                >
                  {inflowIncrease ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="pw-num">
                    {inflowIncrease
                      ? `+${inflowChange}%`
                      : `${inflowChange === 0 ? 0 : -inflowChange}%`}
                  </span>
                </p>
              </div>
              <div className={cn("h-9 w-9", inflowIncrease ? "pw-tile" : "pw-tile-ruby")}>
                {inflowIncrease ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Referrals */}
          <Card className="min-w-[162px] shrink-0 sm:min-w-0 snap-start">
            <CardContent className="p-3.5 flex items-start justify-between gap-2.5">
              <div className="min-w-0 space-y-0.5">
                <span className="pw-label block">REFERRALS</span>
                <p className="pw-num text-lg font-extrabold text-foreground">
                  {Number(referralCount || 0).toLocaleString("en-NG")}
                </p>
                <p
                  className={cn(
                    "text-caption font-semibold inline-flex items-center gap-1",
                    refIncrease ? "text-brand-400" : "text-destructive",
                  )}
                >
                  {refIncrease ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="pw-num">+{refChange}%</span>
                </p>
              </div>
              <div className="pw-tile-neutral h-9 w-9">
                <Users className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services / Quick Actions Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="pw-section-title">Services</h2>
            <span className="pw-caption">Instant delivery</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  to={action.href}
                  className="pw-card pw-pressable px-1.5 py-3 sm:p-3.5 flex flex-col items-center justify-center gap-2 text-center hover:-translate-y-0.5 hover:border-brand-400/45 transition-all min-h-[86px]"
                >
                  <div
                    className={cn(
                      "h-10 w-10",
                      action.neutral ? "pw-tile-neutral" : "pw-tile",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[11px] sm:text-caption font-bold text-foreground whitespace-nowrap">
                    {action.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Chart & Achievements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 overflow-hidden">
            <TransactionChart />
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-brand-400" />
                <span>Achievements</span>
              </CardTitle>
              <CardDescription>Track and unlock bonus points</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div key={achievement.title} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="pw-tile-neutral h-8 w-8">
                          <Icon className="h-4 w-4 text-brand-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {achievement.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      <span className="pw-num text-caption font-bold text-muted-foreground shrink-0">
                        {achievement.progress}%
                      </span>
                    </div>
                    <Progress value={achievement.progress} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions (no max-h clip or nested scroll — prevents overlap bug!) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Recent Transactions</CardTitle>
              <Link
                to="/billhistory"
                className="min-h-11 inline-flex items-center gap-1 px-2 text-sm font-semibold text-brand-400 hover:underline"
              >
                <span>View all</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {trxn && trxn.length > 0 ? (
              trxn.slice(0, 6).map((transaction) => {
                const narrationLower = String(transaction.narration || "").toLowerCase();
                const statusLower = String(transaction.status || "").toLowerCase();
                const typeLower = String(transaction.type || "").toLowerCase();
                const categoryLower = String(transaction.category || "").toLowerCase();

                const isRefund =
                  narrationLower.includes("refund") ||
                  statusLower === "refunded" ||
                  transaction.refunded === true;

                const isCredit =
                  isRefund ||
                  typeLower === "credit" ||
                  typeLower === "inflow" ||
                  typeLower === "income" ||
                  narrationLower === "credit" ||
                  categoryLower === "wallet funding" ||
                  categoryLower === "deposit" ||
                  categoryLower === "cashback" ||
                  categoryLower === "earning" ||
                  categoryLower === "referral";

                const displayTitle = getTransactionDisplayTitle(transaction);
                const statusInfo = getTransactionStatusInfo(transaction);

                let txDate = null;
                if (transaction?.createdAt?.toDate) txDate = transaction.createdAt.toDate();
                else if (transaction?.createdAt?.seconds)
                  txDate = new Date(transaction.createdAt.seconds * 1000);
                else if (transaction?.created_at) txDate = new Date(transaction.created_at);
                else if (transaction?.timestamp?.toDate) txDate = transaction.timestamp.toDate();
                else if (transaction?.timestamp) txDate = new Date(transaction.timestamp);
                else if (transaction?.date) txDate = new Date(transaction.date);
                else txDate = new Date();

                const formattedDate = isNaN(txDate.getTime())
                  ? "Recently"
                  : txDate.toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => {
                      setSelectedTx(transaction);
                      setIsTxModalOpen(true);
                    }}
                    className="pw-pressable w-full text-left flex items-center justify-between gap-3 p-3 rounded-panel border border-border bg-panel hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "h-10 w-10",
                          isCredit ? "pw-tile" : "pw-tile-ruby",
                        )}
                      >
                        {isRefund ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : isCredit ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold text-foreground truncate"
                          title={displayTitle}
                        >
                          {displayTitle}
                        </p>
                        <p className="text-caption text-muted-foreground truncate">
                          {formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <p
                        className={cn(
                          "pw-num text-sm font-bold",
                          isCredit ? "text-brand-400" : "text-foreground",
                        )}
                      >
                        {formatSignedNaira(transaction.amount || 0, isCredit)}
                      </p>
                      <ReceiptStatusPill
                        status={statusInfo.key}
                        label={statusInfo.label}
                        className="text-[9px] px-2 py-0.5"
                      />
                    </div>
                  </button>
                );
              })
            ) : (
              <StateView
                compact
                icon={Receipt}
                title="No recent transactions"
                description="Your airtime, data, bill payments, and transfers will appear here."
                actionLabel="Buy Data"
                onAction={() => navigate("/services/data")}
              />
            )}
          </CardContent>
        </Card>

        {/* Active Reward Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Active Reward Tasks</CardTitle>
                <CardDescription>Complete tasks to earn points</CardDescription>
              </div>
              <span className="pw-chip-brand">
                {rewardTasks.filter((item) => item.state !== "coming soon").length} Available
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rewardTasks.map((action) => {
                const Icon = action.icon;
                const isComingSoon = action.state === "coming soon";

                if (isComingSoon) {
                  return (
                    <div
                      key={action.id}
                      className="pw-panel p-4 flex flex-col justify-between gap-3 min-h-[124px] opacity-80"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="pw-tile-neutral h-9 w-9">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {action.title}
                            </h4>
                            <p className="text-caption text-muted-foreground mt-0.5">
                              {action.subtitle}
                            </p>
                          </div>
                        </div>
                        <span className="pw-chip shrink-0">Soon</span>
                      </div>
                      <p className="text-caption text-muted-foreground">
                        Opening soon for PayWaka members.
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={action.id}
                    className="pw-panel p-4 flex flex-col justify-between gap-3 min-h-[124px]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="pw-tile h-9 w-9">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate">
                          {action.title}
                        </h4>
                        <p className="text-caption text-muted-foreground mt-0.5">
                          {action.subtitle}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(action.href)}
                      className="w-full"
                    >
                      {action.buttonText}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <QuickEarnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {selectedTx && (
        <TransactionsModal
          transaction={selectedTx}
          isOpen={isTxModalOpen}
          onClose={() => {
            setIsTxModalOpen(false);
            setSelectedTx(null);
          }}
        />
      )}

      <TransactionPinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
        onSuccess={() => setIsPinSetupOpen(false)}
        isDismissible={true}
      />

      {accountPopup && (
        <AccountDetailsCard
          accountNumber={account || "0000000000"}
          bankName={bankName || "Your Bank"}
          open={accountPopup}
          isClose={() => setAccountPopup(false)}
        />
      )}
    </DashboardLayout>
  );
});

export default DashboardPage;

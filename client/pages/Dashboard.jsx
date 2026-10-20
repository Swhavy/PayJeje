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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/customProgress";
import Tooltip from "@/components/ui/tip";
import AccountDetailsCard from "@/components/AccountDetailsCard";

import {
  Star,
  Smartphone,
  Zap,
  Gift,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
  Sparkles,
  ArrowRight,
  TrendingUp as TrendUpIcon,
  Award,
  ChevronRight,
  CreditCard,
  Bell,
  X,
  RotateCcw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TopEarnersCarousel from "../components/TopEarnersCarousel";
import { useSelector, useDispatch } from "react-redux";
import useTransactionFetch from "@/components/useTransactionFetch";
import {
  useInflowData,
  useReferallData,
} from "@/components/useTransactionFetch";
import TransactionChart from "@/components/HistoryChart.jsx";
import { useSpinner } from "@/components/SpinnerProvider";
import { db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import QuickEarnModal from "@/components/QuickEarn";
import TransactionsModal from "@/components/TransactionsModal";
import TransactionPinSetupModal from "@/components/TransactionPinSetupModal";
import { addUserCred } from "../Features/userSlice";


const quickActions = [
  {
    title: "Earn Points",
    description: "Complete tasks",
    icon: Star,
    href: "/earn",
    color:
      "bg-gradient-to-tr from-yellow-500 to-amber-400 shadow-yellow-500/10",
  },
  {
    title: "Buy Airtime",
    description: "VTU and data",
    icon: Smartphone,
    href: "/services/airtime",
    color: "bg-gradient-to-tr from-blue-600 to-sky-400 shadow-blue-500/10",
  },
  {
    title: "Pay Bills",
    description: "Power & utilities",
    icon: Zap,
    href: "/services/bills",
    color:
      "bg-gradient-to-tr from-purple-600 to-indigo-400 shadow-purple-500/10",
  },
  {
    title: "Gift Cards",
    description: "Redeem rewards",
    icon: Gift,
    href: "/services/giftcards",
    color:
      "bg-gradient-to-tr from-emerald-600 to-green-400 shadow-green-500/10",
  },
];

const actions = [
  {
    id: 1,
    href: null,
    state: "coming soon",
    title: "Complete Survey",
    subtitle: "5 minutes • +50 points",
    icon: Star,
    bgColor: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
    buttonText: "Start Now",
    buttonColor: "bg-muted text-muted-foreground",
  },
  {
    id: 2,
    href: null,
    state: "coming soon",
    title: "Watch Video",
    subtitle: "2 minutes • +25 points",
    icon: Eye,
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-400",
    buttonText: "Watch Now",
    buttonColor: "bg-muted text-muted-foreground",
  },
  {
    id: 3,
    href: "/referrals",
    state: "available",
    title: "Invite Friend",
    subtitle: "Share link • +100 points",
    icon: Users,
    bgColor: "bg-purple-500/10",
    iconColor: "text-purple-400",
    buttonText: "Share Link",
    buttonColor: "bg-purple-600 hover:bg-purple-500 text-foreground",
  },
];

const DashboardPage = React.memo(() => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountPopup, setAccountPopup] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [hide, setHide] = useState(
    localStorage.getItem("hideBalance") === "true",
  );
  const [depositAmount, setDepositAmount] = useState("");
  const { setAppContext, appContext, alertMsg, setAlertMsg } = useSpinner();
  const [mounted, setMounted] = useState(false);
  const user = useSelector((state) => state.user.user);
  const {
    userName,
    walletBalance,
    refferalsCount,
    uid,
    userPhoto,
    points,
    bankName,
    accountReference,
    accountNumber: account,
    hasTransactionPin,
  } = user;
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const { inflowData, loading, error } = useInflowData(uid);
  const { PointsData, refData, isloading, iserror } = useReferallData(uid);
  const { trxn, loadMore } = useTransactionFetch();
  const [visibleTxCount, setVisibleTxCount] = useState(5);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [invites, setInvites] = useState({ count: 0, rate: 0 });
  const [achievementsState, setAchievementsState] = useState({});
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(() => {
    try {
      return localStorage.getItem("isInsightsExpanded") !== "false";
    } catch {
      return true;
    }
  });

  const toggleInsights = () => {
    setIsInsightsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("isInsightsExpanded", String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  useEffect(() => {
    // If the user has logged in and has not set up their 4-digit transaction PIN, prompt them
    if (uid && hasTransactionPin === false) {
      const timer = setTimeout(() => {
        setIsPinSetupOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [uid, hasTransactionPin]);

  //achievement state
  useEffect(() => {
    const userAchievement = doc(db, "users", uid, "achievements", "stats");
    const userData = doc(db, "users", uid);
    const subscribeStreak = onSnapshot(
      userData,
      (snapshot) => {
        const streakCount = snapshot.data().streak;
        const streakPercentage = (streakCount / 20) * 100;
        console.log("streak", streakCount);
        setAchievementsState((prev) => ({
          ...prev,
          streak: { counts: streakCount, rate: streakPercentage },
        }));
      },
      (error) => {
        console.log("error fetching user data for streak: ", error);
      },
    );
    const subscribe = onSnapshot(userAchievement, (snapshot) => {
      console.log("achievement data snapshot", snapshot.data());
      const {
        firstSurvey = 0,
        pointsEarned = 0,
        billPayer = 0,
      } = snapshot.data() ?? {};
      const firstSurveyPercentage = Math.ceil((firstSurvey / 1) * 100);
      const pointsEarnedPercentage = Math.ceil((pointsEarned / 1000) * 100);
      const billPayerPercentage = Math.ceil((billPayer / 5) * 100);
      setAchievementsState((prev) => ({
        ...prev,
        firstSurvey: { counts: firstSurvey, rate: firstSurveyPercentage },
        pointsEarned: { counts: pointsEarned, rate: pointsEarnedPercentage },
        billPayer: { counts: billPayer, rate: billPayerPercentage },
      }));
    });
    return () => {
      subscribe();
      subscribeStreak();
    };
  }, []);

  const achievements = useMemo(() => [
    {
      title: "First Survey",
      description: "Complete your first survey",
      progress: achievementsState?.firstSurvey?.rate,
      icon: "🎯",
    },
    {
      title: "Point Collector",
      description: "Earn 1,000 points",
      progress: achievementsState?.pointsEarned?.rate,
      icon: "⭐",
    },
    {
      title: "Bill Payer",
      description: "Pay 5 bills successfully",
      progress: achievementsState?.billPayer?.rate,
      icon: "⚡",
    },
    {
      title: "Referral Master",
      description: "Refer 10 friends",
      progress: invites?.rate,
      icon: "👥",
    },
    {
      title: "Streak Master",
      description: "Checkin 20 days straight to earn 2000 points",
      progress: achievementsState?.streak?.rate,
      icon: "🔥",
    },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    if (!depositAmount) return;
    dispatch(addUserCred(depositAmount));
    setDepositAmount("");
    setIsDepositOpen(false);
  };

  const stats = useMemo(
    () => [
      {
        title: "Total Points",
        value: user?.points ?? PointsData?.pntsData?.currentAmount ?? 0,
        change: `${PointsData?.pntsData?.percentageChange ?? 0}%`,
        isIncrease: PointsData?.pntsData?.isIncrease ?? true,
        icon: Star,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10 border-yellow-500/25",
      },
      {
        title: "Wallet Balance",
        value: `₦ ${Number(walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: Wallet,
        color: "text-primary dark:text-green-400",
        bgColor: "bg-green-500/10 border-green-500/25",
      },
      {
        title: "Monthly Inflow",
        value: `₦${Number(inflowData?.currentAmount || 0).toLocaleString()}`,
        change: `${inflowData?.percentageChange ?? 0}%`,
        isIncrease: inflowData?.isIncrease ?? true,
        icon: TrendingUp,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10 border-blue-500/25",
      },
      {
        title: "Total Referrals",
        value: user?.refferalsCount ?? user?.referralsCount ?? refData?.currentAmount ?? 0,
        change: `${refData?.percentageChange ?? 0}%`,
        isIncrease: refData?.isIncrease ?? true,
        icon: Users,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10 border-purple-500/25",
      },
    ],
    [user, PointsData, inflowData, refData, walletBalance],
  );

  if (!mounted) {
    return null;
  }

  const visibility = () => {
    setHide(!hide);
    localStorage.setItem("hideBalance", !hide);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* MOBILE VIEW FIRST DISPLAY ELEMENT: Sleek Gradient Wallet Hero */}
        <div className="block lg:hidden">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-green-950 via-card to-emerald-950 border border-emerald-500/20 p-5 shadow-2xl">
            {/* Ambient Background Glow lines */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Consistent User Avatar placeholder inside dashboard top */}
                <div className="w-11 h-11 rounded-full border border-emerald-500/30 overflow-hidden bg-muted">
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      className="w-full h-full object-cover"
                      alt="User"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary dark:text-green-400 bg-green-500/15">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-muted-foreground">
                    Welcome, {userName}!
                  </h2>
                  <p className="text-[10px] text-muted-foreground">Gold Tier Member</p>
                </div>
              </div>
              <Badge className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 flex items-center gap-1 py-1 px-2">
                <Sparkles className="h-3 w-3 animate-pulse" />
                <span>{points} pts</span>
              </Badge>
            </div>

            {/* Breathtaking Wallet Balance Gradient Bar/Card */}
            <div className="rounded-2xl bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 p-4 text-foreground shadow-xl relative overflow-hidden group">
              {/* Shimmer overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-foreground/70">
                    Wallet Balance
                  </span>
                  <div className="text-2xl font-black tracking-tight mt-1 text-foreground">
                    <span> ₦ {walletBalance ? walletBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</span>
                    <div>
                      {" "}
                      {hide ? (
                        <EyeOff className="h-5 w-5" onClick={visibility} />
                      ) : (
                        <Eye
                          className="h-5 w-5 text-green-500"
                          onClick={visibility}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Wallet className="h-4.5 w-4.5 text-foreground" />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4.5 pt-3 border-t border-white/10">
                <span className="text-[10px] text-foreground/80 font-medium">
                  Instant utility payments activated
                </span>
                <button
                  onClick={() => setAccountPopup(true)}
                  className="bg-card text-primary hover:bg-muted active:scale-95 text-[11px] font-extrabold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1 shadow-md shadow-green-900/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Top Up</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Header — Only shown in full on desktop */}
        <div className="hidden lg:flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* User profile image placeholder for consistent branding */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-400 p-0.5 shadow-xl shadow-green-500/10">
              <div className="w-full h-full rounded-2xl bg-background p-0.5 overflow-hidden">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    className="w-full h-full object-cover rounded-[14px]"
                    alt={userName}
                  />
                ) : (
                  <div className="w-full h-full rounded-[14px] flex items-center justify-center text-lg font-bold text-primary dark:text-green-400 bg-green-500/10">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                Welcome back, {userName}! 👋
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Here's what is happening with your Paywaka wallet today.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 font-bold"
              onClick={() => setIsModalOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Quick Earn
            </Button>
            <Button
              variant="outline"
              onClick={() => setAccountPopup(true)}
              className="border-border text-foreground hover:bg-muted bg-transparent rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </div>
        </div>

        {/* MOBILE ONLY: Quick Insights Bar (displays the desktop tooltip information elegantly on mobile) */}
        <div className="block lg:hidden bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3.5 mb-2 shadow-inner">
          <div
            onClick={toggleInsights}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 animate-pulse shrink-0" />
              <span>3-Month Performance Insights</span>
            </div>
            <button
              type="button"
              className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              {isInsightsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {isInsightsExpanded && (
            <div className="grid grid-cols-1 gap-2 text-xs text-foreground mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 bg-card/30 p-2 rounded-xl border border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                <span className="truncate">
                  {PointsData?.pntsData?.isIncrease
                    ? `Points increased by ${stats.find((s) => s.title === "Total Points")?.change} this past 3 months`
                    : stats.find((s) => s.title === "Total Points")?.change === "0%"
                      ? "You haven't gotten any points for the past 3 months, let's start now"
                      : `Points decreased by ${stats.find((s) => s.title === "Total Points")?.change || "0%"} this past 3 months`}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-card/30 p-2 rounded-xl border border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="truncate">
                  {inflowData?.isIncrease
                    ? `Inflow increased by +${inflowData?.percentageChange || 0}% this past 3 months`
                    : inflowData?.percentageChange === 0
                      ? "You haven't had any inflow for the past 3 months"
                      : `Inflow decreased by -${inflowData?.percentageChange}% this past 3 months`}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-card/30 p-2 rounded-xl border border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="truncate">
                  {refData?.isIncrease
                    ? `Referrals increased by +${stats.find((s) => s.title === "Total Referrals")?.change} this past 3 months`
                    : stats.find((s) => s.title === "Total Referrals")?.change === "0%"
                      ? "You haven't referred for the past 3 months, it's never too late to earn"
                      : `You are down by -${stats.find((s) => s.title === "Total Referrals")?.change} compared to the past 3 months`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid — desktop / layout view */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Points */}
          <Card className="hover:shadow-xl hover:shadow-yellow-500/5 hover:border-yellow-500/20 transition-all duration-300">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-start justify-between gap-1.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                    Total Points
                  </p>
                  <p className="text-base sm:text-xl font-bold text-foreground mt-0.5 sm:mt-1 truncate">
                    {stats.find((s) => s.title === "Total Points")?.value ?? 0}{" "}
                    pts
                  </p>
                  <Tooltip
                    content={
                      PointsData?.pntsData?.isIncrease
                        ? `Points increased by ${stats.find((s) => s.title === "Total Points")?.change} this past 3 months`
                        : `Points decreased by ${stats.find((s) => s.title === "Total Points")?.change} this past 3 months`
                    }
                  >
                    <p
                      className={`text-[9px] sm:text-[10px] flex items-center gap-0.5 mt-1 truncate cursor-default
                ${PointsData?.pntsData?.isIncrease ? "text-primary dark:text-green-400" : "text-red-400"}`}
                    >
                      {PointsData?.pntsData?.isIncrease ? (
                        <TrendingUp className="h-3 w-3 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 shrink-0" />
                      )}
                      <span>
                        {stats.find((s) => s.title === "Total Points")?.change}
                      </span>
                    </p>
                  </Tooltip>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Balance — desktop only */}
          <Card className="hidden lg:block hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/20 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground truncate">
                    Wallet Balance
                  </p>
                  <div className="flex items-center gap-2">
                    <p className={`text-xl font-black ${hide ? "blur-md" : ""} text-foreground mt-1 truncate`}>
                      {stats.find((s) => s.title === "Wallet Balance")?.value ?? "₦ 0.00"}
                    </p>
                    <div>
                      {" "}
                      {hide ? (
                        <EyeOff className="h-5 w-5" onClick={visibility} />
                      ) : (
                        <Eye
                          className="h-5 w-5 text-green-500"
                          onClick={visibility}
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-primary dark:text-green-400 flex items-center gap-0.5 mt-1 truncate">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    <span>Instant withdrawals active</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5 text-primary dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Inflow */}
          <Card className="hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/20 transition-all duration-300">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-start justify-between gap-1.5 sm:gap-3">
                <div className="min-w-0 flex flex-col">
                  <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                    Monthly Inflow
                  </p>

                  <Tooltip
                    content={`₦${Number(inflowData?.currentAmount || 0).toLocaleString()} received this month`}
                  >
                    <p className={`text-base sm:text-xl font-bold text-foreground ${hide ? "blur-md" : ""} mt-0.5 sm:mt-1 truncate cursor-default w-fit`}>
                      ₦{Number(inflowData?.currentAmount || 0).toLocaleString()}
                    </p>
                  </Tooltip>

                  <Tooltip
                    content={
                      inflowData?.isIncrease
                        ? "Inflow increased this past 3 months"
                        : "Inflow decreased this past 3 months"
                    }
                  >
                    <p
                      className={`text-[9px] sm:text-[10px] flex items-center gap-0.5 mt-1 w-fit cursor-default
              ${inflowData?.isIncrease ? "text-primary dark:text-green-400" : "text-red-400"}`}
                    >
                      {inflowData?.isIncrease ? (
                        <TrendingUp className="h-3 w-3 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 shrink-0" />
                      )}
                      <span>
                        {inflowData?.isIncrease
                          ? `+${inflowData?.percentageChange || 0}%`
                          : `${inflowData?.percentageChange === 0 ? 0 : -inflowData?.percentageChange}%`}
                      </span>
                    </p>
                  </Tooltip>
                </div>

                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0
          ${inflowData?.isIncrease
                      ? "bg-blue-500/10 border-blue-500/25"
                      : "bg-rose-500/10 border-rose-500/25"
                    }`}
                >
                  {inflowData?.isIncrease ? (
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referrals */}
          <Card className="hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/20 transition-all duration-300">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-start justify-between gap-1.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                    Total Referrals
                  </p>
                  <p className="text-base sm:text-xl font-bold text-foreground mt-0.5 sm:mt-1 truncate">
                    {user?.refferalsCount ?? user?.referralsCount ?? refData?.currentAmount ?? 0} members
                  </p>
                  <Tooltip
                    content={
                      refData?.isIncrease
                        ? `Referrals increased this past 3 months`
                        : `You are down compared to the past 3 months`
                    }
                  >
                    <p
                      className={`text-[9px] sm:text-[10px] flex items-center gap-0.5 mt-1 truncate cursor-default
                ${refData?.isIncrease ? "text-purple-400" : "text-red-400"}`}
                    >
                      {refData?.isIncrease ? (
                        <TrendingUp className="h-3 w-3 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 shrink-0" />
                      )}
                      <span>
                        +{stats.find((s) => s.title === "Total Referrals")?.change}{" "}
                        this month
                      </span>
                    </p>
                  </Tooltip>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Panel — Displayed and highly responsive */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Quick Actions
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              Tap to launch service
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:grid-cols-4 sm:gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.href}>
                <Card className="bg-card/40 border-border hover:border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${action.color} flex items-center justify-center text-foreground shrink-0 shadow-lg`}
                      >
                        <action.icon className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground text-[11px] sm:text-sm truncate leading-snug">
                          {action.title}
                        </h3>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Dynamic Charts and Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 bg-amber gap-6">
          {/* Flow metric Chart Card */}
          {/* <Card className="bg-card border-border overflow-hidden">
                    <CardContent className="p-0">
                      <div className="h-72 sm:h-80 relative">
                        <TransactionChart />
                      </div>
                    </CardContent>
                  </Card> */}
          {/* end */}
          <Card className="lg:col-span-2 bg-card/45 border-border shadow-xl overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="h-full">
                <TransactionChart />
              </div>
            </CardContent>
          </Card>

          {/* Achievements Checklist widget */}
          <Card className="bg-card/45 border-border shadow-xl">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-yellow-500" />
                <span>Achievements Progress</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Track and unlock cash points
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-1 space-y-3.5">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className="space-y-1.5 p-2 rounded-xl hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base shrink-0">
                        {achievement.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-xs truncate">
                          {achievement.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {achievement.progress}%
                    </span>
                  </div>
                  <Progress value={achievement.progress} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Transactions list */}
        {/* Recent Transactions */}
        <Card
          className={`lg:col-span-3 bg-card border-border  ${trxn?.length !== 0 ? "max-h-96 max-[900px]:max-h-80" : "max-h-36"}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">
                Recent Transactions
              </CardTitle>
              <Link to="/Transactions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-yellow-400 hover:text-foreground"
                >
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
                onClick={() => {
                  if (!trxn || trxn.length === 0) return;
                  if (visibleTxCount < trxn.length) {
                    setVisibleTxCount((prev) => prev + 5);
                  } else {
                    loadMore();
                    setVisibleTxCount((prev) => prev + 5);
                  }
                }}
                disabled={!trxn || trxn.length === 0}
              >
                More
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[40vh]">
            {/* <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                          transaction.type === "credit"
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-red-100 dark:bg-red-900"
                        }`}
                      >
                        {transaction.type === "credit" ? (
                          <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm sm:text-base">
                          {transaction.description}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {transaction.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold text-sm sm:text-base ${
                          transaction.type === "credit"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.type === "credit" ? "+" : "-"}₦
                        {transaction.amount.toLocaleString()}
                      </p>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    </div>
                  </div>
                ))}
              </div> */}

            <div className="space-y-4 overflow-y-auto">
              {trxn && trxn.length > 0 ? (
                trxn.slice(0, visibleTxCount).map((transaction) => {
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
                    categoryLower === "deposit" ||
                    categoryLower === "cashback" ||
                    categoryLower === "earning" ||
                    categoryLower === "referral";

                  let txDate = null;
                  if (transaction?.createdAt?.toDate) txDate = transaction.createdAt.toDate();
                  else if (transaction?.createdAt?.seconds) txDate = new Date(transaction.createdAt.seconds * 1000);
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
                    <div
                      key={transaction.id}
                      onClick={() => {
                        setSelectedTx(transaction);
                        setIsTxModalOpen(true);
                      }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isRefund
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : isCredit
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/15 text-red-400 border border-red-500/20"
                            }`}
                        >
                          {isRefund ? (
                            <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                          ) : isCredit ? (
                            <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm sm:text-base">
                            {transaction.narration || "Transaction"}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {formattedDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold text-sm sm:text-base ${isCredit
                            ? "text-emerald-400"
                            : "text-red-400"
                            }`}
                        >
                          {isCredit ? "+" : "-"}₦
                          {Number(transaction.amount || 0).toLocaleString()}
                        </p>
                        {isRefund ? (
                          <Badge
                            className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Refunded
                          </Badge>
                        ) : statusLower === "failed" ? (
                          <Badge
                            variant="destructive"
                            className="text-xs"
                          >
                            Failed
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No recent transactions yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Tasks & Reward Opportunities */}
        <Card className="bg-card/45 border-border shadow-xl">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">
                  Active Reward Tasks
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Participate to scale up points
                </CardDescription>
              </div>
              <Badge className="bg-green-500/15 text-primary dark:text-green-400 border border-green-500/20 py-1 px-2.5 text-[10px]">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <span>
                  {
                    actions.filter((item) => item.state !== "coming soon")
                      .length
                  }{" "}
                  Available
                </span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {actions.map((action) => {
                const Icon = action.icon;
                const isComingSoon = action.state === "coming soon";
                return (
                  <div
                    key={action.id}
                    className="p-4 rounded-2xl border border-border bg-muted/10 relative overflow-hidden flex flex-col justify-between h-36"
                  >
                    {isComingSoon && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col justify-center items-center text-center p-3 z-10">
                        <span className="text-xs font-bold text-foreground">
                          {action.title}
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground mt-1">
                          Coming Soon
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8.5 h-8.5 rounded-xl ${action.bgColor} flex items-center justify-center shrink-0`}
                      >
                        <Icon className={`h-4.5 w-4.5 ${action.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-foreground text-xs truncate">
                          {action.title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {action.subtitle}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => !isComingSoon && navigate(action.href)}
                      size="sm"
                      className={`w-full text-xs font-bold py-1.5 h-9 rounded-xl ${action.buttonColor}`}
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

      {/* Main Quick Earn Modals */}
      <QuickEarnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Transaction Details & Receipt Modal */}
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

      {/* First-Login Transaction PIN Setup Modal */}
      <TransactionPinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
        onSuccess={() => setIsPinSetupOpen(false)}
        isDismissible={true}
      />
    </DashboardLayout>
  );
});

export default DashboardPage;

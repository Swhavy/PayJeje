import { useState, useEffect } from "react";
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

import {
  Star,
  Smartphone,
  Zap,
  Gift,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Eye,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ThreeDAnimation } from "../components/3DAnimation";
import TopEarnersCarousel from "../components/TopEarnersCarousel";
import { useSelector } from "react-redux";
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

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setAppContext, appContext, alertMsg, setAlertMsg } = useSpinner();
  const uid = useSelector((state) => state.user.user.uid);
  const achieve = useSelector((state) => state.user.achievementsData);
  const [mounted, setMounted] = useState(false);
  const user = useSelector((state) => state.user.user);
  const { inflowData, loading, error } = useInflowData(user.uid);
  const { referralData, isloading, iserror } = useReferallData(user.uid);
  const { userName, walletBalance, refferalsCount } = user;
  const { trxn, loadMore } = useTransactionFetch();
  const [invites, setInvites] = useState({ count: 0, rate: 0 });
  const [achievementsState, setAchievementsState] = useState({});

  useEffect(() => {
    const userDBref = doc(db, "users", uid);
    const subscribe = onSnapshot(userDBref, (snapshot) => {
      const inviteCount = snapshot.data().refferalsCount;
      const percentage = Math.ceil((inviteCount / 10) * 100);
      setInvites((prev) => {
        prev = { count: inviteCount, rate: percentage };
        return { count: inviteCount, rate: percentage };
      });
    });
    return () => subscribe();
  }, [invites]);

  useEffect(() => {
    const userAchievement = doc(db, "users", uid, "achievements", "stats");
    const subscribe = onSnapshot(userAchievement, (snapshot) => {
      console.log("achievement data snapshot", snapshot.data());
      const { firstSurvey, pointsEarned, billPayer } = snapshot.data();
      const firstSurveyPercentage = Math.ceil((firstSurvey / 1) * 100);
      const pointsEarnedPercentage = Math.ceil((pointsEarned / 1000) * 100);
      const billPayerPercentage = Math.ceil((billPayer / 5) * 100);
      setAchievementsState((prev) => {
        prev = {
          firstSurvey: { counts: firstSurvey, rate: firstSurveyPercentage },
          pointsEarned: { counts: pointsEarned, rate: pointsEarnedPercentage },
          billPayer: { counts: billPayer, rate: billPayerPercentage },
        };
        return {
          firstSurvey: { counts: firstSurvey, rate: firstSurveyPercentage },
          pointsEarned: { counts: pointsEarned, rate: pointsEarnedPercentage },
          billPayer: { counts: billPayer, rate: billPayerPercentage },
        };
      });
    });
    return () => subscribe();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) console.log("hey", referralData);
  }, [mounted]);

  useEffect(() => {
    loading
      ? setAppContext({ ...appContext, spinner: true })
      : setAppContext({ ...appContext, spinner: false });
    if (error)
      return setAlertMsg({
        open: true,
        status: false,
        msg: error,
        statusMsg:
          "some of your transactions might appear incorrect as there was an error in displaying",
      });
  }, [loading, error]);

  const stats = [
    {
      title: "Total Points",
      value: referralData?.pntsData?.currentAmount,
      change: `${referralData?.pntsData?.percentageChange}%`,
      icon: Star,
      color: referralData?.pntsData?.isIncrease
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400",
      bgColor: referralData?.pntsData?.isIncrease
        ? "bg-yellow-100 dark:bg-yellow-900"
        : "bg-red-100 dark:bg-red-900",
    },
    {
      title: "Wallet Balance",
      value: `₦ ${walletBalance}` || "Refresh",
      //change: "+8%",
      icon: Wallet,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
    // {
    //   title: "This Month",
    //   value: "₦3,200",
    //   change: "+15%",
    //   icon: TrendingUp,
    //   color: "text-blue-600 dark:text-blue-400",
    //   bgColor: "bg-blue-100 dark:bg-blue-900",
    // },
    {
      title: "Referrals",
      value: referralData?.currentAmount,
      change: `${referralData?.percentageChange}%`,
      icon: Users,
      color: referralData?.isIncrease
        ? "text-purple-600 dark:text-purple-400"
        : "text-red-600 dark:text-red-400",
      bgColor: referralData?.isIncrease
        ? "bg-purple-100 dark:bg-purple-900"
        : "bg-red-100 dark:bg-red-900",
    },
  ];

  const quickActions = [
    {
      title: "Earn Points",
      description: "Complete surveys and tasks",
      icon: Star,
      href: "/earn",
      color: "bg-yellow-600 hover:bg-yellow-700",
    },
    {
      title: "Buy Airtime",
      description: "Purchase airtime & data",
      icon: Smartphone,
      href: "/services/airtime",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Pay Bills",
      description: "Electricity, water & more",
      icon: Zap,
      href: "/services/bills",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      title: "Gift Cards",
      description: "Redeem amazing rewards",
      icon: Gift,
      href: "/services/giftcards",
      color: "bg-green-600 hover:bg-green-700",
    },
  ];

  const recentTransactions = [
    {
      id: 1,
      type: "credit",
      description: "Survey Completion Reward",
      amount: 250,
      date: "Today, 2:30 PM",
      status: "completed",
    },
    {
      id: 2,
      type: "debit",
      description: "Airtime Purchase - MTN",
      amount: 500,
      date: "Today, 12:15 PM",
      status: "completed",
    },
    {
      id: 3,
      type: "credit",
      description: "Referral Bonus",
      amount: 100,
      date: "Yesterday, 4:45 PM",
      status: "completed",
    },
    {
      id: 4,
      type: "debit",
      description: "Electricity Bill Payment",
      amount: 1200,
      date: "Yesterday, 9:20 AM",
      status: "completed",
    },
  ];

  const achievements = [
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
  ];

  const actions = [
    {
      id: 1,
      state: "coming soon",
      title: "Complete Survey",
      subtitle: "5 minutes • +50 points",
      icon: Star,
      bgColor: "bg-yellow-100 dark:bg-yellow-900",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      buttonText: "Start Now",
      buttonColor: "bg-yellow-600 hover:bg-yellow-700",
    },
    {
      id: 2,
      state: "coming soon",
      title: "Watch Video",
      subtitle: "2 minutes • +25 points",
      icon: Eye,
      bgColor: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      buttonText: "Watch Now",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: 3,
      state: "available",
      title: "Invite Friend",
      subtitle: "Share link • +100 points",
      icon: Users,
      bgColor: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      buttonText: "Share Link",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
    },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your account today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Quick Earn
            </Button>
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted bg-transparent"
            >
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 cursor-default">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="bg-card border-border hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    {stat.title == "Wallet Balance" ? null : stat.title ==
                      "Referrals" ? (
                      <p
                        className={`text-xs ${referralData?.isIncrease ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} flex items-center mt-1`}
                      >
                        <Tooltip
                          content={
                            referralData?.isIncrease
                              ? `referrals increased this past 3months`
                              : `You are down at compared to the past 3 months`
                          }
                          className="flex flex-col"
                        >
                          <div className="flex justify-center items-center">
                            {referralData?.isIncrease ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {stat.change}
                          </div>
                        </Tooltip>
                      </p>
                    ) : (
                      <p
                        className={`text-xs ${referralData?.pntsData?.isIncrease ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}  flex items-center mt-1`}
                      >
                        <Tooltip
                          content={
                            referralData?.pntsData?.isIncrease
                              ? `points increased by ${stat.change} this past 3months`
                              : `points decreased by ${stat.change} this past 3 months`
                          }
                          className="flex flex-col"
                        >
                          <div className="flex justify-center items-center">
                            {referralData?.pntsData?.isIncrease ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {stat.change}
                          </div>
                        </Tooltip>
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon
                      className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* monthly stats */}
          <Card className="bg-card border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    This Month
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground w-24 truncate">
                    <Tooltip
                      content={`₦${inflowData?.currentAmount} received this month`}
                    >
                      ₦{inflowData?.currentAmount}
                    </Tooltip>
                  </p>
                  <Tooltip
                    content={
                      inflowData?.isIncrease
                        ? "Inflow Increased This Past 3months"
                        : "Inflow Decreased  This Past 3months"
                    }
                  >
                    <p
                      className={`text-xs ${inflowData?.isIncrease ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} flex items-center mt-1`}
                    >
                      {inflowData?.isIncrease ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {inflowData?.isIncrease
                        ? `+${inflowData?.percentageChange}%`
                        : `${inflowData?.percentageChange == 0 ? 0 : -inflowData?.percentageChange}%`}
                    </p>
                  </Tooltip>
                </div>
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${inflowData?.isIncrease ? "bg-blue-100 dark:bg-blue-900" : "bg-rose-100 dark:bg-rose-900"} flex items-center justify-center`}
                >
                  {inflowData?.isIncrease ? (
                    <TrendingUp
                      className={`h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400`}
                    />
                  ) : (
                    <TrendingDown
                      className={`h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400`}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart.js Transaction data */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="h-72 sm:h-80 relative">
              <TransactionChart />
            </div>
          </CardContent>
        </Card>

        {/* Top Earners Carousel */}

        <TopEarnersCarousel />

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.href}>
                <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 group cursor-pointer">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <action.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">
                          {action.title}
                        </h3>
                        <p className="text-xs sm:text-xs text-muted-foreground">
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card className="lg:col-span-2 bg-card border-border">
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
                  className="text-muted-foreground hover:text-foreground"
                  onClick={loadMore}
                >
                  More
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
              <div className="space-y-4 h-[60vh] overflow-y-auto">
                {trxn &&
                  trxn.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                            transaction.narration === "credit"
                              ? "bg-green-100 dark:bg-green-900"
                              : "bg-red-100 dark:bg-red-900"
                          }`}
                        >
                          {transaction.narration === "credit" ? (
                            <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm sm:text-base">
                            {transaction.narration}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleString(
                              "en-NG",
                              {
                                dateStyle: "medium", // "Sep 3, 2025"
                                timeStyle: "short", // "1:47 PM"
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold text-sm sm:text-base ${
                            transaction.narration === "credit"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {transaction.narration === "credit" ? "+" : "-"}₦
                          {transaction.amount?.toLocaleString()}
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
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Achievements</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your progress and milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {achievements.map((achievement, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{achievement.icon}</span>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {achievement.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {achievement.progress}%
                      </span>
                    </div>
                    <Progress value={achievement.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Tasks */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Today's Tasks</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Complete these to earn more points
                </CardDescription>
              </div>
              <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                <Calendar className="h-3 w-3 mr-1" />
                {
                  actions.filter((items) => items.state !== "coming soon")
                    .length
                }{" "}
                available
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <div
                    key={action.id}
                    className="p-4 rounded-lg border border-border bg-muted/50 relative hover:scale-90 transition-transform duration-700 ease-in-out cursor-default"
                  >
                    <div
                      className={`absolute bg-black/60 backdrop-blur-lg rounded-lg  m-auto inset-0 w-full font-medium text-foreground text-sm flex justify-center items-center text-${action.iconColor} ${action.state !== "coming soon" ? "hidden" : ""}`}
                    >
                      {action.title} Tasks is Coming Soon
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-8 h-8 ${action.bgColor} rounded-full flex items-center justify-center`}
                      >
                        <Icon className={`h-4 w-4 ${action.iconColor}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground text-sm">
                          {action.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {action.subtitle}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className={`w-full ${action.buttonColor} text-white`}
                    >
                      {action.buttonText}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <QuickEarnModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}

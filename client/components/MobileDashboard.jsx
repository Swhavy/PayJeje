import React, { useState, useEffect, useMemo } from "react";
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
  Home,
  Send,
  CreditCard,
  User,
  MoreHorizontal,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { addUserCred } from "@/Features/userSlice";
import QuickEarnModal from "@/components/QuickEarn";

const MobileDashboard = React.memo(() => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [achievementsState, setAchievementsState] = useState({});
  const [invites, setInvites] = useState({ count: 0, rate: 0 });

  const user = useSelector((state) => state.user.user);
  const { userName, walletBalance, refferalsCount, uid } = user;

  useEffect(() => {
    const userDBref = doc(db, "users", uid);
    const subscribe = onSnapshot(userDBref, (snapshot) => {
      const inviteCount = snapshot.data().refferalsCount;
      const points = snapshot.data()?.points ? snapshot.data().points : 0;
      dispatch(addUserCred({ points: points }));
      const percentage = Math.ceil((inviteCount / 10) * 100);
      setInvites({ count: inviteCount, rate: percentage });
    });
    return () => subscribe();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const quickActions = [
    {
      title: "Earn",
      icon: Star,
      href: "/earn",
      color: "from-yellow-500 to-orange-600",
    },
    {
      title: "Airtime",
      icon: Smartphone,
      href: "/services/airtime",
      color: "from-blue-500 to-cyan-600",
    },
    {
      title: "Bills",
      icon: Zap,
      href: "/services/bills",
      color: "from-purple-500 to-pink-600",
    },
    {
      title: "Cards",
      icon: Gift,
      href: "/services/giftcards",
      color: "from-green-500 to-emerald-600",
    },
  ];

  const recentTransactions = [
    {
      id: 1,
      type: "credit",
      description: "Survey Reward",
      amount: 250,
      date: "Today, 2:30 PM",
    },
    {
      id: 2,
      type: "debit",
      description: "MTN Airtime",
      amount: 500,
      date: "Today, 12:15 PM",
    },
    {
      id: 3,
      type: "credit",
      description: "Referral Bonus",
      amount: 100,
      date: "Yesterday",
    },
    {
      id: 4,
      type: "debit",
      description: "Electricity Bill",
      amount: 1200,
      date: "Yesterday",
    },
  ];

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Star, label: "Earn", path: "/earn" },
    { icon: Send, label: "Pay", path: "/services/bills" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section - Wallet Balance */}
      <div className="bg-gradient-to-br from-card via-accent to-green-950 px-4 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back</p>
            <h1 className="text-foreground text-2xl font-bold">{userName}</h1>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition">
            <MoreHorizontal className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-accent to-card border border-border rounded-2xl p-6 mb-6">
          <p className="text-muted-foreground text-sm mb-2">Total Balance</p>
          <h2 className="text-foreground text-4xl font-bold mb-1">
            ₦{walletBalance ? walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </h2>
          <p className="text-primary text-xs flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 12% from last month
          </p>
        </div>

        {/* Quick Stats Pills - Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="bg-card/60 border border-border rounded-full px-4 py-2 whitespace-nowrap flex-shrink-0">
            <p className="text-muted-foreground text-xs">Points</p>
            <p className="text-foreground text-sm font-semibold">2,450</p>
          </div>
          <div className="bg-card/60 border border-border rounded-full px-4 py-2 whitespace-nowrap flex-shrink-0">
            <p className="text-muted-foreground text-xs">Referrals</p>
            <p className="text-foreground text-sm font-semibold">5</p>
          </div>
          <div className="bg-card/60 border border-border rounded-full px-4 py-2 whitespace-nowrap flex-shrink-0">
            <p className="text-muted-foreground text-xs">This Month</p>
            <p className="text-foreground text-sm font-semibold">₦8,200</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* Quick Earn CTA */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-gradient-to-r from-primary to-green-600 rounded-2xl px-4 py-3 text-primary-foreground font-bold text-center hover:shadow-lg transition-shadow"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Quick Earn Now
        </button>

        {/* Quick Actions - 2x2 Grid */}
        <div>
          <h3 className="text-foreground font-bold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => (
              <Link key={idx} to={action.href}>
                <div
                  className={`bg-gradient-to-br ${action.color} rounded-2xl p-4 flex flex-col items-center justify-center h-32 hover:shadow-lg transition-shadow group`}
                >
                  <div className="bg-white/20 p-3 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                    <action.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <p className="text-foreground text-sm font-semibold text-center">
                    {action.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-foreground font-bold">Recent Activity</h3>
            <Link
              to="/Transactions"
              className="text-primary text-xs font-semibold hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:bg-muted transition"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${txn.type === "credit"
                    ? "bg-green-500/20 border border-green-500/50"
                    : "bg-red-500/20 border border-red-500/50"
                    }`}
                >
                  {txn.type === "credit" ? (
                    <ArrowDownLeft className={`w-5 h-5 text-primary dark:text-green-400`} />
                  ) : (
                    <ArrowUpRight className={`w-5 h-5 text-red-400`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">
                    {txn.description}
                  </p>
                  <p className="text-muted-foreground text-xs">{txn.date}</p>
                </div>
                <p
                  className={`text-sm font-bold flex-shrink-0 ${txn.type === "credit" ? "text-primary dark:text-green-400" : "text-red-400"}`}
                >
                  {txn.type === "credit" ? "+" : "-"}₦{txn.amount}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements Scroll */}
        <div>
          <h3 className="text-foreground font-bold mb-3">Achievements</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { icon: "🎯", title: "First Survey", progress: 100 },
              { icon: "⭐", title: "Point Collector", progress: 65 },
              { icon: "⚡", title: "Bill Payer", progress: 40 },
              { icon: "👥", title: "Referral Master", progress: 50 },
            ].map((ach, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-3 flex-shrink-0 w-28 text-center hover:border-primary/50 transition"
              >
                <p className="text-2xl mb-1">{ach.icon}</p>
                <p className="text-foreground text-xs font-semibold mb-2 truncate">
                  {ach.title}
                </p>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-green-600"
                    style={{ width: `${ach.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex flex-col items-center gap-1 py-2"
            >
              <div
                className={`p-2 rounded-xl transition ${isActive ? "bg-primary/20" : "hover:bg-muted/50"
                  }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>
              <span
                className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Quick Earn Modal */}
      <QuickEarnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
});

export default MobileDashboard;

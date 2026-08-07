import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import {
  Home,
  Star,
  Smartphone,
  Zap,
  Gift,
  Utensils,
  Users,
  Wallet,
  Settings,
  Bell,
  Search,
  Menu,
  User,
  Plus,
  Sun,
  Moon,
  Monitor,
  History,
  X,
  CreditCard,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { clearState, addUserCred } from "@/Features/userSlice";
import { useSpinner } from "@/components/SpinnerProvider";
import useSessionTimeout from "@/components/hooks/useSessionTimeout";
import NotificationDropdown from "./NotificationDropdown";
import AccountDetailsCard from "./AccountDetailsCard";
import { doc, onSnapshot } from "firebase/firestore";
import { useFCM } from "./hooks/useFCM";

const SessionGuard = ({ children, timeout }) => {
  useSessionTimeout(timeout);
  return children;
};

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [accountPopup, setAccountPopup] = useState(false);
  const [fundsAmount, setFundsAmount] = useState("");
  const user = useSelector((state) => state.user.user);
  const {
    userPhoto,
    userName,
    walletBalance,
    sessionTimeout,
    uid,
    points,
    bankName,
    accountReference,
    accountNumber: account,
  } = user;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { appContext } = useSpinner();

  const SignOut = () => {
    signOut(auth).then(() => {
      dispatch(clearState({}));
      navigate("/");
    });
  };

  //dispatch new user doc data from the DB into Redux user state
  useEffect(() => {
    const userDBRecords = doc(db, "users", uid);
    const unSubscribe = onSnapshot(userDBRecords, (snapshot) => {
      const data = snapshot.data();
      dispatch(
        addUserCred({
          ...data,
          lastLogin: data?.lastLogin?.toDate?.()?.toISOString() ?? null,
          lastBalanceCheck:
            data?.lastBalanceCheck?.toDate?.()?.toISOString() ?? null,
        }),
      );
    });
  }, [uid]);

  const sidebarItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "/logo.png",
      href: "/dashboard",
    },
    { id: "earn", label: "Earn Points", icon: Star, href: "/earn" },
    {
      id: "airtime",
      label: "Airtime",
      icon: Smartphone,
      href: "/services/airtime",
    },
    {
      id: "data",
      label: "Data",
      icon: Smartphone,
      href: "/services/data",
    },
    { id: "bills", label: "Pay Bills", icon: Zap, href: "/services/bills" },
    {
      id: "history",
      label: "Transactions",
      icon: History,
      href: "/billhistory",
    },
    {
      id: "giftcards",
      label: "Gift Cards",
      icon: Gift,
      href: "/services/giftcards",
    },
    {
      id: "meals",
      label: "Meal Coupons",
      icon: Utensils,
      href: "/services/meals",
    },
    { id: "referrals", label: "Referrals", icon: Users, href: "/referrals" },
    { id: "wallet", label: "Wallet", icon: Wallet, href: "/wallet" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  ];

  const bottomNavItems = [
    {
      id: "dashboard",
      label: "Home",
      icon: "/logo.png",
      href: "/dashboard",
    },
    { id: "earn", label: "Earn", icon: Star, href: "/earn" },
    { id: "wallet", label: "Wallet", icon: Wallet, href: "/wallet" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  ];

  const isActive = (href) => location.pathname === href;

  const handleAddFundsSubmit = (e) => {
    e.preventDefault();
    if (!fundsAmount) return;
    dispatch(addUserCred(fundsAmount));
    setFundsAmount("");
    setShowAddFundsModal(false);
  };
  // Register for FCM token and handle foreground/background messages
  useFCM(uid);
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#060d1a] text-zinc-100 font-sans">
      {/* Top Navigation — fixed height, never scrolls */}
      <nav className="border-b border-zinc-800/80 px-4 py-3.5 sticky top-0 z-40 backdrop-blur-xl bg-[#060d1a]/80 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-zinc-300 hover:bg-zinc-800/60 p-2 rounded-xl"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5.5 w-5.5" />
            </Button>
            <Link to="/dashboard" className="flex items-center">
              <img
                src="/logo.png"
                alt="PayWaka's Logo"
                width={120}
                height={120}
                className="w-28"
              />
              <span className="text-xl font-bold tracking-tight text-white hidden sm:inline-block">
                Pay
                <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">waka
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search resources, services..."
                className="pl-11 pr-4 py-2 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 w-64 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 text-sm transition-all"
              />
            </div>

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:bg-zinc-800/60 p-2 rounded-xl"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-emerald-400" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-950 border-zinc-800"
              >
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className="text-zinc-300 hover:bg-zinc-800/50"
                >
                  <Sun className="mr-2.5 h-4 w-4 text-yellow-500" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className="text-zinc-300 hover:bg-zinc-800/50"
                >
                  <Moon className="mr-2.5 h-4 w-4 text-indigo-400" />
                  <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const media = window.matchMedia(
                      "(prefers-color-scheme: dark)",
                    ).matches;
                    setTheme(media ? "dark" : "light");
                  }}
                  className="text-zinc-300 hover:bg-zinc-800/50"
                >
                  <Monitor className="mr-2.5 h-4 w-4 text-teal-400" />
                  <span>System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Consistent Top Notifications Dropdown */}
            <NotificationDropdown />

            {/* Consistent Top User Avatar/Image placeholder with consistent look */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-zinc-900 border border-zinc-800 transition-all">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-green-500/30 bg-zinc-800 shrink-0">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        alt={userName}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-green-400 bg-green-500/10">
                        {userName ? userName.slice(0, 2).toUpperCase() : "US"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-zinc-300 pr-2 hidden md:inline-block">
                    {userName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-950 border-zinc-800"
              >
                <DropdownMenuItem
                  className="text-zinc-300 hover:bg-zinc-800/50"
                  onClick={() => navigate("/settings")}
                >
                  <User className="mr-2.5 h-4 w-4 text-green-400" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-zinc-300 hover:bg-zinc-800/50"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="mr-2.5 h-4 w-4 text-zinc-400" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 hover:bg-red-500/10 font-semibold"
                  onClick={() => SignOut()}
                >
                  <LogOut className="mr-2.5 h-4 w-4 text-red-400" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Body — fills remaining height exactly, never overflows */}
      <div className="flex flex-1 overflow-hidden pb-16 lg:pb-0">
        {/* Sidebar — its own scroll context */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-zinc-950/95 lg:bg-zinc-950/45 border-r border-zinc-900 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0`}
        >
          {/* Sidebar header (only in mobile drawers) */}
          <div className="p-4 border-b border-zinc-900 flex lg:hidden items-center justify-between">
            <span className="font-bold text-white text-lg">Menu</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar nav items — scrolls if too many */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.label == "Dashboard" ? null : item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    active
                      ? "bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 text-green-400 font-semibold shadow-inner"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  {item.label == "Dashboard" ? (
                    <img
                      src={item.icon}
                      alt={item.label}
                      className={`h-10 w-14 ${active ? "text-green-400" : "text-zinc-400"}`}
                    />
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${active ? "text-green-400" : "text-zinc-400"}`}
                    />
                  )}
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sidebar footer — always pinned to bottom, never scrolls away */}
          <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex-shrink-0 space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-500">Total Points</span>
                <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                  {points} pts
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-500">Wallet Balance</span>
                <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  ₦{" "}
                  {walletBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
            <Button
              onClick={() => setAccountPopup(true)}
              size="sm"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </div>
        </aside>

        {/* Main content — only this area scrolls */}
        <main className="flex-1 overflow-y-auto bg-[#060d1a]">
          <div className="max-w-7xl mx-auto py-[1rem] px-[.5rem] sm:p-6 lg:p-8">
            {sessionTimeout ? (
              <SessionGuard timeout={sessionTimeout}>{children}</SessionGuard>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sleek Bottom Navigation Bar ($3B feel) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-900 z-40 flex items-center justify-around px-[0.05rem] gap-8">
        {bottomNavItems.map((item) => {
          const Icon = item.label == "Home" ? null : item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors relative ${
                active ? "text-green-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label == "Home" ? (
                <img src={item.icon} alt={item.label} className="h-5.5 w-5.5" />
              ) : (
                <Icon className="h-5.5 w-5.5" />
              )}
              <span className="text-[10px] font-semibold">{item.label}</span>
              {active && (
                <span className="absolute bottom-1 w-5 h-1 rounded-full bg-green-400 shadow-lg shadow-green-500/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Add Funds Modal */}
      {/*  {showAddFundsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-250">
            <button
              onClick={() => setShowAddFundsModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2">Fund Wallet</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Enter amount to fund your Paywaka wallet instantly
            </p>
            <form onSubmit={handleAddFundsSubmit} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                  ₦
                </span>
                <input
                  type="number"
                  placeholder="5,000"
                  value={fundsAmount}
                  onChange={(e) => setFundsAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-green-500 rounded-2xl py-3 pl-9 pr-4 text-white font-semibold placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full font-bold bg-green-600 hover:bg-green-500"
              >
                Proceed to Deposit
              </Button>
            </form>
          </div>
        </div>
      )} */}

      {/* Direct Dashboard Deposit Modal */}
      {accountPopup && (
        <AccountDetailsCard
          accountNumber={account || "0000000000"}
          bankName={bankName || "Your Bank"}
          open={accountPopup}
          isClose={() => setAccountPopup(false)}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

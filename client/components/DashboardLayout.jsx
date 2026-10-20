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
  RefreshCw,
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
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { useFCM } from "./hooks/useFCM";

import useCloudfunc from "./useCloudfunc";

const SessionGuard = ({ children, timeout }) => {
  useSessionTimeout(timeout);
  return children;
};

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [accountPopup, setAccountPopup] = useState(false);
  const [fundsAmount, setFundsAmount] = useState("");
  const [isRetryingWallet, setIsRetryingWallet] = useState(false);
  const { retryWalletCreation } = useCloudfunc();

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

  const hasWallet = Boolean(
    account ||
    user?.account_number ||
    accountReference ||
    user?.account_reference
  );

  const handleRetryWallet = async () => {
    if (isRetryingWallet) return;
    setIsRetryingWallet(true);
    try {
      const res = await retryWalletCreation();
      if (res?.status === "success" || res?.status === "already_exists") {
        toast.success(res.message || "Virtual wallet account provisioned successfully!");
        refreshWalletBalance(false);
      } else if (res?.status === "max_retries_exceeded") {
        toast.error(res.message || "Maximum wallet creation attempts (3) reached. Technical support team notified.", { duration: 9000 });
      } else {
        toast.error(res?.message || "Unable to create wallet account. Please try again.");
      }
    } catch (err) {
      toast.error("Error creating wallet account: " + err.message);
    } finally {
      setIsRetryingWallet(false);
    }
  };
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

  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  const refreshWalletBalance = async (showToast = true) => {
    if (!uid) return;
    setIsRefreshingBalance(true);
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        dispatch(
          addUserCred({
            ...data,
            uid,
            accountNumber:
              data.accountNumber ||
              data.account_number ||
              data.static_account ||
              null,
            bankName: data.bankName || data.bank_name || null,
            bankCode: data.bankCode || data.bank_code || null,
            accountReference:
              data.accountReference ||
              data.account_reference ||
              data.flw_ref ||
              null,
            walletBalance:
              data.walletBalance !== undefined
                ? Number(data.walletBalance)
                : null,
            lastLogin: data?.lastLogin?.toDate?.()?.toISOString() ?? null,
            lastBalanceCheck: new Date().toISOString(),
          }),
        );
        if (showToast) toast.success("Wallet balance refreshed successfully!");
      }
    } catch (err) {
      console.error("Error refreshing wallet balance:", err);
      if (showToast) toast.error("Failed to refresh wallet balance");
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  // Dispatch new user doc data from the DB into Redux user state with real-time onSnapshot listener
  useEffect(() => {
    if (!uid) return;
    const userDBRecords = doc(db, "users", uid);
    const unSubscribe = onSnapshot(
      userDBRecords,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          dispatch(
            addUserCred({
              ...data,
              uid,
              accountNumber:
                data.accountNumber ||
                data.account_number ||
                data.static_account ||
                null,
              bankName: data.bankName || data.bank_name || null,
              bankCode: data.bankCode || data.bank_code || null,
              accountReference:
                data.accountReference ||
                data.account_reference ||
                data.flw_ref ||
                null,
              walletBalance:
                data.walletBalance !== undefined
                  ? Number(data.walletBalance)
                  : null,
              lastLogin: data?.lastLogin?.toDate?.()?.toISOString() ?? null,
              lastBalanceCheck:
                data?.lastBalanceCheck?.toDate?.()?.toISOString() ?? null,
            }),
          );
        } else {
          // Auto-retry fetch if empty on initial snapshot
          setTimeout(() => refreshWalletBalance(false), 1500);
        }
      },
      (error) => {
        console.error("DashboardLayout Firestore onSnapshot error:", error);
      }
    );

    // Initial wallet balance check / retry trigger
    if (walletBalance === null || walletBalance === undefined) {
      refreshWalletBalance(false);
    }

    return () => unSubscribe();
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
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans">
      {/* Top Navigation — fixed height, never scrolls */}
      <nav className="border-b border-border px-4 py-3.5 sticky top-0 z-40 backdrop-blur-xl bg-background/80 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-muted-foreground hover:bg-muted p-2 rounded-xl"
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
              <span className="text-xl font-bold tracking-tight text-foreground hidden sm:inline-block">
                Pay
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-500 bg-clip-text text-transparent">waka
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search resources, services..."
                className="pl-11 pr-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 w-64 bg-card text-foreground placeholder:text-muted-foreground text-sm transition-all"
              />
            </div>

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:bg-muted p-2 rounded-xl"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-emerald-400" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border"
              >
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className="text-popover-foreground hover:bg-muted"
                >
                  <Sun className="mr-2.5 h-4 w-4 text-yellow-500" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className="text-popover-foreground hover:bg-muted"
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
                  className="text-popover-foreground hover:bg-muted"
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
                <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted border border-border transition-all">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-green-500/30 bg-muted shrink-0">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        alt={userName}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary dark:text-green-400 bg-primary/10">
                        {userName ? userName.slice(0, 2).toUpperCase() : "US"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground pr-2 hidden md:inline-block">
                    {userName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border"
              >
                <DropdownMenuItem
                  className="text-popover-foreground hover:bg-muted"
                  onClick={() => navigate("/settings")}
                >
                  <User className="mr-2.5 h-4 w-4 text-primary dark:text-green-400" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-popover-foreground hover:bg-muted"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />
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
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card/95 lg:bg-card/45 border-r border-border transition-all duration-300 ease-in-out flex flex-col flex-shrink-0`}
        >
          {/* Sidebar header (only in mobile drawers) */}
          <div className="p-4 border-b border-border flex lg:hidden items-center justify-between">
            <span className="font-bold text-foreground text-lg">Menu</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      ? "bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 text-primary dark:text-green-400 font-semibold shadow-inner"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  {item.label == "Dashboard" ? (
                    <img
                      src={item.icon}
                      alt={item.label}
                      className={`h-10 w-14 ${active ? "text-primary dark:text-green-400" : "text-muted-foreground"}`}
                    />
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${active ? "text-primary dark:text-green-400" : "text-muted-foreground"}`}
                    />
                  )}
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sidebar footer — always pinned to bottom, never scrolls away */}
          <div className="p-4 border-t border-border bg-card flex-shrink-0 space-y-3.5">
            {hasWallet && (
              <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 rounded-2xl p-2.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
                    {bankName || "Virtual Bank"}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary dark:text-green-400 tracking-wider">
                    {account || user?.account_number || "•••• ••••"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountPopup(true)}
                  className="text-[10px] text-primary dark:text-green-400 hover:text-foreground font-bold bg-primary/15 hover:bg-primary/30 px-2 py-1 rounded-lg border border-primary/30 transition-all shrink-0 active:scale-95"
                  title="View full account details"
                >
                  Details
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Total Points</span>
                <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                  {points ?? 0} pts
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <button
                    onClick={() => refreshWalletBalance(true)}
                    disabled={isRefreshingBalance}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-muted"
                    title="Click to refresh wallet balance"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshingBalance ? "animate-spin text-green-400" : ""}`} />
                  </button>
                </div>
                <span className="text-primary dark:text-green-400 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-mono">
                  ₦{" "}
                  {(walletBalance || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
            {!hasWallet ? (
              <Button
                onClick={handleRetryWallet}
                disabled={isRetryingWallet}
                size="sm"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold animate-pulse"
                title="Click to generate your virtual account number"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRetryingWallet ? "animate-spin" : ""}`} />
                {isRetryingWallet ? "Generating Account..." : "Generate Wallet Account"}
              </Button>
            ) : (
              <Button
                onClick={() => setAccountPopup(true)}
                size="sm"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 font-bold shadow-lg shadow-green-900/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Funds
              </Button>
            )}
          </div>
        </aside>

        {/* Full-Screen UI Blocking Overlay during Wallet Provisioning */}
        {isRetryingWallet && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
            <div className="bg-card border border-amber-500/30 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center">
                <Wallet className="h-8 w-8 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Provisioning Your Virtual Wallet</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Please wait while we connect to central banking services to assign your unique virtual account number...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main content — only this area scrolls */}
        <main className="flex-1 overflow-y-auto bg-background">
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-lg border-t border-border z-40 flex items-center justify-around px-[0.05rem] gap-8">
        {bottomNavItems.map((item) => {
          const Icon = item.label == "Home" ? null : item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors relative ${
                active ? "text-primary dark:text-green-400" : "text-muted-foreground hover:text-foreground"
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

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import {
  Home,
  Star,
  Smartphone,
  Wifi,
  Zap,
  Gift,
  Utensils,
  Users,
  Wallet,
  Settings,
  Search,
  User,
  Plus,
  Sun,
  Moon,
  Monitor,
  History,
  X,
  LogOut,
  RefreshCw,
  LayoutGrid,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { clearState, addUserCred, setBillCatalog } from "@/Features/userSlice";
import useSessionTimeout from "@/components/hooks/useSessionTimeout";
import NotificationDropdown from "./NotificationDropdown";
import AccountDetailsCard from "./AccountDetailsCard";
import ModalPortal from "@/components/ui/ModalPortal";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { useFCM } from "./hooks/useFCM";
import useCloudfunc from "./useCloudfunc";
import { formatNaira, formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

let sessionCatalogRefreshTriggered = false;

const SessionGuard = ({ children, timeout }) => {
  useSessionTimeout(timeout);
  return children;
};

const SERVICE_ROUTES = [
  { id: "airtime", label: "Buy Airtime", description: "Instant top-up", icon: Smartphone, href: "/services/airtime" },
  { id: "data", label: "Mobile Data", description: "Bundle plans", icon: Wifi, href: "/services/data" },
  { id: "bills", label: "Pay Bills", description: "Light & cable", icon: Zap, href: "/services/bills" },
  { id: "meals", label: "Meals", description: "Campus deals", icon: Utensils, href: "/services/meals" },
  { id: "giftcards", label: "Gift Cards", description: "Redeem points", icon: Gift, href: "/services/giftcards" },
  { id: "referrals", label: "Referrals", description: "Invite & earn", icon: Users, href: "/referrals" },
  { id: "history", label: "Transactions", description: "All receipts", icon: History, href: "/billhistory" },
];

export default function DashboardLayout({ children }) {
  const [isServicesSheetOpen, setIsServicesSheetOpen] = useState(false);
  const [accountPopup, setAccountPopup] = useState(false);
  const [isRetryingWallet, setIsRetryingWallet] = useState(false);
  const { retryWalletCreation, getWalletBalance, fetchDataPlans } = useCloudfunc();

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
    user?.account_reference,
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
        toast.error(
          res.message ||
          "Maximum wallet creation attempts (3) reached. Technical support team notified.",
          { duration: 9000 },
        );
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
  const { setTheme } = useTheme();
  const location = useLocation();

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
      if (accountReference) {
        try {
          await getWalletBalance(accountReference);
        } catch (fetchErr) {
          console.warn("Direct PSA balance fetch notice:", fetchErr);
        }
      }

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
            barter_id: data.barter_id || data.barterId || data.barterID || null,
            barterID: data.barter_id || data.barterId || data.barterID || null,
            walletBalance:
              data.walletBalance !== undefined && data.walletBalance !== null
                ? Number(data.walletBalance)
                : null,
            walletBalanceKobo:
              data.walletBalanceKobo !== undefined && data.walletBalanceKobo !== null
                ? Number(data.walletBalanceKobo)
                : data.walletBalance !== undefined && data.walletBalance !== null
                  ? Math.round(Number(data.walletBalance) * 100)
                  : null,
            cashbackBalance:
              data.cashbackBalance !== undefined && data.cashbackBalance !== null
                ? Number(data.cashbackBalance)
                : 0,
            cashbackBalanceKobo:
              data.cashbackBalanceKobo !== undefined && data.cashbackBalanceKobo !== null
                ? Number(data.cashbackBalanceKobo)
                : 0,
            lastLogin: data?.lastLogin?.toDate?.()?.toISOString() ?? null,
            lastBalanceCheck: new Date().toISOString(),
          }),
        );
        if (showToast) toast.success("Wallet balance refreshed from central banking records!");
      }
    } catch (err) {
      console.error("Error refreshing wallet balance:", err);
      if (showToast) toast.error("Failed to refresh wallet balance");
    } finally {
      setIsRefreshingBalance(false);
    }
  };

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
              barter_id: data.barter_id || data.barterId || data.barterID || null,
              barterID: data.barter_id || data.barterId || data.barterID || null,
              walletBalance:
                data.walletBalance !== undefined && data.walletBalance !== null
                  ? Number(data.walletBalance)
                  : null,
              walletBalanceKobo:
                data.walletBalanceKobo !== undefined && data.walletBalanceKobo !== null
                  ? Number(data.walletBalanceKobo)
                  : data.walletBalance !== undefined && data.walletBalance !== null
                    ? Math.round(Number(data.walletBalance) * 100)
                    : null,
              cashbackBalance:
                data.cashbackBalance !== undefined && data.cashbackBalance !== null
                  ? Number(data.cashbackBalance)
                  : 0,
              cashbackBalanceKobo:
                data.cashbackBalanceKobo !== undefined && data.cashbackBalanceKobo !== null
                  ? Number(data.cashbackBalanceKobo)
                  : 0,
              lastLogin: data?.lastLogin?.toDate?.()?.toISOString() ?? null,
              lastBalanceCheck:
                data?.lastBalanceCheck?.toDate?.()?.toISOString() ?? null,
            }),
          );
        } else {
          setTimeout(() => refreshWalletBalance(false), 1500);
        }
      },
      (error) => {
        console.error("DashboardLayout Firestore onSnapshot error:", error);
      },
    );

    if (walletBalance === null || walletBalance === undefined) {
      refreshWalletBalance(false);
    }

    return () => unSubscribe();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const catalogRef = doc(db, "system_cache", "bill_catalog_v1");

    const triggerBackgroundCatalogRefresh = () => {
      if (sessionCatalogRefreshTriggered) return;
      sessionCatalogRefreshTriggered = true;
      fetchDataPlans({ network: "MTN", checkFreshnessOnly: true })
        .then((res) => {
          if (res?.catalog) {
            dispatch(setBillCatalog(res.catalog));
          }
        })
        .catch(() => {
          sessionCatalogRefreshTriggered = false;
        });
    };

    const unsubCatalog = onSnapshot(
      catalogRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          dispatch(setBillCatalog(data));
          const syncedAtMs = data.lastSyncedAtIso ? Date.parse(data.lastSyncedAtIso) : 0;
          const intervalMs = (Number(data.syncIntervalHours) || 3) * 3600 * 1000;
          if (!Number.isFinite(syncedAtMs) || Date.now() - syncedAtMs > intervalMs) {
            triggerBackgroundCatalogRefresh();
          }
        } else {
          triggerBackgroundCatalogRefresh();
        }
      },
      (err) => {
        console.warn("Bill catalog snapshot listener warning:", err?.message || err);
      },
    );

    return () => unsubCatalog();
  }, [uid]);

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
    { id: "earn", label: "Earn Points", icon: Star, href: "/earn" },
    { id: "airtime", label: "Airtime", icon: Smartphone, href: "/services/airtime" },
    { id: "data", label: "Data", icon: Wifi, href: "/services/data" },
    { id: "bills", label: "Pay Bills", icon: Zap, href: "/services/bills" },
    { id: "history", label: "Transactions", icon: History, href: "/billhistory" },
    { id: "giftcards", label: "Gift Cards", icon: Gift, href: "/services/giftcards" },
    { id: "meals", label: "Meal Coupons", icon: Utensils, href: "/services/meals" },
    { id: "referrals", label: "Referrals", icon: Users, href: "/referrals" },
    { id: "wallet", label: "Wallet", icon: Wallet, href: "/wallet" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  ];

  const pathnameLower = location.pathname.toLowerCase();
  const isDataRoute =
    pathnameLower === "/services/data" || pathnameLower === "/services/data-plans";
  const isServiceOrMoreRoute =
    pathnameLower.startsWith("/services") ||
    pathnameLower === "/billhistory" ||
    pathnameLower === "/transactions" ||
    pathnameLower === "/referrals";

  const isSidebarActive = (href) => {
    const h = href.toLowerCase();
    if (h === "/services/data" && isDataRoute) return true;
    if (h === "/billhistory" && (pathnameLower === "/billhistory" || pathnameLower === "/transactions")) {
      return true;
    }
    return pathnameLower === h || (h !== "/dashboard" && pathnameLower.startsWith(h + "/"));
  };

  useFCM(uid);

  return (
    <div className="min-h-screen flex flex-col pw-app-canvas text-foreground font-sans">
      {/* Top Header: 56px frosted glass bar + safe-area top, logo aligned with desktop sidebar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/72 backdrop-blur-2xl pt-safe">
        <div className="h-14 flex items-center justify-between px-4 lg:px-0">
          {/* Brand column — matches w-64 sidebar width on desktop, left-aligned on mobile */}
          <div className="flex items-center lg:w-64 lg:shrink-0 lg:px-5 lg:h-full lg:border-r lg:border-border/70">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 min-h-11 py-1 pr-2 rounded-panel"
            >
              <img
                src="/logo.png"
                alt="PayWaka"
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0"
              />
              <span className="text-lg font-extrabold tracking-tight text-foreground">
                Pay<span className="text-brand-400">waka</span>
              </span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-end lg:justify-between lg:px-8 gap-2 sm:gap-3">
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
              <input
                type="search"
                placeholder="Search services..."
                aria-label="Search services"
                className="pw-input h-10 rounded-pill pl-10 pr-4 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Theme Toggle (44x44px tap target) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle theme"
                    className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-panel"
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-brand-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border rounded-panel">
                  <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="min-h-11 text-popover-foreground hover:bg-muted"
                  >
                    <Sun className="mr-2.5 h-4 w-4 text-warning" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="min-h-11 text-popover-foreground hover:bg-muted"
                  >
                    <Moon className="mr-2.5 h-4 w-4 text-brand-400" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const media = window.matchMedia("(prefers-color-scheme: dark)").matches;
                      setTheme(media ? "dark" : "light");
                    }}
                    className="min-h-11 text-popover-foreground hover:bg-muted"
                  >
                    <Monitor className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <NotificationDropdown />

              {/* User Avatar Menu (44x44px tap target) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="pw-tap pw-pressable flex items-center gap-2 px-1.5 rounded-pill hover:bg-muted border border-border transition-colors"
                  >
                    <div className="w-8 h-8 rounded-pill overflow-hidden border border-brand-400/30 bg-brand-tint shrink-0">
                      {userPhoto ? (
                        <img
                          src={userPhoto}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          alt={userName || "User"}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-400">
                          {userName ? userName.slice(0, 2).toUpperCase() : "PW"}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground pr-2 hidden md:inline-block max-w-[120px] truncate">
                      {userName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border rounded-panel">
                  <DropdownMenuItem
                    className="min-h-11 text-popover-foreground hover:bg-muted"
                    onClick={() => navigate("/settings")}
                  >
                    <User className="mr-2.5 h-4 w-4 text-brand-400" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11 text-popover-foreground hover:bg-muted"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11 text-destructive hover:bg-destructive/10 font-semibold"
                    onClick={SignOut}
                  >
                    <LogOut className="mr-2.5 h-4 w-4 text-destructive" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main shell: native document scroll (no h-screen / overflow-hidden) */}
      <div className="flex flex-1">
        {/* Desktop Frosted Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] border-r border-border/70 bg-card/60 backdrop-blur-2xl">
          <nav aria-label="Primary" className="flex-1 overflow-y-auto p-3 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = isSidebarActive(item.href);
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "w-full min-h-11 flex items-center gap-3 px-3.5 py-2.5 rounded-panel text-sm transition-all pw-pressable",
                    active
                      ? "bg-brand-tint/90 border border-brand-400/25 text-brand-400 font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground border border-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0",
                      active ? "text-brand-400" : "text-muted-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer: Virtual Bank widget matching Wallet page */}
          <div className="p-3.5 border-t border-border/70 bg-transparent shrink-0 space-y-3">
            {hasWallet && (
              <div className="pw-panel p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-brand-400 shrink-0" />
                    <span className="pw-label truncate">
                      {bankName || "Virtual Bank"}
                    </span>
                  </div>
                  <span className="pw-code text-sm font-bold text-foreground block mt-0.5">
                    {account || user?.account_number || "••••••••••"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountPopup(true)}
                  className="pw-pressable min-h-11 px-2.5 rounded-panel bg-brand-tint border border-brand-400/25 text-brand-400 text-caption font-bold hover:bg-brand-500/15 shrink-0"
                  title="View full account details"
                >
                  Details
                </button>
              </div>
            )}

            <div className="space-y-2 text-caption">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Points</span>
                <span className="pw-pill-gold px-2 py-0.5 text-caption pw-num">
                  {formatPoints(points ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground font-medium">Wallet</span>
                  <button
                    type="button"
                    onClick={() => refreshWalletBalance(true)}
                    disabled={isRefreshingBalance}
                    aria-label="Refresh wallet balance"
                    className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-brand-400 rounded-pill hover:bg-muted"
                    title="Refresh wallet balance"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingBalance && "animate-spin text-brand-400")} />
                  </button>
                </div>
                <span className="pw-chip-brand pw-num">
                  {formatNaira(walletBalance || 0)}
                </span>
              </div>
            </div>

            {!hasWallet ? (
              <Button
                onClick={handleRetryWallet}
                disabled={isRetryingWallet}
                size="sm"
                className="w-full"
              >
                <RefreshCw className={cn("h-4 w-4", isRetryingWallet && "animate-spin")} />
                <span>{isRetryingWallet ? "Generating..." : "Generate Account"}</span>
              </Button>
            ) : (
              <Button
                onClick={() => setAccountPopup(true)}
                size="sm"
                className="w-full"
              >
                <Plus className="h-4 w-4" />
                <span>Add Funds</span>
              </Button>
            )}
          </div>
        </aside>

        {/* Full-Screen Blocking Overlay during Wallet Provisioning */}
        {isRetryingWallet && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="pw-card p-6 max-w-sm w-full text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-pill border-4 border-warning/20 border-t-warning animate-spin flex items-center justify-center">
                <Wallet className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="text-card-title text-foreground">
                  Provisioning Your Virtual Wallet
                </h3>
                <p className="text-caption text-muted-foreground mt-1.5 leading-relaxed">
                  Please wait while we connect to banking services to assign your virtual account number...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content — standardized 16px / 24px / 32px gutters, document scrolls natively */}
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto w-full px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-6 pb-bottom-nav-safe lg:pb-8">
            {sessionTimeout ? (
              <SessionGuard timeout={sessionTimeout}>{children}</SessionGuard>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      {/* Mobile Frosted Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/80 backdrop-blur-2xl border-t border-border/75 pb-safe"
      >
        <div className="h-16 grid grid-cols-5 items-center px-2">
          <Link
            to="/dashboard"
            className={cn(
              "pw-tap pw-pressable flex flex-col items-center justify-center gap-1 h-full relative rounded-panel",
              pathnameLower === "/dashboard"
                ? "text-brand-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Home</span>
            {pathnameLower === "/dashboard" && (
              <span className="absolute bottom-1 w-5 h-0.5 rounded-pill bg-brand-400" />
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsServicesSheetOpen(true)}
            className={cn(
              "pw-tap pw-pressable flex flex-col items-center justify-center gap-1 h-full relative rounded-panel",
              isServiceOrMoreRoute
                ? "text-brand-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Services</span>
            {isServiceOrMoreRoute && (
              <span className="absolute bottom-1 w-5 h-0.5 rounded-pill bg-brand-400" />
            )}
          </button>

          <Link
            to="/earn"
            className={cn(
              "pw-tap pw-pressable flex flex-col items-center justify-center gap-1 h-full relative rounded-panel",
              pathnameLower === "/earn"
                ? "text-brand-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Earn</span>
            {pathnameLower === "/earn" && (
              <span className="absolute bottom-1 w-5 h-0.5 rounded-pill bg-brand-400" />
            )}
          </Link>

          <Link
            to="/wallet"
            className={cn(
              "pw-tap pw-pressable flex flex-col items-center justify-center gap-1 h-full relative rounded-panel",
              pathnameLower === "/wallet"
                ? "text-brand-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Wallet</span>
            {pathnameLower === "/wallet" && (
              <span className="absolute bottom-1 w-5 h-0.5 rounded-pill bg-brand-400" />
            )}
          </Link>

          <Link
            to="/settings"
            className={cn(
              "pw-tap pw-pressable flex flex-col items-center justify-center gap-1 h-full relative rounded-panel",
              pathnameLower === "/settings"
                ? "text-brand-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Settings</span>
            {pathnameLower === "/settings" && (
              <span className="absolute bottom-1 w-5 h-0.5 rounded-pill bg-brand-400" />
            )}
          </Link>
        </div>
      </nav>

      {/* Mobile Services / More Sheet */}
      <ModalPortal
        isOpen={isServicesSheetOpen}
        onClose={() => setIsServicesSheetOpen(false)}
        variant="sheet"
        noPadding
        maxWidthClass="max-w-md"
        ariaLabel="PayWaka Services"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-section-title text-foreground">Services</h2>
            <p className="text-caption text-muted-foreground">
              Choose a PayWaka service
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsServicesSheetOpen(false)}
            aria-label="Close services"
            className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 pb-safe grid grid-cols-2 gap-3 overflow-y-auto">
          {SERVICE_ROUTES.map((svc, idx) => {
            const Icon = svc.icon;
            const active = isSidebarActive(svc.href);
            return (
              <Link
                key={svc.id}
                to={svc.href}
                onClick={() => setIsServicesSheetOpen(false)}
                className={cn(
                  "pw-pressable pw-panel p-3.5 flex items-center gap-3 transition-colors",
                  active && "border-brand-500 bg-brand-tint",
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10",
                    idx % 3 === 2 ? "pw-tile-neutral" : "pw-tile",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-foreground truncate">
                    {svc.label}
                  </span>
                  <span className="block text-caption text-muted-foreground truncate">
                    {svc.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </ModalPortal>

      {/* Direct Account Details Modal */}
      {accountPopup && (
        <AccountDetailsCard
          accountNumber={account || "0000000000"}
          bankName={bankName || "Your Bank"}
          open={accountPopup}
          isClose={() => setAccountPopup(false)}
        />
      )}
    </div>
  );
}

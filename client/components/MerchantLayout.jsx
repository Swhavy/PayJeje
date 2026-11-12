import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Store,
  ScanLine,
  LayoutDashboard,
  ShieldCheck,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Building,
  LogOut,
} from "lucide-react";
import { auth, db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { addUserCred } from "@/Features/userSlice";

/**
 * MerchantLayout - Standalone PayWaka Merchant Experience Shell
 * 
 * Provides an isolated, operational merchant workspace:
 * - Obsidian/dark palette with Emerald as primary accent
 * - Strictly removes customer app navigation, wallet headers, and customer tabs
 * - Dedicated merchant navigation between Campaign Dashboard and Cashier POS
 * - Clear merchant identity, branch context, and role attribution
 * - Sign Out button routing to /merchant/login
 */
export default function MerchantLayout({
  children = null,
  activeTab = null,
  vendorInfo = null,
  isLoading = false,
  errorMsg = null,
  actions = null,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const pathname = location.pathname;

  const reduxUser = useSelector((state) => state.user?.user || {});
  const currentUid = reduxUser?.uid || auth.currentUser?.uid;

  // Real-time authoritative role & store data
  const [vendorRole, setVendorRole] = useState(reduxUser?.vendorRole || "cashier");
  const [vendorBranch, setVendorBranch] = useState(reduxUser?.vendorBranch || "");
  const [isAdmin, setIsAdmin] = useState(reduxUser?.role === "admin" || reduxUser?.isAdmin === true);

  useEffect(() => {
    let unSub = null;
    if (currentUid) {
      const userRef = doc(db, "users", currentUid);
      unSub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const r = d.role || "user";
          const adminFlag = r === "admin" || d.isAdmin === true;
          setIsAdmin(adminFlag);
          setVendorRole(d.vendorRole || "cashier");
          setVendorBranch(d.vendorBranch || "");
        }
      });
    }
    return () => {
      if (unSub) unSub();
    };
  }, [currentUid]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      dispatch(addUserCred({ uid: null, role: null, vendorId: null, vendorRole: null }));
      navigate("/merchant/login", { replace: true });
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Determine active tab automatically if not explicitly provided
  const currentTab =
    activeTab ||
    (pathname.startsWith("/merchant/meals")
      ? "dashboard"
      : pathname.startsWith("/merchant/terminal") || pathname.startsWith("/services/meals/terminal")
        ? "terminal"
        : null);

  const storeName = vendorInfo?.name || "Merchant Portal";
  const branchName = vendorInfo?.branch || vendorBranch || "Store Counter";

  return (
    <div className="min-h-screen bg-[#090b10] text-[#f1f1f4] flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* =========================================================================
          TOP MERCHANT APP BAR (DESKTOP & TABLET)
          ========================================================================= */}
      <header className="sticky top-0 z-40 border-b border-[#1b202e] bg-[#0c0e15]/90 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Store Information */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/merchant/meals" className="flex items-center flex-shrink-0">
              <img
                src="/logo.png"
                alt="PayWaka Logo"
                className="w-24 sm:w-28 h-auto object-contain"
              />
            </Link>

            <div className="h-7 w-px bg-[#1f2536] hidden sm:block flex-shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Merchant POS
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                <Building className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="font-semibold text-zinc-300">{storeName}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{branchName}</span>
              </p>
            </div>
          </div>

          {/* Central Merchant Navigation Pills (Desktop & Tablet) */}
          <nav
            aria-label="Merchant Navigation"
            className="hidden md:flex items-center bg-[#131622] border border-[#202738] p-1 rounded-xl shadow-inner"
          >
            <Link
              to="/merchant/meals"
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${currentTab === "dashboard"
                  ? "bg-emerald-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.35)]"
                  : "text-zinc-400 hover:text-white hover:bg-[#1a2030]"
                }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Campaigns & Budget</span>
            </Link>

            <Link
              to="/merchant/terminal"
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${currentTab === "terminal"
                  ? "bg-emerald-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.35)]"
                  : "text-zinc-400 hover:text-white hover:bg-[#1a2030]"
                }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Cashier POS</span>
            </Link>
          </nav>

          {/* Right Role Pill, Actions & Exit Link */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {actions}

            {/* Authoritative Role Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#23293a] text-xs font-semibold text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Role:{" "}
                <strong className="text-white capitalize font-bold">
                  {isAdmin ? "Admin" : vendorRole}
                </strong>
              </span>
            </div>

            {/* Customer Experience Exit Switcher */}
            <Link
              to="/services/meals"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2233] border border-[#23293a] text-zinc-300 hover:text-white text-xs font-semibold transition group shadow-sm"
              title="Return to PayWaka Customer App"
            >
              <Store className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
              <span className="hidden sm:inline">Customer App</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
            </Link>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg bg-[#141824] hover:bg-red-950/40 border border-[#23293a] hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition"
              title="Sign Out of Merchant Terminal"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN WORKSPACE CONTENT AREA
          ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-12">
        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm shadow-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-bold">Merchant Alert</p>
              <p className="text-xs text-red-400 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Global Loading State */}
        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-white">Connecting to Merchant Portal...</p>
            <p className="text-xs text-zinc-500">Retrieving authoritative records and terminal session</p>
          </div>
        ) : (
          children
        )}
      </main>

      {/* =========================================================================
          MOBILE DEDICATED MERCHANT BOTTOM NAVIGATION BAR
          ========================================================================= */}
      <nav
        aria-label="Mobile Merchant Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e15]/95 backdrop-blur-md border-t border-[#1b202e] px-4 py-2 flex items-center justify-around shadow-2xl"
      >
        <Link
          to="/merchant/meals"
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl text-[11px] font-bold transition-all ${currentTab === "dashboard"
              ? "text-emerald-400"
              : "text-zinc-400 hover:text-white"
            }`}
        >
          <div
            className={`p-1.5 rounded-lg ${currentTab === "dashboard"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-zinc-400"
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span>Campaigns</span>
        </Link>

        <Link
          to="/merchant/terminal"
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl text-[11px] font-bold transition-all ${currentTab === "terminal"
              ? "text-emerald-400"
              : "text-zinc-400 hover:text-white"
            }`}
        >
          <div
            className={`p-1.5 rounded-lg ${currentTab === "terminal"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-zinc-400"
              }`}
          >
            <ScanLine className="w-4 h-4" />
          </div>
          <span>Cashier POS</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl text-[11px] font-bold text-zinc-400 hover:text-red-400 transition-all"
        >
          <div className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </div>
          <span>Sign Out</span>
        </button>
      </nav>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Store,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building,
} from "lucide-react";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { addUserCred } from "@/Features/userSlice";
import { toast } from "sonner";

export default function MerchantLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fromLocation = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      const user = userCredential.user;

      // Authoritative verification against users/{uid}
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await auth.signOut();
        throw new Error("Merchant profile not found. Contact administrator.");
      }

      const userData = userSnap.data() || {};
      const isVendor = userData.role === "vendor";
      const isAdmin = userData.role === "admin" || userData.isAdmin === true;

      if (!isVendor && !isAdmin) {
        await auth.signOut();
        const msg = "Access Restricted: This account does not possess merchant privileges. Customer accounts cannot access merchant operations.";
        setErrorMsg(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      const effectiveRole = userData.vendorRole || (isAdmin ? "owner" : "cashier");
      const branchName = userData.vendorBranch || "Main Branch";
      const cashierName = userData.cashierName || userData.userName || user.displayName || "Operator";

      // Dispatch to Redux
      dispatch(
        addUserCred({
          uid: user.uid,
          userEmail: user.email,
          userName: userData.userName || cashierName,
          cashierName,
          role: userData.role || (isAdmin ? "admin" : "vendor"),
          vendorId: userData.vendorId || null,
          vendorRole: effectiveRole,
          vendorBranch: branchName,
          isAdmin,
        })
      );

      toast.success(`Welcome, ${cashierName}!`, {
        description: `Logged in as ${effectiveRole.toUpperCase()} • ${branchName}`,
      });

      // Role-based routing: Cashiers prioritize the POS terminal
      if (fromLocation && fromLocation !== "/merchant/login") {
        navigate(fromLocation, { replace: true });
      } else if (effectiveRole === "cashier") {
        navigate("/merchant/terminal", { replace: true });
      } else {
        navigate("/merchant/meals", { replace: true });
      }
    } catch (err) {
      console.error("Merchant login failed:", err);
      let friendly = "Failed to sign in. Please verify your credentials.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        friendly = "Invalid email or password. Please recheck your credentials.";
      } else if (err.code === "auth/user-not-found") {
        friendly = "No merchant account found with this email.";
      } else if (err.code === "auth/too-many-requests") {
        friendly = "Access temporarily disabled due to too many failed attempts. Try again later.";
      } else if (err.message) {
        friendly = err.message.replace("Firebase: ", "");
      }
      setErrorMsg(friendly);
      toast.error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-[#f1f1f4] flex flex-col justify-between font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background radial ambient glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />

      {/* Top Simple Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-[#1b202e]/60 bg-[#0c0e15]/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center flex-shrink-0">
            <img
              src="/logo.png"
              alt="PayWaka Logo"
              className="w-24 sm:w-28 h-auto object-contain"
            />
          </Link>
          <div className="h-7 w-px bg-[#1f2536] hidden sm:block flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Merchant Portal
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Cashier POS & Merchant Management</p>
          </div>
        </div>

        <Link
          to="/services/meals"
          className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] transition"
        >
          <span>Customer App</span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
        </Link>
      </header>

      {/* Main Login Card Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#0e111a]/90 backdrop-blur-xl border border-[#202738] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Title & Badge */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authorized Operators Only</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Merchant & POS Sign-In
            </h1>
            <p className="text-xs text-zinc-400">
              Access your counter checkout terminal and meal marketing dashboard.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div
              data-testid="merchant-login-error"
              className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cashier.vi@merchant.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Operator...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Provisioning Notice Card */}
          <div className="p-3.5 rounded-2xl bg-[#141824] border border-[#23293a] flex items-start gap-3">
            <Building className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200 block font-semibold">Account Provisioning Notice</strong>
              Merchant and cashier credentials are provided by PayWaka Administration. If you need new login credentials, contact your store owner or account manager.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-zinc-600 border-t border-[#1b202e]/40">
        PayWaka Merchant POS & Marketing Infrastructure &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

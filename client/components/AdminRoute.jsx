import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

/**
 * AdminRoute - Authoritative Route Guard for PayWaka Platform Administrator Surfaces.
 *
 * Access Policy:
 * - Strictly requires an active authenticated Firebase Auth session (no dev-mode bypass).
 * - Verifies authoritative admin role (`role === 'admin'` or `isAdmin === true`) from Firestore `users/{uid}` or custom claims.
 * - Unauthenticated visitors are redirected to `/auth/login`.
 * - Authenticated non-admin users (customers, vendors, cashiers) receive a strict 403 Access Denied screen.
 */
export default function AdminRoute({ children }) {
  const [authStatus, setAuthStatus] = useState("checking"); // "checking" | "unauthenticated" | "authorized" | "denied"
  const [userSummary, setUserSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const verifyAdminPrivilege = async (user) => {
      if (!user) {
        if (isMounted) setAuthStatus("unauthenticated");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!isMounted) return;

        if (userSnap.exists()) {
          const data = userSnap.data() || {};
          const isAdmin = data.role === "admin" || data.isAdmin === true;

          if (isAdmin) {
            setUserSummary({
              uid: user.uid,
              email: user.email || data.email || "",
              role: "admin",
            });
            setAuthStatus("authorized");
            return;
          }

          setUserSummary({
            uid: user.uid,
            email: user.email || data.email || "",
            role: data.role || "customer",
          });
        } else {
          setUserSummary({
            uid: user.uid,
            email: user.email || "",
            role: "customer",
          });
        }

        // Secondary check on Firebase Auth custom claims
        const tokenResult = await user.getIdTokenResult().catch(() => null);
        const claims = tokenResult?.claims || {};
        if (claims.role === "admin" || claims.admin === true) {
          if (isMounted) {
            setUserSummary({
              uid: user.uid,
              email: user.email || "",
              role: "admin",
            });
            setAuthStatus("authorized");
          }
          return;
        }

        if (isMounted) {
          setAuthStatus("denied");
        }
      } catch (err) {
        console.error("[AdminRoute] Failed to verify administrator privilege:", err);
        if (isMounted) {
          setAuthStatus("denied");
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        if (isMounted) setAuthStatus("unauthenticated");
      } else {
        verifyAdminPrivilege(user);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-[#090b10] text-[#f1f1f4] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-400 tracking-wide">
          Verifying Administrator Authorization...
        </p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return <Navigate to="/auth/login" replace />;
  }

  if (authStatus === "denied") {
    return (
      <div className="min-h-screen bg-[#090b10] text-[#f1f1f4] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#11141d] border border-red-500/25 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
              <Lock className="w-3 h-3" /> Restricted Surface • 403
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Administrator Access Required
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Your account{" "}
              {userSummary?.email ? (
                <span className="text-zinc-200 font-semibold">({userSummary.email})</span>
              ) : null}{" "}
              does not have platform administrator permissions to access the Merchant Provisioning Terminal.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              to="/dashboard"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#181c29] hover:bg-[#202637] border border-[#262d40] text-zinc-200 text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to App
            </Link>
            <Link
              to="/auth/login"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition"
            >
              Admin Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}


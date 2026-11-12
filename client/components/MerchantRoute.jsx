import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { ShieldAlert, ArrowLeft, Store } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";

/**
 * MerchantRoute - Authoritative Route Guard for PayWaka Merchant Terminal.
 * 
 * Access Policy:
 * - Requires authenticated Firebase session.
 * - Enforces authoritative server-verified merchant/admin role from Firestore.
 * - Ordinary customers (role == 'user' or unset) are strictly barred.
 * - Displays a secure Access Denied screen with no merchant controls, or redirects.
 */
export default function MerchantRoute({ children }) {
  const [authStatus, setAuthStatus] = useState("checking"); // "checking" | "authorized" | "denied"
  const [merchantData, setMerchantData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const verifyMerchantRole = async (user) => {
      if (!user) {
        if (isMounted) setAuthStatus("unauthenticated");
        return;
      }

      try {
        // Authoritative verification against Firestore users/{uid}
        // firestore.rules strictly forbids client-side role modification
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!isMounted) return;

        if (userSnap.exists()) {
          const data = userSnap.data() || {};
          const isVendor = data.role === "vendor" && Boolean(data.vendorId);
          const isAdmin = data.role === "admin" || data.isAdmin === true;

          if (isVendor || isAdmin) {
            setMerchantData({
              role: data.role,
              vendorId: data.vendorId || null,
              vendorRole: data.vendorRole || "cashier",
              vendorBranch: data.vendorBranch || null,
              cashierName: data.cashierName || data.userName || "Cashier",
            });
            setAuthStatus("authorized");
            return;
          }
        }

        // Check custom claims as secondary verification
        const tokenResult = await user.getIdTokenResult().catch(() => null);
        const claims = tokenResult?.claims || {};
        if (claims.role === "vendor" || claims.role === "admin" || claims.admin === true) {
          setMerchantData({
            role: claims.role || "vendor",
            vendorId: claims.vendorId || null,
            vendorRole: claims.vendorRole || "cashier",
          });
          setAuthStatus("authorized");
          return;
        }

        setAuthStatus("denied");
      } catch (err) {
        console.error("[MerchantRoute] Verification error:", err);
        if (isMounted) setAuthStatus("denied");
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setAuthStatus("unauthenticated");
      } else {
        verifyMerchantRole(user);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (authStatus === "checking") {
    return (
      <MerchantLayout isLoading />
    );
  }

  if (authStatus === "unauthenticated") {
    return <Navigate to="/merchant/login" replace />;
  }

  if (authStatus === "denied") {
    return (
      <MerchantLayout activeTab={null}>
        <div
          data-testid="merchant-access-denied"
          className="w-full max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-[#0e111a] border border-red-500/30 rounded-3xl text-center shadow-2xl animate-fadeIn"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Merchant Access Restricted
          </h1>

          <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            The PayWaka Merchant Terminal is strictly restricted to authorized restaurant cashiers, managers, and administrators. Regular customer accounts cannot access terminal operations or cashier provisioning.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/merchant/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 w-full sm:w-auto"
            >
              <Store className="w-4 h-4" />
              <span>Merchant Sign-In</span>
            </Link>
            <Link
              to="/services/meals"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#161a26] hover:bg-[#1e2333] text-zinc-300 hover:text-white font-bold text-sm transition-all border border-[#252c3f] w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Customer Meal Rewards</span>
            </Link>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return typeof children === "function" ? children(merchantData) : children;
}

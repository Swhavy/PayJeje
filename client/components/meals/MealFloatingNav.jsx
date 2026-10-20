import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Store, Ticket, ScanLine } from "lucide-react";
import { auth, db, doc, onSnapshot, collection, query, where } from "@/firebaseConfig";

export default function MealFloatingNav({ className = "" }) {
  const location = useLocation();
  const pathname = location.pathname;

  const reduxUser = useSelector((state) => state.user?.user);
  const currentUid = reduxUser?.uid || auth.currentUser?.uid;

  const [userRole, setUserRole] = useState(reduxUser?.role || "user");
  const [activeVouchersCount, setActiveVouchersCount] = useState(0);

  // Authoritative real-time role and voucher tracking
  useEffect(() => {
    let unSubUser = null;
    let unSubVouchers = null;

    const setupListeners = (uid) => {
      if (!uid) {
        setUserRole("user");
        setActiveVouchersCount(0);
        return;
      }

      // 1. Authoritative user role listener
      const userRef = doc(db, "users", uid);
      unSubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserRole(data.role || "user");
        }
      });

      // 2. Active meal vouchers live count for authenticated user
      const vchQuery = query(
        collection(db, "meal_vouchers"),
        where("userId", "==", uid),
        where("status", "==", "active")
      );
      unSubVouchers = onSnapshot(vchQuery, (snap) => {
        const nowMs = Date.now();
        // Count unexpired active vouchers
        const validActive = snap.docs.filter((d) => {
          const data = d.data();
          const expiresMs = data.expiresAt?.toMillis
            ? data.expiresAt.toMillis()
            : data.expiresAt?.toDate
            ? data.expiresAt.toDate().getTime()
            : new Date(data.expiresAt || 0).getTime();
          return expiresMs > nowMs;
        });
        setActiveVouchersCount(validActive.length);
      }, () => {
        // Fallback silently if query index is pending
        setActiveVouchersCount(0);
      });
    };

    if (currentUid) {
      setupListeners(currentUid);
    } else {
      const unsubAuth = auth.onAuthStateChanged((fbUser) => {
        if (fbUser?.uid) {
          setupListeners(fbUser.uid);
        } else {
          setUserRole("user");
          setActiveVouchersCount(0);
        }
      });
      return () => {
        unsubAuth();
        if (unSubUser) unSubUser();
        if (unSubVouchers) unSubVouchers();
      };
    }

    return () => {
      if (unSubUser) unSubUser();
      if (unSubVouchers) unSubVouchers();
    };
  }, [currentUid]);

  const isMarketplace = pathname === "/services/meals" || pathname === "/services/meals/";
  const isVouchers = pathname.startsWith("/services/meals/vouchers") || pathname.startsWith("/services/meals/voucher/");
  const isTerminal = pathname.startsWith("/services/meals/terminal") || pathname.startsWith("/merchant/meals");

  // Merchant terminal tab is ONLY visible to verified cashiers (role == 'vendor') and administrators (role == 'admin')
  const isMerchantOrAdmin = userRole === "vendor" || userRole === "admin";

  return (
    <nav
      aria-label="Meal Rewards Navigation"
      className={`w-full max-w-md sm:w-auto mx-auto sm:mx-0 flex items-center justify-between p-1 rounded-full bg-[#16181d] border border-[#282a2e] shadow-lg text-[#e2e2e8] ${className}`}
    >
      <Link
        to="/services/meals"
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
          isMarketplace
            ? "bg-[#ff6b00] text-white shadow-[0_2px_12px_rgba(255,107,0,0.35)]"
            : "text-zinc-400 hover:text-white hover:bg-[#202227]"
        }`}
      >
        <Store className="w-4 h-4 flex-shrink-0" />
        <span className="whitespace-nowrap">Marketplace</span>
      </Link>

      <Link
        to="/services/meals/vouchers"
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 relative ${
          isVouchers
            ? "bg-[#ff6b00] text-white shadow-[0_2px_12px_rgba(255,107,0,0.35)]"
            : "text-zinc-400 hover:text-white hover:bg-[#202227]"
        }`}
      >
        <Ticket className="w-4 h-4 flex-shrink-0" />
        <span className="whitespace-nowrap">My Vouchers</span>
        {activeVouchersCount > 0 && (
          <span
            className={`min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center leading-none shadow-sm flex-shrink-0 ${
              isVouchers ? "bg-white text-[#ff6b00]" : "bg-[#004729] text-[#44e092] border border-[#44e092]/30"
            }`}
          >
            {activeVouchersCount}
          </span>
        )}
      </Link>

      {/* Merchant Terminal Tab: Exclusively exposed to authorized cashiers and admins */}
      {isMerchantOrAdmin && (
        <Link
          to="/services/meals/terminal"
          data-testid="merchant-terminal-tab"
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
            isTerminal
              ? "bg-[#44e092] text-[#091e14] shadow-[0_2px_12px_rgba(68,224,146,0.35)] font-black"
              : "text-zinc-400 hover:text-white hover:bg-[#202227]"
          }`}
        >
          <ScanLine className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">Terminal</span>
        </Link>
      )}
    </nav>
  );
}

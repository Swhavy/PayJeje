import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ScanLine,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Store,
  Receipt,
  Check,
  Copy,
  RefreshCw,
  Search,
  ShieldCheck,
  Building,
  UserCheck,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import MealFloatingNav from "@/components/meals/MealFloatingNav";
import { FICTIONAL_VENDORS } from "@/fixtures/mealFixtures";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { auth, db, doc, onSnapshot } from "@/firebaseConfig";

export default function MealMerchantTerminal() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user || {});
  const currentUid = user?.uid || auth.currentUser?.uid;

  const {
    validateMealVoucherForMerchant,
    redeemMealVoucherMerchant,
    setDemoCashierRole,
  } = useCloudfunc();

  // Active Merchant & Cashier Session
  const [selectedVendorId, setSelectedVendorId] = useState(user?.vendorId || "paywaka-demo-foods");
  const [cashierBranch, setCashierBranch] = useState(user?.vendorBranch || "Victoria Island • Lagos");
  const [cashierName, setCashierName] = useState(user?.cashierName || user?.fullName || "Assigned Cashier");
  const [cashierRoleActive, setCashierRoleActive] = useState(user?.role === "vendor" || user?.role === "admin");
  const [isAdmin, setIsAdmin] = useState(user?.role === "admin" || user?.isAdmin === true);
  const [isSettingRole, setIsSettingRole] = useState(false);

  // Authoritative real-time sync with user's Firestore profile
  useEffect(() => {
    let unSubDoc = null;

    const setupListener = (uid) => {
      if (!uid) return;
      const userRef = doc(db, "users", uid);
      unSubDoc = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const role = d.role || "user";
          const adminFlag = role === "admin" || d.isAdmin === true;
          setIsAdmin(adminFlag);

          if (role === "vendor" && d.vendorId) {
            setCashierRoleActive(true);
            setSelectedVendorId(d.vendorId);
            if (d.vendorBranch) setCashierBranch(d.vendorBranch);
            if (d.cashierName) setCashierName(d.cashierName);
            else if (d.fullName) setCashierName(d.fullName);
          } else if (adminFlag) {
            setCashierRoleActive(true);
          } else {
            setCashierRoleActive(false);
          }
        }
      });
    };

    if (currentUid) {
      setupListener(currentUid);
    } else {
      const unSubAuth = auth.onAuthStateChanged((fbUser) => {
        if (fbUser?.uid) {
          setupListener(fbUser.uid);
        }
      });
      return () => {
        unSubAuth();
        if (unSubDoc) unSubDoc();
      };
    }

    return () => {
      if (unSubDoc) unSubDoc();
    };
  }, [currentUid]);

  // Voucher Lookup & Input
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [customerClaimPin, setCustomerClaimPin] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Bill Amount & Calculation
  const [billAmountInput, setBillAmountInput] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [redemptionError, setRedemptionError] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const selectedVendor =
    FICTIONAL_VENDORS.find((v) => v.id === selectedVendorId) || FICTIONAL_VENDORS[0];

  // Auto-activate or sync cashier role in demo mode
  const handleActivateCashierRole = async (targetVendorId) => {
    const vId = targetVendorId || selectedVendorId;
    setIsSettingRole(true);
    try {
      const vendor = FICTIONAL_VENDORS.find((v) => v.id === vId) || FICTIONAL_VENDORS[0];
      const res = await setDemoCashierRole({
        vendorId: vId,
        branch: vendor.branch || cashierBranch,
        cashierName: cashierName,
      });
      if (res?.success) {
        setCashierRoleActive(true);
        setSelectedVendorId(vId);
        toast.success(`Active cashier session for ${vendor.name}`);
      }
    } catch (err) {
      console.error("Cashier role activation failed:", err);
      toast.error(err.message || "Failed to activate cashier session.");
    } finally {
      setIsSettingRole(false);
    }
  };

  const handleDeactivateCashierRole = async () => {
    setIsSettingRole(true);
    try {
      await setDemoCashierRole({
        vendorId: "customer_only",
        branch: "None",
        cashierName: "Customer Mode",
      });
      setCashierRoleActive(false);
      toast.info("Switched to Customer mode (Cashier privileges removed).");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSettingRole(false);
    }
  };

  // Perform Server-Side Voucher Validation
  const handleValidateVoucher = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = voucherCodeInput.trim();
    if (!cleanCode) {
      toast.warning("Please enter or scan a voucher code.");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setValidationError(null);
    setRedemptionSuccess(null);
    setRedemptionError(null);

    try {
      const res = await validateMealVoucherForMerchant({
        voucherCodeOrId: cleanCode,
        vendorId: selectedVendorId,
      });

      if (res?.success) {
        setValidationResult(res);
        // Pre-fill minimum spend if bill amount is empty
        if (!billAmountInput && res.voucher?.minSpendNaira) {
          setBillAmountInput(String(res.voucher.minSpendNaira));
        }
      } else {
        throw new Error(res?.message || "Validation failed.");
      }
    } catch (err) {
      console.error("Voucher validation error:", err);
      const friendly =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Could not validate voucher. Please check the code and try again.";
      setValidationError(friendly);
    } finally {
      setIsValidating(false);
    }
  };

  // Bill Calculations
  const billAmount = Number(billAmountInput || 0);
  const minSpend = Number(validationResult?.voucher?.minSpendNaira || 0);
  const nominalDiscount = Number(validationResult?.voucher?.discountNaira || 0);
  const actualDiscount = Math.min(nominalDiscount, billAmount);
  const finalPayable = Math.max(0, billAmount - actualDiscount);
  const isBillValid = billAmount >= minSpend && billAmount > 0;

  // Execute Final Atomic Redemption
  const handleExecuteRedemption = async () => {
    if (!validationResult?.voucher || !isBillValid) return;

    setIsRedeeming(true);
    setRedemptionError(null);

    try {
      const idempotencyKey = `red_${selectedVendorId}_${validationResult.voucher.id}_${Date.now()}`;
      const res = await redeemMealVoucherMerchant({
        voucherCodeOrId: validationResult.voucher.id,
        vendorId: selectedVendorId,
        vendorBranch: cashierBranch,
        billAmountNaira: billAmount,
        voucherPin: customerClaimPin.trim() || undefined,
        idempotencyKey,
      });

      if (res?.success) {
        setRedemptionSuccess(res);
        setShowConfirmModal(false);
        setValidationResult(null);
        setVoucherCodeInput("");
        setCustomerClaimPin("");
        toast.success("Meal Voucher successfully redeemed!");
      } else {
        throw new Error(res?.message || "Failed to redeem voucher.");
      }
    } catch (err) {
      console.error("Redemption error:", err);
      const friendly =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Redemption failed. Please verify the bill total and PIN.";
      setRedemptionError(friendly);
      toast.error(friendly);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleResetTerminal = () => {
    setValidationResult(null);
    setValidationError(null);
    setRedemptionSuccess(null);
    setRedemptionError(null);
    setVoucherCodeInput("");
    setCustomerClaimPin("");
    setBillAmountInput("");
  };

  return (
    <DashboardLayout>
      <div className="w-full bg-[#111317] text-[#e2e2e8] font-sans pb-28 sm:pb-32 rounded-2xl sm:rounded-3xl border border-[#282a2e]/60 p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* TOP HEADER & NAVIGATION */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#282a2e]/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/services/meals")}
                className="w-9 h-9 rounded-full bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                aria-label="Back to Meals Marketplace"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Merchant Terminal
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ff6b00]/20 text-[#ff6b00] border border-[#ff6b00]/30">
                    Phase 5 Demo
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Authoritative voucher lookup, discount calculation & atomic redemption
                </p>
              </div>
            </div>

            <MealFloatingNav />
          </div>

          {/* DEMO CASHIER SESSION CONTROL BAR */}
          <div className="w-full bg-[#16181d] border border-[#282a2e] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-[#ff6b00]/30 flex items-center justify-center text-xl flex-shrink-0">
                {selectedVendor.logoEmoji || "🍗"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {selectedVendor.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cashierRoleActive
                        ? "bg-[#004729] text-[#44e092] border border-[#44e092]/30"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cashierRoleActive ? "bg-[#44e092] animate-pulse" : "bg-zinc-500"
                      }`}
                    />
                    {cashierRoleActive ? "Cashier Authorized" : "Not Initialized"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Branch: <span className="text-zinc-300 font-medium">{selectedVendor.branch}</span> • Staff:{" "}
                  <span className="text-zinc-300 font-medium">{cashierName}</span>
                </p>
              </div>
            </div>

            {/* DEMO CASHIER / VENDOR SELECTOR */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                aria-label="Select Demo Merchant"
                value={selectedVendorId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedVendorId(newId);
                  if (isAdmin) {
                    handleActivateCashierRole(newId);
                  }
                }}
                disabled={isSettingRole || (!isAdmin && cashierRoleActive)}
                className="flex-1 sm:flex-initial bg-[#111317] text-xs font-semibold text-zinc-200 border border-[#282a2e] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff6b00]"
              >
                {FICTIONAL_VENDORS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              {isAdmin ? (
                !cashierRoleActive ? (
                  <button
                    type="button"
                    onClick={() => handleActivateCashierRole(selectedVendorId)}
                    disabled={isSettingRole}
                    className="px-3.5 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#ff7a1a] text-white text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap"
                  >
                    {isSettingRole ? "Connecting..." : "Enable Cashier"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeactivateCashierRole}
                    disabled={isSettingRole}
                    title="Remove cashier role to test permission denial"
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold transition-all border border-zinc-700 whitespace-nowrap"
                  >
                    Customer Mode
                  </button>
                )
              ) : cashierRoleActive ? (
                <span className="px-3 py-1.5 rounded-xl bg-[#004729]/60 border border-[#44e092]/30 text-[#44e092] text-xs font-bold whitespace-nowrap flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Assigned Cashier
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-bold whitespace-nowrap">
                  Unauthorized
                </span>
              )}
            </div>
          </div>

          {/* REDEMPTION SUCCESS STATE */}
          {redemptionSuccess && (
            <div className="w-full bg-gradient-to-b from-[#091e14] via-[#0d2118] to-[#121915] border border-[#44e092]/40 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-[0_8px_32px_rgba(0,71,41,0.25)] animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-[#004729]/80 border border-[#44e092]/50 flex items-center justify-center text-[#44e092] shadow-lg">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Voucher Redeemed Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Promotional discount verified and recorded authoritatively on PayWaka.
                </p>
              </div>

              {/* AUDIT SUMMARY CARD */}
              <div className="w-full max-w-md bg-[#06160e]/80 border border-[#44e092]/30 rounded-2xl p-5 flex flex-col gap-3.5 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-[#44e092]/20">
                  <span className="text-xs text-zinc-400">Auditable Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[#44e092]">
                      {redemptionSuccess.redemptionReference}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy Redemption Reference"
                      onClick={() => {
                        navigator.clipboard.writeText(redemptionSuccess.redemptionReference);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2000);
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedRef ? <Check className="w-3.5 h-3.5 text-[#44e092]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Voucher Code</span>
                  <span className="font-mono font-semibold text-white">
                    {redemptionSuccess.voucherCode}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Merchant</span>
                  <span className="font-semibold text-white">
                    {redemptionSuccess.vendorName}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total Customer Bill</span>
                  <span className="font-bold text-white">
                    ₦{Number(redemptionSuccess.billAmountNaira || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">PayWaka Discount Deducted</span>
                  <span className="font-black text-[#ff6b00]">
                    -₦{Number(redemptionSuccess.discountNaira || 0).toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#44e092]/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">Amount Paid by Customer</span>
                  <span className="text-base font-black text-[#44e092]">
                    ₦{Number(redemptionSuccess.finalPayableNaira || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetTerminal}
                className="w-full max-w-md py-3 rounded-xl bg-[#ff6b00] hover:bg-[#ff7a1a] text-white text-sm font-bold transition-all shadow-lg active:scale-95"
              >
                Scan Next Customer Voucher
              </button>
            </div>
          )}

          {/* MAIN VOUCHER LOOKUP & VALIDATION FORM */}
          {!redemptionSuccess && (
            <div className="w-full bg-[#16181d] border border-[#282a2e] rounded-3xl p-5 sm:p-7 flex flex-col gap-6 shadow-xl">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-[#ff6b00]" />
                  <span>Customer Voucher Lookup</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Scan customer QR code or enter voucher token displayed on the ticket
                </p>
              </div>

              <form onSubmit={handleValidateVoucher} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter PWK-XXXX-YYYY or Voucher ID..."
                    className="w-full bg-[#111317] border border-[#282a2e] focus:border-[#ff6b00] rounded-xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isValidating || !voucherCodeInput.trim()}
                  className="px-6 py-3 rounded-xl bg-[#ff6b00] hover:bg-[#ff7a1a] disabled:opacity-50 text-white text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Voucher</span>
                    </>
                  )}
                </button>
              </form>

              {/* QUICK CODE HELPERS FOR DEMO SPEED */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#282a2e]/60">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                  Demo Samples:
                </span>
                <button
                  type="button"
                  onClick={() => setVoucherCodeInput("PWK-MEAL-8361")}
                  className="px-2.5 py-1 rounded-lg bg-[#111317] hover:bg-[#202227] border border-[#282a2e] text-[11px] font-mono text-zinc-300"
                >
                  PWK-MEAL-8361
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherCodeInput("PWK-IZZA-9591")}
                  className="px-2.5 py-1 rounded-lg bg-[#111317] hover:bg-[#202227] border border-[#282a2e] text-[11px] font-mono text-zinc-300"
                >
                  PWK-IZZA-9591
                </button>
              </div>

              {/* VALIDATION ERROR DISPLAY */}
              {validationError && (
                <div className="w-full bg-red-950/30 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-xs">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-red-300">Voucher Lookup Failed</span>
                    <span>{validationError}</span>
                  </div>
                </div>
              )}

              {/* VALIDATION RESULT CARD */}
              {validationResult && (
                <div
                  className={`w-full rounded-2xl p-5 border flex flex-col gap-4 animate-fadeIn ${
                    validationResult.eligible
                      ? "bg-[#091e14]/90 border-[#44e092]/40"
                      : "bg-[#211214]/90 border-red-500/40"
                  }`}
                >
                  {/* Status Banner */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      {validationResult.eligible ? (
                        <CheckCircle className="w-5 h-5 text-[#44e092]" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      )}
                      <span
                        className={`text-sm font-bold ${
                          validationResult.eligible ? "text-[#44e092]" : "text-amber-300"
                        }`}
                      >
                        {validationResult.eligible ? "ELIGIBLE FOR REDEMPTION" : "INELIGIBLE VOUCHER"}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-zinc-300">
                      {validationResult.voucher.voucherCode}
                    </span>
                  </div>

                  {/* Voucher Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#111317]/80 rounded-xl p-3 border border-[#282a2e]">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                        Promotional Discount
                      </span>
                      <span className="text-base font-black text-[#ff6b00]">
                        ₦{Number(validationResult.voucher.discountNaira || 0).toLocaleString()} OFF
                      </span>
                    </div>

                    <div className="bg-[#111317]/80 rounded-xl p-3 border border-[#282a2e]">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                        Min. Order Required
                      </span>
                      <span className="text-base font-black text-white">
                        ₦{Number(validationResult.voucher.minSpendNaira || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#111317]/80 rounded-xl p-3 border border-[#282a2e]">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                        Current Status
                      </span>
                      <span className="text-base font-bold capitalize text-white">
                        {validationResult.voucher.status}
                      </span>
                    </div>

                    <div className="bg-[#111317]/80 rounded-xl p-3 border border-[#282a2e]">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                        Remaining Budget
                      </span>
                      <span className="text-base font-bold text-[#44e092]">
                        ₦{Number(validationResult.campaign.remainingBudgetNaira || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Ineligible Explanation */}
                  {!validationResult.eligible && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{validationResult.validationMessage}</span>
                    </div>
                  )}

                  {/* BILL ENTRY & REDEMPTION SECTION (ONLY WHEN ELIGIBLE) */}
                  {validationResult.eligible && (
                    <div className="pt-3 border-t border-zinc-800 flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Customer Bill Total Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-zinc-300">
                            Enter Customer Bill Total (₦) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={billAmountInput}
                            onChange={(e) => setBillAmountInput(e.target.value)}
                            placeholder={`Minimum ₦${minSpend.toLocaleString()}`}
                            className="bg-[#111317] border border-[#282a2e] focus:border-[#44e092] rounded-xl px-4 py-2.5 text-base font-bold text-white placeholder:text-zinc-600 focus:outline-none"
                          />
                          {billAmount > 0 && !isBillValid && (
                            <span className="text-[11px] text-amber-400 font-medium">
                              ⚠️ Bill total must be at least ₦{minSpend.toLocaleString()} to apply this coupon.
                            </span>
                          )}
                        </div>

                        {/* Customer 4-Digit Voucher PIN Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-zinc-300">
                            Customer Voucher PIN (from Ticket)
                          </label>
                          <input
                            type="password"
                            maxLength="4"
                            value={customerClaimPin}
                            onChange={(e) => setCustomerClaimPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="4-digit cashier PIN"
                            className="bg-[#111317] border border-[#282a2e] focus:border-[#ff6b00] rounded-xl px-4 py-2.5 text-base font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none tracking-widest"
                          />
                          <span className="text-[11px] text-zinc-400">
                            Cashier claim PIN displayed on customer's active voucher ticket
                          </span>
                        </div>
                      </div>

                      {/* Live Calculation Preview */}
                      {billAmount > 0 && (
                        <div className="bg-[#111317] border border-[#282a2e] rounded-xl p-4 flex flex-col gap-2 text-xs">
                          <div className="flex justify-between text-zinc-400">
                            <span>Subtotal Order Amount</span>
                            <span className="font-semibold text-white">₦{billAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[#ff6b00]">
                            <span>Coupon Discount Deduction</span>
                            <span className="font-bold">-₦{actualDiscount.toLocaleString()}</span>
                          </div>
                          <div className="pt-2 border-t border-[#282a2e] flex justify-between text-sm font-bold text-white">
                            <span>Final Amount Payable by Customer</span>
                            <span className="text-base font-black text-[#44e092]">
                              ₦{finalPayable.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={!isBillValid || isRedeeming}
                        className="w-full py-3.5 rounded-xl bg-[#44e092] hover:bg-[#38c980] disabled:opacity-40 text-[#091e14] font-black text-sm tracking-wide transition-all shadow-lg active:scale-95"
                      >
                        Confirm Voucher Redemption (₦{actualDiscount.toLocaleString()} OFF)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CONFIRMATION MODAL */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-md bg-[#16181d] border border-[#282a2e] rounded-3xl p-6 sm:p-7 flex flex-col gap-5 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#282a2e]">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#ff6b00]" />
                    <h3 className="text-base font-bold text-white">
                      Confirm Voucher Redemption
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-zinc-400">
                  Please verify the transaction details with the customer before finalizing redemption:
                </p>

                <div className="bg-[#111317] border border-[#282a2e] rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Voucher Token</span>
                    <span className="font-mono font-bold text-white">
                      {validationResult?.voucher?.voucherCode}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Merchant Branch</span>
                    <span className="font-semibold text-white">{cashierBranch}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Bill Total</span>
                    <span className="font-bold text-white">₦{billAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#ff6b00]">
                    <span>Promotional Discount</span>
                    <span className="font-black">-₦{actualDiscount.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-[#282a2e] flex justify-between text-sm font-bold text-white">
                    <span>Customer Amount Due</span>
                    <span className="text-base font-black text-[#44e092]">
                      ₦{finalPayable.toLocaleString()}
                    </span>
                  </div>
                </div>

                {redemptionError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200">
                    {redemptionError}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isRedeeming}
                    className="flex-1 py-3 rounded-xl bg-[#1a1c20] hover:bg-[#282a2e] border border-[#282a2e] text-xs font-bold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteRedemption}
                    disabled={isRedeeming}
                    className="flex-1 py-3 rounded-xl bg-[#ff6b00] hover:bg-[#ff7a1a] text-xs font-black text-white shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isRedeeming ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Confirm Redemption</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

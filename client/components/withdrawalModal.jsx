import React, { useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Gift,
  Zap,
  Smartphone,
  Check,
  X,
  ChevronRight,
  Info,
  Percent,
  Award,
  Wallet,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function WithdrawalConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  amount = 25000,
  bankName = "Destination Bank",
  accountNumber = "0000000000",
  accountHolder = "Valued Customer",
  userCashbackBalance = 1250,
  userPoints = 350,
}) {
  const navigate = useNavigate();

  // State for interactive cashback & bonus toggles
  const [applyCashbackBalance, setApplyCashbackBalance] = useState(false);
  const [applyPointsBonus, setApplyPointsBonus] = useState(false);
  const [selectedQuickPerk, setSelectedQuickPerk] = useState(null);

  if (!isOpen) return null;

  // Amount parsing
  const numericAmount =
    typeof amount === "number"
      ? amount
      : parseFloat(String(amount).replace(/,/g, "")) || 0;

  // Calculate bonus additions
  const cashbackAddon = applyCashbackBalance ? userCashbackBalance : 0;
  const pointsAddon = applyPointsBonus ? 500 : 0;
  const totalNetPayout = numericAmount + cashbackAddon + pointsAddon;

  const formatMoney = (val) => {
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleConfirmWithdrawal = () => {
    onConfirm({
      finalAmount: totalNetPayout,
      appliedCashback: cashbackAddon,
      appliedPointsBonus: pointsAddon,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-[#070e1b] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200 text-white my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-900 bg-zinc-950/60 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Confirm Withdrawal
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5">
                  Instant
                </Badge>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review payout details & available cashback perks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/60 transition-all shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar relative z-10">
          {/* Main Withdrawal Summary Box */}
          <div className="bg-zinc-950/80 border border-zinc-900 p-4 sm:p-5 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900/80">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Requested Amount
              </span>
              <span className="text-xl sm:text-2xl font-black font-display text-emerald-400 tracking-tight">
                ₦{formatMoney(numericAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-500 font-medium block">
                  Destination Bank
                </span>
                <p className="font-bold text-white truncate flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  {bankName}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 font-medium block">
                  Account Number
                </span>
                <p className="font-mono font-bold text-zinc-200">
                  {accountNumber}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 font-medium block">
                  Beneficiary Name
                </span>
                <p className="font-bold text-zinc-300 truncate">
                  {accountHolder}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 font-medium block">
                  Transfer Fee
                </span>
                <p className="font-bold text-emerald-400">
                  ₦0.00{" "}
                  <span className="text-[10px] text-zinc-500 font-normal">
                    (Free)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* In the Meantime: Cashbacks & Boosters Banner */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-200">
                  In the Meantime: Cashbacks & Perks
                </h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active Perks Available
              </span>
            </div>

            {/* Perk Option 1: Use Cashback Wallet Balance */}
            <div
              onClick={() => setApplyCashbackBalance(!applyCashbackBalance)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                applyCashbackBalance
                  ? "bg-emerald-950/30 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/50"
                  : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    applyCashbackBalance
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Apply Cashback Wallet Balance
                    </span>
                    <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[9px] px-1.5 py-0">
                      +₦{formatMoney(userCashbackBalance)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                    Combine your earned cashback balance into this transfer.
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  applyCashbackBalance
                    ? "bg-emerald-500 border-emerald-400 text-black"
                    : "border-zinc-700 bg-zinc-900"
                }`}
              >
                {applyCashbackBalance && (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
              </div>
            </div>

            {/* Perk Option 2: Redeem Points for Withdrawal Bonus */}
            <div
              onClick={() => setApplyPointsBonus(!applyPointsBonus)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                applyPointsBonus
                  ? "bg-purple-950/30 border-purple-500/50 text-white shadow-lg shadow-purple-950/50"
                  : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    applyPointsBonus
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <Award className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Redeem 200 Points for +₦500 Bonus
                    </span>
                    <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[9px] px-1.5 py-0">
                      {userPoints} Pts Available
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                    Use reward points to boost your final withdrawal amount.
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  applyPointsBonus
                    ? "bg-purple-500 border-purple-400 text-white"
                    : "border-zinc-700 bg-zinc-900"
                }`}
              >
                {applyPointsBonus && (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
              </div>
            </div>

            {/* Quick Service Cashback In-App Quick Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div
                onClick={() => {
                  onClose();
                  navigate("/services/airtime");
                }}
                className="p-3 bg-blue-950/20 border border-blue-900/50 hover:border-blue-500/40 rounded-2xl cursor-pointer transition-all hover:bg-blue-950/40 group"
              >
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span>5% VTU Cashback</span>
                  <ArrowUpRight className="h-3.5 w-3.5 ml-auto opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Buy Airtime/Data instead & get up to ₦1,000 instant cashback.
                </p>
              </div>

              <div
                onClick={() => {
                  onClose();
                  navigate("/services/bills");
                }}
                className="p-3 bg-amber-950/20 border border-amber-900/50 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:bg-amber-950/40 group"
              >
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>₦500 Bill Cashback</span>
                  <ArrowUpRight className="h-3.5 w-3.5 ml-auto opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Pay power or TV bills and get ₦500 flat wallet credit.
                </p>
              </div>
            </div>
          </div>

          {/* Final Calculation Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">
                Total Net Payout to Bank
              </span>
              {(applyCashbackBalance || applyPointsBonus) && (
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                  <span>Base ₦{formatMoney(numericAmount)}</span>
                  {applyCashbackBalance && (
                    <span>+ ₦{formatMoney(userCashbackBalance)} Cashback</span>
                  )}
                  {applyPointsBonus && <span>+ ₦500 Bonus</span>}
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black font-display text-emerald-400 tracking-tight">
                ₦{formatMoney(totalNetPayout)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-900 flex flex-col sm:flex-row gap-2.5 relative z-10 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-1/3 py-3 px-4 rounded-2xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          >
            Modify Details
          </button>

          <button
            onClick={handleConfirmWithdrawal}
            className="w-full sm:w-2/3 py-3 px-5 rounded-2xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Confirm & Complete Withdrawal</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        {/* Security Micro Footnote */}
        <div className="bg-[#040810] py-2 px-4 border-t border-zinc-900/60 text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1.5 shrink-0">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span>
            NIBSS Direct Credit Instant Settlement • 256-bit Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}

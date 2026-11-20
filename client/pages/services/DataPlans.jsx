import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ModalPortal from "@/components/ui/ModalPortal";
import StateView, { SkeletonTileGrid } from "@/components/ui/StateView";
import AccountDetailsCard from "@/components/AccountDetailsCard";
import NetworkPicker, {
  NETWORK_OPTIONS,
  detectNetworkFromPhone,
} from "@/components/services/NetworkPicker";
import {
  Search,
  Smartphone,
  Sparkles,
  PhoneCall,
  Calendar,
  Moon,
  PlayCircle,
  Info,
  Gift,
  CheckCircle2,
  ArrowRight,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { selectedPrice } from "@/Features/userSlice";
import PaymentConfirmation from "../PaymentConfirmation";
import PaymentSuccessfulModal from "@/components/PaymentSuccessfulModal";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import { formatCashback, formatNaira, formatPlanPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const deduplicateData = (bills) => {
  if (!bills || !Array.isArray(bills) || bills.length === 0) return [];
  const seen = new Map();
  return bills.filter((item) => {
    const nameStr = item.biller_name || item.name || item.short_name || item.id || "plan";
    const key = `${item.amount}-${nameStr}-${item.validity_period}`;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
};

const VALIDITY_ORDER = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  mega: 3,
};

const categoryTabs = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "mega", label: "Mega" },
  { id: "all", label: "All" },
];

export const parsePlanSpecialPerks = (rawName) => {
  const nameStr = String(rawName || "");
  const lower = nameStr.toLowerCase();
  const perks = [];

  const voiceMatch = nameStr.match(/\+\s*(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\b/i);
  if (voiceMatch || lower.includes("talktime") || lower.includes("airtime") || lower.includes("voice")) {
    const mins = voiceMatch ? voiceMatch[1] : "Free";
    perks.push({
      id: "voice",
      shortLabel: `+${mins}m voice`,
      fullLabel: `+${mins} Minutes Extra Airtime (Talktime)`,
      icon: PhoneCall,
      isWarning: true,
      description: `Includes ${mins} minutes of free voice calling minutes allocated directly to your SIM line alongside your data.`,
    });
  }

  const weekendMatch =
    nameStr.match(/weekend\s*plan\s*-\s*\[([^\]]+)\]/i) ||
    nameStr.match(/weekend\s*plan\s*\[([^\]]+)\]/i);
  if (lower.includes("weekend") || weekendMatch || lower.includes("sat & sun") || lower.includes("sunday only")) {
    let daysLabel = "Sat & Sun";
    if (weekendMatch && weekendMatch[1]) {
      daysLabel = weekendMatch[1].trim();
    } else if (lower.includes("sun") && !lower.includes("sat")) {
      daysLabel = "Sunday Only";
    }
    perks.push({
      id: "weekend",
      shortLabel: `Weekend`,
      fullLabel: `Weekend Only Plan [${daysLabel}]`,
      icon: Calendar,
      isWarning: false,
      description: `This data bundle is active exclusively on weekends (${daysLabel}). Weekend data starts Saturday 12:00 AM and runs through Sunday 11:59 PM.`,
    });
  }

  if (lower.includes("night") || lower.includes("midnight") || lower.includes("11pm") || lower.includes("12am")) {
    perks.push({
      id: "night",
      shortLabel: "Night",
      fullLabel: "Off-Peak Night Browsing Plan",
      icon: Moon,
      isWarning: false,
      description:
        "Usable exclusively during off-peak night browsing hours (11:00 PM to 6:00 AM). Super-fast speeds for heavy downloads.",
    });
  }

  if (lower.includes("youtube") || lower.includes("tiktok") || lower.includes("instagram") || lower.includes("whatsapp") || lower.includes("social")) {
    const matchedApps = [];
    if (lower.includes("youtube")) matchedApps.push("YouTube");
    if (lower.includes("tiktok")) matchedApps.push("TikTok");
    if (lower.includes("instagram")) matchedApps.push("Instagram");
    if (lower.includes("whatsapp")) matchedApps.push("WhatsApp");
    const appText = matchedApps.length > 0 ? matchedApps.join(" & ") : "Social";

    perks.push({
      id: "social",
      shortLabel: appText,
      fullLabel: `${appText} Dedicated Streaming Data`,
      icon: PlayCircle,
      isWarning: false,
      description: `Includes dedicated high-speed streaming data quota specifically configured for ${appText} apps and websites.`,
    });
  }

  if (lower.includes("awoof") || lower.includes("double data") || lower.includes("special offer") || lower.includes("promo")) {
    perks.push({
      id: "awoof",
      shortLabel: "Awoof",
      fullLabel: "PayWaka Awoof Promo Bundle",
      icon: Zap,
      isWarning: false,
      description: "Special high-volume promotional rate discounted through PayWaka network aggregation.",
    });
  }

  return {
    hasSpecialPerks: perks.length > 0,
    perks,
    primaryPerk: perks[0] || null,
  };
};

function extractSubtleTag(rawName, primaryPerk) {
  if (primaryPerk?.shortLabel) return primaryPerk.shortLabel;
  const lower = String(rawName || "").toLowerCase();
  if (/\bsme\b/i.test(lower)) return "SME";
  if (/\bdirect\b/i.test(lower)) return "Direct";
  if (/\bcorporate\b|\bcg\b/i.test(lower)) return "Corporate";
  if (/\bgifting\b/i.test(lower)) return "Gifting";
  return null;
}

export default function DataPlans() {
  const user = useSelector((state) => state.user?.user || {});
  const transactions = useSelector((state) => state.user.transactions);
  const billCatalog = useSelector((state) => state.user.billCatalog);

  const walletBalance = Number(user?.walletBalance || 0);
  const cashbackBalance = Number(user?.cashbackBalance || 0);
  const combinedBalance = walletBalance + cashbackBalance;

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [isFailedOpen, setIsFailedOpen] = useState(false);
  const [failedData, setFailedData] = useState({});
  const [accountPopup, setAccountPopup] = useState(false);

  const dispatch = useDispatch();
  const [spin, setSpin] = useState(false);
  const { biller, purchaseData } = useCloudfunc();
  const [selectedNetwork, setSelectedNetwork] = useState("MTN");
  const [autoDetectedNet, setAutoDetectedNet] = useState(null);
  const manualOverrideRef = useRef(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeTab, setActiveTab] = useState("daily");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanKey, setSelectedPlanKey] = useState(null);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState(null);

  // Hydrate instantly from Admin-synced catalog cache; only spin on cold empty cache
  useEffect(() => {
    const cachedMtn = billCatalog?.dataPlansByNetwork?.MTN;
    const hasCached = Array.isArray(cachedMtn) && cachedMtn.length > 0;
    if (!hasCached) setSpin(true);
    biller("MTN", "Data").finally(() => setSpin(false));
  }, []);

  // Deduplicate, normalize, and sort data bundles by validity group then price ascending
  const displayPlans = useMemo(() => {
    const cachedForNet = billCatalog?.dataPlansByNetwork?.[selectedNetwork];
    const sourceList =
      Array.isArray(cachedForNet) && cachedForNet.length > 0
        ? cachedForNet
        : transactions.billsInfo;
    const rawList = deduplicateData(sourceList);

    return rawList
      .filter((item) => !item.is_airtime && Number(item.amount) > 0)
      .map((plan, index) => {
        const rawName = plan.biller_name || plan.name || plan.short_name || "Data Plan";
        const nameStr = String(rawName).trim();

        // 1. Extract exact validity from title or validity_period
        let validityDays = 30;
        let validityDisplay = "30 days";
        let category = "monthly";

        const daysMatch = nameStr.match(/(\d+)\s*(?:day|days|dais|d)\b/i);
        const hrsMatch = nameStr.match(/(\d+)\s*(?:hr|hrs|hour|hours)\b/i);
        const weekMatch = nameStr.match(/(\d+)\s*(?:week|weeks|wk|wks)\b/i);
        const monthMatch = nameStr.match(/(\d+)\s*(?:month|months|mo|mos)\b/i);
        const yearMatch = nameStr.match(/(\d+)\s*(?:year|years|yr|yrs)\b/i);

        if (daysMatch) {
          const d = parseInt(daysMatch[1], 10);
          validityDays = d;
          validityDisplay = d === 1 ? "1 day" : `${d} days`;
          if (d <= 3) category = "daily";
          else if (d <= 14) category = "weekly";
          else if (d <= 45) category = "monthly";
          else category = "mega";
        } else if (hrsMatch) {
          const h = parseInt(hrsMatch[1], 10);
          const d = Math.max(1, Math.ceil(h / 24));
          validityDays = d;
          validityDisplay = h <= 24 ? "1 day" : `${d} days`;
          category = "daily";
        } else if (weekMatch) {
          const w = parseInt(weekMatch[1], 10);
          validityDays = w * 7;
          validityDisplay = w === 1 ? "7 days" : `${w * 7} days`;
          category = "weekly";
        } else if (nameStr.toLowerCase().includes("weekly")) {
          validityDays = 7;
          validityDisplay = "7 days";
          category = "weekly";
        } else if (monthMatch) {
          const m = parseInt(monthMatch[1], 10);
          validityDays = m * 30;
          validityDisplay = m === 1 ? "30 days" : `${m * 30} days`;
          category = m > 1 ? "mega" : "monthly";
        } else if (nameStr.toLowerCase().includes("monthly")) {
          validityDays = 30;
          validityDisplay = "30 days";
          category = "monthly";
        } else if (yearMatch) {
          validityDays = 365;
          validityDisplay = "365 days";
          category = "mega";
        } else if (plan.validity_period && String(plan.validity_period).trim() !== "") {
          const vStr = String(plan.validity_period).trim();
          const vNum = parseInt(vStr.replace(/\D/g, ""), 10);
          if (!isNaN(vNum) && vNum > 0) {
            validityDays = vNum;
            validityDisplay = vNum === 1 ? "1 day" : `${vNum} days`;
            if (vNum <= 3) category = "daily";
            else if (vNum <= 14) category = "weekly";
            else if (vNum <= 45) category = "monthly";
            else category = "mega";
          } else {
            validityDisplay = vStr.toLowerCase();
          }
        }

        // 2. Clean title & hero size
        let cleanTitle = nameStr
          .replace(/^(MTN|GLO|AIRTEL|9MOBILE|SME|DIRECT)\s+/i, "")
          .replace(/-\s*(?:Weekly|Monthly|Daily|Fortnightly)\b/gi, "")
          .replace(/-\s*\d+\s*(?:day|days|dais|hr|hrs|week|weeks|month|months|year|years)\b/gi, "")
          .replace(/\s*\((?:\d+\s*(?:day|days|dais|hr|hrs|hour|hours|week|weeks|wk|wks|month|months|year|years))\)/gi, "")
          .replace(/\bdata\s*(?:purchase|bundle|bundles|plan|plans)?\b/gi, "")
          .replace(/\(\s+/g, "(")
          .replace(/\s+\)/g, ")")
          .replace(/\s+/g, " ")
          .trim();

        const volMatch = nameStr.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/i);
        const heroSize = volMatch
          ? `${volMatch[1]}${volMatch[2].toUpperCase()}`
          : cleanTitle || nameStr;

        if (!cleanTitle || cleanTitle.length === 0) {
          cleanTitle = heroSize;
        }

        let volumeMB = 0;
        const gbMatch = nameStr.match(/(\d+(?:\.\d+)?)\s*GB/i);
        const mbMatch = nameStr.match(/(\d+(?:\.\d+)?)\s*MB/i);
        const tbMatch = nameStr.match(/(\d+(?:\.\d+)?)\s*TB/i);
        if (gbMatch) volumeMB = parseFloat(gbMatch[1]) * 1024;
        else if (mbMatch) volumeMB = parseFloat(mbMatch[1]);
        else if (tbMatch) volumeMB = parseFloat(tbMatch[1]) * 1024 * 1024;

        if (volumeMB >= 20000 && category === "monthly") {
          category = "mega";
        }

        // 3. Perks & single subtle tag
        const perksInfo = parsePlanSpecialPerks(rawName);
        const subtleTag = extractSubtleTag(rawName, perksInfo.primaryPerk);

        let resolvedCashback = Number(plan.cashbackAmount ?? 0);
        if ((plan.cashbackAmount === undefined || plan.cashbackAmount === null) && Number(plan.costPrice || 0) > 0) {
          const margin = Math.max(0, Number(plan.amount || 0) - Number(plan.costPrice || 0));
          const netUpper = String(selectedNetwork || "MTN").toUpperCase();
          const defaultRate = plan.isHero
            ? 0.005
            : netUpper === "GLO"
              ? 0.02
              : netUpper === "9MOBILE"
                ? 0.015
                : 0.025;
          resolvedCashback = Math.round(margin * defaultRate * 100) / 100;
        } else {
          resolvedCashback = Math.round(Math.max(0, resolvedCashback) * 100) / 100;
        }

        const tileKey = `${plan.id || plan.item_code || "plan"}-${plan.amount}-${index}`;

        return {
          ...plan,
          tileKey,
          cashbackAmount: resolvedCashback,
          rawName,
          cleanTitle,
          heroSize,
          subtleTag,
          planDataName: cleanTitle,
          volumeMB,
          validityDays,
          category,
          validityDisplay,
          hasSpecialPerks: perksInfo.hasSpecialPerks,
          perks: perksInfo.perks,
          primaryPerk: perksInfo.primaryPerk,
        };
      })
      .sort((a, b) => {
        const groupDiff =
          (VALIDITY_ORDER[a.category] ?? 9) - (VALIDITY_ORDER[b.category] ?? 9);
        if (groupDiff !== 0) return groupDiff;
        const priceDiff = Number(a.amount) - Number(b.amount);
        if (priceDiff !== 0) return priceDiff;
        return a.validityDays - b.validityDays;
      });
  }, [billCatalog, transactions.billsInfo, selectedNetwork]);

  const categoryCounts = useMemo(() => {
    const counts = { all: displayPlans.length, daily: 0, weekly: 0, monthly: 0, mega: 0 };
    displayPlans.forEach((p) => {
      if (counts[p.category] !== undefined) counts[p.category]++;
    });
    return counts;
  }, [displayPlans]);

  // If active tab has 0 plans after switching network, step to Weekly (then Monthly) rather than All
  useEffect(() => {
    if (displayPlans.length === 0) return;
    if (activeTab !== "all" && (categoryCounts[activeTab] || 0) === 0) {
      if (categoryCounts.daily > 0) setActiveTab("daily");
      else if (categoryCounts.weekly > 0) setActiveTab("weekly");
      else if (categoryCounts.monthly > 0) setActiveTab("monthly");
      else setActiveTab("all");
    }
  }, [displayPlans.length, categoryCounts, activeTab]);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return displayPlans.filter((plan) => {
      const matchesTab = activeTab === "all" || plan.category === activeTab;
      const matchesSearch =
        !q ||
        plan.rawName.toLowerCase().includes(q) ||
        plan.cleanTitle.toLowerCase().includes(q) ||
        plan.heroSize.toLowerCase().includes(q) ||
        plan.validityDisplay.toLowerCase().includes(q) ||
        String(plan.amount).includes(q);
      return matchesTab && matchesSearch;
    });
  }, [displayPlans, activeTab, searchQuery]);

  const selectedPlan = useMemo(
    () => displayPlans.find((p) => p.tileKey === selectedPlanKey) || null,
    [displayPlans, selectedPlanKey],
  );

  const handleNetworkSelect = async (netOption, isAuto = false) => {
    if (!isAuto) {
      manualOverrideRef.current = true;
    }
    setSelectedPlanKey(null);
    const cachedForTarget = billCatalog?.dataPlansByNetwork?.[netOption.id];
    const hasCached = Array.isArray(cachedForTarget) && cachedForTarget.length > 0;
    if (!hasCached) setSpin(true);
    setSelectedNetwork(netOption.id);
    await biller(netOption.name, "Data");
    setSpin(false);
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhoneNumber(digitsOnly);

    if (digitsOnly.length < 4) {
      manualOverrideRef.current = false;
      setAutoDetectedNet(null);
      return;
    }

    const detected = detectNetworkFromPhone(digitsOnly);
    setAutoDetectedNet(detected);

    if (detected && !manualOverrideRef.current && detected !== selectedNetwork) {
      const option = NETWORK_OPTIONS.find((n) => n.id === detected);
      if (option) {
        handleNetworkSelect(option, true);
      }
    }
  };

  const handleBuyNow = (amount, planName, itemCode, rawCashback = 0) => {
    if (!phoneNumber) {
      return toast.warning("Please enter a phone number before continuing.");
    }
    if (phoneNumber.length < 11) {
      return toast.warning("Please enter a valid 11-digit phone number.");
    }

    const exactCb = Math.round(Math.max(0, Number(rawCashback || 0)) * 100) / 100;

    dispatch(
      selectedPrice({
        productName: "Data",
        billType: "data",
        price: amount,
        customerID: phoneNumber,
        cashbackToEarn: exactCb,
        cashbackAmount: exactCb,
        bonusToEarn:
          exactCb > 0 ? `${formatCashback(exactCb)} Cashback` : "₦0 Cashback",
        plan: planName,
        network: selectedNetwork.toUpperCase(),
        itemCode,
      }),
    );
    setSelectedPlanForDetails(null);
    setIsConfirmationOpen(true);
  };

  const handleConfirmPayment = async (pin, fundingMeta = {}) => {
    try {
      const netName = selectedNetwork.toUpperCase();
      const planName = transactions?.plan || "Data Plan";
      const price = Number(transactions?.price || 0);
      const useCashback = Boolean(fundingMeta?.useCashback);

      const res = await purchaseData({
        network: netName,
        plan: transactions?.itemCode || transactions?.plan || "1GB",
        phone: phoneNumber,
        amount: price,
        useCashback,
        pin,
      });

      if (res?.status === "success") {
        const earnedCb = Math.round(Math.max(0, Number(res.cashbackEarned || 0)) * 100) / 100;
        toast.success(
          earnedCb > 0
            ? `Data plan (${planName}) purchased! ${formatCashback(earnedCb)} Cashback credited.`
            : `Data plan (${planName}) purchased successfully for ${phoneNumber}!`,
        );
        setSuccessData({
          category: "Data Plan",
          productName: planName,
          network: netName,
          amount: price,
          cashbackApplied: Number(res.cashbackApplied ?? fundingMeta?.cashbackApplied ?? 0),
          walletContribution: Number(res.walletContribution ?? fundingMeta?.walletContribution ?? price),
          cashbackEarned: earnedCb,
          customerId: phoneNumber,
          tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
          bonusToEarn: earnedCb > 0 ? `${formatCashback(earnedCb)} Cashback` : "₦0 Cashback",
        });
        setPhoneNumber("");
        setSelectedPlanKey(null);
        setAutoDetectedNet(null);
        setIsConfirmationOpen(false);
        setIsSuccessOpen(true);
        return true;
      } else if (res?.status === "pending") {
        toast.info(
          res.message ||
            `Data purchase is processing (Ref: ${res.tx_ref}). Cashback will be credited once completed.`,
          { duration: 7000 },
        );
        setPhoneNumber("");
        setSelectedPlanKey(null);
        setIsConfirmationOpen(false);
        return true;
      } else if (res?.status === "provider_error") {
        setFailedData({
          category: "Data Plan",
          productName: planName,
          network: netName,
          amount: price,
          customerId: phoneNumber,
          tx_ref: res.tx_ref || `PWK_${Date.now()}`,
          reason:
            res.message ||
            "Temporary maintenance on provider gateway. Your PayWaka wallet was not charged (or has been refunded).",
          refunded: true,
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      } else {
        setFailedData({
          category: "Data Plan",
          productName: planName,
          network: netName,
          amount: price,
          customerId: phoneNumber,
          tx_ref: res?.tx_ref || `PWK_${Date.now()}`,
          reason:
            res?.message ||
            "Data plan purchase failed. Please check your balance or recipient details.",
          refunded: Boolean(res?.refunded !== false),
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      }
    } catch (err) {
      const errMsg = err?.message || "";
      if (/pin|lockout|attempt/i.test(errMsg)) {
        throw err;
      }
      setFailedData({
        category: "Data Plan",
        productName: transactions?.plan || "Data Plan",
        network: selectedNetwork.toUpperCase(),
        amount: Number(transactions?.price || 0),
        customerId: phoneNumber,
        tx_ref: `PWK_${Date.now()}`,
        reason: err.message || "An unexpected error occurred while communicating with the server.",
        refunded: true,
      });
      setIsConfirmationOpen(false);
      setIsFailedOpen(true);
      return false;
    }
  };

  const selectedPlanDeficit = selectedPlan
    ? Math.max(0, Number(selectedPlan.amount || 0) - combinedBalance)
    : 0;

  return (
    <DashboardLayout>
      <div className={cn("space-y-5", selectedPlan && "pb-24 lg:pb-20")}>
        {/* Unified Page Header */}
        <div>
          <h1 className="pw-page-title">Mobile Data</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Enter a number, pick a bundle, and deliver data instantly.
          </p>
        </div>

        {/* Recipient & Network (single card level, capped at 560px on desktop) */}
        <div className="pw-glass-hero max-w-[560px] p-3.5 sm:p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="phone-number" className="pw-label">
                Recipient Number
              </Label>
              {autoDetectedNet && (
                <span className="pw-chip-brand text-[10px]">
                  Detected: {autoDetectedNet}
                </span>
              )}
            </div>
            <div className="relative">
              <Smartphone className="absolute left-3.5 z-10 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
              <Input
                id="phone-number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                placeholder="08012345678"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="pl-10 h-11 text-[13px] sm:text-sm font-mono tracking-wide"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="pw-label block">Network Provider</Label>
            <NetworkPicker
              value={selectedNetwork}
              onChange={(net) => handleNetworkSelect(net, false)}
            />
          </div>
        </div>

        {/* Validity Filter Tabs (scrollbar hidden) + Full-Row Search on Mobile */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {categoryTabs.map((tab) => {
                const isTabActive = activeTab === tab.id;
                const count = categoryCounts[tab.id] || 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "pw-pressable min-h-10 inline-flex items-center gap-1.5 px-3 rounded-pill text-xs font-bold whitespace-nowrap border transition-all shrink-0 backdrop-blur-md",
                      isTabActive
                        ? "bg-brand-500 border-brand-500 text-brand-foreground shadow-[0_8px_20px_-8px_hsl(var(--brand-500)/0.6)]"
                        : "bg-card/75 border-border text-muted-foreground hover:text-foreground hover:border-brand-400/35",
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "pw-num text-[11px] px-1.5 py-0.5 rounded-pill",
                        isTabActive
                          ? "bg-black/15 text-brand-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 z-10 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
              <Input
                type="search"
                placeholder="Search size, days, price..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search data plans"
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>

          {/* Compact Plan Tiles Grid: 2 cols mobile, 3 tablet, 4 desktop */}
          {spin ? (
            <SkeletonTileGrid count={8} />
          ) : filteredPlans.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              {filteredPlans.map((plan) => {
                const isSelected = selectedPlanKey === plan.tileKey;
                const isLowBalance = combinedBalance < Number(plan.amount || 0);

                return (
                  <div
                    key={plan.tileKey}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedPlanKey((prev) =>
                        prev === plan.tileKey ? null : plan.tileKey,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPlanKey((prev) =>
                          prev === plan.tileKey ? null : plan.tileKey,
                        );
                      }
                    }}
                    className={cn(
                      "pw-pressable relative text-left p-2.5 sm:p-3.5 rounded-panel min-h-[108px] flex flex-col justify-between gap-1.5 cursor-pointer transition-all select-none",
                      isSelected
                        ? "border border-brand-400 bg-brand-tint ring-1 ring-brand-400/35 shadow-[0_12px_28px_-14px_hsl(var(--brand-400)/0.5)]"
                        : "pw-card hover:-translate-y-0.5 hover:border-brand-400/40",
                    )}
                  >
                    {/* Top row: Hero data size + single validity chip */}
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight">
                        {plan.heroSize}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="pw-chip text-[9.5px] sm:text-[10px] px-1.5 py-0.5 whitespace-nowrap shrink-0">
                          {plan.validityDisplay}
                        </span>
                        {isSelected && (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-brand-400 shrink-0"
                            aria-label="Selected"
                          />
                        )}
                      </div>
                    </div>

                    {/* Subtle tag row (SME / Awoof / Direct / Perk) */}
                    <div className="flex items-center justify-between gap-1.5 min-h-[18px]">
                      {plan.subtleTag ? (
                        <span className="text-[11px] font-medium text-muted-foreground truncate">
                          {plan.subtleTag}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {selectedNetwork}
                        </span>
                      )}

                      {plan.hasSpecialPerks && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanForDetails(plan);
                          }}
                          aria-label={`View ${plan.cleanTitle} perk details`}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-pill hover:bg-muted text-muted-foreground hover:text-brand-400 shrink-0"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Bottom row: Monospace price + single-line cashback chip */}
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/60 min-w-0">
                      <span className="pw-num text-[13px] sm:text-[15px] font-extrabold text-foreground whitespace-nowrap">
                        {formatPlanPrice(plan.amount)}
                      </span>
                      {Number(plan.cashbackAmount || 0) > 0 ? (
                        <span className="pw-chip-brand text-[9.5px] sm:text-[10px] px-1.5 py-0.5 pw-num whitespace-nowrap shrink-0">
                          +{formatCashback(plan.cashbackAmount).replace(/^\+/, "")} back
                        </span>
                      ) : isLowBalance ? (
                        <span className="text-[10px] font-medium text-warning whitespace-nowrap shrink-0">
                          Low bal
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <StateView
              icon={Wifi}
              title="No bundles found"
              description={
                searchQuery
                  ? `No data plans match "${searchQuery}" under ${selectedNetwork}.`
                  : `No ${activeTab} bundles available for ${selectedNetwork}.`
              }
              actionLabel={activeTab !== "all" ? "View all plans" : undefined}
              onAction={
                activeTab !== "all" ? () => setActiveTab("all") : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Sticky Bottom Selection Bar (replaces 37 Buy Now buttons) */}
      {selectedPlan && (
        <div className="fixed bottom-above-nav lg:bottom-4 left-0 right-0 lg:left-64 z-30 px-4 pb-2 pointer-events-none">
          <div className="max-w-2xl mx-auto pw-glass-hero p-3.5 flex items-center justify-between gap-3 pointer-events-auto border-brand-400/35">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {selectedPlan.heroSize} · {selectedPlan.validityDisplay} ·{" "}
                <span className="pw-num text-brand-400">
                  {formatPlanPrice(selectedPlan.amount)}
                </span>
              </p>
              <p className="text-caption text-muted-foreground truncate">
                {selectedPlanDeficit > 0
                  ? `Top up ${formatPlanPrice(selectedPlanDeficit)} to buy`
                  : phoneNumber.length === 11
                    ? `${selectedNetwork} · ${phoneNumber}`
                    : `${selectedNetwork} · Enter 11-digit phone number`}
              </p>
            </div>

            {selectedPlanDeficit > 0 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setAccountPopup(true)}
                className="shrink-0"
              >
                Top up {formatPlanPrice(selectedPlanDeficit)}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  handleBuyNow(
                    selectedPlan.amount,
                    selectedPlan.cleanTitle,
                    selectedPlan.item_code,
                    selectedPlan.cashbackAmount,
                  )
                }
                className="shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Plan Perks Details Sheet */}
      <ModalPortal
        isOpen={Boolean(selectedPlanForDetails)}
        onClose={() => setSelectedPlanForDetails(null)}
        variant="sheet"
        noPadding
        maxWidthClass="max-w-md"
        ariaLabel="Plan Perks and Details"
      >
        {selectedPlanForDetails && (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="min-w-0">
                <h2 className="text-card-title text-foreground">
                  {selectedPlanForDetails.heroSize} · {selectedPlanForDetails.validityDisplay}
                </h2>
                <p className="text-caption text-muted-foreground truncate">
                  {selectedNetwork} bundle perks & terms
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForDetails(null)}
                aria-label="Close plan details"
                className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              <div className="pw-panel p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="pw-label block">Bundle</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {selectedPlanForDetails.cleanTitle}
                  </p>
                </div>
                <span className="pw-num text-xl font-black text-brand-400 shrink-0">
                  {formatPlanPrice(selectedPlanForDetails.amount)}
                </span>
              </div>

              {selectedPlanForDetails.hasSpecialPerks && (
                <div className="space-y-2">
                  <span className="pw-label flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                    Included Perks
                  </span>
                  {selectedPlanForDetails.perks.map((perk, idx) => {
                    const PerkIcon = perk.icon || Gift;
                    return (
                      <div key={idx} className="pw-panel p-3 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <PerkIcon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              perk.isWarning ? "text-warning" : "text-brand-400",
                            )}
                          />
                          <span>{perk.fullLabel}</span>
                        </div>
                        <p className="text-caption text-muted-foreground leading-relaxed pl-6">
                          {perk.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border pb-safe flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedPlanForDetails(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSelectedPlanKey(selectedPlanForDetails.tileKey);
                  handleBuyNow(
                    selectedPlanForDetails.amount,
                    selectedPlanForDetails.cleanTitle,
                    selectedPlanForDetails.item_code,
                    selectedPlanForDetails.cashbackAmount,
                  );
                }}
                className="flex-1"
              >
                <span>Select & Continue</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </ModalPortal>

      <PaymentConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleConfirmPayment}
        paymentDetails={transactions}
      />

      <PaymentSuccessfulModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        data={successData}
      />

      <PaymentFailedModal
        isOpen={isFailedOpen}
        onClose={() => setIsFailedOpen(false)}
        onRetry={() => {
          setIsFailedOpen(false);
          setIsConfirmationOpen(true);
        }}
        data={failedData}
      />

      {accountPopup && (
        <AccountDetailsCard
          accountNumber={user?.accountNumber || "0000000000"}
          bankName={user?.bankName || "Your Bank"}
          open={accountPopup}
          isClose={() => setAccountPopup(false)}
        />
      )}
    </DashboardLayout>
  );
}

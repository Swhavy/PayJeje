import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wifi,
  Clock,
  Search,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Zap,
  PhoneCall,
  Calendar,
  Moon,
  PlayCircle,
  Info,
  Gift,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { selectedPrice } from "@/Features/userSlice";
import PaymentConfirmation from "../PaymentConfirmation";
import PaymentSuccessfulModal from "@/components/PaymentSuccessfulModal";
import PaymentFailedModal from "@/components/PaymentFailedModal";

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

const networks = [
  { id: "MTN", name: "MTN", logo: "🟡", color: "from-amber-500/20 to-yellow-500/10 border-yellow-500/40 text-yellow-500", badge: "Instant SME & Direct" },
  { id: "GLO", name: "GLO", logo: "🟢", color: "from-emerald-500/20 to-green-500/10 border-emerald-500/40 text-emerald-400", badge: "Super High Volume" },
  { id: "AIRTEL", name: "AIRTEL", logo: "🔴", color: "from-rose-500/20 to-red-500/10 border-rose-500/40 text-rose-400", badge: "Fast 4G/5G Speeds" },
  { id: "9MOBILE", name: "9MOBILE", logo: "🟣", color: "from-lime-500/20 to-emerald-500/10 border-lime-500/40 text-lime-400", badge: "Best Value Bundles" },
];

const categoryTabs = [
  { id: "all", label: "All Plans", icon: Sparkles },
  { id: "daily", label: "Daily (1–3 Days)", icon: Zap },
  { id: "weekly", label: "Weekly & Bi-Weekly", icon: Clock },
  { id: "monthly", label: "Monthly Plans", icon: Wifi },
  { id: "mega", label: "Mega & Heavy Plans", icon: ShieldCheck },
];

// Helper to detect and extract unique perks, time windows, and extra bonuses from plan name
export const parsePlanSpecialPerks = (rawName, network = "MTN") => {
  const nameStr = String(rawName || "");
  const lower = nameStr.toLowerCase();
  const perks = [];

  // 1. Extra Airtime / Voice Bonus (e.g. "+ 1.5mins.", "+ 5mins talktime")
  const voiceMatch = nameStr.match(/\+\s*(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\b/i);
  if (voiceMatch || lower.includes("talktime") || lower.includes("airtime") || lower.includes("voice")) {
    const mins = voiceMatch ? voiceMatch[1] : "Free";
    perks.push({
      id: "voice",
      shortLabel: `+${mins} Mins Voice`,
      fullLabel: `+${mins} Minutes Extra Airtime (Talktime)`,
      icon: PhoneCall,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      glow: "shadow-amber-500/10",
      description: `Includes ${mins} minutes of free voice calling minutes allocated directly to your SIM line alongside your data.`,
    });
  }

  // 2. Weekend-Specific Scheduling (e.g. "[Sat & Sun]", "[Sun]", "Weekend Plan")
  const weekendMatch = nameStr.match(/weekend\s*plan\s*-\s*\[([^\]]+)\]/i) || nameStr.match(/weekend\s*plan\s*\[([^\]]+)\]/i);
  if (lower.includes("weekend") || weekendMatch || lower.includes("sat & sun") || lower.includes("sunday only")) {
    let daysLabel = "Sat & Sun";
    if (weekendMatch && weekendMatch[1]) {
      daysLabel = weekendMatch[1].trim();
    } else if (lower.includes("sun") && !lower.includes("sat")) {
      daysLabel = "Sunday Only";
    }

    perks.push({
      id: "weekend",
      shortLabel: `Weekend [${daysLabel}]`,
      fullLabel: `Weekend Only Plan [${daysLabel}]`,
      icon: Calendar,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      glow: "shadow-purple-500/10",
      description: `This data bundle is active exclusively on weekends (${daysLabel}). Weekend data starts Saturday 12:00 AM and runs through Sunday 11:59 PM.`,
    });
  }

  // 3. Night / Off-peak (e.g. "Night Plan", "Midnight 11pm-6am")
  if (lower.includes("night") || lower.includes("midnight") || lower.includes("11pm") || lower.includes("12am")) {
    perks.push({
      id: "night",
      shortLabel: "Night Plan (11PM–6AM)",
      fullLabel: "Off-Peak Night Browsing Plan",
      icon: Moon,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      glow: "shadow-blue-500/10",
      description: "Usable exclusively during off-peak night browsing hours (11:00 PM to 6:00 AM). Super-fast speeds for heavy downloads.",
    });
  }

  // 4. Social / Streaming dedicated (e.g. "YouTube", "TikTok", "Instagram", "Social")
  if (lower.includes("youtube") || lower.includes("tiktok") || lower.includes("instagram") || lower.includes("whatsapp") || lower.includes("social")) {
    const matchedApps = [];
    if (lower.includes("youtube")) matchedApps.push("YouTube");
    if (lower.includes("tiktok")) matchedApps.push("TikTok");
    if (lower.includes("instagram")) matchedApps.push("Instagram");
    if (lower.includes("whatsapp")) matchedApps.push("WhatsApp");
    const appText = matchedApps.length > 0 ? matchedApps.join(" & ") : "Social Media";

    perks.push({
      id: "social",
      shortLabel: `${appText} Bundle`,
      fullLabel: `${appText} Dedicated Streaming Data`,
      icon: PlayCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      glow: "shadow-rose-500/10",
      description: `Includes dedicated high-speed streaming data quota specifically configured for ${appText} apps and websites.`,
    });
  }

  // 5. Awoof Special Promo Rate (e.g. "(Awoof)", "Special Promo", "Double Data")
  if (lower.includes("awoof") || lower.includes("double data") || lower.includes("special offer") || lower.includes("promo")) {
    perks.push({
      id: "awoof",
      shortLabel: "Awoof Special Bonus",
      fullLabel: "PayWaka Awoof Promo Bundle",
      icon: Zap,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/10",
      description: "Special high-volume promotional rate discounted through PayWaka network aggregation.",
    });
  }

  return {
    hasSpecialPerks: perks.length > 0,
    perks,
    primaryPerk: perks[0] || null,
  };
};

export default function DataPlans() {
  const transactions = useSelector((state) => state.user.transactions);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [isFailedOpen, setIsFailedOpen] = useState(false);
  const [failedData, setFailedData] = useState({});
  const dispatch = useDispatch();
  const [spin, setSpin] = useState(false);
  const { biller, purchaseData } = useCloudfunc();
  const [selectedNetwork, setSelectedNetwork] = useState("MTN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState(null);

  // Fetch initial ClubKonnect data bundles for default network (MTN) on mount
  useEffect(() => {
    setSpin(true);
    biller("MTN", "Data").finally(() => setSpin(false));
  }, []);

  // Deduplicate and parse data bundles from Redux
  const displayPlans = useMemo(() => {
    const rawList = deduplicateData(transactions.billsInfo);
    return rawList
      .filter((item) => !item.is_airtime && Number(item.amount) > 0)
      .map((plan) => {
        const rawName = plan.biller_name || plan.name || plan.short_name || "Data Plan";
        const nameStr = String(rawName).trim();

        // 1. Extract exact validity from title or validity_period
        let validityDisplay = "30 Days";
        let category = "monthly";

        const daysMatch = nameStr.match(/(\d+)\s*(?:day|days|dais|d)\b/i);
        const hrsMatch = nameStr.match(/(\d+)\s*(?:hr|hrs|hour|hours)\b/i);
        const weekMatch = nameStr.match(/(\d+)\s*(?:week|weeks|wk|wks)\b/i);
        const monthMatch = nameStr.match(/(\d+)\s*(?:month|months|mo|mos)\b/i);
        const yearMatch = nameStr.match(/(\d+)\s*(?:year|years|yr|yrs)\b/i);

        if (daysMatch) {
          const d = parseInt(daysMatch[1], 10);
          validityDisplay = d === 1 ? "1 Day" : `${d} Days`;
          if (d <= 3) category = "daily";
          else if (d <= 14) category = "weekly";
          else if (d <= 45) category = "monthly";
          else category = "mega";
        } else if (hrsMatch) {
          const h = parseInt(hrsMatch[1], 10);
          validityDisplay = h <= 24 ? "1 Day" : `${Math.ceil(h / 24)} Days`;
          category = "daily";
        } else if (weekMatch) {
          const w = parseInt(weekMatch[1], 10);
          validityDisplay = w === 1 ? "7 Days" : `${w * 7} Days`;
          category = "weekly";
        } else if (nameStr.toLowerCase().includes("weekly")) {
          validityDisplay = "7 Days";
          category = "weekly";
        } else if (monthMatch) {
          const m = parseInt(monthMatch[1], 10);
          validityDisplay = m === 1 ? "30 Days" : `${m * 30} Days`;
          category = m > 1 ? "mega" : "monthly";
        } else if (nameStr.toLowerCase().includes("monthly")) {
          validityDisplay = "30 Days";
          category = "monthly";
        } else if (yearMatch) {
          validityDisplay = "365 Days";
          category = "mega";
        } else if (plan.validity_period && String(plan.validity_period).trim() !== "") {
          const vStr = String(plan.validity_period).trim();
          const vNum = parseInt(vStr.replace(/\D/g, ""), 10);
          if (!isNaN(vNum) && vNum > 0) {
            validityDisplay = vNum === 1 ? "1 Day" : `${vNum} Days`;
            if (vNum <= 3) category = "daily";
            else if (vNum <= 14) category = "weekly";
            else if (vNum <= 45) category = "monthly";
            else category = "mega";
          } else {
            validityDisplay = vStr;
          }
        } else {
          validityDisplay = "30 Days";
          category = "monthly";
        }

        // 2. Clean data title: Remove network name, remove "data purchase", "data bundle", "data", and parenthetical validity
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

        // If title was stripped down too much, fallback to volume or original
        if (!cleanTitle || cleanTitle.length === 0) {
          const volMatch = nameStr.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB))/i);
          cleanTitle = volMatch ? volMatch[1] : nameStr;
        }

        // Extract numeric volume for mega plan sorting
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

        // 3. Detect special perks & unique characteristics
        const perksInfo = parsePlanSpecialPerks(rawName, selectedNetwork);

        return {
          ...plan,
          rawName,
          cleanTitle,
          planDataName: cleanTitle,
          volumeMB,
          category,
          validityDisplay,
          hasSpecialPerks: perksInfo.hasSpecialPerks,
          perks: perksInfo.perks,
          primaryPerk: perksInfo.primaryPerk,
        };
      });
  }, [transactions.billsInfo, selectedNetwork]);

  // Filter plans based on active category tab and search query
  const filteredPlans = useMemo(() => {
    return displayPlans.filter((plan) => {
      const matchesTab = activeTab === "all" || plan.category === activeTab;
      const matchesSearch =
        searchQuery === "" ||
        plan.rawName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.cleanTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.validityDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(plan.amount).includes(searchQuery);
      return matchesTab && matchesSearch;
    });
  }, [displayPlans, activeTab, searchQuery]);

  // Count plans per category for badges
  const categoryCounts = useMemo(() => {
    const counts = { all: displayPlans.length, daily: 0, weekly: 0, monthly: 0, mega: 0 };
    displayPlans.forEach((p) => {
      if (counts[p.category] !== undefined) counts[p.category]++;
    });
    return counts;
  }, [displayPlans]);

  const handleNetworkSelect = async (netOption) => {
    setSpin(true);
    setSelectedNetwork(netOption.id);
    await biller(netOption.name, "Data");
    setSpin(false);
  };

  const handleBuyNow = (amount, planName, itemCode) => {
    if (!phoneNumber) {
      return toast.warning("Please enter a phone number before selecting a data plan.");
    }
    if (phoneNumber.length < 11) {
      return toast.warning("Please enter a valid 11-digit phone number.");
    }

    dispatch(
      selectedPrice({
        productName: "Data",
        billType: "data",
        price: amount,
        customerID: phoneNumber,
        bonusToEarn: "50 NGN",
        plan: planName,
        network: selectedNetwork.toUpperCase(),
        itemCode: itemCode,
      }),
    );
    setSelectedPlanForDetails(null);
    setIsConfirmationOpen(true);
  };

  const handleConfirmPayment = async (pin) => {
    try {
      const netName = selectedNetwork.toUpperCase();
      const planName = transactions?.plan || "Data Plan";
      const price = Number(transactions?.price || 0);

      const res = await purchaseData({
        network: netName,
        plan: transactions?.itemCode || transactions?.plan || "1GB",
        phone: phoneNumber,
        amount: price,
        pin,
      });

      if (res?.status === "success") {
        toast.success(`Data plan (${planName}) purchased successfully for ${phoneNumber}!`);
        setSuccessData({
          category: "Data Plan",
          productName: planName,
          network: netName,
          amount: price,
          customerId: phoneNumber,
          tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
          bonusToEarn: transactions?.bonusToEarn || "50 NGN",
        });
        setPhoneNumber("");
        setIsConfirmationOpen(false);
        setIsSuccessOpen(true);
        return true;
      } else if (res?.status === "provider_error") {
        setFailedData({
          category: "Data Plan",
          productName: planName,
          network: netName,
          amount: price,
          customerId: phoneNumber,
          tx_ref: res.tx_ref || `PWK_${Date.now()}`,
          reason: res.message || "Temporary maintenance on provider gateway. Your PayWaka wallet was not charged (or has been refunded).",
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
          reason: res?.message || "Data plan purchase failed. Please check your balance or recipient details.",
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

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 relative min-h-screen">
        {spin && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
            <p className="text-foreground text-sm font-medium animate-pulse">Loading Live PayWaka Bundles...</p>
          </div>
        )}

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Wifi className="h-7 w-7 text-emerald-500 animate-pulse" />
              PayWaka Mobile Data
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Select your network and pick from daily, weekly, monthly, and special awoof data bundles with instant delivery.
            </p>
          </div>
        </div>

        {/* Network & Phone Input Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-500" />
              Recipient Details & Network Selection
            </CardTitle>
            <CardDescription>
              Enter the recipient 11-digit phone number and select the network carrier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone-number" className="text-sm font-semibold text-foreground">
                Phone Number
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="phone-number"
                  type="tel"
                  maxLength={11}
                  placeholder="e.g., 08012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10 h-12 text-lg font-medium border-border/80 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Network Selector Cards */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Select Network Provider</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {networks.map((netOption) => {
                  const isSelected = selectedNetwork === netOption.id;
                  return (
                    <button
                      key={netOption.id}
                      type="button"
                      onClick={() => handleNetworkSelect(netOption)}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 text-left ${isSelected
                          ? `bg-gradient-to-br ${netOption.color} ring-2 ring-emerald-500 shadow-md transform scale-[1.02]`
                          : "bg-background/80 border-border/60 hover:border-emerald-500/50 hover:bg-accent/40"
                        }`}
                    >
                      <span className="text-3xl mb-1">{netOption.logo}</span>
                      <span className="font-bold text-foreground text-base tracking-wide">{netOption.name}</span>
                      <span className="text-[11px] font-medium text-emerald-500 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {netOption.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Navigation Tabs & Search */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
              {categoryTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                const count = categoryCounts[tab.id] || 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${isActive
                        ? "bg-emerald-600 text-foreground shadow-md shadow-emerald-600/20"
                        : "bg-card/70 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20 text-foreground" : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search plans e.g. 1GB, weekend, awoof..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs md:text-sm bg-card/60 border-border/60"
              />
            </div>
          </div>
        </div>

        {/* Data Plan Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPlans && filteredPlans.length > 0 ? (
            filteredPlans.map((plan, idx) => {
              const primaryPerk = plan.primaryPerk;
              const PerkIcon = primaryPerk?.icon || Sparkles;

              return (
                <Card
                  key={`${plan.id || plan.item_code}-${idx}`}
                  className={`flex flex-col justify-between border bg-card/80 transition-all duration-300 group relative overflow-hidden ${
                    plan.hasSpecialPerks
                      ? "border-emerald-500/30 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10"
                      : "border-border/60 hover:border-emerald-500/60 hover:shadow-xl"
                  }`}
                >
                  <CardHeader className="pb-2.5">
                    {/* Top row badges */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">
                        {plan.category === "daily"
                          ? `${plan.validityDisplay} Plan`
                          : plan.category === "weekly"
                            ? `${plan.validityDisplay} Plan`
                            : plan.category === "mega"
                              ? "Mega Heavy Plan"
                              : `${plan.validityDisplay} Plan`}
                      </span>
                      <Wifi className="h-4.5 w-4.5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                    </div>

                    {/* Plan Title */}
                    <CardTitle className="text-xl font-extrabold text-foreground mt-2 leading-snug group-hover:text-emerald-400 transition-colors">
                      {plan.cleanTitle}
                    </CardTitle>

                    <CardDescription className="text-xs text-muted-foreground truncate">
                      {selectedNetwork} • {plan.validityDisplay} Validity
                    </CardDescription>

                    {/* SPECIAL UNIQUE VALUE IDENTIFIER BADGE */}
                    {plan.hasSpecialPerks && primaryPerk && (
                      <div className="mt-2.5 pt-2 border-t border-border/40">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanForDetails(plan);
                          }}
                          className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${primaryPerk.bg} ${primaryPerk.color} ${primaryPerk.border} hover:brightness-125 shadow-sm active:scale-[0.98] cursor-pointer group/perk`}
                          title="Click to view full plan terms and details"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <PerkIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{primaryPerk.shortLabel}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-white/15 px-1.5 py-0.5 rounded text-foreground shrink-0 group-hover/perk:bg-white/25">
                            <Info className="w-2.5 h-2.5" />
                            Details
                          </span>
                        </button>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-0">
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">Price</span>
                        <div className="text-right">
                          <span className="text-2xl font-black text-foreground tracking-tight">
                            ₦{Number(plan.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                          {plan.cashbackAmount > 0 && (
                            <div className="text-[11px] font-bold text-emerald-400 mt-0.5">
                              Earn ₦{Number(plan.cashbackAmount).toLocaleString()} Cashback
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" /> Validity:
                        </span>
                        <span className="font-semibold text-foreground">{plan.validityDisplay}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground font-bold h-11 rounded-xl shadow-md shadow-emerald-600/20 group-hover:scale-[1.01] transition-all"
                      onClick={() => handleBuyNow(plan.amount, plan.cleanTitle, plan.item_code)}
                    >
                      Buy Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center border border-dashed border-border/60 rounded-2xl bg-card/30">
              <Wifi className="h-10 w-10 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-foreground">No Plans Found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? `No data plans match "${searchQuery}" under ${selectedNetwork}.`
                  : `No data plans available for ${selectedNetwork} under this category.`}
              </p>
            </div>
          )}
        </div>

        {/* Footer info notice */}
        <div className="mt-8 p-4 rounded-xl border border-border/40 bg-card/40 text-center text-xs text-muted-foreground">
          <p>
            💡 Note: Data bundles are delivered instantly to your specified recipient number via PayWaka network gateway. Please verify your phone number before confirming payment.
          </p>
        </div>
      </div>

      {/* PLAN PERKS & DETAILED BREAKDOWN MODAL */}
      <Dialog
        open={Boolean(selectedPlanForDetails)}
        onOpenChange={(open) => {
          if (!open) setSelectedPlanForDetails(null);
        }}
      >
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg bg-card border border-border text-foreground p-0 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col z-[100] m-0 outline-none">
          {selectedPlanForDetails && (
            <>
              {/* Header */}
              <div className="p-5 pb-4 border-b border-border/80 bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                      <span>Plan Perks & Details</span>
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      {selectedNetwork} Network • {selectedPlanForDetails.validityDisplay} Validity
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {selectedPlanForDetails.category?.toUpperCase()}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Hero Plan Overview */}
                <div className="p-4 rounded-xl bg-muted/60 border border-border">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Full Plan Title
                  </span>
                  <h3 className="text-xl font-black text-foreground mt-1">
                    {selectedPlanForDetails.cleanTitle}
                  </h3>
                  <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-border/80">
                    <span className="text-xs text-muted-foreground">Instant Recharge Price:</span>
                    <span className="text-2xl font-black text-emerald-400">
                      ₦{Number(selectedPlanForDetails.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Special Perks Breakdown */}
                {selectedPlanForDetails.hasSpecialPerks && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Special Value Highlights
                    </span>

                    <div className="space-y-2">
                      {selectedPlanForDetails.perks.map((perk, idx) => {
                        const PerkIcon = perk.icon || Gift;
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border ${perk.bg} ${perk.border} space-y-1`}
                          >
                            <div className={`flex items-center gap-2 font-bold text-sm ${perk.color}`}>
                              <PerkIcon className="w-4 h-4 shrink-0" />
                              <span>{perk.fullLabel}</span>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed pl-6">
                              {perk.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Usage Terms & Features list */}
                <div className="rounded-xl bg-muted/40 border border-border/80 p-3.5 space-y-2 text-xs">
                  <span className="font-bold text-foreground block text-xs uppercase tracking-wider">
                    Plan Specifications & Delivery
                  </span>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Network Carrier:</strong> Delivered across {selectedNetwork} 4G/5G LTE high-speed cellular networks.
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Instant Recharge:</strong> Automatically credited to recipient SIM upon transaction approval.
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Validity Duration:</strong> Active for {selectedPlanForDetails.validityDisplay} from the time of delivery.
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Cashback Reward:</strong> Earn up to 50 NGN cashback points directly into your PayWaka wallet.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="p-4 border-t border-border/80 bg-muted/40 flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPlanForDetails(null)}
                  className="flex-1 bg-muted border-border hover:bg-muted text-foreground font-semibold text-xs h-11"
                >
                  Close
                </Button>

                <Button
                  onClick={() =>
                    handleBuyNow(
                      selectedPlanForDetails.amount,
                      selectedPlanForDetails.cleanTitle,
                      selectedPlanForDetails.item_code
                    )
                  }
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs h-11 shadow-lg shadow-emerald-950/40"
                >
                  <span>Proceed to Buy Now</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
    </DashboardLayout>
  );
}

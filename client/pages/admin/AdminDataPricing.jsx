import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  RefreshCw,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Percent,
  Sliders,
  Save,
  Zap,
  Search,
  AlertCircle,
} from "lucide-react";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";

export function computePlanPricingClient(plan, config) {
  const numCost = Number(plan.costPrice || 0);
  const numComp =
    plan.competitorPrice !== null && plan.competitorPrice !== undefined && plan.competitorPrice !== ""
      ? Number(plan.competitorPrice)
      : null;
  const numCustom =
    plan.customDisplayPrice !== null && plan.customDisplayPrice !== undefined && plan.customDisplayPrice !== ""
      ? Number(plan.customDisplayPrice)
      : null;
  const overrideMode = plan.overrideMode || "AUTOMATIC";

  const netUpper = String(plan.network || "MTN").toUpperCase();
  const netKey = netUpper.includes("GLO")
    ? "GLO"
    : netUpper.includes("AIRTEL")
      ? "AIRTEL"
      : netUpper.includes("9MOB") || netUpper.includes("ETISALAT")
        ? "9MOBILE"
        : "MTN";

  const netConfig = config?.networks?.[netKey] || { marginRate: 0.30, cashbackRate: 0.025 };
  const undercutSpreadMin = Number(config?.undercutSpreadMin ?? 20);
  const undercutDiscount = Number(config?.undercutDiscount ?? 10);
  const largePlanThreshold = Number(config?.largePlanThreshold ?? 10000);
  const heroCashbackRate = Number(config?.heroCashbackRate ?? 0.005);
  const standardMarginRate = Number(netConfig?.marginRate ?? 0.30);
  const standardCashbackRate = Number(netConfig?.cashbackRate ?? 0.025);

  if (overrideMode === "MANUAL" && numCustom && numCustom > 0) {
    const isHero = numComp !== null && !isNaN(numComp) && numComp > 0;
    const cashbackRate = isHero ? heroCashbackRate : standardCashbackRate;
    const margin = Math.max(0, numCustom - numCost);
    const cashbackAmount = Math.round(margin * cashbackRate * 100) / 100;
    const profit = Math.round((numCustom - numCost - cashbackAmount) * 100) / 100;

    return {
      displayPrice: numCustom,
      costPrice: numCost,
      competitorPrice: numComp,
      isHero,
      cashbackRate,
      cashbackAmount,
      profit,
      ruleApplied: "MANUAL_OVERRIDE",
    };
  }

  let displayPrice = 0;
  let isHero = false;
  let ruleApplied = "STANDARD_MARGIN";

  if (numComp !== null && !isNaN(numComp) && numComp > 0) {
    const spread = numComp - numCost;

    if (numComp >= largePlanThreshold) {
      displayPrice = numComp;
      isHero = true;
      ruleApplied = "LARGE_PLAN_MATCH";
    } else if (spread > undercutSpreadMin) {
      const floorTarget = Math.round((numCost * 1.01) / 10) * 10;
      const undercutTarget = numComp - undercutDiscount;
      displayPrice = Math.max(floorTarget, undercutTarget);
      isHero = true;
      ruleApplied = "COMPETITOR_UNDERCUT";
    } else if (spread > 0) {
      displayPrice = numComp;
      isHero = true;
      ruleApplied = "TIGHT_MARGIN_MATCH";
    } else {
      displayPrice = Math.round((numCost * (1 + standardMarginRate)) / 10) * 10;
      isHero = false;
      ruleApplied = "LOSS_PREVENTION_FALLBACK";
    }
  } else {
    displayPrice = Math.round((numCost * (1 + standardMarginRate)) / 10) * 10;
    isHero = false;
    ruleApplied = "STANDARD_MARGIN";
  }

  const cashbackRate = isHero ? heroCashbackRate : standardCashbackRate;
  const margin = Math.max(0, displayPrice - numCost);
  const cashbackAmount = Math.round(margin * cashbackRate * 100) / 100;
  const profit = Math.round((displayPrice - numCost - cashbackAmount) * 100) / 100;

  return {
    displayPrice,
    costPrice: numCost,
    competitorPrice: numComp,
    isHero,
    cashbackRate,
    cashbackAmount,
    profit,
    ruleApplied,
  };
}

export default function AdminDataPricing() {
  const {
    adminGetPricingConfig,
    adminSyncClubKonnect,
    adminUpdatePricingConfig,
    adminUpdatePlanPrice,
    adminSeedPricingFromExcel,
  } = useCloudfunc();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);

  const [activeNetwork, setActiveNetwork] = useState("MTN");
  const [searchQuery, setSearchQuery] = useState("");
  const [config, setConfig] = useState({
    networks: {
      MTN: { marginRate: 0.30, cashbackRate: 0.025 },
      GLO: { marginRate: 0.20, cashbackRate: 0.020 },
      AIRTEL: { marginRate: 0.28, cashbackRate: 0.025 },
      "9MOBILE": { marginRate: 0.15, cashbackRate: 0.015 },
    },
    undercutSpreadMin: 20,
    undercutDiscount: 10,
    largePlanThreshold: 10000,
    heroCashbackRate: 0.005,
  });

  const [plans, setPlans] = useState([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editGlobalConfig, setEditGlobalConfig] = useState(config);

  const loadPricingData = async () => {
    setLoading(true);
    try {
      console.log("📡 [AdminDataPricing] Fetching pricing config & plans...");
      const res = await adminGetPricingConfig();
      if (res?.status === "success") {
        if (res.config) {
          setConfig(res.config);
          setEditGlobalConfig(res.config);
        }
        if (Array.isArray(res.plans)) {
          console.log(`✅ [AdminDataPricing] Loaded ${res.plans.length} plans successfully.`);
          setPlans(res.plans);
        }
      } else {
        const errorMsg = res?.message || "Failed to load pricing configuration.";
        console.error("❌ [AdminDataPricing] Non-success response:", res);
        toast.error(`Pricing Load Failed: ${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ [AdminDataPricing] Error loading pricing data:", err);
      const errMsg =
        err?.details?.message ||
        err?.message ||
        err?.customData?.message ||
        "Error loading pricing dashboard.";
      toast.error(`Load Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricingData();
  }, []);

  const handleSyncClubKonnect = async () => {
    setSyncing(true);
    try {
      console.log("📡 [AdminDataPricing] Requesting ClubKonnect cost sync...");
      const res = await adminSyncClubKonnect();
      if (res?.status === "success") {
        toast.success(res.message || "Successfully synced data plans from ClubKonnect!");
        await loadPricingData();
      } else {
        const errorMsg = res?.message || "ClubKonnect sync failed.";
        console.error("❌ [AdminDataPricing] Sync non-success response:", res);
        toast.error(`Sync Failed: ${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ [AdminDataPricing] Error syncing ClubKonnect:", err);
      const errMsg =
        err?.details?.message ||
        err?.message ||
        err?.customData?.message ||
        "Sync request failed.";
      toast.error(`Sync Failed: ${errMsg}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSeedExcel = async () => {
    setSeeding(true);
    try {
      console.log("📡 [AdminDataPricing] Seeding Excel pricing model...");
      const res = await adminSeedPricingFromExcel();
      if (res?.status === "success") {
        toast.success(res.message || "Baseline Excel pricing model seeded!");
        await loadPricingData();
      } else {
        const errorMsg = res?.message || "Seeding failed.";
        console.error("❌ [AdminDataPricing] Seeding non-success response:", res);
        toast.error(`Seeding Failed: ${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ [AdminDataPricing] Error seeding Excel:", err);
      const errMsg =
        err?.details?.message ||
        err?.message ||
        err?.customData?.message ||
        "Seeding request failed.";
      toast.error(`Seeding Failed: ${errMsg}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveGlobalConfig = async () => {
    setSavingGlobal(true);
    try {
      console.log("📡 [AdminDataPricing] Saving global configuration...", editGlobalConfig);
      const res = await adminUpdatePricingConfig(editGlobalConfig);
      if (res?.status === "success") {
        toast.success("Global pricing parameters updated!");
        setConfig(editGlobalConfig);
        setIsConfigModalOpen(false);
        await loadPricingData();
      } else {
        const errorMsg = res?.message || "Failed to update global settings.";
        console.error("❌ [AdminDataPricing] Update config non-success:", res);
        toast.error(`Update Failed: ${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ [AdminDataPricing] Error updating global config:", err);
      const errMsg =
        err?.details?.message ||
        err?.message ||
        err?.customData?.message ||
        "Failed to update global settings.";
      toast.error(`Update Failed: ${errMsg}`);
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleUpdatePlan = async (plan) => {
    setSavingRowId(plan.id);
    try {
      console.log(`📡 [AdminDataPricing] Updating plan ${plan.id}...`, plan);
      const res = await adminUpdatePlanPrice({
        docId: plan.id,
        competitorPrice: plan.competitorPrice,
        customDisplayPrice: plan.customDisplayPrice,
        overrideMode: plan.overrideMode,
        isActive: plan.isActive !== undefined ? plan.isActive : true,
      });

      if (res?.status === "success") {
        toast.success(`Updated pricing for ${plan.planName}`);
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, _dirty: false } : p))
        );
        await loadPricingData();
      } else {
        const errorMsg = res?.message || "Failed to update plan.";
        console.error("❌ [AdminDataPricing] Update plan non-success:", res);
        toast.error(`Plan Update Failed: ${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ [AdminDataPricing] Error updating plan:", err);
      const errMsg =
        err?.details?.message ||
        err?.message ||
        err?.customData?.message ||
        "Plan update failed.";
      toast.error(`Update Failed: ${errMsg}`);
    } finally {
      setSavingRowId(null);
    }
  };

  const handleFieldChange = (docId, field, value) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === docId) {
          const updated = { ...p, [field]: value };

          if (field === "customDisplayPrice") {
            if (value !== "" && value !== null && value !== undefined) {
              const numVal = parseFloat(value);
              updated.customDisplayPrice = isNaN(numVal) ? null : numVal;
              updated.overrideMode = "MANUAL";
            } else {
              updated.customDisplayPrice = null;
              updated.overrideMode = "AUTOMATIC";
            }
          } else if (field === "competitorPrice") {
            if (value !== "" && value !== null && value !== undefined) {
              const numVal = parseFloat(value);
              updated.competitorPrice = isNaN(numVal) ? null : numVal;
            } else {
              updated.competitorPrice = null;
            }
          } else if (field === "overrideMode") {
            if (value === "MANUAL") {
              updated.overrideMode = "MANUAL";
              if (updated.customDisplayPrice === null || updated.customDisplayPrice === undefined || updated.customDisplayPrice === "") {
                updated.customDisplayPrice = p.displayPrice || p.costPrice || 0;
              }
            } else {
              updated.overrideMode = "AUTOMATIC";
              updated.customDisplayPrice = null;
            }
          }

          const pricingPreview = computePlanPricingClient(updated, config);
          return {
            ...updated,
            ...pricingPreview,
            _dirty: true,
          };
        }
        return p;
      }),
    );
  };

  const networkPlans = useMemo(() => {
    return plans.filter((p) => {
      const pNet = String(p.network || "").toUpperCase();
      const matchNet = pNet === activeNetwork;
      const matchSearch =
        !searchQuery ||
        String(p.planName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.planId || "").includes(searchQuery);
      return matchNet && matchSearch;
    });
  }, [plans, activeNetwork, searchQuery]);

  const kpis = useMemo(() => {
    const activeList = plans.filter((p) => p.isActive !== false);
    const heroCount = activeList.filter((p) => p.isHero).length;
    const totalProfit = activeList.reduce((acc, p) => acc + (Number(p.profit) || 0), 0);
    const avgMargin = activeList.length > 0 ? (totalProfit / activeList.length).toFixed(1) : 0;

    return {
      totalPlans: plans.length,
      activePlans: activeList.length,
      heroCount,
      avgProfit: avgMargin,
    };
  }, [plans]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-2xl border border-orange-500/20 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                <Sliders className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Dynamic Data Plan Pricing Engine
              </h1>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Manage competitive pricing model, ClubKonnect wholesale margins, competitor undercuts, and manual overrides.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSyncClubKonnect}
              disabled={syncing || loading}
              variant="outline"
              className="bg-gray-900/80 border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin text-orange-400" : ""}`} />
              {syncing ? "Syncing Costs..." : "Sync ClubKonnect Costs"}
            </Button>

            <Button
              onClick={handleSeedExcel}
              disabled={seeding || loading}
              variant="outline"
              className="bg-gray-900/80 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-all"
            >
              <Zap className={`w-4 h-4 mr-2 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? "Seeding Excel..." : "Seed Excel Model"}
            </Button>

            <Button
              onClick={() => {
                setEditGlobalConfig(config);
                setIsConfigModalOpen(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-lg shadow-orange-500/20 transition-all"
            >
              <Sliders className="w-4 h-4 mr-2" />
              Global Margins & Rules
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900/60 border-gray-800 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Managed Plans</p>
                <h3 className="text-2xl font-bold text-white mt-1">{kpis.totalPlans}</h3>
                <span className="text-xs text-emerald-400 font-semibold">{kpis.activePlans} Active</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Hero Competitive Plans</p>
                <h3 className="text-2xl font-bold text-amber-400 mt-1">{kpis.heroCount}</h3>
                <span className="text-xs text-gray-400">Undercutting Competitors</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Avg Net Profit / Plan</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1">₦{kpis.avgProfit}</h3>
                <span className="text-xs text-emerald-400 font-semibold">After Payouts & Cashback</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{activeNetwork} Standard Margin</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {((config.networks?.[activeNetwork]?.marginRate || 0) * 100).toFixed(0)}%
                </h3>
                <span className="text-xs text-gray-400">
                  Cashback: {((config.networks?.[activeNetwork]?.cashbackRate || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Percent className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Network Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {["MTN", "GLO", "AIRTEL", "9MOBILE"].map((net) => {
              const active = activeNetwork === net;
              return (
                <button
                  key={net}
                  onClick={() => setActiveNetwork(net)}
                  className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${active
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                >
                  {net}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search plan name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-950 border-gray-800 text-white text-sm focus:border-orange-500"
            />
          </div>
        </div>

        {/* Interactive Pricing Grid */}
        <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-md overflow-hidden">
          <CardHeader className="p-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
              <span>{activeNetwork} Data Plan Pricing Catalog</span>
              <span className="text-xs text-gray-400 font-normal">
                Showing {networkPlans.length} plans
              </span>
            </CardTitle>
          </CardHeader>
          {networkPlans.some((p) => p.fallbackApplied) && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Sync Warning:</strong> {networkPlans.filter((p) => p.fallbackApplied).length} plans in {activeNetwork} have fallback defaults applied due to missing fields. Check logs or re-sync with ClubKonnect.
                </span>
              </div>
            </div>
          )}
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500 mb-3" />
                Loading pricing configuration catalog...
              </div>
            ) : networkPlans.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No data plans found for {activeNetwork}. Click "Sync ClubKonnect Costs" above.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-950 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">Plan Details</th>
                    <th className="px-4 py-3 text-right">Wholesale Cost</th>
                    <th className="px-4 py-3 text-right">Competitor (₦)</th>
                    <th className="px-4 py-3 text-right">Formula Price</th>
                    <th className="px-4 py-3 text-right">Override Price (₦)</th>
                    <th className="px-4 py-3 text-center">Mode</th>
                    <th className="px-4 py-3 text-right">Net Profit</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {networkPlans.map((plan) => {
                    const isManual = plan.overrideMode === "MANUAL";
                    const isHero = plan.isHero;
                    const profitVal = Number(plan.profit || 0);

                    return (
                      <tr key={plan.id} className="hover:bg-gray-800/40 transition-colors">
                        {/* Plan Title */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{plan.planName}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                            <span>Code: {plan.planId}</span>
                            <span>•</span>
                            <span>{plan.validity_period || plan.validity || "30 Days"}</span>
                            {isHero && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                HERO
                              </span>
                            )}
                            {plan.fallbackApplied && (
                              <span
                                className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-1.5 py-0.5 rounded font-bold cursor-help"
                                title={`Fallback defaults applied: ${plan.fallbackReasons?.join("; ") || plan.fallbackFields?.join(", ")}`}
                              >
                                FALLBACK: {plan.fallbackFields?.join(", ")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Wholesale Cost */}
                        <td className="px-4 py-3 text-right font-mono text-gray-300">
                          ₦{(plan.costPrice || 0).toLocaleString()}
                        </td>

                        {/* Competitor Price Input */}
                        <td className="px-4 py-3 text-right">
                          <Input
                            type="number"
                            placeholder="None"
                            value={plan.competitorPrice ?? ""}
                            onChange={(e) => handleFieldChange(plan.id, "competitorPrice", e.target.value)}
                            className="w-24 text-right bg-gray-950 border-gray-800 text-white text-xs h-8 ml-auto focus:border-amber-500 transition-colors"
                          />
                        </td>

                        {/* Formula Calculated Selling Price */}
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          <div className="text-white">
                            ₦{(plan.displayPrice || 0).toLocaleString()}
                          </div>
                          {isManual ? (
                            <span className="inline-block text-[9px] font-semibold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              OVERRIDE
                            </span>
                          ) : isHero ? (
                            <span className="inline-block text-[9px] font-semibold px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              FORMULA
                            </span>
                          ) : null}
                        </td>

                        {/* Custom Display Price Override */}
                        <td className="px-4 py-3 text-right">
                          <Input
                            type="number"
                            placeholder="Auto"
                            value={plan.customDisplayPrice ?? ""}
                            onChange={(e) => handleFieldChange(plan.id, "customDisplayPrice", e.target.value)}
                            className={`w-28 text-right bg-gray-950 text-xs h-8 ml-auto transition-all ${
                              isManual
                                ? "text-amber-300 font-bold border-amber-500/60 bg-amber-500/10 focus:border-amber-400"
                                : "text-gray-300 border-gray-800 hover:border-gray-700 focus:border-orange-500"
                            }`}
                          />
                        </td>

                        {/* Mode Select */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              handleFieldChange(
                                plan.id,
                                "overrideMode",
                                isManual ? "AUTOMATIC" : "MANUAL",
                              )
                            }
                            title={isManual ? "Click to switch back to formula pricing" : "Click to activate manual override price"}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-all ${
                              isManual
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                                : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700"
                            }`}
                          >
                            {isManual ? "MANUAL" : "AUTO"}
                          </button>
                        </td>

                        {/* Net Profit */}
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={profitVal >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            ₦{profitVal.toLocaleString()}
                          </span>
                          <div className="text-[10px] text-gray-400 font-normal">
                            CB: ₦{(plan.cashbackAmount || 0).toLocaleString()} ({((plan.cashbackRate || 0) * 100).toFixed(1)}%)
                          </div>
                        </td>

                        {/* Active Toggle */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleFieldChange(plan.id, "isActive", !plan.isActive)}
                            className={`text-xs font-semibold px-2 py-1 rounded transition-all ${plan.isActive !== false
                                ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                                : "text-gray-500 bg-gray-800 opacity-60 hover:opacity-100"
                              }`}
                          >
                            {plan.isActive !== false ? "Active" : "Disabled"}
                          </button>
                        </td>

                        {/* Save Action */}
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePlan(plan)}
                            disabled={savingRowId === plan.id}
                            className={`text-xs h-8 px-3 transition-all ${
                              plan._dirty
                                ? "bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/25 border-transparent"
                                : "bg-orange-500/20 hover:bg-orange-500 text-orange-300 hover:text-white border border-orange-500/40"
                            }`}
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            {savingRowId === plan.id ? "..." : plan._dirty ? "Save *" : "Save"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Global Configuration Modal */}
        <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-400" />
                Global Pricing Parameters
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                Configure default network markup rates, cashback payouts, and competitor undercut rules.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                {["MTN", "GLO", "AIRTEL", "9MOBILE"].map((net) => {
                  const netConfig = editGlobalConfig.networks?.[net] || { marginRate: 0.25, cashbackRate: 0.02 };
                  return (
                    <div key={net} className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                      <h4 className="font-semibold text-sm text-white">{net} Settings</h4>
                      <div>
                        <Label className="text-xs text-gray-400">Margin % (Over Cost)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={netConfig.marginRate}
                          onChange={(e) =>
                            setEditGlobalConfig((prev) => ({
                              ...prev,
                              networks: {
                                ...prev.networks,
                                [net]: {
                                  ...netConfig,
                                  marginRate: parseFloat(e.target.value) || 0,
                                },
                              },
                            }))
                          }
                          className="bg-gray-900 border-gray-800 text-white text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Cashback % (Of Selling Price)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={netConfig.cashbackRate}
                          onChange={(e) =>
                            setEditGlobalConfig((prev) => ({
                              ...prev,
                              networks: {
                                ...prev.networks,
                                [net]: {
                                  ...netConfig,
                                  cashbackRate: parseFloat(e.target.value) || 0,
                                },
                              },
                            }))
                          }
                          className="bg-gray-900 border-gray-800 text-white text-xs mt-1"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                <h4 className="font-semibold text-sm text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Competitor Undercut & Hero Rules
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-400">Undercut Spread Min (₦)</Label>
                    <Input
                      type="number"
                      value={editGlobalConfig.undercutSpreadMin ?? 20}
                      onChange={(e) =>
                        setEditGlobalConfig((prev) => ({
                          ...prev,
                          undercutSpreadMin: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-gray-900 border-gray-800 text-white text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Undercut Discount (₦)</Label>
                    <Input
                      type="number"
                      value={editGlobalConfig.undercutDiscount ?? 10}
                      onChange={(e) =>
                        setEditGlobalConfig((prev) => ({
                          ...prev,
                          undercutDiscount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-gray-900 border-gray-800 text-white text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Large Plan Threshold (₦)</Label>
                    <Input
                      type="number"
                      value={editGlobalConfig.largePlanThreshold ?? 10000}
                      onChange={(e) =>
                        setEditGlobalConfig((prev) => ({
                          ...prev,
                          largePlanThreshold: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-gray-900 border-gray-800 text-white text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Hero Cashback % (0.005 = 0.5%)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={editGlobalConfig.heroCashbackRate ?? 0.005}
                      onChange={(e) =>
                        setEditGlobalConfig((prev) => ({
                          ...prev,
                          heroCashbackRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-gray-900 border-gray-800 text-white text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
              <Button
                variant="outline"
                onClick={() => setIsConfigModalOpen(false)}
                className="bg-gray-800 text-gray-300 border-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveGlobalConfig}
                disabled={savingGlobal}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {savingGlobal ? "Saving..." : "Save Global Rules"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

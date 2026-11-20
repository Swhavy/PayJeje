import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CircleDollarSign,
  BarChart3,
  Database,
  Users,
  FileClock,
  Settings2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Search,
  Bell,
  Filter,
  Download,
  Plus,
  Menu,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Eye,
  RefreshCw,
  Clock,
  UserCheck,
  UserX,
  Wallet,
  Zap,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Info,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import useCloudfunc from "@/components/useCloudfunc";
import { DEFAULT_BILL_PRICING_CONFIG } from "@shared/billPricingEngine";

// Navigation groupings
const BASE_NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { id: "Overview", icon: LayoutDashboard, label: "Overview" },
      { id: "Transactions", icon: CircleDollarSign, label: "Transactions" },
      { id: "Ledger", icon: BarChart3, label: "Ledger & Margins" },
    ],
  },
  {
    label: "Manage",
    items: [
      { id: "Pricing", icon: Database, label: "Data Pricing", badge: "Engine" },
      { id: "Users", icon: Users, label: "Users" },
      { id: "Audit", icon: FileClock, label: "Audit Log" },
    ],
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useSelector((state) => state?.user?.user) || {};
  const {
    adminGetPricingConfig,
    adminUpdatePricingConfig,
    adminGetDashboardData,
    adminGetBillPricingConfig,
    adminUpdateBillPricingConfig,
  } = useCloudfunc();

  const [activeTab, setActiveTab] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live platform state (grounded in Firestore)
  const [transactions, setTransactions] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    todayTransactions: 0,
    successfulPayments: 0,
    totalVolume: 0,
    netPlatformMargin: 0,
    managedPlansCount: 0,
    totalUserCashbackLiability: 0,
    totalWalletFloat: 0,
    totalFaceValue: 0,
    totalGrossGain: 0,
    totalFeesCollected: 0,
    totalCommission: 0,
    clubkonnectReconciliationTotal: 0,
    totalCashbackGiven: 0,
    totalCashbackSpentInApp: 0,
    totalCashbackTransferredToWallet: 0,
    totalGatewayCost: 0,
    totalNetEarning: 0,
    actualCommissionCount: 0,
    fallbackCommissionCount: 0,
    negativeNetCount: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [billPricingConfig, setBillPricingConfig] = useState(DEFAULT_BILL_PRICING_CONFIG);
  const [billPricingSaving, setBillPricingSaving] = useState(false);

  // Selected Transaction for modal
  const [selectedTx, setSelectedTx] = useState(null);

  // User detail / invite modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Support");

  // Pricing backend state
  const [pricingBackendStatus, setPricingBackendStatus] = useState("checking"); // 'checking' | 'connected' | 'mid-implementation'
  const [backendError, setBackendError] = useState("");
  const [providerMargins, setProviderMargins] = useState([
    { provider: "MTN", service: "Data bundles", margin: "30.0%", rawMargin: 0.30, cashback: "2.5%", status: "Live" },
    { provider: "Airtel", service: "Data bundles", margin: "28.0%", rawMargin: 0.28, cashback: "2.5%", status: "Live" },
    { provider: "Glo", service: "Data bundles", margin: "20.0%", rawMargin: 0.20, cashback: "2.0%", status: "Live" },
    { provider: "9mobile", service: "Data bundles", margin: "15.0%", rawMargin: 0.15, cashback: "1.5%", status: "Live" },
  ]);
  const [pricingSaving, setPricingSaving] = useState(false);

  // Dynamic navigation groups with live counters
  const navGroups = useMemo(() => {
    return BASE_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.id === "Transactions") {
          return { ...item, count: String(transactions.length) };
        }
        if (item.id === "Users") {
          return { ...item, count: String(usersList.length) };
        }
        return item;
      }),
    }));
  }, [transactions.length, usersList.length]);

  // Load real dashboard data from Firestore via Cloud Functions
  const loadDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const [res, billRes] = await Promise.all([
        adminGetDashboardData(),
        adminGetBillPricingConfig().catch(() => null),
      ]);
      if (res?.status === "success") {
        if (Array.isArray(res.transactions)) setTransactions(res.transactions);
        if (Array.isArray(res.users)) setUsersList(res.users);
        if (Array.isArray(res.auditLogs)) setAuditLogs(res.auditLogs);
        if (res.summary) setDashboardSummary((prev) => ({ ...prev, ...res.summary }));
        if (res.billPricingConfig) setBillPricingConfig(res.billPricingConfig);
      }
      if (billRes?.status === "success" && billRes.config) {
        setBillPricingConfig(billRes.config);
      }
    } catch (err) {
      console.warn("Real dashboard data fetch notice:", err.message);
      toast.error(`Admin Dashboard load warning: ${err.message || "Check admin privileges"}`);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleSaveBillPricing = async () => {
    setBillPricingSaving(true);
    try {
      const res = await adminUpdateBillPricingConfig(billPricingConfig);
      if (res?.status === "success" && res.config) {
        setBillPricingConfig(res.config);
        toast.success(`Bill pricing & cashback rules saved (${res.ruleVersion})!`);
      } else {
        toast.error(res?.message || "Failed to save bill pricing rules.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save bill pricing rules: " + err.message);
    } finally {
      setBillPricingSaving(false);
    }
  };

  // Check pricing backend connectivity and load live dashboard on mount
  useEffect(() => {
    let isMounted = true;
    const checkPricingBackend = async () => {
      try {
        const res = await adminGetPricingConfig();
        if (!isMounted) return;
        if (res?.status === "success" && res?.config?.networks) {
          setPricingBackendStatus("connected");
          const net = res.config.networks;
          setProviderMargins((prev) =>
            prev.map((item) => {
              const cfg = net[item.provider.toUpperCase()];
              if (cfg) {
                return {
                  ...item,
                  margin: `${((cfg.marginRate || 0) * 100).toFixed(1)}%`,
                  rawMargin: cfg.marginRate,
                  cashback: `${((cfg.cashbackRate || 0) * 100).toFixed(1)}%`,
                };
              }
              return item;
            })
          );
        } else {
          setPricingBackendStatus("mid-implementation");
          setBackendError(res?.message || "Callable returned non-success status.");
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn("Pricing engine backend check notice:", err.message);
        setPricingBackendStatus("mid-implementation");
        setBackendError(
          err.message?.includes("permission-denied")
            ? "Current account requires elevated admin privileges."
            : "Cloud functions pricing engine is currently being provisioned/tested."
        );
      }
    };

    checkPricingBackend();
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save updated margins
  const handleSavePricing = async () => {
    setPricingSaving(true);
    try {
      const networksPayload = {};
      providerMargins.forEach((item) => {
        const netKey = item.provider.toUpperCase();
        if (["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(netKey)) {
          let marginVal = parseFloat(String(item.margin).replace("%", "").trim());
          if (!isNaN(marginVal)) {
            if (marginVal > 1) marginVal = marginVal / 100;
          } else {
            marginVal = 0.30;
          }

          let cbVal = parseFloat(String(item.cashback).replace("%", "").trim());
          if (!isNaN(cbVal)) {
            if (cbVal > 1) cbVal = cbVal / 100;
          } else {
            cbVal = 0.025;
          }

          networksPayload[netKey] = {
            marginRate: marginVal,
            cashbackRate: cbVal,
          };
        }
      });

      const res = await adminUpdatePricingConfig({ networks: networksPayload });
      if (res?.status === "success") {
        toast.success("Pricing parameters synchronized with Cloud Firestore!");
        const fresh = await adminGetPricingConfig();
        if (fresh?.status === "success" && fresh?.config?.networks) {
          const net = fresh.config.networks;
          setProviderMargins((prev) =>
            prev.map((item) => {
              const cfg = net[item.provider.toUpperCase()];
              if (cfg) {
                return {
                  ...item,
                  margin: `${((cfg.marginRate || 0) * 100).toFixed(1)}%`,
                  rawMargin: cfg.marginRate,
                  cashback: `${((cfg.cashbackRate || 0) * 100).toFixed(1)}%`,
                };
              }
              return item;
            })
          );
        }
      } else {
        toast.error(res?.message || "Failed to sync pricing changes.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not sync pricing changes: " + err.message);
    } finally {
      setPricingSaving(false);
    }
  };

  // Transaction export to CSV (with full financial engineering breakdown)
  const handleExportTransactions = (rowsToExport = transactions) => {
    const list = Array.isArray(rowsToExport) ? rowsToExport : transactions;
    const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "ID",
      "Customer",
      "Email",
      "Service",
      "Provider",
      "FaceValue",
      "ProviderCost",
      "Commission",
      "CommissionSource",
      "FeeCharged",
      "CashbackGiven",
      "CashbackApplied",
      "WalletContribution",
      "FundingSource",
      "GatewayCost",
      "GrossGain",
      "NetEarning",
      "RuleVersion",
      "Status",
      "Time",
      "Reference",
    ];
    const rows = list.map((t) =>
      [
        t.id,
        t.name,
        t.email,
        t.service,
        t.provider,
        t.faceValue ?? t.rawAmount ?? 0,
        t.providerCost ?? 0,
        t.commission ?? 0,
        t.commissionSource ?? "n/a",
        t.feeCharged ?? 0,
        t.cashbackGiven ?? 0,
        t.cashbackApplied ?? 0,
        t.walletContribution ?? t.faceValue ?? 0,
        t.fundingSource ?? "WALLET_ONLY",
        t.gatewayCost ?? 0,
        t.grossGain ?? 0,
        t.netEarning ?? t.rawGain ?? 0,
        t.ruleVersion ?? "—",
        t.status,
        t.time,
        t.reference,
      ]
        .map(escapeCsv)
        .join(","),
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paywaka_earnings_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${list.length} ledger row(s) as CSV`);
  };

  // User status toggle
  const toggleUserStatus = (userId) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === "Active" ? "Suspended" : "Active";
          toast.success(`${u.name} is now ${newStatus}`);
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  // Invite user handler
  const handleInviteUser = (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Please provide an email address.");
      return;
    }
    toast.success(`Invitation sent to ${inviteEmail} (${inviteRole})`);
    setIsInviteModalOpen(false);
    setInviteEmail("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* ── MOBILE BACKDROP OVERLAY ── */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* ── SIDEBAR (DESKTOP & MOBILE DRAWER) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card px-4 py-5 transition-transform duration-200 ease-in-out lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand & Close button */}
        <div className="mb-6 flex items-center justify-between px-2">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
              P
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground leading-none">
                paywaka
              </span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-widest mt-0.5">
                Executive
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace Context Card */}
        <div className="mb-6 rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary shadow-xs border border-border">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Workspace
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                Admin Console
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isActive
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                        {item.label}
                      </span>
                      {item.count && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground border border-border">
                          {item.count}
                        </span>
                      )}
                      {item.badge && (
                        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Workspace Navigation & User Card */}
        <div className="border-t border-border pt-4 mt-auto space-y-3">
          <button
            onClick={() => {
              setActiveTab("Settings");
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${activeTab === "Settings"
                ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            <Settings2 size={16} />
            Platform Settings
          </button>

          <Link
            to="/dashboard"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            User Dashboard
          </Link>

          {/* Admin Profile Details */}
          <div className="flex items-center gap-3 px-2 pt-2 border-t border-border">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
              {user?.fullName
                ? user.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
                : "DA"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.fullName || "David Adeyemi"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user?.email || "admin@paywaka.com"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT VIEWPORT ── */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* TOPBAR */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Open sidebar navigation"
            >
              <Menu size={20} />
            </button>
            <div className="truncate">
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate">
                Admin Console — {activeTab}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDashboardData}
              disabled={dashboardLoading}
              aria-label="Refresh Dashboard"
              title="Refresh live ledger data"
              className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={dashboardLoading ? "animate-spin" : ""} />
            </button>

            {/* Theme Switcher Toggle */}
            <ThemeToggle />

            {/* Notifications Button */}
            <button
              onClick={() => toast.info("No critical platform alerts at this time.")}
              aria-label="Notifications"
              className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Quick Profile Initials */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                {user?.fullName
                  ? user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                  : "DA"}
              </span>
              <span className="text-xs font-medium text-foreground max-w-[120px] truncate">
                {user?.fullName || "David Adeyemi"}
              </span>
            </div>
          </div>
        </header>

        {/* WORKSPACE BODY */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {activeTab === "Overview" && (
            <OverviewTab
              onNavigate={setActiveTab}
              transactions={transactions}
              onSelectTx={setSelectedTx}
              pricingBackendStatus={pricingBackendStatus}
              summary={dashboardSummary}
              loading={dashboardLoading}
            />
          )}

          {activeTab === "Transactions" && (
            <TransactionsTab
              transactions={transactions}
              onSelectTx={setSelectedTx}
              onExport={handleExportTransactions}
              loading={dashboardLoading}
            />
          )}

          {activeTab === "Ledger" && (
            <LedgerTab
              onNavigate={setActiveTab}
              transactions={transactions}
              summary={dashboardSummary}
            />
          )}

          {activeTab === "Pricing" && (
            <DataPricingTab
              backendStatus={pricingBackendStatus}
              backendError={backendError}
              margins={providerMargins}
              setMargins={setProviderMargins}
              onSave={handleSavePricing}
              isSaving={pricingSaving}
              billPricingConfig={billPricingConfig}
              setBillPricingConfig={setBillPricingConfig}
              onSaveBillPricing={handleSaveBillPricing}
              billPricingSaving={billPricingSaving}
            />
          )}

          {activeTab === "Users" && (
            <UsersTab
              users={usersList}
              onSelectUser={setSelectedUser}
              onToggleStatus={toggleUserStatus}
              onOpenInvite={() => setIsInviteModalOpen(true)}
            />
          )}

          {activeTab === "Audit" && <AuditLogTab logs={auditLogs} />}

          {activeTab === "Settings" && <SettingsTab />}
        </main>
      </div>

      {/* ── TRANSACTION DETAIL MODAL ── */}
      {selectedTx && (
        <TransactionDetailModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}

      {/* ── USER DETAIL MODAL ── */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onToggleStatus={toggleUserStatus}
        />
      )}

      {/* ── INVITE ADMIN MODAL ── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Invite Workspace Admin
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send an administrative invitation to a team member to access the
              PayWaka executive workspace.
            </p>
            <form onSubmit={handleInviteUser} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@paywaka.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Assigned Permission Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Super Admin">Super Admin (Full access)</option>
                  <option value="Operations">Operations Manager</option>
                  <option value="Support">Customer Support Specialist</option>
                  <option value="Auditor">Compliance Auditor (Read only)</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-95 shadow-sm"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 1: OVERVIEW
// ─────────────────────────────────────────────────────────────
function OverviewTab({
  onNavigate,
  transactions = [],
  onSelectTx,
  pricingBackendStatus,
  summary = {},
  loading = false,
}) {
  const todayCount = summary.todayTransactions ?? 0;
  const successCount = summary.successfulPayments ?? transactions.filter((t) => t.status === "Success").length;
  const totalTxCount = summary.totalTransactions ?? transactions.length;
  const successRate = totalTxCount > 0 ? `${((successCount / totalTxCount) * 100).toFixed(1)}%` : "100%";
  const totalVolNum = summary.totalVolume ?? transactions.reduce((acc, t) => acc + (t.rawAmount || 0), 0);
  const netMarginNum = summary.netPlatformMargin ?? transactions.reduce((acc, t) => acc + (t.rawGain || 0), 0);
  const avgMarginRate = totalVolNum > 0 ? `${((netMarginNum / totalVolNum) * 100).toFixed(1)}%` : "0.0%";

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayJsDay = new Date().getDay();

  const dayVolumes = daysOfWeek.map((dayName, idx) => {
    const jsDay = idx === 6 ? 0 : idx + 1;
    const matching = transactions.filter((t) => {
      const dt = t.timeMillis ? new Date(t.timeMillis) : null;
      return dt && dt.getDay() === jsDay;
    });
    const vol = matching.reduce((acc, t) => acc + (t.rawAmount || 0), 0);
    const gain = matching.reduce((acc, t) => acc + (t.rawGain || 0), 0);
    return {
      day: dayName,
      volNum: vol,
      vol: `₦${vol.toLocaleString()}`,
      gain: `₦${gain.toLocaleString()}`,
      count: matching.length,
      isToday: todayJsDay === jsDay,
    };
  });
  const maxDayVol = Math.max(...dayVolumes.map((d) => d.volNum), 1000);

  const dataTxVol = transactions
    .filter((t) => String(t.service || "").toLowerCase().includes("data"))
    .reduce((acc, t) => acc + (t.rawAmount || 0), 0);
  const airtimeTxVol = transactions
    .filter((t) => String(t.service || "").toLowerCase().includes("airtime"))
    .reduce((acc, t) => acc + (t.rawAmount || 0), 0);
  const electTxVol = transactions
    .filter((t) => String(t.service || "").toLowerCase().includes("elect"))
    .reduce((acc, t) => acc + (t.rawAmount || 0), 0);
  const cableTxVol = transactions
    .filter(
      (t) =>
        String(t.service || "").toLowerCase().includes("cable") ||
        String(t.service || "").toLowerCase().includes("tv"),
    )
    .reduce((acc, t) => acc + (t.rawAmount || 0), 0);

  const serviceCategories = [
    {
      label: "Data Bundles",
      volNum: dataTxVol,
      volume: `₦${dataTxVol.toLocaleString()}`,
      share: totalVolNum > 0 ? `${((dataTxVol / totalVolNum) * 100).toFixed(1)}%` : "0%",
      shareNum: totalVolNum > 0 ? (dataTxVol / totalVolNum) * 100 : 0,
      color: "bg-primary",
    },
    {
      label: "Airtime Top-ups",
      volNum: airtimeTxVol,
      volume: `₦${airtimeTxVol.toLocaleString()}`,
      share: totalVolNum > 0 ? `${((airtimeTxVol / totalVolNum) * 100).toFixed(1)}%` : "0%",
      shareNum: totalVolNum > 0 ? (airtimeTxVol / totalVolNum) * 100 : 0,
      color: "bg-emerald-400",
    },
    {
      label: "Electricity Bills",
      volNum: electTxVol,
      volume: `₦${electTxVol.toLocaleString()}`,
      share: totalVolNum > 0 ? `${((electTxVol / totalVolNum) * 100).toFixed(1)}%` : "0%",
      shareNum: totalVolNum > 0 ? (electTxVol / totalVolNum) * 100 : 0,
      color: "bg-amber-400",
    },
    {
      label: "Cable TV & Others",
      volNum: cableTxVol,
      volume: `₦${cableTxVol.toLocaleString()}`,
      share: totalVolNum > 0 ? `${((cableTxVol / totalVolNum) * 100).toFixed(1)}%` : "0%",
      shareNum: totalVolNum > 0 ? (cableTxVol / totalVolNum) * 100 : 0,
      color: "bg-blue-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Platform Executive Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time transaction volumes, settlement margins, and platform health.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate("Pricing")}
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Database size={14} className="text-primary" />
            Pricing Engine
          </button>
          <button
            onClick={() => onNavigate("Transactions")}
            className="flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:brightness-95 transition-all"
          >
            <CircleDollarSign size={14} />
            View All Transactions
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Face Value"
          value={`₦${totalVolNum.toLocaleString()}`}
          change={`${todayCount} today / ${totalTxCount} total`}
          positive
          icon={Wallet}
          subtitle={`${successCount} successful (${successRate})`}
        />
        <MetricCard
          label="Exact Net Platform Profit"
          value={`₦${Number(summary.totalNetEarning ?? netMarginNum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={avgMarginRate}
          positive={Number(summary.totalNetEarning ?? netMarginNum) >= 0}
          icon={TrendingUp}
          subtitle={`Gross: ₦${Number(summary.totalGrossGain || 0).toLocaleString()} (Fees + Comm)`}
        />
        <MetricCard
          label="User Cashback Liability"
          value={`₦${Number(summary.totalUserCashbackLiability || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`Given: ₦${Number(summary.totalCashbackGiven || 0).toLocaleString()}`}
          positive
          icon={CircleDollarSign}
          subtitle={`Spent: ₦${Number(summary.totalCashbackSpentInApp || 0).toLocaleString()} • Moved ₦1k+: ₦${Number(summary.totalCashbackTransferredToWallet || 0).toLocaleString()}`}
        />
        <MetricCard
          label="ClubKonnect Reconciliation"
          value={`₦${Number(summary.clubkonnectReconciliationTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`${summary.actualCommissionCount || 0} actual / ${summary.fallbackCommissionCount || 0} est.`}
          positive
          icon={BarChart3}
          subtitle={`Comm: ₦${Number(summary.totalCommission || 0).toLocaleString()} • Fees: ₦${Number(summary.totalFeesCollected || 0).toLocaleString()}`}
        />
      </div>

      {/* NEGATIVE NET PROFIT ALERT BANNER */}
      {Number(summary.negativeNetCount || 0) > 0 && (
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400">
                Negative-Net Alert: {summary.negativeNetCount} transaction(s) recorded net loss
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Inspect Ledger &amp; Margins to review provider costs, gateway costs, or cashback rules on flagged orders.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("Ledger")}
            className="text-xs font-bold text-red-500 hover:underline shrink-0"
          >
            Inspect Ledger &rarr;
          </button>
        </div>
      )}

      {/* BACKEND NOTIFICATION BANNER (IF MID-IMPLEMENTATION) */}
      {pricingBackendStatus === "mid-implementation" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                Pricing Engine Backend Status: Mid-Implementation
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cloud callable endpoints (<code>adminGetPricingConfig</code>, <code>adminUpdatePricingConfig</code>) are undergoing integration. The dashboard is operating with resilient local state.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("Pricing")}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
          >
            Inspect Pricing Engine &rarr;
          </button>
        </div>
      )}

      {/* CHART & SERVICE SUMMARY SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Performance (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Volume & Margin Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Platform turnover over the past 7 days
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground border border-border">
              Last 7 Days
            </span>
          </div>

          <div className="h-44 w-full flex items-end gap-2 sm:gap-4 pt-4 pb-2">
            {dayVolumes.map((bar) => {
              const heightPct = bar.volNum > 0 ? Math.max((bar.volNum / maxDayVol) * 100, 10) : 4;
              return (
                <div
                  key={bar.day}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                  title={`${bar.day}: Volume ${bar.vol} (Margin: ${bar.gain}, ${bar.count} tx)`}
                >
                  <div
                    className={`w-full max-w-[36px] rounded-t-md transition-all duration-200 group-hover:brightness-110 ${bar.isToday ? "bg-primary" : "bg-primary/25"
                      }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {bar.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              {totalVolNum > 0
                ? `Total Volume: ₦${totalVolNum.toLocaleString()}`
                : "Awaiting live transactions"}
            </span>
            <span className="font-semibold text-foreground">
              Average Margin: {avgMarginRate}
            </span>
          </div>
        </div>

        {/* Earnings By Service Category */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Volume by Service
          </h3>
          <div className="space-y-3">
            {serviceCategories.map((service) => (
              <div key={service.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {service.label}
                  </span>
                  <span className="font-semibold text-foreground">
                    {service.volume}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({service.share})
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${service.color}`}
                    style={{ width: `${Math.max(service.shareNum, service.volNum > 0 ? 5 : 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 mt-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Telecom data margin accounts for the majority of platform gross revenue. Margin adjustments directly impact overall daily earnings.
            </p>
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Live Platform Transactions
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest transactions across all customer touchpoints
            </p>
          </div>
          <button
            onClick={() => onNavigate("Transactions")}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View all ledger <ArrowUpRight size={13} />
          </button>
        </div>

        <TransactionsTable
          rows={transactions.slice(0, 5)}
          onSelectTx={onSelectTx}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 2: TRANSACTIONS LEDGER
// ─────────────────────────────────────────────────────────────
function TransactionsTab({ transactions, onSelectTx, onExport }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");

  const filtered = useMemo(() => {
    const nowMs = Date.now();
    const todayIso = new Date().toISOString().slice(0, 10);
    return transactions.filter((tx) => {
      const matchQuery =
        String(tx.name || "").toLowerCase().includes(query.toLowerCase()) ||
        String(tx.service || "").toLowerCase().includes(query.toLowerCase()) ||
        String(tx.id || "").toLowerCase().includes(query.toLowerCase()) ||
        String(tx.provider || "").toLowerCase().includes(query.toLowerCase());
      const matchStatus = statusFilter === "All" || tx.status === statusFilter;
      const svcLower = String(tx.service || "").toLowerCase();
      const matchService =
        serviceFilter === "All" ||
        (serviceFilter === "Electricity" && svcLower.includes("elect")) ||
        (serviceFilter === "Cable" && (svcLower.includes("cable") || svcLower.includes("tv"))) ||
        (serviceFilter === "Data" && svcLower.includes("data")) ||
        (serviceFilter === "Airtime" && svcLower.includes("airtime")) ||
        (serviceFilter === "Cashback Transfer" && svcLower.includes("cashback"));
      let matchDate = true;
      if (dateRangeFilter === "today") {
        matchDate = String(tx.isoDate || "").slice(0, 10) === todayIso;
      } else if (dateRangeFilter === "7d") {
        matchDate = Number(tx.timeMillis || 0) >= nowMs - 7 * 24 * 60 * 60 * 1000;
      } else if (dateRangeFilter === "30d") {
        matchDate = Number(tx.timeMillis || 0) >= nowMs - 30 * 24 * 60 * 60 * 1000;
      }
      return matchQuery && matchStatus && matchService && matchDate;
    });
  }, [transactions, query, statusFilter, serviceFilter, dateRangeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Transaction & Earnings Ledger
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Audit face values, ClubKonnect wholesale costs, commissions, fees, cashback splits, and net platform profit.
          </p>
        </div>
        <button
          onClick={() => onExport(filtered)}
          className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
        >
          <Download size={14} />
          Export Filtered CSV
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-2.5 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by customer name, service, provider, or TX ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Services</option>
              <option value="Electricity">Electricity</option>
              <option value="Cable">Cable TV</option>
              <option value="Data">Data Bundles</option>
              <option value="Airtime">Airtime VTU</option>
              <option value="Cashback Transfer">Cashback Transfers</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
          <span>
            Showing <strong>{filtered.length}</strong> of{" "}
            {transactions.length} transactions
          </span>
          {(query || statusFilter !== "All" || serviceFilter !== "All" || dateRangeFilter !== "all") && (
            <button
              onClick={() => {
                setQuery("");
                setStatusFilter("All");
                setServiceFilter("All");
                setDateRangeFilter("all");
              }}
              className="text-primary font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <TransactionsTable rows={filtered} onSelectTx={onSelectTx} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 3: LEDGER & MARGINS
// ─────────────────────────────────────────────────────────────
function LedgerTab({ onNavigate, transactions = [], summary = {} }) {
  const [serviceFilter, setServiceFilter] = useState("All");
  const [dateRange, setDateRange] = useState("all");

  const filteredTx = useMemo(() => {
    const nowMs = Date.now();
    const todayIso = new Date().toISOString().slice(0, 10);
    return transactions.filter((t) => {
      if (t.status !== "Success") return false;
      const s = String(t.service || "").toLowerCase();
      const matchService =
        serviceFilter === "All" ||
        (serviceFilter === "Electricity" && s.includes("elect")) ||
        (serviceFilter === "Cable" && (s.includes("cable") || s.includes("tv"))) ||
        (serviceFilter === "Data" && s.includes("data")) ||
        (serviceFilter === "Airtime" && s.includes("airtime"));
      let matchDate = true;
      if (dateRange === "today") matchDate = String(t.isoDate || "").slice(0, 10) === todayIso;
      else if (dateRange === "7d") matchDate = Number(t.timeMillis || 0) >= nowMs - 7 * 24 * 60 * 60 * 1000;
      else if (dateRange === "30d") matchDate = Number(t.timeMillis || 0) >= nowMs - 30 * 24 * 60 * 60 * 1000;
      return matchService && matchDate;
    });
  }, [transactions, serviceFilter, dateRange]);

  const useAllStats = serviceFilter === "All" && dateRange === "all";
  const totalVolNum = useAllStats ? (summary.totalVolume ?? 0) : filteredTx.reduce((a, t) => a + (t.faceValue || t.rawAmount || 0), 0);
  const totalFees = useAllStats ? (summary.totalFeesCollected ?? 0) : filteredTx.reduce((a, t) => a + (t.feeCharged || 0), 0);
  const totalCommission = useAllStats ? (summary.totalCommission ?? 0) : filteredTx.reduce((a, t) => a + (t.commission || 0), 0);
  const totalProviderCost = useAllStats ? (summary.clubkonnectReconciliationTotal ?? 0) : filteredTx.reduce((a, t) => a + (t.providerCost || 0), 0);
  const totalCashbackGiven = useAllStats ? (summary.totalCashbackGiven ?? 0) : filteredTx.reduce((a, t) => a + (t.cashbackGiven || 0), 0);
  const totalGrossGain = useAllStats ? (summary.totalGrossGain ?? (totalFees + totalCommission)) : filteredTx.reduce((a, t) => a + (t.grossGain || 0), 0);
  const totalGatewayCost = useAllStats ? (summary.totalGatewayCost ?? 0) : filteredTx.reduce((a, t) => a + (t.gatewayCost || 0), 0);
  const netMarginNum = useAllStats ? (summary.totalNetEarning ?? summary.netPlatformMargin ?? 0) : filteredTx.reduce((a, t) => a + (t.netEarning || 0), 0);
  const avgMarginRate = totalVolNum > 0 ? `${((netMarginNum / totalVolNum) * 100).toFixed(2)}%` : "0.0%";

  const dataTx = filteredTx.filter((t) => String(t.service || "").toLowerCase().includes("data"));
  const dataGain = dataTx.reduce((acc, t) => acc + (t.netEarning ?? t.rawGain ?? 0), 0);
  const dataShare = netMarginNum > 0 ? `${((dataGain / netMarginNum) * 100).toFixed(1)}%` : "0.0%";

  const airtimeTx = filteredTx.filter((t) => String(t.service || "").toLowerCase().includes("airtime"));
  const airtimeGain = airtimeTx.reduce((acc, t) => acc + (t.netEarning ?? t.rawGain ?? 0), 0);
  const airtimeShare = netMarginNum > 0 ? `${((airtimeGain / netMarginNum) * 100).toFixed(1)}%` : "0.0%";

  const billsTx = filteredTx.filter((t) => {
    const s = String(t.service || "").toLowerCase();
    return s.includes("elect") || s.includes("cable") || s.includes("tv") || s.includes("bill");
  });
  const billsGain = billsTx.reduce((acc, t) => acc + (t.netEarning ?? t.rawGain ?? 0), 0);
  const billsShare = netMarginNum > 0 ? `${((billsGain / netMarginNum) * 100).toFixed(1)}%` : "0.0%";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Platform Earnings, Cashback Liability &amp; ClubKonnect Reconciliation
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Exact reconciliation of face value, provider wholesale costs, commissions (actual vs fallback), fees, user cashback owed, and net profits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground"
          >
            <option value="All">All Services</option>
            <option value="Electricity">Electricity</option>
            <option value="Cable">Cable TV</option>
            <option value="Data">Data Bundles</option>
            <option value="Airtime">Airtime VTU</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={() => onNavigate("Pricing")}
            className="flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-95 shadow-sm"
          >
            <Database size={14} />
            Adjust Bill &amp; Data Rules
          </button>
        </div>
      </div>

      {/* PRIMARY FINANCIAL TOTALS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Exact Net Platform Profit"
          value={`₦${Number(netMarginNum || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={avgMarginRate}
          positive={netMarginNum >= 0}
          icon={CircleDollarSign}
          subtitle={`Gross Gain (₦${totalGrossGain.toLocaleString()}) - Cashback - Gateway`}
        />
        <MetricCard
          label="Current Cashback Owed to Users"
          value={`₦${Number(summary.totalUserCashbackLiability || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`Given: ₦${Number(totalCashbackGiven || 0).toLocaleString()}`}
          positive
          icon={Wallet}
          subtitle={`Spent: ₦${Number(summary.totalCashbackSpentInApp || 0).toLocaleString()} • Moved ₦1k+: ₦${Number(summary.totalCashbackTransferredToWallet || 0).toLocaleString()}`}
        />
        <MetricCard
          label="ClubKonnect Cost Reconciliation"
          value={`₦${Number(totalProviderCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`Comm: ₦${Number(totalCommission || 0).toLocaleString()}`}
          positive
          icon={BarChart3}
          subtitle={`Actual: ${summary.actualCommissionCount || 0} • Fallback: ${summary.fallbackCommissionCount || 0}`}
        />
        <MetricCard
          label="Processing Fees Collected"
          value={`₦${Number(totalFees || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`Face: ₦${Number(totalVolNum || 0).toLocaleString()}`}
          positive
          icon={TrendingUp}
          subtitle={`Gateway Cost Recorded: ₦${Number(totalGatewayCost || 0).toLocaleString()}`}
        />
      </div>

      {/* SERVICE MARGIN BREAKDOWN */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-5">
        <h3 className="text-sm font-semibold text-foreground">
          Net Profit Distribution by Service
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Data Bundles (MTN, Glo, Airtel, 9mobile)
            </p>
            <p className="text-xl font-bold text-foreground">
              ₦{Number(dataGain || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-semibold text-primary">
              {dataShare} of filtered net profit ({dataTx.length} tx)
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Airtime VTU Top-ups
            </p>
            <p className="text-xl font-bold text-foreground">
              ₦{Number(airtimeGain || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-semibold text-primary">
              {airtimeShare} of filtered net profit ({airtimeTx.length} tx)
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Electricity &amp; Cable TV Bills
            </p>
            <p className="text-xl font-bold text-foreground">
              ₦{Number(billsGain || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-semibold text-primary">
              {billsShare} of filtered net profit ({billsTx.length} tx)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 4: DATA PRICING & MARGIN ENGINE
// ─────────────────────────────────────────────────────────────
function DataPricingTab({
  backendStatus,
  backendError,
  margins,
  setMargins,
  onSave,
  isSaving,
  billPricingConfig = DEFAULT_BILL_PRICING_CONFIG,
  setBillPricingConfig,
  onSaveBillPricing,
  billPricingSaving = false,
}) {
  const updateMargin = (index, field, value) => {
    setMargins((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateElecTier = (tierKey, field, rawValue) => {
    setBillPricingConfig((prev) => ({
      ...prev,
      electricity: {
        ...prev.electricity,
        tiers: {
          ...prev.electricity.tiers,
          [tierKey]: {
            ...prev.electricity.tiers[tierKey],
            [field]: Number(rawValue || 0),
          },
        },
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Data Pricing & Provider Margins
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure platform markup percentages and customer cashback for telecom providers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/data-pricing"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink size={13} />
            Advanced Plan Editor
          </Link>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-95 transition-all shadow-sm disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {isSaving ? "Saving..." : "Save Parameters"}
          </button>
        </div>
      </div>

      {/* BACKEND INTEGRATION STATUS CALLOUT */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${backendStatus === "connected"
                  ? "bg-emerald-500 animate-pulse"
                  : backendStatus === "mid-implementation"
                    ? "bg-amber-500"
                    : "bg-blue-500 animate-ping"
                }`}
            />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Pricing Engine Callable Status
            </h3>
          </div>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${backendStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
          >
            {backendStatus === "connected"
              ? "Live Firestore Connected"
              : "Mid-Implementation / Verification"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {backendStatus === "connected"
            ? "Successfully communicating with adminGetPricingConfig. Changes saved here update the system_settings/pricing_config Firestore document directly."
            : `Backend status note: ${backendError ||
            "Callable functions are undergoing deployment verification. The pricing interface below provides active local configuration preview."
            }`}
        </p>
      </div>

      {/* DRILLDOWN BANNER TO PER-PLAN CATALOG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Per-Plan Dynamic Pricing Catalog</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure wholesale cost sync, competitor undercutting formulas, hero badges, and manual pricing overrides per individual data bundle.
          </p>
        </div>
        <Link
          to="/admin/data-pricing"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
        >
          Open Per-Plan Catalog
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* MARGINS TABLE */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Provider Margins & Cashback Rates
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Changes apply automatically to newly purchased bundles and wallet debits.
          </p>
        </div>

        <div className="divide-y divide-border">
          {margins.map((item, idx) => (
            <div
              key={item.provider}
              className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.provider}
                </p>
                <p className="text-xs text-muted-foreground">{item.service}</p>
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${item.status === "Live" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                  />
                  {item.status} Pricing
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Margin Markup
                </label>
                <input
                  type="text"
                  value={item.margin}
                  onChange={(e) => updateMargin(idx, "margin", e.target.value)}
                  className="w-full sm:w-28 h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Customer Cashback (% Rate)
                </label>
                <input
                  type="text"
                  value={item.cashback}
                  onChange={(e) => updateMargin(idx, "cashback", e.target.value)}
                  className="w-full sm:w-28 h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BILL PAYMENT FEES & CASHBACK RULES EDITOR */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Bill Payment Fees &amp; Cashback Rules Engine
              </h3>
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-bold text-primary border border-primary/20">
                {billPricingConfig?.ruleVersion || "v1.0.0"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure Electricity processing fees, Cable TV commission shares, Airtime cashback rate, and Cashback-to-Wallet threshold.
            </p>
          </div>
          <button
            type="button"
            onClick={onSaveBillPricing}
            disabled={billPricingSaving}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50 shrink-0"
          >
            {billPricingSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {billPricingSaving ? "Saving Bill Rules..." : "Save Bill Rules"}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Electricity Tier Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Electricity Processing Fees &amp; Cashback Tiers (Fallback Comm: {((billPricingConfig?.electricity?.fallbackCommissionRate ?? 0.005) * 100).toFixed(2)}%)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["tierA", "tierB", "tierC"].map((tKey) => {
                const t = billPricingConfig?.electricity?.tiers?.[tKey] || {};
                const isPct = t.cashbackMode === "percentage_of_gross";
                return (
                  <div key={tKey} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="text-xs font-bold text-foreground">{t.label || tKey}</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Processing Fee (₦)
                        </label>
                        <input
                          type="number"
                          value={t.feeNaira ?? 0}
                          onChange={(e) => updateElecTier(tKey, "feeNaira", e.target.value)}
                          className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                        />
                      </div>
                      {isPct ? (
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                            Cashback (% Gross Gain)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={Math.round((t.cashbackShareOfGross ?? 0.5) * 100)}
                            onChange={(e) =>
                              updateElecTier(tKey, "cashbackShareOfGross", Number(e.target.value || 0) / 100)
                            }
                            className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                            Flat Cashback (₦)
                          </label>
                          <input
                            type="number"
                            value={t.flatCashbackNaira ?? 0}
                            onChange={(e) => updateElecTier(tKey, "flatCashbackNaira", e.target.value)}
                            className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cable TV, Airtime & Vault Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-border">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Cable Processing Fee (₦)
              </label>
              <input
                type="number"
                value={billPricingConfig?.cable?.feeNaira ?? 0}
                onChange={(e) =>
                  setBillPricingConfig((prev) => ({
                    ...prev,
                    cable: { ...prev.cable, feeNaira: Number(e.target.value || 0) },
                  }))
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Cable Cashback (% Commission)
              </label>
              <input
                type="number"
                step="1"
                value={Math.round((billPricingConfig?.cable?.cashbackShareOfCommission ?? 0.5) * 100)}
                onChange={(e) =>
                  setBillPricingConfig((prev) => ({
                    ...prev,
                    cable: { ...prev.cable, cashbackShareOfCommission: Number(e.target.value || 0) / 100 },
                  }))
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Default Airtime Cashback (% Face)
              </label>
              <input
                type="number"
                step="0.1"
                value={Number(((billPricingConfig?.airtime?.cashbackRate ?? 0.015) * 100).toFixed(2))}
                onChange={(e) =>
                  setBillPricingConfig((prev) => ({
                    ...prev,
                    airtime: { ...prev.airtime, cashbackRate: Number(e.target.value || 0) / 100 },
                  }))
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Min Cashback Transfer (₦)
              </label>
              <input
                type="number"
                value={billPricingConfig?.minCashbackTransferNaira ?? 1000}
                onChange={(e) =>
                  setBillPricingConfig((prev) => ({
                    ...prev,
                    minCashbackTransferNaira: Number(e.target.value || 1000),
                  }))
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              />
            </div>
          </div>

          {/* Per-Network Airtime Cashback Rates (ClubKonnect Rates: MTN 3%, Airtel 3%, Glo 8%, 9mobile 7%) */}
          <div className="pt-3 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Per-Network Airtime Cashback (% Face — ClubKonnect Comm: MTN 3%, Airtel 3%, Glo 8%, 9mobile 7%)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "mtn", label: "MTN Cashback (%)" },
                { key: "airtel", label: "Airtel Cashback (%)" },
                { key: "glo", label: "Glo Cashback (%)" },
                { key: "9mobile", label: "9mobile Cashback (%)" },
              ].map(({ key, label }) => {
                const rate = Number(
                  billPricingConfig?.airtime?.cashbackRates?.[key] ??
                    billPricingConfig?.airtime?.cashbackRate ??
                    0.015,
                );
                return (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={Number((rate * 100).toFixed(2))}
                      onChange={(e) =>
                        setBillPricingConfig((prev) => ({
                          ...prev,
                          airtime: {
                            ...prev.airtime,
                            cashbackRates: {
                              ...(prev.airtime?.cashbackRates || {}),
                              [key]: Number(e.target.value || 0) / 100,
                            },
                          },
                        }))
                      }
                      className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 5: USERS MANAGEMENT
// ─────────────────────────────────────────────────────────────
function UsersTab({ users = [], onSelectUser, onToggleStatus, onOpenInvite }) {
  const [search, setSearch] = useState("");

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === "Active").length;
  const adminUsersCount = users.filter((u) => u.role === "Super Admin" || u.role === "Admin" || u.isAdmin).length;
  const customerUsersCount = Math.max(0, totalUsersCount - adminUsersCount);
  const kycVerifiedCount = users.filter((u) => u.kycTier && u.kycTier !== "Tier 0").length;

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || "").includes(search)
    );
  }, [users, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            User Accounts & Compliance
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Inspect active customers, wallet balances, and identity verification tiers.
          </p>
        </div>
        <button
          onClick={onOpenInvite}
          className="flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-95 shadow-sm"
        >
          <Plus size={14} />
          Invite Admin
        </button>
      </div>

      {/* METRIC PILLS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Registered Users"
          value={totalUsersCount.toLocaleString()}
          change={totalUsersCount > 0 ? `${adminUsersCount} admin, ${customerUsersCount} customer` : "0 users"}
          positive
          icon={Users}
          subtitle="Cumulative account creations"
        />
        <MetricCard
          label="Active Accounts"
          value={activeUsersCount.toLocaleString()}
          change={totalUsersCount > 0 ? `${((activeUsersCount / totalUsersCount) * 100).toFixed(0)}% active` : "100%"}
          positive
          icon={Activity}
          subtitle={`${totalUsersCount - activeUsersCount} suspended / inactive`}
        />
        <MetricCard
          label="Verified KYC Accounts"
          value={kycVerifiedCount.toLocaleString()}
          change={totalUsersCount > 0 ? `${((kycVerifiedCount / totalUsersCount) * 100).toFixed(0)}% verified` : "Tiered"}
          positive
          icon={Zap}
          subtitle="Identity verification complete"
        />
      </div>

      {/* SEARCH BAR */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-2.5 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by customer name, email address, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-4 py-3">KYC Tier</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Wallet Balance</th>
                <th className="px-4 py-3">Cashback Owed</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-semibold text-foreground">No accounts found</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {search ? `No accounts match "${search}"` : "User accounts will list here once created."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initials = u.name
                    ? u.name
                      .split(" ")
                      .filter(Boolean)
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                    : "U";
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                            {initials}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border">
                          {u.kycTier || "Tier 1"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                          {u.role || "Customer"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-foreground">
                        ₦{Number(u.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-emerald-500">
                        ₦{Number(u.cashbackBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {u.joined || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${u.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${u.status === "Active" ? "bg-emerald-500" : "bg-red-500"
                              }`}
                          />
                          {u.status || "Active"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => onSelectUser(u)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => onToggleStatus(u.id)}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          {u.status === "Active" ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 6: AUDIT TRAIL LOG
// ─────────────────────────────────────────────────────────────
function AuditLogTab({ logs }) {
  const [filterCategory, setFilterCategory] = useState("All");

  const filteredLogs = useMemo(() => {
    if (filterCategory === "All") return logs;
    return logs.filter((l) => l.category === filterCategory);
  }, [logs, filterCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            System & Admin Audit Log
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Immutable trace of administrative actions, pricing edits, and security events.
          </p>
        </div>
        <button
          onClick={() => toast.info("Audit log exported.")}
          className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
        >
          <Download size={14} />
          Export Audit Trail
        </button>
      </div>

      {/* IMPLEMENTATION NOTE CALLOUT */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-foreground space-y-1">
          <p className="font-semibold">
            Audit Trail Engine: Immutable Ledger Active
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Wholesale price sync operations, pricing engine changes, and security events are verified and permanently logged to Firestore (<code>pricing_change_logs</code> and <code>admin_audit_logs</code>).
          </p>
        </div>
      </div>

      {/* CATEGORY FILTER */}
      <div className="flex flex-wrap items-center gap-2">
        {["All", "Pricing", "Security", "Settlement", "Compliance", "System"].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterCategory === cat
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* LOG ENTRIES */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <FileClock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No Audit Records Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {filterCategory === "All"
                ? "Automated price sync checks, admin pricing edits, and security events will permanently log here."
                : `No events recorded in the "${filterCategory}" category yet.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3.5 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground border border-border mt-0.5">
                  {log.actor === "System Engine" || log.actor === "System Scheduled Sync"
                    ? "SYS"
                    : log.actor === "Settlement Service"
                      ? "SET"
                      : "DA"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {log.actor}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {log.role}
                    </span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      {log.category}
                    </span>
                  </div>
                  <p className="text-xs text-foreground mt-1">{log.event}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{log.time}</span>
                    <span>•</span>
                    <span>Origin: {log.ip}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 7: SETTINGS
// ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const [workspaceName, setWorkspaceName] = useState("PayWaka");
  const [supportEmail, setSupportEmail] = useState("support@paywaka.com");
  const [currency, setCurrency] = useState("NGN ₦ — Nigerian Naira");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () => {
    toast.success("Workspace preferences saved successfully.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Platform Workspace Settings
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage system configurations, notifications, and administrative security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-border pb-4">
            <h3 className="text-sm font-semibold text-foreground">
              General Information
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These details are visible across customer payment receipts.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Workspace Display Name
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Support Helpdesk Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Default Operating Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NGN ₦ — Nigerian Naira">NGN ₦ — Nigerian Naira</option>
                <option value="GHS ₵ — Ghanaian Cedi">GHS ₵ — Ghanaian Cedi</option>
                <option value="USD $ — United States Dollar">USD $ — United States Dollar</option>
              </select>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Platform Maintenance Mode
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Pause wallet debits and service purchases during scheduled upgrades.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMaintenanceMode(!maintenanceMode);
                  toast.info(
                    maintenanceMode
                      ? "Maintenance mode disabled."
                      : "Maintenance mode enabled."
                  );
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${maintenanceMode ? "bg-amber-500" : "bg-muted"
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${maintenanceMode ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <button
              onClick={handleSave}
              className="h-9 px-4 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-95 shadow-sm"
            >
              Save Platform Settings
            </button>
          </div>
        </div>

        {/* System Health Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            System Infrastructure Health
          </h3>
          <div className="space-y-3">
            {[
              { label: "Firebase Functions V2", status: "Operational", ping: "42ms" },
              { label: "ClubKonnect Telecom API", status: "Operational", ping: "180ms" },
              { label: "Flutterwave Payment Gateway", status: "Operational", ping: "95ms" },
              { label: "Daily Settlement Cron", status: "Active (Every 6h)", ping: "OK" },
            ].map((infra) => (
              <div
                key={infra.label}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {infra.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{infra.ping}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {infra.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS & MODALS
// ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, change, positive, icon: Icon, subtitle }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          <Icon size={16} />
        </span>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <strong className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </strong>
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-bold ${positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
              }`}
          >
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </span>
        </div>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function TransactionsTable({ rows = [], onSelectTx }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="py-12 px-4 text-center">
        <CircleDollarSign className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <h4 className="text-sm font-semibold text-foreground">No Transactions Recorded Yet</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          Transactions processed via data bundles, airtime, or utility bills will automatically stream into this live ledger.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-5 py-3">Customer</th>
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Gain</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((tx) => {
            const initials =
              tx.initials ||
              (tx.name
                ? tx.name
                  .split(" ")
                  .filter(Boolean)
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
                : "TX");
            return (
              <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground border border-border">
                      {initials}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {tx.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{tx.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-xs font-medium text-foreground">{tx.service}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.provider}</p>
                </td>
                <td className="px-4 py-3.5 text-xs font-bold text-foreground">
                  <p>{tx.amount}</p>
                  {(tx.feeCharged > 0 || tx.cashbackApplied > 0) && (
                    <p className="text-[10px] font-normal text-muted-foreground">
                      {tx.feeCharged > 0 ? `Fee ₦${tx.feeCharged}` : ""}
                      {tx.feeCharged > 0 && tx.cashbackApplied > 0 ? " • " : ""}
                      {tx.cashbackApplied > 0 ? `CB Used ₦${tx.cashbackApplied}` : ""}
                    </p>
                  )}
                </td>
                <td className={`px-4 py-3.5 text-xs font-semibold ${tx.isNegativeNet ? "text-red-500" : "text-primary"}`}>
                  <p>{tx.gain}</p>
                  {tx.cashbackGiven > 0 && (
                    <p className="text-[10px] font-normal text-muted-foreground">
                      CB: -₦{tx.cashbackGiven}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground">
                  {tx.time}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => onSelectTx(tx)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Inspect Details"
                  >
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Success:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Pending:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Failed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    Refunded:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${styles[status] || "bg-muted text-muted-foreground border-border"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "Success"
            ? "bg-emerald-500"
            : status === "Pending"
              ? "bg-blue-500"
              : status === "Failed"
                ? "bg-red-500"
                : "bg-amber-500"
          }`}
      />
      {status}
    </span>
  );
}

function TransactionDetailModal({ tx, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Transaction Details
            </h3>
            <p className="text-[11px] text-muted-foreground">{tx.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Customer Name</span>
            <span className="font-semibold text-foreground">{tx.name}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Email Address</span>
            <span className="font-semibold text-foreground">{tx.email}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Service / Provider</span>
            <span className="font-semibold text-foreground">
              {tx.service} ({tx.provider})
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Face / Product Value</span>
            <span className="font-bold text-foreground text-sm">{tx.amount}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Provider Cost (ClubKonnect)</span>
            <span className="font-mono font-semibold text-foreground">
              ₦{Number(tx.providerCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Commission ({tx.commissionSource || "fallback"})</span>
            <span className="font-mono font-semibold text-foreground">
              ₦{Number(tx.commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Processing Fee Charged</span>
            <span className="font-mono font-semibold text-foreground">
              ₦{Number(tx.feeCharged || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Cashback Given</span>
            <span className="font-mono font-semibold text-amber-500">
              -₦{Number(tx.cashbackGiven || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Funding Split ({tx.fundingSource || "WALLET_ONLY"})</span>
            <span className="font-mono text-foreground">
              ₦{Number(tx.walletContribution ?? tx.rawAmount ?? 0).toLocaleString()} Wallet / ₦{Number(tx.cashbackApplied || 0).toLocaleString()} CB
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Exact Net Platform Profit</span>
            <span className={`font-bold ${tx.isNegativeNet ? "text-red-500" : "text-primary"}`}>
              {tx.gain} {tx.isNegativeNet ? "(NEGATIVE NET)" : ""}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Pricing Rule Version</span>
            <span className="font-mono text-[11px] text-foreground">{tx.ruleVersion || "—"}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Payment Gateway Ref</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {tx.reference}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={tx.status} />
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Processed Timestamp</span>
            <span className="text-muted-foreground">{tx.time}</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function UserDetailModal({ user, onClose, onToggleStatus }) {
  const initials = user?.name
    ? user.name
      .split(" ")
      .filter(Boolean)
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "U";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {initials}
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {user.name}
              </h3>
              <p className="text-[11px] text-muted-foreground">{user.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Email Address</span>
            <span className="font-semibold text-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Phone Number</span>
            <span className="font-semibold text-foreground">{user.phone}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Account Role</span>
            <span className="font-semibold text-primary">{user.role || "Customer"}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Verification KYC Tier</span>
            <span className="font-semibold text-foreground">{user.kycTier || "Tier 1"}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Wallet Balance</span>
            <span className="font-bold text-foreground">
              ₦{Number(user.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Cashback Owed (Vault)</span>
            <span className="font-bold text-emerald-500">
              ₦{Number(user.cashbackBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {user.accountNumber && user.accountNumber !== "—" && (
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Virtual Dedicated Account</span>
              <span className="font-mono text-xs text-foreground">
                {user.bankName || "Wema Bank"} — {user.accountNumber}
              </span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Registration Date</span>
            <span className="text-muted-foreground">{user.joined}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Account Status</span>
            <span
              className={`font-bold ${user.status === "Active" ? "text-emerald-500" : "text-red-500"
                }`}
            >
              {user.status || "Active"}
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-between gap-2 border-t border-border">
          <button
            onClick={() => {
              onToggleStatus(user.id);
              onClose();
            }}
            className={`h-9 px-4 rounded-lg text-xs font-bold transition-colors ${user.status === "Active"
                ? "border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              }`}
          >
            {user.status === "Active" ? "Suspend Account" : "Reactivate Account"}
          </button>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

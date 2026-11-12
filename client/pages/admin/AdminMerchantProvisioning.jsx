import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ShieldAlert,
  Store,
  UserPlus,
  Key,
  Copy,
  Check,
  Building,
  RefreshCw,
  PlusCircle,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { auth, db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";

export default function AdminMerchantProvisioning() {
  const reduxUser = useSelector((state) => state.user?.user || {});
  const { adminProvisionVendorUser, adminRegisterVendorStore } = useCloudfunc();

  const [activeTab, setActiveTab] = useState("provision-staff"); // "provision-staff" | "register-vendor" | "directory"

  // Admin Verification
  const [isAdmin, setIsAdmin] = useState(
    reduxUser?.role === "admin" || reduxUser?.isAdmin === true
  );

  // Vendors List from Firestore
  const [vendorsList, setVendorsList] = useState([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);

  // Staff List from Firestore
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Form: Provision Staff
  const [targetVendorId, setTargetVendorId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState("cashier"); // "cashier" | "manager" | "owner"
  const [staffBranch, setStaffBranch] = useState("Main Branch");
  const [showPassword, setShowPassword] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Generated Handover Slip State
  const [handoverSlip, setHandoverSlip] = useState(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Form: Register Vendor Entity
  const [vendorName, setVendorName] = useState("");
  const [vendorIdInput, setVendorIdInput] = useState("");
  const [vendorBranchesInput, setVendorBranchesInput] = useState("Main Branch");
  const [vendorLogoEmoji, setVendorLogoEmoji] = useState("🍗");
  const [vendorContactEmail, setVendorContactEmail] = useState("");
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);

  // Fetch Vendors from Firestore
  const loadVendors = async () => {
    if (!auth.currentUser) {
      setIsLoadingVendors(false);
      return;
    }
    setIsLoadingVendors(true);
    try {
      const snap = await getDocs(collection(db, "meal_vendors"));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v) => !v.isTestFixture);
      setVendorsList(list);
      if (list.length > 0 && !targetVendorId) {
        setTargetVendorId(list[0].id);
      } else if (list.length === 0) {
        setTargetVendorId("");
      }
    } catch (err) {
      console.error("Failed to load vendors:", err);
      toast.error("Unable to load registered stores. Please verify your administrator session.");
    } finally {
      setIsLoadingVendors(false);
    }
  };

  // Fetch Staff Accounts
  const loadStaff = async () => {
    if (!auth.currentUser) {
      setIsLoadingStaff(false);
      return;
    }
    setIsLoadingStaff(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "vendor"));
      const snap = await getDocs(q);
      const list = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => !u.isTestFixture);
      setStaffList(list);
    } catch (err) {
      console.error("Failed to load staff list:", err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadVendors();
    loadStaff();
  }, []);

  // Generate strong temporary password helper
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStaffPassword(pwd);
    toast.success("Generated strong temporary password.");
  };

  // Submit Provision Staff Account
  const handleProvisionStaff = async (e) => {
    e.preventDefault();
    if (!targetVendorId) {
      toast.error("Please select a vendor store.");
      return;
    }
    if (!staffEmail.trim() || !staffPassword) {
      toast.error("Email and password are required.");
      return;
    }

    setIsProvisioning(true);
    try {
      const res = await adminProvisionVendorUser({
        email: staffEmail.trim().toLowerCase(),
        password: staffPassword,
        fullName: staffName.trim() || "Store Staff",
        targetVendorId,
        vendorRole: staffRole,
        vendorBranch: staffBranch.trim() || "Main Branch",
      });

      const selectedVendor = vendorsList.find((v) => v.id === targetVendorId);
      const storeName = selectedVendor?.name || targetVendorId;

      const portalUrl = `${window.location.origin}/merchant/login`;

      const slip = {
        storeName,
        targetVendorId,
        staffName: staffName.trim() || "Store Staff",
        email: staffEmail.trim().toLowerCase(),
        password: staffPassword,
        role: staffRole.toUpperCase(),
        branch: staffBranch.trim() || "Main Branch",
        portalUrl,
        timestamp: new Date().toLocaleString(),
      };

      setHandoverSlip(slip);
      toast.success("Staff account provisioned successfully!");

      // Refresh directory
      loadStaff();

      // Clear input fields
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");
    } catch (err) {
      console.error("Staff provisioning failed:", err);
      toast.error(err.message || "Failed to provision staff account.");
    } finally {
      setIsProvisioning(false);
    }
  };

  // Copy Handover Slip to Clipboard
  const handleCopySlip = () => {
    if (!handoverSlip) return;
    const text = `
🍔 PayWaka Merchant Access Handover Slip
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Store: ${handoverSlip.storeName} (${handoverSlip.targetVendorId})
Branch: ${handoverSlip.branch}
Role: ${handoverSlip.role}
Operator: ${handoverSlip.staffName}
Login Portal: ${handoverSlip.portalUrl}

Email: ${handoverSlip.email}
Password: ${handoverSlip.password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Handover Notice:
Please sign in to the portal and keep your credentials confidential.
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedSlip(true);
    toast.success("Handover slip copied to clipboard!");
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  // Submit Register New Vendor Entity
  const handleRegisterVendor = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast.error("Store name is required.");
      return;
    }

    const slug = (vendorIdInput.trim() || vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/(^-|-$)/g, "");
    if (!slug) {
      toast.error("A valid store ID slug is required.");
      return;
    }

    const branches = vendorBranchesInput
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    setIsCreatingVendor(true);
    try {
      const res = await adminRegisterVendorStore({
        name: vendorName.trim(),
        slug,
        branches: branches.length > 0 ? branches : ["Main Branch"],
        logoEmoji: vendorLogoEmoji || "🍗",
        contactEmail: vendorContactEmail.trim() || null,
      });

      const createdSlug = res?.vendorId || slug;
      toast.success(`Store '${vendorName.trim()}' registered successfully!`);
      setVendorName("");
      setVendorIdInput("");
      setVendorBranchesInput("Main Branch");
      setVendorContactEmail("");

      // Refresh vendors list and pre-select the newly onboarded store
      await loadVendors();
      setTargetVendorId(createdSlug);
      setActiveTab("provision-staff");
    } catch (err) {
      console.error("Store registration failed:", err);
      toast.error(err.message || "Failed to register store.");
    } finally {
      setIsCreatingVendor(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-[#f1f1f4] font-sans selection:bg-emerald-500/30 selection:text-emerald-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1b202e]">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-zinc-400 hover:text-white transition"
              title="Return to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link to="/dashboard" className="flex items-center flex-shrink-0">
              <img
                src="/logo.png"
                alt="PayWaka Logo"
                className="w-24 sm:w-28 h-auto object-contain"
              />
            </Link>
            <div className="h-7 w-px bg-[#1f2536] hidden sm:block flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Merchant Provisioning Terminal
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Register store entities, provision cashier credentials, and generate handover slips.
              </p>
            </div>
          </div>

          <Link
            to="/merchant/meals"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] transition"
          >
            <Store className="w-4 h-4" />
            <span>Open Merchant Portal</span>
          </Link>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-[#121520] p-1.5 rounded-2xl border border-[#202738] overflow-x-auto">
          <button
            onClick={() => setActiveTab("provision-staff")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "provision-staff"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-zinc-400 hover:text-white hover:bg-[#181d2a]"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision Staff Account</span>
          </button>

          <button
            onClick={() => setActiveTab("register-vendor")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "register-vendor"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-zinc-400 hover:text-white hover:bg-[#181d2a]"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Register Store Entity</span>
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "directory"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-zinc-400 hover:text-white hover:bg-[#181d2a]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Staff Directory ({staffList.length})</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: PROVISION STAFF ACCOUNT
            ========================================================================= */}
        {activeTab === "provision-staff" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-[#0e111a] border border-[#202738] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <span>Provision New Staff Operator</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Creates standard Firebase Auth login credentials and configures their merchant permissions.
                </p>
              </div>

              <form onSubmit={handleProvisionStaff} className="space-y-4">
                {/* Store Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Assign to Store / Restaurant
                  </label>
                  {isLoadingVendors ? (
                    <div className="py-2.5 px-3 bg-[#141824] rounded-xl text-xs text-zinc-500">
                      Loading registered stores...
                    </div>
                  ) : vendorsList.length === 0 ? (
                    <div className="p-4 bg-[#141824] border border-emerald-500/25 rounded-2xl space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <Building className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          No stores onboarded yet. Register your first store entity before provisioning staff credentials.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("register-vendor")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Register Store Entity</span>
                      </button>
                    </div>
                  ) : (
                    <select
                      value={targetVendorId}
                      onChange={(e) => setTargetVendorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                    >
                      {vendorsList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.logoEmoji || "🍗"} {v.name} ({v.id})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Staff Name & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Staff Full Name
                    </label>
                    <input
                      type="text"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Tunde Adebayo"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Assigned Role
                    </label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="cashier">Cashier (POS Checkout & Metrics View)</option>
                      <option value="manager">Store Manager (POS + Campaign Pause/Resume)</option>
                      <option value="owner">Store Owner (Full Control + Top-Ups + Campaigns)</option>
                    </select>
                  </div>
                </div>

                {/* Branch Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Assigned Store Branch
                  </label>
                  <input
                    type="text"
                    value={staffBranch}
                    onChange={(e) => setStaffBranch(e.target.value)}
                    placeholder="e.g. Victoria Island Branch - Counter 2"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Staff Login Email
                  </label>
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="tunde.vi@merchant.com"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Password with Generator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Generate Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isProvisioning || vendorsList.length === 0}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {isProvisioning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Staff Auth & Profile...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Provision Staff Credentials</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Handover Slip Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#0e111a] border border-[#202738] rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Operator Handover Slip</span>
                  </h3>
                  {handoverSlip && (
                    <button
                      onClick={handleCopySlip}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition"
                    >
                      {copiedSlip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSlip ? "Copied!" : "Copy Slip"}</span>
                    </button>
                  )}
                </div>

                {handoverSlip ? (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-4 bg-[#141824] border border-[#23293a] rounded-2xl space-y-2 text-zinc-300">
                      <div className="flex justify-between border-b border-[#1f2536] pb-2 text-white font-bold">
                        <span>Store</span>
                        <span>{handoverSlip.storeName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Branch</span>
                        <span>{handoverSlip.branch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Role</span>
                        <span className="text-emerald-400 font-bold">{handoverSlip.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Staff Name</span>
                        <span>{handoverSlip.staffName}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#1f2536]">
                        <span className="text-zinc-500">Email</span>
                        <span className="text-white">{handoverSlip.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Password</span>
                        <span className="text-emerald-400 font-bold">{handoverSlip.password}</span>
                      </div>
                      <div className="pt-2 border-t border-[#1f2536] text-[11px] text-zinc-400 break-all">
                        <span className="text-zinc-500 block mb-0.5">Login Portal</span>
                        <span className="text-blue-400">{handoverSlip.portalUrl}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCopySlip}
                      className="w-full py-2.5 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-zinc-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4 text-emerald-400" />
                      <span>{copiedSlip ? "Handover Text Copied!" : "Copy Slip for WhatsApp / Email"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-12 px-4 text-center space-y-2 text-zinc-500">
                    <Key className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
                    <p className="text-xs">
                      No credentials generated yet. Fill the provisioning form to create a ready-to-handover credential card.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: REGISTER STORE ENTITY
            ========================================================================= */}
        {activeTab === "register-vendor" && (
          <div className="max-w-2xl bg-[#0e111a] border border-[#202738] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <span>Register Store Entity (meal_vendors)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Creates the business entity profile in Firestore that multiple staff members can belong to.
              </p>
            </div>

            <form onSubmit={handleRegisterVendor} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Store / Restaurant Name
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Chicken Republic"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Unique Store ID / Slug (Leave empty to auto-generate from name)
                </label>
                <input
                  type="text"
                  value={vendorIdInput}
                  onChange={(e) => setVendorIdInput(e.target.value)}
                  placeholder="e.g. chicken-republic-vi"
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Store Branches (Comma-separated)
                </label>
                <input
                  type="text"
                  value={vendorBranchesInput}
                  onChange={(e) => setVendorBranchesInput(e.target.value)}
                  placeholder="Main Branch, Victoria Island, Lekki"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Logo Emoji
                  </label>
                  <input
                    type="text"
                    value={vendorLogoEmoji}
                    onChange={(e) => setVendorLogoEmoji(e.target.value)}
                    placeholder="🍗"
                    className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={vendorContactEmail}
                    onChange={(e) => setVendorContactEmail(e.target.value)}
                    placeholder="ops@chickenrepublic.com"
                    className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingVendor}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isCreatingVendor ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registering Store Entity...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Save Store Entity</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            TAB 3: ACTIVE STAFF DIRECTORY
            ========================================================================= */}
        {activeTab === "directory" && (
          <div className="bg-[#0e111a] border border-[#202738] rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Provisioned Merchant Staff</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Accounts configured with role == 'vendor' in users collection.
                </p>
              </div>

              <button
                onClick={loadStaff}
                disabled={isLoadingStaff}
                className="p-2 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-zinc-400 hover:text-white transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStaff ? "animate-spin text-emerald-400" : ""}`} />
              </button>
            </div>

            {isLoadingStaff ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                Loading staff accounts...
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No provisioned staff accounts found. Use the Provision tab to create your first operator account.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffList.map((s) => (
                  <div
                    key={s.uid}
                    className="p-4 bg-[#141824] border border-[#23293a] rounded-2xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-bold">{s.cashierName || s.userName || "Operator"}</strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {s.vendorRole || "cashier"}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[11px]">{s.userEmail}</p>
                      <p className="text-zinc-500 text-[11px]">
                        Store: <span className="text-zinc-300 font-semibold">{s.vendorId}</span> • {s.vendorBranch}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

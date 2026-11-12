import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Store,
  ScanLine,
  TrendingUp,
  CreditCard,
  Receipt,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  PlusCircle,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  DollarSign,
  Lock,
  Layers,
  Sparkles,
  Camera,
  Upload,
  PieChart as PieChartIcon,
  Calendar,
  Building,
  UtensilsCrossed,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import useCloudfunc from "@/components/useCloudfunc";
import { auth, db } from "@/firebaseConfig";
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

export default function MealMerchantDashboard() {
  const reduxUser = useSelector((state) => state.user?.user || {});
  const currentUid = reduxUser?.uid || auth.currentUser?.uid;

  const {
    getMerchantDashboardData,
    createVendorCampaign,
    updateMerchantCampaignStatus,
    updateMerchantCampaignBudget,
    updateVendorProfile,
    updateVendorCampaignImage,
    adminSetCampaignFeatured,
  } = useCloudfunc();

  // User Profile & Role from Firestore
  const [vendorRole, setVendorRole] = useState(reduxUser?.vendorRole || "cashier");
  const [userVendorId, setUserVendorId] = useState(reduxUser?.vendorId || null);
  const [isAdmin, setIsAdmin] = useState(reduxUser?.role === "admin" || reduxUser?.isAdmin === true);

  // Selected Target Vendor
  const [selectedVendorId, setSelectedVendorId] = useState(userVendorId || null);
  const [availableVendors, setAvailableVendors] = useState([]);

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [activeCampaignForTopUp, setActiveCampaignForTopUp] = useState(null);

  // Create Campaign Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Small Chops");
  const [newCampaignImage, setNewCampaignImage] = useState("");
  const [pendingCampaignImageFile, setPendingCampaignImageFile] = useState(null);
  const [pendingCampaignPreviewUrl, setPendingCampaignPreviewUrl] = useState("");
  const [isUploadingCampaignImage, setIsUploadingCampaignImage] = useState(false);
  const [campaignUploadMap, setCampaignUploadMap] = useState({});
  const [activeCardUploadCampaignId, setActiveCardUploadCampaignId] = useState(null);
  const campaignImageInputRef = useRef(null);
  const cardCampaignImageInputRef = useRef(null);
  const [newDiscount, setNewDiscount] = useState("500");
  const [newMinSpend, setNewMinSpend] = useState("2000");
  const [newPointsCost, setNewPointsCost] = useState("50");
  const [newBudget, setNewBudget] = useState("25000");
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [createCampaignError, setCreateCampaignError] = useState(null);

  // Top Up Budget Form State
  const [topUpAmount, setTopUpAmount] = useState("0");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  // Action Pending State (per campaign)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [featuredUpdatingId, setFeaturedUpdatingId] = useState(null);

  // Logo Upload State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  // Role Permissions
  const canPauseResume = vendorRole === "manager" || vendorRole === "owner" || isAdmin;
  const canCreateCampaign = vendorRole === "owner" || isAdmin;
  const canTopUpBudget = vendorRole === "owner" || isAdmin;
  const canEditBranding = vendorRole === "owner" || isAdmin;

  // Real-time authoritative profile listener
  useEffect(() => {
    let unSub = null;
    const uid = currentUid;
    if (uid) {
      const userRef = doc(db, "users", uid);
      unSub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const r = d.role || "user";
          const adminFlag = r === "admin" || d.isAdmin === true;
          setIsAdmin(adminFlag);
          setVendorRole(d.vendorRole || "cashier");
          if (d.vendorId) {
            setUserVendorId(d.vendorId);
            setSelectedVendorId(d.vendorId);
          }
        }
      });
    }
    return () => {
      if (unSub) unSub();
    };
  }, [currentUid]);

  // Load real stores if admin
  useEffect(() => {
    if (isAdmin) {
      getDocs(collection(db, "meal_vendors"))
        .then((snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAvailableVendors(list);
          if (list.length > 0 && !selectedVendorId) {
            setSelectedVendorId(list[0].id);
          }
        })
        .catch((err) => console.error("Error loading vendors:", err));
    }
  }, [isAdmin]);

  const effectiveVendorId = isAdmin ? (selectedVendorId || userVendorId) : userVendorId;

  // Load Authoritative Merchant Dashboard Data
  // Note: silent=true updates dashboardData in background without unmounting view or interrupting open modals
  const loadData = async (showRefreshToast = false, silent = false) => {
    if (!effectiveVendorId) {
      setIsLoading(false);
      return;
    }

    try {
      if (!silent) {
        setIsRefreshing(true);
      }
      setErrorMsg(null);
      const res = await getMerchantDashboardData(effectiveVendorId);
      if (res && res.success) {
        setDashboardData(res);
        if (showRefreshToast) {
          toast.success("Dashboard metrics updated.");
        }
      } else if (!silent) {
        setErrorMsg("Failed to retrieve merchant dashboard data.");
      }
    } catch (err) {
      console.error("Merchant dashboard load error:", err);
      if (!silent) {
        let friendly = "Unable to connect to merchant backend service. Please check connection.";
        if (err.message && !err.message.includes("internal")) {
          friendly = err.message.replace("FirebaseError: ", "");
        }
        setErrorMsg(friendly);
        if (showRefreshToast) toast.error(friendly);
      }
    } finally {
      setIsLoading(false);
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (effectiveVendorId) {
      loadData(false, false);
    }
  }, [effectiveVendorId]);

  // Real-time event listener for vendor offers & store profile updates
  // Automatically syncs redemptions, customer claims, and campaign updates in the background without interrupting open modals
  useEffect(() => {
    if (!effectiveVendorId) return;

    let debounceTimer = null;
    let isInitialOffersSnap = true;
    let isInitialVendorSnap = true;

    const triggerSilentSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadData(false, true);
      }, 350);
    };

    const offersQuery = query(
      collection(db, "public_meal_offers"),
      where("vendorId", "==", effectiveVendorId)
    );

    const unsubOffers = onSnapshot(
      offersQuery,
      () => {
        if (isInitialOffersSnap) {
          isInitialOffersSnap = false;
          return;
        }
        triggerSilentSync();
      },
      () => {}
    );

    const unsubVendor = onSnapshot(
      doc(db, "meal_vendors", effectiveVendorId),
      () => {
        if (isInitialVendorSnap) {
          isInitialVendorSnap = false;
          return;
        }
        triggerSilentSync();
      },
      () => {}
    );

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubOffers();
      unsubVendor();
    };
  }, [effectiveVendorId]);

  // Campaign Creation Validation
  const campaignValidation = useMemo(() => {
    const disc = Number(newDiscount) || 0;
    const minSp = Number(newMinSpend) || 0;
    const bg = Number(newBudget) || 0;
    const pts = Number(newPointsCost);

    if (!newTitle.trim()) return { valid: false, error: "Campaign title is required." };
    if (disc < 100) return { valid: false, error: "Discount must be at least ₦100." };
    if (minSp < disc) return { valid: false, error: "Minimum spend must be at least equal to discount." };
    if (pts < 0 || isNaN(pts)) return { valid: false, error: "Points cost cannot be negative." };
    if (bg < disc) return { valid: false, error: "Campaign budget must fund at least 1 discount voucher." };
    if (bg > 200000) return { valid: false, error: "Maximum campaign budget is ₦200,000." };

    return { valid: true, error: null };
  }, [newTitle, newDiscount, newMinSpend, newBudget, newPointsCost]);

  // Top Up Validation
  const topUpValidation = useMemo(() => {
    if (!activeCampaignForTopUp) return { valid: false, error: null };
    const committed = Number(activeCampaignForTopUp.spentNaira || 0) + Number(activeCampaignForTopUp.reservedNaira || 0);
    const amount = Number(topUpAmount) || 0;

    if (amount < committed) {
      return {
        valid: false,
        error: `New budget cannot be lower than ₦${committed.toLocaleString()} (already consumed & reserved).`,
      };
    }
    if (amount > 200000) {
      return {
        valid: false,
        error: "Maximum campaign budget cap is ₦200,000.",
      };
    }
    if (amount === Number(activeCampaignForTopUp.budgetNaira || 0)) {
      return {
        valid: false,
        error: "Enter a budget amount different from current budget.",
      };
    }

    return { valid: true, error: null };
  }, [activeCampaignForTopUp, topUpAmount]);

  // Cloudinary Logo Upload Handler (Owner/Admin Only) — Routed through server-authoritative updateVendorProfile callable
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be 10MB or less.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", "first upload");
      form.append("cloud_name", "dfbcveamw");

      const uploadRes = await fetch("https://api.cloudinary.com/v1_1/dfbcveamw/image/upload", {
        method: "POST",
        body: form,
      });
      const data = await uploadRes.json();

      if (data.secure_url) {
        await updateVendorProfile({
          targetVendorId: effectiveVendorId,
          logoUrl: data.secure_url,
        });
        toast.success("Store logo updated successfully!");
        await loadData(false, true);
      } else {
        throw new Error(data.error?.message || "Cloudinary upload failed.");
      }
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast.error("Failed to upload store logo: " + (err.message || "Unknown error"));
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = "";
    }
  };

  // Background Campaign Image Upload & Firestore Reconciliation Engine
  const runBackgroundCampaignImageUpload = async (campaignId, file, previewUrl = null, cachedCloudinaryUrl = null) => {
    if (!campaignId) return;

    const localPreview = previewUrl || (file ? URL.createObjectURL(file) : cachedCloudinaryUrl);
    setCampaignUploadMap((prev) => ({
      ...prev,
      [campaignId]: {
        status: "uploading",
        file: file || prev[campaignId]?.file || null,
        previewUrl: localPreview,
        cloudinaryUrl: cachedCloudinaryUrl || prev[campaignId]?.cloudinaryUrl || null,
        error: null,
      },
    }));

    let uploadedCloudinaryUrl = cachedCloudinaryUrl;

    try {
      // 1. Upload to Cloudinary if we don't already have an uploaded URL
      if (!uploadedCloudinaryUrl) {
        if (!file) {
          throw new Error("No image file selected for upload.");
        }
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", "first upload");
        form.append("cloud_name", "dfbcveamw");

        const uploadRes = await fetch("https://api.cloudinary.com/v1_1/dfbcveamw/image/upload", {
          method: "POST",
          body: form,
        });
        const data = await uploadRes.json();

        if (!data.secure_url) {
          throw new Error(data.error?.message || "Cloudinary image upload failed.");
        }
        uploadedCloudinaryUrl = data.secure_url;
      }

      // 2. Reconcile uploaded image URL with meal_campaigns & public_meal_offers on backend
      try {
        await updateVendorCampaignImage({
          campaignId,
          imageUrl: uploadedCloudinaryUrl,
          imageUploadStatus: "synced",
        });
      } catch (funcErr) {
        console.error(`Reconcile function failed for ${campaignId}:`, funcErr);
        const isDev = Boolean(
          import.meta.env.DEV ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
        );
        const customErr = new Error(
          isDev
            ? "Reconciling with database failed — please restart emulator (" + (funcErr.message || "internal") + ")"
            : "Unable to sync campaign photo to your store offer. Please check your network and retry."
        );
        customErr.raw = funcErr;
        customErr.cloudinaryUrl = uploadedCloudinaryUrl;
        throw customErr;
      }

      setCampaignUploadMap((prev) => ({
        ...prev,
        [campaignId]: {
          status: "synced",
          file: null,
          previewUrl: uploadedCloudinaryUrl,
          imageUrl: uploadedCloudinaryUrl,
          cloudinaryUrl: uploadedCloudinaryUrl,
          error: null,
        },
      }));

      toast.success("Campaign photo uploaded and synced to marketplace!");
      await loadData(false, true);
    } catch (err) {
      console.error(`Background campaign image upload failed for ${campaignId}:`, err);
      const resolvedCloudinaryUrl = err.cloudinaryUrl || uploadedCloudinaryUrl || null;

      // Attempt to flag status as failed on backend non-blockingly
      await updateVendorCampaignImage({
        campaignId,
        imageUrl: resolvedCloudinaryUrl,
        imageUploadStatus: "failed",
      }).catch(() => {});

      const isDev = Boolean(
        import.meta.env.DEV ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      );
      const userMessage = err.message || (isDev
        ? "Reconciling with database failed — please restart emulator"
        : "Unable to sync campaign photo to your store offer. Please check your network and retry.");

      setCampaignUploadMap((prev) => ({
        ...prev,
        [campaignId]: {
          status: "failed",
          file: file || prev[campaignId]?.file || null,
          previewUrl: localPreview,
          cloudinaryUrl: resolvedCloudinaryUrl,
          error: userMessage,
        },
      }));

      toast.error("Campaign image upload issue in background", {
        description: userMessage,
      });
      await loadData(false, true);
    }
  };

  // Select Campaign Image inside Create Modal (10MB Max, Non-Blocking Local Preview)
  const handleCampaignImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Campaign image size must be 10MB or less.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingCampaignImageFile(file);
    setPendingCampaignPreviewUrl(previewUrl);
    setNewCampaignImage("");
    toast.success("Campaign photo ready! It will upload in the background when you publish.");
    if (e.target) e.target.value = "";
  };

  // Direct Upload / Replace / Retry File Picker from Campaign Card
  const handleCardCampaignImageFileChange = (e) => {
    const file = e.target.files?.[0];
    const targetId = activeCardUploadCampaignId;
    if (!file || !targetId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Campaign image size must be 10MB or less.");
      return;
    }

    runBackgroundCampaignImageUpload(targetId, file);
    if (e.target) e.target.value = "";
  };

  // Clear campaign creation error whenever form values or modal state changes
  useEffect(() => {
    setCreateCampaignError(null);
  }, [isCreateModalOpen, newTitle, newCategory, newDiscount, newMinSpend, newPointsCost, newBudget]);

  // Submit Create Campaign
  const handleCreateCampaignSubmit = async (e) => {
    e.preventDefault();
    setCreateCampaignError(null);

    if (!canCreateCampaign) {
      const msg = "Owner role required to create campaigns.";
      setCreateCampaignError(msg);
      toast.error(msg);
      return;
    }
    if (!effectiveVendorId) {
      const msg = "No active merchant store selected or assigned to your account. Please select a store first.";
      setCreateCampaignError(msg);
      toast.error(msg);
      return;
    }
    if (!campaignValidation.valid) {
      setCreateCampaignError(campaignValidation.error);
      toast.error(campaignValidation.error);
      return;
    }

    const fileToUploadInBg = pendingCampaignImageFile;
    const previewForBg = pendingCampaignPreviewUrl;

    setIsSubmittingCampaign(true);
    try {
      const payload = {
        targetVendorId: effectiveVendorId,
        vendorId: effectiveVendorId,
        title: newTitle.trim(),
        category: newCategory,
        image: newCampaignImage || null,
        imageUploadStatus: fileToUploadInBg ? "uploading" : newCampaignImage ? "synced" : "none",
        discountNaira: Number(newDiscount),
        minSpendNaira: Number(newMinSpend),
        pointsCost: Number(newPointsCost),
        campaignBudgetNaira: Number(newBudget),
      };

      const res = await createVendorCampaign(payload);
      if (res && res.success) {
        toast.success("Meal Campaign created successfully!", {
          description: fileToUploadInBg
            ? `Allocated ₦${Number(newBudget).toLocaleString()} • Syncing campaign photo in background...`
            : `Allocated budget: ₦${Number(newBudget).toLocaleString()} (${newCategory})`,
        });
        setCreateCampaignError(null);
        setIsCreateModalOpen(false);
        setNewTitle("");
        setNewCategory("Small Chops");
        setNewCampaignImage("");
        setPendingCampaignImageFile(null);
        setPendingCampaignPreviewUrl("");
        setNewDiscount("500");
        setNewMinSpend("2000");
        setNewPointsCost("50");
        setNewBudget("25000");
        await loadData(false, true);

        // Kick off non-blocking background upload & reconciliation if an image file was selected
        if (fileToUploadInBg && res.campaignId) {
          runBackgroundCampaignImageUpload(res.campaignId, fileToUploadInBg, previewForBg);
        }
      } else {
        throw new Error(res?.message || "Failed to create campaign. Please try again.");
      }
    } catch (err) {
      console.error("Create campaign error:", err);
      const rawMsg = err?.message ? err.message.replace(/^(FirebaseError:\s*|Error:\s*)/i, "").trim() : "";
      const friendlyMsg =
        !rawMsg || rawMsg.toLowerCase() === "internal" || err?.code === "functions/unavailable"
          ? "Unable to reach the campaign service right now. Please check your connection and try again."
          : rawMsg;
      setCreateCampaignError(friendlyMsg);
      toast.error("Campaign Creation Failed", { description: friendlyMsg });
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  // Toggle Admin Featured Partner Spotlight
  const handleToggleFeatured = async (campaignId, currentFeatured) => {
    if (!isAdmin) {
      toast.error("Only Platform Administrators can promote a Featured Partner campaign.");
      return;
    }
    setFeaturedUpdatingId(campaignId);
    try {
      const res = await adminSetCampaignFeatured(campaignId, !currentFeatured);
      if (res && res.success) {
        toast.success(
          !currentFeatured
            ? "Campaign promoted to Featured Partner spotlight!"
            : "Campaign removed from Featured Partner spotlight."
        );
        await loadData(false);
      } else {
        throw new Error(res?.message || "Failed to update featured status.");
      }
    } catch (err) {
      console.error("Featured update error:", err);
      toast.error(err.message || "Failed to update featured status.");
    } finally {
      setFeaturedUpdatingId(null);
    }
  };

  // Submit Status Change (Pause / Resume)
  const handleStatusTransition = async (campaignId, currentStatus) => {
    if (!canPauseResume) {
      toast.error("You need Manager or Owner permissions to change campaign status.");
      return;
    }
    const newStatus = currentStatus === "active" ? "paused" : "active";
    setStatusUpdatingId(campaignId);

    try {
      const res = await updateMerchantCampaignStatus(campaignId, newStatus);
      if (res && res.success) {
        toast.success(`Campaign ${newStatus === "active" ? "resumed" : "paused"} successfully.`);
        await loadData(false);
      } else {
        throw new Error(res?.message || "Failed to update status.");
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err.message || "Failed to update campaign status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Submit Budget Top-Up
  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    if (!canTopUpBudget) {
      toast.error("You need Owner permissions to top up campaign budgets.");
      return;
    }
    if (!topUpValidation.valid || !activeCampaignForTopUp) {
      toast.error(topUpValidation.error || "Invalid budget input.");
      return;
    }

    setIsSubmittingTopUp(true);
    try {
      const res = await updateMerchantCampaignBudget(
        activeCampaignForTopUp.id,
        Number(topUpAmount)
      );
      if (res && res.success) {
        toast.success("Campaign budget updated successfully!", {
          description: `New Budget: ₦${Number(topUpAmount).toLocaleString()}`,
        });
        setIsTopUpModalOpen(false);
        setActiveCampaignForTopUp(null);
        setTopUpAmount("0");
        await loadData(false);
      } else {
        throw new Error(res?.message || "Failed to update budget.");
      }
    } catch (err) {
      console.error("Budget top up error:", err);
      toast.error(err.message || "Failed to update budget.");
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // Safe Metric Normalization
  const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const metrics = dashboardData?.summary || dashboardData?.metrics || {};
  const campaigns = dashboardData?.campaigns || [];
  const recentRedemptions = dashboardData?.recentRedemptions || [];
  const vendorInfo = dashboardData?.vendor || {
    id: effectiveVendorId || "merchant",
    name: effectiveVendorId || "PayWaka Merchant",
    branch: "Store Counter",
  };

  // Budget Allocation Chart Data (Donut)
  const budgetChartData = useMemo(() => {
    const consumed = safeNum(metrics.totalSpentBudgetNaira);
    const reserved = safeNum(metrics.totalReservedBudgetNaira);
    const available = safeNum(metrics.totalAvailableCapacityNaira);

    if (consumed === 0 && reserved === 0 && available === 0) {
      return [{ name: "No Active Budget", value: 1, color: "#23293a" }];
    }

    return [
      { name: "Consumed", value: consumed, color: "#10b981" },
      { name: "Reserved", value: reserved, color: "#f59e0b" },
      { name: "Available Capacity", value: available, color: "#3b82f6" },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  const totalAllocated = safeNum(metrics.totalAllocatedBudgetNaira);
  const totalCommitted = safeNum(metrics.totalSpentBudgetNaira) + safeNum(metrics.totalReservedBudgetNaira);
  const rawUtilizationPct = totalAllocated > 0
    ? Math.min(100, (totalCommitted / totalAllocated) * 100)
    : 0;
  const budgetUtilizationPct =
    rawUtilizationPct > 0 && rawUtilizationPct < 1
      ? Number(rawUtilizationPct.toFixed(2))
      : Math.round(rawUtilizationPct);

  // Redemption & Revenue Flow Chart Data (Area Curve)
  const revenueChartData = useMemo(() => {
    if (!recentRedemptions || recentRedemptions.length === 0) {
      return [
        { date: "Day 1", redemptions: 0, revenue: 0 },
        { date: "Day 2", redemptions: 0, revenue: 0 },
        { date: "Day 3", redemptions: 0, revenue: 0 },
        { date: "Day 4", redemptions: 0, revenue: 0 },
        { date: "Day 5", redemptions: 0, revenue: 0 },
      ];
    }

    const map = {};
    recentRedemptions.slice(-14).forEach((r) => {
      const d = r.redeemedAt ? new Date(r.redeemedAt) : new Date();
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!map[label]) map[label] = { date: label, redemptions: 0, revenue: 0 };
      map[label].redemptions += 1;
      map[label].revenue += Number(r.finalPayableNaira || 0);
    });
    return Object.values(map);
  }, [recentRedemptions]);

  // Header quick actions
  const headerActions = (
    <div className="flex items-center gap-2">
      {isAdmin && availableVendors.length > 0 && (
        <select
          value={selectedVendorId || ""}
          onChange={(e) => setSelectedVendorId(e.target.value)}
          aria-label="Switch Merchant Account"
          className="bg-[#141824] border border-[#23293a] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          {availableVendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.logoEmoji || "🍗"} {v.name}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={() => loadData(true)}
        disabled={isRefreshing}
        className="p-1.5 rounded-lg bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-zinc-400 hover:text-white transition disabled:opacity-50"
        title="Refresh metrics"
        aria-label="Refresh metrics"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
      </button>
    </div>
  );

  return (
    <MerchantLayout
      activeTab="dashboard"
      vendorInfo={vendorInfo}
      errorMsg={errorMsg}
      actions={headerActions}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* =========================================================================
            PAYWAKA CLASSIC HERO STORE BANNER & BRANDING HEADER
            ========================================================================= */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-[#0d1017] via-[#10141f] to-[#0d1017] border border-[#1e2436] p-6 sm:p-8 shadow-2xl">
          {/* Subtle background ambient mesh */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Store Avatar & Details */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#141824] border-2 border-emerald-500/30 flex items-center justify-center text-3xl sm:text-4xl shadow-xl overflow-hidden flex-shrink-0">
                  {vendorInfo.logoUrl ? (
                    <img src={vendorInfo.logoUrl} alt={vendorInfo.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{vendorInfo.logoEmoji || "🍗"}</span>
                  )}
                </div>

                {/* Owner/Admin Logo Upload Button */}
                {canEditBranding && (
                  <>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg border-2 border-[#0d1017] transition active:scale-95"
                      title="Upload store logo (< 2MB)"
                      aria-label="Upload store logo"
                    >
                      {isUploadingLogo ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {vendorInfo.name}
                  </h1>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Verified Merchant POS
                  </span>
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{vendorInfo.branch || "Store Counter"}</span>
                  <span className="text-zinc-600">•</span>
                  <span>ID: <strong className="text-zinc-300 font-mono">{effectiveVendorId}</strong></span>
                </p>
                <p className="text-[11px] text-zinc-500 max-w-md">
                  Authoritative campaign budgets, discount absorption, and live POS checkouts.
                </p>
              </div>
            </div>

            {/* Top Action CTAs */}
            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              <Link
                to="/merchant/terminal"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-xs font-bold text-emerald-400 hover:text-emerald-300 transition shadow-sm"
              >
                <ScanLine className="w-4 h-4" />
                <span>Open Cashier POS</span>
              </Link>

              {canCreateCampaign ? (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Campaign</span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#141824] border border-[#23293a] text-zinc-500 text-xs"
                  title="Campaign creation requires Owner or Admin role"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Owner Role Required</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            KPI CARDS (KEY PERFORMANCE INDICATORS)
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Allocated Budget */}
          <div className="bg-[#0e111a]/90 backdrop-blur-md border border-[#1e2436] rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-zinc-400">Allocated Budget</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              ₦{safeNum(metrics.totalAllocatedBudgetNaira).toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Total merchant marketing grant</p>
          </div>

          {/* Card 2: Consumed Budget */}
          <div className="bg-[#0e111a]/90 backdrop-blur-md border border-[#1e2436] rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-zinc-400">Consumed Budget</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              ₦{safeNum(metrics.totalSpentBudgetNaira).toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Absorbed via redeemed vouchers</p>
          </div>

          {/* Card 3: Reserved Budget */}
          <div className="bg-[#0e111a]/90 backdrop-blur-md border border-[#1e2436] rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-zinc-400">Reserved Budget</span>
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              ₦{safeNum(metrics.totalReservedBudgetNaira).toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Held by active unexpired vouchers</p>
          </div>

          {/* Card 4: Available Capacity */}
          <div className="bg-[#0e111a]/90 backdrop-blur-md border border-[#1e2436] rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-zinc-400">Available Capacity</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400">
              ₦{safeNum(metrics.totalAvailableCapacityNaira).toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Ready for new customer claims</p>
          </div>
        </div>

        {/* Secondary KPIs: Revenue & Volume */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0e111a]/90 border border-[#1e2436] rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 block">Gross Customer Bill Volume</span>
              <span className="text-lg font-black text-white">
                ₦{safeNum(metrics.totalGrossBillAmountNaira).toLocaleString()}
              </span>
            </div>
            <Receipt className="w-5 h-5 text-zinc-600" />
          </div>

          <div className="bg-[#0e111a]/90 border border-[#1e2436] rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 block">Net Merchant Revenue</span>
              <span className="text-lg font-black text-emerald-400">
                ₦{safeNum(metrics.totalMerchantRevenueNaira).toLocaleString()}
              </span>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500/50" />
          </div>

          <div className="bg-[#0e111a]/90 border border-[#1e2436] rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 block">Completed Redemptions</span>
              <span className="text-lg font-black text-white">
                {safeNum(metrics.totalRedemptionsCount)}
              </span>
            </div>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* =========================================================================
            DATA VISUALIZATION SECTION: CHARTS
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Budget Utilization Donut (5 cols) */}
          <div className="lg:col-span-5 bg-[#0e111a]/90 border border-[#1e2436] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-400" />
                  <span>Budget Absorption Breakdown</span>
                </h3>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Marketing Capital
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Real-time distribution of marketing funds across redemption states.
              </p>
            </div>

            <div className="relative w-full h-56 flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={budgetChartData.length > 1 ? 3 : 0}
                    minAngle={totalCommitted > 0 ? 12 : 0}
                    dataKey="value"
                  >
                    {budgetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0e111a" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val, name) => [`₦${Number(val).toLocaleString()}`, name || "Amount"]}
                    contentStyle={{
                      backgroundColor: "#141824",
                      borderColor: "#2e364f",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#f8fafc",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                    itemStyle={{ color: "#f8fafc", fontWeight: 700 }}
                    labelStyle={{ color: "#10b981", fontWeight: 700, marginBottom: "4px" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{budgetUtilizationPct}%</span>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Committed</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1b202e] text-center text-xs">
              <div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1" />
                <span className="text-zinc-400">Consumed</span>
              </div>
              <div>
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" />
                <span className="text-zinc-400">Reserved</span>
              </div>
              <div>
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block mr-1" />
                <span className="text-zinc-400">Available</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Redemption & Revenue Flow (7 cols) */}
          <div className="lg:col-span-7 bg-[#0e111a]/90 border border-[#1e2436] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Redemption & Revenue Trajectory</span>
                </h3>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Counter Activity
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Daily voucher redemptions and gross merchant revenue processed at the counter.
              </p>
            </div>

            <div className="w-full h-56 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emeraldFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1c2233" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#141824",
                      borderColor: "#2e364f",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#f8fafc",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                    itemStyle={{ color: "#f8fafc", fontWeight: 700 }}
                    labelStyle={{ color: "#10b981", fontWeight: 700, marginBottom: "4px" }}
                    formatter={(val, name) => [
                      name === "revenue" ? `₦${Number(val).toLocaleString()}` : val,
                      name === "revenue" ? "Net Revenue" : "Redemptions",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#emeraldFlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-3 border-t border-[#1b202e]">
              <span>Tracking recent POS settlement velocity</span>
              <span className="text-emerald-400 font-bold">Live Synced</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ACTIVE CAMPAIGNS ROSTER
            ========================================================================= */}
        <div className="bg-[#0e111a]/90 border border-[#1e2436] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
                <span>Meal Marketing Campaigns</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Active discount offers funded by your marketing budget.
              </p>
            </div>

            {canCreateCampaign && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-950/40"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Campaign</span>
              </button>
            )}
          </div>

          {/* Hidden file input for per-card background upload / retry */}
          <input
            type="file"
            ref={cardCampaignImageInputRef}
            onChange={handleCardCampaignImageFileChange}
            accept="image/*"
            className="hidden"
          />

          {campaigns.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-zinc-600 opacity-50" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">No Campaigns Active</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {canCreateCampaign
                    ? "Create your first meal coupon campaign to attract customers to your restaurant."
                    : "No marketing campaigns created yet. Contact your store owner to launch offers."}
                </p>
              </div>
              {canCreateCampaign && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  Create Campaign
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => {
                const uploadTask = campaignUploadMap[camp.id];
                const effectiveImage = camp.image || uploadTask?.imageUrl || uploadTask?.previewUrl || null;
                const isOrphanedUpload = !uploadTask && !camp.image && camp.imageUploadStatus === "uploading";
                const isBgUploading = uploadTask?.status === "uploading";
                const isBgFailed =
                  uploadTask?.status === "failed" ||
                  isOrphanedUpload ||
                  (!uploadTask && !camp.image && camp.imageUploadStatus === "failed");

                return (
                <div
                  key={camp.id}
                  className="p-5 bg-[#141824] border border-[#23293a] rounded-2xl flex flex-col justify-between gap-4 shadow-md"
                >
                  <div className="space-y-3">
                    {effectiveImage && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#23293a] bg-[#0e111a]">
                        <img
                          src={effectiveImage}
                          alt={camp.title}
                          className={`w-full h-full object-cover transition-opacity ${
                            isBgUploading ? "opacity-60" : "opacity-100"
                          }`}
                        />
                        {camp.isFeatured && (
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-500/90 text-[#090b10] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                            <Star className="w-3 h-3 fill-current" />
                            <span>Featured Partner</span>
                          </span>
                        )}
                        {isBgUploading && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center gap-2 text-xs font-bold text-emerald-300">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Uploading photo in background...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!effectiveImage && isBgUploading && (
                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 flex-shrink-0" />
                        <span>Uploading campaign image in background & reconciling...</span>
                      </div>
                    )}

                    {isBgFailed && canCreateCampaign && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex flex-col gap-2">
                        <div className="flex items-start gap-1.5 text-xs font-bold text-rose-300">
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          <span>{uploadTask?.error || "Campaign image failed to upload in background."}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(uploadTask?.cloudinaryUrl || uploadTask?.file) && (
                            <button
                              type="button"
                              onClick={() =>
                                runBackgroundCampaignImageUpload(
                                  camp.id,
                                  uploadTask.file,
                                  uploadTask.previewUrl,
                                  uploadTask.cloudinaryUrl
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>{uploadTask?.cloudinaryUrl ? "Retry Sync to Offer" : "Retry Upload Now"}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCardUploadCampaignId(camp.id);
                              cardCampaignImageInputRef.current?.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222b40] border border-rose-500/30 text-rose-200 text-[11px] font-semibold flex items-center gap-1.5 transition"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Choose Another Photo</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-sm">{camp.title}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#1a2030] border border-[#2a354e] text-[10px] font-semibold text-zinc-300">
                            {camp.category || "Local Delicacies"}
                          </span>
                          {!effectiveImage && camp.isFeatured && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>Featured Partner</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${camp.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                      >
                        {camp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[11px]">Customer Discount</span>
                        <strong className="text-emerald-400 text-sm">₦{safeNum(camp.discountNaira).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[11px]">Min. Bill Spend</span>
                        <strong className="text-white text-sm">₦{safeNum(camp.minSpendNaira).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1f2536] text-[11px] text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Campaign Budget:</span>
                        <span className="text-white font-bold">₦{safeNum(camp.campaignBudgetNaira).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consumed / Spent:</span>
                        <span className="text-emerald-400">₦{safeNum(camp.campaignSpentNaira).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining Capacity:</span>
                        <span className="text-blue-400">₦{safeNum(camp.availableCapacityNaira).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#1f2536]">
                    <div className="flex items-center gap-2">
                      {canPauseResume ? (
                        <button
                          onClick={() => handleStatusTransition(camp.id, camp.status)}
                          disabled={statusUpdatingId === camp.id}
                          className="flex-1 py-2 rounded-xl bg-[#1a2030] hover:bg-[#222b40] border border-[#2a354e] text-xs font-bold text-zinc-300 hover:text-white transition flex items-center justify-center gap-1.5"
                        >
                          {statusUpdatingId === camp.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : camp.status === "active" ? (
                            <>
                              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Resume</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex-1 py-2 rounded-xl bg-[#141824] border border-[#23293a] text-zinc-600 text-[11px] text-center">
                          Manager Only
                        </div>
                      )}

                      {canTopUpBudget ? (
                        <button
                          onClick={() => {
                            setActiveCampaignForTopUp(camp);
                            setTopUpAmount(String(camp.campaignBudgetNaira || 0));
                            setIsTopUpModalOpen(true);
                          }}
                          className="flex-1 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center justify-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Top Up</span>
                        </button>
                      ) : (
                        <div className="flex-1 py-2 rounded-xl bg-[#141824] border border-[#23293a] text-zinc-600 text-[11px] text-center">
                          Owner Only
                        </div>
                      )}
                    </div>

                    {canCreateCampaign && !isBgUploading && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCardUploadCampaignId(camp.id);
                          cardCampaignImageInputRef.current?.click();
                        }}
                        className="w-full py-1.5 rounded-xl bg-[#1a2030]/70 hover:bg-[#222b40] border border-[#2a354e] text-[11px] font-semibold text-zinc-300 hover:text-white transition flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{effectiveImage ? "Change Campaign Photo (Max 10MB)" : "Upload Campaign Photo (Max 10MB)"}</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(camp.id, Boolean(camp.isFeatured))}
                        disabled={featuredUpdatingId === camp.id}
                        className={`w-full py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${camp.isFeatured
                            ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300"
                            : "bg-[#1a2030] hover:bg-[#222b40] border-[#2a354e] text-zinc-300 hover:text-white"
                          }`}
                      >
                        {featuredUpdatingId === camp.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          <Star className={`w-3.5 h-3.5 ${camp.isFeatured ? "fill-amber-400 text-amber-400" : "text-amber-400"}`} />
                        )}
                        <span>
                          {camp.isFeatured ? "Featured Partner Spotlight (Remove)" : "Promote to Featured Partner (Admin)"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            RECENT REDEMPTIONS LOG
            ========================================================================= */}
        <div className="bg-[#0e111a]/90 border border-[#1e2436] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Recent Completed Redemptions</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Audit log of vouchers processed at your store counters.
              </p>
            </div>
            <span className="text-xs text-zinc-500">{recentRedemptions.length} Records</span>
          </div>

          {recentRedemptions.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No redemptions logged yet. Transactions processed at the POS terminal will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1f2536] text-zinc-500 text-[11px]">
                    <th className="py-2.5 font-semibold">Reference</th>
                    <th className="py-2.5 font-semibold">Cashier</th>
                    <th className="py-2.5 font-semibold">Gross Bill</th>
                    <th className="py-2.5 font-semibold">Discount</th>
                    <th className="py-2.5 font-semibold">Net Collected</th>
                    <th className="py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181d2a]">
                  {recentRedemptions.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-[#141824]/50">
                      <td className="py-3 font-mono font-bold text-zinc-300">{r.redemptionReference}</td>
                      <td className="py-3 text-zinc-400">{r.cashierName || "Cashier"}</td>
                      <td className="py-3 text-zinc-300 font-bold">₦{safeNum(r.billAmountNaira).toLocaleString()}</td>
                      <td className="py-3 text-emerald-400 font-bold">-₦{safeNum(r.discountNaira).toLocaleString()}</td>
                      <td className="py-3 text-white font-black">₦{safeNum(r.finalPayableNaira).toLocaleString()}</td>
                      <td className="py-3 text-zinc-500">{r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString() : "Just now"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =========================================================================
            CREATE CAMPAIGN MODAL
            ========================================================================= */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-[#0e111a] border border-[#202738] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                  <span>Create Meal Marketing Campaign</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Offer Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. ₦1,000 Off Lunch Express Deal"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">Meal Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Small Chops">🍢 Small Chops</option>
                      <option value="Fast Foods">🍔 Fast Foods</option>
                      <option value="Local Delicacies">🍲 Local Delicacies</option>
                      <option value="Drinks">🥤 Drinks</option>
                      <option value="Pastries">🥐 Pastries</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Campaign Photo (Max 10MB)
                    </label>
                    <input
                      type="file"
                      ref={campaignImageInputRef}
                      onChange={handleCampaignImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => campaignImageInputRef.current?.click()}
                        disabled={isUploadingCampaignImage}
                        className="flex-1 px-3 py-2.5 bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] rounded-xl text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 transition"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>
                          {pendingCampaignPreviewUrl || newCampaignImage ? "Change Photo" : "Select Photo"}
                        </span>
                      </button>
                      {(pendingCampaignPreviewUrl || newCampaignImage) && (
                        <img
                          src={pendingCampaignPreviewUrl || newCampaignImage}
                          alt="Campaign preview"
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 flex-shrink-0"
                        />
                      )}
                    </div>
                    {pendingCampaignImageFile && (
                      <p className="text-[10px] text-emerald-400 font-medium">
                        Ready: {pendingCampaignImageFile.name} ({(pendingCampaignImageFile.size / (1024 * 1024)).toFixed(1)}MB) — will sync in background on publish.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">Discount Amount (₦)</label>
                    <input
                      type="number"
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      min="100"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">Min. Bill Spend (₦)</label>
                    <input
                      type="number"
                      value={newMinSpend}
                      onChange={(e) => setNewMinSpend(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      min="100"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">Customer Points Cost</label>
                    <input
                      type="number"
                      value={newPointsCost}
                      onChange={(e) => setNewPointsCost(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      min="0"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">Campaign Budget (₦)</label>
                    <input
                      type="number"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      min="1000"
                      max="200000"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {!campaignValidation.valid && !createCampaignError && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                    {campaignValidation.error}
                  </div>
                )}

                {createCampaignError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold text-red-300">Campaign Creation Failed</strong>
                      <span>{createCampaignError}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isSubmittingCampaign}
                    className="flex-1 py-2.5 rounded-xl bg-[#141824] hover:bg-[#1e2333] disabled:opacity-50 border border-[#23293a] text-xs font-bold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCampaign}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95"
                  >
                    {isSubmittingCampaign ? "Allocating Budget..." : createCampaignError ? "Retry Publish" : "Publish Campaign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            TOP UP BUDGET MODAL
            ========================================================================= */}
        {isTopUpModalOpen && activeCampaignForTopUp && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#0e111a] border border-[#202738] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
                <h3 className="text-sm font-bold text-white">Top Up Campaign Budget</h3>
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="p-1 rounded text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-[#141824] border border-[#23293a] rounded-xl text-xs space-y-1 text-zinc-400">
                <span className="font-bold text-white block">{activeCampaignForTopUp.title}</span>
                <div className="flex justify-between">
                  <span>Current Budget:</span>
                  <span className="text-white font-bold">₦{safeNum(activeCampaignForTopUp.campaignBudgetNaira).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spent + Reserved:</span>
                  <span className="text-amber-400">
                    ₦{(safeNum(activeCampaignForTopUp.campaignSpentNaira) + safeNum(activeCampaignForTopUp.campaignReservedNaira)).toLocaleString()}
                  </span>
                </div>
              </div>

              <form onSubmit={handleTopUpSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">New Total Budget (₦)</label>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    min="1000"
                    max="200000"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#23293a] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>

                {!topUpValidation.valid && (
                  <div className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-xl text-[11px] text-red-300">
                    {topUpValidation.error}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTopUpModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-xs font-bold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTopUp || !topUpValidation.valid}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition"
                  >
                    {isSubmittingTopUp ? "Updating..." : "Save Budget"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

import { useDispatch, useSelector } from "react-redux";
import { selectedPrice, billerInfo, setBillCatalog } from "../Features/userSlice";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";

const useCloudfunc = () => {
  const user = useSelector((state) => state?.user?.user) || {};
  const billCatalog = useSelector((state) => state?.user?.billCatalog);
  const { accountReference } = user;
  const dispatch = useDispatch();

  // Cloud Function callable bindings
  const billsFetch = httpsCallable(functions, "billsFetch");
  const fetchBanksCall = httpsCallable(functions, "fetchBanks");
  const withdrawCall = httpsCallable(functions, "withdraw");
  const resolvePaywakaRecipientCall = httpsCallable(functions, "resolvePaywakaRecipient");
  const transferPaywakaP2PCall = httpsCallable(functions, "transferPaywakaP2P");
  const verifyWithdrawalStatusCall = httpsCallable(functions, "verifyWithdrawalStatus");
  const fetchBalanceCall = httpsCallable(functions, "fetchBalance");
  const retryCreateWalletCall = httpsCallable(functions, "retryCreateWallet");
  const buyAirtimeCall = httpsCallable(functions, "buyAirtime");
  const buyDataCall = httpsCallable(functions, "buyData");
  const payElectricityCall = httpsCallable(functions, "payElectricity");
  const payCableCall = httpsCallable(functions, "payCable");
  const fetchDataPlansCall = httpsCallable(functions, "fetchDataPlans");
  const fetchCablePackagesCall = httpsCallable(functions, "fetchCablePackages");
  const validateCustomerCall = httpsCallable(functions, "validateCustomer");
  const adminSyncClubKonnectCall = httpsCallable(functions, "adminSyncClubKonnect");
  const adminGetPricingConfigCall = httpsCallable(functions, "adminGetPricingConfig");
  const adminUpdatePricingConfigCall = httpsCallable(functions, "adminUpdatePricingConfig");
  const adminUpdatePlanPriceCall = httpsCallable(functions, "adminUpdatePlanPrice");
  const adminUpdateCablePackagePriceCall = httpsCallable(functions, "adminUpdateCablePackagePrice");
  const adminSeedPricingFromExcelCall = httpsCallable(functions, "adminSeedPricingFromExcel");
  const adminGetDashboardDataCall = httpsCallable(functions, "adminGetDashboardData");
  const getBillPricingConfigCall = httpsCallable(functions, "getBillPricingConfig");
  const transferCashbackToWalletCall = httpsCallable(functions, "transferCashbackToWallet");
  const verifyPendingClubKonnectOrderCall = httpsCallable(functions, "verifyPendingClubKonnectOrder");
  const adminGetBillPricingConfigCall = httpsCallable(functions, "adminGetBillPricingConfig");
  const adminUpdateBillPricingConfigCall = httpsCallable(functions, "adminUpdateBillPricingConfig");
  const createTransactionPinCall = httpsCallable(functions, "createTransactionPin");
  const changeTransactionPinCall = httpsCallable(functions, "changeTransactionPin");
  const resetTransactionPinCall = httpsCallable(functions, "resetTransactionPin");
  const verifyTransactionPinCall = httpsCallable(functions, "verifyTransactionPin");
  const redeemMealCouponCall = httpsCallable(functions, "redeemMealCoupon", { timeout: 300000 });
  const setDemoCashierRoleCall = httpsCallable(functions, "setDemoCashierRole", { timeout: 300000 });
  const validateMealVoucherForMerchantCall = httpsCallable(functions, "validateMealVoucherForMerchant", { timeout: 300000 });
  const redeemMealVoucherMerchantCall = httpsCallable(functions, "redeemMealVoucherMerchant", { timeout: 300000 });
  const getMerchantDashboardDataCall = httpsCallable(functions, "getMerchantDashboardData", { timeout: 300000 });
  const createVendorCampaignCall = httpsCallable(functions, "createVendorCampaign", { timeout: 300000 });
  const updateMerchantCampaignStatusCall = httpsCallable(functions, "updateMerchantCampaignStatus", { timeout: 300000 });
  const updateMerchantCampaignBudgetCall = httpsCallable(functions, "updateMerchantCampaignBudget", { timeout: 300000 });
  const adminProvisionVendorUserCall = httpsCallable(functions, "adminProvisionVendorUser", { timeout: 300000 });
  const adminRegisterVendorStoreCall = httpsCallable(functions, "adminRegisterVendorStore", { timeout: 300000 });
  const updateVendorProfileCall = httpsCallable(functions, "updateVendorProfile", { timeout: 300000 });
  const updateVendorCampaignImageCall = httpsCallable(functions, "updateVendorCampaignImage", { timeout: 300000 });
  const adminSetCampaignFeaturedCall = httpsCallable(functions, "adminSetCampaignFeatured", { timeout: 300000 });

  const adminGetDashboardData = async () => {
    const res = await adminGetDashboardDataCall();
    return res.data;
  };

  const getBillPricingConfig = async () => {
    const res = await getBillPricingConfigCall();
    return res.data;
  };

  const transferCashbackToWallet = async (payload) => {
    const res = await transferCashbackToWalletCall(payload);
    return res.data;
  };

  const verifyPendingClubKonnectOrder = async (payload) => {
    const res = await verifyPendingClubKonnectOrderCall(payload);
    return res.data;
  };

  const adminGetBillPricingConfig = async () => {
    const res = await adminGetBillPricingConfigCall();
    return res.data;
  };

  const adminUpdateBillPricingConfig = async (payload) => {
    const res = await adminUpdateBillPricingConfigCall(payload);
    return res.data;
  };

  const adminSyncClubKonnect = async () => {
    const res = await adminSyncClubKonnectCall();
    return res.data;
  };

  const adminGetPricingConfig = async () => {
    const res = await adminGetPricingConfigCall();
    return res.data;
  };

  const adminUpdatePricingConfig = async (payload) => {
    const res = await adminUpdatePricingConfigCall(payload);
    return res.data;
  };

  const adminUpdatePlanPrice = async (payload) => {
    const res = await adminUpdatePlanPriceCall(payload);
    return res.data;
  };

  const adminUpdateCablePackagePrice = async (payload) => {
    const res = await adminUpdateCablePackagePriceCall(payload);
    return res.data;
  };

  const adminSeedPricingFromExcel = async () => {
    const res = await adminSeedPricingFromExcelCall();
    return res.data;
  };

  const retryWalletCreation = async () => {
    try {
      const res = await retryCreateWalletCall();
      return res.data;
    } catch (err) {
      console.error("Error retrying wallet creation:", err);
      throw err;
    }
  };

  const fetchBanks = async () => {
    const CACHE_KEY = "paywaka_cached_banks_ng_v1";
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Valid for up to 24 hours, refreshed nightly
        if (
          parsed.timestamp &&
          Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000 &&
          Array.isArray(parsed.banks) &&
          parsed.banks.length > 0
        ) {
          return { data: { status: "success", bankDetails: parsed.banks, fromCache: true } };
        }
      }
    } catch (e) {
      console.warn("Error reading cached banks:", e);
    }

    const response = await fetchBanksCall();
    if (response?.data?.status === "success" && Array.isArray(response.data.bankDetails)) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            banks: response.data.bankDetails,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.warn("Failed to write banks to localStorage:", e);
      }
    }
    return response;
  };

  const withdraw = async (payload) => {
    return await withdrawCall(payload);
  };

  const resolvePaywakaRecipient = async (payload) => {
    const res = await resolvePaywakaRecipientCall(payload);
    return res.data;
  };

  const transferPaywakaP2P = async (payload) => {
    const res = await transferPaywakaP2PCall(payload);
    return res.data;
  };

  const verifyWithdrawalStatus = async (payload) => {
    const res = await verifyWithdrawalStatusCall(payload);
    return res.data;
  };

  const validateCustomer = async (payload) => {
    return await validateCustomerCall(payload);
  };

  const biller = async (network, productName) => {
    const netUpper = (network || "MTN").toUpperCase();
    const netKey = netUpper.includes("GLO")
      ? "GLO"
      : netUpper.includes("AIRTEL")
        ? "AIRTEL"
        : netUpper.includes("9MOB") || netUpper.includes("ETISALAT") || netUpper.includes("T2")
          ? "9MOBILE"
          : "MTN";

    dispatch(
      selectedPrice({
        network: netUpper,
        productName,
      }),
    );

    if (productName === "Data") {
      const cachedPlans = billCatalog?.dataPlansByNetwork?.[netKey];
      const syncedAtMs = billCatalog?.lastSyncedAtIso
        ? Date.parse(billCatalog.lastSyncedAtIso)
        : 0;
      const maxAgeMs =
        (Number(billCatalog?.syncIntervalHours) || 3) * 60 * 60 * 1000;
      const isFresh =
        Array.isArray(cachedPlans) &&
        cachedPlans.length > 0 &&
        Number.isFinite(syncedAtMs) &&
        Date.now() - syncedAtMs <= maxAgeMs;

      if (Array.isArray(cachedPlans) && cachedPlans.length > 0) {
        // Hydrate UI synchronously with zero wipe and zero spinner
        dispatch(billerInfo({ billsInfo: cachedPlans }));
        if (!isFresh) {
          fetchDataPlansCall({ network: netKey })
            .then((res) => {
              if (res?.data?.catalog) dispatch(setBillCatalog(res.data.catalog));
              if (Array.isArray(res?.data?.data) && res.data.data.length > 0) {
                dispatch(billerInfo({ billsInfo: res.data.data }));
              }
            })
            .catch(() => { });
        }
        return true;
      }

      // Cold cache: reset previous list only when we truly have nothing cached for this network
      dispatch(billerInfo({ billsInfo: [] }));
      try {
        const res = await fetchDataPlansCall({ network: netKey });
        if (res?.data?.catalog) {
          dispatch(setBillCatalog(res.data.catalog));
        }
        const plans = res.data?.data;
        if (Array.isArray(plans) && plans.length > 0) {
          dispatch(billerInfo({ billsInfo: plans }));
          return true;
        } else {
          console.warn("fetchDataPlans returned empty or fallback:", res.data);
          return false;
        }
      } catch (error) {
        toast.error("Error fetching data plans");
        console.error("Error fetching data plans:", error);
        return false;
      }
    } else if (productName === "Airtime") {
      dispatch(
        selectedPrice({
          network: netUpper,
          productName: "Airtime",
        }),
      );
      return true;
    }
  };

  const cable = async (price, itemCode, billerCode, productName, network) => {
    if (price === null && itemCode === null) {
      const CABLE_MAP = {
        "01": "DSTV",
        "02": "GOTV",
        "03": "STARTIMES",
        "04": "SHOWMAX",
      };

      const rawNet = String(network || "01").trim();
      const provUpper = (CABLE_MAP[rawNet] || rawNet).toUpperCase();
      const fbKey = provUpper.includes("GOTV")
        ? "GOTV"
        : provUpper.includes("STARTIMES") || provUpper.includes("STARTIME")
          ? "STARTIMES"
          : provUpper.includes("SHOWMAX")
            ? "SHOWMAX"
            : "DSTV";

      dispatch(
        selectedPrice({
          network: provUpper,
          productName: productName || "Cable",
        }),
      );

      const LOCAL_FALLBACKS = {
        GOTV: [
          { id: "gotv-smallie", name: "GOtv Smallie - Monthly", amount: 1900, package_code: "gotv-smallie", item_code: "gotv-smallie", short_name: "GOtv Smallie - Monthly - ₦1,900" },
          { id: "gotv-smallie-3months", name: "GOtv Smallie - Quarterly", amount: 5100, package_code: "gotv-smallie-3months", item_code: "gotv-smallie-3months", short_name: "GOtv Smallie - Quarterly - ₦5,100" },
          { id: "gotv-smallie-1year", name: "GOtv Smallie - Yearly", amount: 15000, package_code: "gotv-smallie-1year", item_code: "gotv-smallie-1year", short_name: "GOtv Smallie - Yearly - ₦15,000" },
          { id: "gotv-jinja", name: "GOtv Jinja", amount: 3900, package_code: "gotv-jinja", item_code: "gotv-jinja", short_name: "GOtv Jinja - ₦3,900" },
          { id: "gotv-jolli", name: "GOtv Jolli", amount: 5800, package_code: "gotv-jolli", item_code: "gotv-jolli", short_name: "GOtv Jolli - ₦5,800" },
          { id: "gotv-max", name: "GOtv Max", amount: 8500, package_code: "gotv-max", item_code: "gotv-max", short_name: "GOtv Max - ₦8,500" },
          { id: "gotv-supa", name: "GOtv Supa", amount: 11400, package_code: "gotv-supa", item_code: "gotv-supa", short_name: "GOtv Supa - ₦11,400" },
          { id: "gotv-supa-plus", name: "GOtv Supa Plus", amount: 16800, package_code: "gotv-supa-plus", item_code: "gotv-supa-plus", short_name: "GOtv Supa Plus - ₦16,800" },
        ],
        DSTV: [
          { id: "dstv-padi", name: "DStv Padi", amount: 4400, package_code: "dstv-padi", item_code: "dstv-padi", short_name: "DStv Padi - ₦4,400" },
          { id: "dstv-yanga", name: "DStv Yanga", amount: 6000, package_code: "dstv-yanga", item_code: "dstv-yanga", short_name: "DStv Yanga - ₦6,000" },
          { id: "dstv-confam", name: "DStv Confam", amount: 11000, package_code: "dstv-confam", item_code: "dstv-confam", short_name: "DStv Confam - ₦11,000" },
          { id: "dstv-compact", name: "DStv Compact", amount: 19000, package_code: "dstv-compact", item_code: "dstv-compact", short_name: "DStv Compact - ₦19,000" },
          { id: "dstv-compact-plus", name: "DStv Compact Plus", amount: 30000, package_code: "dstv-compact-plus", item_code: "dstv-compact-plus", short_name: "DStv Compact Plus - ₦30,000" },
          { id: "dstv-premium", name: "DStv Premium", amount: 44000, package_code: "dstv-premium", item_code: "dstv-premium", short_name: "DStv Premium - ₦44,000" },
        ],
        STARTIMES: [
          { id: "nova", name: "Nova (Antenna) - 1 Month", amount: 2100, package_code: "nova", item_code: "nova", short_name: "Nova (Antenna) - ₦2,100" },
          { id: "basic", name: "Basic (Antenna) - 1 Month", amount: 3700, package_code: "basic", item_code: "basic", short_name: "Basic (Antenna) - ₦3,700" },
          { id: "smart", name: "Basic (Dish) - 1 Month", amount: 4700, package_code: "smart", item_code: "smart", short_name: "Basic (Dish) - ₦4,700" },
          { id: "classic", name: "Classic (Antenna) - 1 Month", amount: 6000, package_code: "classic", item_code: "classic", short_name: "Classic (Antenna) - ₦6,000" },
          { id: "super", name: "Super (Dish) - 1 Month", amount: 9800, package_code: "super", item_code: "super", short_name: "Super (Dish) - ₦9,800" },
        ],
        SHOWMAX: [
          { id: "showmax-entertainment", name: "Showmax Entertainment", amount: 2900, package_code: "showmax-entertainment", item_code: "showmax-entertainment", short_name: "Showmax Entertainment - ₦2,900" },
          { id: "showmax-premier-league", name: "Showmax Premier League", amount: 3200, package_code: "showmax-premier-league", item_code: "showmax-premier-league", short_name: "Showmax Premier League - ₦3,200" },
          { id: "showmax-all", name: "Showmax All Access", amount: 5400, package_code: "showmax-all", item_code: "showmax-all", short_name: "Showmax All Access - ₦5,400" },
        ],
      };

      const cachedPackages = billCatalog?.cablePackagesByProvider?.[fbKey];
      const syncedAtMs = billCatalog?.lastSyncedAtIso
        ? Date.parse(billCatalog.lastSyncedAtIso)
        : 0;
      const maxAgeMs =
        (Number(billCatalog?.syncIntervalHours) || 3) * 60 * 60 * 1000;
      const isFresh =
        Array.isArray(cachedPackages) &&
        cachedPackages.length > 0 &&
        Number.isFinite(syncedAtMs) &&
        Date.now() - syncedAtMs <= maxAgeMs;

      if (Array.isArray(cachedPackages) && cachedPackages.length > 0) {
        dispatch(billerInfo({ billsInfo: cachedPackages }));
        if (!isFresh) {
          fetchCablePackagesCall({ provider: provUpper })
            .then((res) => {
              if (res?.data?.catalog) dispatch(setBillCatalog(res.data.catalog));
              if (Array.isArray(res?.data?.data) && res.data.data.length > 0) {
                dispatch(billerInfo({ billsInfo: res.data.data }));
              }
            })
            .catch(() => { });
        }
        return true;
      }

      dispatch(billerInfo({ billsInfo: [] }));
      try {
        const res = await fetchCablePackagesCall({ provider: provUpper });
        if (res?.data?.catalog) {
          dispatch(setBillCatalog(res.data.catalog));
        }
        const packages = res.data?.data;
        if (Array.isArray(packages) && packages.length > 0) {
          const normalized = packages.map((p) => {
            const amt = Number(p.amount || p.PACKAGE_AMOUNT || 0);
            const pName = p.name || p.PACKAGE_NAME || "Cable Package";
            return {
              id: p.id || p.package_code || p.item_code || p.PACKAGE_CODE,
              name: pName,
              short_name: p.short_name || `${pName} - ₦${amt.toLocaleString()}`,
              amount: amt,
              costPrice: p.costPrice ?? null,
              feeCharged: p.feeCharged ?? 0,
              cashbackAmount: p.cashbackAmount ?? 0,
              package_code: p.package_code || p.id || p.PACKAGE_CODE,
              item_code: p.item_code || p.package_code || p.id || p.PACKAGE_CODE,
            };
          });
          dispatch(billerInfo({ billsInfo: normalized }));
          return true;
        }
      } catch (error) {
        console.warn("Cloud function cable fetch error, using fallback catalog:", error);
      }

      // Fallback
      const fallback = LOCAL_FALLBACKS[fbKey] || LOCAL_FALLBACKS.GOTV;
      dispatch(billerInfo({ billsInfo: fallback }));
      return true;
    } else if (billerCode === null && productName === null && network === null) {
      dispatch(
        selectedPrice({
          price,
          itemCode,
        }),
      );
    }
  };

  const getWalletBalance = async (accReference) => {
    const payload = accReference || accountReference;
    try {
      const res = await fetchBalanceCall({ accountReference: payload });
      if (res.data?.status !== "error") {
        return {
          status: "success",
          walletBalance: res.data?.walletBalance,
        };
      } else {
        return {
          status: "error",
          message: res.data?.message,
        };
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      return {
        status: "error",
        message: error.message,
      };
    }
  };

  const buyAirtime = async (payload) => {
    console.log("📱 [PAYWAKA - Sending Airtime Purchase Request]:", payload);
    const res = await buyAirtimeCall(payload);
    console.log("📱 [PAYWAKA - Airtime Purchase API Response]:", res?.data);
    return res.data;
  };

  const buyData = async (payload) => {
    console.log("📶 [PAYWAKA - Sending Data/Internet Purchase Request]:", payload);
    const res = await buyDataCall(payload);
    console.log("📶 [PAYWAKA - Data/Internet Purchase API Response]:", res?.data);
    return res.data;
  };

  const payElectricity = async (payload) => {
    console.log("🔌 [PAYWAKA - Sending Electricity Payment Request]:", payload);
    const res = await payElectricityCall(payload);
    console.log("🔌 [PAYWAKA - Electricity Purchase API Response]:", res?.data);
    return res.data;
  };

  const payCable = async (payload) => {
    console.log("📺 [PAYWAKA - Sending Cable TV Payment Request]:", payload);
    const res = await payCableCall(payload);
    console.log("📺 [PAYWAKA - Cable TV Purchase API Response]:", res?.data);
    return res.data;
  };

  const fetchDataPlans = async (payload) => {
    const res = await fetchDataPlansCall(payload);
    console.log("📶 [PAYWAKA - Fetch Data Plans API Response]:", res?.data);
    return res.data;
  };

  const fetchCablePackages = async (payload) => {
    const res = await fetchCablePackagesCall(payload);
    console.log("📺 [PAYWAKA - Fetch Cable Packages API Response]:", res?.data);
    return res.data;
  };

  const createTransactionPin = async (payload) => {
    console.log("🔐 [PAYWAKA - Creating Transaction PIN]");
    const res = await createTransactionPinCall(payload);
    return res.data;
  };

  const changeTransactionPin = async (payload) => {
    console.log("🔐 [PAYWAKA - Changing Transaction PIN]");
    const res = await changeTransactionPinCall(payload);
    return res.data;
  };

  const resetTransactionPin = async (payload) => {
    console.log("🔐 [PAYWAKA - Resetting Transaction PIN]");
    const res = await resetTransactionPinCall(payload);
    return res.data;
  };

  const verifyTransactionPin = async (payload) => {
    console.log("🔐 [PAYWAKA - Verifying Transaction PIN]");
    const res = await verifyTransactionPinCall(payload);
    return res.data;
  };

  const redeemMealCoupon = async ({ couponId, pin, idempotencyKey }) => {
    console.log("🎟️ [PAYWAKA - Redeeming Meal Coupon]:", couponId);
    const res = await redeemMealCouponCall({ couponId, pin, idempotencyKey });
    return res.data;
  };

  const setDemoCashierRole = async ({ vendorId, branch, cashierName }) => {
    console.log("🏪 [PAYWAKA - Configuring Demo Cashier Role]:", vendorId);
    const res = await setDemoCashierRoleCall({ vendorId, branch, cashierName });
    return res.data;
  };

  const validateMealVoucherForMerchant = async ({ voucherCodeOrId, vendorId }) => {
    console.log("🔍 [PAYWAKA - Merchant Voucher Validation]:", voucherCodeOrId, vendorId);
    const res = await validateMealVoucherForMerchantCall({ voucherCodeOrId, vendorId });
    return res.data;
  };

  const redeemMealVoucherMerchant = async ({
    voucherCodeOrId,
    vendorId,
    vendorBranch,
    billAmountNaira,
    voucherPin,
    idempotencyKey,
  }) => {
    console.log("✅ [PAYWAKA - Merchant Voucher Redemption]:", voucherCodeOrId, vendorId, billAmountNaira);
    const res = await redeemMealVoucherMerchantCall({
      voucherCodeOrId,
      vendorId,
      vendorBranch,
      billAmountNaira,
      voucherPin,
      idempotencyKey,
    });
    return res.data;
  };

  const getMerchantDashboardData = async (targetVendorId) => {
    const res = await getMerchantDashboardDataCall({ targetVendorId });
    return res.data;
  };

  const createVendorCampaign = async (payload) => {
    const normalizedPayload = {
      ...payload,
      targetVendorId: payload?.targetVendorId || payload?.vendorId,
    };
    const res = await createVendorCampaignCall(normalizedPayload);
    return res.data;
  };

  const updateMerchantCampaignStatus = async (campaignId, newStatus) => {
    const res = await updateMerchantCampaignStatusCall({ campaignId, newStatus });
    return res.data;
  };

  const updateMerchantCampaignBudget = async (campaignId, newBudgetNaira) => {
    const res = await updateMerchantCampaignBudgetCall({ campaignId, newBudgetNaira });
    return res.data;
  };

  const adminProvisionVendorUser = async (payload) => {
    const res = await adminProvisionVendorUserCall(payload);
    return res.data;
  };

  const adminRegisterVendorStore = async (payload) => {
    const res = await adminRegisterVendorStoreCall(payload);
    return res.data;
  };

  const updateVendorProfile = async (payload) => {
    const res = await updateVendorProfileCall(payload);
    return res.data;
  };

  const updateVendorCampaignImage = async (payload) => {
    const res = await updateVendorCampaignImageCall(payload);
    return res.data;
  };

  const adminSetCampaignFeatured = async (campaignId, isFeatured) => {
    const res = await adminSetCampaignFeaturedCall({ campaignId, isFeatured });
    return res.data;
  };

  return {
    biller,
    cable,
    getWalletBalance,
    fetchBanks,
    withdraw,
    resolvePaywakaRecipient,
    transferPaywakaP2P,
    verifyWithdrawalStatus,
    retryWalletCreation,
    buyAirtime,
    purchaseAirtime: buyAirtime,
    buyData,
    purchaseData: buyData,
    payElectricity,
    purchaseElectricity: payElectricity,
    payCable,
    purchaseCable: payCable,
    fetchDataPlans,
    fetchCablePackages,
    validateCustomer,
    adminSyncClubKonnect,
    adminGetPricingConfig,
    adminUpdatePricingConfig,
    adminUpdatePlanPrice,
    adminUpdateCablePackagePrice,
    adminSeedPricingFromExcel,
    adminGetDashboardData,
    getBillPricingConfig,
    transferCashbackToWallet,
    verifyPendingClubKonnectOrder,
    adminGetBillPricingConfig,
    adminUpdateBillPricingConfig,
    createTransactionPin,
    changeTransactionPin,
    resetTransactionPin,
    verifyTransactionPin,
    createPin: createTransactionPin,
    changePin: changeTransactionPin,
    resetPin: resetTransactionPin,
    redeemMealCoupon,
    setDemoCashierRole,
    validateMealVoucherForMerchant,
    redeemMealVoucherMerchant,
    getMerchantDashboardData,
    createVendorCampaign,
    updateMerchantCampaignStatus,
    updateMerchantCampaignBudget,
    adminProvisionVendorUser,
    adminRegisterVendorStore,
    updateVendorProfile,
    updateVendorCampaignImage,
    adminSetCampaignFeatured,
  };
};

export default useCloudfunc;

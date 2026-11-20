import { createSlice } from "@reduxjs/toolkit";
//import call from '../assets/Icons/Background Images/call.jpg'

// const initialState = [
//   {
//     userName: '',
//     userEmail: '',
//     userState: '',
//     userCountry: '',
//     userGender: '',
//     userPhone: '',
//     userPhoto: call,
//     userAuth: false,
//   },
//   { price: '', productName: '', network: '', tel: '', billsInfo: '', tx_ref: '' },
// ]

const LOCAL_BILL_CATALOG_CACHE_KEY = "paywaka_bill_catalog_cache_v1";

function sanitizeSerializable(value) {
  if (!value || typeof value !== "object") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString();
  if (value.seconds !== undefined && value.nanoseconds !== undefined) return new Date(value.seconds * 1000).toISOString();
  if (Array.isArray(value)) return value.map(sanitizeSerializable);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = sanitizeSerializable(v);
  }
  return out;
}

function getDefaultBillCatalog() {
  return {
    catalogVersion: 0,
    lastSyncedAtIso: null,
    syncIntervalHours: 3,
    dataPlansByNetwork: { MTN: [], GLO: [], AIRTEL: [], "9MOBILE": [] },
    cablePackagesByProvider: { DSTV: [], GOTV: [], STARTIMES: [], SHOWMAX: [] },
    electricityDiscos: [],
    billPricingConfig: null,
    dataPricingConfig: null,
    liveProviderMetadata: null,
  };
}

function normalizeBillCatalog(rawCatalog) {
  const defaults = getDefaultBillCatalog();
  const safe = sanitizeSerializable(rawCatalog) || {};
  return {
    ...defaults,
    ...safe,
    catalogVersion: Number(safe.catalogVersion || 0),
    syncIntervalHours: Number(safe.syncIntervalHours || 3),
    dataPlansByNetwork: {
      ...defaults.dataPlansByNetwork,
      ...(safe.dataPlansByNetwork || {}),
    },
    cablePackagesByProvider: {
      ...defaults.cablePackagesByProvider,
      ...(safe.cablePackagesByProvider || {}),
    },
    electricityDiscos: Array.isArray(safe.electricityDiscos)
      ? safe.electricityDiscos
      : [],
  };
}

function loadInitialBillCatalogFromStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return getDefaultBillCatalog();
    }
    const raw = window.localStorage.getItem(LOCAL_BILL_CATALOG_CACHE_KEY);
    if (!raw) return getDefaultBillCatalog();
    const parsed = JSON.parse(raw);
    return normalizeBillCatalog(parsed);
  } catch {
    return getDefaultBillCatalog();
  }
}

const initialState = {
  user: {
    firstName: "",
    lastName: "",
    lastLogin: "",
    userName: "",
    userEmail: "",
    userState: "",
    userCountry: "",
    userGender: "",
    userPhone: "",
    userPhoto: null,
    userAuth: false,
    uid: null,
    walletBalance: null,
    walletBalanceKobo: null,
    cashbackBalance: 0,
    cashbackBalanceKobo: 0,
    accountReference: null,
    accountNumber: null,
    bankName: null,
    barterID: null,
    barter_id: null,
    cashbackAccountReference: null,
    cashbackBarterId: null,
    referralCode: null,
    refferalsCount: null,
    points: null,
    twoFactor: false,
    loginAlerts: false,
    sessionTimeout: null,
    hasTransactionPin: false,
  },
  transactions: {
    billType: "",
    bonusToEarn: "",
    banks: null,
    bankCode: "",
    plan: "",
    cashbackAmount: 0,
    price: "",
    productName: "",
    network: "",
    electricityDistributor: "",
    meterType: "",
    //meterNumber: "",
    //either tel, meter number, decoder number
    customerID: "",
    billsInfo: "",
    tx_ref: "",
    billerCode: "",
    itemCode: "",
  },
  achievementsData: {
    firstSurvey: 0,
    pointsEarned: 0,
    billPayer: 0,
  },
  billCatalog: loadInitialBillCatalogFromStorage(),
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // addUserInfo: (state, action) => {
    //   const { userName, userEmail } = action.payload;
    //   state.user = { ...state.user, userName, userEmail };
    // },
    changeUserPhoto: (state, action) => {
      const { userPhoto } = action.payload;
      state.user = { ...state.user, userPhoto };
    },
    addUserCred: (state, action) => {
      const payload = sanitizeSerializable(action.payload) || {};
      const accountNumber =
        payload.accountNumber ||
        payload.account_number ||
        payload.static_account ||
        state.user.accountNumber ||
        null;
      const bankName =
        payload.bankName ||
        payload.bank_name ||
        state.user.bankName ||
        null;
      const bankCode =
        payload.bankCode ||
        payload.bank_code ||
        state.user.bankCode ||
        null;
      const accountReference =
        payload.accountReference ||
        payload.account_reference ||
        payload.flw_ref ||
        payload.flw_account_reference ||
        state.user.accountReference ||
        null;
      const barter_id =
        payload.barter_id ||
        payload.barterId ||
        payload.barterID ||
        state.user.barter_id ||
        null;
      const walletBalance =
        payload.walletBalance !== undefined && payload.walletBalance !== null && payload.walletBalance !== "null"
          ? Number(payload.walletBalance)
          : state.user.walletBalance;
      const walletBalanceKobo =
        payload.walletBalanceKobo !== undefined && payload.walletBalanceKobo !== null
          ? Number(payload.walletBalanceKobo)
          : walletBalance !== null ? Math.round(walletBalance * 100) : state.user.walletBalanceKobo;
      const cashbackBalance =
        payload.cashbackBalance !== undefined && payload.cashbackBalance !== null
          ? Number(payload.cashbackBalance)
          : state.user.cashbackBalance || 0;
      const cashbackBalanceKobo =
        payload.cashbackBalanceKobo !== undefined && payload.cashbackBalanceKobo !== null
          ? Number(payload.cashbackBalanceKobo)
          : Math.round(cashbackBalance * 100);

      state.user = {
        ...state.user,
        ...payload,
        accountNumber,
        bankName,
        bankCode,
        accountReference,
        barter_id,
        barterID: barter_id,
        walletBalance,
        walletBalanceKobo,
        cashbackBalance,
        cashbackBalanceKobo,
      };
    },
    updateWalletDetails: (state, action) => {
      const payload = action.payload || {};
      const walletBalance =
        payload.walletBalance !== undefined && payload.walletBalance !== null
          ? Number(payload.walletBalance)
          : state.user.walletBalance;
      const walletBalanceKobo =
        payload.walletBalanceKobo !== undefined && payload.walletBalanceKobo !== null
          ? Number(payload.walletBalanceKobo)
          : walletBalance !== null ? Math.round(walletBalance * 100) : state.user.walletBalanceKobo;

      state.user = {
        ...state.user,
        accountNumber:
          payload.accountNumber ??
          payload.account_number ??
          payload.static_account ??
          state.user.accountNumber,
        bankName: payload.bankName ?? payload.bank_name ?? state.user.bankName,
        bankCode: payload.bankCode ?? payload.bank_code ?? state.user.bankCode,
        barter_id: payload.barter_id ?? payload.barterId ?? payload.barterID ?? state.user.barter_id,
        barterID: payload.barter_id ?? payload.barterId ?? payload.barterID ?? state.user.barterID,
        accountReference:
          payload.accountReference ??
          payload.account_reference ??
          payload.flw_ref ??
          state.user.accountReference,
        walletBalance,
        walletBalanceKobo,
      };
    },
    selectedPrice: (state, action) => {
      state.transactions = { ...state.transactions, ...action.payload };
    },
    updateAchievement: (state, action) => {
      state.achievementsData = { ...state.achievementsData, ...action.payload };
    },
    billerInfo: (state, action) => {
      state.transactions = { ...state.transactions, ...action.payload };
    },
    setHasTransactionPin: (state, action) => {
      state.user.hasTransactionPin = !!action.payload;
    },
    setBillCatalog: (state, action) => {
      const normalized = normalizeBillCatalog(action.payload);
      if (
        normalized.catalogVersion > 0 &&
        normalized.catalogVersion === state.billCatalog?.catalogVersion
      ) {
        return;
      }
      state.billCatalog = normalized;
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(
            LOCAL_BILL_CATALOG_CACHE_KEY,
            JSON.stringify(normalized),
          );
        }
      } catch {
        // Ignore storage quota errors cleanly
      }
    },
    clearState: (state, action) => {
      state.transactions = initialState.transactions;
      state.achievementsData = initialState.achievementsData;
      state.user = initialState.user;
    },
  },
});

export const {
  addUserInfo,
  changeUserPhoto,
  addUserCred,
  updateWalletDetails,
  selectedPrice,
  updateAchievement,
  billerInfo,
  setHasTransactionPin,
  setBillCatalog,
  clearState,
} = userSlice.actions;
export default userSlice.reducer;

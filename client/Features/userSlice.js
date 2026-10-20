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
    accountReference: null,
    accountNumber: null,
    bankName: null,
    barterID: null,
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
      const payload = action.payload || {};
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
      const walletBalance =
        payload.walletBalance !== undefined && payload.walletBalance !== null && payload.walletBalance !== "null"
          ? Number(payload.walletBalance)
          : state.user.walletBalance;

      state.user = {
        ...state.user,
        ...payload,
        accountNumber,
        bankName,
        bankCode,
        accountReference,
        walletBalance,
      };
    },
    updateWalletDetails: (state, action) => {
      const payload = action.payload || {};
      state.user = {
        ...state.user,
        accountNumber:
          payload.accountNumber ??
          payload.account_number ??
          payload.static_account ??
          state.user.accountNumber,
        bankName: payload.bankName ?? payload.bank_name ?? state.user.bankName,
        bankCode: payload.bankCode ?? payload.bank_code ?? state.user.bankCode,
        accountReference:
          payload.accountReference ??
          payload.account_reference ??
          payload.flw_ref ??
          state.user.accountReference,
        walletBalance:
          payload.walletBalance !== undefined && payload.walletBalance !== null
            ? Number(payload.walletBalance)
            : state.user.walletBalance,
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
  clearState,
} = userSlice.actions;
export default userSlice.reducer;

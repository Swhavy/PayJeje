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
    referralLink: null,
  },
  transactions: {
    bonusToEarn: "",
    plan: "",
    cashbackAmount: "",
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
      console.log("from slice", action);
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },
    selectedPrice: (state, action) => {
      state.transactions = { ...state.transactions, ...action.payload };
    },
    billerInfo: (state, action) => {
      state.transactions = { ...state.transactions, ...action.payload };
    },
    clearState: (state, action) => {
      state.transactions = {};
      state.user = {};
    },
  },
});

export const {
  addUserInfo,
  changeUserPhoto,
  addUserCred,
  selectedPrice,
  billerInfo,
  clearState,
} = userSlice.actions;
export default userSlice.reducer;

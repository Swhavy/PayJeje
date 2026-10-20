import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import store, { persistor } from "@/Features/store.js";
import { PersistGate } from "redux-persist/integration/react";
import AccountDetailsCard from "@/components/AccountDetailsCard.jsx";
import BillHistory from "@/pages/BillHistory.jsx";
import TransactionChart from "@/components/HistoryChart.jsx";
import NotificationsPage from "@/components/NotificationPage.jsx";
import ProposalDocument from "@/pages/pitch.jsx";
import PaymentSuccessAnimation from "@/pages/animate.jsx";

// Components
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import SpinnerProvider from "@/components/SpinnerProvider";
import Transactions from "@/Components/Transactions";
import useTransactionFetch from "@/Components/useTransactionFetch";

// Pages
import HomePage from "./pages/index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import SignupFlow from "./pages/auth/pegister";
import Dashboard from "./pages/Dashboard";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import Wallet from "./pages/Wallet";
import BankCombobox from "./pages/wall";
import WithdrawalStatePage from "./pages/WithdrawalStatePage";
import Earn from "./pages/Earn";
import Referrals from "./pages/Referrals";
import Settings from "./pages/Settings";
import DevCard from "./pages/DevCard";
import DataPreference from "@/pages/DataPreference";
import PaymentSuccesful from "@/pages/PaymentSuccesful";
import FeedbackAlert from "@/components/Alert";
import Receipts from "@/pages/Receipts";

// Service Pages
import Airtime from "./pages/services/Airtime";
import DataPlans from "./pages/services/DataPlans";
import GiftCards from "./pages/services/GiftCards";
import Bills from "./pages/services/Bills";
import Meals from "./pages/services/Meals";
import MealCouponDetail from "./pages/services/MealCouponDetail";
import MealVoucherTicket from "./pages/services/MealVoucherTicket";
import MyMealVouchers from "./pages/services/MyMealVouchers";
import MealMerchantTerminal from "./pages/services/MealMerchantTerminal";
import MerchantRoute from "./components/MerchantRoute";
import AdminDataPricing from "./pages/admin/AdminDataPricing";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="w-full h-full overflow-hidden bg-black/40 backdrop-blur-md absolute top-0 z-30 flex flex-auto gap-5">
            <div className="w-32 h-32 absolute inset-0 m-auto rounded-full border-2 border-gray-500 border-t-orange-500 border-l-blue-500 border-b-green-400 animate-spin"></div>
            <span className="sticky top-[50%] text-white m-auto inset-0 Z-index">
              Please wait as rehydrate your data...
            </span>
          </div>
        }
        persistor={persistor}
      >
        <SpinnerProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ThemeProvider>
                <AuthProvider>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/devCard" element={<DevCard />} />
                    <Route path="/auth/login" element={<Login />} />
                    <Route
                      path="/auth/signUp/:referredBy?"
                      element={<Register />}
                    />
                    <Route
                      path="/auth/register/:referredBy?"
                      element={<SignupFlow />}
                    />
                    <Route path="pitch" element={<ProposalDocument />} />
                    {/* Protected Routes */}
                    <Route
                      path="/earn"
                      element={
                        <ProtectedRoute>
                          <Earn />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/animate"
                      element={
                        <ProtectedRoute>
                          <PaymentSuccessAnimation />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/services/airtime"
                      element={
                        <ProtectedRoute>
                          <Airtime />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/services/data"
                      element={
                        <ProtectedRoute>
                          <DataPlans />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/services/data-plans"
                      element={
                        <ProtectedRoute>
                          <DataPlans />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/data-pricing"
                      element={
                        <ProtectedRoute>
                          <AdminDataPricing />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/Receipts/:id/:uid"
                      element={
                        <ProtectedRoute>
                          <Receipts />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/services/giftcards"
                      element={
                        <ProtectedRoute>
                          <GiftCards />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/Transactions"
                      element={
                        <ProtectedRoute>
                          <Transactions />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/billhistory"
                      element={
                        <ProtectedRoute>
                          <BillHistory />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/transactionChart"
                      element={
                        <ProtectedRoute>
                          <TransactionChart />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/PaymentConfirmation"
                      element={
                        <ProtectedRoute>
                          <PaymentConfirmation />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/PaymentSuccesful"
                      element={
                        <ProtectedRoute>
                          <PaymentSuccesful />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/services/bills"
                      element={
                        <ProtectedRoute>
                          <Bills />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/services/meals"
                      element={
                        <ProtectedRoute>
                          <Meals />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/services/meals/coupon/:couponId"
                      element={
                        <ProtectedRoute>
                          <MealCouponDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/services/meals/voucher/:voucherId"
                      element={
                        <ProtectedRoute>
                          <MealVoucherTicket />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/services/meals/vouchers"
                      element={
                        <ProtectedRoute>
                          <MyMealVouchers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/services/meals/terminal"
                      element={
                        <MerchantRoute>
                          <MealMerchantTerminal />
                        </MerchantRoute>
                      }
                    />
                    <Route
                      path="/merchant/meals"
                      element={
                        <MerchantRoute>
                          <MealMerchantTerminal />
                        </MerchantRoute>
                      }
                    />

                    <Route
                      path="/referrals"
                      element={
                        <ProtectedRoute>
                          <Referrals />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/withdrawState"
                      element={
                        <ProtectedRoute>
                          <WithdrawalStatePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/settings/DataPreference"
                      element={
                        <ProtectedRoute>
                          <DataPreference />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/wallet"
                      element={
                        <ProtectedRoute>
                          <Wallet />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/Notifications"
                      element={
                        <ProtectedRoute>
                          <NotificationsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/*  <Route path="airtime" element={<Airtime />} /> */}
                    {/* Protected Routes with Dashboard Layout */}
                    {/* Catch-all route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AuthProvider>
              </ThemeProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </SpinnerProvider>
      </PersistGate>
    </Provider>
  </BrowserRouter>
);

createRoot(document.getElementById("root")).render(<App />);

import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
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
import MealMerchantDashboard from "./pages/services/MealMerchantDashboard";
import MerchantLogin from "./pages/auth/MerchantLogin";
import AdminMerchantProvisioning from "./pages/admin/AdminMerchantProvisioning";
import MerchantRoute from "./components/MerchantRoute";
import AdminRoute from "./components/AdminRoute";
import AdminDataPricing from "./pages/admin/AdminDataPricing";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const NumberInputWheelGuard = () => {
  useEffect(() => {
    const handleWheel = () => {
      const el = document.activeElement;
      if (el && el.tagName === "INPUT" && el.type === "number") {
        el.blur();
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: true, capture: true });
    return () => document.removeEventListener("wheel", handleWheel, { capture: true });
  }, []);
  return null;
};

const App = () => (
  <BrowserRouter>
    <NumberInputWheelGuard />
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="pw-card px-6 py-5 flex flex-col items-center gap-3 max-w-xs w-full text-center">
              <div className="w-10 h-10 rounded-full border-2 border-border border-t-brand-500 animate-spin" />
              <span className="text-sm font-medium text-foreground">
                Loading PayWaka...
              </span>
            </div>
          </div>
        }
        persistor={persistor}
      >
        <SpinnerProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <ThemeProvider>
                <Toaster />
                <Sonner />
                <AuthProvider>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/auth/login" element={<Login />} />
                    <Route path="/merchant/login" element={<MerchantLogin />} />
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
                      path="/admin/merchants/provision"
                      element={
                        <AdminRoute>
                          <AdminMerchantProvisioning />
                        </AdminRoute>
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
                      element={<Navigate to="/merchant/terminal" replace />}
                    />
                    <Route
                      path="/merchant/terminal"
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
                          <MealMerchantDashboard />
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

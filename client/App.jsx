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

// Components
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import SpinnerProvider from "@/Components/SpinnerProvider";
import Transactions from "@/Components/Transactions";
import useTransactionFetch from "@/Components/useTransactionFetch";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import Wallet from "./pages/Wallet";
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
                    <Route path="/" element={<Index />} />
                    <Route path="/services/airtime" element={<Airtime />} />
                    <Route path="/feedbackAlert" element={<FeedbackAlert />} />
                    <Route path="/services/data" element={<DataPlans />} />
                    <Route path="/Receipts/:id/:uid" element={<Receipts />} />
                    <Route path="/services/giftcards" element={<GiftCards />} />
                    <Route path="/Transactions" element={<Transactions />} />
                    <Route
                      path="/PaymentConfirmation"
                      element={<PaymentConfirmation />}
                    />
                    <Route
                      path="/PaymentSuccesful"
                      element={<PaymentSuccesful />}
                    />
                    <Route path="/services/bills" element={<Bills />} />
                    <Route path="/services/meals" element={<Meals />} />
                    <Route path="/auth/login" element={<Login />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route
                      path="/settings/DataPreference"
                      element={<DataPreference />}
                    />
                    <Route
                      path="/auth/register/:referredBy?"
                      element={<Register />}
                    />
                    <Route path="/earn" element={<Earn />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route
                      path="/accountDetailsCard"
                      element={<AccountDetailsCard />}
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

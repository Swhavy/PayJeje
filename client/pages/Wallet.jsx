import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDispatch, useSelector } from "react-redux";
import { selectedPrice } from "@/Features/userSlice";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  DollarSign,
  Building2,
  Check,
  Eye,
  EyeOff,
  ChevronsUpDown,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";
import AccountDetailsCard from "@/components/AccountDetailsCard";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { useSpinner } from "@/components/SpinnerProvider";
import { motion, AnimatePresence } from "framer-motion";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { set } from "react-hook-form";
import { useNavigate } from "react-router-dom";

const Wallet = () => {
  const bankz = useSelector((state) => state.user.transactions) || {};
  const { banks = null, bankCode = "" } = bankz;
  const navigate = useNavigate();
  const [hide, setHide] = useState(
    localStorage.getItem("hideBalance") === "true",
  );
  const bankData = banks;
  const { appContext, setAppContext } = useSpinner();
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state?.user?.user) || {};
  const {
    walletBalance,
    bankName,
    accountReference,
    accountNumber: account,
  } = userDetails;
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [accountPopup, setAccountPopup] = useState(false);
  const { fetchBanks, withdraw } = useCloudfunc();
  const [spin, setSpin] = useState(false);
  const [accountDetails, setAccountDetails] = useState({
    accountNumber: "",
    amount: "",
  });
  const [accountName, setAccountName] = useState(null);

  const visibility = () => {
    setHide(!hide);
    localStorage.setItem("hideBalance", !hide);
  };

  const handleInput = (e) => {
    if (
      e.target.name === "amount" &&
      (e.target.value === "" || Number(e.target.value) >= 0)
    ) {
      setAccountDetails((prev) => ({
        ...prev,
        [e.target.name]: e.target.value,
      }));
    } else {
      setAccountDetails((prev) => ({
        ...prev,
        [e.target.name]: e.target.value,
      }));
    }
  };

  const confirmAccountDetails = httpsCallable(
    functions,
    "confirmAccountDetails",
  );

  // Mock transaction data
  const transactions = [
    {
      id: 1,
      type: "credit",
      description: "Referral bonus",
      amount: 2500,
      date: "2024-01-15",
      time: "14:30",
      status: "completed",
    },
    {
      id: 2,
      type: "debit",
      description: "Airtime purchase - MTN",
      amount: 1000,
      date: "2024-01-15",
      time: "12:15",
      status: "completed",
    },
    {
      id: 3,
      type: "credit",
      description: "Task completion",
      amount: 500,
      date: "2024-01-14",
      time: "16:45",
      status: "completed",
    },
    {
      id: 4,
      type: "debit",
      description: "Bill payment - EKEDC",
      amount: 5000,
      date: "2024-01-14",
      time: "09:20",
      status: "completed",
    },
  ];

  const totalBalance = walletBalance;
  const totalEarned = user?.monthlyEarnings
    ? user.monthlyEarnings * 3.6
    : 45000; // Simulated total earned
  const totalSpent = 32500;
  const pending = 0;

  useEffect(() => {
    if (search !== "") {
      setOpen(true);
    }
  }, [search]);

  const handleSelect = async (bank) => {
    setSpin(true);
    setIsChecked(false);
    setAccountName(null);
    setSelectedValue(bank.name);
    setSelectedBank(bank);
    setOpen(false);
    console.log("Selected Bank:", bank);
    console.log("Bank Code:", bank.code);
    dispatch(selectedPrice({ bankCode: bank.code }));
    await confirmAccountDetails({
      account_number: accountDetails.accountNumber,
      account_bank: bank.code,
    })
      .then((result) => {
        setSpin(false);
        console.log("Account details confirmed:", result);
        setIsChecked(true);
        setAccountName(result.data.account_name);
      })
      .catch((error) => {
        setSpin(false);
        setAccountName(null);
        setIsChecked(false);
        toast.error("Couldn't verify the account, please verify the account ");
        console.error("Error confirming account details:", error);
      });
  };

  // Function to handle fund withdrawal
  const withdrawFunds = async () => {
    const numericAmount = Number(accountDetails.amount);

    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }

    if (numericAmount > walletBalance) {
      toast.error("Insufficient funds");
      return;
    }

    setAppContext((prev) => ({ ...prev, spinner: true }));

    try {
      const transfer = await withdraw({
        account_bank: bankCode,
        account_number: accountDetails.accountNumber,
        amount: numericAmount,
        debit_subaccount: accountReference,
        narration: `Withdrawal to ${selectedValue} - ${accountDetails.accountNumber}`,
      });

      console.log("Withdrawal response:", transfer);

      if (transfer.data.status === "success") {
        toast.success(transfer.data.message);
        navigate("/withdrawState", {
          state: {
            amount: numericAmount,
            bankName: selectedValue,
            accountNumber: accountDetails.accountNumber,
            accountHolder: accountName ?? null,
            reference: transfer.data.reference, // needed for the listener
          },
        });
      } else {
        toast.error(transfer.data.message);
        console.log("details: ", transfer);
      }
    } catch (err) {
      console.error("Withdrawal failed:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAppContext((prev) => ({ ...prev, spinner: false }));
    }
  };

  const handleFetchBanks = async () => {
    console.log("Fetching banks...");
    console.log("Current bank data:", bankData);
    if (bankData === null) {
      setAppContext({ ...appContext, spinner: true });
      const response = await fetchBanks();
      if (response.data.status === "success") {
        let bankDetails = response.data.bankDetails;
        console.log("Fetched Banks successfully:");
        dispatch(selectedPrice({ banks: bankDetails }));
        setAppContext({ ...appContext, spinner: false });
      } else {
        setAppContext({ ...appContext, spinner: false });
        toast.error("An error occurred. Please try again.");
        console.error("Error fetching banks:", response.data.message);
      }
    }
  };

  // Safe parsing helper to guarantee no null or NaN values are displayed to users
  const formatAmount = (val) => {
    if (val === null || val === undefined) return "0";
    if (typeof val === "string") {
      if (val.includes(",")) return val;
      const num = parseFloat(val);
      return isNaN(num) ? "0" : num.toLocaleString();
    }
    return typeof val === "number" ? val.toLocaleString() : "0";
  };

  const currentBalNum =
    parseFloat(String(totalBalance || "0").replace(/,/g, "")) || 0;
  const availableBal = Math.max(0, currentBalNum - pending);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Wallet
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Manage your earnings and transactions
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setAccountPopup(true)}
              className="flex-1 sm:flex-none bg-paywaka-500 hover:bg-paywaka-600 text-white font-bold"
            >
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              Add Funds
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-zinc-800 text-zinc-300 hover:text-white"
            >
              <Download className="h-4 w-4 mr-2 shrink-0" />
              Export
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-[#0c2217] via-[#05110b] to-[#010604] border border-green-500/25 text-white shadow-2xl relative overflow-hidden rounded-3xl">
          {/* Subtle elegant backdrop ambient glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

          <CardContent className="p-5 sm:p-7 relative">
            {/* Main row: Total Balance + Available */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-6 pb-6 border-b border-green-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-2xl shrink-0 border border-green-500/20 text-green-400">
                  <WalletIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-zinc-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
                    Total Balance
                  </p>
                  <div className="flex flex-row-reverse items-center gap-4">
                    {" "}
                    {hide ? (
                      <EyeOff className="h-5 w-5" onClick={visibility} />
                    ) : (
                      <Eye
                        className="h-5 w-5 text-green-500"
                        onClick={visibility}
                      />
                    )}
                    <h2
                      className={`text-3xl sm:text-4xl font-black font-display ${hide ? "blur-md" : ""} tracking-tight mt-1 text-white`}
                      onClick={visibility}
                    >
                      ₦{formatAmount(totalBalance)}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:flex-col sm:items-end bg-zinc-900/40 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-zinc-800/60 sm:border-0">
                <p className="text-zinc-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider px-2 sm:px-0">
                  Available Balance
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold font-display ${hide ? "blur-md" : ""} text-green-400 tracking-tight mt-1 px-2 sm:px-0`}
                  onClick={visibility}
                >
                  ₦{formatAmount(availableBal)}
                </p>
              </div>
            </div>

            {/* Sub stats: Total Earned, Total Spent, Pending */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
              {/* Total Earned */}
              <div className="flex items-center gap-3.5 bg-zinc-950/45 border border-zinc-900/80 p-3.5 rounded-2xl min-w-0 hover:bg-zinc-900/20 transition-colors duration-200">
                <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 shrink-0">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-zinc-400 text-[10px] sm:text-[11px] font-semibold block uppercase tracking-wider">
                    Total Earned
                  </span>
                  <p
                    className={`font-bold text-base sm:text-lg font-display text-white tracking-tight mt-0.5 truncate ${hide ? "blur-md" : ""}`}
                  >
                    ₦{formatAmount(totalEarned)}
                  </p>
                </div>
              </div>

              {/* Total Spent */}
              <div className="flex items-center gap-3.5 bg-zinc-950/45 border border-zinc-900/80 p-3.5 rounded-2xl min-w-0 hover:bg-zinc-900/20 transition-colors duration-200">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 shrink-0">
                  <TrendingDown className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-zinc-400 text-[10px] sm:text-[11px] font-semibold block uppercase tracking-wider">
                    Total Spent
                  </span>
                  <p
                    className={`font-bold text-base sm:text-lg font-display text-white tracking-tight mt-0.5 truncate ${hide ? "blur-md" : ""}`}
                  >
                    ₦{formatAmount(totalSpent)}
                  </p>
                </div>
              </div>

              {/* Pending */}
              <div className="flex items-center gap-3.5 bg-zinc-950/45 border border-zinc-900/80 p-3.5 rounded-2xl min-w-0 hover:bg-zinc-900/20 transition-colors duration-200">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-zinc-400 text-[10px] sm:text-[11px] font-semibold block uppercase tracking-wider">
                    Pending
                  </span>
                  <p
                    className={`font-bold text-base sm:text-lg font-display text-white tracking-tight mt-0.5 truncate ${hide ? "blur-md" : ""}`}
                  >
                    ₦{formatAmount(pending)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 bg-zinc-950/40 p-1 border border-zinc-900 rounded-2xl">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="withdraw"
              className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400"
              onClick={() => handleFetchBanks()}
            >
              Withdraw
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card
                onClick={() => setAccountPopup(true)}
                className="p-5 cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-blue-400 shrink-0">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      Add Money
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Top up your wallet
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center text-xs font-bold text-white tracking-wider uppercase">
                  Coming Soon
                </div>
                <div className="flex items-center gap-4 opacity-40">
                  <div className="p-3 bg-green-500/10 border border-green-500/25 rounded-2xl text-green-400 shrink-0">
                    <ArrowUpRight className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      Send Money
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Transfer to friends
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                onClick={() => {
                  setActiveTab("withdraw");
                  handleFetchBanks();
                }}
                className="p-5 cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/[0.02] transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl text-purple-400 shrink-0">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      Withdraw
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Cash out to bank
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-950/20">
              <CardContent className="p-5 sm:p-6">
                <h3 className="text-lg font-bold text-white tracking-tight mb-4">
                  Withdraw Funds
                </h3>
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">
                        ₦
                      </span>
                      <Input
                        id="amount"
                        min="0"
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e" || e.key === "+")
                            e.preventDefault();
                        }} // Prevents negative and exponential input
                        name="amount"
                        onWheel={(e) => e.target.blur()} // Prevents number input scroll
                        value={accountDetails.amount}
                        onChange={handleInput}
                        type="number"
                        placeholder="Enter amount to withdraw"
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5">
                      Available:{" "}
                      <span className="text-green-400 font-semibold">
                        ₦{formatAmount(availableBal)}
                      </span>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <div className="mt-1.5">
                      <Input
                        id="accountNumber"
                        onWheel={(e) => e.target.blur()} // Prevents number input scroll
                        name="accountNumber"
                        value={accountDetails.accountNumber}
                        onChange={handleInput}
                        type="number"
                        placeholder="Enter Account Number to withdraw to"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="w-full space-y-2">
                      <Label htmlFor="bank">Select Your Bank</Label>
                      <div className="mt-1.5">
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              id="bank"
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full h-12 justify-between text-sm sm:text-base border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Building2 className="h-4 w-4 text-zinc-500 shrink-0" />
                                <span
                                  className={cn(
                                    "truncate",
                                    !selectedValue && "text-zinc-500",
                                  )}
                                >
                                  {selectedValue || "Select your bank"}
                                </span>
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-zinc-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-full p-0 bg-zinc-950 border-zinc-800"
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                placeholder="Search bank..."
                                className="h-12 text-sm sm:text-base border-b border-zinc-800"
                              />
                              <CommandEmpty>No bank found.</CommandEmpty>
                              <CommandGroup className="max-h-[220px] overflow-auto">
                                {bankData && bankData.length > 0 ? (
                                  bankData.map((bank) => (
                                    <CommandItem
                                      key={bank.id}
                                      value={bank.name}
                                      onSelect={() => handleSelect(bank)}
                                      className={cn(
                                        "text-zinc-300 hover:text-white hover:bg-zinc-900/60 cursor-pointer text-xs sm:text-sm p-3 rounded-lg flex items-center justify-between",
                                        selectedValue === bank.name &&
                                          "bg-zinc-900 text-white font-bold",
                                      )}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Check
                                          className={cn(
                                            "h-4 w-4 text-green-400 shrink-0",
                                            selectedValue === bank.name
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        <span className="truncate">
                                          {bank.name}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                                        {bank.code}
                                      </span>
                                    </CommandItem>
                                  ))
                                ) : (
                                  <div className="p-3 text-center text-xs text-zinc-500">
                                    No banks available. Tap "Withdraw" tab to
                                    reload.
                                  </div>
                                )}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {selectedBank && (
                      <div
                        className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 mt-4 space-y-1 animate-in fade-in duration-200"
                        onClick={() => setIsChecked(!isChecked)}
                      >
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          Selected Bank Details:
                        </p>
                        <p className="text-sm font-semibold text-white">
                          Name:{" "}
                          <span className="text-zinc-300 font-normal">
                            {selectedBank.name}
                          </span>
                        </p>
                        <p className="text-sm font-semibold text-white">
                          Code:{" "}
                          <span className="text-zinc-400 font-mono font-normal">
                            {selectedBank.code}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {spin ? (
                      <div className="flex w-full items-center justify-center py-4">
                        <div className="w-20 h-20 border-2 rounded-full border-green-500 border-t-transparent animate-spin" />
                      </div>
                    ) : (
                      isChecked &&
                      accountName && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <motion.div
                            initial={{ y: -8, scale: 0.98 }}
                            animate={{ y: 0, scale: 1 }}
                            exit={{ y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full h-28 bg-green-400/50 rounded-lg flex flex-col justify-center items-center"
                          >
                            <span className="text-sm text-zinc-200 font-medium p-3 block">
                              Note: Withdrawals are processed within 24 hours.
                              Ensure your account details are correct to avoid
                              delays.
                            </span>
                            <div className="flex items-center justify-center gap-1 bg-green-500/20 border text-white border-green-500/90 rounded-full p-1 mr-2">
                              <Check className="h-5 w-5 text-green-500" />
                              <span className="font-extralight text-zinc-200">
                                {" "}
                                Account Name:{" "}
                              </span>{" "}
                              <span className="font-bold">{accountName}</span>
                            </div>
                          </motion.div>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>

                  <Button
                    onClick={withdrawFunds}
                    disabled={
                      !accountDetails.accountNumber ||
                      !accountDetails.amount ||
                      !accountName ||
                      !isChecked ||
                      !selectedValue
                    }
                    className={`w-full ${walletBalance > accountDetails.amount ? "bg-paywaka-800 hover:bg-paywaka-600" : "bg-red-700 hover:bg-red-500 cursor-not-allowed"} disabled:cursor-not-allowed text-white font-bold h-12`}
                  >
                    {walletBalance > accountDetails.amount
                      ? "Withdraw Funds"
                      : "Insufficient Funds"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-950/20">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Transaction History
                  </h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Search transactions..."
                        className="pl-9 h-10 text-xs w-full sm:w-64 border-zinc-800"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs border-zinc-800 text-zinc-300"
                    >
                      Filter
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-2xl border border-zinc-900 bg-zinc-950/30 hover:bg-zinc-950/60 transition-colors"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div
                          className={cn(
                            "p-2.5 rounded-xl shrink-0 border",
                            transaction.type === "credit"
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-red-500/10 border-red-500/20 text-red-400",
                          )}
                        >
                          {transaction.type === "credit" ? (
                            <ArrowDownLeft className="h-4.5 w-4.5" />
                          ) : (
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-white truncate">
                            {transaction.description}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {transaction.date} • {transaction.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            "font-bold text-xs sm:text-sm",
                            transaction.type === "credit"
                              ? "text-green-400"
                              : "text-red-400",
                          )}
                        >
                          {transaction.type === "credit" ? "+" : "-"}₦
                          {transaction.amount.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-green-500 font-bold bg-green-500/5 border border-green-500/10 px-1.5 py-0.5 rounded-md mt-1 uppercase tracking-wider inline-block">
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {accountPopup && (
          <AccountDetailsCard
            accountNumber={account || "0000000000"}
            bankName={bankName || "Your Bank"}
            open={accountPopup}
            isClose={() => setAccountPopup(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Wallet;

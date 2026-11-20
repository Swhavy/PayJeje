import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StateView from "@/components/ui/StateView";
import {
  ReceiptCopyButton,
  ReceiptRow,
  ReceiptRows,
  ReceiptStatusPill,
  ReceiptStrip,
} from "@/components/receipts/ReceiptParts";
import { useDispatch, useSelector } from "react-redux";
import { selectedPrice } from "@/Features/userSlice";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
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
  Send,
  UserCheck,
  Loader2,
  Sparkles,
  ArrowRightLeft,
  Receipt,
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
import FormattedAmountInput from "@/components/ui/FormattedAmountInput";
import WithdrawalConfirmationModal from "@/components/withdrawalModal";
import TransactionPinModal from "@/components/TransactionPinModal";
import TransactionsModal from "@/components/TransactionsModal";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { useSpinner } from "@/components/SpinnerProvider";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "@/firebaseConfig";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  formatTransactionDate,
  getTransactionDisplayTitle,
  getTransactionReference,
  getTransactionStatusInfo,
  isInboundTransaction,
} from "@/lib/receiptUtils";
import { formatNaira, formatPlanPrice, formatSignedNaira } from "@/lib/format";

const Wallet = () => {
  const bankz = useSelector((state) => state.user.transactions) || {};
  const { banks = null, bankCode = "" } = bankz;
  const navigate = useNavigate();
  const [hide, setHide] = useState(
    localStorage.getItem("hideBalance") === "true",
  );
  const bankData = banks;
  const { setAppContext } = useSpinner();
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state?.user?.user) || {};
  const {
    walletBalance,
    cashbackBalance = 0,
    bankName,
    accountReference,
    accountNumber: account,
  } = userDetails;
  const { user } = useAuth();
  const [search] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [accountPopup, setAccountPopup] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const {
    fetchBanks,
    withdraw,
    resolvePaywakaRecipient,
    transferPaywakaP2P,
    transferCashbackToWallet,
  } = useCloudfunc();
  const [cashbackTransferAmount, setCashbackTransferAmount] = useState("");
  const [isCashbackPinModalOpen, setIsCashbackPinModalOpen] = useState(false);
  const [isTransferringCashback, setIsTransferringCashback] = useState(false);
  const [spin, setSpin] = useState(false);
  const [accountDetails, setAccountDetails] = useState({
    accountNumber: "",
    amount: "",
  });
  const [accountName, setAccountName] = useState(null);

  const [withdrawalMode, setWithdrawalMode] = useState("bank");
  const [p2pDetails, setP2pDetails] = useState({
    recipientIdentifier: "",
    resolvedRecipient: null,
    isResolving: false,
    narration: "",
  });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTxForModal, setSelectedTxForModal] = useState(null);
  const [, setIsExecutingTransfer] = useState(false);

  const [realTransactions, setRealTransactions] = useState([]);
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "users", user.uid, "Transactions"),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setRealTransactions(list);
      },
      (err) => {
        console.warn("Transactions real-time listener notice:", err);
      },
    );
    return () => unsub();
  }, [user?.uid]);

  const toggleBalanceVisibility = () => {
    const next = !hide;
    setHide(next);
    localStorage.setItem("hideBalance", String(next));
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    if (name === "accountNumber") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setAccountDetails((prev) => ({ ...prev, accountNumber: digits }));
      setIsChecked(false);
      setAccountName(null);
      return;
    }
    setAccountDetails((prev) => ({ ...prev, [name]: value }));
  };

  const confirmAccountDetails = httpsCallable(functions, "confirmAccountDetails");

  const totalBalance = Number(walletBalance || 0);
  const totalEarned = userDetails?.monthlyEarnings
    ? userDetails.monthlyEarnings * 3.6
    : 45000;
  const totalSpent = 32500;
  const pending = 0;

  useEffect(() => {
    if (search !== "") {
      setOpen(true);
    }
  }, [search]);

  useEffect(() => {
    if (!bankData || !Array.isArray(bankData) || bankData.length === 0) {
      handleFetchBanks();
    }
  }, []);

  const handleSelect = async (bank) => {
    setSpin(true);
    setIsChecked(false);
    setAccountName(null);
    setSelectedValue(bank.name);
    setOpen(false);
    dispatch(selectedPrice({ bankCode: bank.code }));
    await confirmAccountDetails({
      account_number: accountDetails.accountNumber,
      account_bank: bank.code,
    })
      .then((result) => {
        setSpin(false);
        setIsChecked(true);
        setAccountName(result.data.account_name);
      })
      .catch((error) => {
        setSpin(false);
        setAccountName(null);
        setIsChecked(false);
        toast.error("Couldn't verify the account, please check account number.");
        console.error("Error confirming account details:", error);
      });
  };

  const handleResolveRecipient = async () => {
    const identifier = p2pDetails.recipientIdentifier.trim();
    if (!identifier) {
      return toast.error("Please enter recipient's Barter ID, username, or phone number.");
    }
    setP2pDetails((p) => ({ ...p, isResolving: true, resolvedRecipient: null }));
    try {
      const res = await resolvePaywakaRecipient({ identifier });
      const isSuccess = res?.success || res?.status === "success";
      if (isSuccess && res.recipient) {
        setP2pDetails((p) => ({ ...p, isResolving: false, resolvedRecipient: res.recipient }));
        const recipientName =
          res.recipient.fullName ||
          `${res.recipient.firstName || ""} ${res.recipient.lastName || ""}`.trim() ||
          res.recipient.userName ||
          "PayWaka User";
        toast.success(`Recipient verified: ${recipientName}`);
      } else {
        setP2pDetails((p) => ({ ...p, isResolving: false, resolvedRecipient: null }));
        toast.error(res?.message || "PayWaka recipient not found. Please check Barter ID or username.");
      }
    } catch (err) {
      console.error("Recipient resolution error:", err);
      setP2pDetails((p) => ({ ...p, isResolving: false, resolvedRecipient: null }));
      const friendlyMsg = err?.message?.includes("internal")
        ? "Unable to verify recipient right now. Please check the Barter ID or try again shortly."
        : err.message || "Failed to resolve recipient.";
      toast.error(friendlyMsg);
    }
  };

  const numericAmount = Number(accountDetails.amount) || 0;
  const isP2PTransfer = withdrawalMode === "p2p";
  const transferFee = isP2PTransfer
    ? 0
    : numericAmount <= 5000
      ? 10
      : numericAmount <= 50000
        ? 25
        : 50;
  const totalDeduction = numericAmount + transferFee;

  const handleStartTransferFlow = () => {
    if (!numericAmount || numericAmount <= 0) {
      return toast.error("Please enter a valid amount greater than ₦0.");
    }
    if (numericAmount < 100) {
      return toast.error("Minimum transfer amount is ₦100.");
    }
    if (totalDeduction > (walletBalance || 0)) {
      return toast.error(
        `Insufficient balance. Total deduction including fee is ${formatNaira(totalDeduction)}. You have ${formatNaira(walletBalance || 0)}.`,
      );
    }

    if (withdrawalMode === "bank") {
      if (!accountDetails.accountNumber || !selectedValue || !accountName) {
        return toast.error("Please select a bank and verify account number before continuing.");
      }
    } else {
      if (!p2pDetails.resolvedRecipient) {
        return toast.error("Please enter and verify the PayWaka recipient before continuing.");
      }
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmModalProceed = () => {
    setIsConfirmModalOpen(false);
    setIsPinModalOpen(true);
  };

  const handleExecuteTransfer = async (pin) => {
    setIsExecutingTransfer(true);
    setAppContext((prev) => ({ ...prev, spinner: true }));

    const senderFullName =
      `${userDetails.firstName || ""} ${userDetails.lastName || ""}`.trim() ||
      userDetails.userName ||
      "PayWaka User";

    try {
      if (withdrawalMode === "bank") {
        const res = await withdraw({
          account_bank: bankCode,
          account_number: accountDetails.accountNumber,
          bankName: selectedValue,
          accountHolder: accountName,
          amount: numericAmount,
          debit_subaccount: accountReference,
          narration: `Withdrawal to ${selectedValue} - ${accountDetails.accountNumber}`,
          pin,
        });

        const resData = res?.data || res || {};
        if (resData?.status === "success" || resData?.status === "pending") {
          toast.success(resData.message || "Transfer Queued Successfully");
          setIsPinModalOpen(false);
          navigate("/withdrawState", {
            state: {
              amount: numericAmount,
              fee: transferFee,
              bankName: selectedValue,
              accountNumber: accountDetails.accountNumber,
              accountHolder: accountName,
              senderName: senderFullName,
              reference: resData.reference,
              narration: resData.narration || resData.reference,
              gatewayStatus: resData.gatewayStatus || "PENDING",
              isP2P: false,
            },
          });
        } else {
          toast.error(resData?.message || "Transfer failed");
        }
      } else {
        const userP2PNarration = String(p2pDetails.narration || "").trim();
        const resolvedRecipient = p2pDetails.resolvedRecipient || {};
        const resolvedName =
          resolvedRecipient.fullName ||
          `${resolvedRecipient.firstName || ""} ${resolvedRecipient.lastName || ""}`.trim() ||
          resolvedRecipient.userName ||
          "PayWaka User";

        const res = await transferPaywakaP2P({
          recipientBarterId: resolvedRecipient.barter_id,
          recipientUid: resolvedRecipient.uid,
          amount: numericAmount,
          narration: userP2PNarration,
          pin,
        });

        const resData = res?.data || res || {};
        if (resData?.status === "success") {
          toast.success("P2P Transfer Completed Successfully!");
          setIsPinModalOpen(false);
          navigate("/withdrawState", {
            state: {
              amount: numericAmount,
              fee: 0,
              bankName: "PayWaka Wallet",
              accountNumber: resolvedRecipient.barter_id,
              accountHolder: resData.recipientName || resolvedName,
              recipientUserName: resData.recipientUserName || resolvedRecipient.userName || "",
              senderName: resData.senderName || senderFullName,
              reference: resData.reference,
              narration: resData.narration || userP2PNarration || resData.reference,
              gatewayStatus: "SUCCESSFUL",
              isP2P: true,
            },
          });
        } else {
          toast.error(resData?.message || "P2P Transfer failed");
        }
      }
    } catch (err) {
      console.error("Transfer execution error:", err);
      toast.error(err.message || "Transfer could not be processed. Please try again.");
    } finally {
      setIsExecutingTransfer(false);
      setAppContext((prev) => ({ ...prev, spinner: false }));
    }
  };

  const handleFetchBanks = async () => {
    if (!bankData || !Array.isArray(bankData) || bankData.length === 0) {
      try {
        const response = await fetchBanks();
        const banksList = response?.data?.bankDetails || response?.bankDetails;
        if (Array.isArray(banksList) && banksList.length > 0) {
          dispatch(selectedPrice({ banks: banksList }));
        }
      } catch (err) {
        console.error("handleFetchBanks error:", err);
      }
    }
  };

  const availableBal = Math.max(0, totalBalance - pending);

  const filteredHistory = realTransactions.filter((tx) => {
    if (!historySearch.trim()) return true;
    const queryStr = historySearch.toLowerCase();
    return (
      getTransactionDisplayTitle(tx).toLowerCase().includes(queryStr) ||
      String(tx.narration || "").toLowerCase().includes(queryStr) ||
      String(tx.senderName || "").toLowerCase().includes(queryStr) ||
      String(tx.recipientName || "").toLowerCase().includes(queryStr) ||
      String(tx.sessionId || "").toLowerCase().includes(queryStr) ||
      String(tx.reference || tx.tx_ref || "").toLowerCase().includes(queryStr) ||
      String(tx.category || "").toLowerCase().includes(queryStr) ||
      String(tx.bankName || "").toLowerCase().includes(queryStr)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Unified Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="pw-page-title">My Wallet</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage your balance, virtual account, and transfers.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setAccountPopup(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Funds</span>
          </Button>
        </div>

        {/* Sticky Frosted Glass Segmented Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-5"
        >
          <div className="sticky top-14 z-20 bg-background/75 backdrop-blur-xl py-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="pw-segmented grid w-full max-w-md grid-cols-3 h-auto">
              <TabsTrigger
                value="overview"
                className="min-h-9 rounded-pill text-xs sm:text-sm font-semibold data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                onClick={() => handleFetchBanks()}
                className="min-h-9 rounded-pill text-xs sm:text-sm font-semibold data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm"
              >
                Withdraw
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="min-h-9 rounded-pill text-xs sm:text-sm font-semibold data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm"
              >
                History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-5 mt-0">
            {/* Balance Card — Reference Image 1 Flagship Obsidian-Emerald & Pearl Glass Stack */}
            <div className="pw-glass-hero p-4 sm:p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="pw-tile h-11 w-11 rounded-2xl">
                    <WalletIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="pw-label">TOTAL BALANCE</span>
                      <button
                        type="button"
                        onClick={toggleBalanceVisibility}
                        aria-label={hide ? "Show balance" : "Hide balance"}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-pill hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <h2 className="pw-num text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                      {hide ? "₦••••••" : formatNaira(totalBalance)}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="pw-panel px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="pw-label">AVAILABLE BALANCE</span>
                <p className="pw-num text-base sm:text-lg font-extrabold text-brand-400">
                  {hide ? "₦••••••" : formatNaira(availableBal)}
                </p>
              </div>

              <div className="border-t border-border/60 pt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="pw-panel p-3 flex items-center gap-3 min-w-0">
                  <div className="pw-tile h-9 w-9">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="pw-label block truncate">TOTAL EARNED</span>
                    <p className="pw-num text-[15px] sm:text-base font-extrabold text-foreground truncate mt-0.5">
                      {hide ? "₦••••" : formatNaira(totalEarned)}
                    </p>
                  </div>
                </div>

                <div className="pw-panel p-3 flex items-center gap-3 min-w-0">
                  <div className="pw-tile-ruby h-9 w-9">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="pw-label block truncate">TOTAL SPENT</span>
                    <p className="pw-num text-[15px] sm:text-base font-extrabold text-foreground truncate mt-0.5">
                      {hide ? "₦••••" : formatNaira(totalSpent)}
                    </p>
                  </div>
                </div>

                <div className="pw-panel p-3 flex items-center gap-3 min-w-0">
                  <div className="pw-tile-gold h-9 w-9">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="pw-label block truncate">PENDING</span>
                    <p className="pw-num text-[15px] sm:text-base font-extrabold text-foreground truncate mt-0.5">
                      {hide ? "₦••••" : formatNaira(pending)}
                    </p>
                  </div>
                </div>

                <div className="pw-panel p-3 flex items-center gap-3 min-w-0 border-brand-400/25 bg-brand-tint/75">
                  <div className="pw-tile h-9 w-9">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="pw-label text-brand-400 block truncate">CASHBACK</span>
                    <p className="pw-num text-[15px] sm:text-base font-extrabold text-brand-400 truncate mt-0.5">
                      {hide ? "₦••••" : formatNaira(cashbackBalance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Virtual Bank Account Card */}
            <div className="pw-glass-hero p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <span className="pw-chip-brand">
                  <Building2 className="h-3 w-3" />
                  Dedicated Virtual Account
                </span>
                <h3 className="text-section-title text-foreground">
                  {bankName || "PayWaka Virtual Bank"}
                </h3>
                <p className="text-caption text-muted-foreground">
                  Transfer from any bank app or USSD to credit your wallet in real time.
                </p>
              </div>

              <div className="pw-panel p-3 flex items-center justify-between gap-3 shrink-0">
                <div>
                  <span className="pw-label block">ACCOUNT NUMBER</span>
                  <span className="pw-code text-base sm:text-lg font-black text-foreground tracking-wider block mt-0.5">
                    {account || "••••••••••"}
                  </span>
                  {accountReference && (
                    <span className="pw-code text-[11px] text-muted-foreground block mt-0.5">
                      Ref: {accountReference}
                    </span>
                  )}
                </div>
                {account && (
                  <ReceiptCopyButton value={account} label="Account Number" />
                )}
              </div>
            </div>

            {/* Quick Actions (Brand + Neutral only) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAccountPopup(true)}
                className="pw-card pw-pressable p-4 text-left flex items-center gap-3.5 hover:border-brand-400/50"
              >
                <div className="pw-tile h-11 w-11">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Add Money</h3>
                  <p className="text-caption text-muted-foreground">
                    Top up via bank transfer
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("withdraw");
                  setWithdrawalMode("p2p");
                }}
                className="pw-card pw-pressable p-4 text-left flex items-center gap-3.5 hover:border-brand-400/50"
              >
                <div className="pw-tile h-11 w-11">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Send P2P</h3>
                  <p className="text-caption text-muted-foreground">
                    Instant PayWaka · ₦0 fee
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("withdraw");
                  setWithdrawalMode("bank");
                  handleFetchBanks();
                }}
                className="pw-card pw-pressable p-4 text-left flex items-center gap-3.5 hover:border-brand-400/50"
              >
                <div className="pw-tile-neutral h-11 w-11">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Withdraw</h3>
                  <p className="text-caption text-muted-foreground">
                    Cash out to bank account
                  </p>
                </div>
              </button>
            </div>

            {/* Cashback Vault Transfer Card */}
            <Card>
              <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <span className="pw-label text-brand-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    CASHBACK VAULT
                  </span>
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="pw-num text-xl font-black text-foreground">
                      {formatNaira(cashbackBalance)}
                    </h3>
                    <span className="text-caption text-muted-foreground">
                      {Number(cashbackBalance || 0) >= 1000 ? "Transfer ready" : "Min ₦1,000 to transfer"}
                    </span>
                  </div>
                  <p className="text-caption text-muted-foreground leading-relaxed max-w-xl">
                    Spend cashback anytime at checkout or transfer whole Naira into your Main Wallet once you reach{" "}
                    <strong className="text-foreground pw-num">₦1,000</strong>.
                  </p>
                  <div className="pt-1 max-w-md space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-muted-foreground pw-num">
                      <span>Threshold</span>
                      <span>
                        {formatPlanPrice(Math.min(1000, Math.floor(Number(cashbackBalance || 0))))} / ₦1,000
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-pill bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-pill bg-brand-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (Number(cashbackBalance || 0) / 1000) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={`Max ${formatPlanPrice(Math.floor(Number(cashbackBalance || 0)))}`}
                    value={cashbackTransferAmount}
                    onChange={(e) => setCashbackTransferAmount(e.target.value.replace(/[^\d]/g, ""))}
                    disabled={Number(cashbackBalance || 0) < 1000 || isTransferringCashback}
                    className="sm:w-36 pw-num"
                  />
                  <Button
                    type="button"
                    disabled={Number(cashbackBalance || 0) < 1000 || isTransferringCashback}
                    onClick={() => {
                      const maxWhole = Math.floor(Number(cashbackBalance || 0));
                      const reqAmt = cashbackTransferAmount
                        ? Number(cashbackTransferAmount)
                        : maxWhole;
                      if (!reqAmt || reqAmt < 1000 || reqAmt % 1 !== 0) {
                        return toast.warning("Enter a whole Naira amount of at least ₦1,000.");
                      }
                      if (reqAmt > maxWhole) {
                        return toast.warning(
                          `Amount exceeds your spendable whole-Naira cashback (${formatPlanPrice(maxWhole)}).`,
                        );
                      }
                      if (!cashbackTransferAmount) {
                        setCashbackTransferAmount(String(maxWhole));
                      }
                      setIsCashbackPinModalOpen(true);
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span>Move to Wallet</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WITHDRAW TAB (2-col on desktop: 560px form left, sticky fee summary right) */}
          <TabsContent value="withdraw" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-5 items-start">
              <Card>
                <CardHeader>
                  <CardTitle>Transfer & Withdraw</CardTitle>
                  <CardDescription>
                    Send funds to any Nigerian bank or another PayWaka user
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="pw-segmented grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawalMode("bank")}
                      className={cn(
                        "min-h-9 rounded-pill text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5",
                        withdrawalMode === "bank"
                          ? "bg-card text-foreground shadow-sm border border-border/80"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Bank Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawalMode("p2p")}
                      className={cn(
                        "min-h-9 rounded-pill text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5",
                        withdrawalMode === "p2p"
                          ? "bg-card text-brand-400 shadow-sm border border-brand-400/30"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>PayWaka P2P</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="withdrawal-amount" className="pw-label block">
                      Transfer Amount
                    </Label>
                    <FormattedAmountInput
                      id="withdrawal-amount"
                      name="amount"
                      value={accountDetails.amount}
                      onChange={(cleanVal) =>
                        setAccountDetails((prev) => ({ ...prev, amount: cleanVal }))
                      }
                      placeholder="Enter amount (min 100)"
                    />
                    <div className="flex justify-between items-center text-caption pt-1 text-muted-foreground">
                      <span>Available Balance</span>
                      <span className="pw-num font-bold text-brand-400">
                        {formatNaira(availableBal)}
                      </span>
                    </div>
                  </div>

                  {withdrawalMode === "bank" ? (
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="accountNumber" className="pw-label block">
                          Destination Account Number
                        </Label>
                        <Input
                          id="accountNumber"
                          name="accountNumber"
                          value={accountDetails.accountNumber}
                          onChange={handleInput}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="10-digit account number"
                          className="pw-code text-[13px] sm:text-sm h-11"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="bank" className="pw-label block">
                          Destination Bank
                        </Label>
                        <Popover
                          open={open}
                          onOpenChange={(isOpen) => {
                            setOpen(isOpen);
                            if (isOpen && (!bankData || !Array.isArray(bankData) || bankData.length === 0)) {
                              handleFetchBanks();
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              id="bank"
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full h-11 justify-between font-normal text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className={cn("truncate", !selectedValue && "text-muted-foreground")}>
                                  {selectedValue || "Select destination bank"}
                                </span>
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border" align="start">
                            <Command>
                              <CommandInput placeholder="Search bank..." className="h-10 text-sm" />
                              <CommandEmpty>No bank found.</CommandEmpty>
                              <CommandGroup className="max-h-[220px] overflow-auto">
                                {bankData && bankData.length > 0 ? (
                                  bankData.map((bank) => (
                                    <CommandItem
                                      key={bank.id || bank.code}
                                      value={bank.name}
                                      onSelect={() => handleSelect(bank)}
                                      className="text-foreground hover:bg-muted cursor-pointer text-sm p-2.5 flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Check
                                          className={cn(
                                            "h-4 w-4 text-brand-400 shrink-0",
                                            selectedValue === bank.name ? "opacity-100" : "opacity-0",
                                          )}
                                        />
                                        <span className="truncate">{bank.name}</span>
                                      </div>
                                      <span className="pw-num text-[11px] text-muted-foreground shrink-0">
                                        {bank.code}
                                      </span>
                                    </CommandItem>
                                  ))
                                ) : (
                                  <div className="p-3 text-center text-caption text-muted-foreground">
                                    Loading banks...
                                  </div>
                                )}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {spin && (
                        <div className="flex items-center justify-center gap-2 py-2 text-caption text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                          <span>Verifying account details...</span>
                        </div>
                      )}

                      {!spin && isChecked && accountName && (
                        <div className="pw-panel border-brand-400/30 bg-brand-tint p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="pw-tile h-9 w-9">
                              <UserCheck className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="pw-label block">VERIFIED BENEFICIARY</span>
                              <span className="text-sm font-bold text-foreground truncate block">
                                {accountName}
                              </span>
                            </div>
                          </div>
                          <ReceiptStatusPill status="success" label="VALID" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="p2p-recipient" className="pw-label block">
                          Barter ID, @username, or Phone
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="p2p-recipient"
                            value={p2pDetails.recipientIdentifier}
                            onChange={(e) =>
                              setP2pDetails((p) => ({
                                ...p,
                                recipientIdentifier: e.target.value,
                                resolvedRecipient: null,
                              }))
                            }
                            placeholder="15-digit Barter ID or @username"
                            className="flex-1 pw-code text-[13px] sm:text-sm h-11"
                          />
                          <Button
                            type="button"
                            onClick={handleResolveRecipient}
                            disabled={p2pDetails.isResolving || !p2pDetails.recipientIdentifier.trim()}
                            className="shrink-0 h-11 text-xs sm:text-sm"
                          >
                            {p2pDetails.isResolving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Verify"
                            )}
                          </Button>
                        </div>
                        <p className="text-caption text-muted-foreground">
                          ₦0 fee applies to all PayWaka wallet-to-wallet transfers.
                        </p>
                      </div>

                      {p2pDetails.resolvedRecipient && (
                        <div className="pw-panel border-brand-400/30 bg-brand-tint p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="pw-tile h-9 w-9">
                              <UserCheck className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-foreground block truncate">
                                {p2pDetails.resolvedRecipient.fullName ||
                                  `${p2pDetails.resolvedRecipient.firstName || ""} ${p2pDetails.resolvedRecipient.lastName || ""
                                    }`.trim() ||
                                  p2pDetails.resolvedRecipient.userName ||
                                  "PayWaka User"}
                              </span>
                              <span className="pw-num text-caption text-brand-400 block truncate">
                                @{p2pDetails.resolvedRecipient.userName || "paywaka"} ·{" "}
                                {p2pDetails.resolvedRecipient.barter_id}
                              </span>
                            </div>
                          </div>
                          <ReceiptStatusPill status="success" label="VERIFIED" />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="p2p-narration" className="pw-label block">
                          Narration (Optional)
                        </Label>
                        <Input
                          id="p2p-narration"
                          value={p2pDetails.narration}
                          onChange={(e) =>
                            setP2pDetails((p) => ({ ...p, narration: e.target.value }))
                          }
                          placeholder="Add a note"
                          maxLength={60}
                          className="h-11 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleStartTransferFlow}
                    disabled={
                      numericAmount < 100 ||
                      totalDeduction > (walletBalance || 0) ||
                      (withdrawalMode === "bank" &&
                        (!accountDetails.accountNumber || !accountName || !selectedValue)) ||
                      (withdrawalMode === "p2p" && !p2pDetails.resolvedRecipient)
                    }
                    className="w-full h-11 text-sm"
                  >
                    {numericAmount < 100
                      ? "Minimum Transfer is ₦100"
                      : totalDeduction > (walletBalance || 0)
                        ? "Insufficient Wallet Balance"
                        : withdrawalMode === "p2p"
                          ? `Send ${formatNaira(numericAmount)} to User`
                          : `Withdraw ${formatNaira(numericAmount)}`}
                  </Button>
                </CardContent>
              </Card>

              {/* Sticky Transfer Summary on Desktop */}
              <Card className="lg:sticky lg:top-32">
                <CardHeader className="pb-3">
                  <CardTitle>Transfer Summary</CardTitle>
                  <CardDescription>Live fee & deduction preview</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReceiptRows>
                    <ReceiptRow
                      label="Method"
                      value={isP2PTransfer ? "PayWaka P2P" : "NIP Bank Transfer"}
                    />
                    <ReceiptRow
                      label="Recipient"
                      value={
                        isP2PTransfer
                          ? p2pDetails.resolvedRecipient?.userName
                            ? `@${p2pDetails.resolvedRecipient.userName}`
                            : "Not verified"
                          : accountName || "Not verified"
                      }
                    />
                    <ReceiptRow
                      label="Transfer Amount"
                      value={formatNaira(numericAmount)}
                      mono
                    />
                    <ReceiptRow
                      label="Processor Fee"
                      value={transferFee > 0 ? formatNaira(transferFee) : "₦0.00 (Free)"}
                      mono
                      accent={transferFee === 0}
                    />
                    <ReceiptRow
                      label="Total Debit"
                      value={formatNaira(totalDeduction)}
                      mono
                      accent
                    />
                  </ReceiptRows>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                      Tap any item to view or share its PayWaka receipt
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="search"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search history..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((transaction) => {
                    const displayTitle = getTransactionDisplayTitle(transaction);
                    const isCredit = isInboundTransaction(transaction);
                    const statusInfo = getTransactionStatusInfo(transaction);
                    const ref = getTransactionReference(transaction);

                    return (
                      <button
                        key={transaction.id}
                        type="button"
                        onClick={() => {
                          setSelectedTxForModal(transaction);
                          setIsTxModalOpen(true);
                        }}
                        className="pw-pressable pw-panel w-full text-left flex items-center justify-between gap-3 p-3.5 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              "h-10 w-10",
                              isCredit ? "pw-tile" : "pw-tile-ruby",
                            )}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {displayTitle}
                            </p>
                            <p className="pw-num text-caption text-muted-foreground truncate">
                              {formatTransactionDate(transaction)} · {ref}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <p
                            className={cn(
                              "pw-num text-sm font-bold",
                              isCredit ? "text-brand-400" : "text-foreground",
                            )}
                          >
                            {formatSignedNaira(transaction.amount || 0, isCredit)}
                          </p>
                          <ReceiptStatusPill
                            status={statusInfo.key}
                            label={statusInfo.label}
                            className="text-[9px] px-2 py-0.5"
                          />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <StateView
                    icon={Receipt}
                    title="No transactions recorded"
                    description="Fund your wallet or make a transfer to see your ledger history."
                    actionLabel="Add Funds"
                    onAction={() => setAccountPopup(true)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <WithdrawalConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmModalProceed}
          amount={numericAmount}
          bankName={withdrawalMode === "p2p" ? "PayWaka P2P Wallet" : selectedValue}
          accountNumber={
            withdrawalMode === "p2p"
              ? p2pDetails.resolvedRecipient?.barter_id || ""
              : accountDetails.accountNumber
          }
          accountHolder={
            withdrawalMode === "p2p"
              ? p2pDetails.resolvedRecipient?.fullName ||
              `${p2pDetails.resolvedRecipient?.firstName || ""} ${p2pDetails.resolvedRecipient?.lastName || ""
                }`.trim() ||
              p2pDetails.resolvedRecipient?.userName ||
              "PayWaka User"
              : accountName
          }
          isP2P={withdrawalMode === "p2p"}
          transferFee={transferFee}
        />

        <TransactionPinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onConfirm={handleExecuteTransfer}
          amount={numericAmount}
          recipient={
            withdrawalMode === "p2p"
              ? `@${p2pDetails.resolvedRecipient?.userName || "paywaka_user"}`
              : `${selectedValue} (${accountDetails.accountNumber})`
          }
          serviceName={withdrawalMode === "p2p" ? "PayWaka P2P Transfer" : "Bank Withdrawal"}
          onBack={() => {
            setIsPinModalOpen(false);
            setIsConfirmModalOpen(true);
          }}
        />

        <TransactionPinModal
          isOpen={isCashbackPinModalOpen}
          onClose={() => setIsCashbackPinModalOpen(false)}
          onConfirm={async (pin) => {
            setIsTransferringCashback(true);
            try {
              const transferAmt = Number(
                cashbackTransferAmount || Math.floor(Number(cashbackBalance || 0)),
              );
              const res = await transferCashbackToWallet({
                amount: transferAmt,
                pin,
              });
              if (res?.status === "success") {
                toast.success(
                  res.message ||
                  `${formatPlanPrice(transferAmt)} moved from Cashback Vault to your Main Wallet!`,
                );
                setCashbackTransferAmount("");
                setIsCashbackPinModalOpen(false);
                return true;
              }
              toast.error(res?.message || "Cashback transfer failed.");
              return false;
            } catch (err) {
              toast.error(err?.message || "Failed to transfer cashback to main wallet.");
              if (/pin|lockout|attempt/i.test(err?.message || "")) {
                throw err;
              }
              return false;
            } finally {
              setIsTransferringCashback(false);
            }
          }}
          amount={Number(cashbackTransferAmount || Math.floor(Number(cashbackBalance || 0)))}
          recipient="Main PayWaka Wallet"
          serviceName="Cashback Vault Transfer (₦0 Fee)"
        />

        {selectedTxForModal && (
          <TransactionsModal
            transaction={selectedTxForModal}
            isOpen={isTxModalOpen}
            onClose={() => {
              setIsTxModalOpen(false);
              setSelectedTxForModal(null);
            }}
          />
        )}

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

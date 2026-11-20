import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormattedAmountInput from "@/components/ui/FormattedAmountInput";
import { Label } from "@/components/ui/label";
import StateView from "@/components/ui/StateView";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Tv, Clock, Receipt, CheckCircle2 } from "lucide-react";
import { useSpinner } from "@/components/SpinnerProvider";
import { useDispatch, useSelector } from "react-redux";
import useCloudfunc from "@/components/useCloudfunc";
import { selectedPrice, billerInfo } from "@/Features/userSlice";
import PaymentConfirmation from "../PaymentConfirmation";
import PaymentSuccessfulModal from "@/components/PaymentSuccessfulModal";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import {
  ReceiptCashbackChip,
  ReceiptRow,
  ReceiptRows,
  ReceiptStatusPill,
} from "@/components/receipts/ReceiptParts";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";
import { useBillsStat } from "../../components/useTransactionFetch";
import {
  computeBillPricingAndEarnings,
  DEFAULT_BILL_PRICING_CONFIG,
} from "@shared/billPricingEngine";
import { formatCashback, formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

const billTypes = [
  { id: "electricity", name: "Electricity", icon: Zap },
  { id: "cable", name: "Cable TV", icon: Tv },
];

export default function BillsPage() {
  const [selectedBillType, setSelectedBillType] = useState("electricity");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("01"); // 01 = Prepaid, 02 = Postpaid
  const [amount, setAmount] = useState("");
  const [isLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("");
  const { setAppContext } = useSpinner();
  const transactions = useSelector((state) => state.user.transactions);
  const billCatalog = useSelector((state) => state.user.billCatalog);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [isFailedOpen, setIsFailedOpen] = useState(false);
  const [failedData, setFailedData] = useState({});
  const { cable, purchaseElectricity, purchaseCable, getBillPricingConfig } =
    useCloudfunc();
  const { utilityData = [], utilityMonthlyData = { amount: 0, noTransactions: 0 } } =
    useBillsStat();
  const dispatch = useDispatch();
  const [billPricingConfig, setBillPricingConfig] = useState(
    () => billCatalog?.billPricingConfig || DEFAULT_BILL_PRICING_CONFIG,
  );

  useEffect(() => {
    if (billCatalog?.billPricingConfig) {
      setBillPricingConfig(billCatalog.billPricingConfig);
      return;
    }
    let active = true;
    getBillPricingConfig()
      .then((res) => {
        if (active && res?.status === "success" && res.config) {
          setBillPricingConfig(res.config);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [billCatalog?.billPricingConfig]);

  const validateCustomer = httpsCallable(functions, "validateCustomer");

  const [verifiedCustomerName, setVerifiedCustomerName] = useState("");
  const [customerVerifyError, setCustomerVerifyError] = useState("");
  const [isVerifyingCustomer, setIsVerifyingCustomer] = useState(false);

  const providers = useMemo(() => {
    const adminDiscos =
      Array.isArray(billCatalog?.electricityDiscos) &&
      billCatalog.electricityDiscos.length > 0
        ? billCatalog.electricityDiscos.map((d) => ({
            id: d.id || d.code,
            name: d.name,
            minAmount: d.minAmount,
            maxAmount: d.maxAmount,
          }))
        : [
            { id: "01", name: "Eko Electric (EKEDC)" },
            { id: "02", name: "Ikeja Electric (IKEDC)" },
            { id: "03", name: "Abuja Electric (AEDC)" },
            { id: "04", name: "Kano Electric (KEDCO)" },
            { id: "05", name: "Port Harcourt Electric (PHEDC)" },
            { id: "06", name: "Jos Electric (JEDC)" },
            { id: "07", name: "Ibadan Electric (IBEDC)" },
            { id: "08", name: "Kaduna Electric (KAEDCO)" },
            { id: "09", name: "Enugu Electric (EEDC)" },
            { id: "10", name: "Benin Electric (BEDC)" },
            { id: "11", name: "Yola Electric (YEDC)" },
            { id: "12", name: "Aba Electric (APLE)" },
          ];
    return {
      electricity: adminDiscos,
      cable: [
        { id: "dstv", name: "DStv", billerCode: "dstv" },
        { id: "gotv", name: "GOtv", billerCode: "gotv" },
        { id: "startimes", name: "StarTimes", billerCode: "startimes" },
        { id: "showmax", name: "Showmax", billerCode: "showmax" },
      ],
    };
  }, [billCatalog?.electricityDiscos]);

  const handleVerifyCustomer = async () => {
    const cleanId = String(meterNumber || "").trim();
    if (!selectedProvider || !cleanId) {
      return toast.warning(
        "Select a provider and enter your meter or smartcard number first.",
      );
    }
    setIsVerifyingCustomer(true);
    setVerifiedCustomerName("");
    setCustomerVerifyError("");
    try {
      const res = await validateCustomer({
        billType: selectedBillType,
        provider: selectedProvider,
        meterType: selectedBillType === "electricity" ? meterType : undefined,
        customerID: cleanId,
      });
      const data = res?.data || {};
      if (data.status === "success" && data.customerName) {
        setVerifiedCustomerName(data.customerName);
        toast.success(`Verified: ${data.customerName}`);
      } else {
        const msg = data.message || "Unable to verify meter or smartcard number.";
        setCustomerVerifyError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err?.message || "Verification request failed.";
      setCustomerVerifyError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingCustomer(false);
    }
  };

  const user = useSelector((state) => state?.user?.user) || {};
  const walletBalance = Number(user.walletBalance || 0);
  const cashbackBalance = Number(user.cashbackBalance || 0);

  const selectedProviderName =
    providers[selectedBillType]?.find((p) => p.id === selectedProvider)?.name ||
    selectedProvider;

  const billPricingPreview = useMemo(() => {
    const face = Number(amount || 0);
    if (!selectedBillType || !selectedProvider || face <= 0) return null;
    return computeBillPricingAndEarnings({
      category: selectedBillType,
      provider: selectedProviderName || selectedProvider,
      faceAmountNaira: face,
      walletBalanceNaira: walletBalance,
      cashbackBalanceNaira: cashbackBalance,
      useCashback: false,
      config: billPricingConfig,
    });
  }, [
    selectedBillType,
    selectedProvider,
    selectedProviderName,
    amount,
    walletBalance,
    cashbackBalance,
    billPricingConfig,
  ]);

  const handlePayment = async () => {
    if (!selectedBillType || !selectedProvider || !meterNumber || !amount) {
      return toast.warning("Please fill out all required bill details before proceeding.");
    }
    const numAmount = Number(amount || 0);
    if (numAmount <= 0) {
      return toast.warning("Please enter a valid amount greater than ₦0.");
    }
    if (billPricingPreview && !billPricingPreview.valid) {
      return toast.warning(billPricingPreview.error || "Please check bill amount and details.");
    }
    const totalPayable = Number(billPricingPreview?.totalPayable ?? numAmount);
    if (walletBalance + cashbackBalance < totalPayable) {
      return toast.error(
        `Insufficient funds. Total payable (including fee) is ${formatNaira(totalPayable)}, while your combined balance is ${formatNaira(walletBalance + cashbackBalance)}.`,
      );
    }
    dispatch(
      selectedPrice({
        customerID: meterNumber,
        customerName: verifiedCustomerName || undefined,
        amount: numAmount,
        price: numAmount,
        fee: Number(billPricingPreview?.feeCharged || 0),
        totalPayable,
        cashbackToEarn: Number(billPricingPreview?.cashbackGiven || 0),
        cashbackAmount: Number(billPricingPreview?.cashbackGiven || 0),
        network: selectedProviderName || selectedProvider,
        productName: selectedBillType === "electricity" ? "Electricity" : "Cable",
        billType: selectedBillType,
      }),
    );
    setIsConfirmationOpen(true);
  };

  const handleConfirmBillPayment = async (pin, fundingMeta = {}) => {
    const providerName = selectedProviderName || selectedProvider;
    const numAmount = Number(amount || 0);
    const totalPayable = Number(billPricingPreview?.totalPayable ?? numAmount);
    const useCashback = Boolean(fundingMeta?.useCashback);

    try {
      if (!numAmount || numAmount <= 0) {
        toast.error("Please enter a valid amount.");
        return false;
      }
      if (!meterNumber) {
        toast.error("Please enter a valid meter / smartcard number.");
        return false;
      }
      const maxAvailable = walletBalance + (useCashback ? cashbackBalance : 0);
      if (maxAvailable < totalPayable) {
        toast.error(
          `Insufficient balance. Total payable is ${formatNaira(totalPayable)}. Please add funds to proceed.`,
        );
        setFailedData({
          category: selectedBillType === "electricity" ? "Electricity Bill" : "Cable TV",
          productName: `${providerName} ${
            selectedBillType === "electricity"
              ? `(${meterType === "02" ? "Postpaid" : "Prepaid"})`
              : ""
          }`,
          network: providerName,
          amount: numAmount,
          customerId: meterNumber,
          tx_ref: `PWK_${Date.now()}`,
          reason: `Insufficient balance. Total payable is ${formatNaira(totalPayable)} but available funds are ${formatNaira(maxAvailable)}.`,
          refunded: false,
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      }

      let res;

      if (selectedBillType === "electricity") {
        res = await purchaseElectricity({
          company: selectedProvider,
          meterNo: meterNumber,
          meterType: meterType || "01",
          amount: numAmount,
          useCashback,
          pin,
        });

        if (res?.status === "success") {
          const earnedCb = Number(res.cashbackEarned || 0);
          toast.success(
            earnedCb > 0
              ? `Electricity paid! ${formatCashback(earnedCb)} Cashback credited.`
              : "Electricity bill paid successfully!",
          );
          setSuccessData({
            category: "Electricity Bill",
            productName: `${providerName} (${meterType === "02" ? "Postpaid" : "Prepaid"})`,
            network: providerName,
            amount: numAmount,
            feeCharged: Number(res.feeCharged ?? billPricingPreview?.feeCharged ?? 0),
            totalPayable: Number(res.totalPayable ?? totalPayable),
            cashbackApplied: Number(res.cashbackApplied ?? fundingMeta?.cashbackApplied ?? 0),
            walletContribution: Number(res.walletContribution ?? fundingMeta?.walletContribution ?? totalPayable),
            customerId: meterNumber,
            tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
            token:
              res.token ||
              res.metertoken ||
              res.data?.metertoken ||
              res.data?.token ||
              res.data?.pin ||
              "",
            cashbackEarned: earnedCb,
            bonusToEarn: earnedCb > 0 ? `${formatCashback(earnedCb)} Cashback` : "₦0 Cashback",
          });
          setMeterNumber("");
          setVerifiedCustomerName("");
          setAmount("");
          setIsConfirmationOpen(false);
          setIsSuccessOpen(true);
          return true;
        }
      } else if (selectedBillType === "cable") {
        res = await purchaseCable({
          cableTV: selectedProvider,
          packageCode: selectedPackage || "01",
          smartCardNo: meterNumber,
          amount: numAmount,
          useCashback,
          pin,
        });

        if (res?.status === "success") {
          const earnedCb = Number(res.cashbackEarned || 0);
          toast.success(
            earnedCb > 0
              ? `Cable TV renewed! ${formatCashback(earnedCb)} Cashback credited.`
              : "Cable TV subscription paid successfully!",
          );
          setSuccessData({
            category: "Cable TV",
            productName: `${providerName} TV`,
            network: providerName,
            amount: numAmount,
            feeCharged: Number(res.feeCharged ?? 0),
            totalPayable: Number(res.totalPayable ?? numAmount),
            cashbackApplied: Number(res.cashbackApplied ?? fundingMeta?.cashbackApplied ?? 0),
            walletContribution: Number(res.walletContribution ?? fundingMeta?.walletContribution ?? totalPayable),
            customerId: meterNumber,
            tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
            cashbackEarned: earnedCb,
            bonusToEarn: earnedCb > 0 ? `${formatCashback(earnedCb)} Cashback` : "₦0 Cashback",
          });
          setMeterNumber("");
          setVerifiedCustomerName("");
          setAmount("");
          setSelectedPackage("");
          setIsConfirmationOpen(false);
          setIsSuccessOpen(true);
          return true;
        }
      }

      if (res?.status === "pending") {
        toast.info(
          res.message ||
            `Payment is processing with provider (Ref: ${res.tx_ref}). Cashback will be credited automatically once completed.`,
          { duration: 7000 },
        );
        setMeterNumber("");
        setAmount("");
        setSelectedPackage("");
        setIsConfirmationOpen(false);
        return true;
      }

      if (res?.status === "provider_error") {
        setFailedData({
          category: selectedBillType === "electricity" ? "Electricity Bill" : "Cable TV",
          productName: `${providerName} ${
            selectedBillType === "electricity"
              ? `(${meterType === "02" ? "Postpaid" : "Prepaid"})`
              : ""
          }`,
          network: providerName,
          amount: numAmount,
          customerId: meterNumber,
          tx_ref: res.tx_ref || `PWK_${Date.now()}`,
          reason:
            res.message ||
            "Temporary maintenance on provider gateway. Your PayWaka wallet and cashback were not charged.",
          refunded: true,
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      } else {
        setFailedData({
          category: selectedBillType === "electricity" ? "Electricity Bill" : "Cable TV",
          productName: `${providerName} ${
            selectedBillType === "electricity"
              ? `(${meterType === "02" ? "Postpaid" : "Prepaid"})`
              : ""
          }`,
          network: providerName,
          amount: numAmount,
          customerId: meterNumber,
          tx_ref: res?.tx_ref || `PWK_${Date.now()}`,
          reason:
            res?.message ||
            "Bill payment could not be completed. Please verify your meter/smartcard number and balance.",
          refunded: Boolean(res?.refunded !== false),
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      }
    } catch (err) {
      console.error("Bill payment execution error:", err);
      const errMsg = err?.message || "";
      if (/pin|lockout|attempt/i.test(errMsg)) {
        throw err;
      }
      const cleanErrMsg = err.message?.includes("Insufficient")
        ? err.message
        : err.message || "An unexpected error occurred while communicating with the billing gateway.";

      setFailedData({
        category: selectedBillType === "electricity" ? "Electricity Bill" : "Cable TV",
        productName: `${providerName || "Service Bill"}`,
        network: providerName || "Provider",
        amount: Number(amount || 0),
        customerId: meterNumber,
        tx_ref: `PWK_${Date.now()}`,
        reason: cleanErrMsg,
        refunded: !cleanErrMsg.includes("Insufficient"),
      });
      setIsConfirmationOpen(false);
      setIsFailedOpen(true);
      return false;
    }
  };

  const currentPackages = useMemo(() => {
    if (selectedBillType === "cable" && selectedProvider) {
      const provKey = String(selectedProvider).toUpperCase();
      const cached = billCatalog?.cablePackagesByProvider?.[provKey];
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }
    return Array.isArray(transactions?.billsInfo) ? transactions.billsInfo : [];
  }, [billCatalog?.cablePackagesByProvider, selectedBillType, selectedProvider, transactions?.billsInfo]);

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Unified Page Header */}
          <div>
            <h1 className="pw-page-title">Pay Bills</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Settle electricity tokens and cable TV subscriptions instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-6 items-start">
            {/* Payment Form (capped 560px on desktop) */}
            <Card>
              <CardHeader>
                <CardTitle>Bill Payment</CardTitle>
                <CardDescription>
                  Select bill type and verify your meter or smartcard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Bill Type (only supported services shown) */}
                <div className="space-y-2">
                  <Label className="pw-label block">Bill Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {billTypes.map((billType) => {
                      const isSelected = selectedBillType === billType.id;
                      const Icon = billType.icon;
                      return (
                        <button
                          key={billType.id}
                          type="button"
                          onClick={() => {
                            setSelectedBillType(billType.id);
                            setSelectedProvider("");
                            setSelectedPackage("");
                            setAmount("");
                            setVerifiedCustomerName("");
                            setCustomerVerifyError("");
                            dispatch(billerInfo({ billsInfo: [] }));
                          }}
                          className={cn(
                            "pw-pressable relative px-2.5 py-2.5 sm:p-3 min-h-[52px] sm:min-h-14 rounded-panel border flex items-center gap-1.5 sm:gap-2 text-left transition-all",
                            isSelected
                              ? "border-brand-400 bg-brand-tint ring-1 ring-brand-400/35 shadow-[0_10px_24px_-12px_hsl(var(--brand-400)/0.5)]"
                              : "pw-panel hover:border-brand-400/40",
                          )}
                        >
                          <div className={cn("h-7 w-7 sm:h-8 sm:w-8", isSelected ? "pw-tile" : "pw-tile-neutral")}>
                            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
                            {billType.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-400 ml-auto shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provider */}
                <div className="space-y-2">
                  <Label className="pw-label block">Service Provider</Label>
                  <Select
                    value={selectedProvider}
                    onValueChange={async (value) => {
                      setSelectedProvider(value);
                      setSelectedPackage("");
                      setAmount("");
                      setVerifiedCustomerName("");
                      setCustomerVerifyError("");
                      if (selectedBillType === "cable") {
                        const provider = providers[selectedBillType].find(
                          (item) => item.id === value,
                        );
                        if (provider) {
                          const provKey = String(provider.id || value).toUpperCase();
                          const cachedCable = billCatalog?.cablePackagesByProvider?.[provKey];
                          const hasCachedCable =
                            Array.isArray(cachedCable) && cachedCable.length > 0;
                          if (!hasCachedCable) {
                            setAppContext((prev) => ({ ...prev, spinner: true }));
                          }
                          try {
                            await cable(
                              null,
                              null,
                              provider.billerCode || provider.id,
                              "cable",
                              provider.name || provider.id,
                            );
                          } finally {
                            if (!hasCachedCable) {
                              setAppContext((prev) => ({ ...prev, spinner: false }));
                            }
                          }
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {providers[selectedBillType]?.map((provider) => (
                        <SelectItem
                          key={provider.id}
                          value={provider.id}
                          className="text-foreground hover:bg-muted min-h-11"
                        >
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Meter Type Selector for Electricity */}
                {selectedBillType === "electricity" && selectedProvider && (
                  <div className="space-y-2">
                    <Label className="pw-label block">Meter Type</Label>
                    <Select value={meterType} onValueChange={(val) => setMeterType(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meter type" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="01" className="text-foreground hover:bg-muted min-h-11">
                          Prepaid (Token)
                        </SelectItem>
                        <SelectItem value="02" className="text-foreground hover:bg-muted min-h-11">
                          Postpaid (Bill)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Meter / Smartcard Number */}
                {selectedProvider && (
                  <div className="space-y-2">
                    <Label htmlFor="meter" className="pw-label block">
                      {selectedBillType === "electricity"
                        ? "Meter Number"
                        : "Smartcard / IUC Number"}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="meter"
                        type="text"
                        inputMode="numeric"
                        placeholder={
                          selectedBillType === "electricity"
                            ? "Enter meter number"
                            : "Enter smartcard / IUC number"
                        }
                        value={meterNumber}
                        onChange={(e) => {
                          setMeterNumber(e.target.value);
                          setVerifiedCustomerName("");
                          setCustomerVerifyError("");
                        }}
                        className="flex-1 h-11 text-[13px] sm:text-sm font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!meterNumber.trim() || isVerifyingCustomer}
                        onClick={handleVerifyCustomer}
                        className="shrink-0 h-11 border-brand-400/40 text-brand-400 hover:bg-brand-tint"
                      >
                        {isVerifyingCustomer ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                    {verifiedCustomerName && (
                      <p className="text-caption font-semibold text-brand-400">
                        Verified: {verifiedCustomerName}
                      </p>
                    )}
                    {customerVerifyError && (
                      <p className="text-caption font-semibold text-destructive">
                        {customerVerifyError}
                      </p>
                    )}
                  </div>
                )}

                {/* Cable Package Selector */}
                {selectedBillType === "cable" && selectedProvider !== "" && (
                  <div className="space-y-2">
                    <Label className="pw-label block">Package</Label>
                    <Select
                      value={selectedPackage}
                      onValueChange={(val) => {
                        setSelectedPackage(val);
                        const selectedPkgObj = currentPackages.find(
                          (p) => String(p.id || p.item_code) === String(val),
                        );
                        if (selectedPkgObj) {
                          setAmount(selectedPkgObj.amount);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {currentPackages.map((packages, idx) => (
                          <SelectItem
                            key={`${packages.id || packages.item_code || "pkg"}-${idx}`}
                            value={String(packages.id || packages.item_code)}
                            className="text-foreground hover:bg-muted min-h-11"
                          >
                            {packages.short_name ||
                              `${packages.name || "Package"} - ${formatNaira(packages.amount || 0)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Amount (Electricity) */}
                {selectedProvider && selectedBillType === "electricity" && (
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="pw-label block">
                      Amount (₦)
                    </Label>
                    <FormattedAmountInput
                      id="amount"
                      name="amount"
                      value={amount}
                      onChange={(cleanVal) => setAmount(cleanVal)}
                      placeholder="Enter amount (e.g. 5,000)"
                    />
                  </div>
                )}

                {billPricingPreview && !billPricingPreview.valid && (
                  <p className="text-caption text-destructive font-semibold">
                    {billPricingPreview.error}
                  </p>
                )}

                <Button
                  type="button"
                  onClick={handlePayment}
                  disabled={
                    !selectedBillType ||
                    !selectedProvider ||
                    !meterNumber ||
                    !amount ||
                    isLoading
                  }
                  className="w-full h-11"
                >
                  {isLoading ? "Processing Payment..." : "Pay Bill"}
                </Button>
              </CardContent>
            </Card>

            {/* Sticky Order Summary + Stats + Recent Bills */}
            <div className="space-y-6 lg:sticky lg:top-20">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Order Summary</CardTitle>
                  <CardDescription>Breakdown including processing fee</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ReceiptRows>
                    <ReceiptRow
                      label="Bill Type"
                      value={billTypes.find((b) => b.id === selectedBillType)?.name}
                    />
                    <ReceiptRow
                      label="Provider"
                      value={selectedProviderName || "Not selected"}
                    />
                    <ReceiptRow
                      label="Bill Amount"
                      value={Number(amount || 0) > 0 ? formatNaira(amount) : "₦0.00"}
                      mono
                    />
                    <ReceiptRow
                      label="Processing Fee"
                      value={formatNaira(billPricingPreview?.feeCharged || 0)}
                      mono
                    />
                    <ReceiptRow
                      label="Total Payable"
                      value={formatNaira(billPricingPreview?.totalPayable ?? amount ?? 0)}
                      mono
                      accent
                    />
                  </ReceiptRows>

                  {billPricingPreview?.valid && billPricingPreview.cashbackGiven > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-caption text-muted-foreground">
                        Estimated Reward
                      </span>
                      <ReceiptCashbackChip amount={billPricingPreview.cashbackGiven} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReceiptRows>
                    <ReceiptRow
                      label="Bills Paid"
                      value={String(utilityMonthlyData?.noTransactions || 0)}
                      mono
                    />
                    <ReceiptRow
                      label="Total Amount"
                      value={formatNaira(utilityMonthlyData?.amount || 0)}
                      mono
                    />
                  </ReceiptRows>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Recent Bills</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {utilityData && utilityData.length > 0 ? (
                    utilityData.slice(0, 5).map((bill, index) => (
                      <div
                        key={bill.id || index}
                        className="pw-panel p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {bill.billType || bill.type || "Utility"}
                          </p>
                          <p className="text-caption text-muted-foreground truncate">
                            {bill.provider || "PayWaka"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="pw-num text-sm font-bold text-foreground">
                            {formatNaira(bill.amount || 0)}
                          </p>
                          <ReceiptStatusPill
                            status={bill.status}
                            label={String(bill.status || "COMPLETED").toUpperCase()}
                            className="text-[9px] px-2 py-0.5"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <StateView
                      compact
                      icon={Receipt}
                      title="No recent bills"
                      description="Your electricity and cable payments will appear here."
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>

      <PaymentConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleConfirmBillPayment}
        billPricingConfig={billPricingConfig}
        paymentDetails={{
          customerID: meterNumber,
          customerName: verifiedCustomerName || undefined,
          price: Number(amount),
          amount: Number(amount),
          fee: Number(billPricingPreview?.feeCharged || 0),
          totalPayable: Number(billPricingPreview?.totalPayable || amount || 0),
          cashbackToEarn: Number(billPricingPreview?.cashbackGiven || 0),
          cashbackAmount: Number(billPricingPreview?.cashbackGiven || 0),
          productName: selectedBillType === "electricity" ? "Electricity" : "Cable",
          billType: selectedBillType,
          network: selectedProviderName || selectedProvider,
          biller_name: `${selectedBillType.toUpperCase()} - ${selectedProviderName || selectedProvider}`,
        }}
      />

      <PaymentSuccessfulModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        data={successData}
      />

      <PaymentFailedModal
        isOpen={isFailedOpen}
        onClose={() => setIsFailedOpen(false)}
        onRetry={() => {
          setIsFailedOpen(false);
          setIsConfirmationOpen(true);
        }}
        data={failedData}
      />
    </>
  );
}

import { useEffect, useRef, useState } from "react";
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
import NetworkPicker, {
  detectNetworkFromPhone,
} from "@/components/services/NetworkPicker";
import {
  ReceiptCashbackChip,
  ReceiptRow,
  ReceiptRows,
  ReceiptStatusPill,
} from "@/components/receipts/ReceiptParts";
import PaymentConfirmation from "@/pages/PaymentConfirmation";
import PaymentSuccessfulModal from "@/components/PaymentSuccessfulModal";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import { Smartphone, Clock, Receipt } from "lucide-react";
import useCloudfunc from "@/components/useCloudfunc";
import { useDispatch, useSelector } from "react-redux";
import { selectedPrice } from "@/Features/userSlice";
import { toast } from "sonner";
import { useBillsStat } from "../../components/useTransactionFetch";
import { interval } from "../../components/functionalities";
import {
  computeBillPricingAndEarnings,
  DEFAULT_BILL_PRICING_CONFIG,
} from "@shared/billPricingEngine";
import { formatCashback, formatNaira, formatPlanPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const quickAmounts = [200, 500, 1000, 2000, 5000, 10000];

export default function AirtimePage() {
  const { airtimeData = [], weeklyData = { amount: 0, noTransactions: 0 } } =
    useBillsStat();

  const transactions = useSelector((state) => state.user.transactions);
  const billCatalog = useSelector((state) => state.user.billCatalog);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const dispatch = useDispatch();
  const [click, setClick] = useState(false);
  const { biller, purchaseAirtime, getBillPricingConfig } = useCloudfunc();
  const [billPricingConfig, setBillPricingConfig] = useState(
    () => billCatalog?.billPricingConfig || DEFAULT_BILL_PRICING_CONFIG,
  );
  const [selectedNetwork, setSelectedNetwork] = useState("MTN");
  const [autoDetectedNet, setAutoDetectedNet] = useState(null);
  const manualOverrideRef = useRef(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [isFailedOpen, setIsFailedOpen] = useState(false);
  const [failedData, setFailedData] = useState({});
  const { timeAgo, now } = interval();

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

  function maskPhone(phone) {
    const str = String(phone || "");
    if (str.length < 7) return str;
    return str.slice(0, 3) + "****" + str.slice(-4);
  }

  const getNetworkBadgeLabel = (netId) => {
    const lower = String(netId || "").toLowerCase();
    const rate = Number(
      billPricingConfig?.airtime?.cashbackRates?.[lower] ??
        billPricingConfig?.airtime?.cashbackRates?.[netId] ??
        billPricingConfig?.airtime?.cashbackRate ??
        0,
    );
    return rate > 0 ? `${Number((rate * 100).toFixed(1))}% cb` : null;
  };

  const handleNetworkSelect = async (netOption, isAuto = false) => {
    if (!isAuto) {
      manualOverrideRef.current = true;
    }
    const netId = netOption?.id ? String(netOption.id).toUpperCase() : String(netOption).toUpperCase();
    setSelectedNetwork(netId);
    await biller(netOption?.name || netId, "Airtime");
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhoneNumber(digitsOnly);

    if (digitsOnly.length < 4) {
      manualOverrideRef.current = false;
      setAutoDetectedNet(null);
      return;
    }

    const detected = detectNetworkFromPhone(digitsOnly);
    setAutoDetectedNet(detected);
    if (detected && !manualOverrideRef.current && detected !== selectedNetwork) {
      handleNetworkSelect({ id: detected, name: detected }, true);
    }
  };

  const estimatedAirtimePricing =
    selectedNetwork && Number(amount || 0) > 0
      ? computeBillPricingAndEarnings({
          category: "airtime",
          provider: String(selectedNetwork).toUpperCase(),
          faceAmountNaira: Number(amount),
          config: billPricingConfig,
        })
      : null;

  const handleBuyNow = (price) => {
    if (!selectedNetwork || !phoneNumber || !price) {
      return toast.warning("Please select a network, enter a phone number, and enter amount.");
    }
    const netName = String(selectedNetwork).toUpperCase();
    const preview = computeBillPricingAndEarnings({
      category: "airtime",
      provider: netName,
      faceAmountNaira: Number(price),
      config: billPricingConfig,
    });
    if (!preview.valid) {
      return toast.warning(preview.error || "Please enter a valid airtime amount (minimum ₦50).");
    }
    const cbToEarn = Number(preview?.cashbackGiven || 0);
    dispatch(
      selectedPrice({
        productName: "Airtime",
        network: netName,
        billType: "airtime",
        price: Number(price),
        customerID: phoneNumber,
        cashbackToEarn: cbToEarn,
        cashbackAmount: cbToEarn,
        bonusToEarn: cbToEarn > 0 ? `${formatCashback(cbToEarn)} Cashback` : "₦0 Cashback",
      }),
    );
    setClick(true);
    setIsConfirmationOpen(true);
  };

  const handleConfirmAirtimePayment = async (pin, fundingMeta = {}) => {
    try {
      const netName = String(selectedNetwork || "MTN").toUpperCase();
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        toast.error("Please enter a valid amount.");
        return false;
      }
      if (!phoneNumber || phoneNumber.length < 11) {
        toast.error("Please enter a valid 11-digit phone number.");
        return false;
      }

      const useCashback = Boolean(fundingMeta?.useCashback);
      const res = await purchaseAirtime({
        network: netName,
        phone: phoneNumber,
        amount: numAmount,
        useCashback,
        pin,
      });

      if (res?.status === "success") {
        const earnedCb = Number(res.cashbackEarned || 0);
        toast.success(
          earnedCb > 0
            ? `${formatPlanPrice(numAmount)} Airtime delivered! ${formatCashback(earnedCb)} Cashback credited.`
            : `${formatPlanPrice(numAmount)} Airtime purchased successfully for ${phoneNumber}!`,
        );
        setSuccessData({
          category: "Airtime",
          productName: `${netName} Airtime`,
          network: netName,
          amount: numAmount,
          cashbackApplied: Number(res.cashbackApplied ?? fundingMeta?.cashbackApplied ?? 0),
          walletContribution: Number(res.walletContribution ?? fundingMeta?.walletContribution ?? numAmount),
          cashbackEarned: earnedCb,
          customerId: phoneNumber,
          tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
          bonusToEarn: earnedCb > 0 ? `${formatCashback(earnedCb)} Cashback` : "₦0 Cashback",
        });
        setPhoneNumber("");
        setAmount("");
        setAutoDetectedNet(null);
        setIsConfirmationOpen(false);
        setIsSuccessOpen(true);
        return true;
      } else if (res?.status === "pending") {
        toast.info(
          res.message ||
            `Airtime order is processing with provider (Ref: ${res.tx_ref}). Cashback will be credited once completed.`,
          { duration: 7000 },
        );
        setPhoneNumber("");
        setAmount("");
        setIsConfirmationOpen(false);
        return true;
      } else if (res?.status === "provider_error") {
        setFailedData({
          category: "Airtime",
          productName: `${netName} Airtime`,
          network: netName,
          amount: numAmount,
          customerId: phoneNumber,
          tx_ref: res.tx_ref || `PWK_${Date.now()}`,
          reason:
            res.message ||
            "We're experiencing temporary maintenance on our provider gateway. Your PayWaka wallet was NOT charged.",
          refunded: true,
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      } else {
        setFailedData({
          category: "Airtime",
          productName: `${netName} Airtime`,
          network: netName,
          amount: numAmount,
          customerId: phoneNumber,
          tx_ref: res?.tx_ref || `PWK_${Date.now()}`,
          reason: res?.message || "Airtime purchase failed. Please check your balance.",
          refunded: Boolean(res?.refunded !== false),
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      }
    } catch (err) {
      const errMsg = err?.message || "";
      if (/pin|lockout|attempt/i.test(errMsg)) {
        throw err;
      }
      toast.error(err.message || "Error completing airtime purchase");
      setIsConfirmationOpen(false);
      return false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Unified Page Header */}
        <div>
          <h1 className="pw-page-title">Buy Airtime</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Recharge any Nigerian mobile line with instant delivery and cashback.
          </p>
        </div>

        {/* 2-Column Desktop Layout: 560px Form Left, Sticky Summary & Stats Right */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-5 items-start">
          {/* Purchase Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>Airtime Purchase</CardTitle>
              <CardDescription>
                Enter recipient phone number and recharge amount
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="airtime-phone" className="pw-label">
                    Phone Number
                  </Label>
                  {autoDetectedNet && (
                    <span className="pw-chip-brand text-[10px]">
                      Detected: {autoDetectedNet}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    id="airtime-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={11}
                    placeholder="08012345678"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="pl-10 h-11 text-[13px] sm:text-sm font-mono tracking-wide"
                  />
                </div>
              </div>

              {/* Network Selection */}
              <div className="space-y-2">
                <Label className="pw-label block">Network Provider</Label>
                <NetworkPicker
                  value={selectedNetwork}
                  onChange={(net) => handleNetworkSelect(net, false)}
                  sublabelFn={getNetworkBadgeLabel}
                />
              </div>

              {/* Amount Selection (3 per row, monospace, brand selected) */}
              <div className="space-y-3">
                <Label htmlFor="airtime-amount" className="pw-label block">
                  Amount
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((quickAmount) => {
                    const isSelected = amount === quickAmount.toString();
                    return (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => setAmount(quickAmount.toString())}
                        className={cn(
                          "pw-pressable min-h-11 rounded-panel border pw-num text-sm font-bold transition-all",
                          isSelected
                            ? "bg-brand-500 border-brand-500 text-brand-foreground shadow-[0_10px_22px_-10px_hsl(var(--brand-500)/0.6)]"
                            : "pw-panel text-foreground hover:border-brand-400/40",
                        )}
                      >
                        {formatPlanPrice(quickAmount)}
                      </button>
                    );
                  })}
                </div>
                <FormattedAmountInput
                  id="airtime-amount"
                  name="amount"
                  value={amount}
                  onChange={(cleanVal) => setAmount(cleanVal)}
                  placeholder="Custom amount (min ₦50)"
                />
              </div>

              {estimatedAirtimePricing && !estimatedAirtimePricing.valid && (
                <p className="text-caption font-semibold text-destructive">
                  {estimatedAirtimePricing.error}
                </p>
              )}

              <Button
                type="button"
                onClick={() => handleBuyNow(amount)}
                disabled={
                  !selectedNetwork ||
                  !phoneNumber ||
                  !amount ||
                  isLoading ||
                  click
                }
                className="w-full h-11"
              >
                {isLoading ? "Processing..." : "Continue"}
              </Button>
            </CardContent>
          </Card>

          {/* Right Column: Sticky Order Summary + Quick Stats + Recent */}
          <div className="space-y-6 lg:sticky lg:top-20">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Live breakdown before confirmation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReceiptRows>
                  <ReceiptRow label="Network" value={selectedNetwork || "Not selected"} />
                  <ReceiptRow label="Recipient" value={phoneNumber || "Not entered"} mono />
                  <ReceiptRow
                    label="Amount"
                    value={Number(amount || 0) > 0 ? formatNaira(amount) : "₦0.00"}
                    mono
                  />
                </ReceiptRows>

                {estimatedAirtimePricing?.valid &&
                  estimatedAirtimePricing.cashbackGiven > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-caption text-muted-foreground">
                        Estimated Reward
                      </span>
                      <ReceiptCashbackChip
                        amount={estimatedAirtimePricing.cashbackGiven}
                      />
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
                    label="Total Airtime"
                    value={formatNaira(weeklyData?.amount || 0)}
                    mono
                  />
                  <ReceiptRow
                    label="Transactions"
                    value={String(weeklyData?.noTransactions || 0)}
                    mono
                  />
                </ReceiptRows>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Recent Airtime</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {airtimeData && airtimeData.length > 0 ? (
                  airtimeData.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="pw-panel p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {transaction.network || "Airtime"}
                        </p>
                        <p className="pw-num text-caption text-muted-foreground">
                          {maskPhone(transaction.phone)} · {timeAgo(transaction.createdAt, now)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="pw-num text-sm font-bold text-foreground">
                          {formatNaira(transaction.amount || 0)}
                        </p>
                        <ReceiptStatusPill
                          status={transaction.status}
                          label={String(transaction.status || "COMPLETED").toUpperCase()}
                          className="text-[9px] px-2 py-0.5"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <StateView
                    compact
                    icon={Receipt}
                    title="No recent airtime"
                    description="Your airtime recharges will appear here."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PaymentConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => {
          setClick(false);
          setIsConfirmationOpen(false);
        }}
        onConfirm={handleConfirmAirtimePayment}
        billPricingConfig={billPricingConfig}
        paymentDetails={{
          ...transactions,
          price: Number(amount || 0),
          customerID: phoneNumber,
          billType: "airtime",
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
    </DashboardLayout>
  );
}

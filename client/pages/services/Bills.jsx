import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Tv, Droplets, Wifi, Clock } from "lucide-react";
import { useSpinner } from "@/components/SpinnerProvider";
import { useDispatch, useSelector } from "react-redux";
import useCloudfunc from "@/components/useCloudfunc";
import { selectedPrice } from "@/Features/userSlice";
import PaymentConfirmation from "../PaymentConfirmation";
import PaymentSuccessfulModal from "@/components/PaymentSuccessfulModal";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";
import { useBillsStat } from "../../components/useTransactionFetch";
import { interval } from "../../components/functionalities";

export default function BillsPage() {
  const { timeAgo, now } = interval();
  const [selectedBillType, setSelectedBillType] = useState("electricity");
  const [money, setMoney] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("01"); // 01 = Prepaid, 02 = Postpaid
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [mount, setMount] = useState(false);
  const { appContext, setAppContext } = useSpinner();
  const transactions = useSelector((state) => state.user.transactions);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [isFailedOpen, setIsFailedOpen] = useState(false);
  const [failedData, setFailedData] = useState({});
  const { cable, purchaseElectricity, purchaseCable, purchaseData } = useCloudfunc();
  const { utilityData, utilityMonthlyData } = useBillsStat();
  const dispatch = useDispatch();

  const validateCustomer = httpsCallable(functions, "validateCustomer");

  const billTypes = [
    {
      id: "electricity",
      name: "Electricity",
      icon: Zap,
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      id: "cable",
      name: "Cable TV",
      icon: Tv,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      id: "water",
      name: "Water",
      icon: Droplets,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      id: "internet",
      name: "Internet",
      icon: Wifi,
      color: "text-green-600 dark:text-green-400",
    },
  ];

  const providers = {
    electricity: [
      { id: "01", name: "Ikeja Electric (IKEDC)" },
      { id: "02", name: "Eko Electricity (EKEDC)" },
      { id: "03", name: "Abuja Electricity (AEDC)" },
      { id: "04", name: "Kano Electricity (KEDCO)" },
      { id: "05", name: "Port Harcourt Electric (PHED)" },
      { id: "06", name: "Ibadan Electricity (IBEDC)" },
      { id: "07", name: "Kaduna Electricity (KAEDCO)" },
      { id: "08", name: "Jos Electricity (JED)" },
      { id: "09", name: "Enugu Electricity (EEDC)" },
      { id: "10", name: "Benin Electricity (BEDC)" },
      { id: "11", name: "Aba Power (APLE)" },
    ],
    cable: [
      { id: "01", name: "DSTV", billerCode: "BIL119" },
      { id: "02", name: "GOtv", billerCode: "BIL120" },
      { id: "03", name: "StarTimes", billerCode: "BIL123" },
      { id: "04", name: "Showmax", billerCode: "BIL125" },
    ],
    water: [
      { id: "lagos-water", name: "Lagos Water Corporation" },
      { id: "abuja-water", name: "FCT Water Board" },
    ],
    internet: [
      { id: "spectranet", name: "Spectranet Broadband" },
      { id: "smile", name: "Smile Internet" },
      { id: "mtn-fiber", name: "MTN Broadband / Fiber" },
      { id: "airtel-fiber", name: "Airtel Fiber" },
    ],
  };

  const user = useSelector((state) => state?.user?.user) || {};
  const walletBalance = Number(user.walletBalance || 0);

  const handlePayment = async () => {
    if (!selectedBillType || !selectedProvider || !meterNumber || !amount) {
      return toast.warning("Please fill out all required bill details before proceeding.");
    }
    const numAmount = Number(amount || 0);
    if (numAmount <= 0) {
      return toast.warning("Please enter a valid amount greater than ₦0.");
    }
    if (walletBalance < numAmount) {
      return toast.error(`Insufficient PayWaka wallet balance (₦${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Please top up your wallet to proceed.`);
    }
    dispatch(
      selectedPrice({
        customerID: meterNumber,
        amount: numAmount,
        price: numAmount,
        network: providers[selectedBillType]?.find((p) => p.id === selectedProvider)?.name || selectedProvider,
        productName: selectedBillType === "electricity" ? "Electricity" : selectedBillType === "cable" ? "Cable" : "Internet",
      }),
    );
    setIsConfirmationOpen(true);
  };

  const handleConfirmBillPayment = async (pin) => {
    const providerName = providers[selectedBillType]?.find((p) => p.id === selectedProvider)?.name || selectedProvider;
    const numAmount = Number(amount || 0);

    try {
      if (!numAmount || numAmount <= 0) {
        toast.error("Please enter a valid amount.");
        return false;
      }
      if (!meterNumber) {
        toast.error("Please enter a valid account / meter / smartcard number.");
        return false;
      }
      if (walletBalance < numAmount) {
        toast.error(`Insufficient PayWaka wallet balance (₦${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Please add funds to proceed.`);
        setFailedData({
          category: selectedBillType === "electricity" ? "Electricity Bill" : selectedBillType === "cable" ? "Cable TV" : "Internet Service",
          productName: `${providerName} ${selectedBillType === "electricity" ? `(${meterType === "02" ? "Postpaid" : "Prepaid"})` : ""}`,
          network: providerName,
          amount: numAmount,
          customerId: meterNumber,
          tx_ref: `PWK_${Date.now()}`,
          reason: `Insufficient PayWaka wallet balance. You have ₦${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} but this bill costs ₦${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Please add funds to your wallet.`,
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
          pin,
        });
        console.log("🔌 [Bills Page - Electricity Purchase Response]:", res);

        if (res?.status === "success") {
          toast.success("Electricity bill paid successfully!");
          setSuccessData({
            category: "Electricity Bill",
            productName: `${providerName} (${meterType === "02" ? "Postpaid" : "Prepaid"})`,
            network: providerName,
            amount: numAmount,
            customerId: meterNumber,
            tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
            token: res.token || res.data?.token || res.data?.pin || "",
            bonusToEarn: "50 NGN",
          });
          setMeterNumber("");
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
          pin,
        });
        console.log("📺 [Bills Page - Cable TV Purchase Response]:", res);

        if (res?.status === "success") {
          toast.success("Cable TV subscription paid successfully!");
          setSuccessData({
            category: "Cable TV",
            productName: `${providerName} TV`,
            network: providerName,
            amount: numAmount,
            customerId: meterNumber,
            tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
            bonusToEarn: "50 NGN",
          });
          setMeterNumber("");
          setAmount("");
          setSelectedPackage("");
          setIsConfirmationOpen(false);
          setIsSuccessOpen(true);
          return true;
        }
      } else if (selectedBillType === "internet") {
        res = await purchaseData({
          network: selectedProvider.toUpperCase(),
          plan: selectedPackage || "Internet Package",
          phone: meterNumber,
          amount: numAmount,
          pin,
        });
        console.log("📶 [Bills Page - Internet Purchase Response]:", res);

        if (res?.status === "success") {
          toast.success("Internet bundle activated successfully!");
          setSuccessData({
            category: "Internet Service",
            productName: `${providerName} Broadband`,
            network: providerName,
            amount: numAmount,
            customerId: meterNumber,
            tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
            bonusToEarn: "50 NGN",
          });
          setMeterNumber("");
          setAmount("");
          setSelectedPackage("");
          setIsConfirmationOpen(false);
          setIsSuccessOpen(true);
          return true;
        }
      }

      if (res?.status === "provider_error") {
        setFailedData({
          category: selectedBillType === "electricity" ? "Electricity Bill" : selectedBillType === "cable" ? "Cable TV" : "Internet Service",
          productName: `${providerName} ${selectedBillType === "electricity" ? `(${meterType === "02" ? "Postpaid" : "Prepaid"})` : ""}`,
          network: providerName,
          amount: numAmount,
          customerId: meterNumber,
          tx_ref: res.tx_ref || `PWK_${Date.now()}`,
          reason: res.message || "Temporary maintenance on provider gateway. Your PayWaka wallet was not charged (or has been refunded).",
          refunded: true,
        });
        setIsConfirmationOpen(false);
        setIsFailedOpen(true);
        return false;
      } else {
        setFailedData({
          category: selectedBillType === "electricity" ? "Electricity Bill" : selectedBillType === "cable" ? "Cable TV" : "Internet Service",
          productName: `${providerName} ${selectedBillType === "electricity" ? `(${meterType === "02" ? "Postpaid" : "Prepaid"})` : ""}`,
          network: providerName,
          amount: numAmount,
          customerId: meterNumber,
          tx_ref: res?.tx_ref || `PWK_${Date.now()}`,
          reason: res?.message || "Bill payment could not be completed. Please verify your account/meter number and balance.",
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
      const cleanErrMsg = err.message?.includes("Insufficient PayWaka wallet balance")
        ? err.message
        : err.message || "An unexpected error occurred while communicating with the billing gateway.";

      setFailedData({
        category: selectedBillType === "electricity" ? "Electricity Bill" : selectedBillType === "cable" ? "Cable TV" : "Internet Service",
        productName: `${providerName || "Service Bill"}`,
        network: providerName || "Provider",
        amount: Number(amount || 0),
        customerId: meterNumber,
        tx_ref: `PWK_${Date.now()}`,
        reason: cleanErrMsg,
        refunded: !cleanErrMsg.includes("Insufficient PayWaka wallet balance"),
      });
      setIsConfirmationOpen(false);
      setIsFailedOpen(true);
      return false;
    }
  };

  const INTERNET_PACKAGES_MAP = {
    spectranet: [
      { id: "spectranet-10gb", short_name: "Spectranet 10GB Broadband - ₦3,000", amount: 3000, item_code: "spectranet-10gb" },
      { id: "spectranet-25gb", short_name: "Spectranet 25GB Broadband - ₦6,000", amount: 6000, item_code: "spectranet-25gb" },
      { id: "spectranet-50gb", short_name: "Spectranet 50GB Broadband - ₦10,000", amount: 10000, item_code: "spectranet-50gb" },
      { id: "spectranet-100gb", short_name: "Spectranet 100GB Broadband - ₦18,000", amount: 18000, item_code: "spectranet-100gb" },
      { id: "spectranet-unlimited", short_name: "Spectranet Unlimited Broadband - ₦25,000", amount: 25000, item_code: "spectranet-unlimited" },
    ],
    smile: [
      { id: "smile-3gb", short_name: "Smile 3GB BigValue Internet - ₦1,500", amount: 1500, item_code: "smile-3gb" },
      { id: "smile-5gb", short_name: "Smile 5GB BigValue Internet - ₦2,500", amount: 2500, item_code: "smile-5gb" },
      { id: "smile-10gb", short_name: "Smile 10GB BigValue Internet - ₦4,000", amount: 4000, item_code: "smile-10gb" },
      { id: "smile-20gb", short_name: "Smile 20GB BigValue Internet - ₦7,500", amount: 7500, item_code: "smile-20gb" },
      { id: "smile-unlimited", short_name: "Smile Unlimited Premium Internet - ₦18,000", amount: 18000, item_code: "smile-unlimited" },
    ],
    "mtn-fiber": [
      { id: "mtn-fiber-15gb", short_name: "MTN Broadband / Fiber 15GB - ₦3,500", amount: 3500, item_code: "mtn-fiber-15gb" },
      { id: "mtn-fiber-45gb", short_name: "MTN Broadband / Fiber 45GB - ₦8,000", amount: 8000, item_code: "mtn-fiber-45gb" },
      { id: "mtn-fiber-100gb", short_name: "MTN Broadband / Fiber 100GB - ₦15,000", amount: 15000, item_code: "mtn-fiber-100gb" },
      { id: "mtn-fiber-200gb", short_name: "MTN Broadband / Fiber 200GB - ₦25,000", amount: 25000, item_code: "mtn-fiber-200gb" },
    ],
    "airtel-fiber": [
      { id: "airtel-fiber-20gb", short_name: "Airtel Fiber Internet 20GB - ₦5,000", amount: 5000, item_code: "airtel-fiber-20gb" },
      { id: "airtel-fiber-50gb", short_name: "Airtel Fiber Internet 50GB - ₦10,000", amount: 10000, item_code: "airtel-fiber-50gb" },
      { id: "airtel-fiber-100gb", short_name: "Airtel Fiber Internet 100GB - ₦18,000", amount: 18000, item_code: "airtel-fiber-100gb" },
      { id: "airtel-fiber-200gb", short_name: "Airtel Fiber Internet 200GB - ₦30,000", amount: 30000, item_code: "airtel-fiber-200gb" },
    ],
  };

  const currentPackages =
    selectedBillType === "internet"
      ? INTERNET_PACKAGES_MAP[selectedProvider] || []
      : Array.isArray(transactions?.billsInfo)
        ? transactions.billsInfo
        : [];

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pay Bills</h1>
            <p className="text-muted-foreground">
              Pay your utility bills quickly and securely
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Form */}
            <div className="lg:col-span-2">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    Bill Payment
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Select bill type and enter your details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bill Type */}
                  <div className="space-y-3">
                    <Label className="text-foreground">Bill Type</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {billTypes.map((billType) => (
                        <button
                          key={billType.id}
                          disabled={billType.id === "water"}
                          type="button"
                          onClick={() => {
                            setSelectedBillType(billType.id);
                            setSelectedProvider("");
                            setSelectedPackage("");
                            setAmount("");
                            dispatch(billerInfo({ billsInfo: [] }));
                          }}
                          className={`p-4 rounded-lg border-2 transition-all relative ${selectedBillType === billType.id
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-border bg-card hover:bg-muted"
                            }`}
                        >
                          {billType.id === "water" ? (
                            <div className="absolute inset-0 m-auto text-xs bg-black/10 backdrop-blur-sm text-green-400 rounded-lg place-content-center">
                              Coming Soon
                            </div>
                          ) : null}
                          <billType.icon
                            className={`h-6 w-6 mx-auto mb-2 ${billType.color}`}
                          />
                          <div className="font-medium text-foreground text-sm">
                            {billType.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Provider */}
                  {selectedBillType && (
                    <div className="space-y-2">
                      <Label className="text-foreground">
                        Service Provider
                      </Label>
                      <Select
                        value={selectedProvider}
                        onValueChange={async (value) => {
                          setSelectedProvider(value);
                          setSelectedPackage("");
                          setAmount("");
                          if (selectedBillType === "cable") {
                            setAppContext((prev) => ({ ...prev, spinner: true }));
                            let provider = providers[selectedBillType].find(
                              (item) => item.id === value,
                            );

                            if (provider) {
                              try {
                                await cable(
                                  null,
                                  null,
                                  provider.billerCode || provider.id,
                                  "cable",
                                  provider.name || provider.id,
                                );
                              } finally {
                                setAppContext((prev) => ({ ...prev, spinner: false }));
                              }
                            }
                          } else if (selectedBillType === "internet") {
                            await internetPackages(value);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {providers[selectedBillType]?.map((provider) => (
                            <SelectItem
                              key={provider.id}
                              value={provider.id}
                              className="text-foreground hover:bg-muted"
                            >
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Meter Type Selector for Electricity */}
                  {selectedBillType === "electricity" && selectedProvider && (
                    <div className="space-y-2">
                      <Label className="text-foreground">Meter Type</Label>
                      <Select
                        value={meterType}
                        onValueChange={(val) => setMeterType(val)}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select meter type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="01" className="text-foreground hover:bg-muted">
                            Prepaid (Token)
                          </SelectItem>
                          <SelectItem value="02" className="text-foreground hover:bg-muted">
                            Postpaid (Bill)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Meter/Account Number */}
                  {selectedProvider && (
                    <div className="space-y-2">
                      <Label htmlFor="meter" className="text-foreground">
                        {selectedBillType === "electricity"
                          ? "Meter Number"
                          : selectedBillType === "cable"
                            ? "Decoder Number"
                            : selectedBillType === "water"
                              ? "Account Number"
                              : "User / Device ID / Phone Number"}
                      </Label>
                      <Input
                        id="meter"
                        type="text"
                        placeholder={`Enter your ${selectedBillType === "electricity"
                            ? "meter number"
                            : selectedBillType === "cable"
                              ? "decoder number"
                              : "account or phone number"
                          }`}
                        value={meterNumber}
                        onChange={(e) => setMeterNumber(e.target.value)}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  )}

                  {/* Cable & Internet Package Selector */}
                  {(selectedBillType === "cable" || selectedBillType === "internet") && selectedProvider !== "" && (
                    <div className="space-y-2">
                      <Label htmlFor="package" className="text-foreground">
                        Package
                      </Label>
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
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select package" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {currentPackages.map((packages, idx) => (
                            <SelectItem
                              key={`${packages.id || packages.item_code || "pkg"}-${idx}`}
                              value={String(packages.id || packages.item_code)}
                              className="text-foreground hover:bg-muted"
                            >
                              {packages.short_name || `${packages.name || "Package"} - ₦${Number(packages.amount || 0).toLocaleString()}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Amount (Only shown for Electricity & Water, NOT for Cable TV or Internet) */}
                  {selectedProvider && selectedBillType !== "cable" && selectedBillType !== "internet" && (
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-foreground">
                        Amount (₦)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Enter amount (e.g. 1000)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  )}

                  {/* Summary */}
                  {selectedBillType && selectedProvider && amount && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Bill Type:
                        </span>
                        <span className="text-foreground font-medium">
                          {
                            billTypes.find((b) => b.id === selectedBillType)
                              ?.name
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="text-foreground font-medium">
                          {
                            providers[selectedBillType]?.find(
                              (p) => p.id === selectedProvider,
                            )?.name
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="text-foreground font-medium">
                          ₦{Number.parseInt(amount || "0").toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Service Fee:
                        </span>
                        <span className="text-foreground font-medium">₦0</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                        <span className="text-foreground">Total:</span>
                        <span className="text-foreground">
                          ₦{Number.parseInt(amount || "0").toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePayment}
                    disabled={
                      !selectedBillType ||
                      !selectedProvider ||
                      !meterNumber ||
                      !amount ||
                      isLoading
                    }
                    className="w-full bg-green-600 hover:bg-green-700 text-foreground"
                  >
                    {isLoading ? "Processing Payment..." : "Pay Bill"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">This Month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bills Paid</span>
                    <span className="font-semibold text-foreground">
                      {utilityMonthlyData?.noTransactions || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold text-foreground">
                      {(utilityMonthlyData?.amount || 0).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Bills */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Recent Bills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {utilityData?.slice(0, 5).map((bill, index) => (
                    <div
                      key={bill.id || index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <div className="font-medium text-foreground">
                          {bill.billType || bill.type || "Utility"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {bill.provider}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          {(bill.amount || 0).toLocaleString("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          })}
                        </div>
                        <Badge
                          className={
                            bill.status === "successful" || bill.status === "Completed"
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          }
                        >
                          {bill.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
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
        paymentDetails={{
          customerID: meterNumber,
          price: Number(amount),
          amount: Number(amount),
          productName: selectedBillType === "electricity" ? "Electricity" : selectedBillType === "cable" ? "Cable" : "Internet",
          network: providers[selectedBillType]?.find(p => p.id === selectedProvider)?.name || selectedProvider,
          biller_name: `${selectedBillType.toUpperCase()} - ${providers[selectedBillType]?.find(p => p.id === selectedProvider)?.name || selectedProvider}`
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

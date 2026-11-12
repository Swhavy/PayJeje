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
import PaymentConfirmation from "@/pages/PaymentConfirmation";
import PaymentSuccessfulModal from "@/components/PaymentSuccessfulModal";
import { Smartphone, Clock } from "lucide-react";
import useCloudfunc from "@/components/useCloudfunc";
import { useDispatch, useSelector } from "react-redux";
import { selectedPrice } from "@/Features/userSlice";
import { useNavigate } from "react-router-dom";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";
import { useBillsStat } from "../../components/useTransactionFetch";
import { interval } from "../../components/functionalities";
import PaymentFailedModal from "@/components/PaymentFailedModal";

export default function AirtimePage() {
  //use This to update Recent Transactions in the sidebar with real data from Firestore
  //weeklyData contains the total amount of transactions for the week and amount spent so far
  const { airtimeData, weeklyData } = useBillsStat();

  const transactions = useSelector((state) => state.user.transactions);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [currentPaymentDetails, setCurrentPaymentDetails] = useState({
    price: "",
    bonusToEarn: "",
    cashbackAmount: "",
    initialUseCashback: false,
  });
  const dispatch = useDispatch();
  const [airtimePlans, setAirtimePlans] = useState(null);
  const [mount, setMount] = useState(false);
  const [click, setClick] = useState(false);
  const { biller, purchaseAirtime } = useCloudfunc();
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [isFailedOpen, setIsFailedOpen] = useState(false);
  const [failedData, setFailedData] = useState({});
  const { timeAgo, now } = interval();

  //used to mask phone number in recent transactions
  function maskPhone(phone) {
    const str = String(phone);
    return str.slice(0, 3) + "****" + str.slice(-4);
  }

  const networks = [
    { id: "mtn", name: "MTN", logo: "🟡", discount: "2%" },
    { id: "glo", name: "GLO", logo: "🟢", discount: "3%" },
    { id: "airtel", name: "AIRTEL", logo: "🔴", discount: "2.5%" },
    { id: "9mobile", name: "9MOBILE", logo: "🟣", discount: "4%" },
  ];

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const recentTransactions = [
    {
      id: 1,
      network: "MTN",
      amount: "₦1,000",
      phone: "080****1234",
      status: "Completed",
      time: "2 mins ago",
    },
    {
      id: 2,
      network: "Glo",
      amount: "₦2,000",
      phone: "081****5678",
      status: "Completed",
      time: "1 hour ago",
    },
    {
      id: 3,
      network: "Airtel",
      amount: "₦500",
      phone: "070****9012",
      status: "Failed",
      time: "2 hours ago",
    },
  ];

  const handleBuyNow = (price) => {
    if (!selectedNetwork || !phoneNumber || !price) {
      return toast.warning("Please select a network, enter a phone number, and enter amount.");
    }
    const netName = selectedNetwork?.id ? selectedNetwork.id.toUpperCase() : String(selectedNetwork).toUpperCase();
    dispatch(
      selectedPrice({
        productName: "Airtime",
        network: netName,
        billType: "airtime",
        price: price,
        customerID: phoneNumber,
        bonusToEarn: "10 NGN",
      })
    );
    setClick(true);
    setIsConfirmationOpen(true);
  };

  const onPaymentConfirmation = async () => {
    const res = await validateCustomer({
      itemCode: transactions.itemCode,
      customerID: phoneNumber,
    });
    //console.log("validateCustomer response:", res);
    if (res.data.status == "error") {
      setClick(false);
      console.log("Customer:", res.data.message);
      //toast.error("Customer validation failed.");
      throw new Error("Customer validation failed");
    } else if (
      res.data.status === "success" &&
      selectedNetwork.toUpperCase() == res.data.provider
    ) {
      dispatch(
        selectedPrice({
          billType: "airtime",
          price: amount,
          customerID: phoneNumber,
          bonusToEarn: ((2 / price) * 100).toFixed(2) + " NGN",
          // cashbackAmount: transactions.cashbackAmount,
          //initialUseCashback: false,
        }),
      );
      setClick(false);
      return true;
    } else if (selectedNetwork.toUpperCase() != res.data.provider) {
      setClick(false);
      // toast.error(
      //   "The phone number does not match the selected network, as it links to a " +
      //     res.data.provider +
      //     " network.",
      // );
      throw new Error("The phone number provided doesn't match the network");
    } else "";
  };

  // useEffect(() => {
  //     console.log("useEffect pre", spin);
  //     if (mount) {
  //       console.log("useEffect before", spin);
  //       setAirtimePlans(transactions.billsInfo);
  //       setSpin(false);
  //       // setTimeout(() => {
  //       //   setSpin(false);
  //       //   console.log("spin ended:", spin);
  //       // }, 2000);
  //       return console.log("useEffect after", spin);
  //     }
  //     setMount(true);
  //   }, [transactions.billsInfo]);

  const handleConfirmAirtimePayment = async (pin) => {
    try {
      const netName = selectedNetwork?.id ? selectedNetwork.id.toUpperCase() : String(selectedNetwork || "MTN").toUpperCase();
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        toast.error("Please enter a valid amount.");
        return false;
      }
      if (!phoneNumber || phoneNumber.length < 11) {
        toast.error("Please enter a valid 11-digit phone number.");
        return false;
      }

      const res = await purchaseAirtime({
        network: netName,
        phone: phoneNumber,
        amount: numAmount,
        pin,
      });

      if (res?.status === "success") {
        toast.success(`₦${numAmount.toLocaleString()} Airtime purchased successfully for ${phoneNumber}!`);
        setSuccessData({
          category: "Airtime",
          productName: `${netName} Airtime`,
          network: netName,
          amount: numAmount,
          customerId: phoneNumber,
          tx_ref: res.tx_ref || res.data?.requestid || `PWK_${Date.now()}`,
          bonusToEarn: "10 NGN",
        });
        setPhoneNumber("");
        setAmount("");
        setIsConfirmationOpen(false);
        setIsSuccessOpen(true);
        return true;
      } else if (res?.status === "provider_error") {
        toast.error(res.message || "We're experiencing temporary service maintenance on our provider gateway. Your PayWaka wallet was NOT charged. Please try again shortly!", { duration: 7000 });
        setIsConfirmationOpen(false);
        return false;
      } else {
        toast.error(res?.message || "Airtime purchase failed. Please check your balance.");
        setIsConfirmationOpen(false);
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
      {/* Payment Confirmation Dialog */}
      <PaymentConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => {
          setClick(false);
          setIsConfirmationOpen(false)
        }}
        onConfirm={handleConfirmAirtimePayment}
        paymentDetails={{ ...transactions, price: amount, customerID: phoneNumber, billType: "airtime" }}
      />

      <PaymentSuccessfulModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        data={successData}
      />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buy Airtime</h1>
          <p className="text-muted-foreground">
            Purchase airtime for any network with instant delivery
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Purchase Form */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Airtime Purchase
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Select network and enter details to buy airtime
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Network Selection */}
                <div className="space-y-3">
                  <Label className="text-foreground">Select Network</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {networks.map((network) => (
                      <button
                        key={network.id}
                        onClick={async () => {
                          setSelectedNetwork((prev) => (prev = network.id));
                          //console.log("spin began:", spin);
                          const billStat = await biller(
                            network.name,
                            "Airtime",
                          );
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${selectedNetwork === network.id
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-border bg-card hover:bg-muted"
                          }`}
                      >
                        <div className="text-2xl mb-2">{network.logo}</div>
                        <div className="font-medium text-foreground">
                          {network.name}
                        </div>
                        <Badge className="mt-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                          {network.discount} off
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="number"
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="080 1234 5678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Amount Selection */}
                <div className="space-y-3">
                  <Label className="text-foreground">Amount</Label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                    {quickAmounts.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        variant={
                          amount === quickAmount.toString()
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setAmount(quickAmount.toString())}
                        className={
                          amount === quickAmount.toString()
                            ? "bg-green-600 hover:bg-green-700 text-foreground"
                            : "border-border text-foreground hover:bg-muted"
                        }
                      >
                        ₦{quickAmount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Enter custom amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Purchase Summary */}
                {selectedNetwork && amount && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Network:</span>
                      <span className="text-foreground font-medium">
                        {networks.find((n) => n.id === selectedNetwork)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="text-foreground font-medium">
                        ₦{Number.parseInt(amount || "0").toLocaleString()}
                      </span>
                    </div>
                    {/*  <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        -
                        {
                          networks.find((n) => n.id === selectedNetwork)
                            ?.discount
                        }
                      </span>
                    </div> */}
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                      <span className="text-foreground">Total:</span>
                      <span className="text-foreground">
                        ₦{Number.parseInt(amount || "0").toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handleBuyNow(amount)}
                  disabled={
                    !selectedNetwork ||
                    !phoneNumber ||
                    !amount ||
                    isLoading ||
                    click
                  }
                  className="w-full bg-green-600 hover:bg-green-700 text-foreground disabled:opacity-50"
                >
                  {isLoading ? "Processing..." : "Buy Airtime"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">This Month</span>
                  <span className="font-semibold text-foreground">
                    ₦ {weeklyData.amount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-semibold text-foreground">
                    {weeklyData.noTransactions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Savings</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ₦450
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {airtimeData.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {transaction.network === "MTN"
                          ? "MTN🟡"
                          : transaction.network === "Glo"
                            ? "Glo🟢"
                            : transaction.network === "Airtel"
                              ? "Airtel🔴"
                              : "9mobile🟣"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {maskPhone(transaction.phone)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {timeAgo(transaction.createdAt, now)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        ₦ {transaction.amount}
                      </div>
                      <Badge
                        className={
                          transaction.status == "completed"
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : transaction.status === "Failed"
                              ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
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
        paymentDetails={{ ...transactions, price: amount, customerID: phoneNumber, billType: "airtime" }}
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

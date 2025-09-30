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
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";

export default function BillsPage() {
  const [selectedBillType, setSelectedBillType] = useState("");
  const [money, setMoney] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [mount, setMount] = useState(false);
  const { appContext, setAppContext } = useSpinner();
  const transactions = useSelector((state) => state.user.transactions);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { cable } = useCloudfunc();
  const dispatch = useDispatch();

  useEffect(() => {
    //cloud function to fetch bills
    connectFunctionsEmulator(functions, "localHost", 5001);
  }, []);

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
      { id: "ekedc", name: "Eko Electricity (EKEDC)" },
      { id: "ikedc", name: "Ikeja Electric (IKEDC)" },
      { id: "aedc", name: "Abuja Electricity (AEDC)" },
      { id: "phed", name: "Port Harcourt Electric (PHED)" },
    ],
    cable: [
      { id: "dstv", name: "DSTV", billerCode: "BIL119" },
      { id: "dstv box office", name: "DSTV BOX OFFICE", billerCode: "BIL125" },
      { id: "gotv", name: "GOtv", billerCode: "BIL120" },
      { id: "startimes", name: "StarTimes", billerCode: "BIL123" },
      //{ id: "showmax", name: "Showmax" },
      { id: "mytv", name: "MyTV", billerCode: "BIL128" },
      { id: "hitv", name: "HiTV", billerCode: "BIL129" },
      // {
      //   id: "daarsat communications",
      //   name: "DAARSAT Communications",
      //   billerCode: "BIL123",
      // },
    ],
    water: [
      { id: "lagos-water", name: "Lagos Water Corporation" },
      { id: "abuja-water", name: "FCT Water Board" },
    ],
    internet: [
      { id: "mtn-fiber", name: "MTN Fiber" },
      { id: "airtel-fiber", name: "Airtel Fiber" },
      { id: "spectranet", name: "Spectranet" },
    ],
  };

  const recentBills = [
    {
      id: 1,
      type: "Electricity",
      provider: "EKEDC",
      amount: "₦5,500",
      status: "Completed",
      time: "1 hour ago",
    },
    {
      id: 2,
      type: "Cable TV",
      provider: "DSTV",
      amount: "₦4,200",
      status: "Completed",
      time: "2 days ago",
    },
    {
      id: 3,
      type: "Internet",
      provider: "MTN Fiber",
      amount: "₦8,000",
      status: "Pending",
      time: "3 days ago",
    },
  ];

  const handlePayment = async () => {
    if (!selectedBillType || !selectedProvider || !meterNumber || !amount)
      return;
    setIsLoading(true);
    dispatch(
      selectedPrice({
        customerID: meterNumber,
      }),
    );
    setIsConfirmationOpen((prev) => (prev = true));
    setIsLoading(false);
  };

  const newhandlePayment = async () => {
    setIsLoading(true);
    if (!selectedBillType || !selectedProvider || !meterNumber || !amount) {
      setIsLoading(false);
      return toast.warning(
        "Please make sure the necessary details are filled out before proceeding.",
      );
    }

    const response = await validateCustomer({
      itemCode: transactions.itemCode,
      customerID: meterNumber,
    });
    //console.log("validateCustomer response:", res);
    if (response.data.status == "error") {
      setIsLoading(false);
      return toast.error("Customer validation failed.");
    } else if (response.data.status === "success") {
      //validates the customerID/meterNumber against the selected provider
      if (!response.data.provider.includes(selectedProvider.toUpperCase())) {
        setIsLoading(false);
        return toast.error(
          "The decoder number does not match the selected provider, as it links to a " +
            response.data.provider +
            " network.",
        );
      }

      dispatch(
        selectedPrice({
          customerID: meterNumber,
        }),
      );

      setTimeout(() => {
        setIsLoading(false);
        setIsConfirmationOpen(true);
      }, 1000);
      // Simulate purchase
    }

    //////////////
  };

  //useEffect
  useEffect(() => {
    if (mount) setAppContext({ ...appContext, spinner: false });
    else setMount(true);
  }, [transactions.billsInfo]);

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
                          disabled={
                            billType.name === "Electricity" ||
                            billType.name === "Water" ||
                            billType.name === "Internet"
                          }
                          type="button"
                          onClick={() => {
                            setSelectedBillType(billType.id);
                            setSelectedProvider("");
                          }}
                          className={`p-4 rounded-lg border-2 transition-all relative ${
                            selectedBillType === billType.id
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-border bg-card hover:bg-muted"
                          }`}
                        >
                          {billType.name === "Electricity" ||
                          billType.name === "Water" ||
                          billType.name === "Internet" ? (
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
                          if (selectedBillType === "cable") {
                            setAppContext({ ...appContext, spinner: true });
                            let provider = providers[selectedBillType].find(
                              (item) => item.id === value,
                            );

                            if (provider) {
                              setAmount("");
                              let spin = await cable(
                                null,
                                null,
                                provider.billerCode,
                                "cable",
                                provider.id,
                              );
                              spin === false &&
                                setAppContext({
                                  ...appContext,
                                  spinner: false,
                                });
                            }
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
                              : "Customer ID"}
                      </Label>
                      <Input
                        id="meter"
                        type="number"
                        placeholder={`Enter your ${
                          selectedBillType === "electricity"
                            ? "meter"
                            : "account"
                        } number`}
                        value={meterNumber}
                        onChange={(e) => setMeterNumber(e.target.value)}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  )}

                  {/* Cable Package */}
                  {selectedBillType === "cable" && selectedProvider !== "" && (
                    <div className="space-y-2">
                      <Label htmlFor="package" className="text-foreground">
                        {selectedBillType === "cable" && "Package"}
                      </Label>
                      <Select
                        value={selectedPackage}
                        onValueChange={(value) => {
                          setSelectedPackage(value);
                          const packages = transactions?.billsInfo?.filter(
                            (bouquet) => bouquet["short_name"] === value,
                          );
                          if (packages) {
                            setAmount((prev) => (prev = packages[0].amount));
                            //if the amount of the package is 0 then the user has the ability to edit the amount field
                            packages[0].amount === 0 && setMoney(false);
                            packages[0].amount !== 0 && setMoney(true);
                            cable(
                              packages[0].amount,
                              packages[0]["item_code"],
                              null,
                              null,
                              null,
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {transactions?.billsInfo?.map((packages) => (
                            <SelectItem
                              key={packages.id}
                              value={packages.short_name}
                              className="text-foreground hover:bg-muted"
                            >
                              {packages.short_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Amount */}
                  {selectedProvider && (
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-foreground">
                        Amount
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        /* onChange={(e) => setAmount(e.target.value)} */
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                        readOnly
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
                        <span className="text-foreground font-medium">₦50</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                        <span className="text-foreground">Total:</span>
                        <span className="text-foreground">
                          ₦
                          {(
                            Number.parseInt(amount || "0") + 50
                          ).toLocaleString()}
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
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
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
                    <span className="font-semibold text-foreground">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold text-foreground">
                      ₦45,200
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Points Earned</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      1,356
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Bills */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4" />
                    Recent Bills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-foreground">
                          {bill.type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {bill.provider}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {bill.time}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          {bill.amount}
                        </div>
                        <Badge
                          className={
                            bill.status === "Completed"
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
        //onConfirm={handleConfirmPayment}
        paymentDetails={transactions}
      />
    </>
  );
}

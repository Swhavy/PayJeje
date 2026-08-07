import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, DollarSign, Clock, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { selectedPrice } from "@/Features/userSlice";
import PaymentConfirmation from "../PaymentConfirmation";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";

const deduplicateData = (bills) => {
  const seen = new Map();
  if(!bills) return null
  return bills?.filter((item) => {
    const key = `${item.amount}-${item.biller_name}-${item.validity_period}`;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
};

const networks = [
  { id: "MTN", name: "MTN", logo: "🟡", discount: "2%" },
  { id: "GLO", name: "GLO", logo: "🟢", discount: "3%" },
  { id: "AIRTEL", name: "AIRTEL", logo: "🔴", discount: "2.5%" },
  { id: "9MOBILE", name: "9MOBILE", logo: "🟣", discount: "4%" },
];

export default function DataPlans() {
  const transactions = useSelector((state) => state.user.transactions);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [currentPaymentDetails, setCurrentPaymentDetails] = useState({
    price: "",
    bonusToEarn: "",
    cashbackAmount: "",
    initialUseCashback: false,
  });
  const dispatch = useDispatch();
  const [DataPlans, setDataPlans] = useState(null);
  const [mount, setMount] = useState(false);
  const [spin, setSpin] = useState(false);
  const { biller } = useCloudfunc();
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState("mtn");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    //cloud function to fetch bills
    connectFunctionsEmulator(functions, "localHost", 5001);
  }, []);
  const validateCustomer = httpsCallable(functions, "validateCustomer");
  const dataPlans = {
    mtn: [
      { id: "mtn-1gb-7d", data: "1 GB", price: "₦300", validity: "7 Days" },
      { id: "mtn-2gb-30d", data: "2 GB", price: "₦500", validity: "30 Days" },
      { id: "mtn-5gb-30d", data: "5 GB", price: "₦1200", validity: "30 Days" },
      {
        id: "mtn-10gb-30d",
        data: "10 GB",
        price: "₦2500",
        validity: "30 Days",
      },
    ],
    glo: [
      { id: "glo-1gb-7d", data: "1 GB", price: "₦250", validity: "7 Days" },
      { id: "glo-2gb-30d", data: "2 GB", price: "₦450", validity: "30 Days" },
      { id: "glo-5gb-30d", data: "5 GB", price: "₦1100", validity: "30 Days" },
    ],
    airtel: [
      { id: "airtel-1gb-7d", data: "1 GB", price: "₦320", validity: "7 Days" },
      {
        id: "airtel-2gb-30d",
        data: "2 GB",
        price: "₦550",
        validity: "30 Days",
      },
      {
        id: "airtel-5gb-30d",
        data: "5 GB",
        price: "₦1300",
        validity: "30 Days",
      },
    ],
    "9mobile": [
      { id: "9mobile-1gb-7d", data: "1 GB", price: "₦280", validity: "7 Days" },
      {
        id: "9mobile-2gb-30d",
        data: "2 GB",
        price: "₦480",
        validity: "30 Days",
      },
    ],
  };

  //old
  // const handleBuyNow = (plan) => {
  //   if (!phoneNumber) {
  //     toast.warning("Please enter a phone number.");
  //     return;
  //   }
  //   const queryParams = new URLSearchParams({
  //     network: selectedNetwork,
  //     data: plan.data,
  //     price: plan.price,
  //     validity: plan.validity,
  //     phoneNumber: phoneNumber,
  //   }).toString();
  //   navigate(`/services/data-plans/payment?${queryParams}`);
  // };

  //DEDUP
  const Bills = useMemo(
    () => deduplicateData(transactions.billsInfo),
    [transactions.billsInfo],
  );
  //new
  const handleBuyNow = async (price, plan) => {
    setSpin(true);
    if (!selectedNetwork || !phoneNumber || !price || !plan) {
      return toast.warning(
        "Please make sure the necessary details are filled out before proceeding.",
      );
    }
    //validate customer
    const res = await validateCustomer({
      itemCode: transactions.itemCode,
      customerID: phoneNumber,
    });
    //console.log("validateCustomer response:", res);
    if (res.data.status == "error") {
      setSpin(false);
      return toast.error("Customer validation failed.");
    } else if (res.data.status === "success") {
      if (selectedNetwork.toUpperCase() != res.data.provider) {
        setSpin(false);
        return toast.error(
          "The phone number does not match the selected network, as it links to a " +
            res.data.provider +
            " network.",
        );
      }

      dispatch(
        selectedPrice({
          billType: "data",
          price,
          customerID: phoneNumber,
          bonusToEarn: "100 NGN",
          cashbackAmount: "50 NGN",
          plan,
          //initialUseCashback: false,
        }),
      );

      setTimeout(() => {
        setSpin(false);
        setIsConfirmationOpen(true);
      }, 1000);
      // Simulate purchase
    }
    //end
  };

  useEffect(() => {
    console.log("useEffect pre", spin);
    if (mount) {
      console.log("useEffect before", spin);
      setDataPlans(Bills);
      setSpin(false);
      // setTimeout(() => {
      //   setSpin(false);
      //   console.log("spin ended:", spin);
      // }, 2000);
      return console.log("useEffect after", spin);
    }
    setMount(true);
  }, [transactions.billsInfo]);
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 relative">
        {spin && (
          <div className="w-full h-full overflow-hidden bg-black/40 backdrop-blur-md absolute top-0 z-30 flex flex-auto gap-5">
            <div className="w-32 h-32 absolute top-[5%] inset-0 m-auto rounded-full border-2 border-gray-500 border-t-orange-500 border-l-blue-500 border-b-green-400 animate-spin"></div>
          </div>
        )}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Buy Data Plans
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Choose from a variety of data bundles for your network.
            </p>
          </div>
        </div>

        <Card className="w-full max-w-full mx-auto">
          <CardHeader>
            <CardTitle className="text-foreground">Select Data Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <div className="relative">
                <Network className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="phone-number"
                  type="number"
                  placeholder="e.g., 08012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-4">
              <Label className="text-foreground text-lg">Select Network</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {networks.map((networkOption) => (
                  /* Network Card */
                  <Card
                    key={networkOption.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedNetwork === networkOption.id
                        ? "border-green-600 ring-2 ring-green-600"
                        : "border-border hover:border-green-400"
                    }`}
                    onClick={async () => {
                      setSpin(true);
                      console.log("spin began:", spin);
                      setSelectedNetwork(networkOption.id);
                      const billStat = await biller(networkOption.name, "Data");
                      //stop spinner if an error occurs at await biller cloud function
                      if (billStat === false) setSpin(false);
                    }}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-2xl mb-2">{networkOption.logo}</div>
                      <h3 className="font-semibold text-foreground text-base">
                        {networkOption.name}
                      </h3>
                      <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full mt-1">
                        {networkOption.discount}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DataPlans
            ? DataPlans.map((plan) => {
                return (
                  <>
                    <Card key={plan.id} className="flex flex-col">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {
                            plan["biller_name"].match(
                              /(\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB))/i,
                            )?.[1]
                          }{" "}
                          Data
                        </CardTitle>
                        <Wifi className="h-6 w-6 text-blue-500" />
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div className="space-y-2 mb-4">
                          <p className="text-2xl font-bold text-foreground">
                            ₦ {plan.amount}
                          </p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />{" "}
                            {plan["validity_period"]} days
                          </div>
                        </div>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            const dataPlan = plan["biller_name"].match(
                              /(\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB))/i,
                            )?.[1];
                            dispatch(
                              selectedPrice({ itemCode: plan["item_code"] }),
                            );
                            handleBuyNow(plan.amount, dataPlan);
                          }}
                        >
                          Buy Now
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                );
              })
            : "Select a network to view available data plans."}
        </div>

        <div className="mt-8 text-center text-muted-foreground">
          <p>
            Ensure your phone number is correct before purchasing. Data plans
            are non-refundable.
          </p>
        </div>
      </div>
      <PaymentConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        //onConfirm={handleConfirmPayment}
        paymentDetails={transactions}
      />
    </DashboardLayout>
  );
}

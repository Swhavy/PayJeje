import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions, auth } from "@/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Extract transaction details dynamically
const getBillDetails = (transaction) => {
  const typeMap = {
    Airtime: {
      Network: transaction?.network,
      Product: transaction?.productName,
      Amount: `₦ ${transaction?.price}`,
      Mobile_Number: transaction?.customerID,
      BonusToEarn: transaction?.bonusToEarn,
      cashbackAmount: transaction?.cashbackAmount,
    },
    Data: {
      Network: transaction?.network,
      Product: transaction?.productName,
      Plan: transaction?.plan,
      Amount: `₦ ${transaction?.price}`,
      Mobile_Number: transaction?.customerID,
      BonusToEarn: transaction?.bonusToEarn,
      cashbackAmount: transaction?.cashbackAmount,
    },
    Cable: {
      Bill_Type: transaction?.productName,
      Provider: transaction?.network,
      Amount: `₦ ${transaction?.price}`,
      Service_Fee: "₦50",
      bonusToEarn: transaction?.bonusToEarn,
      Total: `₦ ${transaction?.price + 50}`,
    },
    Default: {
      Network: transaction?.network,
      Product: transaction?.productName,
      Plan: transaction?.plan,
      Amount: `₦ ${transaction?.price}`,
      Mobile_Number: transaction?.customerID,
      BonusToEarn: transaction?.bonusToEarn,
      Run: transaction?.cashbackAmount,
      cashbackAmount: transaction?.cashbackAmount,
    },
  };

  const detectedKey =
    Object.keys(typeMap).find((key) =>
      transaction?.productName?.toLowerCase().includes(key.toLowerCase()),
    ) || "Default";

  return typeMap[detectedKey];
};

// Define field labels for each type
const fieldLabels = {
  AIRTIME: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Amount: { label: "Amount" },
    Mobile_Number: { label: "MobileNumber" },
    BonusToEarn: { label: "Bonus To Earn" },
    cashbackAmount: { label: "Use Cashback" },
  },

  DATA: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Plan: { label: "Plan" },
    Amount: { label: "Amount" },
    Mobile_Number: { label: "MobileNumber" },
    BonusToEarn: { label: "Bonus To Earn" },
    cashbackAmount: { label: "Use Cashback" },
  },

  CABLE: {
    Bill_Type: { label: "Bill Type" },
    Provider: { label: "Provider" },
    Amount: { label: "Amount" },
    Service_Fee: { label: "Service Fee" },
    Total: { label: "Total" },
  },

  Default: {
    Network: { label: "Network" },
    Product: { label: "Product" },
    Plan: { label: "Plan" },
    Amount: { label: "Amount" },
    Mobile_Number: { label: "MobileNumber" },
    BonusToEarn: { label: "Bonus To Earn" },
    cashbackAmount: { label: "Use Cashback" },
    Run: { label: "Use runam" },
  },
};

export default function PaymentConfirmation({
  isOpen,
  onClose,
  //onConfirm,
  paymentDetails,
}) {
  //start
  const user = useSelector((state) => state.user.user);
  const transactions = useSelector((state) => state.user.transactions);
  const { userName, userEmail, uid } = user;
  //const [mounted, setMounted] = useState(false);
  const [userID, setUserID] = useState("");
  const [redirect, setRedirect] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  connectFunctionsEmulator(functions, "localHost", 5001);
  const paymentRedirect = httpsCallable(functions, "paymentRedirect");
  const [callBackUrl, setCallBack_URL] = useState("");
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    // const unsub = onAuthStateChanged(auth, async (user) => {
    //   if (uid) {
    //     setUserID(uid);
    //   } else {
    //     console.log("No user is signed in");
    //     navigate("/auth/login");
    //   }
    // });
    if (callBackUrl) {
      window.location.href = callBackUrl;
      //setAppContext({ ...appContext, spinner: false })
    }
  }, [callBackUrl]);

  useEffect(() => {
    setDetails(getBillDetails(paymentDetails));
  }, [paymentDetails]);

  //end
  const pay = async () => {
    try {
      setRedirect(true);
      const res = await paymentRedirect({
        email: userEmail,
        name: userName,
        phonenumber: paymentDetails?.customerID,
        amount: paymentDetails?.price,
        userID: uid,
      });
      if (res.data?.status === "success") {
        toast.success("you are being redirected to payment gateway");
        setCallBack_URL(res.data.data.link);
      } else {
        console.log(res);
        toast.warning("sorry bro an error occurred");
      }
      setRedirect(false);
      console.log(res);
    } catch (err) {
      setRedirect(false);
      toast.error("Error occurred while redirecting");
    }
  };

  // Detect the right label set based on type
  let labels =
    fieldLabels[paymentDetails?.productName?.toUpperCase()] ||
    fieldLabels.Default;

  return (
    <>
      {details && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[425px] h-[30rem] p-6 rounded-lg shadow-xl fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 focus:outline-none overflow-y-auto">
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Confirm Payment
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Please review the details before proceeding.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-foreground">
              {Object.keys(details).map((key) => {
                const des = labels[key];

                if (!des || !details[key] || details[key] === "N/A")
                  return null;
                return (
                  <div key={key} className="flex justify-between items-center">
                    <Label className="text-base font-medium">{des.label}</Label>
                    <span className="text-base font-semibold">
                      {details[key]}
                    </span>
                  </div>
                );
              })}
              {/* <div className="flex justify-between items-center">
            <Label className="text-base font-medium">Product</Label>
            <span className="text-base font-semibold">
              {paymentDetails?.productName}
            </span>
          </div>
          {paymentDetails.productName == "Mobile Data" && (
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Plan</Label>
              <span className="text-base font-semibold">
                {paymentDetails?.plan}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <Label className="text-base font-medium">Amount</Label>
            <span className="text-base font-semibold">
              {paymentDetails?.price}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <Label className="text-base font-medium">Mobile Number</Label>
            <span className="text-base font-semibold">
              {paymentDetails?.customerID}
            </span>
          </div> */}

              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Bonus To Earn</Label>
                <span className="text-base font-semibold text-green-600">
                  {details?.bonusToEarn}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="use-cashback" className="text-base font-medium">
                  Use Cashback
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">
                    {transactions?.cashbackAmount}
                  </span>
                  <Switch
                    id="use-cashback"
                    checked={useCashback}
                    onCheckedChange={setUseCashback}
                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={pay}
                disabled={redirect}
              >
                Proceed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

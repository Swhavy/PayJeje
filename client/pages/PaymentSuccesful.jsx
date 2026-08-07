//testing redirect url
//https://p8q0dhvs-8080.uks1.devtunnels.ms/PaymentSuccesful?status=successful&tx_ref=PayWaka-PjWKXJWGeXdr7B1lYhT0sFcLwgF3-1756903541631&transaction_id=9612651

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useClientWebHook from "@/components/useClientWebHook";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";
import { useSpinner } from "@/components/SpinnerProvider";
import ErrorFeedback from "@/components/Alert";


export default function PaymentSuccesful({ onClose }) {
  const payInfo = useSelector((state) => state.user.transactions);
  const paymentInfo = {
    price: 50,
    customerID: Number("08136259221"),
    billType: "Data",
    ...payInfo,
  };
  const uid = useSelector((state) => state.user.user.uid);
  const [mount, setMount] = useState(false);

  const [error, setError] = useState(null);
  const [paymentState, setPaymentState] = useState({
    VerifyPay: false,
    payout: false,
    verifyBillStatus: false,
  });

  const { appContext, setAppContext } = useSpinner();
  useEffect(() => {
    setMount(true);
  }, []);

  //emulators
  useEffect(() => {
    connectFunctionsEmulator(functions, "localhost", 5001);
  }, []);
  const verifyTransactionStatus = httpsCallable(
    functions,
    "verifyTransactionStatus",
  );
  const payoutBill = httpsCallable(functions, "payoutBill");
  const verifyBillPaymentStatus = httpsCallable(
    functions,
    "verifyBillPaymentStatus",
  );
  //end emulators

  const searchParam = new URLSearchParams(window.location.search);
  const rawTx_Ref = searchParam.get("tx_ref") || null;
  const tx_refParts = rawTx_Ref?.split("-") || null;
  const userID = tx_refParts?.[1] || null;

  const status = useClientWebHook(userID, rawTx_Ref);

  //verify Payment Status
  const verifyPay = async () => {
    const tx_id = searchParam.get("transaction_id") || null;
    try {
      const res = await verifyTransactionStatus({
        amount: paymentInfo.price, //priceNum,
        tx_id,
      });
console.log("verify: ", res)
      if (
        res.data?.status === "success" &&
        res.data?.message === "Transaction verified successfully"
      ) {
        setPaymentState((prev) => ({ ...prev, VerifyPay: true }));
        payout();
      } else if (res.data?.status === "abortError") {
        setError(res.data?.message);
      } else if (res.data?.status === "error") {
        setError(res.data?.message);
      } else console.log("Transaction verification response:", res);
    } catch (error) {
      setPaymentState((prev) => ({ ...prev, VerifyPay: false }));
      setError("Error verifying transaction");
      console.error("Error verifying transaction:", error);
      setAppContext({ spinner: false });
      toast.error(
        "An error occurred while verifying the transaction. Please refresh the page.",
      );
    }
  };

  //payout bill
  const payout = async () => {
    try {
      const res = await payoutBill({
        network: paymentInfo?.network,
        uid,
        billType: paymentInfo?.billType,
        country: "NG",
        customerID: paymentInfo?.customerID,
        amount: paymentInfo?.price,
        userID,
        billerCode: paymentInfo?.billerCode || null,
        itemCode: paymentInfo?.itemCode || null,
        reference: `${rawTx_Ref}`,
      });
      if (res.data.status === "abortError") {
        setError(res.data?.message);
      } else if (res.data?.status === "error") {
        setError(res.data?.message);
      } else if (res.data.status === "successful")
        setPaymentState((prev) => ({ ...prev, payout: true }));
      console.log("Bill payment response:", res);
    } catch (error) {
      setError("Error in Bill payment");
      setPaymentState((prev) => ({ ...prev, payout: false }));
      setAppContext({ spinner: false });
      console.error("Error in Bill payment:", error);
      toast.error(
        "An error occurred while processing the payment. refresh the page or contact customer support with this transaction reference: " +
          rawTx_Ref,
      );
    }
  };

  //verify Bill Status
  const verifyBillStatus = async () => {
    try {
      const res = await verifyBillPaymentStatus({ rawTx_Ref });
      if (res.data?.status === "error") {
        setPaymentState((prev) => ({ ...prev, verifyBillStatus: false }));
        toast.error(`${res.data?.message}`);
      } else if (res.data?.status === "abortError") {
        setError(res.data?.message);
      } else {
        setPaymentState((prev) => ({ ...prev, verifyBillStatus: true }));
      }
      console.log("Bill payment status response:", res);
    } catch (error) {
      setError("error verifying bill payment status");
      setAppContext({ spinner: false });
      setPaymentState((prev) => ({ ...prev, verifyBillStatus: false }));
      toast.error("error verifying bill payment status");
    }
  };

  useEffect(() => {
    setAppContext({ spinner: true });
    const status = true
     console.log("status:", status);
    if (status) {
      verifyPay();
    } else if (status === "No such document!") {
      toast.error(
        "No transaction document found. Please refresh the page or contact customer support with this transaction reference: " +
          rawTx_Ref,
      );
      setAppContext({ spinner: false });
      console.log("end....");
    } else {
      setAppContext({ spinner: true });
      console.log("Waiting for transaction status...");
    }
    console.log("verifyPay: ", paymentState.VerifyPay);
  }, [status]);

  useEffect(() => {
    if (paymentState.VerifyPay && paymentState.payout) {
      verifyBillStatus();
      setAppContext({ spinner: false }); // stop spinner only after everything is done
    }
  }, [paymentState.payout]);

  return (
    <>
      {paymentState.VerifyPay ? (
        <Dialog
          open={true}
          onOpenChange={onClose}
          className="absolute -top-[200%] inset-0 m-auto"
        >
          <DialogContent className="p-6 rounded-lg shadow-xl text-center aspect-[2/2] inset-0 m-auto overflow-y-auto lg:w-[40vw] cursor-default">
            <DialogHeader className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <DialogTitle className="text-3xl font-bold text-foreground">
                Purchase Successful!
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-base">
                {`  Your ${
                  paymentInfo.productName == "Airtime"
                    ? "Airtime"
                    : paymentInfo.productName == "Data"
                      ? "Data Plan"
                      : paymentInfo.productName == "cable"
                        ? "Cable"
                        : "Electricity bill"
                } purchase has been completed`}{" "}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-foreground text-left">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-muted-foreground">
                  Network
                </span>
                <span className="text-base font-semibold">
                  {paymentInfo?.network || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-muted-foreground">
                  Amount
                </span>
                <span className="text-base font-semibold">
                  {paymentInfo?.price || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-muted-foreground">
                  {paymentInfo.productName == "Airtime" ||
                  paymentInfo.productName == "Data"
                    ? "Mobile Number"
                    : paymentInfo.productName == "cable"
                      ? "Decoder Number"
                      : "Meter Number"}
                </span>
                <span className="text-base font-semibold">
                  {paymentInfo?.customerID || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-muted-foreground">
                  Transaction ID
                </span>
                <span
                  className="text-base font-semibold text-green-600 min-w-[50px] w-28 max-w-[120px] truncate"
                  title={rawTx_Ref}
                >
                  {rawTx_Ref || "N/A"}
                </span>
              </div>

              {paymentInfo?.bonusToEarn && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-muted-foreground">
                      Bonus Earned
                    </span>
                    <span className="text-base font-semibold text-green-500">
                      {paymentInfo?.bonusToEarn || "N/A"}
                    </span>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="mt-6 flex flex-col gap-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-3"
                onClick={onClose}
              >
                <Link to="/dashboard">Done</Link>
              </Button>
              <Button
                variant="outline"
                className="w-full text-lg font-semibold py-3"
                asChild
              >
                <Link to="/Transactions">View Transactions</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        "false"
      )}
      {error && <ErrorFeedback message={error} />}
    </>
  );
}

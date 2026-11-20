//testing redirect url
//https://p8q0dhvs-8080.uks1.devtunnels.ms/PaymentSuccesful?status=successful&tx_ref=PayWaka-PjWKXJWGeXdr7B1lYhT0sFcLwgF3-1756903541631&transaction_id=9612651

import React, { useEffect, useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import {
  ReceiptAmount,
  ReceiptAnimatedCheck,
  ReceiptCashbackChip,
  ReceiptCopyButton,
  ReceiptPerforation,
  ReceiptRow,
  ReceiptRows,
  ReceiptStatusPill,
  ReceiptStrip,
  ReceiptWordmark,
} from "@/components/receipts/ReceiptParts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useClientWebHook from "@/components/useClientWebHook";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";
import { useSpinner } from "@/components/SpinnerProvider";
import ErrorFeedback from "@/components/Alert";
import { formatNaira } from "@/lib/format";


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
    // connectFunctionsEmulator disabled for live backend
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

  const targetLabel =
    paymentInfo.productName == "Airtime" || paymentInfo.productName == "Data"
      ? "Mobile Number"
      : paymentInfo.productName == "cable"
        ? "Decoder Number"
        : "Meter Number";

  const productLabel =
    paymentInfo.productName == "Airtime"
      ? "Airtime"
      : paymentInfo.productName == "Data"
        ? "Data Plan"
        : paymentInfo.productName == "cable"
          ? "Cable TV"
          : "Electricity";

  return (
    <>
      {paymentState.VerifyPay && (
        <ModalPortal
          isOpen={true}
          onClose={() => onClose?.()}
          variant="sheet"
          maxWidthClass="max-w-[388px]"
          noPadding
          ariaLabel="Payment Successful Receipt"
        >
          <ReceiptStrip />
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <ReceiptWordmark />
              <ReceiptStatusPill variant="success" label="SUCCESSFUL" />
            </div>

            <div className="flex flex-col items-center text-center pt-1 pb-2 gap-3">
              <ReceiptAnimatedCheck />
              <div>
                <h2 id="redirect-payment-success-title" className="text-card-title text-foreground">
                  Purchase Successful
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your {productLabel} purchase has been completed
                </p>
              </div>
              <ReceiptAmount
                amount={paymentInfo?.price}
                label="AMOUNT PAID"
                size="md"
              />
            </div>

            <ReceiptRows>
              <ReceiptRow label="Product" value={productLabel} />
              <ReceiptRow label="Network" value={paymentInfo?.network || "N/A"} />
              <ReceiptRow
                label={targetLabel}
                value={paymentInfo?.customerID || "N/A"}
                mono
              />
            </ReceiptRows>

            <ReceiptPerforation />

            <div className="pw-panel p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Reference
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className="pw-num text-xs font-semibold text-foreground truncate max-w-[180px]"
                    title={rawTx_Ref || ""}
                  >
                    {rawTx_Ref || "N/A"}
                  </span>
                  {rawTx_Ref && (
                    <ReceiptCopyButton
                      value={rawTx_Ref}
                      label="Copy reference"
                    />
                  )}
                </div>
              </div>
              {paymentInfo?.bonusToEarn ? (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <span className="text-xs font-medium text-muted-foreground">
                    Reward Earned
                  </span>
                  <ReceiptCashbackChip
                    label={`+${formatNaira(paymentInfo.bonusToEarn)} bonus`}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2 pt-1">
              <Button className="w-full" asChild>
                <Link to="/dashboard" onClick={() => onClose?.()}>
                  Done
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-brand-400" asChild>
                <Link to="/billhistory">View history</Link>
              </Button>
            </div>
          </div>
        </ModalPortal>
      )}
      {error && <ErrorFeedback message={error} />}
    </>
  );
}

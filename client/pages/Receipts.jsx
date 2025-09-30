import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpRight,
  CreditCard,
  Receipt,
  Download,
  Share,
  User,
  Smartphone,
  Banknote,
  BadgeCheck,
  Building2,
  Clock,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSelector } from "react-redux";
import { useSpinner } from "@/components/SpinnerProvider";
// Extract transaction details dynamically
const getTransactionDetails = (transaction) => {
  const typeMap = {
    CARD: {
      narration: transaction?.narration,
      amount: transaction?.amount,
      payment_type: transaction?.payment_type,
      time: transaction?.created_at,
      status: transaction?.status,
      reference: transaction?.tx_ref,
    },
    Transfer: {
      fullName: transaction?.fullName,
      bankName: transaction?.bankName,
      status: transaction?.status,
      narration: transaction?.narration,
      time: transaction?.created_at,
      reference: transaction?.tx_ref,
    },
    Bill: {
      customer: transaction?.customer,
      network: transaction?.network,
      amount: transaction?.amount,
      status: transaction?.status,
      time: transaction?.created_at,
      reference: transaction?.tx_ref,
    },
    Default: {
      narration: transaction?.narration || "N/A",
      amount: transaction?.amount,
      status: transaction?.status,
      time: transaction?.created_at,
      reference: transaction?.tx_ref,
    },
  };

  const detectedKey =
    Object.keys(typeMap).find((key) =>
      transaction?.narration?.toLowerCase().includes(key.toLowerCase()),
    ) || "Default";

  return typeMap[detectedKey];
};

// Define field labels for each type
const fieldLabels = {
  CARD: {
    narration: { label: "Narration", icon: Receipt },
    amount: { label: "Amount", icon: Banknote },
    payment_type: { label: "Payment Type", icon: CreditCard },
    time: { label: "Time", icon: Clock },
    status: { label: "Status", icon: BadgeCheck },
    reference: { label: "Reference", icon: Hash },
  },

  Transfer: {
    fullName: { label: "Recipient", icon: User },
    bankName: { label: "Bank", icon: Building2 },
    status: { label: "Status", icon: BadgeCheck },
    narration: { label: "Narration", icon: Receipt },
    time: { label: "Time", icon: Clock },
    reference: { label: "Reference", icon: Hash },
  },

  Bill: {
    customer: { label: "Customer", icon: User },
    network: { label: "Network", icon: Smartphone },
    amount: { label: "Amount", icon: Banknote },
    status: { label: "Status", icon: BadgeCheck },
    time: { label: "Time", icon: Clock },
    reference: { label: "Reference", icon: Hash },
  },

  Default: {
    narration: { label: "Narration", icon: Receipt },
    amount: { label: "Amount", icon: Banknote },
    status: { label: "Status", icon: BadgeCheck },
    time: { label: "Time", icon: Clock },
    reference: { label: "Reference", icon: Hash },
  },
};

export default function Receipts() {
  // const userRef = useSelector((state) => state.user.user);
  //const { uid } = userRef;
  const [details, setDetails] = useState(null);
  const receiptRef = useRef();
  const { id, uid } = useParams();
  const { setAppContext, appContext } = useSpinner();

  const isDebit = details?.amount < 0;

  // Detect the right label set based on type
  const labels =
    fieldLabels[details?.payment_type?.toUpperCase()] || fieldLabels.Default;

  useEffect(() => {
    setAppContext({ ...appContext, spinner: true });
    async function fetchData() {
      console.log(id);
      const ref = doc(db, "users", uid, "Transactions", id);
      const transaction = await getDoc(ref);
      console.log("transaction", transaction);
      if (transaction.empty) {
        setAppContext({ ...appContext, spinner: false });
        toast.error("no receipt data");
      } else {
        const trxn = [transaction];
        const tx = trxn?.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log("tx:", tx);
        setDetails(getTransactionDetails(tx[0]));
        setAppContext({ ...appContext, spinner: false });
      }
    }
    fetchData();
  }, []);

  if (!details) return null;

  return (
    <>
      {details && (
        <Dialog open={true} onOpenChange={false}>
          <DialogOverlay className="receipt fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[70]">
            <DialogContent className="max-w-md  mx-auto bg-card border-border sticky m-auto -mt-11 scale-75 inset-0 z-[70] overflow-y-auto cursor-pointer">
              <div className="bg-card w-20 h-20  absolute left-0 top-0 z-50"></div>
              <div className="bg-card" ref={receiptRef}>
                <DialogHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                    {details?.payment_type === "card" ? (
                      <CreditCard className="w-8 h-8 text-primary" />
                    ) : details?.payment_type === "Transfer" ? (
                      <ArrowUpRight className="w-8 h-8 text-primary" />
                    ) : (
                      <Receipt className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <DialogTitle className="text-2xl font-bold text-card-foreground">
                    {isDebit ? "-" : "+"}₦
                    {Math.abs(details?.amount).toLocaleString()}
                  </DialogTitle>
                  <p className="text-muted-foreground">{details?.narration}</p>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <Badge
                      variant={
                        details?.status == "successful"
                          ? "default"
                          : "secondary"
                      }
                      className={`${
                        details?.status == "successful"
                          ? "bg-primary text-primary-foreground"
                          : details?.status === "pending"
                            ? "bg-chart-3 text-white"
                            : "bg-destructive text-destructive-foreground"
                      }`}
                    >
                      {details?.status?.charAt(0)?.toUpperCase() +
                        details?.status?.slice(1)}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Dynamic Transaction Details */}
                  <div className="space-y-3">
                    {Object.keys(details).map((key) => {
                      const field = labels[key];
                      if (!field || !details[key] || details[key] === "N/A")
                        return null;

                      const Icon = field.icon;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Icon className="w-4 h-4" />
                            <span>{field.label}</span>
                          </div>
                          <span
                            className={`font-medium text-card-foreground ${
                              key === "reference"
                                ? "font-mono text-sm w-[5rem] truncate"
                                : ""
                            }`}
                            title={key === "reference" ? details[key] : ""}
                          >
                            {key === "time"
                              ? new Date(details[key]).toLocaleString("en-NG", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : details[key]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  {/* Amount Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium text-card-foreground">
                        ₦{Math.abs(details?.amount).toLocaleString()}
                      </span>
                    </div>

                    <Separator />
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-card-foreground">Total</span>
                      <span
                        className={`${isDebit ? "text-destructive" : "text-primary"}`}
                      >
                        {isDebit ? "-" : "+"}₦
                        {Math.abs(details?.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {/* ref section end down */}
                </div>
              </div>
              {/* Action Buttons */}
              {/* <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              size="sm"
              onClick={downloadReceipt}
            >
              <Download className="w-4 h-4 mr-2" />
              Receipt
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              size="sm"
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div> */}
            </DialogContent>
          </DialogOverlay>
        </Dialog>
      )}
    </>
  );
}

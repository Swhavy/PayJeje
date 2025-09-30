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
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { auth } from "@/firebaseConfig";
import { useSelector } from "react-redux";
import ReceiptsOp from "@/components/ReceiptsOp";

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

export default function TransactionsModal({ transaction, isOpen, onClose }) {
  const [details, setDetails] = useState(null);
  const receiptRef = useRef();
  const userRef = useSelector((state) => state.user.user);
  const { uid } = userRef;
  const [txId, setTxId] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [load, setLoad] = useState(false);

  //cloud function
  connectFunctionsEmulator(functions, "localhost", 5001);
  const generateReceipt = httpsCallable(functions, "generateReceipt");

  // Helper: base64 → Blob
  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Dynamic download
  const downloadReceipt = async (id, uid, type) => {
    //disabling/enabling download button
    setLoad((prev) => (prev = true));
    try {
      const res = await generateReceipt({ id, uid, type });

      const data = res.data;
      console.log("data", data);

      if (data?.file) {
        let mimeType = type === "pdf" ? "application/pdf" : "image/png";
        let extension = type === "pdf" ? "pdf" : "png";
        // let download;
        const blob = base64ToBlob(data.file, mimeType);
        //correct format to download an image
        // type === "image"
        //   ? (download = `data:image/png;base64,${data.png}`)
        //   : null;

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${data.id}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      //disabling/enabling download button
      setLoad((prev) => (prev = false));
    } catch (err) {
      //disabling/enabling download button
      setLoad((prev) => (prev = false));
      toast.error("Error downloading receipt");
      console.error("Error downloading receipt:", err);
    }
  };

  if (!transaction) {
    toast.error("No transaction record selected");
    return null;
  }

  const isDebit = transaction.amount < 0;

  // Detect the right label set based on type
  const labels =
    fieldLabels[transaction.payment_type.toUpperCase()] || fieldLabels.Default;

  useEffect(() => {
    setDetails(getTransactionDetails(transaction));
  }, [transaction]);

  if (!details) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogOverlay className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[70]">
          <DialogContent className="max-w-md  mx-auto bg-card border-border sticky m-auto -mt-11 scale-75 inset-0 z-[70] overflow-y-auto cursor-pointer">
            <div className="bg-card" ref={receiptRef}>
              <DialogHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  {transaction.payment_type === "card" ? (
                    <CreditCard className="w-8 h-8 text-primary" />
                  ) : transaction.payment_type === "Transfer" ? (
                    <ArrowUpRight className="w-8 h-8 text-primary" />
                  ) : (
                    <Receipt className="w-8 h-8 text-primary" />
                  )}
                </div>
                <DialogTitle className="text-2xl font-bold text-card-foreground">
                  {isDebit ? "-" : "+"}₦
                  {Math.abs(transaction.amount).toLocaleString()}
                </DialogTitle>
                <p className="text-muted-foreground">{transaction.narration}</p>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex justify-center">
                  <Badge
                    variant={
                      transaction.status == "successful"
                        ? "default"
                        : "secondary"
                    }
                    className={`${
                      transaction.status == "successful"
                        ? "bg-primary text-primary-foreground"
                        : transaction.status === "pending"
                          ? "bg-chart-3 text-white"
                          : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {transaction.status.charAt(0).toUpperCase() +
                      transaction.status.slice(1)}
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
                      ₦{Math.abs(transaction.amount).toLocaleString()}
                    </span>
                  </div>

                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-card-foreground">Total</span>
                    <span
                      className={`${isDebit ? "text-destructive" : "text-primary"}`}
                    >
                      {isDebit ? "-" : "+"}₦
                      {Math.abs(transaction.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* ref section end down */}
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                size="sm"
                onClick={async () => {
                  setTxId((prev) => (prev = transaction.tx_ref));
                  setIsReceiptModalOpen(true);
                  //downloadReceipt();
                  console.log("ref: ", transaction.tx_ref);
                }}
                disabled={load}
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
            </div>
          </DialogContent>
        </DialogOverlay>
      </Dialog>
      <ReceiptsOp
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onDownload={downloadReceipt}
        uid={uid}
        txId={txId}
      />
    </>
  );
}

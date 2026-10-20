import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { toast } from "sonner";
import TransactionsModal, { OfficialPayWakaReceiptCard } from "@/components/TransactionsModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function Receipts() {
  const { id, uid } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id || !uid) {
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, "users", uid, "Transactions", id);
        const docSnap = await getDoc(ref);
        if (docSnap.exists()) {
          setTransaction({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error("Receipt record not found");
        }
      } catch (err) {
        console.error("Error fetching receipt:", err);
        toast.error("Failed to load receipt");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading PayWaka Receipt...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-[#030712] text-foreground flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-lg font-bold text-red-400">Receipt Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          We could not find a transaction receipt matching reference #{id}.
        </p>
        <Button
          onClick={() => navigate("/dashboard")}
          className="mt-4 bg-muted hover:bg-muted text-foreground text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-foreground p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
      </div>

      <TransactionsModal
        transaction={transaction}
        isOpen={true}
        onClose={() => navigate("/dashboard")}
      />
    </div>
  );
}

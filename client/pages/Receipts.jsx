import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import PaywakaReceiptView from "@/components/receipts/PaywakaReceiptView";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

/**
 * Full-page Responsive Receipt View inside persistent PayWaka DashboardLayout navigation.
 * Supports Desktop 12-column Telemetry + Glassmorphic layout, Tablet 2-col card, Mobile Ticket,
 * Dual Themes (Obsidian Emerald / Formal Print with Watermarks), PDF/PNG export & Social Share.
 */
export default function Receipts() {
  const { id, uid } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        let foundSnap = null;

        if (uid && uid !== "verify") {
          const userTxRef = doc(db, "users", uid, "Transactions", id);
          const userSnap = await getDoc(userTxRef);
          if (userSnap.exists()) {
            foundSnap = userSnap;
          }
        }

        // Upper-level conflict-resolution fallback lookup
        if (!foundSnap) {
          const upperSnap = await getDoc(doc(db, "Transactions", id));
          if (upperSnap.exists()) {
            foundSnap = upperSnap;
          }
        }

        if (!foundSnap) {
          const lowerUpperSnap = await getDoc(doc(db, "transactions", id));
          if (lowerUpperSnap.exists()) {
            foundSnap = lowerUpperSnap;
          }
        }

        if (foundSnap) {
          setTransaction({ id: foundSnap.id, ...foundSnap.data() });
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

  return (
    <DashboardLayout>
      {loading ? (
        <div className="min-h-[65vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-muted-foreground">
            Loading PayWaka Official Receipt...
          </p>
        </div>
      ) : !transaction ? (
        <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-red-400">Receipt Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            We could not locate a transaction receipt matching reference #{id}.
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            className="mt-5 bg-muted hover:bg-muted/80 text-foreground text-xs rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
          </Button>
        </div>
      ) : (
        <div className="py-1 sm:py-2">
          <PaywakaReceiptView
            transaction={transaction}
            mode="page"
            onBack={() => navigate(-1)}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

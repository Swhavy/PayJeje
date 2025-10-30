import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
import { db } from "@/firebaseConfig";
import { toast } from "sonner";

const useClientWebHook = (userID, tx_ref) => {
  const [status, setStatus] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let unsub = () => {};
   if (mounted) {
    if (!userID || !tx_ref) {
      toast.error("Invalid userID or tx_ref");
      console.error("Invalid userID or tx_ref");
      console.log("Listening for changes in transaction document:", status);
      return;
    }

    unsub = onSnapshot(
      doc(db, "users", userID, "Transactions", tx_ref),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setStatus(data.status);
          console.log("Transaction document data:", data);
        } else {
          toast.error;
          ("No such document!");
          console.log("No such document!");
          setStatus("No such document!");
        }
      },
      (error) => {
        toast.error("Error fetching tx document -swhay:", error);
        console.error("Error fetching tx document -swhay:", error);
      },
    );}
    return () => unsub();
  }, [userID]);
  return status;
};
export default useClientWebHook;

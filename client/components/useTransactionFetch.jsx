import { db } from "@/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useSpinner } from "@/components/SpinnerProvider";

const useTransactionFetch = () => {
  const User = useSelector((state) => state.user.user);
  const [user, setUser] = useState(User.uid);
  const navigate = useNavigate();
  const [trxn, setTrxn] = useState(null);
  const [more, setMore] = useState(true);
  const [last, setLast] = useState(false);
  const { setAppContext, appContext } = useSpinner();
  useEffect(() => {
    if (!user) {
      toast.error("no user signed in");
      return navigate("/auth/login");
    }
    setAppContext({ ...appContext, spinner: true });
    const transactions = collection(db, "users", user, "Transactions");
    const q = query(transactions, limit(10));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const tx = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTrxn(tx); //set transaction data in state
        setAppContext({ ...appContext, spinner: false });
        console.log("doc", tx);
        console.log("yeah", snap.docs);
        setLast(snap.docs[snap.docs.length - 1]); // keep the last document for pagination
      },
      (error) => {
        setAppContext({ ...appContext, spinner: false });
        toast.error("trxn", error);
        console.error("Error fetching tx document -swhay:", error);
      },
    );

    return () => unsubscribe();
  }, [User]);

  const loadMore = async () => {
    if (!more) {
      return toast.error("no more transaction data");
    }
    setAppContext({ ...appContext, spinner: true });
    const transactions = collection(db, "users", user, "Transactions");
    const q = query(transactions, startAfter(last), limit(10));

    const snap = await getDocs(q);

    if (!snap.empty) {
      console.log("entered more", snap);
      const older = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTrxn((prev) => [...prev, ...older]); //append the previous transaction data to state
      console.log("older", older, last);
      setAppContext({ ...appContext, spinner: false });
      setLast(snap.docs[snap.docs.length - 1]); // keep the last document for pagination
    } else {
      setAppContext({ ...appContext, spinner: false });
      toast.error("no more transaction data");
      setMore(false); //no more Pages
    }
  };
  return { trxn, loadMore };
};

export default useTransactionFetch;

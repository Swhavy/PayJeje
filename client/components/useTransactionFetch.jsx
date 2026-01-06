import { db } from "@/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  doc,
  onSnapshot,
  startAfter,
  getDocs,
  where,
  limitToLast,
  endBefore,
  endAt,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useSpinner } from "@/components/SpinnerProvider";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebaseConfig";

const useTransactionFetch = () => {
  const [cursors, setCursors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const User = useSelector((state) => state.user.user);
  const [user, setUser] = useState(User.uid);
  const navigate = useNavigate();
  const [trxn, setTrxn] = useState(null);
  const [more, setMore] = useState(true);
  const [last, setLast] = useState(false);
  const { setAppContext, appContext } = useSpinner();
  useEffect(() => {
    setAppContext({ ...appContext, spinner: true });
    let unsubscribe = () => {};
    if (!user) {
      setAppContext({ ...appContext, spinner: false });
      toast.error("no user signed in");
      return navigate("/auth/login");
    }
    const transactions = collection(db, "users", user, "Transactions");
    const q = query(transactions, limit(10));
    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const tx = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTrxn(tx); //set transaction data in state
        setAppContext({ ...appContext, spinner: false });
        console.log("doc", tx);
        // console.log("yeah", snap.docs);
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
      //console.log("older", older, last);
      setLast(snap.docs[snap.docs.length - 1]); // keep the last document for pagination
      setAppContext({ ...appContext, spinner: false });
    } else {
      setAppContext({ ...appContext, spinner: false });
      toast.error("no more transaction data");
      setMore(false); //no more Pages
    }
  };

  const getTransactionData = async ({
    from,
    to,
    status,
    category,
    limitCount = 10,
    direction = "first",
  }) => {
    try {
      const fromDate = from ? from : null;
      const toDate = to ? to : null;
      const transactionsRef = collection(db, "users", user, "Transactions");

      let filters = [];

      if (status) {
        // if status is all, do not apply any filter
        if (status === "all") {
        } else filters.push(where("status", "==", status));
      }
      if (category) {
        //if category is all, do not apply any filter
        if (category === "all") {
        } else if (category === "CARD")
          filters.push(where("narration", "==", "CARD Transaction "));
        else filters.push(where("narration", "==", category));
      }
      if (fromDate) filters.push(where("created_at", ">=", fromDate));
      if (toDate) filters.push(where("created_at", "<=", toDate));

      let queryConstraints = [...filters, orderBy("created_at", "desc")];

      if (direction === "next" && cursors[currentPage - 1]) {
        queryConstraints.push(startAfter(cursors[currentPage - 1]));
      } else if (direction === "prev" && cursors[currentPage - 2]) {
        queryConstraints.push(endAt(cursors[currentPage - 2]));
        queryConstraints.push(limitToLast(limitCount));
      }

      // Always apply limit
      queryConstraints.push(limit(limitCount));

      // Build and execute Firestore query
      const finalQuery = query(transactionsRef, ...queryConstraints);
      const snapshot = await getDocs(finalQuery);

      if (snapshot.empty)
        return { status: "error", data: [], page: currentPage, totalPages: 1 };

      // ✅ Immediately store the last document as the cursor (except when moving back)
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (direction !== "prev") setCursors((prev) => [...prev, lastDoc]);

      // Map data into usable objects
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get total count for totalPages display
      const totalCountSnap = await getCountFromServer(
        query(transactionsRef, ...filters),
      );
      const totalPages = Math.ceil(totalCountSnap.data().count / limitCount);
      if (direction === "first") {
        setCurrentPage((prev) => {
          prev = 1;
          const firstPage = 1;
          return firstPage;
        });
        setCursors((prev) => {
          prev = [lastDoc];
          let newCursors = [lastDoc];
          return newCursors;
        });
      } else if (direction === "next") {
        setCurrentPage((prev) => {
          const nextPage = Math.min(totalPages, prev + 1);
          return nextPage;
        });
        //console.log("Current Page next:", currentPage);
      } else if (direction === "prev") {
        //setCurrentPage((prev) => Math.max(1, prev - 1));
        setCurrentPage((prev) => {
          const prevPage = Math.max(1, prev - 1);
          return prevPage;
        });
      }

      return { status: "success", data, page: currentPage, totalPages };
    } catch (error) {
      console.error("Pagination error:", error);
      return { status: "error", message: error.message };
    }
  };

  return { trxn, loadMore, getTransactionData };
};

export const useInflowData = (userId) => {
  const [inflowData, setInflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Calculate date 4 months ago as ISO string
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    fourMonthsAgo.setDate(1);
    fourMonthsAgo.setHours(0, 0, 0, 0);
    const fourMonthsAgoISO = fourMonthsAgo.toISOString();

    const transactionsRef = collection(db, "users", userId, "Transactions");
    const q = query(
      transactionsRef,
      where("type", "==", "inflow"),
      where("created_at", ">=", fourMonthsAgoISO), // Compare ISO strings directly
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const transactions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            // Convert ISO string to Date object for calculations
            date: new Date(doc.data()["created_at"]),
          }));

          const monthlyData = getMonthlyInflows(transactions);
          const result = calculateInflowChange(monthlyData, null);
          setInflowData(result);
          setError(null);
        } catch (err) {
          console.error("Error processing transactions:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error listening to transactions:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return { inflowData, loading, error };
};

// Same helper functions as before
const getMonthlyInflows = (transactions) => {
  const now = new Date();
  const monthsData = {};
  const pointsData = {};
  let monthlyData

  for (let i = 0; i < 4; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthsData[key] = 0;
  }
  transactions
    .filter((t) => t.type === "inflow")
    .forEach((t) => {
      // t.date is already a Date object from the conversion above
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      if (monthsData[key] !== undefined) {
        monthsData[key] += t.amount;
      }
    });
   monthlyData = monthsData 
  return {monthlyData, pointsData};
};

const calculateInflowChange =  (inflow, pnts) => {
  const {monthlyData, pointsData} = inflow
  const months = Object.keys(monthlyData).sort().reverse();
  const currentMonth = monthlyData[months[0]];
  let pntsData = {}
  console.log("pnts:", pnts);
   if (pnts) {
     const previousAvg =
     (pointsData[months[1]] + pointsData[months[2]] + pointsData[months[3]]) /
     3;
   console.log("Previous Months Average pnts:", pnts);
   switch (previousAvg) {
    case 0:
     pntsData = {
       currentAmount: pnts,
       percentageChange: pnts > 0 ? 100 : 0,
       isIncrease: pnts > 0,
     };
     break;

     default:
   const percentChange =
     ((pnts - previousAvg) / previousAvg) * 100;
     pntsData = {
     currentAmount: pnts,
     percentageChange: Math.round(percentChange * 10) / 10,
     isIncrease: percentChange > 0,
     }
     break;
   }
   }
  const previousAverage =
    (monthlyData[months[1]] + monthlyData[months[2]] + monthlyData[months[3]]) /
    3;
  console.log("Previous Months Average Inflow:", currentMonth);
  if (previousAverage === 0) {
    return {
      currentAmount: currentMonth,
      percentageChange: currentMonth > 0 ? 100 : 0,
      isIncrease: currentMonth > 0,
      pntsData,
    };
  }

  const percentageChange =
    ((currentMonth - previousAverage) / previousAverage) * 100;

  //  if(pntsData){
  //    return {
  //    currentAmount: currentMonth,
  //    percentageChange: Math.round(percentageChange * 10) / 10,
  //    isIncrease: percentageChange > 0,
  //    pntsData,
  //    }
  //  }
  return {
    currentAmount: currentMonth,
    percentageChange: Math.round(percentageChange * 10) / 10,
    isIncrease: percentageChange > 0,
    pntsData,
  };
};

export const useReferallData = (userId) => {
  const [referralData, setReferralData] = useState(null);
  const [isloading, setLoading] = useState(true);
  const [iserror, setError] = useState(null);
  const [pntsErr, setPntsErr] = useState(null);
  const [pnts, setPnts] = useState(20);

  useEffect(() => {
     if (!userId) {
      setLoading(false);
      return;
    }
    const userPntsRef = doc(db, "users", userId)
    const snap = onSnapshot(userPntsRef, (snapshots) => {
      let points
     try{
      console.log("Hi mahn",snapshots.data()?.points )
      points = snapshots.data()?.points
       setPnts(points)
     }
     catch(err){
      console.log(err)
      setPntsErr(err)
     }
    },(err) =>{
      console.log(err)
      setPntsErr(err)
    } )
  return () => snap()
  }, [userId, pnts])

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Calculate date 4 months ago as ISO string
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    fourMonthsAgo.setDate(1);
    fourMonthsAgo.setHours(0, 0, 0, 0);
    const fourMonthsAgoTS = Timestamp.fromDate(fourMonthsAgo);
    console.log("time", fourMonthsAgoTS);

    const referralsRef = collection(db, "users", userId, "referrals");
    const q = query(
      referralsRef,
      where("createdAt", ">=", fourMonthsAgoTS), // Compare Timestamp strings directly
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const transactions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            // Convert Timestamp string to Date object for calculations
            date: new Date(doc.data()["createdAt"].toDate()),
          }));
          console.log("trx", transactions);
          const monthlyData = getMonthlyReferrals(transactions);
          console.log("montlyData", monthlyData)
          const result = calculateInflowChange(monthlyData,pnts);
          console.log("hey gee", result);
          setReferralData(result);
          setError(null);
        } catch (err) {
          console.error("Error processing Referrals:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error listening to Referrals:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId, pnts]);

  return { referralData, isloading, iserror };
};

const getMonthlyReferrals = (transactions) => {
  const now = new Date();
  const monthsData = {};
  const pointsData = {};
  let monthlyData

  for (let i = 0; i < 4; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthsData[key] = 0;
    pointsData[key] = 0;
  }
  transactions.forEach((t) => {
    // t.date is already a Date object from the conversion above
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    if (monthsData[key] !== undefined) {
      monthsData[key] += 1;
      pointsData[key] += 20;
    }
  });

  monthlyData = monthsData

  return {monthlyData, pointsData};
};

export default useTransactionFetch;

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
import { useEffect, useState, useMemo } from "react";
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
    let unsubscribe = () => {};
    let onAuth = () => {};
    onAuth = onAuthStateChanged(auth, async (user) => {
      setAppContext((prev) => ({ ...prev, spinner: true }));
      const activeUid = user?.uid || (import.meta.env.DEV ? "dev_user_123" : null);
      if (!activeUid) {
        setAppContext((prev) => ({ ...prev, spinner: false }));
        return;
      }
      setUser(activeUid);
      const transactions = collection(db, "users", activeUid, "Transactions");
      const q = query(transactions, limit(50));
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          const parseTxTime = (t) => {
            if (t?.createdAt?.toDate) return t.createdAt.toDate().getTime();
            if (t?.createdAt?.seconds) return t.createdAt.seconds * 1000;
            if (t?.created_at) return new Date(t.created_at).getTime();
            if (t?.timestamp?.toDate) return t.timestamp.toDate().getTime();
            if (t?.timestamp) return new Date(t.timestamp).getTime();
            if (t?.date) return new Date(t.date).getTime();
            return 0;
          };

          const tx = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          tx.sort((a, b) => parseTxTime(b) - parseTxTime(a));
          setTrxn(tx); // set sorted transaction data in state
          setAppContext((prev) => ({ ...prev, spinner: false }));
          setLast(snap.docs[snap.docs.length - 1]); // keep the last document for pagination
        },
        (error) => {
          setAppContext((prev) => ({ ...prev, spinner: false }));
          toast.error("trxn", error);
          console.error("Error fetching tx document -swhay:", error);
        },
      );
    });

    return () => {
      unsubscribe();
      onAuth();
    };
  }, []);

  const loadMore = async () => {
    if (!more) {
      return toast.info("No more transaction data");
    }
    setAppContext((prev) => ({ ...prev, spinner: true }));
    try {
      if (!user) {
        setAppContext((prev) => ({ ...prev, spinner: false }));
        return;
      }
      const transactions = collection(db, "users", user, "Transactions");
      let q;
      if (last) {
        q = query(transactions, startAfter(last), limit(15));
      } else {
        q = query(transactions, limit(15));
      }

      const snap = await getDocs(q);

      if (!snap.empty) {
        const parseTxTime = (t) => {
          if (t?.createdAt?.toDate) return t.createdAt.toDate().getTime();
          if (t?.createdAt?.seconds) return t.createdAt.seconds * 1000;
          if (t?.created_at) return new Date(t.created_at).getTime();
          if (t?.timestamp?.toDate) return t.timestamp.toDate().getTime();
          if (t?.timestamp) return new Date(t.timestamp).getTime();
          if (t?.date) return new Date(t.date).getTime();
          return 0;
        };

        const older = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTrxn((prev) => {
          const combined = [...(prev || []), ...older];
          const seen = new Set();
          const deduped = combined.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          deduped.sort((a, b) => parseTxTime(b) - parseTxTime(a));
          return deduped;
        });
        setLast(snap.docs[snap.docs.length - 1]);
      } else {
        toast.info("All transactions loaded");
        setMore(false);
      }
    } catch (err) {
      console.error("Error in loadMore:", err);
      toast.error("Failed to load older transactions");
    } finally {
      setAppContext((prev) => ({ ...prev, spinner: false }));
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

  return useMemo(() => ({ trxn, loadMore, getTransactionData }), [trxn]);
};


export const useInflowData = (userId) => {
  const [inflowData, setInflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    if (!userId) {
      setLoading(false);
      return;
    }

    const transactionsRef = collection(db, "users", userId, "Transactions");
    const q = query(transactionsRef, limit(200));

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const parseDate = (docData) => {
            if (docData?.createdAt?.toDate) return docData.createdAt.toDate();
            if (docData?.createdAt?.seconds) return new Date(docData.createdAt.seconds * 1000);
            if (docData?.created_at) return new Date(docData.created_at);
            if (docData?.timestamp?.toDate) return docData.timestamp.toDate();
            if (docData?.timestamp) return new Date(docData.timestamp);
            if (docData?.date) return new Date(docData.date);
            return new Date();
          };

          const transactions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: parseDate(doc.data()),
          }));

          const monthlyData = getMonthlyInflows(transactions);
          const result = calculateInflowChange(monthlyData, null, true);
          setInflowData(result);
          setError(null);
        } catch (err) {
          console.error("Error processing inflow transactions:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error listening to inflow transactions:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { inflowData, loading, error };
};

const getMonthlyInflows = (transactions) => {
  const now = new Date();
  const monthsData = {};
  const pointsData = {};

  for (let i = 0; i < 4; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthsData[key] = 0;
  }

  transactions.forEach((t) => {
    const typeLower = String(t.type || "").toLowerCase();
    const narrationLower = String(t.narration || "").toLowerCase();
    const categoryLower = String(t.category || "").toLowerCase();

    // Check if inflow / credit / deposit
    const isCredit =
      typeLower === "inflow" ||
      typeLower === "credit" ||
      typeLower === "income" ||
      categoryLower === "deposit" ||
      categoryLower === "cashback" ||
      categoryLower === "earning" ||
      narrationLower.includes("funding") ||
      narrationLower.includes("deposit") ||
      narrationLower.includes("cashback") ||
      narrationLower.includes("credit");

    if (isCredit && t.date) {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      if (monthsData[key] !== undefined) {
        monthsData[key] += Math.abs(Number(t.amount) || 0);
      }
    }
  });

  return { monthlyData: monthsData, pointsData };
};

const calculateInflowChange = (inflow, pnts, ifRef) => {
  const { monthlyData, pointsData } = inflow;
  const targetData = ifRef ? monthlyData : pointsData;
  const months = Object.keys(targetData).sort().reverse();
  const currentMonth = targetData[months[0]] || 0;

  const prev1 = targetData[months[1]] || 0;
  const prev2 = targetData[months[2]] || 0;
  const prev3 = targetData[months[3]] || 0;
  const previousAverage = (prev1 + prev2 + prev3) / 3;

  if (previousAverage === 0) {
    return {
      currentAmount: currentMonth,
      percentageChange: currentMonth > 0 ? 100 : 0,
      isIncrease: currentMonth >= 0,
      pntsData: {
        currentAmount: currentMonth,
        percentageChange: currentMonth > 0 ? 100 : 0,
        isIncrease: currentMonth >= 0,
      },
    };
  }

  const percentageChange = ((currentMonth - previousAverage) / previousAverage) * 100;

  return {
    currentAmount: currentMonth,
    percentageChange: Math.round(percentageChange * 10) / 10,
    isIncrease: percentageChange >= 0,
    pntsData: {
      currentAmount: currentMonth,
      percentageChange: Math.round(percentageChange * 10) / 10,
      isIncrease: percentageChange >= 0,
    },
  };
};

export const useReferallData = (userId) => {
  const [PointsData, setPointsData] = useState({
    currentAmount: 0,
    percentageChange: 0,
    isIncrease: true,
    pntsData: { currentAmount: 0, percentageChange: 0, isIncrease: true },
  });
  const [isloading, setLoading] = useState(true);
  const [iserror, setError] = useState(null);
  const [pntsErr, setPntsErr] = useState(null);
  const [pnts, setPnts] = useState(0);
  const [refDocs, setRefDocs] = useState([]);
  const [streakDocs, setStreakDocs] = useState([]);
  const [refData, setRefData] = useState({
    currentAmount: 0,
    percentageChange: 0,
    isIncrease: true,
  });

  const processTransactions = (referrals, streak, currentPoints = pnts) => {
    const transactions = [...referrals, ...streak];
    const monthlyData = getMonthlyReferrals(transactions, false);
    const result = calculateInflowChange(monthlyData, currentPoints, false);
    if (result) {
      result.currentAmount = currentPoints;
      if (result.pntsData) result.pntsData.currentAmount = currentPoints;
      setPointsData(result);
    }
    setError(null);
  };

  const processRefTransactions = (referrals, currentRefs = 0) => {
    const transactions = [...referrals];
    const monthlyData = getMonthlyReferrals(transactions, true);
    const result = calculateInflowChange(monthlyData, pnts, true);
    if (result) {
      if (currentRefs > 0) result.currentAmount = currentRefs;
      setRefData(result);
    }
    setError(null);
  };

  // Real-time listener for user's main doc (live points & referralsCount)
  useEffect(() => {
    let snap = () => {};
    if (!userId) {
      setLoading(false);
      return;
    }
    const userPntsRef = doc(db, "users", userId);
    snap = onSnapshot(
      userPntsRef,
      (snapshots) => {
        try {
          const uData = snapshots.data() || {};
          const userPoints = Number(uData.points || 0);
          const userRefs = Number(uData.refferalsCount ?? uData.referralsCount ?? 0);
          setPnts(userPoints);

          setPointsData((prev) => ({
            ...prev,
            currentAmount: userPoints,
            pntsData: {
              ...(prev?.pntsData || {}),
              currentAmount: userPoints,
            },
          }));

          setRefData((prev) => ({
            ...prev,
            currentAmount: userRefs,
          }));
        } catch (err) {
          console.error("Error fetching user points:", err);
          setPntsErr(err);
        }
      },
      (err) => {
        console.error("User points snapshot error:", err);
        setPntsErr(err);
      },
    );
    return () => {
      snap();
    };
  }, [userId]);

  //useEffect for fetching referral and streak data with real-time listeners, error handling, and loading state management. The data is processed to calculate monthly referrals and points, which are then used to calculate the percentage change in referrals and points compared to the previous months(3months ago). The results are stored in state for use in the UI.
  useEffect(() => {
    let unsubRef = () => {};
    let unsubStreak = () => {};

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

    const referralsRef = collection(db, "users", userId, "points");
    const refQuery = query(
      referralsRef,
      where("type", "==", "referrals"),
      where("createdAt", ">=", fourMonthsAgoTS), // Compare Timestamp strings directly
    );

    const streakRewards = collection(db, "users", userId, "points");
    const streakQuery = query(
      streakRewards,
      where("type", "==", "checkin"),
      where("createdAt", ">=", fourMonthsAgoTS), // Compare Timestamp strings directly
    );

    //real-time data listener for referral data over the past 4 months with error handling and loading state management
    unsubRef = onSnapshot(
      refQuery,
      async (snapshot) => {
        try {
          const transactions = snapshot.docs.map((doc) => ({
            id: doc.id,
            //type: "referral",
            ...doc.data(),
            // Convert Timestamp string to Date object for calculations
            date: new Date(doc.data()["createdAt"].toDate()),
          }));
          setRefDocs(transactions);
          //update
          await processRefTransactions(transactions);
          console.log("ref-trx", transactions);
          // const monthlyData = getMonthlyReferrals(transactions);
          // console.log("montlyData", monthlyData);
          // const result = calculateInflowChange(monthlyData, pnts);
          // console.log("hey gee", result);
          // setPointsData(result);
          // setError(null);
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

    //real-time data listener for streak reward data over the past 4 months with error handling and loading state management
    unsubStreak = onSnapshot(
      streakQuery,
      (snapshot) => {
        try {
          const transactions = snapshot.docs.map((doc) => ({
            id: doc.id,
            // type: "checkin",
            ...doc.data(),
            // Convert Timestamp string to Date object for calculations
            date: new Date(doc.data()["createdAt"].toDate()),
          }));
          //save the streak docs to state
          setStreakDocs(transactions);
          console.log("streak-trx", transactions);
        } catch (err) {
          console.error("Error processing streaks:", err);
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

    return () => {
      unsubRef();
      unsubStreak();
    };
  }, [userId]);

  //useMemo to process referral and streak data whenever either of them changes. This ensures that the pointsData state is always up-to-date with the latest transactions from both collections. The processing function combines the referral and streak transactions, calculates the monthly referrals and points, and then computes the percentage change compared to previous months. The results are stored in pointsData state for use in the UI.
  useMemo(() => {
    //if (refDocs.length === 0 && streakDocs.length === 0) return;
    processTransactions(refDocs, streakDocs);
  }, [refDocs, streakDocs]);

  //useEffect to process RefTransactions to update referrals UI(This effect causes an infinite loop of re-renders💀)
  // useEffect(() => {
  //   processRefTransactions(refDocs);
  // }, [refData]);

  return { PointsData, refData, isloading, iserror };
};

export const useBillsStat = () => {
  const uid = useSelector((state) => state.user.user.uid);
  const [airtimeData, setAirtimeData] = useState([]);
  const [weeklyData, setWeeklyData] = useState({
    amount: 0,
    noTransactions: 0,
  });
  const [utilityData, setUtilityData] = useState([]);
  const [utilityMonthlyData, setUtilityMonthlyData] = useState({
    amount: 0,
    noTransactions: 0,
  });
  const [pointsData, setPointsData] = useState({
    amount: 0,
    noTransactions: 0,
  });

  useEffect(() => {
    let airtimeSub = () => {};
    let utilitySub = () => {};
    let pointsSub = () => {};
    let onAuth = () => {};

    onAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAirtimeData([]);
        setUtilityData([]);
        setPointsData([]);
        return;
      }

      let airtimeRef;
      let utilityRef;
      let pointsRef;
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const sevenDaysAgoTS = Timestamp.fromDate(sevenDaysAgo);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const thisMonthTS = Timestamp.fromDate(thisMonth);

      airtimeRef = collection(db, "users", user.uid, "airtime");
      utilityRef = collection(db, "users", user.uid, "utility");
      pointsRef = collection(db, "users", user.uid, "points");

      const airtimeQuery = query(
        airtimeRef,
        where("createdAt", ">=", sevenDaysAgoTS),
        orderBy("createdAt", "desc"),
      );
      const utilityQuery = query(
        utilityRef,
        where("createdAt", ">=", thisMonthTS),
        orderBy("createdAt", "desc"),
      );
      const pointsQuery = query(
        pointsRef,
        where("createdAt", ">=", sevenDaysAgoTS),
        orderBy("createdAt", "desc"),
      );

      airtimeSub = onSnapshot(
        airtimeQuery,
        (snapshot) => {
          let amount = 0;
          if (snapshot.empty) {
            console.log(snapshot);
            setAirtimeData([]);
            return;
          }
          const transactions = snapshot.docs
            ? snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                date: new Date(doc.data()["createdAt"].toDate()),
              }))
            : [];
          for (let i = 0; i < transactions.length; i++) {
            amount += transactions[i].amount;
          }
          setWeeklyData({
            amount: amount ? amount : 0,
            noTransactions: transactions.length,
          });
          setAirtimeData(transactions);
          console.log("airtime-trx", transactions);
        },
        (err) => {
          console.error("Error listening to Airtime transactions:", err);
        },
      );

      //utility Bills Listener
      utilitySub = onSnapshot(
        utilityQuery,
        (snapshot) => {
          let amount = 0;
          if (snapshot.empty) {
            console.log(snapshot);
            setUtilityData([]);
            return;
          }
          const transactions = snapshot.docs
            ? snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                date: new Date(doc.data()["createdAt"].toDate()),
              }))
            : [];
          for (let i = 0; i < transactions.length; i++) {
            amount += transactions[i].amount;
            console.log("amount", amount);
          }
          setUtilityMonthlyData({
            amount: amount,
            noTransactions: transactions.length,
          });
          setUtilityData(transactions);
          console.log("utility-trx", transactions);
        },
        (err) => {
          console.error("Error listening to Utility transactions:", err);
        },
      );

      pointsSub = onSnapshot(
        pointsQuery,
        (snapshot) => {
          let amount = 0;
          if (snapshot.empty) {
            setPointsData({ amount: 0, noTransactions: 0 });
            return;
          }
          const transactions = snapshot.docs
            ? snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                date: new Date(doc.data()["createdAt"].toDate()),
              }))
            : [];
          for (let i = 0; i < transactions.length; i++) {
            amount += transactions[i].points;
          }
          setPointsData({
            amount: amount ? amount : 0,
            noTransactions: transactions.length,
          });
          console.log("points-trx", transactions);
        },
        (err) => {
          console.error("Error listening to Points transactions:", err);
        },
      );
    });

    return () => {
      airtimeSub();
      utilitySub();
      pointsSub();
      onAuth();
    };
  }, []);
  return useMemo(
    () => ({
      airtimeData,
      weeklyData,
      utilityData,
      utilityMonthlyData,
      pointsData,
    }),
    [airtimeData, weeklyData, utilityData, utilityMonthlyData, pointsData],
  );
};

const getMonthlyReferrals = (transactions, ref) => {
  const now = new Date();
  const monthsData = {};
  const pointsData = {};
  let monthlyData;

  if (!ref) {
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
        //pointsData[key] += 20;
        pointsData[key] += t.points ? t.points : 0;
      }
    });

    monthlyData = monthsData;

    return { monthlyData, pointsData };
  } else {
    for (let i = 0; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthsData[key] = 0;
    }
    transactions.forEach((t) => {
      // t.date is already a Date object from the conversion above
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      if (monthsData[key] !== undefined) {
        monthsData[key] += 1;
      }
    });

    monthlyData = monthsData;

    return { monthlyData };
  }
};

export default useTransactionFetch;

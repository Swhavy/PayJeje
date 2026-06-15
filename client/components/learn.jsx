export const useReferallData = (userId) => {
  const [PointsData, setPointsData] = useState(null);
  const [isloading, setLoading] = useState(true);
  const [iserror, setError] = useState(null);
  const [pntsErr, setPntsErr] = useState(null);
  const [pnts, setPnts] = useState(20);
  const [refDocs, setRefDocs] = useState([]);
  const [streakDocs, setStreakDocs] = useState([]);
  const [refData, setRefData] = useState([]);

  const processTransactions = (referrals, streak) => {
    const transactions = [...referrals, ...streak];
    const monthlyData = getMonthlyReferrals(transactions, false);
    console.log("montlyData", monthlyData);
    const result = calculateInflowChange(monthlyData, pnts, false);
    console.log("hey gee", result);
    setPointsData(result);
    setError(null);
  };

  const processRefTransactions = (referrals) => {
    const transactions = [...referrals];
    const monthlyData = getMonthlyReferrals(transactions, true);
    console.log("montlyData", monthlyData);
    const result = calculateInflowChange(monthlyData, pnts, true);
    console.log("hey gee", result);
    setRefData(result);
    setError(null);
  };

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
        let points;
        try {
          console.log("Hi mahn", snapshots.data()?.points);
          points = snapshots.data()?.points;
          setPnts(points);
        } catch (err) {
          console.log(err);
          setPntsErr(err);
        }
      },
      (err) => {
        console.log(err);
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
      (snapshot) => {
        try {
          const transactions = snapshot.docs.map((doc) => ({
            id: doc.id,
            //type: "referral",
            ...doc.data(),
            // Convert Timestamp string to Date object for calculations
            date: new Date(doc.data()["createdAt"].toDate()),
          }));
          setRefDocs(transactions);
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

  //useEffect to process referral and streak data whenever either of them changes. This ensures that the pointsData state is always up-to-date with the latest transactions from both collections. The processing function combines the referral and streak transactions, calculates the monthly referrals and points, and then computes the percentage change compared to previous months. The results are stored in pointsData state for use in the UI.
  useEffect(() => {
    //if (refDocs.length === 0 && streakDocs.length === 0) return;
    processTransactions(refDocs, streakDocs);
  }, [refDocs, streakDocs]);

  //useEffect to process RefTransactions to update referrals UI
  useEffect(() => {
    processRefTransactions(refDocs);
  }, [refData]);

  return { PointsData, refData, isloading, iserror };
};

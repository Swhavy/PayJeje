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
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { useSelector } from "react-redux";

const referralsSnapshot = () => {
  const user = useSelector((state) => state.user.user);
  const [referrals, setReferrals] = useState();
  // const [details, setDetails] = useState({
  //   refferalsCount: 0,
  // });
  const [activeRefIds, setActiveRefIds] = useState();
  const now = new Date();
  const twoWeeks = new Date();
  twoWeeks.setDate(now.getDate() - 14);
  twoWeeks.setHours(0, 0, 0, 0);
  const twoWeeksTs = Timestamp.fromDate(twoWeeks);
  const userRef = doc(db, "users", user?.uid);
  const userReferrals = collection(db, "users", user?.uid, "referrals");

  let unsubscribe = () => {};
  let activeRefSub = () => {};
  let refSub = () => {};
  let ref;
  let activeIds;
  const userReferrals_Query = useMemo(() => {
    return query(
      collection(db, "users", user?.uid, "referrals"),
      where("lastLogin", ">=", twoWeeksTs),
    );
  }, [user?.uid, twoWeeksTs]); // ← dependencies, same idea as useEffect deps

  useEffect(() => {
    let refsData;
    // unsubscribe = onSnapshot(
    //   userRef,
    //   (snapshot) => {
    //     const info = snapshot.data();
    //     setDetails({refferalsCount: info.refferalsCount });
    //   },
    //   (err) => {
    //     console.log("error getting user data at the referralSnapshot", err);
    //   },
    // );

    activeRefSub = onSnapshot(
      userReferrals_Query,
      (snapshot) => {
        refsData = snapshot.docs.map((refs) => refs.id);

        console.log("Active refferrals: ", refsData);
        setActiveRefIds(refsData);
      },
      (err) => {
        console.log("an error while trying to fetch active referrals", err);
      },
    );

    refSub = onSnapshot(
      userReferrals,
      (snapshots) => {
        ref = snapshots.docs.map((ref) => ({ id: ref.id, ...ref.data() }));
        setReferrals(ref);
      },
      (err) => {
        console.log("an error while trying to fetch referrals", err);
      },
    );
    return () => {
      // unsubscribe();
      refSub();
      activeRefSub();
    };
  }, []);

  return { activeRefIds, referrals };
};
export default referralsSnapshot;

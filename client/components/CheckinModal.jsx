import { useState, useMemo, useEffect } from "react";
import { Check, X } from "lucide-react";
import { useSelector } from "react-redux";
import {
  setDoc,
  doc,
  arrayUnion,
  query,
  where,
  getDoc,
  getDocs,
  orderBy,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { functions } from "@/firebaseConfig";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { useSpinner } from "./SpinnerProvider";

export default function CheckInCalendar({ isOpen = true, onClose }) {
  const { appContext, setAppContext } = useSpinner();
  const [checkedInDates, setCheckedInDates] = useState(new Set([]));
  const UID = useSelector((state) => state.user.user);
  const [today, setToday] = useState(new Date());
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    const getServerTime = httpsCallable(functions, "getServerTime");
    const fetchCheckIns = async () => {
      await getServerTime()
        .then((result) => {
          setToday(new Date(result.data.serverDate));
          console.log("Today: ", today);
          setAppContext({ ...appContext, spinner: false });
          //setCheckedInDates(new Set(userCheckIns));
        })
        .catch((error) => {
          console.error("Error fetching server time:", error);
        });
    };
    fetchCheckIns();
    //return () => fetchCheckIns()
  }, []);

  useEffect(() => {
    if (!UID || !UID?.uid) return;

    const checkinRef = collection(db, "users", UID.uid, "points");
    const userDoc = doc(db, "users", UID.uid);
    const now = new Date();

    const q = query(
      checkinRef,
      where("type", "==", "checkin"),
      where("month", "==", now.getMonth() + 1),
      where("year", "==", now.getFullYear()),
    );
    //function to collect the checkinn data in the initial login
    const updateStreak = async () => {
      try {
        const userstreak = await getDoc(userDoc);
        if (userstreak.exists()) {
          const userData = userstreak.data();
          setStreakCount(userData?.streak || 0);
        }
      } catch (e) {
        console.error("Error updating streak:", e);
      }
    };
    updateStreak();

    //event listener to provide real time data update of checkin data
    const subscribe = onSnapshot(
      q,
      (snapshot) => {
        const days = snapshot.docs.map((d) => d.data().day);
        setCheckedInDates(new Set(days));
        updateStreak();
      },
      (err) => {
        console.error("Error fetching check-ins:", err);
      },
    );
    return () => {
      subscribe();
    };
  }, [UID?.uid]);
  const checkin = httpsCallable(functions, "checkin");

  // const today = new Date();
  if (!today) return null;
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  const daysInMonth =
    new Date(currentYear, currentMonth + 1, 0).getDate() || [];
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() || [];

  const calendarDays = useMemo(() => {
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({
        date: 0,
        isCheckedIn: false,
        isMissed: false,
        isToday: false,
        isFuture: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === currentDay;
      const isFuture = i > currentDay;
      const isCheckedIn = checkedInDates.has(i) && !isFuture;
      const isMissed = !isCheckedIn && i < currentDay;

      days.push({
        date: i,
        isCheckedIn,
        isMissed,
        isToday,
        isFuture,
      });
    }

    return days;
  }, [checkedInDates, currentDay, daysInMonth, firstDayOfMonth]);

  const monthName =
    new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }) || [];

  const handleDayClick = async (date) => {
    if (date === 0 || date > currentDay) return;

    const newCheckedIn = new Set(checkedInDates);
    if (newCheckedIn.has(date)) {
      // newCheckedIn.delete(date);
      return; // Prevent unchecking
    } else {
      newCheckedIn.add(date);
      // await setDoc(
      //   doc(db, "users", uid, "activities", "checkins"),
      //   { [monthName]: arrayUnion(date) },
      //   { merge: true },
      // );
      const activity = await checkin({id:UID.uid});
      console.log("activity: " + activity);
    }
    setCheckedInDates(newCheckedIn);
  };

  // const streakCount = Array.from(checkedInDates)
  //   .sort((a, b) => b - a)
  //   .reduce((streak, date, index, arr) => {
  //     if (index === 0) return 1;
  //     if (arr[index - 1] - date === 1) return streak + 1;
  //     return streak;
  //   }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
      <div className="w-full max-w-md scale-75 bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] rounded-2xl shadow-2xl border border-[#1a3a52]/50 overflow-hidden">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-[#001a2e] to-[#0a1f3a] border-b border-[#1a3a52]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#e8f0f8] mb-4">
                {monthName}
              </h2>
              <div className="flex gap-6">
                <div>
                  <p className="text-[#8aa6b8] text-xs font-semibold uppercase tracking-wider mb-1">
                    Streak
                  </p>
                  <p
                    className="text-3xl font-bold text-[#00FF41]"
                    style={{ textShadow: "0 0 10px rgba(0, 255, 65, 0.5)" }}
                  >
                    {streakCount}
                  </p>
                </div>
                <div>
                  <p className="text-[#8aa6b8] text-xs font-semibold uppercase tracking-wider mb-1">
                    Checked In
                  </p>
                  <p className="text-3xl font-bold text-[#e8f0f8]">
                    {checkedInDates.size}
                  </p>
                </div>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#1a3a52] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#e8f0f8]" />
              </button>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="p-6">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {[
              { day: "S", id: `${Date.now()}-${Math.random()}` },
              { day: "M", id: `${Date.now()}-${Math.random()}` },
              { day: "T", id: `${Date.now()}-${Math.random()}` },
              { day: "W", id: `${Date.now()}-${Math.random()}` },
              { day: "T", id: `${Date.now()}-${Math.random()}` },
              { day: "F", id: `${Date.now()}-${Math.random()}` },
              { day: "S", id: `${Date.now()}-${Math.random()}` },
            ].map((day) => (
              <div
                key={day.id}
                className="text-center text-xs font-bold text-[#00FF41] h-8 flex items-center justify-center"
              >
                {day.day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDayClick(day.date)}
                disabled={day.date === 0 || day.isFuture}
                className={`aspect-square rounded-xl text-sm font-semibold flex items-center justify-center transition-all ${
                  day.date === 0
                    ? "cursor-default"
                    : day.isFuture
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:scale-110 active:scale-95"
                } ${
                  day.isCheckedIn
                    ? "bg-[#00FF41] text-[#001a2e]"
                    : day.isMissed
                      ? "bg-[#0a1f3a] border border-red-500/40 text-red-400/60"
                      : day.isFuture
                        ? "bg-[#0a1f3a]/40 border border-[#1a3a52]/30 text-[#8aa6b8]/40"
                        : day.isToday
                          ? "bg-[#0a1f3a] border-2 border-[#00FF41] text-[#e8f0f8]"
                          : "bg-[#0a1f3a] border border-[#1a3a52] text-[#e8f0f8]"
                }`}
              >
                {day.date !== 0 && (
                  <>
                    {day.isCheckedIn ? (
                      <Check className="w-4 h-4" />
                    ) : day.isMissed ? (
                      <span>✕</span>
                    ) : (
                      <span>{day.date}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

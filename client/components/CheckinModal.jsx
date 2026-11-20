import { useState, useMemo, useEffect } from "react";
import { Check, X } from "lucide-react";
import { useSelector } from "react-redux";
import {
  doc,
  query,
  where,
  getDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db, functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { useSpinner } from "./SpinnerProvider";
import ModalPortal from "@/components/ui/ModalPortal";
import { ReceiptStrip } from "@/components/receipts/ReceiptParts";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

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
          setAppContext({ ...appContext, spinner: false });
        })
        .catch((error) => {
          console.error("Error fetching server time:", error);
        });
    };
    fetchCheckIns();
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

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

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

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  const handleDayClick = async (date) => {
    if (date === 0 || date > currentDay) return;
    const newCheckedIn = new Set(checkedInDates);
    if (newCheckedIn.has(date)) {
      return;
    } else {
      newCheckedIn.add(date);
      await checkin({ id: UID.uid });
    }
    setCheckedInDates(newCheckedIn);
  };

  return (
    <ModalPortal
      isOpen={Boolean(isOpen && today)}
      onClose={onClose}
      noPadding
      maxWidthClass="max-w-md"
      ariaLabel="Daily Check-In Calendar"
    >
      <ReceiptStrip />

      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-3">
        <div className="space-y-3">
          <h2 className="text-section-title text-foreground">{monthName}</h2>
          <div className="flex gap-6">
            <div>
              <span className="pw-label block">STREAK</span>
              <p className="pw-num text-2xl font-black text-brand-400">
                {streakCount}
              </p>
            </div>
            <div>
              <span className="pw-label block">CHECKED IN</span>
              <p className="pw-num text-2xl font-black text-foreground">
                {checkedInDates.size}
              </p>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close check-in calendar"
            className="pw-tap pw-pressable inline-flex items-center justify-center rounded-panel hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Calendar */}
      <div className="p-4 sm:p-5 space-y-2">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((day, idx) => (
            <div
              key={idx}
              className="text-center text-caption font-bold text-brand-400 h-8 flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDayClick(day.date)}
              disabled={day.date === 0 || day.isFuture}
              className={cn(
                "aspect-square min-h-10 rounded-panel pw-num text-xs sm:text-sm font-bold flex items-center justify-center transition-colors",
                day.date === 0
                  ? "cursor-default border-transparent"
                  : day.isFuture
                    ? "cursor-not-allowed bg-panel/50 border border-border/50 text-muted-foreground/40"
                    : "pw-pressable cursor-pointer border",
                day.date !== 0 &&
                  day.isCheckedIn &&
                  "bg-brand-500 border-brand-500 text-brand-foreground",
                day.date !== 0 &&
                  !day.isCheckedIn &&
                  day.isMissed &&
                  "bg-destructive/10 border-destructive/25 text-destructive/70",
                day.date !== 0 &&
                  !day.isCheckedIn &&
                  !day.isMissed &&
                  !day.isFuture &&
                  (day.isToday
                    ? "bg-brand-tint border-2 border-brand-500 text-foreground"
                    : "bg-panel border-border text-foreground"),
              )}
            >
              {day.date !== 0 &&
                (day.isCheckedIn ? (
                  <Check className="w-4 h-4" />
                ) : day.isMissed ? (
                  <span aria-label="Missed">✕</span>
                ) : (
                  <span>{day.date}</span>
                ))}
            </button>
          ))}
        </div>
      </div>
    </ModalPortal>
  );
}

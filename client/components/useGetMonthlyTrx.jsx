import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useSelector } from "react-redux";

const useGetMonthlyTrx = () => {
  const reduxUser = useSelector((state) => state.user?.user);
  const [dateLabel, setDateLabels] = useState([]);
  const [inflow, setInflow] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [totalInflow, setTotalInflow] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    let unsubscribe = () => {};
    let unsubAuth = () => {};

    unsubAuth = onAuthStateChanged(auth, (authUser) => {
      const activeUid =
        authUser?.uid ||
        reduxUser?.uid ||
        (import.meta.env.DEV ? "dev_user_123" : null);

      if (!activeUid) {
        setInflow([]);
        setExpenses([]);
        setDateLabels([]);
        setTotalInflow(0);
        setTotalExpenses(0);
        return;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const monthShort = now.toLocaleDateString("en-US", { month: "short" });

      // Initialize daily buckets for the current month (Day 1 to Last Day of Month)
      const dayData = {};
      const labels = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${monthShort}-${day}`;
        dayData[dateKey] = { inflow: 0, expenses: 0 };
        labels.push(dateKey);
      }

      const transactionRef = collection(db, "users", activeUid, "Transactions");
      const q = query(transactionRef);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Reset daily totals for fresh accumulation
          Object.keys(dayData).forEach((key) => {
            dayData[key].inflow = 0;
            dayData[key].expenses = 0;
          });

          let runningInflow = 0;
          let runningExpenses = 0;

          snapshot.docs.forEach((docSnap) => {
            const trx = docSnap.data();
            const status = String(trx.status || "completed").toLowerCase();
            const type = String(trx.type || "").toLowerCase().trim();
            const category = String(trx.category || "").toLowerCase().trim();
            const narration = String(trx.narration || "").toLowerCase().trim();

            const isRefund =
              status === "refunded" ||
              trx.refunded === true ||
              narration.includes("refund") ||
              category.includes("refund");

            // Exclude failed, cancelled, and refunded transactions from the chart
            if (
              status === "failed" ||
              status === "cancelled" ||
              isRefund
            ) {
              return;
            }

            // Robust Date Parsing across all Firestore Timestamp / ISO / string formats
            let txDate = null;
            if (trx.createdAt?.toDate) {
              txDate = trx.createdAt.toDate();
            } else if (trx.createdAt?.seconds) {
              txDate = new Date(trx.createdAt.seconds * 1000);
            } else if (trx.created_at) {
              txDate = new Date(trx.created_at);
            } else if (trx.timestamp?.toDate) {
              txDate = trx.timestamp.toDate();
            } else if (trx.timestamp) {
              txDate = new Date(trx.timestamp);
            } else if (trx.date) {
              txDate = new Date(trx.date);
            }

            if (!txDate || isNaN(txDate.getTime())) {
              return;
            }

            // Only include transactions that occurred in the current month & year
            if (
              txDate.getFullYear() !== currentYear ||
              txDate.getMonth() !== currentMonth
            ) {
              return;
            }

            const txDay = txDate.getDate();
            const dateKey = `${monthShort}-${txDay}`;
            const numAmount = Math.abs(Number(trx.amount || 0));

            if (numAmount <= 0 || !dayData[dateKey]) {
              return;
            }

            // 1. Explicit Credit / Inflow ALWAYS takes priority
            if (
              type === "credit" ||
              type === "inflow" ||
              type === "income"
            ) {
              dayData[dateKey].inflow += numAmount;
              runningInflow += numAmount;
            }
            // 2. Explicit Debit / Expense
            else if (
              type === "debit" ||
              type === "expense" ||
              type === "expenses" ||
              type === "withdrawal" ||
              type === "payout"
            ) {
              dayData[dateKey].expenses += numAmount;
              runningExpenses += numAmount;
            }
            // 3. Fallback heuristics based on Category / Narration
            else if (
              category.includes("deposit") ||
              category.includes("funding") ||
              category.includes("earning") ||
              category.includes("cashback") ||
              category.includes("referral") ||
              category.includes("bonus") ||
              narration.includes("cashback") ||
              narration.includes("deposit") ||
              narration.includes("earning") ||
              narration.includes("funding")
            ) {
              dayData[dateKey].inflow += numAmount;
              runningInflow += numAmount;
            } else {
              // Default all utility / service purchases to expenses
              dayData[dateKey].expenses += numAmount;
              runningExpenses += numAmount;
            }
          });

          const inflowArr = [];
          const expensesArr = [];

          labels.forEach((dayKey) => {
            inflowArr.push(dayData[dayKey].inflow);
            expensesArr.push(dayData[dayKey].expenses);
          });

          setInflow(inflowArr);
          setExpenses(expensesArr);
          setDateLabels(labels);
          setTotalInflow(runningInflow);
          setTotalExpenses(runningExpenses);
        },
        (error) => {
          console.error("Error generating monthly transaction chart data:", error);
        }
      );
    });

    return () => {
      unsubscribe();
      unsubAuth();
    };
  }, [reduxUser?.uid]);

  return { inflow, expenses, dateLabel, totalInflow, totalExpenses };
};

export default useGetMonthlyTrx;
import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import useGetMonthlyTrx from "./useGetMonthlyTrx";
import { useTheme } from "./ThemeProvider";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const TransactionChart = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [range, setRange] = useState("30D"); // "7D" | "30D"
  const [isMobile, setIsMobile] = useState(false);
  const { inflow = [], expenses = [], dateLabel = [] } = useGetMonthlyTrx();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sliced = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthShort = now.toLocaleDateString("en-US", { month: "short" });
    const fallbackLabels = Array.from(
      { length: daysInMonth },
      (_, idx) => `${monthShort}-${idx + 1}`,
    );
    const activeLabels = dateLabel.length > 0 ? dateLabel : fallbackLabels;
    const totalLen = activeLabels.length;
    const activeInflow =
      inflow.length === totalLen ? inflow : Array(totalLen).fill(0);
    const activeExpenses =
      expenses.length === totalLen ? expenses : Array(totalLen).fill(0);

    if (range === "7D") {
      const todayDay = now.getDate();
      const endIdx = Math.min(totalLen, Math.max(7, todayDay));
      const startIdx = Math.max(0, endIdx - 7);
      return {
        labels: activeLabels.slice(startIdx, endIdx),
        incomeSeries: activeInflow.slice(startIdx, endIdx),
        expenseSeries: activeExpenses.slice(startIdx, endIdx),
      };
    }

    return {
      labels: activeLabels,
      incomeSeries: activeInflow,
      expenseSeries: activeExpenses,
    };
  }, [dateLabel, inflow, expenses, range]);

  const yMax = useMemo(() => {
    const allValues = [...sliced.incomeSeries, ...sliced.expenseSeries];
    const peak = allValues.length > 0 ? Math.max(...allValues, 0) : 0;
    const padded = Math.ceil(peak * 1.25);
    return padded > 0 ? padded : 1000;
  }, [sliced]);

  const palette = isDark
    ? {
        incomeLine: "#34D399",
        incomeFill: "rgba(52, 211, 153, 0.12)",
        expenseLine: "#F87171",
        expenseFill: "rgba(248, 113, 113, 0.10)",
        tickText: "#94A3B8",
        grid: "rgba(148, 163, 184, 0.12)",
        tooltipBg: "#0B1411",
        tooltipText: "#F8FAFC",
        tooltipBorder: "#1B3329",
        pointBorder: "#0B1411",
      }
    : {
        incomeLine: "#047857",
        incomeFill: "rgba(4, 120, 87, 0.10)",
        expenseLine: "#C81E1E",
        expenseFill: "rgba(200, 30, 30, 0.08)",
        tickText: "#475569",
        grid: "rgba(15, 23, 42, 0.08)",
        tooltipBg: "#FFFFFF",
        tooltipText: "#0F172A",
        tooltipBorder: "#E2E8F0",
        pointBorder: "#FFFFFF",
      };

  const transactionData = {
    labels: sliced.labels,
    datasets: [
      {
        label: "Income",
        data: sliced.incomeSeries,
        borderColor: palette.incomeLine,
        backgroundColor: palette.incomeFill,
        borderWidth: 2.25,
        fill: true,
        tension: 0.35,
        pointRadius: (ctx) => (Number(ctx.raw) > 0 ? (isMobile ? 3 : 4) : 0),
        pointBackgroundColor: palette.incomeLine,
        pointBorderColor: palette.pointBorder,
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
      },
      {
        label: "Expenses",
        data: sliced.expenseSeries,
        borderColor: palette.expenseLine,
        backgroundColor: palette.expenseFill,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: (ctx) => (Number(ctx.raw) > 0 ? (isMobile ? 3 : 4) : 0),
        pointBackgroundColor: palette.expenseLine,
        pointBorderColor: palette.pointBorder,
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        titleColor: palette.tooltipText,
        bodyColor: palette.tooltipText,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${formatNaira(context.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: yMax,
        border: { display: false },
        ticks: {
          color: palette.tickText,
          maxTicksLimit: 5,
          font: {
            size: 11,
            family: "'Plus Jakarta Sans', 'Inter', sans-serif",
            weight: "600",
          },
          callback: (value) => `₦${Number(value).toLocaleString("en-NG")}`,
        },
        grid: {
          color: palette.grid,
        },
      },
      x: {
        border: { display: false },
        ticks: {
          color: palette.tickText,
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          font: {
            size: 11,
            family: "'Plus Jakarta Sans', 'Inter', sans-serif",
          },
          callback: function (val, index) {
            const label = sliced.labels[index];
            if (!label) return "";
            if (range === "7D") return label;
            return index % 5 === 0 || index === sliced.labels.length - 1
              ? label
              : "";
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="w-full h-full p-4 sm:p-5 flex flex-col gap-3">
      {/* Header + Legend + 7D/30D Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-card-title text-foreground">Transaction History</h3>
          <div className="flex items-center gap-4 mt-1 text-caption text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-pill bg-brand-400" />
              Income
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-pill bg-destructive" />
              Expenses
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Chart range"
          className="pw-segmented inline-flex"
        >
          {["7D", "30D"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setRange(opt)}
              className={cn(
                "px-3.5 min-h-9 rounded-pill text-caption font-bold transition-all",
                range === opt
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 sm:h-64 w-full min-h-0">
        <Line data={transactionData} options={options} />
      </div>
    </div>
  );
};

export default TransactionChart;

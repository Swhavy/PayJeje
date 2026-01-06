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
import { useEffect, useState } from "react";
import { use } from "react";


// Register ChartJS components
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
  const [isMobile, setIsMobile] = useState(false);
  const [max, setMax] = useState(null)
  const {inflow, expenses, dateLabel} = useGetMonthlyTrx()

useEffect(() => {
  const calc = Math.max(...inflow, ...expenses)
  const maxVal = Math.ceil(calc * 1.5)
  setMax(maxVal)
}, [inflow, expenses, dateLabel])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);




  // Sample transaction data - replace with your actual data
  const transactionData = {
    // labels: [
    //   "Jan 1",
    //   "Jan 5",
    //   "Jan 10",
    //   "Jan 15",
    //   "Jan 20",
    //   "Jan 25",
    //   "Jan 30",
    // ],
    labels: dateLabel,
    datasets: [
      {
        label: "Income",
        //data: [2500, 3200, 2800, 4100, 3500, 4200, 3800],
        data: inflow,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: isMobile ? 3 : 5,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: isMobile ? 5 : 7,
      },
      {
        label: "Expenses",
        //data: [1200, 1500, 1800, 1300, 1600, 1400, 1700],
        data: expenses,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: isMobile ? 3 : 5,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: isMobile ? 5 : 7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e5e7eb",
          font: {
            size: isMobile ? 11 : 13,
            weight: "500",
            family: "'Geist', sans-serif",
          },
          padding: isMobile ? 10 : 20,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      title: {
        display: true,
        text: "Transaction History",
        color: "#f3f4f6",
        font: {
          size: isMobile ? 14 : 18,
          weight: "bold",
          family: "'Geist', sans-serif",
        },
        padding: {
          bottom: isMobile ? 10 : 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#e5e7eb",
        borderColor: "#374151",
        borderWidth: 1,
        padding: isMobile ? 8 : 12,
        displayColors: true,
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ₦${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: max,
        ticks: {
          color: "#9ca3af",
          font: {
            size: isMobile ? 10 : 12,
            family: "'Geist', sans-serif",
          },
          callback: (value) => "₦" + value.toLocaleString(),
        },
        grid: {
          color: "rgba(75, 85, 99, 0.2)",
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: "#9ca3af",
          font: {
            size: isMobile ? 10 : 12,
            family: "'Geist', sans-serif",
          },
        },
        grid: {
          display: false,
          drawBorder: false,
        },
      },
    },
  };

  return (
    <div className="w-full h-full bg-gradient-to-br bg-teal-800/10 backdrop-blur-2xl rounded-lg p-3 sm:p-4 lg:p-6 border border-slate-700 flex flex-col">
      <div className="flex-grow w-full min-h-0">
        <Line data={transactionData} options={options} />
      </div>
    </div>
  );
}

export default TransactionChart
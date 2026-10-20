import { useRef, useState } from "react";
import { Filter, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebaseConfig";
import { toast } from "sonner";
import TransactionsModal from "@/components/TransactionsModal";
import { getDoc, doc } from "firebase/firestore";
import useTransactionFetch from "@/components/useTransactionFetch";
import DashboardLayout from "@/components/DashboardLayout";
import { useSelector } from "react-redux";

export default function BillHistory() {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const uid = useSelector((state) => state.user.user.uid);
  const [overlay, setOverlay] = useState(false);
  const { getTransactionData } = useTransactionFetch();
  const historyGetRef = useRef(null);
  const [spin, setSpin] = useState(false);
  const [data, setData] = useState(false);
  const [pages, setPages] = useState({ totalPages: 1, currentPage: 1 });
  const [pageStart, setPageStart] = useState(1);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "all",
    reference: "",
    category: "all",
  });

  const receipts = async (reference) => {
    setOverlay(true);
    const docRef = doc(db, "users", uid, "Transactions", reference);
    await getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          setData(docSnap.data());
          setIsConfirmationOpen(true);
          setOverlay(false);
          console.log("Document data:", docSnap.data());
        } else {
          setOverlay(false);
          toast.error("No such document!");
          console.log("No such document!");
        }
      })
      .catch((error) => {
        setOverlay(false);
        toast.error("Error getting document");
        console.log("Error getting document:", error);
      });
  };
  if (!historyGetRef.current) {
    historyGetRef.current = httpsCallable(functions, "billHistory");
  }
  const getHistory = async (next, prev, first) => {
    if (!filters.dateFrom && filters.dateTo) {
      return toast.error("Please select a from date");
    }
    setSpin(true);
    try {
      const response = await getTransactionData({
        from: filters.dateFrom,
        to: filters.dateTo,
        status: filters.status,
        category: filters.category,
        direction: next ? "next" : prev ? "prev" : first ? "first" : null,
      });
      if (response.status === "success") {
        setSpin(false);
        toast.success("Bill history fetched successfully");
        if (next) {
          if (pages.totalPages >= pages.currentPage) {
            setTransactions(response.data);
            setPages((prev) => {
              let nextPage = prev.currentPage + 1;
              console.log("Next Page:", nextPage);
              return { ...prev, currentPage: nextPage };
            });
            return setSpin(false);
          }
        } else if (prev) {
          if (pages.currentPage > 1) {
            setTransactions(response.data);
            setPages((prev) => {
              let prevPage = prev.currentPage - 1;
              console.log("Prev Page:", prevPage);
              return { ...prev, currentPage: prevPage };
            });
            return setSpin(false);
          }
        }
        //else if(first)
        setTransactions(response.data);
        setPages((prev) => {
          let totalPages = response.totalPages;
          let currentPage = 1;
          console.log("First Page:", currentPage);
          return { totalPages: totalPages, currentPage: currentPage };
        });
        return setSpin(false);
      } else if (response.status === "error" && response.data.length === 0) {
        setSpin(false);
        setTransactions([]);
        setPages({ totalPages: 1, currentPage: 1 });
        toast.error("No bill history found");
      }
      toast.error("failed to fetch Bill history successfully");
      console.log("failed to fetch bill history", response);
    } catch (error) {
      setSpin(false);
      toast.error("An error occured while fetching bill history");
      console.log("error fetching bill history", error);
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const ITEMS_PER_PAGE = 10;
  const [transactions, setTransactions] = useState([]);
  // const [transactions, setTransactions] = useState([
    const mockData =[{
       id: 1,
       //reference: "TXN-001",
       reference: "PayWaka-EBOpxIuxxwUkdCi1cBtkKDzq7cV2-1754431092774",
       category: "CABLEBILLS",
       amount: 5500,
       status: "completed",
       date: "2024-10-15",
       description: "Cable TV Subscription",
     },
     {
       id: 2,
       reference: "TXN-002",
       category: "AIRTIME",
       amount: 1000,
       status: "completed",
       date: "2024-10-14",
       description: "Airtime Purchase",
     },
     {
       id: 3,
       reference: "TXN-003",
       category: "MOBILEDATA",
       amount: 2000,
       status: "pending",
       date: "2024-10-13",
       description: "Mobile Data Bundle",
     },
     {
       id: 4,
       reference: "TXN-004",
       category: "UTILITYBILLS",
       amount: 8500,
       status: "completed",
       date: "2024-10-12",
       description: "Electricity Bill",
     },
   ];

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      status: "all",
      reference: "",
      category: "all",
    });
    setPages((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page when filters reset
  };

  const filteredTransactions = transactions?.filter((txn) => {
    const matchesDateFrom =
      !filters.dateFrom || new Date(txn.date) >= new Date(filters.dateFrom);
    const matchesDateTo =
      !filters.dateTo || new Date(txn.date) <= new Date(filters.dateTo);
    const matchesStatus =
      filters.status === "all" || txn.status === filters.status;
    const matchesReference =
      !filters.reference ||
      txn.reference.toLowerCase().includes(filters.reference.toLowerCase());
    const matchesCategory =
      filters.category === "all" || txn.category === filters.category;

    return (
      matchesDateFrom &&
      matchesDateTo &&
      matchesStatus &&
      matchesReference &&
      matchesCategory
    );
  });

  const getCategoryColor = (category) => {
    const colors = {
      CABLEBILLS: "bg-blue-500/10 text-blue-400",
      AIRTIME: "bg-purple-500/10 text-purple-400",
      MOBILEDATA: "bg-cyan-500/10 text-cyan-400",
      UTILITYBILLS: "bg-orange-500/10 text-orange-400",
      "CARD Transaction ": "bg-amber-500/10 text-amber-400",
    };
    return colors[category] || "bg-gray-500/10 text-gray-400";
  };

  const getStatusColor = (status) => {
     return status === "successful"
       ? "text-primary dark:text-green-400"
       : status === "pending"
         ? "text-yellow-400"
         : "text-red-400";
  };

  const getStatusBg = (status) => {
     return status ===  "successful"
       ? "bg-green-500/10"
       : status === "pending"
         ? "bg-yellow-500/10"
         : "bg-red-500/10";
  };

  // Pagination logic
  // const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  // const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  // const endIndex = startIndex + ITEMS_PER_PAGE;
  // const paginatedTransactions = filteredTransactions.slice(
  //   startIndex,
  //   endIndex,
  // );
  const paginatedTransactions = transactions;

  const handleNextPage = async () => {
    // await getHistory("next", null)
    // if (pages.current < pages.total) {
    //   setPageStart((prev) => prev + 1);
    //   await getHistory();
    //   setCurrentPage((prev) => prev + 1);
    //   window.scrollTo({ top: 0, behavior: "smooth" });
    // }
  };

  const handlePreviousPage = async () => {
    if (pages.current > 1) {
      setPageStart((prev) => prev - 1);
      await getHistory();
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <DashboardLayout>
      <div
        /* bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 */
        className={`min-h-screen  ${overlay ? "p-0 md:p-0 h-screen overflow-hidden" : "p-4 md:p-6"} ${isConfirmationOpen ? "absolute" : "relative"}`}
      >
        {overlay && (
          <div className="bg-black/60 flex justify-center items-center absolute h-screen w-screen z-50 backdrop-blur-sm animate-pulse">
            <div className="absolute m-auto inset-0 animate-spin w-7 h-7 border-2 border-t-sky-500 rounded-full"></div>
            <span className="mt-20 w-20">Loading...</span>
          </div>
        )}
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-1 md:mb-2">
              Transactions
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              View and filter your transaction history
            </p>
          </div>

          {/* Filter Section */}
          <div className="mb-6 md:mb-8">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-foreground rounded-lg transition-colors mb-4 text-sm md:text-base"
            >
              <Filter size={18} />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            {showFilters && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
                  {/* Date From */}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={
                        filters.dateFrom ? filters.dateFrom.split("T")[0] : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value; // gives "yyyy-mm-dd"
                        if (!raw) return; // prevent empty value issues

                        // Convert safely to full ISO
                        const dateObj = new Date(`${raw}T00:00:00Z`);
                        const formatted = dateObj.toISOString(); // e.g. "2025-09-01T00:00:00.000Z"

                        handleFilterChange("dateFrom", formatted);
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-foreground placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo ? filters.dateTo.split("T")[0] : ""}
                      onChange={(e) => {
                        const raw = e.target.value; // e.g. "2025-09-01"
                        if (!raw) return; // prevent empty value issues

                        // Convert safely to Date and set it to the end of the day (so you include the full date range)
                        const dateObj = new Date(`${raw}T00:00:00Z`);
                        dateObj.setUTCHours(23, 59, 59, 999); // ✅ covers the entire selected day

                        const formatted = dateObj.toISOString(); // e.g. "2025-09-01T23:59:59.999Z"
                        console.log("Formatted To Date:", formatted);

                        handleFilterChange("dateTo", formatted);
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-foreground placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    {/* <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => {
                      const raw = e.target.value; // e.g. "mm/dd/yyyy"
                      // Force standard YYYY-MM-DD format (prevents timezone shifts)
                      const formatted = new Date(raw)
                        .toISOString()
                        .split("T")[0];

                        
                      handleFilterChange("dateTo", formatted);
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-foreground placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                  /> */}

                    {/*  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-foreground placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                  /> */}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        handleFilterChange("status", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="successful">Successful</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        handleFilterChange("category", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    >
                      <option value="all">All Categories</option>
                      <option value="CARD">Card Transactions</option>
                      <option value="CABLEBILLS">Cable Bills</option>
                      <option value="AIRTIME">Airtime</option>
                      <option value="MOBILEDATA">Mobile Data</option>
                      <option value="UTILITYBILLS">Utility Bills</option>
                    </select>
                  </div>

                  {/* Reference */}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                      Reference
                    </label>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={filters.reference}
                      onChange={(e) =>
                        handleFilterChange("reference", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-foreground placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
                  >
                    <X size={16} />
                    Reset Filters
                  </button>
                  <button
                    onClick={async () => await getHistory(null, null, "first")}
                    disabled={spin}
                    className={`flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-slate-300 rounded-lg ${spin ? "bg-green-800 cursor-not-allowed hover:bg-green-800" : ""} transition-colors text-sm`}
                  >
                    <Check size={16} />
                    Get
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          {/*come back here*/}
          {/*  <div className="mb-4 text-xs md:text-sm text-slate-400">
          Showing {startIndex + 1}-
          {Math.min(endIndex, filteredTransactions.length)} of{" "}
          {filteredTransactions.length} transactions
        </div> */}

          <div className="hidden md:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Reference
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Category
                    </th>
                    {/* <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Description
                  </th> */}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className={`relative ${spin ? "h-32" : ""}`}>
                  {spin ? (
                    <div className="absolute m-auto inset-0 animate-spin w-7 h-7 border-2 border-t-sky-500 rounded-full">
                      {" "}
                    </div>
                  ) : paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((txn) => (
                      <tr
                        key={txn.id}
                        onClick={() => receipts(txn.tx_ref)}
                        className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-2 py-4 text-sm font-medium text-foreground cursor-pointer">
                          {txn.tx_ref}
                        </td>
                        <td className="text-xs">
                          <span
                            className={`px-1 py-1 rounded-full text-xs font-medium ${getCategoryColor(txn.narration)}`}
                          >
                            {txn.narration}
                          </span>
                        </td>
                        {/*  <td className="px-6 py-4 text-sm text-slate-300">
                        {txn.description}
                      </td> */}
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          ₦{txn.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBg(txn.status)} ${getStatusColor(txn.status)}`}
                          >
                            {/*  .charAt(0).toUpperCase() +
                              txn.status.slice(1)  */}
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {new Date(txn.created_at).toLocaleString("en-NG", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        No transactions found matching your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(txn.narration)}`}
                        >
                          {txn.narration}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBg(txn.status)} ${getStatusColor(txn.status)}`}
                        >
                          {/* .charAt(0).toUpperCase() +
                            txn.status.slice(1) */}
                          {txn.status}
                        </span>
                      </div>
                      {/*  <p className="text-sm text-slate-300">{txn.description}</p> */}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400">
                      {new Date(txn.created_at).toLocaleString("en-NG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      ₦{txn.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center backdrop-blur-sm">
                <p className="text-slate-400 text-sm">
                  No transactions found matching your filters
                </p>
              </div>
            )}
          </div>

          {paginatedTransactions.length > 0 && (
            <div className="mt-6 md:mt-8 flex items-center justify-between">
              <button
                onClick={async () => await getHistory(null, "prev")}
                disabled={pages.currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors text-sm"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <div className="text-sm text-slate-300">
                Page{" "}
                <span className="font-semibold text-foreground">
                  {pages.currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {pages.totalPages}
                </span>
              </div>

              <button
                onClick={async () => await getHistory("next", null)}
                disabled={pages.currentPage === pages.totalPages}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors text-sm"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {data && (
          <TransactionsModal
            transaction={data}
            isOpen={isConfirmationOpen}
            onClose={() => setIsConfirmationOpen(false)}
          />
        )}
        {/* {data && (
        <TransactionsModal
          transaction={data}
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
        />
      )} */}
      </div>
    </DashboardLayout>
  );
}

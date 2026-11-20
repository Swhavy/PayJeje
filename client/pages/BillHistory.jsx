import { useMemo, useState } from "react";
import {
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { db } from "../firebaseConfig";
import { toast } from "sonner";
import TransactionsModal from "@/components/TransactionsModal";
import { getDoc, doc } from "firebase/firestore";
import useTransactionFetch from "@/components/useTransactionFetch";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StateView from "@/components/ui/StateView";
import { ReceiptStatusPill } from "@/components/receipts/ReceiptParts";
import { useSelector } from "react-redux";
import {
  formatTransactionDate,
  getTransactionDisplayTitle,
  getTransactionReference,
  getTransactionStatusInfo,
  isInboundTransaction,
  isRefundTransaction,
  parseTransactionDate,
} from "@/lib/receiptUtils";
import { formatSignedNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 12;

export default function BillHistory() {
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const uid = useSelector((state) => state.user.user.uid);
  const { trxn, getTransactionData } = useTransactionFetch();
  const [spin, setSpin] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [serverTransactions, setServerTransactions] = useState(null);
  const [pages, setPages] = useState({ totalPages: 1, currentPage: 1 });
  const [clientPage, setClientPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "all",
    reference: "",
    category: "all",
  });

  const openReceiptForRow = async (txn) => {
    if (!txn) return;
    setSelectedTx(txn);
    setIsReceiptOpen(true);

    // Hydrate fuller document silently if only minimal reference fields exist
    const ref = getTransactionReference(txn);
    if (!ref || !uid) return;
    try {
      let docSnap = await getDoc(doc(db, "users", uid, "Transactions", ref));
      if (!docSnap.exists()) {
        docSnap = await getDoc(doc(db, "Transactions", ref));
      }
      if (!docSnap.exists()) {
        docSnap = await getDoc(doc(db, "transactions", ref));
      }
      if (docSnap.exists()) {
        setSelectedTx({ id: docSnap.id, ...docSnap.data() });
      }
    } catch {
      // keep already-loaded row data
    }
  };

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
      if (response?.status === "success") {
        setServerTransactions(response.data || []);
        if (next) {
          setPages((p) => ({
            ...p,
            currentPage: Math.min(p.totalPages, p.currentPage + 1),
          }));
        } else if (prev) {
          setPages((p) => ({
            ...p,
            currentPage: Math.max(1, p.currentPage - 1),
          }));
        } else {
          setPages({
            totalPages: Math.max(1, Number(response.totalPages || 1)),
            currentPage: 1,
          });
        }
        return;
      }
      if (response?.status === "error" && (!response.data || response.data.length === 0)) {
        setServerTransactions([]);
        setPages({ totalPages: 1, currentPage: 1 });
        toast.info("No matching transactions returned from server filter");
        return;
      }
      toast.error("Failed to fetch filtered transaction history");
    } catch (error) {
      toast.error("An error occurred while fetching history");
      console.error("error fetching bill history", error);
    } finally {
      setSpin(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setClientPage(1);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      status: "all",
      reference: "",
      category: "all",
    });
    setServerTransactions(null);
    setClientPage(1);
    setPages({ totalPages: 1, currentPage: 1 });
  };

  const isServerMode = serverTransactions !== null;
  const sourceList = useMemo(
    () => (isServerMode ? serverTransactions : trxn || []),
    [isServerMode, serverTransactions, trxn],
  );

  const filteredTransactions = useMemo(() => {
    return sourceList.filter((txn) => {
      const txDate = parseTransactionDate(txn);
      const matchesDateFrom =
        !filters.dateFrom || txDate >= new Date(filters.dateFrom);
      const matchesDateTo =
        !filters.dateTo || txDate <= new Date(filters.dateTo);

      const statusLower = String(txn.status || "").toLowerCase();
      const filterStatus = String(filters.status || "all").toLowerCase();
      const isSuccessStatus = ["completed", "successful", "success", "settled"].includes(
        statusLower,
      );
      const matchesStatus =
        filterStatus === "all" ||
        statusLower === filterStatus ||
        ((filterStatus === "completed" || filterStatus === "successful") &&
          isSuccessStatus);

      const refStr = String(
        `${getTransactionReference(txn)} ${getTransactionDisplayTitle(txn)} ${txn.narration || ""}`,
      ).toLowerCase();
      const matchesReference =
        !filters.reference.trim() ||
        refStr.includes(filters.reference.trim().toLowerCase());

      const catBlob = String(
        `${txn.category || ""} ${txn.billType || ""} ${txn.narration || ""}`,
      ).toLowerCase();
      const filterCat = String(filters.category || "all").toLowerCase();
      const matchesCategory =
        filterCat === "all" ||
        catBlob.includes(filterCat) ||
        (filterCat === "mobiledata" && catBlob.includes("data")) ||
        (filterCat === "utilitybills" && catBlob.includes("electric")) ||
        (filterCat === "cablebills" && catBlob.includes("cable"));

      return (
        matchesDateFrom &&
        matchesDateTo &&
        matchesStatus &&
        matchesReference &&
        matchesCategory
      );
    });
  }, [sourceList, filters]);

  const totalPagesCount = isServerMode
    ? pages.totalPages
    : Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));

  const activePageNum = isServerMode
    ? pages.currentPage
    : Math.min(clientPage, totalPagesCount);

  const paginatedTransactions = useMemo(() => {
    if (isServerMode) return filteredTransactions;
    const start = (activePageNum - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [isServerMode, filteredTransactions, activePageNum]);

  const isLoadingInitial = !isServerMode && trxn === null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Unified Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="pw-page-title">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View, filter, and open official PayWaka receipts for any transaction.
            </p>
          </div>
          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((s) => !s)}
            className="w-fit"
          >
            <Filter className="h-4 w-4" />
            <span>{showFilters ? "Hide Filters" : "Filter"}</span>
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tx-from" className="pw-label block">
                    From Date
                  </Label>
                  <Input
                    id="tx-from"
                    type="date"
                    value={filters.dateFrom ? filters.dateFrom.split("T")[0] : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        handleFilterChange("dateFrom", "");
                        return;
                      }
                      const dateObj = new Date(`${raw}T00:00:00Z`);
                      handleFilterChange("dateFrom", dateObj.toISOString());
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-to" className="pw-label block">
                    To Date
                  </Label>
                  <Input
                    id="tx-to"
                    type="date"
                    value={filters.dateTo ? filters.dateTo.split("T")[0] : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        handleFilterChange("dateTo", "");
                        return;
                      }
                      const dateObj = new Date(`${raw}T00:00:00Z`);
                      dateObj.setUTCHours(23, 59, 59, 999);
                      handleFilterChange("dateTo", dateObj.toISOString());
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-status" className="pw-label block">
                    Status
                  </Label>
                  <select
                    id="tx-status"
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                    className="pw-input h-11 px-3 text-base"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="successful">Successful</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-category" className="pw-label block">
                    Category
                  </Label>
                  <select
                    id="tx-category"
                    value={filters.category}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
                    className="pw-input h-11 px-3 text-base"
                  >
                    <option value="all">All Categories</option>
                    <option value="AIRTIME">Airtime</option>
                    <option value="MOBILEDATA">Mobile Data</option>
                    <option value="UTILITYBILLS">Electricity</option>
                    <option value="CABLEBILLS">Cable TV</option>
                    <option value="CARD">Card / Transfers</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-ref" className="pw-label block">
                    Search / Reference
                  </Label>
                  <Input
                    id="tx-ref"
                    type="search"
                    placeholder="Ref or title..."
                    value={filters.reference}
                    onChange={(e) => handleFilterChange("reference", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={spin}
                  onClick={() => getHistory(null, null, "first")}
                >
                  <Check className="h-4 w-4" />
                  <span>{spin ? "Fetching..." : "Query Server"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading / Empty / List */}
        {isLoadingInitial || spin ? (
          <StateView
            variant="loading"
            title="Loading transactions"
            description="Fetching your latest PayWaka activity..."
          />
        ) : paginatedTransactions.length === 0 ? (
          <StateView
            icon={Receipt}
            title={
              sourceList.length === 0
                ? "No transactions yet"
                : "No transactions found"
            }
            description={
              sourceList.length === 0
                ? "Your airtime, data, bill payments, and deposits will appear here."
                : "No transactions match your current filters."
            }
            actionLabel={sourceList.length > 0 ? "Reset filters" : undefined}
            onAction={sourceList.length > 0 ? resetFilters : undefined}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-panel">
                      <th className="px-5 py-3.5 pw-label">Transaction</th>
                      <th className="px-5 py-3.5 pw-label">Reference</th>
                      <th className="px-5 py-3.5 pw-label">Amount</th>
                      <th className="px-5 py-3.5 pw-label">Status</th>
                      <th className="px-5 py-3.5 pw-label text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedTransactions.map((txn) => {
                      const displayTitle = getTransactionDisplayTitle(txn);
                      const statusInfo = getTransactionStatusInfo(txn);
                      const ref = getTransactionReference(txn);
                      const isCredit = isInboundTransaction(txn);
                      const isRefund = isRefundTransaction(txn);

                      return (
                        <tr
                          key={txn.id || ref}
                          onClick={() => openReceiptForRow(txn)}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5 max-w-[280px]">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "h-9 w-9",
                                  isCredit ? "pw-tile" : "pw-tile-ruby",
                                )}
                              >
                                {isRefund ? (
                                  <RotateCcw className="h-4 w-4" />
                                ) : isCredit ? (
                                  <ArrowDownLeft className="h-4 w-4" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4" />
                                )}
                              </div>
                              <span
                                className="text-sm font-semibold text-foreground truncate"
                                title={displayTitle}
                              >
                                {displayTitle}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 pw-code text-caption text-muted-foreground max-w-[180px] truncate">
                            {ref}
                          </td>
                          <td
                            className={cn(
                              "px-5 py-3.5 pw-num text-sm font-bold whitespace-nowrap",
                              isCredit ? "text-brand-400" : "text-foreground",
                            )}
                          >
                            {formatSignedNaira(txn.amount || 0, isCredit)}
                          </td>
                          <td className="px-5 py-3.5">
                            <ReceiptStatusPill
                              status={statusInfo.key}
                              label={statusInfo.label}
                              className="text-[10px]"
                            />
                          </td>
                          <td className="px-5 py-3.5 text-caption text-muted-foreground text-right whitespace-nowrap">
                            {formatTransactionDate(txn)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile Card List (single card level) */}
            <div className="md:hidden space-y-2.5">
              {paginatedTransactions.map((txn) => {
                const displayTitle = getTransactionDisplayTitle(txn);
                const statusInfo = getTransactionStatusInfo(txn);
                const ref = getTransactionReference(txn);
                const isCredit = isInboundTransaction(txn);
                const isRefund = isRefundTransaction(txn);

                return (
                  <button
                    key={txn.id || ref}
                    type="button"
                    onClick={() => openReceiptForRow(txn)}
                    className="pw-card pw-pressable w-full text-left p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "h-10 w-10",
                          isCredit ? "pw-tile" : "pw-tile-ruby",
                        )}
                      >
                        {isRefund ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : isCredit ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {displayTitle}
                        </p>
                        <p className="text-caption text-muted-foreground truncate">
                          {formatTransactionDate(txn)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <p
                        className={cn(
                          "pw-num text-sm font-bold",
                          isCredit ? "text-brand-400" : "text-foreground",
                        )}
                      >
                        {formatSignedNaira(txn.amount || 0, isCredit)}
                      </p>
                      <ReceiptStatusPill
                        status={statusInfo.key}
                        label={statusInfo.label}
                        className="text-[9px] px-2 py-0.5"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPagesCount > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={activePageNum <= 1}
                  onClick={() => {
                    if (isServerMode) getHistory(null, "prev");
                    else {
                      setClientPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                <span className="text-caption text-muted-foreground pw-num">
                  Page <strong className="text-foreground">{activePageNum}</strong> of{" "}
                  <strong className="text-foreground">{totalPagesCount}</strong>
                </span>

                <Button
                  type="button"
                  size="sm"
                  disabled={activePageNum >= totalPagesCount}
                  onClick={() => {
                    if (isServerMode) getHistory("next", null);
                    else {
                      setClientPage((p) => Math.min(totalPagesCount, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedTx && (
        <TransactionsModal
          transaction={selectedTx}
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setSelectedTx(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}

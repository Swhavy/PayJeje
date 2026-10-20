import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Star,
  Smartphone,
  Zap,
  Gift,
  Users,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Plus,
  Eye,
  Calendar,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useTransactionFetch from "@/components/useTransactionFetch";
import TransactionsModal from "@/components/TransactionsModal";

const Transactions = () => {
  const [transactions, setTransactions] = useState();
  const [modalOpen, setIsModalOpen] = useState(false);
  const { trxn, loadMore } = useTransactionFetch();

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTransactions(null);
  };

  const handleTransactionClick = (transaction) => {
    setTransactions(transaction);
    setIsModalOpen(true);
  };

  return (
    <div className=" absolute w-[30rem] h-fit m-auto inset-0">
      {/* Recent Transactions */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">
              Recent Transactions
            </CardTitle>
            <Link to="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-yellow-400 hover:text-foreground flex-row-reverse"
              >
                Back
                <ArrowLeft className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={loadMore}
            >
              More
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 h-[60vh] overflow-y-auto">
            {trxn && trxn.length > 0 ? (
              trxn.map((transaction, index) => {
                const narrationLower = String(transaction.narration || "").toLowerCase();
                const statusLower = String(transaction.status || "").toLowerCase();
                const typeLower = String(transaction.type || "").toLowerCase();
                const categoryLower = String(transaction.category || "").toLowerCase();

                const isRefund =
                  narrationLower.includes("refund") ||
                  statusLower === "refunded" ||
                  transaction.refunded === true;

                const isCredit =
                  isRefund ||
                  typeLower === "credit" ||
                  typeLower === "inflow" ||
                  typeLower === "income" ||
                  narrationLower === "credit" ||
                  categoryLower === "deposit" ||
                  categoryLower === "cashback" ||
                  categoryLower === "earning" ||
                  categoryLower === "referral";

                let txDate = null;
                if (transaction?.createdAt?.toDate) txDate = transaction.createdAt.toDate();
                else if (transaction?.createdAt?.seconds) txDate = new Date(transaction.createdAt.seconds * 1000);
                else if (transaction?.created_at) txDate = new Date(transaction.created_at);
                else if (transaction?.timestamp?.toDate) txDate = transaction.timestamp.toDate();
                else if (transaction?.timestamp) txDate = new Date(transaction.timestamp);
                else if (transaction?.date) txDate = new Date(transaction.date);
                else txDate = new Date();

                const formattedDate = isNaN(txDate.getTime())
                  ? "Recently"
                  : txDate.toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                          isRefund
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : isCredit
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/15 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {isRefund ? (
                          <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                        ) : isCredit ? (
                          <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm sm:text-base">
                          {transaction.narration || "Transaction"}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formattedDate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold text-sm sm:text-base ${
                          isCredit
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"}₦
                        {Number(transaction.amount || 0).toLocaleString()}
                      </p>
                      {isRefund ? (
                        <Badge
                          className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Refunded
                        </Badge>
                      ) : statusLower === "failed" ? (
                        <Badge
                          variant="destructive"
                          className="text-xs"
                        >
                          Failed
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No transactions found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      {transactions && (
        <TransactionsModal
          transaction={transactions}
          isOpen={modalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
export default Transactions;

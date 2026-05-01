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
            {trxn &&
              trxn.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  onClick={() => handleTransactionClick(transaction)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        transaction.narration === "credit"
                          ? "bg-green-100 dark:bg-green-900"
                          : "bg-red-100 dark:bg-red-900"
                      }`}
                    >
                      {transaction.narration === "credit" ? (
                        <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">
                        {transaction.narration}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleString(
                          "en-NG",
                          {
                            dateStyle: "medium", // "Sep 3, 2025"
                            timeStyle: "short", // "1:47 PM"
                          },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm sm:text-base ${
                        transaction.narration === "credit"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.narration === "credit" ? "+" : "-"}₦
                      {transaction.amount.toLocaleString()}
                    </p>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  </div>
                </div>
              ))}
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

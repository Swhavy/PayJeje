import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StateView from "@/components/ui/StateView";
import { ReceiptStatusPill } from "@/components/receipts/ReceiptParts";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  RotateCcw,
  Receipt,
} from "lucide-react";
import { Link } from "react-router-dom";
import useTransactionFetch from "@/components/useTransactionFetch";
import TransactionsModal from "@/components/TransactionsModal";
import {
  formatTransactionDate,
  getTransactionDisplayTitle,
  getTransactionStatusInfo,
  isInboundTransaction,
  isRefundTransaction,
} from "@/lib/receiptUtils";
import { formatSignedNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

const Transactions = () => {
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalOpen, setIsModalOpen] = useState(false);
  const { trxn, loadMore } = useTransactionFetch();

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTx(null);
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTx(transaction);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="pw-page-title">Recent Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tap any transaction to view or share its PayWaka receipt.
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadMore} className="text-brand-400">
              Load more
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {trxn && trxn.length > 0 ? (
              trxn.map((transaction) => {
                const isRefund = isRefundTransaction(transaction);
                const isCredit = isInboundTransaction(transaction);
                const displayTitle = getTransactionDisplayTitle(transaction);
                const statusInfo = getTransactionStatusInfo(transaction);

                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => handleTransactionClick(transaction)}
                    className="pw-pressable w-full text-left flex items-center justify-between gap-3 p-3 rounded-panel border border-border bg-panel hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-panel border inline-flex items-center justify-center shrink-0",
                          isCredit
                            ? "bg-brand-tint border-brand-400/25 text-brand-400"
                            : "bg-destructive/10 border-destructive/20 text-destructive",
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
                        <p
                          className="text-sm font-semibold text-foreground truncate"
                          title={displayTitle}
                        >
                          {displayTitle}
                        </p>
                        <p className="text-caption text-muted-foreground truncate">
                          {formatTransactionDate(transaction)}
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
                        {formatSignedNaira(transaction.amount || 0, isCredit)}
                      </p>
                      <ReceiptStatusPill
                        status={statusInfo.key}
                        label={statusInfo.label}
                        className="text-[9px] px-2 py-0.5"
                      />
                    </div>
                  </button>
                );
              })
            ) : (
              <StateView
                icon={Receipt}
                title="No transactions found"
                description="Your recent PayWaka transactions will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTx && (
        <TransactionsModal
          transaction={selectedTx}
          isOpen={modalOpen}
          onClose={handleCloseModal}
        />
      )}
    </DashboardLayout>
  );
};

export default Transactions;

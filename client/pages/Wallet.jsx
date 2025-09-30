import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  DollarSign,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { useSelector } from "react-redux";
import AccountDetailsCard from "@/components/AccountDetailsCard";

const Wallet = () => {
  const userDetails = useSelector((state) => state?.user?.user);
  const { walletBalance, accountNumber, bankName } = userDetails;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [accountPopup, setAccountPopup] = useState(false);

  // Mock transaction data
  const transactions = [
    {
      id: 1,
      type: "credit",
      description: "Referral bonus",
      amount: 2500,
      date: "2024-01-15",
      time: "14:30",
      status: "completed",
    },
    {
      id: 2,
      type: "debit",
      description: "Airtime purchase - MTN",
      amount: 1000,
      date: "2024-01-15",
      time: "12:15",
      status: "completed",
    },
    {
      id: 3,
      type: "credit",
      description: "Task completion",
      amount: 500,
      date: "2024-01-14",
      time: "16:45",
      status: "completed",
    },
    {
      id: 4,
      type: "debit",
      description: "Bill payment - EKEDC",
      amount: 5000,
      date: "2024-01-14",
      time: "09:20",
      status: "completed",
    },
  ];

  const totalBalance = walletBalance;
  const totalEarned = user?.monthlyEarnings
    ? user.monthlyEarnings * 3.6
    : 45000; // Simulated total earned
  const totalSpent = 32500;
  const pending = 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Wallet</h1>
            <p className="text-muted-foreground mt-1">
              Manage your earnings and transactions
            </p>
          </div>
          <div className="flex space-x-2">
            <Button className="bg-paywaka-500 hover:bg-paywaka-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-paywaka-500 to-paywaka-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <WalletIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-paywaka-100 text-sm">Total Balance</p>
                  <h2 className="text-3xl font-bold">
                    ₦ {totalBalance.toLocaleString()}
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-paywaka-100 text-sm">Available</p>
                <p className="text-lg font-semibold">
                  ₦ {(totalBalance - pending).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center text-paywaka-100">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <span className="text-sm">Total Earned</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    ₦ {totalEarned.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center text-paywaka-100">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  <span className="text-sm">Total Spent</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    ₦ {totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center text-paywaka-100">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">Pending</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    ₦ {pending.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 cursor-pointer">
                <div
                  className="flex items-center space-x-4"
                  onClick={() => setAccountPopup(!accountPopup)}
                >
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Add Money</h3>
                    <p className="text-sm text-muted-foreground">
                      Top up your wallet
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 relative">
                <div className="absolute w-full h-full inset-0 rounded-lg bg-black/40 backdrop-blur-md z-[100] text-white text-sm flex justify-center items-center">
                  Coming Soon
                </div>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <ArrowUpRight className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Send Money</h3>
                    <p className="text-sm text-muted-foreground">
                      Transfer to friends
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Withdraw</h3>
                    <p className="text-sm text-muted-foreground">
                      Cash out to bank
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Transactions</h3>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>

                <div className="space-y-4">
                  {transactions.slice(0, 4).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.type === "credit"
                              ? "bg-green-100 dark:bg-green-900/20"
                              : "bg-red-100 dark:bg-red-900/20"
                          }`}
                        >
                          {transaction.type === "credit" ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.date} • {transaction.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            transaction.type === "credit"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "credit" ? "+" : "-"}₦
                          {transaction.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600 capitalize">
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Withdraw Funds</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      placeholder="Enter amount to withdraw"
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Available: ₦{(totalBalance - pending).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="bank">Bank Account</Label>
                    <select className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md">
                      <option>Select bank account</option>
                      <option>GTBank - 0123456789</option>
                      <option>Access Bank - 0987654321</option>
                    </select>
                  </div>

                  <Button className="w-full bg-paywaka-500 hover:bg-paywaka-600">
                    Withdraw Funds
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Transaction History</h3>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline">Filter</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.type === "credit"
                              ? "bg-green-100 dark:bg-green-900/20"
                              : "bg-red-100 dark:bg-red-900/20"
                          }`}
                        >
                          {transaction.type === "credit" ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.date} • {transaction.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            transaction.type === "credit"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "credit" ? "+" : "-"}₦
                          {transaction.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600 capitalize">
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {accountPopup && (
          <AccountDetailsCard
            accountNumber={accountNumber || "0000000000"}
            bankName={bankName || "Your Bank"}
            open={accountPopup}
            isClose={() => setAccountPopup(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Wallet;

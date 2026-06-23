import React, { useState } from "react";
import { useTheme } from "./ThemeProvider";
import {
  Home,
  Star,
  Smartphone,
  Zap,
  Gift,
  Utensils,
  Users,
  Wallet,
  Settings,
  Bell,
  Search,
  Menu,
  User,
  Plus,
  Sun,
  Moon,
  Monitor,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { clearState } from "@/Features/userSlice";
import { useSpinner } from "@/components/SpinnerProvider";
import useSessionTimeout from "@/components/hooks/useSessionTimeout";

const SessionGuard = ({ children, timeout }) => {
  useSessionTimeout(timeout);
  return children;
};

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = useSelector((state) => state.user.user);
  const { userPhoto, userName, walletBalance, sessionTimeout } = user;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, setTheme } = useTheme();
  //const pathname = usePathname();
  const pathname = useLocation();

  const SignOut = () => {
    console.log("login out..");
    signOut(auth).then(() => {
      dispatch(clearState({}));
      navigate("/auth/Login");
    });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
    { id: "earn", label: "Earn Points", icon: Star, href: "/earn" },
    {
      id: "airtime",
      label: "Airtime",
      icon: Smartphone,
      href: "/services/airtime",
    },
    {
      id: "data",
      label: "Data",
      icon: Smartphone,
      href: "/services/data",
    },
    { id: "bills", label: "Pay Bills", icon: Zap, href: "/services/bills" },
    {
      id: "history",
      label: "Transactions",
      icon: History,
      href: "/billhistory",
    },
    {
      id: "giftcards",
      label: "Gift Cards",
      icon: Gift,
      href: "/services/giftcards",
    },
    {
      id: "meals",
      label: "Meal Coupons",
      icon: Utensils,
      href: "/services/meals",
    },
    { id: "referrals", label: "Referrals", icon: Users, href: "/referrals" },
    { id: "wallet", label: "Wallet", icon: Wallet, href: "/wallet" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  ];

  const isActive = (href) => {
    if (pathname.pathname === href) {
      //console.log("pathname: ", pathname, "href: ", href);
      return true;
    }
    return false;
  };
  const { appContext } = useSpinner();
  return (
    <div
      className={`h-screen bg-background text-foreground ${appContext.spinner ? "overflow-hidden" : "overflow-auto"}`}
    >
      {/* Top Navigation */}
      <nav className="border-b border-border px-4 py-3 sticky top-0 z-30 backdrop-blur-sm bg-card/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-foreground hover:bg-muted"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/dashboard" className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Paywaka Logo"
                width={70}
                height={70}
                className="rounded-full"
              />
              <span className="text-xl font-bold text-foreground">
                Pay
                <span className="text-green-600 dark:text-green-400">waka</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-64 bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:bg-muted"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border-border"
              >
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className="text-foreground hover:bg-muted"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className="text-foreground hover:bg-muted"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className="text-foreground hover:bg-muted"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="relative text-foreground hover:bg-muted"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-foreground hover:bg-muted"
                >
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        className="w-full h-full rounded-full "
                      />
                    ) : (
                      <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden md:block">
                    {userName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border-border"
              >
                <DropdownMenuItem
                  className="text-foreground hover:bg-muted"
                  onClick={() => navigate("/settings")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-foreground hover:bg-muted">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-foreground hover:bg-muted"
                  onClick={() => SignOut()}
                >
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-all duration-300 ease-in-out`}
        >
          <div className="p-4 pt-20 lg:pt-4">
            <div className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      active
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Stats in Sidebar */}
          <div className="p-4 border-t border-border mt-auto absolute bottom-0 left-0 right-0 bg-card">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Points</span>
                <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  {user?.points}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wallet</span>
                <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {`₦ ${walletBalance}` || "₦ 12,500"}
                </Badge>
              </div>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Funds
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            {" "}
            {sessionTimeout ? (
              <SessionGuard timeout={sessionTimeout}>{children}</SessionGuard>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

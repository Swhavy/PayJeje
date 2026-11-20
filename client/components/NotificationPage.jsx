import React, { useState } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Check,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "./ui/button";
import StateView from "./ui/StateView";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "success",
      title: "Payment Successful",
      message: "Your airtime purchase of ₦500 was successful",
      timestamp: "2 minutes ago",
      read: false,
      icon: CheckCircle2,
      details: "Transaction ID: TXN-2024-001",
    },
    {
      id: 2,
      type: "alert",
      title: "Pending Transaction",
      message: "Your bill payment is pending approval",
      timestamp: "1 hour ago",
      read: false,
      icon: AlertCircle,
      details: "Amount: ₦5,000 | Status: Awaiting confirmation",
    },
    {
      id: 3,
      type: "info",
      title: "Points Earned",
      message: "You earned 250 points from your recent payment",
      timestamp: "3 hours ago",
      read: true,
      icon: Info,
      details: "Total Points: 250 | New Balance: 2,500",
    },
    {
      id: 4,
      type: "success",
      title: "Referral Bonus",
      message: "You earned ₦1,000 from a referral signup",
      timestamp: "5 hours ago",
      read: true,
      icon: CheckCircle2,
      details: "Bonus deposited to your wallet",
    },
    {
      id: 5,
      type: "alert",
      title: "Account Security Alert",
      message: "New login detected from a different device",
      timestamp: "1 day ago",
      read: true,
      icon: AlertCircle,
      details: "Device: iPhone 14 | Location: Lagos, Nigeria",
    },
    {
      id: 6,
      type: "info",
      title: "App Update Available",
      message: "A new version of Paywaka is available",
      timestamp: "2 days ago",
      read: true,
      icon: Info,
      details: "Version 2.1.0 | Size: 45MB",
    },
  ]);

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const dismissNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const getTileClass = (type) => {
    switch (type) {
      case "success":
        return "pw-tile";
      case "alert":
        return "pw-tile-gold";
      default:
        return "pw-tile-neutral";
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "unread") return !n.read;
    return n.type === selectedFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="pw-page-title">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredNotifications.length} notification
              {filteredNotifications.length !== 1 ? "s" : ""}
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="w-fit text-brand-400 border-brand-400/30"
            >
              <Check className="h-4 w-4" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "success", label: "Success" },
            { id: "alert", label: "Alerts" },
            { id: "info", label: "Info" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id)}
              className={cn(
                "pw-pressable min-h-10 px-4 rounded-pill border text-xs font-bold whitespace-nowrap transition-all shrink-0",
                selectedFilter === filter.id
                  ? "bg-brand-500 border-brand-500 text-brand-foreground shadow-sm"
                  : "pw-panel text-muted-foreground hover:text-foreground hover:border-brand-400/35",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <StateView
            icon={Bell}
            title={`No ${selectedFilter !== "all" ? selectedFilter : ""} notifications`}
            description={
              selectedFilter === "unread"
                ? "You're all caught up!"
                : "You don't have any notifications in this category"
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "pw-card p-4 sm:p-5 transition-all",
                    !notification.read && "border-brand-400/35",
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={cn("h-10 w-10 mt-0.5", getTileClass(notification.type))}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm sm:text-base font-bold text-foreground">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-pill bg-brand-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                          {notification.timestamp}
                        </span>
                      </div>

                      {notification.details && (
                        <p className="pw-code text-caption text-muted-foreground">
                          {notification.details}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                        {!notification.read && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                            className="text-brand-400 border-brand-400/30 hover:bg-brand-tint"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark as read</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissNotification(notification.id)}
                          className="text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Dismiss</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

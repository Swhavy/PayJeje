"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Check,
  X,
  Filter,
} from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export default function NotificationsPage() {
  const navigate = useNavigate();
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

  const getNotificationColor = (type) => {
    switch (type) {
      case "success":
        return "bg-green-600/30 dark:bg-green-950/30 border-l-4 border-green-500";
      case "alert":
        return "bg-yellow-600/30 dark:bg-yellow-950/30 border-l-4 border-yellow-500";
      case "info":
        return "bg-blue-600/30 dark:bg-blue-950/30 border-l-4 border-blue-500";
      default:
        return "bg-gray-600/30 dark:bg-gray-950/30 border-l-4 border-gray-500";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "alert":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "unread") return !n.read;
    return n.type === selectedFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredNotifications.length} notification
                {filteredNotifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "success", label: "Success" },
            { id: "alert", label: "Alerts" },
            { id: "info", label: "Info" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                selectedFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No {selectedFilter !== "all" ? selectedFilter : ""} notifications
            </h3>
            <p className="text-muted-foreground">
              {selectedFilter === "unread"
                ? "You're all caught up!"
                : "You don't have any notifications in this category"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.id}
                  className={`p-6 rounded-lg border border-border transition-all hover:shadow-md ${getNotificationColor(
                    notification.type,
                  )} ${!notification.read ? "ring-1 ring-primary/20" : ""}`}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 mt-1 ${getIconColor(notification.type)}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p
                            className={`text-lg font-semibold ${
                              notification.read
                                ? "text-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {notification.title}
                            {!notification.read && (
                              <span className="inline-block ml-2 h-2 w-2 rounded-full bg-primary" />
                            )}
                          </p>
                          <p className="text-foreground/80 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-sm text-muted-foreground mt-3 mb-3">
                            {notification.details}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notification.timestamp}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-sm px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="text-sm px-3 py-1.5 rounded border border-border text-muted-foreground hover:bg-muted transition-colors font-medium flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

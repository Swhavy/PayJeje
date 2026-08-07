"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Bell, X, Check, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "success",
      title: "Payment Successful",
      message: "Your airtime purchase of ₦500 was successful",
      timestamp: "2 minutes ago",
      read: false,
      icon: CheckCircle2,
    },
    {
      id: 2,
      type: "alert",
      title: "Pending Transaction",
      message: "Your bill payment is pending approval",
      timestamp: "1 hour ago",
      read: false,
      icon: AlertCircle,
    },
    {
      id: 3,
      type: "info",
      title: "Points Earned",
      message: "You earned 250 points from your recent payment",
      timestamp: "3 hours ago",
      read: true,
      icon: Info,
    },
  ]);

  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900";
      case "alert":
        return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900";
      case "info":
        return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900";
      default:
        return "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-900";
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

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-foreground hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 p-0 bg-card border-border shadow-lg"
      >
        {/* Header */}
        <div className="border-b border-border px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.id}
                  className={`border-b border-border px-4 py-3 transition-colors hover:bg-muted/50 ${
                    !notification.read
                      ? "bg-green-50/20 dark:bg-green-950/20"
                      : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 mt-1 ${getIconColor(
                        notification.type,
                      )}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              notification.read
                                ? "text-foreground"
                                : "text-foreground font-semibold"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {notification.timestamp}
                          </p>
                        </div>

                        {/* Unread Indicator */}
                        {!notification.read && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                          >
                            <Check className="h-3 w-3 inline mr-1" />
                            Read
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <X className="h-3 w-3 inline mr-1" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-3 text-center">
            <button
              onClick={() => navigate("/notifications")}
              className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
            >
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

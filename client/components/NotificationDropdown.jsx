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
import { cn } from "@/lib/utils";

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

  const getIconColor = (type) => {
    switch (type) {
      case "success":
        return "text-brand-400";
      case "alert":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-panel"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[10px] rounded-pill h-4 min-w-4 px-1 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0 bg-card border-border rounded-card shadow-card"
      >
        <div className="border-b border-border px-4 py-3.5 flex items-center justify-between">
          <h2 className="text-card-title text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-caption text-brand-400 hover:underline font-semibold min-h-11 px-1"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-60" />
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
                  className={cn(
                    "px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer",
                    !notification.read && "bg-brand-tint/40",
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn("shrink-0 mt-0.5", getIconColor(notification.type))}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {notification.title}
                          </p>
                          <p className="text-caption text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1.5">
                            {notification.timestamp}
                          </p>
                        </div>

                        {!notification.read && (
                          <span className="h-2 w-2 rounded-pill bg-brand-400 shrink-0 mt-1.5" />
                        )}
                      </div>

                      <div className="flex gap-2 mt-2">
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="pw-chip-brand py-1 px-2.5"
                          >
                            <Check className="h-3 w-3" />
                            <span>Read</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="pw-chip py-1 px-2.5 hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/Notifications");
              }}
              className="text-sm text-brand-400 hover:underline font-semibold min-h-11 px-3"
            >
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

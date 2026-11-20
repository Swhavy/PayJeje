import React from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Unified empty, loading, and error state view across PayWaka screens.
 */
export function StateView({
  variant = "empty", // "empty" | "loading" | "error"
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className = "",
}) {
  const DefaultIcon =
    variant === "loading" ? Loader2 : variant === "error" ? AlertCircle : Inbox;
  const Icon = CustomIcon || DefaultIcon;

  return (
    <div
      className={cn(
        "pw-card text-center flex flex-col items-center justify-center gap-3",
        compact ? "p-6" : "p-8 sm:p-10",
        className,
      )}
    >
      <div
        className={cn(
          "h-12 w-12",
          variant === "error"
            ? "inline-flex shrink-0 items-center justify-center rounded-panel bg-destructive/10 text-destructive border border-destructive/20"
            : variant === "loading"
              ? "pw-tile"
              : "pw-tile-neutral",
        )}
      >
        <Icon
          className={cn("h-5 w-5", variant === "loading" && "animate-spin")}
        />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="text-card-title text-foreground">
          {title ||
            (variant === "loading"
              ? "Loading..."
              : variant === "error"
                ? "Something went wrong"
                : "Nothing here yet")}
        </p>
        {description && (
          <p className="text-caption text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button type="button" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Compact skeleton tile grid for data bundle / catalog loading states.
 */
export function SkeletonTileGrid({ count = 8, className = "" }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading bundles"
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="pw-panel p-3.5 min-h-[116px] flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="skeleton h-6 w-16" />
            <div className="skeleton h-5 w-14 rounded-pill" />
          </div>
          <div className="skeleton h-4 w-20" />
          <div className="flex items-center justify-between gap-2">
            <div className="skeleton h-5 w-16" />
            <div className="skeleton h-5 w-14 rounded-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default StateView;

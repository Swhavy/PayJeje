import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Module-level ref-counter for body scroll lock across stacked modals
let openModalCount = 0;
let previousBodyOverflow = "";

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (openModalCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  openModalCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = previousBodyOverflow || "";
  }
}

/**
 * Shared modal shell component rendered via React Portal into document.body.
 * Escapes transformed parent containers so dialogs are always viewport-centered
 * and mobile sheets dock cleanly at the bottom with a drag handle.
 */
export default function ModalPortal({
  isOpen,
  onClose,
  children,
  variant = "dialog", // "dialog" | "sheet"
  noPadding = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = "",
  maxWidthClass = "max-w-md",
  cardClassName = "",
  ariaLabel,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const isSheet = variant === "sheet";

  return ReactDOM.createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-portal-overlay-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={cn(
            "fixed inset-0 z-[100] flex justify-center overflow-hidden",
            isSheet
              ? "items-end sm:items-center p-0 sm:p-6"
              : "items-center p-4 sm:p-6",
          )}
        >
          {/* Full-screen Frosted Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-md"
            onClick={() => {
              if (closeOnBackdrop) {
                onClose?.();
              }
            }}
          />

          {/* Centered Dialog or Mobile Bottom Sheet Card */}
          <motion.div
            key="modal-card"
            initial={
              isSheet
                ? { opacity: 0, y: 40, scale: 0.98 }
                : { opacity: 0, scale: 0.95, y: 12 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              isSheet
                ? { opacity: 0, y: 40, scale: 0.98 }
                : { opacity: 0, scale: 0.95, y: 12 }
            }
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative z-10 w-full mx-auto pw-glass-hero text-card-foreground shadow-2xl focus:outline-none",
              isSheet
                ? "rounded-t-card rounded-b-none sm:rounded-card max-h-[92dvh] flex flex-col overflow-hidden shadow-sheet sm:shadow-hero"
                : "rounded-card max-h-[90dvh] overflow-y-auto",
              !noPadding && "p-5 sm:p-6",
              maxWidthClass,
              cardClassName,
              className,
            )}
          >
            {isSheet && (
              <div
                aria-hidden="true"
                className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0"
              >
                <span className="h-1 w-10 rounded-pill bg-border" />
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
} from "@/components/ui/alert-dialog";
import { XCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FeedbackAlert({ message, isOpen, isClose }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={isClose}>
      <AnimatePresence>
        <>
          {/* 🔹 Animated Overlay */}
          <AlertDialogOverlay asChild>
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[70]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AlertDialogOverlay>

          {/* 🔹 Animated Modal Card */}
          <AlertDialogContent asChild>
            <motion.div
              className="rounded-2xl shadow-xl max-w-sm w-full h-fit text-center p-6 absolute m-auto inset-0 top-[15rem] z-[70]"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <AlertDialogHeader className="flex flex-col items-center">
                {message.status ? (
                  <Check className="text-green-500 h-12 w-12 mb-4" />
                ) : (
                  <XCircle className="text-red-600 h-12 w-12 mb-3" />
                )}
                <AlertDialogTitle
                  className={`text-xl font-semibold ${message.status ? " text-green-600" : " text-red-700"}`}
                >
                  {message?.statusMsg || "An error occured"}
                </AlertDialogTitle>
                <AlertDialogDescription
                  className={`${message.status ? " text-white" : " text-red-600"}`}
                >
                  {message?.message ||
                    "Something went wrong. Please try again."}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="flex justify-center gap-3 mt-4">
                {/* Dismiss button closes modal */}
                <AlertDialogCancel asChild>
                  <Button variant="outline" onClick={isClose}>
                    Dismiss
                  </Button>
                </AlertDialogCancel>

                {/*  <AlertDialogAction asChild>
                    <Button variant="destructive">Try Again</Button>
                  </AlertDialogAction> */}
              </AlertDialogFooter>
            </motion.div>
          </AlertDialogContent>
        </>
      </AnimatePresence>
    </AlertDialog>
  );
}

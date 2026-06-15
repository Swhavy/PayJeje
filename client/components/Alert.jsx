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
    <AlertDialog open={isOpen} onOpenChange={isClose} className="">
      <AlertDialogOverlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" />

      <AlertDialogContent className="rounded-2xl shadow-xl max-w-md h-2/6 max-h-[80vh] w-full p-10 text-center absolute inset-0 m-auto top-[-40%] [@media(max-height:500px)]:top-[-42rem] [@media(min-height:600px)_and_(max-height:900px)]:top-[-15rem] [@media(min-height:600px)_and_(max-width:950px)]:top-[-8rem] z-[70]">
        <AlertDialogHeader className="flex flex-col items-center">
          {message.status ? (
            <Check className="text-green-500 h-12 w-12 mb-4" />
          ) : (
            <XCircle className="text-red-600 h-12 w-12 mb-4" />
          )}

          <AlertDialogTitle
            className={`text-xl font-semibold ${
              message.status ? "text-green-600" : "text-red-700"
            }`}
          >
            {message?.statusMsg || "An error occurred"}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-muted-foreground">
            {message?.message || "Something went wrong. Please try again."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex justify-center mt-4">
          <AlertDialogCancel asChild>
            <Button variant="outline">Dismiss</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

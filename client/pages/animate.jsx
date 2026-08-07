import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";

export default function PaymentSuccessAnimation({ onComplete }) {
  const [stage, setStage] = useState("approaching"); // approaching -> paying -> success -> leaving

  useEffect(() => {
    const t1 = setTimeout(() => setStage("paying"), 1000);
    const t2 = setTimeout(() => setStage("success"), 2200);
    const t3 = setTimeout(() => setStage("leaving"), 3400);
    const t4 = setTimeout(() => onComplete?.(), 4600);

    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative w-full h-64 bg-zinc-950 rounded-2xl overflow-hidden flex items-end justify-center">
      {/* Ground line */}
      <div className="absolute bottom-10 w-full h-px bg-zinc-800" />

      {/* Merchant stall (stays fixed) */}
      <div className="absolute right-16 bottom-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
          🏪
        </div>
        <span className="text-[10px] text-zinc-500 mt-1 font-medium">
          Merchant
        </span>
      </div>

      {/* Customer figure — walks in, pays, walks away */}
      <motion.div
        className="absolute bottom-10 flex flex-col items-center"
        initial={{ left: "10%" }}
        animate={{
          left:
            stage === "approaching"
              ? "55%"
              : stage === "leaving"
                ? "-10%"
                : "55%",
        }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        <motion.div
          className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl"
          animate={{
            scaleX: stage === "leaving" ? -1 : 1, // flip to face away when walking off
          }}
        >
          🚶
        </motion.div>
        <span className="text-[10px] text-zinc-500 mt-1 font-medium">You</span>
      </motion.div>

      {/* Money transfer — flies from customer to merchant */}
      <AnimatePresence>
        {stage === "paying" && (
          <motion.div
            className="absolute bottom-16 text-2xl"
            initial={{ left: "55%", opacity: 0, y: 0 }}
            animate={{ left: "75%", opacity: 1, y: -20 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            💸
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success checkmark burst */}
      <AnimatePresence>
        {(stage === "success" || stage === "leaving") && (
          <motion.div
            className="absolute top-8 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5"
            initial={{ opacity: 0, scale: 0.7, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">
              Payment Successful
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient PayWaka brand pulse in background */}
      <motion.div
        className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
        animate={{ opacity: stage === "success" ? [0, 0.4, 0] : 0 }}
        transition={{ duration: 0.8 }}
      />
    </div>
  );
}

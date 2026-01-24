import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Users, Zap, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CheckInCalendar from "./CheckinModal";
import { useState } from "react";

const quickActions = [
  {
    icon: Gift,
    title: "Daily Check-In Bonus",
    description: "Claim today's reward instantly.",
    buttonText: "Claim Now",
    action: "checkin",
  },
  {
    icon: Users,
    title: "Refer & Earn",
    description: "Invite friends and earn ₦50 per referral.",
    buttonText: "Refer Now",
    action: "refer",
  },
  {
    icon: Zap,
    title: "Pay & Earn",
    description: "Get bonus points when you pay bills or buy data.",
    buttonText: "Start Earning",
    action: "pay",
  },
  {
    icon: Share2,
    title: "Social Share Bonus",
    description: "Share your referral link on social media.",
    buttonText: "Share Now",
    action: "share",
  },
];

const QuickEarnModal = ({ isOpen, onClose }) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const handleAction = (action) => {
    console.log(`Action triggered: ${action}`);
    // Handle action logic here
  };

  return (
    <>
      <CheckInCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 h-screen -top-6 flex items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-lg"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
              className="relative w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] bg-card/50 backdrop-blur-xl rounded-t-2xl sm:rounded-xl border-t border-x sm:border border-glass-border shadow-2xl overflow-x-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-glow-pulse pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-glow-pulse pointer-events-none" />

              {/* Mobile drag handle */}
              <div className="sm:hidden sticky top-0 bg-card/80 backdrop-blur-sm pt-2 pb-2 px-4 border-b border-border/50 z-10">
                <div className="w-10 h-1 bg-muted rounded-full mx-auto" />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2.5 sm:p-2 rounded-full bg-secondary/50 backdrop-blur-sm hover:bg-secondary active:scale-95 transition-all touch-manipulation"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 sm:w-5 sm:h-5 text-foreground" />
              </button>

              <div className="relative p-4 sm:p-6 pb-6 overflow-x-hidden max-w-full">
                {/* Header */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-5 sm:mb-6 pt-1"
                >
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5">
                    Quick Earn
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Earn rewards instantly from your daily actions
                  </p>
                </motion.div>

                {/* Grid of actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-w-full">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.action}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * (index + 1) }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative p-4 sm:p-5 bg-card/60 backdrop-blur-sm rounded-lg border border-border hover:border-primary/50 active:border-primary transition-all duration-300 touch-manipulation"
                    >
                      {/* Hover glow */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-accent/10 transition-all duration-300" />

                      <div className="relative">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 mb-2.5 sm:mb-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 group-active:bg-primary/30 transition-colors">
                          <action.icon className="w-5 h-5 text-primary" />
                        </div>

                        {/* Content */}
                        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                          {action.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3 leading-snug">
                          {action.description}
                        </p>

                        {/* Button */}
                        <motion.div whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={() => {
                              if (action.buttonText == "Claim Now") {
                                setIsCalendarOpen(!isCalendarOpen);
                              }
                              handleAction(action.action);
                            }}
                            className="w-full h-9 sm:h-10 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-medium text-xs sm:text-sm shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all touch-manipulation"
                          >
                            {action.buttonText}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default QuickEarnModal;

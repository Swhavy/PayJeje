import React, { useEffect, useState } from "react";
import MobileDashboard from "./MobileDashboard";
import DashboardLayout from "./DashboardLayout";

export default function ResponsiveDashboard() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return <MobileDashboard />;
  }

  // For larger screens, return the original dashboard layout
  // You would implement the desktop version here
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Original desktop layout content goes here */}
        <p className="text-foreground">Desktop Dashboard - Coming Soon</p>
      </div>
    </DashboardLayout>
  );
}
